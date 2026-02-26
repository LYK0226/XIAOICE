"""
RAG (Retrieval-Augmented Generation) Module for XIAOICE.

Provides a full-featured RAG pipeline:
  1. Document processing: PDF, TXT, Markdown → Gemini-powered semantic chunks
  2. Embedding generation: Vertex AI (Service Account) embeddings
  3. Vector storage: PostgreSQL + pgvector
  4. Retrieval: Cosine similarity search with metadata filtering

All AI calls use the project Service Account via Vertex AI — no per-user
API key is required.

Public API:
  - process_document(document_id)     → chunk + embed + store
  - search_knowledge(query, top_k)    → ranked results
  - delete_document_data(document_id) → remove doc + chunks from DB
"""

from app.rag.retriever import search_knowledge
from app.rag.processor import process_document, delete_document_data

__all__ = [
    "process_document",
    "search_knowledge",
    "delete_document_data",
]
