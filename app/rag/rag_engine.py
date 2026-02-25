"""
Vertex AI RAG Engine wrapper.

Manages the lifecycle of RAG files (import, delete, search, list)
using the Vertex AI SDK's ``vertexai.preview.rag`` module.  All chunking
and embedding is handled by the RAG Engine (backed by Weaviate) with
Document AI layout parsing.
"""

import logging
import os
import time
from typing import Dict, List, Optional

import vertexai
from google.api_core import exceptions as gcp_exceptions

logger = logging.getLogger(__name__)

_vertexai_initialized = False


# ---------------------------------------------------------------------------
# Initialization
# ---------------------------------------------------------------------------

def _init_vertexai() -> None:
    """Ensure ``vertexai.init()`` has been called exactly once."""
    global _vertexai_initialized
    if _vertexai_initialized:
        return

    project = _cfg("GCP_PROJECT", "fyp-project-4f3b7")
    location = _cfg("RAG_LOCATION", "us-west1")

    # Honour GCS_CREDENTIALS_PATH / GOOGLE_APPLICATION_CREDENTIALS
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or os.environ.get("GCS_CREDENTIALS_PATH")
    if creds_path:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_path

    vertexai.init(project=project, location=location)
    _vertexai_initialized = True
    logger.info("Vertex AI initialized: project=%s location=%s", project, location)


def _cfg(key: str, default: str = "") -> str:
    """Read a config value from Flask app config or environment."""
    try:
        from flask import current_app
        return current_app.config.get(key, os.environ.get(key, default))
    except RuntimeError:
        return os.environ.get(key, default)


def _corpus_name() -> str:
    return _cfg(
        "RAG_CORPUS_NAME",
        "projects/fyp-project-4f3b7/locations/us-west1/ragCorpora/3458764513820540928",
    )


def _layout_parser() -> str:
    return _cfg(
        "RAG_LAYOUT_PARSER_PROCESSOR",
        "projects/1082304305565/locations/us/processors/f04c32bad7e0f28c",
    )


# ---------------------------------------------------------------------------
# Import
# ---------------------------------------------------------------------------

def import_file_to_rag(gcs_uri: str, corpus_name: Optional[str] = None) -> str:
    """
    Import a GCS file into the Vertex AI RAG corpus.

    Retries with exponential backoff when the corpus is busy with another
    import operation (``FailedPrecondition``).

    Args:
        gcs_uri:      ``gs://bucket/RAG/file.pdf``
        corpus_name:  Full corpus resource name (default from config).

    Returns:
        The RAG file resource name (e.g.
        ``projects/.../ragCorpora/.../ragFiles/123``).
    """
    from vertexai.preview import rag

    _init_vertexai()
    corpus = corpus_name or _corpus_name()
    parser = _layout_parser()

    logger.info("Importing %s into RAG corpus %s (parser=%s)", gcs_uri, corpus, parser)

    transformation_config = rag.TransformationConfig(
        chunking_config=rag.ChunkingConfig(
            chunk_size=512,
            chunk_overlap=100,
        ),
    )

    # Build layout parser config
    layout_parser_config = rag.LayoutParserConfig(
        processor_name=parser,
        max_parsing_requests_per_min=120,
    )

    # Retry with exponential backoff for concurrent-operation conflicts
    max_retries = 5
    base_delay = 10  # seconds

    for attempt in range(max_retries + 1):
        try:
            response = rag.import_files(
                corpus_name=corpus,
                paths=[gcs_uri],
                transformation_config=transformation_config,
                layout_parser=layout_parser_config,
            )
            break  # success
        except (RuntimeError, gcp_exceptions.FailedPrecondition) as exc:
            err_msg = str(exc)
            if "other operations running" in err_msg or "FailedPrecondition" in err_msg:
                if attempt < max_retries:
                    delay = base_delay * (2 ** attempt)
                    logger.warning(
                        "Corpus busy (attempt %d/%d), retrying in %ds: %s",
                        attempt + 1, max_retries, delay, err_msg[:200],
                    )
                    time.sleep(delay)
                    continue
            raise  # non-retryable or exhausted retries

    logger.info("Import response: imported=%s", response.imported_rag_files_count)

    # Retrieve the imported file's resource name
    rag_files = list(rag.list_files(corpus_name=corpus))
    # Match by GCS URI
    for rf in reversed(rag_files):
        display = getattr(rf, "display_name", "") or ""
        gcs_source = getattr(rf, "gcs_source", None)
        source_uri = ""
        if gcs_source:
            source_uri = getattr(gcs_source, "uris", [""])[0] if hasattr(gcs_source, "uris") else str(gcs_source)
        if gcs_uri in source_uri or gcs_uri.split("/")[-1] in display:
            return rf.name
        # Also check raw name attribute
        raw_name = getattr(rf, "name", "")
        if raw_name:
            # Return the most recently created file as a fallback
            pass

    # Fallback: return the last file (most recently imported)
    if rag_files:
        return rag_files[-1].name

    raise RuntimeError(f"Could not find imported RAG file for {gcs_uri}")


# ---------------------------------------------------------------------------
# Weaviate direct access
# ---------------------------------------------------------------------------

def _get_weaviate_client():
    """
    Create a Weaviate Cloud client using configured credentials.

    Returns:
        A connected ``weaviate.WeaviateClient`` or *None* on failure.
    """
    import weaviate
    from weaviate.classes.init import Auth

    url = _cfg("WEAVIATE_URL", "https://cjnwy6xssgog1xn3a6aq.c0.us-west3.gcp.weaviate.cloud")
    api_key = _cfg("WEAVIATE_API_KEY", "")

    if not url or not api_key:
        logger.warning("WEAVIATE_URL or WEAVIATE_API_KEY not set — cannot connect to Weaviate")
        return None

    try:
        client = weaviate.connect_to_weaviate_cloud(
            cluster_url=url,
            auth_credentials=Auth.api_key(api_key),
        )
        return client
    except Exception as exc:
        logger.error("Failed to connect to Weaviate: %s", exc)
        return None


def _weaviate_collection_name() -> str:
    return _cfg("WEAVIATE_COLLECTION", "FYP")


def delete_weaviate_chunks(gcs_uri: str, rag_file_name: str = "") -> int:
    """
    Delete ALL chunks in Weaviate whose source matches *gcs_uri* or *rag_file_name*.

    The RAG Engine stores chunks with these known properties:
      - ``fileOriginalUri`` — the full GCS URI of the source file
      - ``fileId``          — the numeric RAG file ID

    Strategy:
      1. Try ``equal`` filter on ``fileOriginalUri`` (most reliable)
      2. If no results, try ``equal`` filter on ``fileId`` (extracted from rag_file_name)
      3. If still no results, fall back to a full-scan matching any property

    Args:
        gcs_uri:       The GCS URI (``gs://bucket/RAG/file.pdf``) to match.
        rag_file_name: The RAG file resource name (optional, for fileId extraction).

    Returns:
        Number of objects deleted, or -1 on error.
    """
    client = _get_weaviate_client()
    if client is None:
        return -1

    collection_name = _weaviate_collection_name()
    deleted = 0

    try:
        from weaviate.classes.query import Filter

        col = client.collections.get(collection_name)

        # ------------------------------------------------------------------
        # Phase 1: Delete by fileOriginalUri (exact match on full GCS URI)
        # ------------------------------------------------------------------
        if gcs_uri:
            try:
                result = col.query.fetch_objects(
                    filters=Filter.by_property("fileOriginalUri").equal(gcs_uri),
                    limit=10000,
                )
                if result.objects:
                    uuids = [obj.uuid for obj in result.objects]
                    for uid in uuids:
                        col.data.delete_by_id(uid)
                        deleted += 1
                    logger.info(
                        "Deleted %d Weaviate chunks by fileOriginalUri=%r",
                        len(uuids), gcs_uri,
                    )
            except Exception as exc:
                logger.warning("fileOriginalUri filter failed: %s", exc)

        # ------------------------------------------------------------------
        # Phase 2: Delete by fileId (extracted from rag_file_name)
        # ------------------------------------------------------------------
        if deleted == 0 and rag_file_name:
            # rag_file_name: projects/.../ragCorpora/.../ragFiles/5640880995116820602
            file_id = rag_file_name.rstrip("/").split("/")[-1] if "/" in rag_file_name else ""
            if file_id and file_id.isdigit():
                try:
                    result = col.query.fetch_objects(
                        filters=Filter.by_property("fileId").equal(file_id),
                        limit=10000,
                    )
                    if result.objects:
                        uuids = [obj.uuid for obj in result.objects]
                        for uid in uuids:
                            col.data.delete_by_id(uid)
                            deleted += 1
                        logger.info(
                            "Deleted %d Weaviate chunks by fileId=%s",
                            len(uuids), file_id,
                        )
                except Exception as exc:
                    logger.warning("fileId filter failed: %s", exc)

        # ------------------------------------------------------------------
        # Phase 3: Fallback – discover schema and try broader matching
        # ------------------------------------------------------------------
        if deleted == 0:
            filename = gcs_uri.rstrip("/").split("/")[-1] if "/" in gcs_uri else gcs_uri

            # Try schema-based discovery for non-standard property names
            try:
                config = col.config.get()
                source_props = []
                for prop in config.properties:
                    name_lower = prop.name.lower()
                    if any(kw in name_lower for kw in ("source", "uri", "path", "url", "gcs", "original")):
                        if prop.name not in ("fileOriginalUri",):  # already tried
                            source_props.append(prop.name)

                for prop_name in source_props:
                    if deleted > 0:
                        break
                    for match_str in (gcs_uri, filename):
                        if not match_str:
                            continue
                        try:
                            result = col.query.fetch_objects(
                                filters=Filter.by_property(prop_name).like(f"*{match_str}*"),
                                limit=10000,
                            )
                            if result.objects:
                                uuids = [obj.uuid for obj in result.objects]
                                for uid in uuids:
                                    col.data.delete_by_id(uid)
                                    deleted += 1
                                logger.info(
                                    "Deleted %d Weaviate objects via %s=%r",
                                    len(uuids), prop_name, match_str,
                                )
                                break
                        except Exception:
                            pass
            except Exception as exc:
                logger.debug("Schema-based fallback failed: %s", exc)

        # ------------------------------------------------------------------
        # Phase 4: Last resort – full scan
        # ------------------------------------------------------------------
        if deleted == 0 and gcs_uri:
            filename = gcs_uri.rstrip("/").split("/")[-1] if "/" in gcs_uri else gcs_uri
            logger.info("No matches via filters; trying full scan for %s", filename)
            try:
                all_objects = col.query.fetch_objects(limit=10000)
                for obj in all_objects.objects:
                    props_str = str(obj.properties).lower()
                    if filename.lower() in props_str or gcs_uri.lower() in props_str:
                        col.data.delete_by_id(obj.uuid)
                        deleted += 1
                if deleted > 0:
                    logger.info("Deleted %d objects via full scan matching %s", deleted, filename)
            except Exception as exc:
                logger.error("Full scan cleanup failed: %s", exc)

    except Exception as exc:
        logger.error("Weaviate chunk cleanup failed for %s: %s", gcs_uri, exc)
        return -1
    finally:
        try:
            client.close()
        except Exception:
            pass

    logger.info("Weaviate cleanup complete: %d objects deleted for %s", deleted, gcs_uri)
    return deleted


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

def delete_rag_file(rag_file_name: str, gcs_uri: str = "") -> bool:
    """
    Delete a file (and all its chunks) from the RAG Engine + Weaviate.

    Two-phase approach:
      1. ``rag.delete_file()`` via Vertex AI SDK (metadata + queued cleanup)
      2. ``delete_weaviate_chunks()`` via Weaviate SDK (direct chunk removal)

    Args:
        rag_file_name: Full resource name returned by ``import_file_to_rag``.
        gcs_uri:       GCS URI of the source file — used for Weaviate cleanup.

    Returns:
        True on success, False on error.
    """
    from vertexai.preview import rag

    success = True

    # Phase 1: Vertex AI RAG Engine delete
    if rag_file_name:
        _init_vertexai()
        try:
            rag.delete_file(name=rag_file_name)
            logger.info("Deleted RAG file via Vertex AI SDK: %s", rag_file_name)
        except gcp_exceptions.NotFound:
            logger.info("RAG file already missing in Vertex AI: %s", rag_file_name)
        except Exception as exc:
            logger.error("Vertex AI delete_file failed for %s: %s", rag_file_name, exc)
            success = False
    else:
        logger.warning("No rag_file_name provided, skipping Vertex AI delete")

    # Phase 2: Direct Weaviate chunk cleanup
    if gcs_uri or rag_file_name:
        n = delete_weaviate_chunks(gcs_uri, rag_file_name=rag_file_name or "")
        if n < 0:
            logger.warning("Weaviate chunk cleanup returned error for %s", gcs_uri)
        elif n > 0:
            logger.info("Cleaned up %d residual Weaviate chunks for %s", n, gcs_uri)
        else:
            logger.info("No residual Weaviate chunks found for %s", gcs_uri)
    else:
        logger.info("No gcs_uri or rag_file_name provided, skipping Weaviate direct cleanup")

    return success


# ---------------------------------------------------------------------------
# Search / Retrieval
# ---------------------------------------------------------------------------

def search_rag(
    query: str,
    *,
    corpus_name: Optional[str] = None,
    top_k: Optional[int] = None,
) -> List[Dict]:
    """
    Query the RAG Engine for relevant chunks.

    Args:
        query:       Natural-language query.
        corpus_name: Corpus resource name (default from config).
        top_k:       Max results.

    Returns:
        List of dicts with keys: content, document_name, similarity, source.
    """
    from vertexai.preview import rag

    _init_vertexai()
    corpus = corpus_name or _corpus_name()

    if top_k is None:
        top_k = int(_cfg("RAG_TOP_K", "5"))

    logger.info("RAG search: query=%r top_k=%d corpus=%s", query[:80], top_k, corpus)

    try:
        rag_resource = rag.RagResource(rag_corpus=corpus)
        # Use rag_retrieval_config only (the newer API).
        # vector_distance_threshold is intentionally set high (0.9) so that
        # all semantically plausible chunks are returned; the LLM is
        # responsible for relevance filtering.  A threshold of 0.5 was
        # previously silently discarding most results for generic queries.
        response = rag.retrieval_query(
            rag_resources=[rag_resource],
            text=query,
            similarity_top_k=top_k,
            rag_retrieval_config=rag.RagRetrievalConfig(
                top_k=top_k,
                filter=rag.Filter(vector_distance_threshold=0.9),
            ),
        )
    except Exception as exc:
        logger.error("RAG retrieval_query failed: %s", exc)
        return []

    results: List[Dict] = []
    contexts = getattr(response, "contexts", None)
    if not contexts:
        logger.info("RAG search returned no contexts (response.contexts is falsy)")
        return []

    # contexts is a RagContexts object with a .contexts list
    context_list = getattr(contexts, "contexts", []) or []
    logger.info("RAG raw context count: %d", len(context_list))
    for ctx in context_list:
        text = getattr(ctx, "text", "") or ""
        source_uri = getattr(ctx, "source_uri", "") or ""
        source_display = getattr(ctx, "source_display_name", "") or ""
        distance = getattr(ctx, "distance", None)
        score = getattr(ctx, "score", None)

        # Log raw scores to help diagnose threshold issues
        logger.debug(
            "RAG ctx: distance=%s score=%s source=%s text_len=%d",
            distance, score, source_uri[:60] if source_uri else "", len(text),
        )

        # Derive similarity from distance or score
        similarity = 0.0
        if score is not None:
            similarity = float(score)
        elif distance is not None:
            similarity = 1.0 - float(distance)

        # Extract document name from source
        doc_name = source_display or _extract_filename(source_uri)

        results.append({
            "content": text,
            "document_name": doc_name,
            "similarity": round(similarity, 4),
            "source": source_uri,
            "heading": None,
            "page_number": None,
        })

    logger.info("RAG search returned %d results", len(results))
    return results


def _extract_filename(source_uri: str) -> str:
    """Extract a human-readable filename from a GCS URI or path."""
    if not source_uri:
        return "unknown"
    # gs://bucket/RAG/filename.pdf → filename.pdf
    parts = source_uri.rstrip("/").split("/")
    return parts[-1] if parts else "unknown"


# ---------------------------------------------------------------------------
# List files
# ---------------------------------------------------------------------------

def list_rag_files(corpus_name: Optional[str] = None) -> List[Dict]:
    """
    List all RAG files in the corpus.

    Returns:
        List of dicts with keys: name, display_name, gcs_uri.
    """
    from vertexai.preview import rag

    _init_vertexai()
    corpus = corpus_name or _corpus_name()

    try:
        files = list(rag.list_files(corpus_name=corpus))
    except Exception as exc:
        logger.error("Failed to list RAG files: %s", exc)
        return []

    result = []
    for f in files:
        gcs_uri = ""
        gcs_source = getattr(f, "gcs_source", None)
        if gcs_source:
            uris = getattr(gcs_source, "uris", [])
            gcs_uri = uris[0] if uris else str(gcs_source)

        result.append({
            "name": f.name,
            "display_name": getattr(f, "display_name", ""),
            "gcs_uri": gcs_uri,
        })
    return result


# ---------------------------------------------------------------------------
# Bucket ↔ DB sync
# ---------------------------------------------------------------------------

def sync_bucket_to_db() -> Dict:
    """
    Compare files in the GCS ``RAG/`` folder against the ``rag_documents`` table.

    Files present in GCS but not tracked in the DB are:
      1. Inserted as ``RagDocument`` rows (status='pending')
      2. Imported into the RAG Engine

    Returns:
        Dict with keys: discovered, imported, errors.
    """
    from app.models import db, RagDocument
    from app import gcp_bucket

    bucket_name = _cfg("GCS_BUCKET_NAME", "")
    rag_folder = _cfg("RAG_GCS_FOLDER", "RAG")
    corpus = _corpus_name()

    if not bucket_name:
        logger.warning("GCS_BUCKET_NAME not set — skipping bucket sync")
        return {"discovered": 0, "imported": 0, "errors": 0}

    stats = {"discovered": 0, "imported": 0, "errors": 0}

    try:
        client = gcp_bucket.get_gcs_client()
        bucket = client.bucket(bucket_name)
        prefix = f"{rag_folder}/"
        blobs = list(bucket.list_blobs(prefix=prefix))
    except Exception as exc:
        logger.error("Failed to list GCS bucket for sync: %s", exc)
        return stats

    # Build set of GCS paths already tracked
    existing_paths = {
        d.gcs_path
        for d in RagDocument.query.with_entities(RagDocument.gcs_path).all()
    }

    for blob in blobs:
        # Skip folder markers
        if blob.name == prefix or blob.name.endswith("/"):
            continue

        if blob.name in existing_paths:
            continue

        stats["discovered"] += 1
        filename = blob.name.split("/")[-1]
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        content_type = blob.content_type or gcp_bucket.get_content_type_from_url(filename)

        try:
            doc = RagDocument(
                filename=filename,
                original_filename=filename,
                content_type=content_type,
                gcs_path=blob.name,
                file_size=blob.size or 0,
                status="pending",
                uploaded_by=None,
                rag_corpus_name=corpus,
            )
            db.session.add(doc)
            db.session.commit()

            # Import into RAG Engine
            gcs_uri = f"gs://{bucket_name}/{blob.name}"
            rag_file_name = import_file_to_rag(gcs_uri, corpus_name=corpus)
            doc.rag_file_name = rag_file_name
            doc.status = "ready"
            db.session.commit()
            stats["imported"] += 1
            logger.info("Synced bucket file → RAG: %s → %s", blob.name, rag_file_name)
        except Exception as exc:
            stats["errors"] += 1
            logger.error("Failed to sync file %s: %s", blob.name, exc)
            # Rollback any failed transaction state before trying to update
            db.session.rollback()
            try:
                # Re-fetch the document since session was rolled back
                existing_doc = RagDocument.query.filter_by(gcs_path=blob.name).first()
                if existing_doc:
                    existing_doc.status = "error"
                    db.session.commit()
            except Exception:
                db.session.rollback()

    logger.info(
        "Bucket sync complete: discovered=%d imported=%d errors=%d",
        stats["discovered"], stats["imported"], stats["errors"],
    )
    return stats
