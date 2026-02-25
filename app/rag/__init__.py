"""
RAG (Retrieval-Augmented Generation) Module for XIAOICE.

Uses GCP Vertex AI RAG Engine (Weaviate vector store) with Document AI
layout parsing.  The full pipeline:
  1. Document upload -> GCS ``RAG/`` folder
  2. Import into Vertex AI RAG Engine (auto-chunking + embedding via Weaviate)
  3. Retrieval via RAG Engine retrieval_query API

This is a GLOBAL knowledge base managed by admins, focused on
early childhood education materials.

Public API:
  - process_document(document_id)     -> import into RAG Engine
  - search_knowledge(query, top_k)    -> ranked results from Weaviate
  - delete_document_data(document_id) -> remove from RAG Engine + DB
"""

from app.rag.retriever import search_knowledge, format_context
from app.rag.processor import process_document, delete_document_data

__all__ = [
    "process_document",
    "search_knowledge",
    "delete_document_data",
    "format_context",
]
