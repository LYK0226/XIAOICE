#!/usr/bin/env python3
"""
Integration tests for the RAG (Retrieval-Augmented Generation) pipeline.

Tests cover:
  1. Chunker – semantic splitting for TXT, Markdown, PDF
  2. Embeddings – mock-based generation and batching
  3. Retriever – vector search and context formatting
  4. Processor – end-to-end document processing
  5. Admin API endpoints – upload, list, get, delete, reprocess, search
  6. Models – RagDocument and RagChunk CRUD, cascade delete
  7. Admin role – access control for RAG endpoints

Run with:
    cd /workspaces/XIAOICE && pytest test/test_rag.py -v
"""

import io
import json
import os
import sys
import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.models import db as _db, User, RagDocument, RagChunk


# ===========================================================================
# Fixtures
# ===========================================================================

@pytest.fixture(scope='session')
def app():
    """Create a Flask application configured for testing."""
    os.environ.setdefault('TESTING', '1')
    test_app = create_app()
    test_app.config.update({
        'TESTING': True,
        'WTF_CSRF_ENABLED': False,
        'RAG_MAX_CHUNK_CHARS': 2000,
        'RAG_MIN_CHUNK_CHARS': 50,
        'RAG_EMBEDDING_MODEL': 'text-multilingual-embedding-002',
        'RAG_EMBEDDING_DIMENSION': 768,
        'RAG_TOP_K': 5,
        'RAG_MIN_SIMILARITY': 0.3,
        'RAG_GCS_FOLDER': 'RAG',
        'RAG_ALLOWED_EXTENSIONS': {'pdf', 'txt', 'md'},
    })
    yield test_app


@pytest.fixture(scope='session')
def db(app):
    """Session-scoped database setup."""
    with app.app_context():
        _db.create_all()
        yield _db


@pytest.fixture(autouse=True)
def app_ctx(app):
    """Push an app context for every test."""
    with app.app_context():
        yield


@pytest.fixture
def client(app):
    """Flask test client."""
    return app.test_client()


def _uid():
    """Generate a short unique suffix for test data."""
    return uuid.uuid4().hex[:8]


@pytest.fixture
def admin_user(app, db):
    """Create an admin user and return (user, jwt_token). Cleaned up after test."""
    uid = _uid()
    user = User(username=f'admin_{uid}', email=f'admin_{uid}@test.com', role='admin')
    user.set_password('testpass123')
    db.session.add(user)
    db.session.commit()

    from flask_jwt_extended import create_access_token
    token = create_access_token(identity=str(user.id))
    yield user, token

    # Cleanup
    try:
        db.session.delete(user)
        db.session.commit()
    except Exception:
        db.session.rollback()


@pytest.fixture
def regular_user(app, db):
    """Create a regular (non-admin) user and return (user, jwt_token). Cleaned up after test."""
    uid = _uid()
    user = User(username=f'user_{uid}', email=f'user_{uid}@test.com', role='user')
    user.set_password('testpass123')
    db.session.add(user)
    db.session.commit()

    from flask_jwt_extended import create_access_token
    token = create_access_token(identity=str(user.id))
    yield user, token

    try:
        db.session.delete(user)
        db.session.commit()
    except Exception:
        db.session.rollback()


@pytest.fixture
def sample_document(app, db, admin_user):
    """Create a sample RagDocument in the database. Cleaned up after test."""
    user, _ = admin_user
    uid = _uid()
    doc = RagDocument(
        filename=f'test_{uid}.pdf',
        original_filename='child_development.pdf',
        content_type='application/pdf',
        gcs_path=f'RAG/test_{uid}.pdf',
        file_size=1024,
        status='ready',
        chunk_count=3,
        uploaded_by=user.id,
    )
    db.session.add(doc)
    db.session.commit()
    yield doc

    # Cleanup (cascade deletes chunks)
    try:
        still_exists = db.session.get(RagDocument, doc.id)
        if still_exists:
            db.session.delete(still_exists)
            db.session.commit()
    except Exception:
        db.session.rollback()


# ===========================================================================
# 1. Chunker Tests
# ===========================================================================

class TestChunkerText:
    """Test fallback paragraph-based chunking."""

    def test_basic_paragraphs(self, app):
        """Plain text split on blank lines into paragraphs."""
        with app.app_context():
            from app.rag.chunker import _fallback_chunk_text

            text = (
                "This is the first paragraph about motor development in early childhood, covering walking, running, and jumping milestones.\n\n"
                "This is the second paragraph about language acquisition and how children learn to communicate through babbling, words, and sentences.\n\n"
                "This is the third paragraph about social skills development, including sharing, turn-taking, and emotional regulation in young children."
            )
            chunks = _fallback_chunk_text(text)
            assert len(chunks) == 3
            assert "motor development" in chunks[0].content
            assert "language acquisition" in chunks[1].content
            assert "social skills" in chunks[2].content

    def test_empty_text(self, app):
        """Empty text produces no chunks."""
        with app.app_context():
            from app.rag.chunker import _fallback_chunk_text
            assert _fallback_chunk_text("") == []
            assert _fallback_chunk_text("   \n\n  ") == []

    def test_single_paragraph(self, app):
        """A single paragraph without blank lines → 1 chunk."""
        with app.app_context():
            from app.rag.chunker import _fallback_chunk_text
            text = "This is a single continuous paragraph that talks about early childhood education and the importance of structured play in developing cognitive abilities."
            chunks = _fallback_chunk_text(text)
            assert len(chunks) == 1
            assert chunks[0].content == text


class TestChunkerMarkdown:
    """Test Markdown chunking via chunk_document (with Gemini mocked)."""

    @patch('app.rag.chunker._chunk_with_gemini')
    def test_heading_split(self, mock_gemini, app):
        """Markdown split via Gemini produces chunks with headings."""
        with app.app_context():
            from app.rag.chunker import chunk_document, Chunk

            # Mock Gemini to return structured chunks
            mock_gemini.return_value = [
                Chunk(content="Children develop gross motor skills in the first year.", heading="Motor Development"),
                Chunk(content="Fine motor skills include grasping and pinching.", heading="Fine Motor"),
                Chunk(content="Babbling begins around 6 months.", heading="Language Development"),
            ]

            md = (
                "# Motor Development\n\n"
                "Children develop gross motor skills in the first year.\n\n"
                "## Fine Motor\n\n"
                "Fine motor skills include grasping and pinching.\n\n"
                "# Language Development\n\n"
                "Babbling begins around 6 months."
            )
            chunks = chunk_document(md.encode('utf-8'), 'text/markdown', 'guide.md')
            assert len(chunks) >= 3
            assert any("Motor Development" in (c.heading or "") for c in chunks)
            assert any("Language Development" in (c.heading or "") for c in chunks)

    def test_fallback_markdown(self, app):
        """When Gemini is unavailable, markdown falls back to paragraph splitting."""
        with app.app_context():
            from app.rag.chunker import _fallback_chunk_text

            md = (
                "# Chapter 1\n\n"
                "Intro text.\n\n"
                "## Section A\n\n"
                "Section A content.\n\n"
                "## Section B\n\n"
                "Section B content."
            )
            chunks = _fallback_chunk_text(md)
            # Fallback splits on blank lines — each paragraph becomes a chunk
            assert len(chunks) >= 4
            assert any("Chapter 1" in c.content for c in chunks)
            assert any("Section A" in c.content for c in chunks)


class TestChunkerGemini:
    """Test Gemini-powered chunking with mocked API calls."""

    @patch('app.rag.chunker._get_vertex_genai_client')
    def test_chunk_with_gemini_success(self, mock_client_fn, app):
        """Gemini chunking parses JSON response into Chunk objects."""
        with app.app_context():
            from app.rag.chunker import _chunk_with_gemini

            mock_response = MagicMock()
            mock_response.text = json.dumps([
                {"content": "First topic about motor development.", "heading": "Motor", "page_number": 1},
                {"content": "Second topic about language.", "heading": "Language", "page_number": 2},
            ])
            mock_client = MagicMock()
            mock_client.models.generate_content.return_value = mock_response
            mock_client_fn.return_value = mock_client

            chunks = _chunk_with_gemini("Test document text")
            assert len(chunks) == 2
            assert chunks[0].heading == "Motor"
            assert chunks[1].page_number == 2
            assert "motor development" in chunks[0].content.lower()

    @patch('app.rag.chunker._get_vertex_genai_client')
    def test_chunk_with_gemini_fallback(self, mock_client_fn, app):
        """When Gemini raises, chunk_document falls back to paragraph split."""
        with app.app_context():
            from app.rag.chunker import chunk_document

            mock_client_fn.side_effect = Exception("API unavailable")

            text = "Paragraph one about walking.\n\nParagraph two about running."
            chunks = chunk_document(text.encode('utf-8'), 'text/plain', 'test.txt')
            assert len(chunks) == 2
            assert "walking" in chunks[0].content
            assert "running" in chunks[1].content


class TestChunkerDispatch:
    """Test chunk_document dispatcher."""

    def test_pdf_dispatch(self, app):
        """PDF files are dispatched to chunk_pdf."""
        with app.app_context():
            from app.rag.chunker import chunk_document

            # Create a minimal valid PDF
            import fitz
            doc = fitz.open()
            page = doc.new_page()
            page.insert_text((72, 72), "Hello from PyMuPDF test document about motor skills.")
            pdf_bytes = doc.tobytes()
            doc.close()

            chunks = chunk_document(pdf_bytes, 'application/pdf', 'test.pdf')
            assert len(chunks) >= 1
            assert any("motor skills" in c.content.lower() for c in chunks)

    def test_txt_dispatch(self, app):
        """TXT files are dispatched to chunk_text (plain)."""
        with app.app_context():
            from app.rag.chunker import chunk_document

            text = "Paragraph one about walking milestones in the first year of life, including cruising and independent steps.\n\nParagraph two about running development and how children gradually gain speed and coordination over time."
            chunks = chunk_document(text.encode('utf-8'), 'text/plain', 'notes.txt')
            assert len(chunks) == 2

    def test_markdown_dispatch(self, app):
        """MD files are dispatched to chunk_text (markdown mode)."""
        with app.app_context():
            from app.rag.chunker import chunk_document

            md = "# Title\n\nContent here about early education."
            chunks = chunk_document(md.encode('utf-8'), 'text/markdown', 'guide.md')
            assert len(chunks) >= 1


# ===========================================================================
# 2. Embedding Tests (mocked – no real API calls)
# ===========================================================================

class TestEmbeddings:
    """Test embedding generation with mocked API."""

    @patch('app.rag.embeddings._get_genai_client')
    def test_generate_embeddings(self, mock_client_fn, app):
        """generate_embeddings returns correctly shaped vectors."""
        with app.app_context():
            from app.rag.embeddings import generate_embeddings

            mock_embedding = MagicMock()
            mock_embedding.values = [0.1] * 768

            mock_response = MagicMock()
            mock_response.embeddings = [mock_embedding, mock_embedding]

            mock_client = MagicMock()
            mock_client.models.embed_content.return_value = mock_response
            mock_client_fn.return_value = mock_client

            result = generate_embeddings(["text one", "text two"])
            assert len(result) == 2
            assert len(result[0]) == 768
            mock_client.models.embed_content.assert_called_once()

    @patch('app.rag.embeddings._get_genai_client')
    def test_generate_query_embedding(self, mock_client_fn, app):
        """generate_query_embedding returns a single vector."""
        with app.app_context():
            from app.rag.embeddings import generate_query_embedding

            mock_embedding = MagicMock()
            mock_embedding.values = [0.5] * 768

            mock_response = MagicMock()
            mock_response.embeddings = [mock_embedding]

            mock_client = MagicMock()
            mock_client.models.embed_content.return_value = mock_response
            mock_client_fn.return_value = mock_client

            result = generate_query_embedding("what are motor skills?")
            assert len(result) == 768

    @patch('app.rag.embeddings._get_genai_client')
    def test_empty_input(self, mock_client_fn, app):
        """Empty text list returns empty embeddings."""
        with app.app_context():
            from app.rag.embeddings import generate_embeddings
            result = generate_embeddings([])
            assert result == []
            mock_client_fn.assert_not_called()

    @patch('app.rag.embeddings._get_genai_client')
    def test_retry_on_failure(self, mock_client_fn, app):
        """Retries on transient API errors."""
        with app.app_context():
            from app.rag.embeddings import generate_embeddings

            mock_embedding = MagicMock()
            mock_embedding.values = [0.1] * 768
            mock_response = MagicMock()
            mock_response.embeddings = [mock_embedding]

            mock_client = MagicMock()
            # Fail first call, succeed second
            mock_client.models.embed_content.side_effect = [
                Exception("Transient error"),
                mock_response,
            ]
            mock_client_fn.return_value = mock_client

            result = generate_embeddings(["test"], max_retries=3)
            assert len(result) == 1
            assert mock_client.models.embed_content.call_count == 2

    @patch('app.rag.embeddings._get_genai_client')
    @patch('app.rag.embeddings._get_embedding_model')
    def test_model_fallback_on_not_found(self, mock_model, mock_client_fn, app):
        """Falls back to text-embedding-004 when preferred model is unavailable."""
        with app.app_context():
            from app.rag.embeddings import generate_embeddings

            mock_model.return_value = "text-multilingual-embedding-002"

            class FakeNotFound(Exception):
                pass

            mock_embedding = MagicMock()
            mock_embedding.values = [0.3] * 768
            mock_response = MagicMock()
            mock_response.embeddings = [mock_embedding]

            mock_client = MagicMock()
            mock_client.models.embed_content.side_effect = [
                FakeNotFound("404 NOT_FOUND model not supported for embedContent"),
                mock_response,
            ]
            mock_client_fn.return_value = mock_client

            result = generate_embeddings(["fallback test"], max_retries=1)
            assert len(result) == 1
            assert len(result[0]) == 768

            first_call = mock_client.models.embed_content.call_args_list[0]
            second_call = mock_client.models.embed_content.call_args_list[1]
            assert first_call.kwargs["model"] in ("text-multilingual-embedding-002", "text-embedding-004")
            assert second_call.kwargs["model"] in ("text-embedding-004", "gemini-embedding-001")


# ===========================================================================
# 3. Retriever Tests
# ===========================================================================

class TestRetriever:
    """Test vector search and context formatting."""

    def test_format_context_empty(self, app):
        """Empty results produce empty context string."""
        with app.app_context():
            from app.rag.retriever import format_context
            assert format_context([]) == ""

    def test_format_context_with_results(self, app):
        """Results are formatted with headers and source info."""
        with app.app_context():
            from app.rag.retriever import format_context

            results = [
                {
                    'content': 'Children begin walking around 12 months.',
                    'heading': 'Motor Development',
                    'document_name': 'guide.pdf',
                    'page_number': 3,
                    'similarity': 0.92,
                },
                {
                    'content': 'Babbling is a precursor to speech.',
                    'heading': 'Language',
                    'document_name': 'lang.md',
                    'page_number': None,
                    'similarity': 0.85,
                },
            ]
            ctx = format_context(results)
            assert "Knowledge Base Reference 1" in ctx
            assert "guide.pdf" in ctx
            assert "p.3" in ctx
            assert "Motor Development" in ctx
            assert "Knowledge Base Reference 2" in ctx
            assert "lang.md" in ctx
            assert "92%" in ctx

    def test_format_context_max_chars(self, app):
        """Context is truncated at max_chars boundary."""
        with app.app_context():
            from app.rag.retriever import format_context

            results = [
                {
                    'content': 'x' * 500,
                    'heading': None,
                    'document_name': f'doc{i}.pdf',
                    'page_number': None,
                    'similarity': 0.9,
                }
                for i in range(20)
            ]
            ctx = format_context(results, max_chars=1000)
            assert len(ctx) <= 1200  # some slack for headers

    @patch('app.rag.retriever.generate_query_embedding')
    def test_search_knowledge_no_embedding(self, mock_embed, app):
        """When embedding fails, search returns empty list."""
        with app.app_context():
            from app.rag.retriever import search_knowledge

            mock_embed.side_effect = Exception("API error")
            results = search_knowledge("test query")
            assert results == []


# ===========================================================================
# 4. Processor Tests
# ===========================================================================

class TestProcessor:
    """Test document processing pipeline."""

    def test_estimate_tokens_latin(self, app):
        """Token estimation for Latin text."""
        with app.app_context():
            from app.rag.processor import _estimate_tokens
            result = _estimate_tokens("Hello world this is a test")
            assert result > 0
            # ~26 chars / 4 ≈ 6-7 tokens
            assert 4 <= result <= 10

    def test_estimate_tokens_cjk(self, app):
        """Token estimation for CJK text."""
        with app.app_context():
            from app.rag.processor import _estimate_tokens
            result = _estimate_tokens("幼兒教育是非常重要的")
            # 9 CJK chars / 1.5 ≈ 6 tokens
            assert 4 <= result <= 10

    def test_estimate_tokens_mixed(self, app):
        """Token estimation for mixed CJK/Latin text."""
        with app.app_context():
            from app.rag.processor import _estimate_tokens
            result = _estimate_tokens("Hello 世界 test 教育")
            assert result > 0

    @patch('app.rag.processor._download_from_gcs')
    @patch('app.rag.processor.generate_embeddings')
    def test_process_document_success(self, mock_embed, mock_download, app, db, sample_document):
        """Successful end-to-end document processing."""
        with app.app_context():
            from app.rag.processor import process_document

            # Reset doc status for processing
            doc = RagDocument.query.get(sample_document.id)
            doc.status = 'pending'
            doc.content_type = 'text/plain'
            doc.original_filename = 'test_document.txt'
            db.session.commit()

            mock_download.return_value = b"Paragraph one about gross motor development in early childhood.\n\nParagraph two about fine motor skills and hand coordination."
            mock_embed.return_value = [[0.1] * 768, [0.2] * 768]

            success = process_document(doc.id)
            assert success is True

            db.session.refresh(doc)
            assert doc.status == 'ready'
            assert doc.chunk_count == 2
            assert doc.chunks.count() == 2

    @patch('app.rag.processor._download_from_gcs')
    def test_process_document_empty(self, mock_download, app, db, sample_document):
        """Processing an empty document sets status to error."""
        with app.app_context():
            from app.rag.processor import process_document

            doc = RagDocument.query.get(sample_document.id)
            doc.status = 'pending'
            doc.content_type = 'text/plain'
            db.session.commit()

            mock_download.return_value = b""
            success = process_document(doc.id)
            assert success is False

            db.session.refresh(doc)
            assert doc.status == 'error'

    def test_process_document_not_found(self, app):
        """Processing a non-existent document returns False."""
        with app.app_context():
            from app.rag.processor import process_document
            assert process_document(999999) is False

    def test_delete_document_data(self, app, db, sample_document):
        """delete_document_data removes document and chunks."""
        with app.app_context():
            from app.rag.processor import delete_document_data

            doc_id = sample_document.id
            # Add some chunks
            for i in range(3):
                chunk = RagChunk(
                    document_id=doc_id,
                    chunk_index=i,
                    content=f"Chunk {i} content about testing.",
                    embedding=[0.1] * 768,
                )
                db.session.add(chunk)
            db.session.commit()

            assert RagChunk.query.filter_by(document_id=doc_id).count() == 3

            result = delete_document_data(doc_id)
            assert result is True
            assert RagDocument.query.get(doc_id) is None
            assert RagChunk.query.filter_by(document_id=doc_id).count() == 0


# ===========================================================================
# 5. Model Tests
# ===========================================================================

class TestModels:
    """Test RagDocument and RagChunk models."""

    def test_rag_document_to_dict(self, app, sample_document):
        """RagDocument.to_dict() serializes correctly."""
        with app.app_context():
            d = sample_document.to_dict()
            assert d['original_filename'] == 'child_development.pdf'
            assert d['status'] == 'ready'
            assert d['file_size'] == 1024
            assert d['content_type'] == 'application/pdf'
            assert 'chunks' not in d  # Not included by default

    def test_rag_document_to_dict_with_chunks(self, app, db, sample_document):
        """RagDocument.to_dict(include_chunks=True) includes chunks."""
        with app.app_context():
            chunk = RagChunk(
                document_id=sample_document.id,
                chunk_index=0,
                content="Test chunk content",
                heading="Test Heading",
                embedding=[0.1] * 768,
            )
            db.session.add(chunk)
            db.session.commit()

            d = sample_document.to_dict(include_chunks=True)
            assert 'chunks' in d
            assert len(d['chunks']) == 1
            assert d['chunks'][0]['content'] == "Test chunk content"

    def test_rag_chunk_to_dict(self, app, db, sample_document):
        """RagChunk.to_dict() serializes correctly (embedding excluded)."""
        with app.app_context():
            chunk = RagChunk(
                document_id=sample_document.id,
                chunk_index=0,
                content="Test content",
                heading="Heading",
                page_number=5,
                char_start=0,
                char_end=12,
                token_count=3,
                embedding=[0.1] * 768,
            )
            db.session.add(chunk)
            db.session.commit()

            d = chunk.to_dict()
            assert d['content'] == "Test content"
            assert d['heading'] == "Heading"
            assert d['page_number'] == 5
            assert 'embedding' not in d  # Embedding excluded from dict

    def test_cascade_delete(self, app, db, sample_document):
        """Deleting a document cascades to its chunks."""
        with app.app_context():
            doc_id = sample_document.id
            for i in range(3):
                db.session.add(RagChunk(
                    document_id=doc_id,
                    chunk_index=i,
                    content=f"Chunk {i}",
                    embedding=[0.1] * 768,
                ))
            db.session.commit()

            assert RagChunk.query.filter_by(document_id=doc_id).count() == 3

            # Re-query to get the document in the current session
            doc = db.session.get(RagDocument, doc_id)
            db.session.delete(doc)
            db.session.commit()

            assert RagChunk.query.filter_by(document_id=doc_id).count() == 0

    def test_user_role(self, app, db):
        """User role field defaults to 'user' and is_admin() works."""
        with app.app_context():
            uid = _uid()
            user = User(username=f'role_{uid}', email=f'role_{uid}@test.com')
            user.set_password('pass123')
            db.session.add(user)
            db.session.commit()

            assert user.role == 'user'
            assert user.is_admin() is False

            user.role = 'admin'
            db.session.commit()
            assert user.is_admin() is True

            # Cleanup
            db.session.delete(user)
            db.session.commit()


# ===========================================================================
# 6. Admin API Endpoint Tests
# ===========================================================================

class TestAdminEndpoints:
    """Test RAG admin API endpoints."""

    def _auth_headers(self, token):
        return {'Authorization': f'Bearer {token}'}

    # -- Access control --

    def test_list_documents_requires_admin(self, app, client, regular_user):
        """Non-admin users get 403 on RAG endpoints."""
        with app.app_context():
            _, token = regular_user
            resp = client.get('/admin/rag/documents', headers=self._auth_headers(token))
            assert resp.status_code == 403

    def test_list_documents_requires_auth(self, app, client):
        """Unauthenticated requests get 401."""
        with app.app_context():
            resp = client.get('/admin/rag/documents')
            assert resp.status_code in (401, 422)

    # -- List documents --

    def test_list_documents_empty(self, app, client, admin_user):
        """Admin can list documents (empty list)."""
        with app.app_context():
            _, token = admin_user
            resp = client.get('/admin/rag/documents', headers=self._auth_headers(token))
            assert resp.status_code == 200
            data = resp.get_json()
            assert 'documents' in data
            assert isinstance(data['documents'], list)

    def test_list_documents_with_data(self, app, client, admin_user, sample_document):
        """Admin can list documents (with data)."""
        with app.app_context():
            _, token = admin_user
            resp = client.get('/admin/rag/documents', headers=self._auth_headers(token))
            assert resp.status_code == 200
            data = resp.get_json()
            assert len(data['documents']) >= 1
            assert data['documents'][0]['original_filename'] == 'child_development.pdf'

    # -- Get document --

    def test_get_document(self, app, client, admin_user, sample_document):
        """Admin can get a single document with chunks."""
        with app.app_context():
            _, token = admin_user
            resp = client.get(
                f'/admin/rag/documents/{sample_document.id}',
                headers=self._auth_headers(token),
            )
            assert resp.status_code == 200
            data = resp.get_json()
            assert data['document']['id'] == sample_document.id
            assert 'chunks' in data['document']

    def test_get_document_not_found(self, app, client, admin_user):
        """Getting a non-existent document returns 404."""
        with app.app_context():
            _, token = admin_user
            resp = client.get('/admin/rag/documents/999999', headers=self._auth_headers(token))
            assert resp.status_code == 404

    # -- Upload document --

    @patch('app.gcp_bucket.upload_rag_document')
    @patch('app.rag.processor.process_document')
    def test_upload_document(self, mock_process, mock_upload, app, client, admin_user):
        """Admin can upload a document."""
        with app.app_context():
            _, token = admin_user
            uid = _uid()
            mock_upload.return_value = (f'RAG/test_upload_{uid}.txt', 100)
            mock_process.return_value = True

            data = {
                'file': (io.BytesIO(b"Test content for upload"), 'test.txt', 'text/plain'),
            }
            resp = client.post(
                '/admin/rag/documents',
                headers=self._auth_headers(token),
                data=data,
                content_type='multipart/form-data',
            )
            assert resp.status_code in (201, 207)
            result = resp.get_json()
            assert 'document' in result

    def test_upload_no_file(self, app, client, admin_user):
        """Upload without file returns 400."""
        with app.app_context():
            _, token = admin_user
            resp = client.post(
                '/admin/rag/documents',
                headers=self._auth_headers(token),
                content_type='multipart/form-data',
            )
            assert resp.status_code == 400

    def test_upload_unsupported_type(self, app, client, admin_user):
        """Upload of unsupported file type returns 400."""
        with app.app_context():
            _, token = admin_user
            data = {
                'file': (io.BytesIO(b"data"), 'test.exe', 'application/octet-stream'),
            }
            resp = client.post(
                '/admin/rag/documents',
                headers=self._auth_headers(token),
                data=data,
                content_type='multipart/form-data',
            )
            assert resp.status_code == 400
            assert 'Unsupported' in resp.get_json()['error']

    # -- Delete document --

    @patch('app.gcp_bucket.delete_rag_document')
    def test_delete_document(self, mock_gcs_delete, app, client, admin_user, db):
        """Admin can delete a document."""
        with app.app_context():
            user, token = admin_user
            uid = _uid()
            doc = RagDocument(
                filename=f'to_delete_{uid}.txt',
                original_filename='to_delete.txt',
                content_type='text/plain',
                gcs_path=f'RAG/to_delete_{uid}.txt',
                file_size=10,
                status='ready',
                uploaded_by=user.id,
            )
            db.session.add(doc)
            db.session.commit()
            doc_id = doc.id
            gcs_path = doc.gcs_path

            resp = client.delete(
                f'/admin/rag/documents/{doc_id}',
                headers=self._auth_headers(token),
            )
            assert resp.status_code == 200
            assert resp.get_json()['message'] == 'Document deleted'
            mock_gcs_delete.assert_called_once_with(gcs_path)

    def test_delete_document_not_found(self, app, client, admin_user):
        """Deleting non-existent document returns 404."""
        with app.app_context():
            _, token = admin_user
            resp = client.delete('/admin/rag/documents/999999', headers=self._auth_headers(token))
            assert resp.status_code == 404

    # -- Search --

    @patch('app.rag.retriever.search_knowledge')
    def test_search(self, mock_search, app, client, admin_user):
        """Admin can test search."""
        with app.app_context():
            _, token = admin_user
            mock_search.return_value = [
                {
                    'chunk_id': 1,
                    'content': 'Walking begins at 12 months.',
                    'heading': 'Motor',
                    'page_number': 2,
                    'document_id': 1,
                    'document_name': 'guide.pdf',
                    'similarity': 0.95,
                }
            ]

            resp = client.post(
                '/admin/rag/search',
                headers={**self._auth_headers(token), 'Content-Type': 'application/json'},
                data=json.dumps({'query': 'motor development'}),
            )
            assert resp.status_code == 200
            data = resp.get_json()
            assert len(data['results']) == 1
            assert data['results'][0]['similarity'] == 0.95

    def test_search_empty_query(self, app, client, admin_user):
        """Search with empty query returns 400."""
        with app.app_context():
            _, token = admin_user
            resp = client.post(
                '/admin/rag/search',
                headers={**self._auth_headers(token), 'Content-Type': 'application/json'},
                data=json.dumps({'query': ''}),
            )
            assert resp.status_code == 400

    # -- Non-admin access --

    def test_upload_requires_admin(self, app, client, regular_user):
        """Non-admin cannot upload."""
        with app.app_context():
            _, token = regular_user
            data = {'file': (io.BytesIO(b"data"), 'test.txt', 'text/plain')}
            resp = client.post(
                '/admin/rag/documents',
                headers=self._auth_headers(token),
                data=data,
                content_type='multipart/form-data',
            )
            assert resp.status_code == 403

    def test_delete_requires_admin(self, app, client, regular_user):
        """Non-admin cannot delete."""
        with app.app_context():
            _, token = regular_user
            resp = client.delete('/admin/rag/documents/1', headers=self._auth_headers(token))
            assert resp.status_code == 403

    def test_search_requires_admin(self, app, client, regular_user):
        """Non-admin cannot search."""
        with app.app_context():
            _, token = regular_user
            resp = client.post(
                '/admin/rag/search',
                headers={**self._auth_headers(token), 'Content-Type': 'application/json'},
                data=json.dumps({'query': 'test'}),
            )
            assert resp.status_code == 403


# ===========================================================================
# 7. Chat Agent Integration Tests (mocked)
# ===========================================================================

class TestChatAgentIntegration:
    """Test that retrieve_knowledge tool works correctly."""

    @patch('app.rag.retriever.search_knowledge')
    @patch('app.rag.retriever.format_context')
    def test_retrieve_knowledge(self, mock_format, mock_search, app):
        """retrieve_knowledge function returns formatted context."""
        import asyncio
        with app.app_context():
            from app.agent.chat_agent import _make_retrieve_knowledge_tool
            retrieve_knowledge = _make_retrieve_knowledge_tool()

            mock_search.return_value = [
                {'content': 'Test result', 'similarity': 0.9, 'document_name': 'doc.pdf',
                 'heading': None, 'page_number': 1, 'document_id': 1, 'chunk_id': 1}
            ]
            mock_format.return_value = "[Reference 1] Test result"

            result = asyncio.run(retrieve_knowledge("motor development milestones"))
            assert "Reference 1" in result or "knowledge base" in result.lower() or len(result) > 0
            mock_search.assert_called_once()

    @patch('app.rag.retriever.search_knowledge')
    def test_retrieve_knowledge_no_results(self, mock_search, app):
        """retrieve_knowledge with no matches returns informative message."""
        import asyncio
        with app.app_context():
            from app.agent.chat_agent import _make_retrieve_knowledge_tool
            retrieve_knowledge = _make_retrieve_knowledge_tool()

            mock_search.return_value = []
            result = asyncio.run(retrieve_knowledge("something very specific"))
            assert isinstance(result, str)

    @patch('app.rag.retriever.search_knowledge')
    def test_retrieve_knowledge_error_handling(self, mock_search, app):
        """retrieve_knowledge handles errors gracefully."""
        import asyncio
        with app.app_context():
            from app.agent.chat_agent import _make_retrieve_knowledge_tool
            retrieve_knowledge = _make_retrieve_knowledge_tool()

            mock_search.side_effect = Exception("DB connection error")
            result = asyncio.run(retrieve_knowledge("test query"))
            assert isinstance(result, str)
            # Should not raise — returns a fallback message


# ===========================================================================
# Entry point
# ===========================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
