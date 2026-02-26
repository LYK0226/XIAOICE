"""
Gemini-powered semantic document chunker for RAG.

Sends the full document text to a Gemini model which splits it into
meaning-based chunks.  Falls back to simple paragraph splitting if the
Gemini call fails.

Supported formats:
  • PDF  – via PyMuPDF (fitz), extracts text with page metadata
  • TXT  – plain text
  • MD   – Markdown
"""

import json
import logging
import os
import re
from dataclasses import dataclass
from typing import List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class Chunk:
    """A single chunk of document text with provenance metadata."""
    content: str
    heading: Optional[str] = None
    page_number: Optional[int] = None
    char_start: int = 0
    char_end: int = 0


# ---------------------------------------------------------------------------
# Vertex AI / Gemini client helper
# ---------------------------------------------------------------------------

def _get_vertex_genai_client():
    """
    Build a google-genai Client using the project Service Account for
    Vertex AI calls.  Reads GCS_CREDENTIALS_PATH -> sets
    GOOGLE_APPLICATION_CREDENTIALS, then uses GOOGLE_CLOUD_PROJECT /
    GOOGLE_CLOUD_LOCATION.
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


def _get_chunking_model() -> str:
    """Return the Gemini model used for semantic chunking."""
    try:
        from flask import current_app
        return current_app.config.get("RAG_CHUNKING_MODEL", "gemini-3-flash-preview")
    except RuntimeError:
        return os.environ.get("RAG_CHUNKING_MODEL", "gemini-3-flash-preview")


# ---------------------------------------------------------------------------
# PDF text extraction (preserves page numbers)
# ---------------------------------------------------------------------------

def _clean_pdf_line(line: str) -> str:
    """Clean a single line extracted from a PDF."""
    line = line.strip()
    if not line:
        return ""
    if re.fullmatch(r'\d{1,4}', line):
        return ""
    if re.fullmatch(r'\d{1,4}-\d{1,4}', line):
        return ""
    if len(line) <= 2 and not line[0].isalpha():
        return ""
    return line


def _extract_pdf_text(file_bytes: bytes) -> str:
    """
    Extract text from a PDF with page markers so Gemini can track page numbers.
    Returns text with ``[PAGE N]`` markers before each page's content.
    """
    import fitz  # PyMuPDF

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages: List[str] = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        blocks = page.get_text("dict", sort=True).get("blocks", [])

        parts: List[str] = []
        for block in blocks:
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                line_text = "".join(s.get("text", "") for s in spans)
                cleaned = _clean_pdf_line(line_text)
                if cleaned:
                    parts.append(cleaned)

        page_text = "\n".join(parts).strip()
        if page_text:
            pages.append(f"[PAGE {page_num + 1}]\n{page_text}")

    doc.close()
    return "\n\n".join(pages)


# ---------------------------------------------------------------------------
# JSON repair for truncated Gemini output
# ---------------------------------------------------------------------------

def _repair_truncated_json(raw: str) -> list:
    """
    Attempt to salvage a truncated JSON array from Gemini output.
    Finds the last complete object in the array and closes the array.
    Raises ValueError if repair fails.
    """
    # Find the last complete object ending with "}"
    last_brace = raw.rfind("}")
    if last_brace == -1:
        raise ValueError("No complete JSON object found in truncated output")

    # Take everything up to and including the last complete "}"
    candidate = raw[:last_brace + 1].rstrip().rstrip(",")

    # Ensure it ends as a valid JSON array
    if not candidate.endswith("]"):
        candidate += "]"

    try:
        data = json.loads(candidate)
        if isinstance(data, list) and len(data) > 0:
            logger.warning(
                "Repaired truncated Gemini JSON: recovered %d chunks", len(data)
            )
            return data
    except json.JSONDecodeError:
        pass

    raise ValueError("Could not repair truncated JSON from Gemini")


# ---------------------------------------------------------------------------
# Gemini-powered chunking
# ---------------------------------------------------------------------------

_CHUNKING_PROMPT = """You are a document chunking assistant. Your task is to split the following document into meaningful, self-contained chunks based on different topics or ideas.

Rules:
1. Each chunk should cover ONE coherent topic or idea.
2. Chunks should be self-contained — a reader should understand the chunk without needing other chunks.
3. Keep related information together. Do NOT split mid-sentence or mid-paragraph if it breaks meaning.
4. If the document has clear section headings, use them as chunk boundaries.
5. For each chunk, identify the section heading it belongs to (if any).
6. If the text contains [PAGE N] markers, record which page each chunk starts on.
7. Aim for chunks of roughly 300-2000 characters, but prioritize meaning over length.
8. Return ONLY a valid JSON array — no markdown fences, no explanation.

Output format — a JSON array of objects:
[
  {
    "content": "The actual text content of this chunk (without [PAGE N] markers)",
    "heading": "Section heading if identifiable, otherwise null",
    "page_number": page number (integer) if available from [PAGE N] markers, otherwise null
  }
]

Document to chunk:
---
"""


def _chunk_with_gemini(full_text: str) -> List[Chunk]:
    """
    Send the document text to Gemini and parse the returned chunk list.
    Raises on failure so the caller can fall back.
    """
    client = _get_vertex_genai_client()
    model = _get_chunking_model()

    prompt = _CHUNKING_PROMPT + full_text

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config={
            "temperature": 0.1,
        },
    )

    raw = response.text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        lines = raw.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines)

    # Attempt JSON parse; if truncated, try to repair
    try:
        chunks_data = json.loads(raw)
    except json.JSONDecodeError:
        chunks_data = _repair_truncated_json(raw)

    if not isinstance(chunks_data, list) or len(chunks_data) == 0:
        raise ValueError("Gemini returned empty or non-list JSON")

    chunks: List[Chunk] = []
    offset = 0
    for item in chunks_data:
        content = item.get("content", "").strip()
        if not content:
            continue
        heading = item.get("heading") or None
        page = item.get("page_number")
        if page is not None:
            try:
                page = int(page)
            except (ValueError, TypeError):
                page = None

        chunks.append(Chunk(
            content=content,
            heading=heading,
            page_number=page,
            char_start=offset,
            char_end=offset + len(content),
        ))
        offset += len(content) + 1

    return chunks


# ---------------------------------------------------------------------------
# Fallback: simple paragraph splitting (used when Gemini is unavailable)
# ---------------------------------------------------------------------------

def _fallback_chunk_text(text: str) -> List[Chunk]:
    """Split text into chunks at paragraph boundaries (blank lines)."""
    paragraphs = re.split(r'\n\s*\n', text)
    chunks: List[Chunk] = []
    offset = 0

    current_page = None
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # Check for page marker
        page_match = re.match(r'\[PAGE\s+(\d+)\]', para)
        if page_match:
            current_page = int(page_match.group(1))
            para = re.sub(r'\[PAGE\s+\d+\]\s*', '', para).strip()
            if not para:
                continue

        chunks.append(Chunk(
            content=para,
            page_number=current_page,
            char_start=offset,
            char_end=offset + len(para),
        ))
        offset += len(para) + 1

    return chunks


# ---------------------------------------------------------------------------
# Large document handling — split into sections, chunk each via Gemini
# ---------------------------------------------------------------------------

# If the document text exceeds this size, split it into sections first.
# ~30k chars ≈ ~8–10k tokens, comfortably within Gemini's context window.
_MAX_CHARS_PER_GEMINI_CALL = 30_000


def _split_into_sections(text: str, max_chars: int = _MAX_CHARS_PER_GEMINI_CALL) -> List[str]:
    """
    Split text into sections of approximately *max_chars* characters,
    breaking at paragraph boundaries ([PAGE N] markers or blank lines).
    """
    paragraphs = re.split(r'\n\s*\n', text)
    sections: List[str] = []
    current: List[str] = []
    current_len = 0

    for para in paragraphs:
        para_len = len(para)
        if current_len + para_len > max_chars and current:
            sections.append("\n\n".join(current))
            current = []
            current_len = 0
        current.append(para)
        current_len += para_len + 2  # +2 for the \n\n separator

    if current:
        sections.append("\n\n".join(current))

    return sections


def _chunk_large_document_with_gemini(full_text: str, filename: str = "") -> List[Chunk]:
    """
    Split a large document into sections and send each section to Gemini
    for semantic chunking.  Combines all resulting chunks with corrected
    char offsets.
    """
    sections = _split_into_sections(full_text)
    logger.info(
        "Large document split into %d sections for Gemini chunking: %s",
        len(sections), filename,
    )

    all_chunks: List[Chunk] = []
    global_offset = 0

    for i, section in enumerate(sections):
        try:
            section_chunks = _chunk_with_gemini(section)
            # Adjust char_start / char_end to global offsets
            for chunk in section_chunks:
                chunk.char_start += global_offset
                chunk.char_end += global_offset
                all_chunks.append(chunk)
        except Exception as exc:
            logger.warning(
                "Gemini chunking failed for section %d/%d of %s: %s — "
                "using fallback for this section",
                i + 1, len(sections), filename, exc,
            )
            # Fallback to paragraph split for this section only
            fallback = _fallback_chunk_text(section)
            for chunk in fallback:
                chunk.char_start += global_offset
                chunk.char_end += global_offset
                all_chunks.append(chunk)

        global_offset += len(section) + 2  # +2 for the separator

    return all_chunks


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

def chunk_document(file_bytes: bytes, content_type: str, filename: str = "") -> List[Chunk]:
    """
    Chunk a document using Gemini-based semantic splitting.

    Falls back to paragraph-based splitting if Gemini is unavailable.

    Args:
        file_bytes:   Raw file bytes.
        content_type: MIME type (e.g. "application/pdf").
        filename:     Original filename.

    Returns:
        List of Chunk objects.
    """
    ct = (content_type or "").lower()
    fn = (filename or "").lower()

    # Step 1: Extract text from the document
    if ct == "application/pdf" or fn.endswith(".pdf"):
        full_text = _extract_pdf_text(file_bytes)
    else:
        full_text = file_bytes.decode("utf-8", errors="replace")

    if not full_text.strip():
        return []

    # Step 2: Try Gemini-powered chunking
    #   For large documents, split into sections first to avoid API limits
    try:
        text_len = len(full_text)
        if text_len > _MAX_CHARS_PER_GEMINI_CALL:
            # Split into sections and chunk each independently
            chunks = _chunk_large_document_with_gemini(full_text, filename)
        else:
            chunks = _chunk_with_gemini(full_text)

        if chunks:
            logger.info(
                "Gemini chunking succeeded: %d chunks for %s",
                len(chunks), filename,
            )
            return chunks
    except Exception as exc:
        logger.warning(
            "Gemini chunking failed for %s, falling back to paragraph split: %s",
            filename, exc,
        )

    # Step 3: Fallback to simple paragraph splitting
    chunks = _fallback_chunk_text(full_text)
    logger.info(
        "Fallback paragraph chunking: %d chunks for %s",
        len(chunks), filename,
    )
    return chunks
