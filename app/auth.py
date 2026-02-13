from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from .models import db, User, UserProfile
import re
from datetime import datetime

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

def validate_email(email):
    """Validate email format."""
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength (at least 6 characters)."""
    return len(password) >= 6

def validate_username(username):
    """Validate username (at least 3 characters, alphanumeric and underscores only)."""
    if len(username) < 3:
        return False
    # Allow alphanumeric characters and underscores
    pattern = r'^[a-zA-Z0-9_]+$'
    return re.match(pattern, username) is not None

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Handle user registration."""
    try:
        data = request.get_json()
        username = data.get('username', '').strip() 
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validation
        if not username or not email or not password:
            return jsonify({'error': 'All fields are required'}), 400
        
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        if not validate_password(password):
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already taken'}), 400
        
        # Create new user
        new_user = User(username=username, email=email)
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        # Create user profile with default settings
        user_profile = UserProfile(user_id=new_user.id)
        db.session.add(user_profile)
        db.session.commit()
        
        return jsonify({
            'message': 'User registered successfully',
            'user': new_user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Handle user login."""
    try:
        data = request.get_json()
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        remember = data.get('remember', False)
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if not user.is_active:
            return jsonify({'error': 'Account is disabled'}), 403
        

        # Log in the user and create JWT tokens
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

        return response, 200
        
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

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
    """Get current logged-in user information."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
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
        password = data.get('password', '')
        
        # Validation
        if username:
            if not validate_username(username):
                return jsonify({'error': 'Username must be at least 3 characters and contain only letters, numbers, and underscores'}), 400
            
            # Check if username is already taken by another user
            existing_user = User.query.filter_by(username=username).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({'error': 'Username already taken'}), 400
            
            user.username = username
        
        if email:
            if not validate_email(email):
                return jsonify({'error': 'Invalid email format'}), 400
            
            # Check if email is already taken by another user
            existing_user = User.query.filter_by(email=email).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({'error': 'Email already in use'}), 400
            
            user.email = email
        
        if password:
            if not validate_password(password):
                return jsonify({'error': 'Password must be at least 6 characters'}), 400
            
            user.set_password(password)
        
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

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password with old password verification."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        old_password = data.get('old_password', '')
        new_password = data.get('new_password', '')
        
        # Validation
        if not old_password or not new_password:
            return jsonify({'error': 'Old password and new password are required'}), 400
        
        # Verify old password
        if not user.check_password(old_password):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        # Validate new password
        if not validate_password(new_password):
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        
        # Check if new password is different from old password
        if user.check_password(new_password):
            return jsonify({'error': 'New password must be different from current password'}), 400
        
        # Update password
        user.set_password(new_password)
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Password change failed: {str(e)}'}), 500

@auth_bp.route('/delete-account', methods=['POST'])
@jwt_required()
def delete_account():
    """Delete the current user's account and associated files. Requires confirming password."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json() or {}
        password = data.get('password', '')
        if not password or not user.check_password(password):
            return jsonify({'error': 'Password is required and must be correct'}), 400

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
        try:
            db.session.delete(user)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f'Failed to delete user: {e}')
            return jsonify({'error': 'Failed to delete account'}), 500

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
    """Handle password reset - verify email + username, then set new password."""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()
        new_password = data.get('new_password', '')

        # Step 1: Verify identity (email + username)
        if not email:
            return jsonify({'error': 'Email is required'}), 400

        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        if not username:
            return jsonify({'error': 'Username is required'}), 400

        # Find user by email
        user = User.query.filter_by(email=email).first()

        if not user or user.username != username:
            return jsonify({
                'error': 'Email and username do not match any account.'
            }), 400

        # Step 2: If new_password provided, reset it
        if new_password:
            if not validate_password(new_password):
                return jsonify({'error': 'Password must be at least 6 characters'}), 400

            user.set_password(new_password)
            db.session.commit()

            return jsonify({
                'message': 'Password has been reset successfully!'
            }), 200
        else:
            # Identity verified, prompt for new password
            return jsonify({
                'verified': True,
                'message': 'Identity verified. Please enter your new password.'
            }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500
