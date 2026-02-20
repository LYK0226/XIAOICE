"""
RAG (Retrieval-Augmented Generation) Module for XIAOICE.

Provides a full-featured RAG pipeline:
  1. Document processing: PDF, TXT, Markdown → semantic chunks
  2. Embedding generation: Google text-multilingual-embedding-002
  3. Vector storage: PostgreSQL + pgvector
  4. Retrieval: Cosine similarity search with metadata filtering

This is a GLOBAL knowledge base managed by admins, focused on
early childhood education materials.

Public API:
  - process_document(document_id)     → chunk + embed + store
  - search_knowledge(query, top_k)    → ranked results
  - delete_document(document_id)      → remove doc + chunks from DB & GCS
"""

from app.rag.retriever import search_knowledge
from app.rag.processor import process_document, delete_document_data

__all__ = [
    "process_document",
    "search_knowledge",
    "delete_document_data",
]
