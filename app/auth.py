"""
Authentication module — all auth logic in one place.

Sections:
1. Firebase Admin SDK initialization & helpers
2. Firebase token verification & user sync
3. JWT token helpers & decorators
4. Flask auth blueprint endpoints (login, logout, profile, password, delete)
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from .models import db, User, UserProfile
from functools import wraps
import re
import logging
import requests as http_requests
from datetime import datetime

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


# ============================================================================
# Section 1: Firebase Admin SDK Initialization
# ============================================================================

_firebase_initialized = False


def init_firebase(app):
    """Initialize Firebase Admin SDK using service account credentials.
    
    Call this once during app startup (in create_app).
    If FIREBASE_CREDENTIALS_PATH is not set, Firebase features are disabled gracefully.
    """
    global _firebase_initialized
    if _firebase_initialized:
        return True

    credentials_path = app.config.get('FIREBASE_CREDENTIALS_PATH')
    if not credentials_path:
        logger.warning('FIREBASE_CREDENTIALS_PATH not set — Firebase auth disabled')
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials as fb_credentials

        cred = fb_credentials.Certificate(credentials_path)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info('Firebase Admin SDK initialized successfully')
        return True
    except Exception as e:
        logger.error(f'Failed to initialize Firebase Admin SDK: {e}')
        return False


def is_firebase_enabled():
    """Return True if Firebase Admin SDK was initialized successfully."""
    return _firebase_initialized


# ============================================================================
# Section 2: Firebase Token Verification & User Sync
# ============================================================================

def verify_firebase_token(id_token: str) -> dict | None:
    """Verify a Firebase ID token and return decoded claims.

    Returns:
        dict with uid, email, email_verified, name, picture, firebase.sign_in_provider, etc.
        None if verification fails.
    """
    if not _firebase_initialized:
        logger.error('Firebase not initialized — cannot verify token')
        return None

    try:
        from firebase_admin import auth as fb_auth
        decoded = fb_auth.verify_id_token(id_token)
        return decoded
    except Exception as e:
        logger.warning(f'Firebase token verification failed: {e}')
        return None


def get_or_create_user_from_firebase(decoded_token: dict):
    """Find or create a local User record from a verified Firebase token.

    Strategy:
    1. Look up by firebase_uid first.
    2. If not found, look up by email — if found, link the existing account.
    3. If still not found, create a new user.

    Returns:
        (user, is_new) — the User instance and whether it was newly created.
    """
    uid = decoded_token.get('uid')
    email = (decoded_token.get('email') or '').lower().strip()
    display_name = decoded_token.get('name') or ''
    picture = decoded_token.get('picture') or ''
    email_verified = decoded_token.get('email_verified', False)

    # Determine provider from Firebase token
    firebase_info = decoded_token.get('firebase', {})
    sign_in_provider = firebase_info.get('sign_in_provider', 'unknown')

    # 1. Look up by firebase_uid
    user = User.query.filter_by(firebase_uid=uid).first()
    if user:
        # Update last login and any changed fields
        user.last_login_at = datetime.utcnow()
        user.email_verified = email_verified
        if display_name and not user.display_name:
            user.display_name = display_name
        # Auto-fill username from display_name if still null
        if display_name and not user.username:
            sanitized = re.sub(r'[^a-zA-Z0-9_ ]', '', display_name).strip()
            if len(sanitized) >= 3:
                user.username = sanitized
        if picture and not user.avatar:
            user.avatar = picture
        if email and user.email != email:
            # Email changed on Firebase side — sync if not taken
            existing = User.query.filter(User.email == email, User.id != user.id).first()
            if not existing:
                user.email = email
        db.session.commit()
        return user, False

    # 2. Look up by email to link existing local account
    if email:
        user = User.query.filter_by(email=email).first()
        if user:
            user.firebase_uid = uid
            user.auth_provider = sign_in_provider
            user.email_verified = email_verified
            user.last_login_at = datetime.utcnow()
            if display_name and not user.display_name:
                user.display_name = display_name
            # Auto-fill username from display_name if still null
            if display_name and not user.username:
                sanitized = re.sub(r'[^a-zA-Z0-9_ ]', '', display_name).strip()
                if len(sanitized) >= 3:
                    user.username = sanitized
            if picture and not user.avatar:
                user.avatar = picture
            db.session.commit()
            return user, False

    # 3. Create a new user
    # Auto-set username from Google display name if available
    auto_username = None
    if display_name:
        # Keep letters, numbers, underscores, and spaces
        sanitized = re.sub(r'[^a-zA-Z0-9_ ]', '', display_name).strip()
        if len(sanitized) >= 3:
            auto_username = sanitized

    user = User(
        email=email,
        firebase_uid=uid,
        auth_provider=sign_in_provider,
        email_verified=email_verified,
        display_name=display_name,
        avatar=picture or None,
        username=auto_username,
        last_login_at=datetime.utcnow(),
    )
    db.session.add(user)
    db.session.flush()  # Get user.id

    # Create default profile
    profile = UserProfile(user_id=user.id)
    db.session.add(profile)
    db.session.commit()

    return user, True


def delete_firebase_user(firebase_uid: str) -> bool:
    """Delete a user from Firebase Authentication.

    Returns True if successful, False otherwise.
    """
    if not _firebase_initialized or not firebase_uid:
        return False

    try:
        from firebase_admin import auth as fb_auth
        fb_auth.delete_user(firebase_uid)
        logger.info(f'Deleted Firebase user: {firebase_uid}')
        return True
    except Exception as e:
        logger.warning(f'Failed to delete Firebase user {firebase_uid}: {e}')
        return False


def _send_firebase_email(email: str, request_type: str) -> bool:
    """Send an email via Firebase Auth REST API (sendOobCode).

    This actually triggers email delivery, unlike generate_*_link().

    Args:
        email: recipient email address
        request_type: 'PASSWORD_RESET' — sends password reset email

    Returns True if the API call succeeded.
    """
    from flask import current_app
    api_key = current_app.config.get('FIREBASE_API_KEY')
    if not api_key:
        logger.error('FIREBASE_API_KEY not configured — cannot send email')
        return False

    url = f'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={api_key}'
    payload = {
        'requestType': request_type,
        'email': email,
    }

    try:
        resp = http_requests.post(url, json=payload, timeout=10)
        if resp.status_code == 200:
            logger.info(f'Firebase email sent: {request_type} to {email}')
            return True
        else:
            logger.warning(f'Firebase sendOobCode failed ({resp.status_code}): {resp.text}')
            return False
    except Exception as e:
        logger.error(f'Firebase REST API email send failed: {e}')
        return False


# ============================================================================
# Section 3: JWT Token Helpers & Decorators
# ============================================================================


def admin_required(fn):
    """
    Decorator that requires the current user to have role='admin'.
    Must be used AFTER @jwt_required().

    Usage:
        @bp.route('/admin/action')
        @jwt_required()
        @admin_required
        def admin_action():
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not user.is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper

def validate_email(email):
    """Validate email format."""
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None

def validate_username(username):
    """Validate username (at least 3 characters, letters, numbers, underscores, and spaces)."""
    if len(username) < 3:
        return False
    # Allow alphanumeric characters, underscores, and spaces
    pattern = r'^[a-zA-Z0-9_ ]+$'
    return re.match(pattern, username) is not None


def _issue_tokens_and_response(user, remember=False):
    """Create JWT tokens for a user and build the JSON response with cookies."""
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    response = jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    })

    cookie_max_age = 30 * 24 * 60 * 60 if remember else 24 * 60 * 60
    secure_cookie = current_app.config.get('SESSION_COOKIE_SECURE', False)

    response.set_cookie(
        'access_token',
        access_token,
        max_age=cookie_max_age,
        httponly=True,
        secure=secure_cookie,
        samesite='Lax'
    )

    response.set_cookie(
        'refresh_token',
        refresh_token,
        max_age=cookie_max_age,
        httponly=True,
        secure=secure_cookie,
        samesite='Lax'
    )

    return response


# ============================================================================
# Firebase Authentication Endpoint
# ============================================================================

@auth_bp.route('/firebase-login', methods=['POST'])
def firebase_login():
    """Authenticate via Firebase ID token, sync user to local DB, and issue local JWT.

    Expects JSON: { "id_token": "<Firebase ID Token>", "remember": false }
    """
    if not is_firebase_enabled():
        return jsonify({'error': 'Firebase authentication is not configured on this server'}), 503

    try:
        data = request.get_json()
        id_token = data.get('id_token', '')
        remember = data.get('remember', False)

        if not id_token:
            return jsonify({'error': 'Firebase ID token is required'}), 400

        # Verify the Firebase ID token
        decoded = verify_firebase_token(id_token)
        if not decoded:
            return jsonify({'error': 'Invalid or expired Firebase token'}), 401

        # --- Email verification gate ---
        # For email/password (non-Google) sign-ins, require verified email
        # But always sync user to local DB first (even if unverified)
        firebase_info = decoded.get('firebase', {})
        sign_in_provider = firebase_info.get('sign_in_provider', 'unknown')
        email_verified = decoded.get('email_verified', False)

        # Find or create local user (always, regardless of verification status)
        user, is_new = get_or_create_user_from_firebase(decoded)

        if sign_in_provider == 'password' and not email_verified:
            return jsonify({
                'error': 'Please verify your email address before signing in. Check your inbox for the verification link.',
                'code': 'email_not_verified',
                'email': decoded.get('email', '')
            }), 403

        if not user.is_active:
            return jsonify({'error': 'Account is disabled'}), 403

        # Issue local JWT tokens
        response = _issue_tokens_and_response(user, remember)
        status = 201 if is_new else 200
        return response, status

    except Exception as e:
        current_app.logger.error(f'Firebase login error: {e}')
        return jsonify({'error': f'Login failed: {str(e)}'}), 500


@auth_bp.route('/firebase-config', methods=['GET'])
def firebase_config():
    """Return the Firebase client-side configuration (public keys only)."""
    return jsonify({
        'apiKey': current_app.config.get('FIREBASE_API_KEY', ''),
        'authDomain': current_app.config.get('FIREBASE_AUTH_DOMAIN', ''),
        'projectId': current_app.config.get('FIREBASE_PROJECT_ID', ''),
    }), 200


# ============================================================================
# Email Verification
# ============================================================================

@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    """Check if a Firebase user exists and needs verification.

    Returns status so the frontend can decide whether to send
    the verification email via Firebase client SDK.

    Expects JSON: { "email": "user@example.com" }
    """
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()

        if not email:
            return jsonify({'error': 'Email is required'}), 400
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        if not is_firebase_enabled():
            return jsonify({'error': 'Email verification service is not available'}), 503

        try:
            from firebase_admin import auth as fb_auth
            try:
                fb_user = fb_auth.get_user_by_email(email)
            except Exception:
                # Anti-enumeration: generic response
                return jsonify({
                    'message': 'If an account exists with that email, please use the resend button to send a verification email.',
                    'action': 'send_verification'
                }), 200

            if fb_user.email_verified:
                return jsonify({
                    'message': 'This email is already verified. You can sign in directly.',
                    'action': 'already_verified'
                }), 200

            # User exists and is unverified — tell frontend to send via client SDK
            return jsonify({
                'message': 'Please click the button to send a verification email.',
                'action': 'send_verification'
            }), 200

        except Exception as e:
            current_app.logger.error(f'Resend verification check error: {e}')
            return jsonify({
                'message': 'If an account exists with that email, please use the resend button to send a verification email.',
                'action': 'send_verification'
            }), 200

    except Exception as e:
        current_app.logger.error(f'Resend verification error: {e}')
        return jsonify({'error': 'An error occurred'}), 500


# ============================================================================
# Legacy Local Authentication Endpoints — REMOVED
# All authentication now goes through Firebase.
# Use /auth/firebase-login with a Firebase ID token.
# ============================================================================

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Issue a new access token using a valid refresh token."""
    try:
        user_id = get_jwt_identity()
        new_access_token = create_access_token(identity=str(user_id))

        response = jsonify({
            'access_token': new_access_token
        })

        secure_cookie = current_app.config.get('SESSION_COOKIE_SECURE', False)
        response.set_cookie(
            'access_token',
            new_access_token,
            max_age=24 * 60 * 60,  # 1 day
            httponly=True,
            secure=secure_cookie,
            samesite='Lax'
        )

        return response, 200
    except Exception as e:
        return jsonify({'error': f'Token refresh failed: {str(e)}'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required(optional=True)
def logout():
    """Handle user logout."""
    response = jsonify({'message': 'Logged out successfully'})
    response.delete_cookie('access_token')
    response.delete_cookie('refresh_token')
    return response, 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current logged-in user information.
    
    Also syncs email from Firebase if it has changed (e.g. after email verification).
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Auto-sync email from Firebase (lightweight check)
    if user.firebase_uid and is_firebase_enabled():
        try:
            from firebase_admin import auth as fb_auth
            fb_user = fb_auth.get_user(user.firebase_uid)
            firebase_email = (fb_user.email or '').lower().strip()
            changed = False
            if firebase_email and firebase_email != user.email:
                existing = User.query.filter(User.email == firebase_email, User.id != user.id).first()
                if not existing:
                    user.email = firebase_email
                    changed = True
            if fb_user.email_verified != user.email_verified:
                user.email_verified = fb_user.email_verified
                changed = True
            if changed:
                db.session.commit()
        except Exception as e:
            current_app.logger.warning(f'Firebase email sync in /me failed: {e}')

    return jsonify({
        'user': user.to_dict()
    }), 200

@auth_bp.route('/update-avatar', methods=['POST'])
@jwt_required()
def update_avatar():
    """Update user avatar."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Ensure GCS env vars are configured from app config (if present)
        import os
        credentials_path = current_app.config.get('GCS_CREDENTIALS_PATH')
        if credentials_path:
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
        bucket_name = current_app.config.get('GCS_BUCKET_NAME')
        if bucket_name:
            os.environ['GCS_BUCKET_NAME'] = bucket_name

        # If 'avatar' not in request.files, treat as a request to clear avatar
        if 'avatar' not in request.files:
            # clear avatar
            from . import gcp_bucket
            existing = user.avatar
            # If avatar is a GCS URL, delete
            if existing and isinstance(existing, str) and existing.startswith('https://storage.googleapis.com/'):
                try:
                    gcp_bucket.delete_file_from_gcs(existing)
                except Exception:
                    current_app.logger.warning('Failed to delete existing avatar from GCS')
            else:
                # If local file, delete from UPLOAD_FOLDER
                try:
                    upload_folder = current_app.config.get('UPLOAD_FOLDER')
                    if existing and upload_folder:
                        import os
                        local_path = os.path.join(upload_folder, os.path.basename(existing))
                        if os.path.exists(local_path):
                            os.remove(local_path)
                except Exception:
                    current_app.logger.warning('Failed to delete existing local avatar')

            user.avatar = None
            user.updated_at = datetime.utcnow()
            db.session.commit()
            return jsonify({'message': 'Avatar cleared successfully', 'avatar_path': None}), 200

        file = request.files['avatar']
        if not file or file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        if not file.filename.lower().split('.')[-1] in allowed_extensions:
            return jsonify({'error': 'Invalid file type. Only PNG, JPG, JPEG, and GIF are allowed'}), 400
        
        # Generate secure filename
        from werkzeug.utils import secure_filename
        import os
        from datetime import datetime
        filename = secure_filename(file.filename)

        # If user already had an avatar stored in GCS, try to delete it first
        from . import gcp_bucket
        existing = user.avatar
        try:
            if existing and isinstance(existing, str) and existing.startswith('https://storage.googleapis.com/'):
                gcp_bucket.delete_file_from_gcs(existing)
            else:
                # if existing was stored locally, remove it
                upload_folder = current_app.config.get('UPLOAD_FOLDER')
                if existing and upload_folder:
                    local_path = os.path.join(upload_folder, os.path.basename(existing))
                    if os.path.exists(local_path):
                        os.remove(local_path)
        except Exception:
            current_app.logger.warning('Failed to delete previous avatar')

        # Upload new file to GCS and store the GCS URL
        # Upload new file to GCS and store the GCS URL
        gcs_url = None
        # Provide a base filename for uniqueness
        name, ext = os.path.splitext(filename)
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
        base_filename = f"{name}_{timestamp}{ext}"
        gcs_url = gcp_bucket.upload_image_to_gcs(file, base_filename, user_id=user_id)
        user.avatar = gcs_url
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Avatar updated successfully',
            'avatar_path': gcs_url,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error updating avatar for user {user_id}: {e}")
        db.session.rollback()
        return jsonify({'error': f'Update failed: {str(e)}'}), 500

@auth_bp.route('/update-profile', methods=['POST'])
@jwt_required()
def update_profile():
    """Update user profile information."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        
        # Validation
        if username:
            if not validate_username(username):
                return jsonify({'error': 'Username must be at least 3 characters and contain only letters, numbers, underscores, and spaces'}), 400
            
            user.username = username
        
        if email:
            if not validate_email(email):
                return jsonify({'error': 'Invalid email format'}), 400
            
            # Firebase users must change email through Firebase verification flow
            if user.firebase_uid:
                return jsonify({
                    'error': 'Email changes must go through email verification. Use the edit email button in settings.',
                    'code': 'use_firebase_email_change'
                }), 400
            
            # Check if email is already taken by another user
            existing_user = User.query.filter_by(email=email).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({'error': 'Email already in use'}), 400
            
            user.email = email
        
        # Update timestamp
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Update failed: {str(e)}'}), 500

@auth_bp.route('/sync-firebase-email', methods=['POST'])
@jwt_required()
def sync_firebase_email():
    """Check if the user's email has changed on Firebase and sync to local DB."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if not user.firebase_uid:
            return jsonify({'message': 'No Firebase account linked'}), 200

        # Fetch current email from Firebase
        try:
            from firebase_admin import auth as fb_auth
            fb_user = fb_auth.get_user(user.firebase_uid)
        except Exception as e:
            current_app.logger.warning(f'Failed to fetch Firebase user: {e}')
            return jsonify({'error': 'Failed to check Firebase account'}), 500

        firebase_email = (fb_user.email or '').lower().strip()
        if firebase_email and firebase_email != user.email:
            # Check that the new email isn't taken by another local user
            existing = User.query.filter(User.email == firebase_email, User.id != user.id).first()
            if existing:
                return jsonify({'error': 'Email already in use by another account'}), 409
            user.email = firebase_email
            user.email_verified = fb_user.email_verified
            user.updated_at = datetime.utcnow()
            db.session.commit()
            return jsonify({
                'message': 'Email updated',
                'email': firebase_email,
                'synced': True
            }), 200

        return jsonify({
            'message': 'Email is already in sync',
            'email': user.email,
            'synced': False
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Sync failed: {str(e)}'}), 500


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Send a Firebase password reset email to the user.
    
    All password management is now handled by Firebase.
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Google-only users cannot change password
        if user.auth_provider == 'google.com':
            return jsonify({
                'error': 'Password management is handled by Google. '
                         'Please use Google account settings to change your password.'
            }), 400
        
        # Send Firebase password reset email
        if user.email:
            try:
                from firebase_admin import auth as fb_auth
                fb_auth.generate_password_reset_link(user.email)
                # If the above doesn't raise, Firebase has the user — send the email
                from firebase_admin import auth as fb_auth_send
                fb_auth_send.generate_password_reset_link(user.email)
            except Exception as e:
                current_app.logger.warning(f'Firebase password reset link generation failed: {e}')
        
        return jsonify({
            'message': 'A password reset email has been sent to your email address.'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Password change failed: {str(e)}'}), 500

@auth_bp.route('/delete-account', methods=['POST'])
@jwt_required()
def delete_account():
    """Delete the current user's account and associated files.
    
    Requires confirming password (verified via Firebase signInWithPassword).
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json() or {}

        # Verify identity: password verification via Firebase REST API
        confirm_password = data.get('confirm_password', '').strip()
        if not confirm_password:
            return jsonify({'error': 'Please enter your password to confirm account deletion'}), 400

        # Verify the password using Firebase REST API (signInWithPassword)
        api_key = current_app.config.get('FIREBASE_API_KEY', '')
        if not api_key:
            return jsonify({'error': 'Firebase not configured'}), 500

        verify_url = f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}'
        verify_resp = http_requests.post(verify_url, json={
            'email': user.email,
            'password': confirm_password,
            'returnSecureToken': False
        }, timeout=10)

        if verify_resp.status_code != 200:
            error_data = verify_resp.json().get('error', {})
            error_msg = error_data.get('message', '')
            if 'INVALID_PASSWORD' in error_msg or 'INVALID_LOGIN_CREDENTIALS' in error_msg:
                return jsonify({'error': 'Incorrect password'}), 400
            elif 'TOO_MANY_ATTEMPTS' in error_msg:
                return jsonify({'error': 'Too many attempts, please try again later'}), 429
            else:
                return jsonify({'error': 'Password verification failed'}), 400

        # Attempt to delete avatar if stored in GCS or locally
        try:
            from . import gcp_bucket
            import os
            existing = user.avatar
            if existing and isinstance(existing, str):
                if existing.startswith('https://storage.googleapis.com/') or existing.startswith('gs://'):
                    try:
                        gcp_bucket.delete_file_from_gcs(existing)
                    except Exception:
                        current_app.logger.warning('Failed to delete avatar from GCS')
                else:
                    upload_folder = current_app.config.get('UPLOAD_FOLDER')
                    if upload_folder:
                        local_path = os.path.join(upload_folder, os.path.basename(existing))
                        try:
                            if os.path.exists(local_path):
                                os.remove(local_path)
                        except Exception:
                            current_app.logger.warning('Failed to delete local avatar')
        except Exception:
            current_app.logger.warning('Error while attempting to remove avatar')

        # Delete file uploads and associated storage
        try:
            from .models import FileUpload, VideoRecord, UserApiKey, UserProfile
            from . import gcp_bucket
            import os

            # Delete user profile first to avoid FK constraints (selected_api_key_id)
            profile = UserProfile.query.filter_by(user_id=user.id).first()
            if profile:
                db.session.delete(profile)
                db.session.flush()

            uploads = FileUpload.query.filter_by(user_id=user.id).all()
            for u in uploads:
                try:
                    if u.file_path and isinstance(u.file_path, str) and (u.file_path.startswith('https://storage.googleapis.com/') or u.file_path.startswith('gs://')):
                        try:
                            gcp_bucket.delete_file_from_gcs(u.file_path)
                        except Exception:
                            current_app.logger.warning(f'Failed to delete file upload from GCS: {u.file_path}')
                except Exception:
                    current_app.logger.warning('Error deleting a file upload')
                try:
                    db.session.delete(u)
                except Exception:
                    current_app.logger.warning('Failed to delete file upload DB entry')

            videos = VideoRecord.query.filter_by(user_id=user.id).all()
            for v in videos:
                try:
                    if v.file_path and isinstance(v.file_path, str) and (v.file_path.startswith('https://storage.googleapis.com/') or v.file_path.startswith('gs://')):
                        try:
                            gcp_bucket.delete_file_from_gcs(v.file_path)
                        except Exception:
                            current_app.logger.warning(f'Failed to delete video from GCS: {v.file_path}')
                except Exception:
                    current_app.logger.warning('Error deleting a video file')
                try:
                    db.session.delete(v)
                except Exception:
                    current_app.logger.warning('Failed to delete video DB entry')

            # Delete API keys
            keys = UserApiKey.query.filter_by(user_id=user.id).all()
            for k in keys:
                try:
                    db.session.delete(k)
                except Exception:
                    current_app.logger.warning('Failed to delete API key entry')
        except Exception:
            current_app.logger.warning('Error while attempting to remove file uploads or videos')

        # Finally delete the user row (cascades should remove related rows)
        firebase_uid = user.firebase_uid  # Save before deletion
        try:
            db.session.delete(user)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f'Failed to delete user: {e}')
            return jsonify({'error': 'Failed to delete account'}), 500

        # Also delete the Firebase identity if applicable
        if firebase_uid:
            try:
                delete_firebase_user(firebase_uid)
            except Exception:
                current_app.logger.warning(f'Failed to delete Firebase identity for uid {firebase_uid}')

        response = jsonify({'message': 'Account deleted successfully'})
        response.delete_cookie('access_token')
        response.delete_cookie('refresh_token')
        return response, 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Deletion failed: {str(e)}'}), 500

# ============================================================================
# Password Reset Functionality
# ============================================================================

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Handle password reset requests with email verification policy.

    Policy:
    - Unverified email/password accounts: send verification email instead of reset.
    - Verified email/password accounts: send password reset email.
    - Google-only accounts: reject (use Google recovery).
    - Unknown emails: return generic message (anti-enumeration).
    """
    try:
        data = request.get_json()
        email = (data.get('email') or '').strip().lower()

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        if not is_firebase_enabled():
            return jsonify({'error': 'Password reset service is not available'}), 503

        try:
            from firebase_admin import auth as fb_auth

            # Look up Firebase user
            try:
                fb_user = fb_auth.get_user_by_email(email)
            except Exception:
                # User doesn't exist — return generic message
                return jsonify({
                    'message': 'If an account exists with that email, we have sent you an email. Please check your inbox.'
                }), 200

            # Determine provider
            providers = [p.provider_id for p in (fb_user.provider_data or [])]
            is_google_only = 'google.com' in providers and 'password' not in providers

            if is_google_only:
                return jsonify({
                    'error': 'This account uses Google sign-in. Please use the Google account recovery process instead.',
                    'code': 'google_account'
                }), 400

            # For email/password users — check verification status
            if not fb_user.email_verified:
                # Unverified — tell frontend to send verification email via client SDK
                return jsonify({
                    'message': 'Your email is not yet verified. Please verify your email first, then try resetting your password.',
                    'code': 'verification_needed'
                }), 200

            # Verified — send password reset email via REST API
            _send_firebase_email(email, 'PASSWORD_RESET')

            return jsonify({
                'message': 'A password reset email has been sent. Please check your inbox (including spam folder).',
                'code': 'reset_sent'
            }), 200

        except Exception as e:
            current_app.logger.error(f'Forgot password error: {e}')
            return jsonify({
                'message': 'If an account exists with that email, we have sent you an email. Please check your inbox.'
            }), 200

    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500
