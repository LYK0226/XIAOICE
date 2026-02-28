"""
Structural document chunker for RAG with Docling PDF conversion.

Pipeline:
  1. PDF  → Docling converts to structured Markdown (preserving headings)
     TXT/MD → decoded directly
  2. Heading-based structural split (Markdown headings as boundaries)
  3. Secondary character-based split (chunk_size=800, chunk_overlap=100)
     for sections that exceed the chunk size limit

Supported formats:
  • PDF  – via Docling (preserves headings, tables, structure)
  • TXT  – plain text (heading detection via Markdown-style headings)
  • MD   – Markdown
"""

import logging
import os
import re
import tempfile
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
    heading: Optional[str] = None
    page_number: Optional[int] = None
    char_start: int = 0
    char_end: int = 0
    context_summary: Optional[str] = None
    enriched_content: Optional[str] = None


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

def _get_chunk_size() -> int:
    """Return the configured chunk size for secondary splitting."""
    try:
        from flask import current_app
        return current_app.config.get("RAG_CHUNK_SIZE", 800)
    except RuntimeError:
        return int(os.environ.get("RAG_CHUNK_SIZE", "800"))


def _get_chunk_overlap() -> int:
    """Return the configured chunk overlap for secondary splitting."""
    try:
        from flask import current_app
        return current_app.config.get("RAG_CHUNK_OVERLAP", 100)
    except RuntimeError:
        return int(os.environ.get("RAG_CHUNK_OVERLAP", "100"))


# ---------------------------------------------------------------------------
# Step 1: PDF → Markdown via Docling
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Cached Docling converter singleton (avoid re-initialization overhead)
# ---------------------------------------------------------------------------
_DOCLING_CONVERTER = None


def _get_docling_converter():
    """Return a cached DocumentConverter instance."""
    global _DOCLING_CONVERTER
    if _DOCLING_CONVERTER is None:
        from docling.document_converter import DocumentConverter, PdfFormatOption
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend

        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_table_structure = True
        pipeline_options.document_timeout = 300  # 5 minute max
        # OCR stays enabled (default) — Docling auto-detects when needed

        _DOCLING_CONVERTER = DocumentConverter(
            format_options={
                "pdf": PdfFormatOption(
                    pipeline_options=pipeline_options,
                    backend=PyPdfiumDocumentBackend,
                ),
            }
        )
    return _DOCLING_CONVERTER


def _pdf_to_markdown(file_bytes: bytes) -> str:
    """
    Convert a PDF file to structured Markdown using Docling.
    Preserves headings, tables, lists, and document hierarchy.

    OCR is enabled and Docling auto-detects when to apply it (e.g. scanned pages).
    Converter instance is cached for reuse across uploads.
    If Docling fails, falls back to PyMuPDF text extraction.

    Args:
        file_bytes: Raw PDF bytes.

    Returns:
        Markdown string with structure preserved.
    """
    # Docling requires a file path — write bytes to a temporary file
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        converter = _get_docling_converter()
        result = converter.convert(tmp_path)
        markdown_text = result.document.export_to_markdown()
        logger.info(
            "Docling PDF→Markdown conversion complete: %d characters",
            len(markdown_text),
        )
        return markdown_text
    except Exception as exc:
        logger.warning(
            "Docling conversion failed: %s — falling back to PyMuPDF", exc,
        )
        return _extract_pdf_text_fallback(file_bytes)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def _extract_pdf_text_fallback(file_bytes: bytes) -> str:
    """Fallback PDF text extraction using PyMuPDF (fitz)."""
    try:
        import fitz
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = []
        for page in doc:
            pages.append(page.get_text())
        doc.close()
        return "\n\n".join(pages)
    except Exception as exc:
        logger.error("PyMuPDF fallback also failed: %s", exc)
        return ""


# ---------------------------------------------------------------------------
# Step 2: Heading-based structural split
# ---------------------------------------------------------------------------

# Matches Markdown headings: # Title, ## Subtitle, ### Sub-subtitle, etc.
_HEADING_PATTERN = re.compile(r'^(#{1,6})\s+(.+)', re.MULTILINE)


def _split_by_headings(markdown_text: str) -> List[Chunk]:
    """
    Split Markdown text at heading boundaries.

    Each section (heading + body) becomes one Chunk, with the heading stored
    as metadata.  Text before the first heading (if any) becomes an
    untitled chunk.

    Args:
        markdown_text: Full Markdown text.

    Returns:
        List of Chunk objects, one per section.
    """
    if not markdown_text or not markdown_text.strip():
        return []

    # Find all heading positions
    headings = list(_HEADING_PATTERN.finditer(markdown_text))

    if not headings:
        # No headings found — return the whole text as one chunk
        text = markdown_text.strip()
        if text:
            return [Chunk(content=text, char_start=0, char_end=len(text))]
        return []

    chunks: List[Chunk] = []

    # Text before the first heading (preamble)
    preamble = markdown_text[:headings[0].start()].strip()
    if preamble:
        chunks.append(Chunk(
            content=preamble,
            heading=None,
            char_start=0,
            char_end=len(preamble),
        ))

    # Each heading starts a section that ends at the next heading
    for i, match in enumerate(headings):
        heading_text = match.group(2).strip()
        section_start = match.start()

        if i + 1 < len(headings):
            section_end = headings[i + 1].start()
        else:
            section_end = len(markdown_text)

        # Section body = everything after the heading line until next heading
        heading_line_end = match.end()
        body = markdown_text[heading_line_end:section_end].strip()

        if not body:
            continue

        chunks.append(Chunk(
            content=body,
            heading=heading_text,
            char_start=section_start,
            char_end=section_end,
        ))

    return chunks


# ---------------------------------------------------------------------------
# Step 3: Secondary character-based splitting
# ---------------------------------------------------------------------------

def _secondary_split(
    chunks: List[Chunk],
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
) -> List[Chunk]:
    """
    Split oversized chunks into sub-chunks of approximately *chunk_size*
    characters with *chunk_overlap* character overlap.

    Preserves the parent chunk's heading and page_number metadata on all
    sub-chunks.  Tries to break at sentence boundaries (。.!?！？\\n)
    for cleaner splits.

    Args:
        chunks:        Input chunks from heading-based split.
        chunk_size:    Max characters per sub-chunk (default from config).
        chunk_overlap: Character overlap between consecutive sub-chunks.

    Returns:
        List of Chunk objects (may be longer than input if splits occurred).
    """
    if chunk_size is None:
        chunk_size = _get_chunk_size()
    if chunk_overlap is None:
        chunk_overlap = _get_chunk_overlap()

    result: List[Chunk] = []

    for chunk in chunks:
        text = chunk.content
        if len(text) <= chunk_size:
            result.append(chunk)
            continue

        # Split oversized chunk into sub-chunks
        sub_chunks = _split_text_with_overlap(text, chunk_size, chunk_overlap)
        for i, sub_text in enumerate(sub_chunks):
            offset = i * max(chunk_size - chunk_overlap, 1) if i > 0 else 0
            result.append(Chunk(
                content=sub_text,
                heading=chunk.heading,
                page_number=chunk.page_number,
                char_start=chunk.char_start + offset,
                char_end=chunk.char_start + offset + len(sub_text),
            ))

    return result


def _split_text_with_overlap(text: str, chunk_size: int, overlap: int) -> List[str]:
    """
    Split *text* into segments of approximately *chunk_size* characters
    with *overlap* character overlap.  Prefers breaking at sentence
    boundaries.
    """
    if len(text) <= chunk_size:
        return [text]

    # Sentence-ending patterns (Chinese + English punctuation + newlines)
    sentence_endings = re.compile(r'[。.!?！？\n]')

    segments: List[str] = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        if end >= len(text):
            # Last segment — take everything
            segment = text[start:].strip()
            if segment:
                segments.append(segment)
            break

        # Try to find a sentence boundary near the end of the window
        # Search backwards from `end` within a buffer zone
        search_start = max(start + chunk_size // 2, start)
        search_region = text[search_start:end]
        breaks = list(sentence_endings.finditer(search_region))

        if breaks:
            # Use the last sentence boundary in the search region
            best_break = breaks[-1]
            actual_end = search_start + best_break.end()
        else:
            # No sentence boundary found — break at chunk_size
            actual_end = end

        segment = text[start:actual_end].strip()
        if segment:
            segments.append(segment)

        # Move start forward by (actual_end - overlap), but ensure progress
        start = max(actual_end - overlap, start + 1)

    return segments


# ---------------------------------------------------------------------------
# Fallback: simple paragraph splitting (used when everything else fails)
# ---------------------------------------------------------------------------

def _fallback_chunk_text(text: str) -> List[Chunk]:
    """Split text into chunks at paragraph boundaries (blank lines)."""
    paragraphs = re.split(r'\n\s*\n', text)
    chunks: List[Chunk] = []
    offset = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        chunks.append(Chunk(
            content=para,
            char_start=offset,
            char_end=offset + len(para),
        ))
        offset += len(para) + 1

    return chunks


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

def chunk_document(file_bytes: bytes, content_type: str, filename: str = "") -> List[Chunk]:
    """
    Chunk a document using Docling (PDF) or heading-based splitting (TXT/MD),
    followed by secondary character-based splitting for oversized chunks.

    Falls back to paragraph-based splitting if all else fails.

    Pipeline:
      PDF:    Docling → Markdown → heading split → secondary split
      TXT/MD: decode  → heading split → secondary split

    Args:
        file_bytes:   Raw file bytes.
        content_type: MIME type (e.g. "application/pdf").
        filename:     Original filename.

    Returns:
        List of Chunk objects.
    """
    ct = (content_type or "").lower()
    fn = (filename or "").lower()

    # Step 1: Convert to Markdown / extract text
    try:
        if ct == "application/pdf" or fn.endswith(".pdf"):
            markdown_text = _pdf_to_markdown(file_bytes)
        else:
            # TXT and MD — decode directly
            markdown_text = file_bytes.decode("utf-8", errors="replace")
    except Exception as exc:
        logger.warning(
            "Text extraction failed for %s (%s), falling back to raw decode: %s",
            filename, content_type, exc,
        )
        markdown_text = file_bytes.decode("utf-8", errors="replace")

    if not markdown_text.strip():
        return []

    # Step 2: Heading-based structural split
    try:
        chunks = _split_by_headings(markdown_text)
        if chunks:
            logger.info(
                "Heading-based split: %d sections for %s",
                len(chunks), filename,
            )
        else:
            raise ValueError("Heading split produced no chunks")
    except Exception as exc:
        logger.warning(
            "Heading-based split failed for %s: %s — using fallback",
            filename, exc,
        )
        chunks = _fallback_chunk_text(markdown_text)

    # Step 3: Secondary character-based split for oversized chunks
    chunks = _secondary_split(chunks)

    logger.info(
        "Final chunking: %d chunks for %s (after secondary split)",
        len(chunks), filename,
    )

    if not chunks:
        # Last resort fallback
        chunks = _fallback_chunk_text(markdown_text)
        logger.info(
            "Fallback paragraph chunking: %d chunks for %s",
            len(chunks), filename,
        )

    return chunks
