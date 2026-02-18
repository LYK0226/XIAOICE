"""
Vector-based knowledge retrieval for RAG.

Performs cosine similarity search on the rag_chunks table using pgvector's
<=> (cosine distance) operator, returning the most relevant chunks for a
given query along with source metadata.
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
    from flask import current_app
    try:
        return current_app.config.get("RAG_TOP_K", 5)
    except RuntimeError:
        return int(os.environ.get("RAG_TOP_K", "5"))


def _get_min_similarity() -> float:
    from flask import current_app
    try:
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
    user_id: Optional[int] = None,
) -> List[Dict]:
    """
    Search the RAG knowledge base for chunks most relevant to *query*.

    Args:
        query:          Natural-language query to search for.
        top_k:          Max results to return (default from config).
        min_similarity: Minimum cosine similarity threshold (0-1).
        document_id:    Optional filter to search within a specific document.
        user_id:        Optional user id used to resolve per-user AI Studio API key.

    Returns:
        List of dicts, each with keys:
          content, heading, document_name, page_number, similarity, document_id
        Sorted by similarity descending.
    """
    from app.models import db

    if top_k is None:
        top_k = _get_top_k()
    if min_similarity is None:
        min_similarity = _get_min_similarity()

    api_key = _get_user_api_key(user_id)

    try:
        query_embedding = generate_query_embedding(query, api_key=api_key)
    except Exception as exc:
        logger.error("Failed to generate query embedding: %s", exc)
        return []

    # pgvector cosine distance: <=> returns distance in [0, 2].
    # similarity = 1 - distance.
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
        "RAG search: query=%r → %d results (top_k=%d, min_sim=%.2f)",
        query[:80], len(results), top_k, min_similarity,
    )
    return results


def _get_user_api_key(user_id: Optional[int]) -> Optional[str]:
    """Resolve user API key for embedding requests."""
    if not user_id:
        return None

    from app.models import UserProfile, UserApiKey

    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if profile and profile.selected_api_key and profile.selected_api_key.is_active:
        if profile.selected_api_key.provider == "ai_studio":
            selected_key = profile.selected_api_key.get_decrypted_key()
            if selected_key:
                return selected_key

    fallback_key = (
        UserApiKey.query
        .filter_by(user_id=user_id, is_active=True, provider="ai_studio")
        .order_by(UserApiKey.updated_at.desc())
        .first()
    )
    if fallback_key:
        return fallback_key.get_decrypted_key()

    return None


def format_context(results: List[Dict], *, max_chars: int = 6000) -> str:
    """
    Format search results into a context string suitable for LLM injection.

    Returns a block like:
        [Knowledge Base Reference 1 — Source: filename.pdf, p.3]
        <chunk text>

        [Knowledge Base Reference 2 — Source: guide.md]
        <chunk text>
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
        char_count += len(block) + 2  # +2 for separator newlines

    return "\n\n".join(parts)
