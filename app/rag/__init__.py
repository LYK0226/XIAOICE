"""
RAG (Retrieval-Augmented Generation) Module for XIAOICE.

Provides a full-featured RAG pipeline:
  1. Document processing: PDF (Docling), TXT, Markdown → heading-based chunks
  2. Secondary splitting: character-based split (800 chars, 100 overlap)
  3. Contextual enrichment: Gemini 3 Flash background summaries
  4. Embedding generation: Vertex AI (Service Account) embeddings on enriched text
  5. Vector storage: PostgreSQL + pgvector
  6. Retrieval: Cosine similarity search with metadata filtering

All AI calls use the project Service Account via Vertex AI — no per-user
API key is required.

Public API:
  - process_document(document_id)     → chunk + enrich + embed + store
  - search_knowledge(query, top_k)    → ranked results
  - delete_document_data(document_id) → remove doc + chunks from DB
  - enrich_chunks(chunks)             → add contextual background to chunks
"""

from app.rag.retriever import search_knowledge
from app.rag.processor import process_document, delete_document_data
from app.rag.enricher import enrich_chunks

__all__ = [
    "process_document",
    "search_knowledge",
    "delete_document_data",
    "enrich_chunks",
]
