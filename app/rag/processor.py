"""
Document processing pipeline for RAG.

Orchestrates: upload to GCS → import into Vertex AI RAG Engine.
Chunking and embedding are handled by the RAG Engine with Document AI
layout parsing.
"""

import logging
import os
from typing import Optional

from app.rag.rag_engine import import_file_to_rag, delete_rag_file

logger = logging.getLogger(__name__)


def process_document(document_id: int) -> bool:
    """
    Process a RAG document by importing it into the Vertex AI RAG Engine.

    The file must already exist in GCS (uploaded by the route handler).
    This function:
      1. Constructs a ``gs://`` URI from the document's ``gcs_path``
      2. Calls ``import_file_to_rag()`` which imports via Document AI layout parser
      3. Stores the returned ``rag_file_name`` on the DB row
      4. Sets status to ``ready``

    Args:
        document_id: Primary key of the RagDocument row.

    Returns:
        True on success, False on failure.
    """
    from app.models import db, RagDocument

    doc = RagDocument.query.get(document_id)
    if not doc:
        logger.error("RagDocument %d not found", document_id)
        return False

    try:
        doc.status = "processing"
        db.session.commit()

        # Build GCS URI
        bucket_name = os.environ.get("GCS_BUCKET_NAME")
        if not bucket_name:
            from flask import current_app
            bucket_name = current_app.config.get("GCS_BUCKET_NAME")
        if not bucket_name:
            raise ValueError("GCS_BUCKET_NAME not configured")

        gcs_uri = f"gs://{bucket_name}/{doc.gcs_path}"
        logger.info("Importing document %d into RAG Engine: %s", document_id, gcs_uri)

        # Resolve corpus name
        corpus_name = None
        try:
            from flask import current_app
            corpus_name = current_app.config.get("RAG_CORPUS_NAME")
        except RuntimeError:
            pass
        if not corpus_name:
            corpus_name = os.environ.get(
                "RAG_CORPUS_NAME",
                "projects/fyp-project-4f3b7/locations/us-west1/ragCorpora/3458764513820540928",
            )

        # Import into RAG Engine
        rag_file_name = import_file_to_rag(gcs_uri, corpus_name=corpus_name)

        # Update document record
        doc.rag_file_name = rag_file_name
        doc.rag_corpus_name = corpus_name
        doc.status = "ready"
        db.session.commit()

        logger.info(
            "Document %d imported successfully: rag_file=%s",
            document_id, rag_file_name,
        )
        return True

    except Exception as exc:
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
    Delete a document from the RAG Engine (Weaviate) and the database.

    This removes:
      - The RAG file + all associated chunks from Weaviate (via RAG Engine API)
      - The ``RagDocument`` row from PostgreSQL

    GCS file deletion should be handled by the caller.

    Args:
        document_id: Primary key of the RagDocument row.

    Returns:
        True on success, False on failure.
    """
    from app.models import db, RagDocument

    doc = RagDocument.query.get(document_id)
    if not doc:
        logger.warning("RagDocument %d not found for deletion", document_id)
        return True  # idempotent

    try:
        # Build GCS URI for Weaviate cleanup
        gcs_uri = ""
        if doc.gcs_path:
            bucket_name = os.environ.get("GCS_BUCKET_NAME", "")
            if not bucket_name:
                try:
                    from flask import current_app
                    bucket_name = current_app.config.get("GCS_BUCKET_NAME", "")
                except RuntimeError:
                    pass
            if bucket_name:
                gcs_uri = f"gs://{bucket_name}/{doc.gcs_path}"

        # Delete from RAG Engine (Vertex AI) + Weaviate (direct cleanup)
        delete_rag_file(doc.rag_file_name or "", gcs_uri=gcs_uri)

        # Delete DB row
        db.session.delete(doc)
        db.session.commit()
        logger.info("Deleted document %d and RAG file %s", document_id, doc.rag_file_name)
        return True
    except Exception as exc:
        logger.exception("Failed to delete document %d: %s", document_id, exc)
        db.session.rollback()
        return False
