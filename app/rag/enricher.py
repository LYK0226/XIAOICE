"""
Contextual enrichment for RAG chunks via Gemini.

Sends all chunks to Gemini in batched prompts (up to BATCH_SIZE per call)
to generate 1–2 sentence background summaries, then concatenates each
summary with its original content for embedding.

Format of enriched content:
    背景：<LLM-generated background summary>
    正文：<original chunk content>

All AI calls use the project Service Account via Vertex AI — no per-user
API key is required.
"""

import json
import logging
import os
import time
from typing import List, Optional

logger = logging.getLogger(__name__)

# Max chunks per Gemini call — keeps prompt within context limits
_BATCH_SIZE = 20
_RETRY_DELAY = 2


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

def _get_context_model() -> str:
    """Return the Gemini model used for contextual enrichment."""
    try:
        from flask import current_app
        return current_app.config.get("RAG_CONTEXT_MODEL", "gemini-3-flash-preview")
    except RuntimeError:
        return os.environ.get("RAG_CONTEXT_MODEL", "gemini-3-flash-preview")


def _get_vertex_genai_client():
    """
    Build a google-genai Client using the project Service Account for
    Vertex AI calls.
    """
    from google import genai

    credentials_path = (
        os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        or os.environ.get("GCS_CREDENTIALS_PATH")
    )
    if credentials_path:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

    project = None
    location = None
    try:
        from flask import current_app
        project = current_app.config.get("GOOGLE_CLOUD_PROJECT")
        location = current_app.config.get("GOOGLE_CLOUD_LOCATION", "global")
    except RuntimeError:
        pass

    if not project:
        project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if not location:
        location = os.environ.get("GOOGLE_CLOUD_LOCATION", "global")

    if not project:
        raise RuntimeError(
            "GOOGLE_CLOUD_PROJECT is not set. "
            "Configure it in .env or app config for Vertex AI."
        )

    return genai.Client(vertexai=True, project=project, location=location)


# ---------------------------------------------------------------------------
# Batch prompt template
# ---------------------------------------------------------------------------

_BATCH_PROMPT = """你是一個文件背景摘要助手。以下有 {count} 個段落，請為每個段落各寫出1到2句話的背景說明。

請用以下格式回覆（純 JSON 陣列，不要加上其他文字或 markdown 格式，只要背景說明的字串陣列）：
["段落1的背景說明", "段落2的背景說明", ...]

段落列表：
{chunks_text}"""


def _format_chunks_for_batch(chunks, start: int, end: int) -> str:
    """Format a slice of chunks into numbered text for the batch prompt."""
    parts = []
    for i in range(start, end):
        c = chunks[i]
        heading = c.heading or "無"
        # Truncate content to avoid overly long prompts
        content = c.content[:1000] if len(c.content) > 1000 else c.content
        parts.append(f"---段落 {i - start + 1}---\n標題：{heading}\n內容：{content}")
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Batch call
# ---------------------------------------------------------------------------

def _generate_context_batch(
    client,
    model: str,
    chunks,
    start: int,
    end: int,
) -> List[str]:
    """
    Call Gemini once for a batch of chunks, returning summaries.

    Returns a list of summary strings (length = end - start).
    On parse failure, returns empty strings for the batch.
    """
    batch_count = end - start
    chunks_text = _format_chunks_for_batch(chunks, start, end)
    prompt = _BATCH_PROMPT.format(count=batch_count, chunks_text=chunks_text)

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config={
            "temperature": 0.2,
            "max_output_tokens": 8192,
        },
    )

    raw_text = response.text if response.text else ""
    raw_text = raw_text.strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw_text = "\n".join(lines).strip()

    try:
        summaries = json.loads(raw_text)
        if isinstance(summaries, list) and len(summaries) == batch_count:
            return [str(s).strip() for s in summaries]
        else:
            logger.warning(
                "Batch enrichment returned %d summaries, expected %d",
                len(summaries) if isinstance(summaries, list) else 0,
                batch_count,
            )
            # Pad/truncate to correct size
            if isinstance(summaries, list):
                result = [str(s).strip() for s in summaries[:batch_count]]
                result.extend([""] * (batch_count - len(result)))
                return result
            return [""] * batch_count
    except (json.JSONDecodeError, TypeError) as exc:
        # Try to recover partial JSON (truncated response)
        partial = _recover_partial_json(raw_text, batch_count)
        if partial:
            logger.warning(
                "Recovered %d/%d summaries from truncated JSON response",
                sum(1 for s in partial if s), batch_count,
            )
            return partial
        logger.warning(
            "Failed to parse batch enrichment response as JSON: %s — "
            "raw response: %.200s",
            exc, raw_text,
        )
        return [""] * batch_count


def _recover_partial_json(raw_text: str, expected_count: int) -> List[str]:
    """Try to extract as many complete strings as possible from truncated JSON."""
    import re
    # Match complete quoted strings from the array
    strings = re.findall(r'"((?:[^"\\]|\\.)*)"', raw_text)
    if not strings:
        return []
    result = [s.strip() for s in strings[:expected_count]]
    result.extend([""] * (expected_count - len(result)))
    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def enrich_chunks(chunks, max_retries: int = 2) -> None:
    """
    Enrich a list of Chunk objects in-place by generating contextual
    background summaries in batches and building enriched content.

    Chunks are sent to Gemini in batches of up to _BATCH_SIZE (20).
    Each batch gets a single API call that returns all summaries at once.

    For each chunk:
      1. Background summary from the batch Gemini response.
      2. Build enriched_content = "背景：{summary}\\n正文：{original content}"

    On failure for any batch, graceful degradation:
      - context_summary = ""
      - enriched_content = original content (no background prefix)

    Args:
        chunks:      List of Chunk objects (modified in-place).
        max_retries: Max retries on transient API errors per batch.
    """
    if not chunks:
        return

    try:
        client = _get_vertex_genai_client()
        model = _get_context_model()
    except Exception as exc:
        logger.error(
            "Failed to initialize Vertex AI client for enrichment: %s — "
            "chunks will use original content only",
            exc,
        )
        for chunk in chunks:
            chunk.context_summary = ""
            chunk.enriched_content = chunk.content
        return

    total = len(chunks)
    batch_count = (total + _BATCH_SIZE - 1) // _BATCH_SIZE
    logger.info(
        "Enriching %d chunks in %d batch(es) via %s…",
        total, batch_count, model,
    )

    for batch_idx in range(0, total, _BATCH_SIZE):
        batch_end = min(batch_idx + _BATCH_SIZE, total)
        batch_num = batch_idx // _BATCH_SIZE + 1
        summaries = None

        for attempt in range(1, max_retries + 1):
            try:
                summaries = _generate_context_batch(
                    client, model, chunks, batch_idx, batch_end,
                )
                break
            except Exception as exc:
                if attempt < max_retries:
                    wait = _RETRY_DELAY * attempt
                    logger.warning(
                        "Batch %d/%d enrichment attempt %d/%d failed: %s. "
                        "Retrying in %ds…",
                        batch_num, batch_count, attempt, max_retries, exc, wait,
                    )
                    time.sleep(wait)
                else:
                    logger.warning(
                        "Batch %d/%d enrichment failed after %d attempts: %s — "
                        "using original content",
                        batch_num, batch_count, max_retries, exc,
                    )
                    summaries = [""] * (batch_end - batch_idx)

        # Apply summaries to chunks
        for i, summary in enumerate(summaries or [""] * (batch_end - batch_idx)):
            chunk = chunks[batch_idx + i]
            chunk.context_summary = summary
            chunk.enriched_content = build_enriched_content(summary, chunk.content)

        logger.info(
            "Batch %d/%d complete: enriched chunks %d–%d",
            batch_num, batch_count, batch_idx + 1, batch_end,
        )

    enriched_count = sum(1 for c in chunks if c.context_summary)
    logger.info(
        "Enrichment complete: %d/%d chunks enriched successfully",
        enriched_count, total,
    )


def build_enriched_content(context_summary: str, original_content: str) -> str:
    """
    Concatenate background summary with original content.

    Format:
        背景：<summary>
        正文：<original content>

    If context_summary is empty, returns original content only.
    """
    if not context_summary:
        return original_content

    return f"背景：{context_summary}\n正文：{original_content}"
