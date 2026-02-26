"""
Vector-based knowledge retrieval for RAG.

Performs cosine similarity search on the rag_chunks table using pgvector's
<=> (cosine distance) operator, returning the most relevant chunks for a
given query along with source metadata.

All embedding calls use the project Service Account via Vertex AI — no
per-user API key is required.
"""

import logging
import os
from typing import Dict, List, Optional

from sqlalchemy import text

from app.rag.embeddings import generate_query_embedding

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def _get_top_k() -> int:
    try:
        from flask import current_app
        return current_app.config.get("RAG_TOP_K", 5)
    except RuntimeError:
        return int(os.environ.get("RAG_TOP_K", "5"))


def _get_min_similarity() -> float:
    try:
        from flask import current_app
        return current_app.config.get("RAG_MIN_SIMILARITY", 0.3)
    except RuntimeError:
        return float(os.environ.get("RAG_MIN_SIMILARITY", "0.3"))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def search_knowledge(
    query: str,
    *,
    top_k: Optional[int] = None,
    min_similarity: Optional[float] = None,
    document_id: Optional[int] = None,
) -> List[Dict]:
    """
    Search the RAG knowledge base for chunks most relevant to *query*.

    Args:
        query:          Natural-language query to search for.
        top_k:          Max results to return (default from config).
        min_similarity: Minimum cosine similarity threshold (0-1).
        document_id:    Optional filter to search within a specific document.

    Returns:
        List of dicts sorted by similarity descending.
    """
    from app.models import db

    if top_k is None:
        top_k = _get_top_k()
    if min_similarity is None:
        min_similarity = _get_min_similarity()

    try:
        query_embedding = generate_query_embedding(query)
    except Exception as exc:
        logger.error("Failed to generate query embedding: %s", exc)
        return []

    embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

    sql = text("""
        SELECT
            c.id,
            c.content,
            c.heading,
            c.page_number,
            c.document_id,
            d.original_filename AS document_name,
            1 - (c.embedding <=> :embedding ::vector) AS similarity
        FROM rag_chunks c
        JOIN rag_documents d ON d.id = c.document_id
        WHERE d.status = 'ready'
          AND (:doc_id IS NULL OR c.document_id = :doc_id)
          AND 1 - (c.embedding <=> :embedding ::vector) >= :min_sim
        ORDER BY c.embedding <=> :embedding ::vector
        LIMIT :top_k
    """)

    rows = db.session.execute(sql, {
        "embedding": embedding_str,
        "doc_id": document_id,
        "min_sim": min_similarity,
        "top_k": top_k,
    }).fetchall()

    results = []
    for row in rows:
        results.append({
            "chunk_id": row.id,
            "content": row.content,
            "heading": row.heading,
            "page_number": row.page_number,
            "document_id": row.document_id,
            "document_name": row.document_name,
            "similarity": round(float(row.similarity), 4),
        })

    logger.info(
        "RAG search: query=%r -> %d results (top_k=%d, min_sim=%.2f)",
        query[:80], len(results), top_k, min_similarity,
    )
    return results


def format_context(results: List[Dict], *, max_chars: int = 6000) -> str:
    """
    Format search results into a context string suitable for LLM injection.
    """
    if not results:
        return ""

    parts: List[str] = []
    char_count = 0

    for i, r in enumerate(results, 1):
        source = r.get("document_name", "unknown")
        page = r.get("page_number")
        heading = r.get("heading") or ""

        header = f"[Knowledge Base Reference {i} — Source: {source}"
        if page:
            header += f", p.{page}"
        if heading:
            header += f" | {heading}"
        header += f" | relevance: {r['similarity']:.0%}]"

        block = f"{header}\n{r['content']}"
        if char_count + len(block) > max_chars:
            break
        parts.append(block)
        char_count += len(block) + 2

    return "\n\n".join(parts)
