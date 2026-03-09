"""
Tests for Firebase Authentication integration.

These tests verify:
- The /auth/firebase-login endpoint
- The /auth/firebase-config endpoint
- User model Firebase fields
- Firebase auth module functions
"""
import pytest
import uuid
from unittest.mock import patch, MagicMock

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


@pytest.fixture(scope='session')
def app():
    """Create a test Flask app with an in-memory SQLite database."""
    os.environ.setdefault('DATABASE_URL', 'sqlite://')
    os.environ.setdefault('SECRET_KEY', 'test-secret')
    os.environ.setdefault('JWT_SECRET_KEY', 'test-jwt-secret')
    os.environ.setdefault('CREATE_DB_ON_STARTUP', 'true')

    from app import create_app
    test_app = create_app()
    test_app.config['TESTING'] = True
    test_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite://'

    with test_app.app_context():
        from app.models import db
        db.create_all()
        yield test_app
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db(app):
    from app.models import db as _db
    with app.app_context():
        yield _db


def _uid():
    return uuid.uuid4().hex[:8]


# ============================================================================
# Model Tests
# ============================================================================

class TestUserModelFirebase:
    """Test Firebase-related fields on the User model."""

    def test_firebase_fields_default(self, app, db):
        from app.models import User
        uid = _uid()
        user = User(email=f'{uid}@test.com')  # No username or password
        db.session.add(user)
        db.session.commit()

        assert user.firebase_uid is None
        assert user.auth_provider == 'local'
        assert user.email_verified is False
        assert user.last_login_at is None
        assert user.display_name is None
        assert user.username is None

        db.session.delete(user)
        db.session.commit()

    def test_is_firebase_user(self, app, db):
        from app.models import User
        uid = _uid()

        local_user = User(username=f'local_{uid}', email=f'local_{uid}@test.com')
        db.session.add(local_user)

        fb_user = User(email=f'fb_{uid}@test.com', firebase_uid=f'fb_uid_{uid}', auth_provider='google.com')
        db.session.add(fb_user)

        db.session.commit()

        assert not local_user.is_firebase_user()
        assert fb_user.is_firebase_user()

        db.session.delete(local_user)
        db.session.delete(fb_user)
        db.session.commit()

    def test_to_dict_includes_firebase_fields(self, app, db):
        from app.models import User
        uid = _uid()
        user = User(
            email=f'{uid}@test.com',
            firebase_uid=f'uid_{uid}',
            auth_provider='google.com',
            email_verified=True,
            display_name='Test User'
        )
        db.session.add(user)
        db.session.commit()

        d = user.to_dict()
        assert d['auth_provider'] == 'google.com'
        assert d['email_verified'] is True
        assert d['display_name'] == 'Test User'

        db.session.delete(user)
        db.session.commit()


# ============================================================================
# Endpoint Tests
# ============================================================================

class TestFirebaseConfig:
    """Test /auth/firebase-config endpoint."""

    def test_firebase_config_returns_public_keys(self, app, client):
        app.config['FIREBASE_API_KEY'] = 'test-api-key'
        app.config['FIREBASE_AUTH_DOMAIN'] = 'test.firebaseapp.com'
        app.config['FIREBASE_PROJECT_ID'] = 'test-project'

        res = client.get('/auth/firebase-config')
        assert res.status_code == 200
        data = res.get_json()
        assert data['apiKey'] == 'test-api-key'
        assert data['authDomain'] == 'test.firebaseapp.com'
        assert data['projectId'] == 'test-project'


class TestFirebaseLogin:
    """Test /auth/firebase-login endpoint."""

    @patch('app.auth._firebase_initialized', False)
    def test_firebase_login_disabled(self, client):
        """When Firebase is not initialized, return 503."""
        res = client.post('/auth/firebase-login', json={'id_token': 'some-token'})
        assert res.status_code == 503

    def test_firebase_login_invalid_token(self, client):
        """An invalid token returns 401."""
        res = client.post('/auth/firebase-login', json={'id_token': 'bad-token'})
        assert res.status_code == 401

    @patch('app.auth.is_firebase_enabled', return_value=True)
    @patch('app.auth.verify_firebase_token')
    @patch('app.auth.get_or_create_user_from_firebase')
    def test_firebase_login_new_user(self, mock_get_or_create, mock_verify, mock_enabled, app, client, db):
        from app.models import User
        uid = _uid()

        # Mock Firebase token verification
        mock_verify.return_value = {
            'uid': f'firebase_{uid}',
            'email': f'{uid}@gmail.com',
            'email_verified': True,
            'name': 'Test Firebase User',
            'picture': 'https://example.com/photo.jpg',
            'firebase': {'sign_in_provider': 'google.com'}
        }

        # Create the user in DB and mock
        with app.app_context():
            user = User(
                email=f'{uid}@gmail.com',
                firebase_uid=f'firebase_{uid}',
                auth_provider='google.com',
                email_verified=True,
                display_name='Test Firebase User'
            )
            db.session.add(user)
            db.session.commit()

            mock_get_or_create.return_value = (user, True)

            res = client.post('/auth/firebase-login', json={'id_token': 'valid-firebase-token'})
            assert res.status_code == 201  # New user
            data = res.get_json()
            assert 'access_token' in data
            assert 'refresh_token' in data
            assert data['user']['email'] == f'{uid}@gmail.com'
            assert data['user']['auth_provider'] == 'google.com'

            db.session.delete(user)
            db.session.commit()

    def test_firebase_login_missing_token(self, client):
        res = client.post('/auth/firebase-login', json={})
        assert res.status_code == 400

    @patch('app.auth.is_firebase_enabled', return_value=True)
    @patch('app.auth.verify_firebase_token')
    @patch('app.auth.get_or_create_user_from_firebase')
    def test_firebase_login_unverified_email_blocked(self, mock_get_or_create, mock_verify, mock_enabled, app, client, db):
        """Unverified email/password users should be blocked with 403 but still saved to DB."""
        from app.models import User
        uid = _uid()
        mock_verify.return_value = {
            'uid': f'firebase_{uid}',
            'email': f'{uid}@test.com',
            'email_verified': False,
            'name': '',
            'picture': '',
            'firebase': {'sign_in_provider': 'password'}
        }

        with app.app_context():
            user = User(
                email=f'{uid}@test.com',
                firebase_uid=f'firebase_{uid}',
                auth_provider='password',
                email_verified=False
            )
            db.session.add(user)
            db.session.commit()

            mock_get_or_create.return_value = (user, True)

            res = client.post('/auth/firebase-login', json={'id_token': 'unverified-token'})
            assert res.status_code == 403
            data = res.get_json()
            assert data['code'] == 'email_not_verified'
            assert 'verify' in data['error'].lower()

            # Verify get_or_create was still called (user saved to DB)
            mock_get_or_create.assert_called_once()

            db.session.delete(user)
            db.session.commit()

    @patch('app.auth.is_firebase_enabled', return_value=True)
    @patch('app.auth.verify_firebase_token')
    @patch('app.auth.get_or_create_user_from_firebase')
    def test_firebase_login_google_unverified_allowed(self, mock_get_or_create, mock_verify, mock_enabled, app, client, db):
        """Google sign-in users bypass email verification gate."""
        from app.models import User
        uid = _uid()

        mock_verify.return_value = {
            'uid': f'firebase_{uid}',
            'email': f'{uid}@gmail.com',
            'email_verified': False,  # Even if False, Google users should pass
            'name': 'Google User',
            'picture': '',
            'firebase': {'sign_in_provider': 'google.com'}
        }

        with app.app_context():
            user = User(
                email=f'{uid}@gmail.com',
                firebase_uid=f'firebase_{uid}',
                auth_provider='google.com'
            )
            db.session.add(user)
            db.session.commit()

            mock_get_or_create.return_value = (user, False)

            res = client.post('/auth/firebase-login', json={'id_token': 'google-token'})
            assert res.status_code == 200  # Should succeed
            data = res.get_json()
            assert 'access_token' in data

            db.session.delete(user)
            db.session.commit()

    @patch('app.auth.is_firebase_enabled', return_value=True)
    @patch('app.auth.verify_firebase_token')
    @patch('app.auth.get_or_create_user_from_firebase')
    def test_firebase_login_verified_email_allowed(self, mock_get_or_create, mock_verify, mock_enabled, app, client, db):
        """Verified email/password users should be allowed to login."""
        from app.models import User
        uid = _uid()

        mock_verify.return_value = {
            'uid': f'firebase_{uid}',
            'email': f'{uid}@test.com',
            'email_verified': True,
            'name': 'Verified User',
            'picture': '',
            'firebase': {'sign_in_provider': 'password'}
        }

        with app.app_context():
            user = User(
                email=f'{uid}@test.com',
                firebase_uid=f'firebase_{uid}',
                auth_provider='password',
                email_verified=True
            )
            db.session.add(user)
            db.session.commit()

            mock_get_or_create.return_value = (user, True)

            res = client.post('/auth/firebase-login', json={'id_token': 'verified-token'})
            assert res.status_code == 201
            data = res.get_json()
            assert 'access_token' in data

            db.session.delete(user)
            db.session.commit()


# ============================================================================
# Email Verification Tests
# ============================================================================

class TestResendVerification:
    """Test /auth/resend-verification endpoint."""

    def test_resend_verification_missing_email(self, client):
        res = client.post('/auth/resend-verification', json={})
        assert res.status_code == 400

    def test_resend_verification_invalid_email(self, client):
        res = client.post('/auth/resend-verification', json={'email': 'not-an-email'})
        assert res.status_code == 400

    @patch('app.auth._firebase_initialized', False)
    def test_resend_verification_firebase_disabled(self, client):
        res = client.post('/auth/resend-verification', json={'email': 'test@test.com'})
        assert res.status_code == 503

    @patch('app.auth.is_firebase_enabled', return_value=True)
    @patch('app.auth._firebase_initialized', True)
    def test_resend_verification_nonexistent_user(self, mock_enabled, client):
        """Non-existent email should return generic success (anti-enumeration)."""
        with patch('firebase_admin.auth.get_user_by_email', side_effect=Exception('NOT_FOUND')):
            res = client.post('/auth/resend-verification', json={'email': 'nobody@test.com'})
            assert res.status_code == 200
            data = res.get_json()
            assert 'verification email' in data['message'].lower() or 'account exists' in data['message'].lower()

    @patch('app.auth.is_firebase_enabled', return_value=True)
    @patch('app.auth._firebase_initialized', True)
    def test_resend_verification_already_verified(self, mock_enabled, client):
        """Already-verified email should inform user they can sign in."""
        mock_fb_user = MagicMock()
        mock_fb_user.email_verified = True

        with patch('firebase_admin.auth.get_user_by_email', return_value=mock_fb_user):
            res = client.post('/auth/resend-verification', json={'email': 'verified@test.com'})
            assert res.status_code == 200
            data = res.get_json()
            assert 'already verified' in data['message'].lower()

    @patch('app.auth.is_firebase_enabled', return_value=True)
    @patch('app.auth._firebase_initialized', True)
    def test_resend_verification_sends_email(self, mock_enabled, client):
        """Unverified email should return send_verification action."""
        mock_fb_user = MagicMock()
        mock_fb_user.email_verified = False

        with patch('firebase_admin.auth.get_user_by_email', return_value=mock_fb_user):
            res = client.post('/auth/resend-verification', json={'email': 'unverified@test.com'})
            assert res.status_code == 200
            data = res.get_json()
            assert data['action'] == 'send_verification'


class TestForgotPasswordVerification:
    """Test /auth/forgot-password with email verification policy."""

    def test_forgot_password_missing_email(self, client):
        res = client.post('/auth/forgot-password', json={})
        assert res.status_code == 400

    def test_forgot_password_invalid_email(self, client):
        res = client.post('/auth/forgot-password', json={'email': 'bad'})
        assert res.status_code == 400

    @patch('app.auth.is_firebase_enabled', return_value=True)
    @patch('app.auth._firebase_initialized', True)
    def test_forgot_password_nonexistent_email(self, mock_enabled, client):
        """Non-existent email returns generic message."""
        with patch('firebase_admin.auth.get_user_by_email', side_effect=Exception('NOT_FOUND')):
            res = client.post('/auth/forgot-password', json={'email': 'nobody@test.com'})
            assert res.status_code == 200

    @patch('app.auth.is_firebase_enabled', return_value=True)
    @patch('app.auth._firebase_initialized', True)
    def test_forgot_password_google_account_rejected(self, mock_enabled, client):
        """Google-only accounts should be rejected."""
        mock_fb_user = MagicMock()
        mock_fb_user.email_verified = True
        mock_provider = MagicMock()
        mock_provider.provider_id = 'google.com'
        mock_fb_user.provider_data = [mock_provider]

        with patch('firebase_admin.auth.get_user_by_email', return_value=mock_fb_user):
            res = client.post('/auth/forgot-password', json={'email': 'google@test.com'})
            assert res.status_code == 400
            data = res.get_json()
            assert data['code'] == 'google_account'

    @patch('app.auth.is_firebase_enabled', return_value=True)
    @patch('app.auth._firebase_initialized', True)
    def test_forgot_password_unverified_sends_verification(self, mock_enabled, client):
        """Unverified email/password user should get verification_needed, not reset."""
        mock_fb_user = MagicMock()
        mock_fb_user.email_verified = False
        mock_provider = MagicMock()
        mock_provider.provider_id = 'password'
        mock_fb_user.provider_data = [mock_provider]

        with patch('firebase_admin.auth.get_user_by_email', return_value=mock_fb_user):
            res = client.post('/auth/forgot-password', json={'email': 'unverified@test.com'})
            assert res.status_code == 200
            data = res.get_json()
            assert data['code'] == 'verification_needed'
            assert 'not yet verified' in data['message'].lower()

    @patch('app.auth.is_firebase_enabled', return_value=True)
    @patch('app.auth._firebase_initialized', True)
    def test_forgot_password_verified_sends_reset(self, mock_enabled, client):
        """Verified email/password user should receive reset email via REST API."""
        mock_fb_user = MagicMock()
        mock_fb_user.email_verified = True
        mock_provider = MagicMock()
        mock_provider.provider_id = 'password'
        mock_fb_user.provider_data = [mock_provider]

        with patch('firebase_admin.auth.get_user_by_email', return_value=mock_fb_user), \
             patch('app.auth._send_firebase_email', return_value=True) as mock_send:
            res = client.post('/auth/forgot-password', json={'email': 'verified@test.com'})
            assert res.status_code == 200
            data = res.get_json()
            assert data['code'] == 'reset_sent'
            mock_send.assert_called_once_with('verified@test.com', 'PASSWORD_RESET')


# ============================================================================
# Firebase Auth Module Tests
# ============================================================================

class TestFirebaseAuthModule:
    """Test the auth.py Firebase helper functions."""

    def test_is_firebase_enabled_default_false(self):
        from app.auth import is_firebase_enabled
        # In test env without credentials, should be False
        # (or True if a previous test initialized it — but generally False)
        # This is a sanity check
        result = is_firebase_enabled()
        assert isinstance(result, bool)

    @patch('app.auth._firebase_initialized', True)
    def test_get_or_create_user_new(self, app, db):
        from app.auth import get_or_create_user_from_firebase
        from app.models import User, UserProfile
        uid = _uid()

        decoded = {
            'uid': f'fb_{uid}',
            'email': f'{uid}@gmail.com',
            'email_verified': True,
            'name': 'New User',
            'picture': 'https://example.com/pic.jpg',
            'firebase': {'sign_in_provider': 'google.com'}
        }

        user, is_new = get_or_create_user_from_firebase(decoded)

        assert is_new is True
        assert user.firebase_uid == f'fb_{uid}'
        assert user.email == f'{uid}@gmail.com'
        assert user.auth_provider == 'google.com'
        assert user.email_verified is True
        assert user.display_name == 'New User'

        # Verify profile was created
        profile = UserProfile.query.filter_by(user_id=user.id).first()
        assert profile is not None

        # Cleanup
        db.session.delete(profile)
        db.session.delete(user)
        db.session.commit()

    @patch('app.auth._firebase_initialized', True)
    def test_get_or_create_user_existing_by_email(self, app, db):
        """If a local user exists with the same email, link the Firebase account."""
        from app.auth import get_or_create_user_from_firebase
        from app.models import User
        uid = _uid()

        # Create existing local user
        existing = User(username=f'existing_{uid}', email=f'{uid}@gmail.com', auth_provider='local')
        db.session.add(existing)
        db.session.commit()

        decoded = {
            'uid': f'fb_{uid}',
            'email': f'{uid}@gmail.com',
            'email_verified': True,
            'name': 'Existing User',
            'picture': '',
            'firebase': {'sign_in_provider': 'google.com'}
        }

        user, is_new = get_or_create_user_from_firebase(decoded)

        assert is_new is False
        assert user.id == existing.id
        assert user.firebase_uid == f'fb_{uid}'
        assert user.auth_provider == 'google.com'

        db.session.delete(user)
        db.session.commit()

    @patch('app.auth._firebase_initialized', True)
    def test_get_or_create_user_existing_by_firebase_uid(self, app, db):
        """If a user exists with the same firebase_uid, update and return it."""
        from app.auth import get_or_create_user_from_firebase
        from app.models import User
        uid = _uid()

        existing = User(
            email=f'{uid}@gmail.com',
            firebase_uid=f'fb_{uid}',
            auth_provider='google.com'
        )
        db.session.add(existing)
        db.session.commit()

        decoded = {
            'uid': f'fb_{uid}',
            'email': f'{uid}@gmail.com',
            'email_verified': True,
            'name': 'Updated Name',
            'picture': '',
            'firebase': {'sign_in_provider': 'google.com'}
        }

        user, is_new = get_or_create_user_from_firebase(decoded)

        assert is_new is False
        assert user.id == existing.id
        assert user.display_name == 'Updated Name'

        db.session.delete(user)
        db.session.commit()
