"""
Document processing pipeline for RAG.

Orchestrates:
  file download from GCS → chunking → embedding → DB storage
"""

import logging
from typing import Optional

from app.rag.chunker import chunk_document
from app.rag.embeddings import generate_embeddings

logger = logging.getLogger(__name__)


def process_document(document_id: int) -> bool:
    """
    Process a RAG document end-to-end:
      1. Download file bytes from GCS
      2. Chunk the document semantically
      3. Generate embeddings for each chunk
      4. Store chunks + embeddings in rag_chunks table
      5. Update document status to 'ready'

    Args:
        document_id: Primary key of the RagDocument row.

    Returns:
        True on success, False on failure.
    """
    from app.models import db, RagDocument, RagChunk
    from app import gcp_bucket

    doc = RagDocument.query.get(document_id)
    if not doc:
        logger.error("RagDocument %d not found", document_id)
        return False

    try:
        doc.status = "processing"
        db.session.commit()

        # 1. Download from GCS
        logger.info("Downloading document %d from GCS: %s", document_id, doc.gcs_path)
        file_bytes = _download_from_gcs(doc.gcs_path)

        # 2. Chunk
        logger.info("Chunking document %d (%s, %s)", document_id, doc.content_type, doc.original_filename)
        chunks = chunk_document(file_bytes, doc.content_type, doc.original_filename)
        if not chunks:
            raise ValueError("Document produced no chunks — it may be empty or unreadable")

        logger.info("Document %d produced %d chunks", document_id, len(chunks))

        # 3. Generate embeddings
        texts = [c.content for c in chunks]
        logger.info("Generating embeddings for %d chunks…", len(texts))
        uploader_api_key = _get_uploader_api_key(doc.uploaded_by)
        embeddings = generate_embeddings(
            texts,
            task_type="RETRIEVAL_DOCUMENT",
            api_key=uploader_api_key,
        )

        if len(embeddings) != len(chunks):
            raise ValueError(
                f"Embedding count mismatch: {len(embeddings)} embeddings for {len(chunks)} chunks"
            )

        # 4. Delete existing chunks (in case of reprocessing)
        RagChunk.query.filter_by(document_id=document_id).delete()

        # 5. Insert new chunks
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            db_chunk = RagChunk(
                document_id=document_id,
                chunk_index=idx,
                content=chunk.content,
                heading=chunk.heading,
                page_number=chunk.page_number,
                char_start=chunk.char_start,
                char_end=chunk.char_end,
                embedding=embedding,
                token_count=_estimate_tokens(chunk.content),
            )
            db.session.add(db_chunk)

        # 6. Update document status
        doc.status = "ready"
        doc.chunk_count = len(chunks)
        db.session.commit()

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
        except Exception:
            db.session.rollback()
        return False


def delete_document_data(document_id: int) -> bool:
    """
    Delete a document and all its chunks from the database.
    GCS file deletion should be handled by the caller.

    Args:
        document_id: Primary key of the RagDocument row.

    Returns:
        True on success, False on failure.
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
    import os
    from google.cloud import storage

    bucket_name = os.environ.get("GCS_BUCKET_NAME")
    if not bucket_name:
        from flask import current_app
        bucket_name = current_app.config.get("GCS_BUCKET_NAME")

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
    """
    Rough token-count estimate.
    For CJK-heavy text: ~1.5 chars per token.
    For Latin text: ~4 chars per token.
    We use a blended heuristic.
    """
    cjk_count = sum(1 for c in text if '\u4e00' <= c <= '\u9fff' or '\u3400' <= c <= '\u4dbf')
    latin_count = len(text) - cjk_count
    return int(cjk_count / 1.5 + latin_count / 4)


def _get_uploader_api_key(user_id: Optional[int]) -> Optional[str]:
    """
    Resolve uploader's AI Studio API key for RAG embedding.

    Priority:
      1) UserProfile.selected_api_key_id if active and provider == ai_studio
      2) Most recently updated active ai_studio key for the user

    Returns:
      Decrypted API key string, or None if unavailable.
    """
    if not user_id:
        return None

    from app.models import UserProfile, UserApiKey

    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if profile and profile.selected_api_key and profile.selected_api_key.is_active:
        if profile.selected_api_key.provider == "ai_studio":
            selected_key = profile.selected_api_key.get_decrypted_key()
            if selected_key:
                logger.info("Using uploader selected API key for RAG embedding (user_id=%s)", user_id)
                return selected_key

    fallback_key = (
        UserApiKey.query
        .filter_by(user_id=user_id, is_active=True, provider="ai_studio")
        .order_by(UserApiKey.updated_at.desc())
        .first()
    )
    if fallback_key:
        decrypted = fallback_key.get_decrypted_key()
        if decrypted:
            logger.info("Using uploader fallback API key for RAG embedding (user_id=%s)", user_id)
            return decrypted

    return None
