"""
Document processing pipeline for RAG.

Orchestrates:
  file download from GCS -> Gemini chunking -> Vertex AI embedding -> DB storage

All AI calls use the project Service Account (Vertex AI) — no per-user API
key is required.  Status updates are pushed to the admin frontend via
Socket.IO so background processing is visible in real time.
"""

import logging
import os
from typing import Optional

from app.rag.chunker import chunk_document
from app.rag.embeddings import generate_embeddings
from app.rag.enricher import enrich_chunks

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Socket.IO status helpers
# ---------------------------------------------------------------------------

def _emit_status(document_id: int, status: str, chunk_count: int = 0, error: str = ""):
    """Push a real-time status update to connected admin clients."""
    try:
        from app import socketio
        socketio.emit("rag_document_status", {
            "document_id": document_id,
            "status": status,
            "chunk_count": chunk_count,
            "error": error,
        }, namespace="/")
    except Exception as exc:
        logger.debug("Could not emit rag_document_status: %s", exc)


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def process_document(document_id: int) -> bool:
    """
    Process a RAG document end-to-end:
      1. Download file bytes from GCS
      2. Chunk the document via Gemini
      3. Generate embeddings via Vertex AI
      4. Store chunks + embeddings in rag_chunks table
      5. Update document status to 'ready'

    Status changes are emitted via Socket.IO for real-time frontend updates.

    Args:
        document_id: Primary key of the RagDocument row.

    Returns:
        True on success, False on failure.
    """
    from app.models import db, RagDocument, RagChunk

    doc = RagDocument.query.get(document_id)
    if not doc:
        logger.error("RagDocument %d not found", document_id)
        return False

    try:
        doc.status = "processing"
        db.session.commit()
        _emit_status(document_id, "processing")

        # 1. Download from GCS
        logger.info("Downloading document %d from GCS: %s", document_id, doc.gcs_path)
        file_bytes = _download_from_gcs(doc.gcs_path)

        # 2. Chunk (Docling + heading split + secondary split)
        logger.info("Chunking document %d (%s, %s)", document_id, doc.content_type, doc.original_filename)
        _emit_status(document_id, "chunking")
        chunks = chunk_document(file_bytes, doc.content_type, doc.original_filename)
        if not chunks:
            raise ValueError("Document produced no chunks — it may be empty or unreadable")

        logger.info("Document %d produced %d chunks", document_id, len(chunks))

        # 3. Enrich chunks with contextual background (Gemini 3 Flash)
        logger.info("Enriching %d chunks with contextual background…", len(chunks))
        _emit_status(document_id, "enriching")
        enrich_chunks(chunks)
        logger.info("Enrichment complete for document %d", document_id)

        # 4. Generate embeddings on enriched content (Vertex AI service account)
        texts = [c.enriched_content or c.content for c in chunks]
        logger.info("Generating embeddings for %d chunks…", len(texts))
        _emit_status(document_id, "embedding")
        embeddings = generate_embeddings(texts, task_type="RETRIEVAL_DOCUMENT")

        if len(embeddings) != len(chunks):
            raise ValueError(
                f"Embedding count mismatch: {len(embeddings)} embeddings for {len(chunks)} chunks"
            )

        # 5. Delete existing chunks (in case of reprocessing)
        RagChunk.query.filter_by(document_id=document_id).delete()

        # 6. Insert new chunks
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            db_chunk = RagChunk(
                document_id=document_id,
                chunk_index=idx,
                content=chunk.content,
                enriched_content=chunk.enriched_content or chunk.content,
                heading=chunk.heading,
                page_number=chunk.page_number,
                char_start=chunk.char_start,
                char_end=chunk.char_end,
                embedding=embedding,
                token_count=_estimate_tokens(chunk.enriched_content or chunk.content),
            )
            db.session.add(db_chunk)

        # 7. Update document status
        doc.status = "ready"
        doc.chunk_count = len(chunks)
        db.session.commit()

        _emit_status(document_id, "ready", chunk_count=len(chunks))
        logger.info("Document %d processed successfully: %d chunks stored", document_id, len(chunks))
        return True

    except Exception as exc:
        exc_text = str(exc)
        if (
            "Failed to initialize embedding client" in exc_text
            or "Embedding generation failed after trying models" in exc_text
        ):
            logger.error("Failed to process document %d: %s", document_id, exc)
        else:
            logger.exception("Failed to process document %d: %s", document_id, exc)
        try:
            doc.status = "error"
            doc.metadata_ = doc.metadata_ or {}
            doc.metadata_["error"] = str(exc)[:500]
            db.session.commit()
            _emit_status(document_id, "error", error=str(exc)[:200])
        except Exception:
            db.session.rollback()
        return False


def delete_document_data(document_id: int) -> bool:
    """
    Delete a document and all its chunks from the database.
    GCS file deletion should be handled by the caller.
    """
    from app.models import db, RagDocument, RagChunk

    try:
        RagChunk.query.filter_by(document_id=document_id).delete()
        RagDocument.query.filter_by(id=document_id).delete()
        db.session.commit()
        logger.info("Deleted document %d and all chunks", document_id)
        return True
    except Exception as exc:
        logger.exception("Failed to delete document %d: %s", document_id, exc)
        db.session.rollback()
        return False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _download_from_gcs(gcs_path: str) -> bytes:
    """Download file from GCS using the configured bucket."""
    from google.cloud import storage

    bucket_name = os.environ.get("GCS_BUCKET_NAME")
    if not bucket_name:
        try:
            from flask import current_app
            bucket_name = current_app.config.get("GCS_BUCKET_NAME")
        except RuntimeError:
            pass

    if not bucket_name:
        raise ValueError("GCS_BUCKET_NAME not configured")

    credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or os.environ.get("GCS_CREDENTIALS_PATH")
    if credentials_path:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(gcs_path)
    return blob.download_as_bytes()


def _estimate_tokens(text: str) -> int:
    """Rough token-count estimate (CJK ~1.5 chars/token, Latin ~4 chars/token)."""
    cjk_count = sum(1 for c in text if '\u4e00' <= c <= '\u9fff' or '\u3400' <= c <= '\u4dbf')
    latin_count = len(text) - cjk_count
    return int(cjk_count / 1.5 + latin_count / 4)
