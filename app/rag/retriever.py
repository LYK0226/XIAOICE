"""
Vector-based knowledge retrieval for RAG.

Queries the Vertex AI RAG Engine (backed by Weaviate) for relevant document
chunks, returning results with source metadata.
"""

import logging
import os
from typing import Dict, List, Optional

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


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def search_knowledge(
    query: str,
    *,
    top_k: Optional[int] = None,
    user_id: Optional[int] = None,
    **kwargs,
) -> List[Dict]:
    """
    Search the RAG knowledge base for chunks most relevant to *query*.

    Uses the Vertex AI RAG Engine retrieval API.

    Args:
        query:    Natural-language query to search for.
        top_k:    Max results to return (default from config).
        user_id:  Kept for backward compatibility (unused -- RAG Engine
                  uses service account auth).

    Returns:
        List of dicts, each with keys:
          content, heading, document_name, page_number, similarity, source
        Sorted by similarity descending.
    """
    from app.rag.rag_engine import search_rag

    if top_k is None:
        top_k = _get_top_k()

    try:
        results = search_rag(query, top_k=top_k)
    except Exception as exc:
        logger.error("RAG Engine search failed: %s", exc)
        return []

    logger.info(
        "RAG search: query=%r -> %d results (top_k=%d)",
        query[:80], len(results), top_k,
    )
    return results


def format_context(results: List[Dict], *, max_chars: int = 6000) -> str:
    """
    Format search results into a context string suitable for LLM injection.

    Returns a block like:
        [Knowledge Base Excerpt 1]
        <chunk text>

        [Knowledge Base Excerpt 2]
        <chunk text>
    """
    if not results:
        return ""

    parts: List[str] = []
    char_count = 0

    for i, r in enumerate(results, 1):
        heading = r.get("heading") or ""

        # Omit source filenames — the LLM should incorporate content naturally
        # without citing document titles or filenames.
        header = f"[Knowledge Base Excerpt {i}"
        if heading:
            header += f" | {heading}"
        header += "]"

        block = f"{header}\n{r['content']}"
        if char_count + len(block) > max_chars:
            break
        parts.append(block)
        char_count += len(block) + 2  # +2 for separator newlines

    return "\n\n".join(parts)
