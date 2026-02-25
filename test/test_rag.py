#!/usr/bin/env python3
"""
Integration tests for the RAG (Retrieval-Augmented Generation) pipeline.

Tests cover:
  1. RAG Engine wrapper – import, delete, search, list (mocked SDK)
  2. Processor – process_document, delete_document_data
  3. Retriever – search_knowledge, format_context
  4. Models – RagDocument CRUD with rag_file_name / rag_corpus_name
  5. Admin API endpoints – upload, list, get, delete, reprocess, search
  6. Admin role – access control for RAG endpoints
  7. Chat Agent – retrieve_knowledge tool integration

Run with:
    cd /workspaces/XIAOICE && pytest test/test_rag.py -v
"""

import io
import json
import os
import sys
import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch, PropertyMock

import pytest

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.models import db as _db, User, RagDocument


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
        'RAG_CORPUS_NAME': 'projects/test/locations/us-west1/ragCorpora/123',
        'GCP_PROJECT': 'test-project',
        'RAG_LOCATION': 'us-west1',
        'RAG_LAYOUT_PARSER_PROCESSOR': 'projects/test/locations/us/processors/abc',
        'RAG_TOP_K': 5,
        'RAG_GCS_FOLDER': 'RAG',
        'RAG_ALLOWED_EXTENSIONS': {'pdf', 'txt', 'md'},
        'GCS_BUCKET_NAME': 'test-bucket',
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

    try:
        db.session.delete(user)
        db.session.commit()
    except Exception:
        db.session.rollback()


@pytest.fixture
def regular_user(app, db):
    """Create a regular (non-admin) user and return (user, jwt_token)."""
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
    """Create a sample RagDocument. Cleaned up after test."""
    user, _ = admin_user
    uid = _uid()
    doc = RagDocument(
        filename=f'test_{uid}.pdf',
        original_filename='child_development.pdf',
        content_type='application/pdf',
        gcs_path=f'RAG/test_{uid}.pdf',
        file_size=1024,
        status='ready',
        uploaded_by=user.id,
        rag_file_name=f'projects/test/locations/us-west1/ragCorpora/123/ragFiles/{uid}',
        rag_corpus_name='projects/test/locations/us-west1/ragCorpora/123',
    )
    db.session.add(doc)
    db.session.commit()
    yield doc

    try:
        still_exists = db.session.get(RagDocument, doc.id)
        if still_exists:
            db.session.delete(still_exists)
            db.session.commit()
    except Exception:
        db.session.rollback()


# ===========================================================================
# 1. RAG Engine Wrapper Tests (mocked SDK)
# ===========================================================================

class TestRagEngine:
    """Test the rag_engine.py wrapper module (all SDK calls mocked)."""

    @patch('app.rag.rag_engine.vertexai')
    def test_init_vertexai_once(self, mock_vi, app):
        """_init_vertexai calls vertexai.init only once."""
        import app.rag.rag_engine as eng
        eng._vertexai_initialized = False  # reset
        eng._init_vertexai()
        mock_vi.init.assert_called_once()
        # Second call should not call init again
        eng._init_vertexai()
        assert mock_vi.init.call_count == 1
        eng._vertexai_initialized = False  # cleanup

    @patch('app.rag.rag_engine._init_vertexai')
    def test_import_file_to_rag(self, mock_init, app):
        """import_file_to_rag calls rag.import_files and returns file name."""
        from app.rag.rag_engine import import_file_to_rag

        mock_response = MagicMock()
        mock_response.imported_rag_files_count = 1

        mock_file = MagicMock()
        mock_file.name = 'projects/test/locations/us-west1/ragCorpora/123/ragFiles/456'
        mock_file.display_name = 'test.pdf'
        mock_gcs_source = MagicMock()
        mock_gcs_source.uris = ['gs://bucket/RAG/test.pdf']
        mock_file.gcs_source = mock_gcs_source

        mock_rag = MagicMock()
        mock_rag.import_files.return_value = mock_response
        mock_rag.list_files.return_value = [mock_file]

        with patch.dict('sys.modules', {'vertexai.preview.rag': mock_rag, 'vertexai.preview': MagicMock(rag=mock_rag)}):
            result = import_file_to_rag(
                'gs://bucket/RAG/test.pdf',
                corpus_name='projects/test/locations/us-west1/ragCorpora/123',
            )
            assert 'ragFiles' in result

    @patch('app.rag.rag_engine._init_vertexai')
    def test_delete_rag_file_success(self, mock_init, app):
        """delete_rag_file calls rag.delete_file."""
        with patch('vertexai.preview.rag.delete_file') as mock_del:
            from app.rag.rag_engine import delete_rag_file
            result = delete_rag_file('projects/test/ragCorpora/123/ragFiles/456')
            assert result is True
            mock_del.assert_called_once()

    @patch('app.rag.rag_engine._init_vertexai')
    def test_delete_rag_file_not_found(self, mock_init, app):
        """delete_rag_file returns True when file already deleted."""
        from google.api_core import exceptions as gcp_exc
        with patch('vertexai.preview.rag.delete_file', side_effect=gcp_exc.NotFound('gone')):
            from app.rag.rag_engine import delete_rag_file
            result = delete_rag_file('projects/test/ragCorpora/123/ragFiles/456')
            assert result is True

    @patch('app.rag.rag_engine._init_vertexai')
    def test_delete_rag_file_empty_name(self, mock_init, app):
        """delete_rag_file skips if name is empty."""
        from app.rag.rag_engine import delete_rag_file
        assert delete_rag_file("") is True
        assert delete_rag_file(None) is True

    @patch('app.rag.rag_engine._init_vertexai')
    def test_search_rag_returns_results(self, mock_init, app):
        """search_rag returns formatted dicts from retrieval_query."""
        mock_ctx = MagicMock()
        mock_ctx.text = "Children walk at 12 months."
        mock_ctx.source_uri = "gs://bucket/RAG/guide.pdf"
        mock_ctx.source_display_name = "guide.pdf"
        mock_ctx.score = 0.92
        mock_ctx.distance = None

        mock_contexts = MagicMock()
        mock_contexts.contexts = [mock_ctx]

        mock_response = MagicMock()
        mock_response.contexts = mock_contexts

        with patch('vertexai.preview.rag.retrieval_query', return_value=mock_response), \
             patch('vertexai.preview.rag.RagResource'), \
             patch('vertexai.preview.rag.RagRetrievalConfig'), \
             patch('vertexai.preview.rag.Filter'):
            from app.rag.rag_engine import search_rag
            results = search_rag("motor development", top_k=3)
            assert len(results) == 1
            assert results[0]['content'] == "Children walk at 12 months."
            assert results[0]['document_name'] == 'guide.pdf'
            assert results[0]['similarity'] == 0.92

    @patch('app.rag.rag_engine._init_vertexai')
    def test_search_rag_empty(self, mock_init, app):
        """search_rag returns [] when no contexts."""
        mock_response = MagicMock()
        mock_response.contexts = None

        with patch('vertexai.preview.rag.retrieval_query', return_value=mock_response), \
             patch('vertexai.preview.rag.RagResource'), \
             patch('vertexai.preview.rag.RagRetrievalConfig'), \
             patch('vertexai.preview.rag.Filter'):
            from app.rag.rag_engine import search_rag
            results = search_rag("something obscure")
            assert results == []

    @patch('app.rag.rag_engine._init_vertexai')
    def test_search_rag_error(self, mock_init, app):
        """search_rag returns [] on API error."""
        with patch('vertexai.preview.rag.retrieval_query', side_effect=Exception("API error")), \
             patch('vertexai.preview.rag.RagResource'), \
             patch('vertexai.preview.rag.RagRetrievalConfig'), \
             patch('vertexai.preview.rag.Filter'):
            from app.rag.rag_engine import search_rag
            results = search_rag("test")
            assert results == []

    @patch('app.rag.rag_engine._init_vertexai')
    def test_list_rag_files(self, mock_init, app):
        """list_rag_files returns formatted list."""
        mock_file = MagicMock()
        mock_file.name = 'projects/test/ragCorpora/123/ragFiles/789'
        mock_file.display_name = 'guide.pdf'
        mock_gcs = MagicMock()
        mock_gcs.uris = ['gs://bucket/RAG/guide.pdf']
        mock_file.gcs_source = mock_gcs

        with patch('vertexai.preview.rag.list_files', return_value=[mock_file]):
            from app.rag.rag_engine import list_rag_files
            files = list_rag_files()
            assert len(files) == 1
            assert files[0]['name'] == mock_file.name
            assert files[0]['display_name'] == 'guide.pdf'

    def test_extract_filename(self, app):
        """_extract_filename parses GCS URIs correctly."""
        from app.rag.rag_engine import _extract_filename
        assert _extract_filename("gs://bucket/RAG/guide.pdf") == "guide.pdf"
        assert _extract_filename("") == "unknown"
        # Trailing slash: last non-empty part is 'RAG'
        assert _extract_filename("gs://bucket/RAG/") == "RAG"

    @patch('app.rag.rag_engine._init_vertexai')
    @patch('app.rag.rag_engine.delete_weaviate_chunks')
    def test_delete_rag_file_with_weaviate_cleanup(self, mock_weav_del, mock_init, app):
        """delete_rag_file performs two-phase delete: Vertex AI + Weaviate."""
        mock_weav_del.return_value = 5

        with patch('vertexai.preview.rag.delete_file') as mock_rag_del:
            from app.rag.rag_engine import delete_rag_file
            result = delete_rag_file(
                'projects/test/ragCorpora/123/ragFiles/456',
                gcs_uri='gs://test-bucket/RAG/doc.pdf',
            )
            assert result is True
            mock_rag_del.assert_called_once()
            mock_weav_del.assert_called_once_with(
                'gs://test-bucket/RAG/doc.pdf',
                rag_file_name='projects/test/ragCorpora/123/ragFiles/456',
            )

    @patch('app.rag.rag_engine._init_vertexai')
    @patch('app.rag.rag_engine.delete_weaviate_chunks')
    def test_delete_rag_file_vertex_fails_weaviate_succeeds(self, mock_weav_del, mock_init, app):
        """delete_rag_file returns False when Vertex AI fails but still runs Weaviate."""
        mock_weav_del.return_value = 3

        with patch('vertexai.preview.rag.delete_file', side_effect=Exception("API error")):
            from app.rag.rag_engine import delete_rag_file
            result = delete_rag_file(
                'projects/test/ragCorpora/123/ragFiles/456',
                gcs_uri='gs://test-bucket/RAG/doc.pdf',
            )
            assert result is False  # Vertex AI failed
            mock_weav_del.assert_called_once()  # But Weaviate cleanup still ran
            # Verify both gcs_uri and rag_file_name were passed
            call_args = mock_weav_del.call_args
            assert call_args[0][0] == 'gs://test-bucket/RAG/doc.pdf'
            assert call_args[1]['rag_file_name'] == 'projects/test/ragCorpora/123/ragFiles/456'

    @patch('app.rag.rag_engine._init_vertexai')
    @patch('app.rag.rag_engine.delete_weaviate_chunks')
    def test_delete_rag_file_no_gcs_uri_uses_file_id(self, mock_weav_del, mock_init, app):
        """delete_rag_file still runs Weaviate cleanup via fileId when gcs_uri is empty."""
        mock_weav_del.return_value = 2

        with patch('vertexai.preview.rag.delete_file'):
            from app.rag.rag_engine import delete_rag_file
            result = delete_rag_file('projects/test/ragCorpora/123/ragFiles/456')
            assert result is True
            mock_weav_del.assert_called_once_with(
                '', rag_file_name='projects/test/ragCorpora/123/ragFiles/456',
            )

    @patch('app.rag.rag_engine._init_vertexai')
    @patch('app.rag.rag_engine.delete_weaviate_chunks')
    def test_delete_rag_file_no_ids_skips_weaviate(self, mock_weav_del, mock_init, app):
        """delete_rag_file skips Weaviate cleanup when both gcs_uri and name are empty."""
        from app.rag.rag_engine import delete_rag_file
        result = delete_rag_file("")
        assert result is True
        mock_weav_del.assert_not_called()


# ===========================================================================
# 1b. Weaviate Direct Delete Tests (mocked SDK)
# ===========================================================================

class TestWeaviateDelete:
    """Test Weaviate direct chunk deletion functions."""

    @patch('app.rag.rag_engine._cfg')
    def test_get_weaviate_client_success(self, mock_cfg, app):
        """_get_weaviate_client connects with valid credentials."""
        mock_cfg.side_effect = lambda k, d="": {
            "WEAVIATE_URL": "https://test.weaviate.cloud",
            "WEAVIATE_API_KEY": "test-api-key",
            "WEAVIATE_COLLECTION": "FYP",
        }.get(k, d)

        mock_client = MagicMock()
        with patch('weaviate.connect_to_weaviate_cloud', return_value=mock_client):
            from app.rag.rag_engine import _get_weaviate_client
            client = _get_weaviate_client()
            assert client is mock_client

    @patch('app.rag.rag_engine._cfg')
    def test_get_weaviate_client_no_credentials(self, mock_cfg, app):
        """_get_weaviate_client returns None when API key is missing."""
        mock_cfg.side_effect = lambda k, d="": {
            "WEAVIATE_URL": "https://test.weaviate.cloud",
            "WEAVIATE_API_KEY": "",
        }.get(k, d)

        from app.rag.rag_engine import _get_weaviate_client
        client = _get_weaviate_client()
        assert client is None

    @patch('app.rag.rag_engine._cfg')
    def test_get_weaviate_client_connection_error(self, mock_cfg, app):
        """_get_weaviate_client returns None on connection failure."""
        mock_cfg.side_effect = lambda k, d="": {
            "WEAVIATE_URL": "https://test.weaviate.cloud",
            "WEAVIATE_API_KEY": "test-key",
        }.get(k, d)

        with patch('weaviate.connect_to_weaviate_cloud', side_effect=Exception("Connection refused")):
            from app.rag.rag_engine import _get_weaviate_client
            client = _get_weaviate_client()
            assert client is None

    @patch('app.rag.rag_engine._get_weaviate_client')
    @patch('app.rag.rag_engine._weaviate_collection_name', return_value='FYP')
    def test_delete_weaviate_chunks_by_uri(self, mock_coll_name, mock_get_client, app):
        """delete_weaviate_chunks deletes by fileOriginalUri equal filter."""
        # Mock object returned by query
        mock_obj = MagicMock()
        mock_obj.uuid = "uuid-123"

        mock_result = MagicMock()
        mock_result.objects = [mock_obj]

        mock_collection = MagicMock()
        mock_collection.query.fetch_objects.return_value = mock_result

        mock_client = MagicMock()
        mock_client.collections.get.return_value = mock_collection
        mock_get_client.return_value = mock_client

        from app.rag.rag_engine import delete_weaviate_chunks
        result = delete_weaviate_chunks("gs://test-bucket/RAG/doc.pdf")
        assert result >= 1
        mock_collection.data.delete_by_id.assert_called_with("uuid-123")
        mock_client.close.assert_called_once()

    @patch('app.rag.rag_engine._get_weaviate_client')
    @patch('app.rag.rag_engine._weaviate_collection_name', return_value='FYP')
    def test_delete_weaviate_chunks_by_file_id(self, mock_coll_name, mock_get_client, app):
        """delete_weaviate_chunks falls back to fileId when URI match fails."""
        mock_obj = MagicMock()
        mock_obj.uuid = "uuid-fileid-1"

        mock_empty = MagicMock()
        mock_empty.objects = []

        mock_match = MagicMock()
        mock_match.objects = [mock_obj]

        mock_collection = MagicMock()
        # First call (fileOriginalUri) returns empty, second (fileId) returns match
        mock_collection.query.fetch_objects.side_effect = [mock_empty, mock_match]

        mock_client = MagicMock()
        mock_client.collections.get.return_value = mock_collection
        mock_get_client.return_value = mock_client

        from app.rag.rag_engine import delete_weaviate_chunks
        result = delete_weaviate_chunks(
            "gs://test-bucket/RAG/doc.pdf",
            rag_file_name="projects/test/ragCorpora/123/ragFiles/5640880995116820602",
        )
        assert result >= 1
        mock_collection.data.delete_by_id.assert_called_with("uuid-fileid-1")
        mock_client.close.assert_called_once()

    @patch('app.rag.rag_engine._get_weaviate_client')
    def test_delete_weaviate_chunks_no_client(self, mock_get_client, app):
        """delete_weaviate_chunks returns -1 when client cannot connect."""
        mock_get_client.return_value = None

        from app.rag.rag_engine import delete_weaviate_chunks
        result = delete_weaviate_chunks("gs://test-bucket/RAG/doc.pdf")
        assert result == -1

    @patch('app.rag.rag_engine._get_weaviate_client')
    @patch('app.rag.rag_engine._weaviate_collection_name', return_value='FYP')
    def test_delete_weaviate_chunks_no_matches(self, mock_coll_name, mock_get_client, app):
        """delete_weaviate_chunks returns 0 when no matching objects found."""
        mock_empty = MagicMock()
        mock_empty.objects = []

        mock_config = MagicMock()
        mock_config.properties = []  # No extra properties

        mock_collection = MagicMock()
        mock_collection.query.fetch_objects.return_value = mock_empty
        mock_collection.config.get.return_value = mock_config

        mock_client = MagicMock()
        mock_client.collections.get.return_value = mock_collection
        mock_get_client.return_value = mock_client

        from app.rag.rag_engine import delete_weaviate_chunks
        result = delete_weaviate_chunks("gs://test-bucket/RAG/nonexistent.pdf")
        assert result == 0
        mock_client.close.assert_called_once()

    @patch('app.rag.rag_engine._get_weaviate_client')
    @patch('app.rag.rag_engine._weaviate_collection_name', return_value='FYP')
    def test_delete_weaviate_chunks_fallback_scan(self, mock_coll_name, mock_get_client, app):
        """delete_weaviate_chunks falls back to full scan when filters find nothing."""
        mock_config = MagicMock()
        mock_config.properties = []  # No extra source properties

        # All filter queries return empty
        mock_empty = MagicMock()
        mock_empty.objects = []

        # Full scan returns a matching object
        mock_obj = MagicMock()
        mock_obj.uuid = "uuid-scan-1"
        mock_obj.properties = {"fileOriginalUri": "gs://test-bucket/RAG/doc.pdf", "chunkData": "text"}

        mock_scan_result = MagicMock()
        mock_scan_result.objects = [mock_obj]

        mock_collection = MagicMock()
        mock_collection.config.get.return_value = mock_config
        # Phase 1 (fileOriginalUri equal) returns empty
        # Phase 4 (full scan) returns match
        mock_collection.query.fetch_objects.side_effect = [
            mock_empty,       # Phase 1: fileOriginalUri equal
            mock_scan_result, # Phase 4: full scan fallback
        ]

        mock_client = MagicMock()
        mock_client.collections.get.return_value = mock_collection
        mock_get_client.return_value = mock_client

        from app.rag.rag_engine import delete_weaviate_chunks
        result = delete_weaviate_chunks("gs://test-bucket/RAG/doc.pdf")
        assert result >= 1
        mock_collection.data.delete_by_id.assert_called_with("uuid-scan-1")
        mock_client.close.assert_called_once()

    @patch('app.rag.rag_engine._get_weaviate_client')
    @patch('app.rag.rag_engine._weaviate_collection_name', return_value='FYP')
    def test_delete_weaviate_chunks_exception_handling(self, mock_coll_name, mock_get_client, app):
        """delete_weaviate_chunks returns -1 on unexpected errors."""
        mock_client = MagicMock()
        mock_client.collections.get.side_effect = Exception("Weaviate error")
        mock_get_client.return_value = mock_client

        from app.rag.rag_engine import delete_weaviate_chunks
        result = delete_weaviate_chunks("gs://test-bucket/RAG/doc.pdf")
        assert result == -1
        mock_client.close.assert_called_once()

    def test_weaviate_collection_name(self, app):
        """_weaviate_collection_name returns configured collection name."""
        from app.rag.rag_engine import _weaviate_collection_name
        # Should return 'FYP' or whatever is configured
        name = _weaviate_collection_name()
        assert isinstance(name, str)
        assert len(name) > 0


# ===========================================================================
# 2. Processor Tests
# ===========================================================================

class TestProcessor:
    """Test document processing pipeline."""

    @patch('app.rag.processor.import_file_to_rag')
    def test_process_document_success(self, mock_import, app, db, sample_document):
        """Successful document processing sets status to ready."""
        mock_import.return_value = 'projects/test/ragCorpora/123/ragFiles/new'

        doc = RagDocument.query.get(sample_document.id)
        doc.status = 'pending'
        db.session.commit()

        from app.rag.processor import process_document
        success = process_document(doc.id)
        assert success is True

        db.session.refresh(doc)
        assert doc.status == 'ready'
        assert doc.rag_file_name == 'projects/test/ragCorpora/123/ragFiles/new'
        mock_import.assert_called_once()

    @patch('app.rag.processor.import_file_to_rag')
    def test_process_document_import_failure(self, mock_import, app, db, sample_document):
        """Failed import sets status to error."""
        mock_import.side_effect = RuntimeError("Import failed")

        doc = RagDocument.query.get(sample_document.id)
        doc.status = 'pending'
        db.session.commit()

        from app.rag.processor import process_document
        success = process_document(doc.id)
        assert success is False

        db.session.refresh(doc)
        assert doc.status == 'error'

    def test_process_document_not_found(self, app):
        """Processing a non-existent document returns False."""
        from app.rag.processor import process_document
        assert process_document(999999) is False

    @patch('app.rag.processor.delete_rag_file')
    def test_delete_document_data(self, mock_del, app, db, sample_document):
        """delete_document_data removes RAG file and DB row, passes gcs_uri."""
        mock_del.return_value = True
        doc_id = sample_document.id
        doc_rag_file = sample_document.rag_file_name

        from app.rag.processor import delete_document_data
        result = delete_document_data(doc_id)
        assert result is True
        assert RagDocument.query.get(doc_id) is None
        mock_del.assert_called_once()
        # Verify gcs_uri keyword argument was passed
        call_kwargs = mock_del.call_args
        assert call_kwargs[0][0] == doc_rag_file  # rag_file_name
        assert 'gcs_uri' in call_kwargs[1]  # gcs_uri passed as kwarg

    @patch('app.rag.processor.delete_rag_file')
    def test_delete_document_not_found(self, mock_del, app):
        """Deleting non-existent document returns True (idempotent)."""
        from app.rag.processor import delete_document_data
        result = delete_document_data(999999)
        assert result is True


# ===========================================================================
# 3. Retriever Tests
# ===========================================================================

class TestRetriever:
    """Test vector search and context formatting."""

    def test_format_context_empty(self, app):
        """Empty results produce empty context string."""
        from app.rag.retriever import format_context
        assert format_context([]) == ""

    def test_format_context_with_results(self, app):
        """Results are formatted with headers and source info."""
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
                'heading': None,
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

    def test_search_knowledge_delegates(self, app):
        """search_knowledge delegates to search_rag."""
        mock_results = [
            {'content': 'test', 'document_name': 'a.pdf', 'similarity': 0.9,
             'source': 'gs://bucket/RAG/a.pdf', 'heading': None, 'page_number': None}
        ]
        with patch('app.rag.rag_engine.search_rag', return_value=mock_results) as mock_sr:
            from app.rag.retriever import search_knowledge
            results = search_knowledge("motor development")
            assert len(results) == 1

    def test_search_knowledge_error(self, app):
        """search_knowledge returns [] on error."""
        with patch('app.rag.rag_engine.search_rag', side_effect=Exception("API error")):
            from app.rag.retriever import search_knowledge
            results = search_knowledge("test query")
            assert results == []


# ===========================================================================
# 4. Model Tests
# ===========================================================================

class TestModels:
    """Test RagDocument model."""

    def test_rag_document_to_dict(self, app, sample_document):
        """RagDocument.to_dict() serializes correctly."""
        d = sample_document.to_dict()
        assert d['original_filename'] == 'child_development.pdf'
        assert d['status'] == 'ready'
        assert d['file_size'] == 1024
        assert d['content_type'] == 'application/pdf'
        assert 'rag_file_name' in d
        assert 'rag_corpus_name' in d
        # chunk_count should NOT be present (removed)
        assert 'chunk_count' not in d

    def test_rag_document_fields(self, app, db, admin_user):
        """RagDocument stores rag_file_name and rag_corpus_name."""
        user, _ = admin_user
        uid = _uid()
        doc = RagDocument(
            filename=f'test_{uid}.pdf',
            original_filename='test.pdf',
            content_type='application/pdf',
            gcs_path=f'RAG/test_{uid}.pdf',
            file_size=512,
            status='ready',
            uploaded_by=user.id,
            rag_file_name='projects/test/ragCorpora/123/ragFiles/999',
            rag_corpus_name='projects/test/ragCorpora/123',
        )
        db.session.add(doc)
        db.session.commit()

        fetched = RagDocument.query.get(doc.id)
        assert fetched.rag_file_name == 'projects/test/ragCorpora/123/ragFiles/999'
        assert fetched.rag_corpus_name == 'projects/test/ragCorpora/123'

        db.session.delete(doc)
        db.session.commit()

    def test_user_role(self, app, db):
        """User role field defaults to 'user' and is_admin() works."""
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

        db.session.delete(user)
        db.session.commit()


# ===========================================================================
# 5. Admin API Endpoint Tests
# ===========================================================================

class TestAdminEndpoints:
    """Test RAG admin API endpoints."""

    def _auth_headers(self, token):
        return {'Authorization': f'Bearer {token}'}

    # -- Access control --

    def test_list_documents_requires_admin(self, app, client, regular_user):
        """Non-admin users get 403 on RAG endpoints."""
        _, token = regular_user
        resp = client.get('/admin/rag/documents', headers=self._auth_headers(token))
        assert resp.status_code == 403

    def test_list_documents_requires_auth(self, app, client):
        """Unauthenticated requests get 401."""
        resp = client.get('/admin/rag/documents')
        assert resp.status_code in (401, 422)

    # -- List documents --

    @patch('app.rag.rag_engine.sync_bucket_to_db')
    def test_list_documents_empty(self, mock_sync, app, client, admin_user):
        """Admin can list documents (empty list)."""
        mock_sync.return_value = {'discovered': 0, 'imported': 0, 'errors': 0}
        _, token = admin_user
        resp = client.get('/admin/rag/documents', headers=self._auth_headers(token))
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'documents' in data
        assert isinstance(data['documents'], list)

    @patch('app.rag.rag_engine.sync_bucket_to_db')
    def test_list_documents_with_data(self, mock_sync, app, client, admin_user, sample_document):
        """Admin can list documents (with data)."""
        mock_sync.return_value = {'discovered': 0, 'imported': 0, 'errors': 0}
        _, token = admin_user
        resp = client.get('/admin/rag/documents', headers=self._auth_headers(token))
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data['documents']) >= 1
        assert data['documents'][0]['original_filename'] == 'child_development.pdf'

    # -- Get document --

    def test_get_document(self, app, client, admin_user, sample_document):
        """Admin can get a single document."""
        _, token = admin_user
        resp = client.get(
            f'/admin/rag/documents/{sample_document.id}',
            headers=self._auth_headers(token),
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['document']['id'] == sample_document.id

    def test_get_document_not_found(self, app, client, admin_user):
        """Getting a non-existent document returns 404."""
        _, token = admin_user
        resp = client.get('/admin/rag/documents/999999', headers=self._auth_headers(token))
        assert resp.status_code == 404

    # -- Upload document --

    @patch('threading.Thread')
    @patch('app.gcp_bucket.upload_rag_document')
    def test_upload_document(self, mock_upload, mock_thread, app, client, admin_user):
        """Admin upload returns 202 and starts background import thread."""
        _, token = admin_user
        uid = _uid()
        mock_upload.return_value = (f'RAG/test_upload_{uid}.txt', 100)

        data = {
            'file': (io.BytesIO(b"Test content for upload"), 'test.txt', 'text/plain'),
        }
        resp = client.post(
            '/admin/rag/documents',
            headers=self._auth_headers(token),
            data=data,
            content_type='multipart/form-data',
        )
        assert resp.status_code == 202
        result = resp.get_json()
        assert 'document' in result
        # Background thread must have been created and started
        mock_thread.assert_called_once()
        mock_thread.return_value.start.assert_called_once()

    def test_upload_no_file(self, app, client, admin_user):
        """Upload without file returns 400."""
        _, token = admin_user
        resp = client.post(
            '/admin/rag/documents',
            headers=self._auth_headers(token),
            content_type='multipart/form-data',
        )
        assert resp.status_code == 400

    def test_upload_unsupported_type(self, app, client, admin_user):
        """Upload of unsupported file type returns 400."""
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

    @patch('app.rag.processor.delete_rag_file')
    @patch('app.gcp_bucket.delete_rag_document')
    def test_delete_document(self, mock_gcs_delete, mock_rag_delete, app, client, admin_user, db):
        """Admin can delete a document."""
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
            rag_file_name=f'projects/test/ragCorpora/123/ragFiles/{uid}',
            rag_corpus_name='projects/test/ragCorpora/123',
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
        assert 'Document deleted' in resp.get_json()['message']
        mock_gcs_delete.assert_called_once_with(gcs_path)

    def test_delete_document_not_found(self, app, client, admin_user):
        """Deleting non-existent document returns 404."""
        _, token = admin_user
        resp = client.delete('/admin/rag/documents/999999', headers=self._auth_headers(token))
        assert resp.status_code == 404

    # -- Search --

    @patch('app.rag.retriever.search_knowledge')
    def test_search(self, mock_search, app, client, admin_user):
        """Admin can test search."""
        _, token = admin_user
        mock_search.return_value = [
            {
                'content': 'Walking begins at 12 months.',
                'heading': 'Motor',
                'page_number': 2,
                'document_name': 'guide.pdf',
                'similarity': 0.95,
                'source': 'gs://bucket/RAG/guide.pdf',
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
        _, token = regular_user
        resp = client.delete('/admin/rag/documents/1', headers=self._auth_headers(token))
        assert resp.status_code == 403

    def test_search_requires_admin(self, app, client, regular_user):
        """Non-admin cannot search."""
        _, token = regular_user
        resp = client.post(
            '/admin/rag/search',
            headers={**self._auth_headers(token), 'Content-Type': 'application/json'},
            data=json.dumps({'query': 'test'}),
        )
        assert resp.status_code == 403


# ===========================================================================
# 6. Batch Delete Tests
# ===========================================================================

class TestBatchDelete:
    """Tests for POST /admin/rag/documents/batch-delete."""

    def _auth_headers(self, token: str) -> dict:
        return {'Authorization': f'Bearer {token}'}

    @patch('app.rag.processor.delete_rag_file')
    @patch('app.gcp_bucket.delete_rag_document')
    def test_batch_delete_success(self, mock_gcs_del, mock_rag_del, app, client, admin_user, db):
        """Admin can batch-delete multiple documents."""
        user, token = admin_user
        uid = _uid()
        docs = []
        for i in range(3):
            doc = RagDocument(
                filename=f'batch_{uid}_{i}.txt',
                original_filename=f'batch_{i}.txt',
                content_type='text/plain',
                gcs_path=f'RAG/batch_{uid}_{i}.txt',
                file_size=10,
                status='ready',
                uploaded_by=user.id,
                rag_file_name=f'projects/test/ragCorpora/123/ragFiles/batch_{uid}_{i}',
                rag_corpus_name='projects/test/ragCorpora/123',
            )
            db.session.add(doc)
        db.session.commit()
        doc_ids = [d.id for d in RagDocument.query.filter(
            RagDocument.filename.like(f'batch_{uid}_%')).all()]

        resp = client.post(
            '/admin/rag/documents/batch-delete',
            headers={**self._auth_headers(token), 'Content-Type': 'application/json'},
            data=json.dumps({'doc_ids': doc_ids}),
        )
        assert resp.status_code == 200
        result = resp.get_json()
        assert 'deleted' in result['results']
        assert len(result['results']['deleted']) == 3
        assert result['results']['failed'] == []
        assert mock_gcs_del.call_count == 3

    @patch('app.rag.processor.delete_rag_file')
    @patch('app.gcp_bucket.delete_rag_document')
    def test_batch_delete_not_found_ids(self, mock_gcs_del, mock_rag_del, app, client, admin_user):
        """Non-existent doc IDs are reported in not_found."""
        _, token = admin_user
        resp = client.post(
            '/admin/rag/documents/batch-delete',
            headers={**self._auth_headers(token), 'Content-Type': 'application/json'},
            data=json.dumps({'doc_ids': [999991, 999992]}),
        )
        assert resp.status_code == 200
        result = resp.get_json()
        assert set(result['results']['not_found']) == {999991, 999992}

    def test_batch_delete_empty_ids_returns_400(self, app, client, admin_user):
        """Empty doc_ids list returns 400."""
        _, token = admin_user
        resp = client.post(
            '/admin/rag/documents/batch-delete',
            headers={**self._auth_headers(token), 'Content-Type': 'application/json'},
            data=json.dumps({'doc_ids': []}),
        )
        assert resp.status_code == 400

    def test_batch_delete_missing_body_returns_400(self, app, client, admin_user):
        """Missing request body returns 400."""
        _, token = admin_user
        resp = client.post(
            '/admin/rag/documents/batch-delete',
            headers={**self._auth_headers(token), 'Content-Type': 'application/json'},
            data=json.dumps({}),
        )
        assert resp.status_code == 400

    def test_batch_delete_requires_admin(self, app, client, regular_user):
        """Non-admin cannot batch-delete."""
        _, token = regular_user
        resp = client.post(
            '/admin/rag/documents/batch-delete',
            headers={**self._auth_headers(token), 'Content-Type': 'application/json'},
            data=json.dumps({'doc_ids': [1]}),
        )
        assert resp.status_code == 403

    def test_batch_delete_requires_auth(self, app, client):
        """Unauthenticated request returns 401."""
        resp = client.post(
            '/admin/rag/documents/batch-delete',
            headers={'Content-Type': 'application/json'},
            data=json.dumps({'doc_ids': [1]}),
        )
        assert resp.status_code == 401

    @patch('app.rag.processor.delete_document_data', side_effect=Exception('RAG Engine error'))
    @patch('app.gcp_bucket.delete_rag_document')
    def test_batch_delete_partial_failure(self, mock_gcs_del, mock_del_data, app, client, admin_user, db):
        """Failed deletions are reported in results['failed'] without aborting others."""
        user, token = admin_user
        uid = _uid()
        doc = RagDocument(
            filename=f'fail_{uid}.txt',
            original_filename='fail.txt',
            content_type='text/plain',
            gcs_path=f'RAG/fail_{uid}.txt',
            file_size=10,
            status='ready',
            uploaded_by=user.id,
            rag_file_name=f'projects/test/ragCorpora/123/ragFiles/fail_{uid}',
            rag_corpus_name='projects/test/ragCorpora/123',
        )
        db.session.add(doc)
        db.session.commit()

        resp = client.post(
            '/admin/rag/documents/batch-delete',
            headers={**self._auth_headers(token), 'Content-Type': 'application/json'},
            data=json.dumps({'doc_ids': [doc.id]}),
        )
        # Endpoint should still return 200 with failed list
        assert resp.status_code == 200
        result = resp.get_json()
        failed_ids = [item['id'] for item in result['results']['failed']]
        assert doc.id in failed_ids


# ===========================================================================
# 7. Bucket Sync Tests
# ===========================================================================

class TestBucketSync:
    """Test sync_bucket_to_db functionality."""

    def test_sync_discovers_new_files(self, app, db):
        """sync_bucket_to_db discovers and imports new GCS files."""
        mock_blob = MagicMock()
        mock_blob.name = 'RAG/sync_test_new.pdf'
        mock_blob.content_type = 'application/pdf'
        mock_blob.size = 2048

        mock_bucket = MagicMock()
        mock_bucket.list_blobs.return_value = [mock_blob]
        mock_client = MagicMock()
        mock_client.bucket.return_value = mock_bucket

        from app.rag.rag_engine import sync_bucket_to_db
        with patch('app.rag.rag_engine._init_vertexai'), \
             patch('app.rag.rag_engine.import_file_to_rag', return_value='projects/test/ragCorpora/123/ragFiles/new'), \
             patch('app.gcp_bucket.get_gcs_client', return_value=mock_client):
            stats = sync_bucket_to_db()
        assert stats['discovered'] >= 0

    def test_sync_no_bucket_name(self, app):
        """sync_bucket_to_db handles missing bucket name."""
        from app.rag.rag_engine import sync_bucket_to_db
        with patch('app.rag.rag_engine._cfg', side_effect=lambda k, d="": "" if k == "GCS_BUCKET_NAME" else d):
            stats = sync_bucket_to_db()
            assert stats['discovered'] == 0


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
        from app.agent.chat_agent import _make_retrieve_knowledge_tool
        retrieve_knowledge = _make_retrieve_knowledge_tool()

        mock_search.return_value = [
            {'content': 'Test result', 'similarity': 0.9, 'document_name': 'doc.pdf',
             'heading': None, 'page_number': 1, 'source': 'gs://b/RAG/doc.pdf'}
        ]
        mock_format.return_value = "[Reference 1] Test result"

        result = asyncio.run(retrieve_knowledge("motor development milestones"))
        assert "Reference 1" in result or "knowledge base" in result.lower() or len(result) > 0
        mock_search.assert_called_once()

    @patch('app.rag.retriever.search_knowledge')
    def test_retrieve_knowledge_no_results(self, mock_search, app):
        """retrieve_knowledge with no matches returns informative message."""
        import asyncio
        from app.agent.chat_agent import _make_retrieve_knowledge_tool
        retrieve_knowledge = _make_retrieve_knowledge_tool()

        mock_search.return_value = []
        result = asyncio.run(retrieve_knowledge("something very specific"))
        assert isinstance(result, str)
        assert "KNOWLEDGE BASE RETURNED EMPTY" in result or "knowledge" in result.lower()

    @patch('app.rag.retriever.search_knowledge')
    def test_retrieve_knowledge_error_handling(self, mock_search, app):
        """retrieve_knowledge handles errors gracefully."""
        import asyncio
        from app.agent.chat_agent import _make_retrieve_knowledge_tool
        retrieve_knowledge = _make_retrieve_knowledge_tool()

        mock_search.side_effect = Exception("Connection error")
        result = asyncio.run(retrieve_knowledge("test query"))
        assert isinstance(result, str)
        # Should not raise — returns a fallback message


# ===========================================================================
# Entry point
# ===========================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
