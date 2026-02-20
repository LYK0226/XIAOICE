"""
Semantic document chunker for RAG.

Instead of fixed-size windowing, this module splits documents along natural
structural boundaries (paragraphs, headings, page breaks) and keeps each
chunk within a configurable character budget.

Supported formats:
  • PDF  – via PyMuPDF (fitz), extracts text with page/heading metadata
  • TXT  – plain text, splits on blank lines (paragraphs)
  • MD   – Markdown, splits on headings and blank lines
"""

import logging
import os
import re
from dataclasses import dataclass, field
from typing import List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class Chunk:
    """A single chunk of document text with provenance metadata."""
    content: str
    heading: Optional[str] = None   # section heading chain (e.g. "Chapter 1 > Motor skills")
    page_number: Optional[int] = None
    char_start: int = 0
    char_end: int = 0


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def _max_chunk_chars() -> int:
    from flask import current_app
    try:
        return current_app.config.get("RAG_MAX_CHUNK_CHARS", 2000)
    except RuntimeError:
        return int(os.environ.get("RAG_MAX_CHUNK_CHARS", "2000"))


def _min_chunk_chars() -> int:
    from flask import current_app
    try:
        return current_app.config.get("RAG_MIN_CHUNK_CHARS", 100)
    except RuntimeError:
        return int(os.environ.get("RAG_MIN_CHUNK_CHARS", "100"))


# ---------------------------------------------------------------------------
# Sentence splitting helper
# ---------------------------------------------------------------------------

_SENTENCE_RE = re.compile(
    r'(?<=[。！？.!?\n])\s*'        # split after sentence-ending punctuation
)

def _split_sentences(text: str) -> List[str]:
    """Split text into sentences, preserving trailing whitespace."""
    parts = _SENTENCE_RE.split(text)
    return [s for s in parts if s.strip()]


# ---------------------------------------------------------------------------
# Merging / splitting logic
# ---------------------------------------------------------------------------

def _merge_short_chunks(chunks: List[Chunk], min_chars: int) -> List[Chunk]:
    """Merge consecutive chunks that are shorter than *min_chars*."""
    if not chunks:
        return chunks
    merged: List[Chunk] = [chunks[0]]
    for chunk in chunks[1:]:
        prev = merged[-1]
        if len(prev.content) < min_chars:
            # Merge into previous
            prev.content = prev.content.rstrip() + "\n\n" + chunk.content
            prev.char_end = chunk.char_end
            # Keep the heading from whichever chunk had one
            if chunk.heading and not prev.heading:
                prev.heading = chunk.heading
        else:
            merged.append(chunk)
    # Handle case where last chunk is still short → merge back
    if len(merged) > 1 and len(merged[-1].content) < min_chars:
        merged[-2].content = merged[-2].content.rstrip() + "\n\n" + merged[-1].content
        merged[-2].char_end = merged[-1].char_end
        merged.pop()
    return merged


def _split_long_chunk(chunk: Chunk, max_chars: int) -> List[Chunk]:
    """Split a chunk that exceeds *max_chars* at sentence boundaries."""
    if len(chunk.content) <= max_chars:
        return [chunk]

    sentences = _split_sentences(chunk.content)
    result: List[Chunk] = []
    buf = ""
    buf_start = chunk.char_start

    for sent in sentences:
        if buf and len(buf) + len(sent) > max_chars:
            result.append(Chunk(
                content=buf.strip(),
                heading=chunk.heading,
                page_number=chunk.page_number,
                char_start=buf_start,
                char_end=buf_start + len(buf),
            ))
            buf_start += len(buf)
            buf = sent
        else:
            buf += sent

    if buf.strip():
        result.append(Chunk(
            content=buf.strip(),
            heading=chunk.heading,
            page_number=chunk.page_number,
            char_start=buf_start,
            char_end=buf_start + len(buf),
        ))

    return result if result else [chunk]


# ---------------------------------------------------------------------------
# PDF chunker
# ---------------------------------------------------------------------------

def _clean_pdf_line(line: str) -> str:
    """
    Clean a single line extracted from a PDF.
    Returns the cleaned line or empty string if it should be discarded.
    """
    line = line.strip()
    if not line:
        return ""
    # Discard lines that are purely page numbers / short numbers (≤4 chars of digits only)
    if re.fullmatch(r'\d{1,4}', line):
        return ""
    # Discard lines that look like page-range entries (e.g. "118-122", "7-16")
    if re.fullmatch(r'\d{1,4}-\d{1,4}', line):
        return ""
    # Discard extremely short lines (1-2 chars that are likely layout artefacts)
    if len(line) <= 2 and not line[0].isalpha():
        return ""
    return line


def chunk_pdf(file_bytes: bytes) -> List[Chunk]:
    """
    Extract text from a PDF and chunk by paragraphs / page boundaries.

    Uses PyMuPDF (fitz) for layout-aware text extraction.
    """
    import fitz  # PyMuPDF

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    raw_chunks: List[Chunk] = []
    global_offset = 0

    for page_num in range(len(doc)):
        page = doc[page_num]
        blocks = page.get_text("dict", sort=True).get("blocks", [])

        page_text_parts: List[str] = []
        for block in blocks:
            if block.get("type") != 0:  # text blocks only
                continue
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                line_text = "".join(s.get("text", "") for s in spans)
                cleaned = _clean_pdf_line(line_text)
                if cleaned:
                    page_text_parts.append(cleaned)

        page_text = "\n".join(page_text_parts).strip()
        if not page_text:
            continue

        # Try to detect headings (bold/large text at start of blocks)
        heading = None
        for block in blocks:
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    if span.get("size", 12) >= 14 or "bold" in span.get("font", "").lower():
                        candidate = span.get("text", "").strip()
                        if candidate and len(candidate) < 200:
                            heading = candidate
                            break
                if heading:
                    break
            if heading:
                break

        # Split page text into paragraphs (separated by blank lines)
        paragraphs = re.split(r'\n\s*\n', page_text)
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            raw_chunks.append(Chunk(
                content=para,
                heading=heading,
                page_number=page_num + 1,
                char_start=global_offset,
                char_end=global_offset + len(para),
            ))
            global_offset += len(para) + 1

    doc.close()

    max_c = _max_chunk_chars()
    min_c = _min_chunk_chars()

    # Split overly long chunks
    refined: List[Chunk] = []
    for c in raw_chunks:
        refined.extend(_split_long_chunk(c, max_c))

    # Merge very short chunks
    refined = _merge_short_chunks(refined, min_c)

    return refined


# ---------------------------------------------------------------------------
# Plain text / Markdown chunker
# ---------------------------------------------------------------------------

_HEADING_RE = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)

def chunk_text(text: str, is_markdown: bool = False) -> List[Chunk]:
    """
    Split plain text or Markdown into semantic chunks.

    For Markdown:
      • Split at heading boundaries (# … ######)
      • Prepend heading chain to each chunk for context
    For plain text:
      • Split at blank lines (paragraphs)
    """
    if not text.strip():
        return []

    max_c = _max_chunk_chars()
    min_c = _min_chunk_chars()

    raw_chunks: List[Chunk] = []
    global_offset = 0

    if is_markdown:
        # Split by headings
        sections = _split_markdown_sections(text)
        for heading, body in sections:
            body = body.strip()
            if not body:
                continue
            # Further split on blank lines within each section
            paragraphs = re.split(r'\n\s*\n', body)
            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue
                content = f"{heading}\n\n{para}" if heading else para
                raw_chunks.append(Chunk(
                    content=content,
                    heading=heading,
                    char_start=global_offset,
                    char_end=global_offset + len(content),
                ))
                global_offset += len(content) + 1
    else:
        # Plain text – split on blank lines
        paragraphs = re.split(r'\n\s*\n', text)
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            raw_chunks.append(Chunk(
                content=para,
                char_start=global_offset,
                char_end=global_offset + len(para),
            ))
            global_offset += len(para) + 1

    # Split overly long chunks then merge tiny ones
    refined: List[Chunk] = []
    for c in raw_chunks:
        refined.extend(_split_long_chunk(c, max_c))
    refined = _merge_short_chunks(refined, min_c)

    return refined


def _split_markdown_sections(text: str) -> List[tuple]:
    """
    Split Markdown text into (heading, body) tuples.

    Maintains a heading stack so nested headings are represented as
    "H1 > H2 > H3" chains.
    """
    lines = text.split('\n')
    sections: List[tuple] = []
    heading_stack: List[tuple] = []  # (level, text)
    current_body: List[str] = []
    current_heading = ""

    for line in lines:
        m = _HEADING_RE.match(line)
        if m:
            # Save previous section
            body = "\n".join(current_body)
            if body.strip():
                sections.append((current_heading, body))

            level = len(m.group(1))
            title = m.group(2).strip()

            # Update heading stack
            while heading_stack and heading_stack[-1][0] >= level:
                heading_stack.pop()
            heading_stack.append((level, title))

            current_heading = " > ".join(h[1] for h in heading_stack)
            current_body = []
        else:
            current_body.append(line)

    # Don't forget the last section
    body = "\n".join(current_body)
    if body.strip():
        sections.append((current_heading, body))

    return sections


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

def chunk_document(file_bytes: bytes, content_type: str, filename: str = "") -> List[Chunk]:
    """
    Auto-dispatch to the correct chunker based on file MIME type / extension.

    Args:
        file_bytes:   Raw file bytes.
        content_type: MIME type (e.g. "application/pdf").
        filename:     Original filename (used as fallback for type detection).

    Returns:
        List of Chunk objects.
    """
    ct = (content_type or "").lower()
    fn = (filename or "").lower()

    if ct == "application/pdf" or fn.endswith(".pdf"):
        return chunk_pdf(file_bytes)
    elif fn.endswith(".md") or ct == "text/markdown":
        return chunk_text(file_bytes.decode("utf-8", errors="replace"), is_markdown=True)
    elif ct.startswith("text/") or fn.endswith(".txt"):
        return chunk_text(file_bytes.decode("utf-8", errors="replace"), is_markdown=False)
    else:
        # Best-effort: try as plain text
        logger.warning("Unknown content type %s for file %s; treating as plain text", ct, fn)
        try:
            return chunk_text(file_bytes.decode("utf-8", errors="replace"), is_markdown=False)
        except Exception:
            raise ValueError(f"Unsupported document format: {ct} ({fn})")
