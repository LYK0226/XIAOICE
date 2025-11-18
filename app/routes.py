from datetime import datetime
from flask import Blueprint, render_template, request, jsonify, current_app, redirect, url_for, Response, send_file
from flask_jwt_extended import jwt_required, decode_token
import os
import json
from . import vertex_ai
from werkzeug.utils import secure_filename
from . import gcp_bucket
import io

bp = Blueprint('main', __name__)

@bp.route("/")
@bp.route("/index")
def index():
    """Render the main chat page."""
    token = request.cookies.get('access_token')

    if not token:
        return redirect(url_for('main.login_page'))

    try:
        decode_token(token)
    except Exception:
        response = redirect(url_for('main.login_page'))
        response.delete_cookie('access_token')
        return response

    return render_template('index.html')

@bp.route('/login')
def login_page():
    """Render the login/signup page."""
    return render_template('login_signup.html')
@bp.route('/forgot_password')
def forgot_password_page():
    """Render the forgot password page."""
    return render_template('forget_password.html')

@bp.route('/chat/stream', methods=['POST'])
@jwt_required()
def chat_stream():
    """Handle streaming chat messages and image uploads."""
    from flask_jwt_extended import get_jwt_identity
    from .models import UserProfile, UserApiKey
    
    user_id = get_jwt_identity()
    # Ensure GCS and Google API related env vars are available for background streaming work
    credentials_path = current_app.config.get('GCS_CREDENTIALS_PATH')
    if credentials_path:
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
    bucket_name = current_app.config.get('GCS_BUCKET_NAME')
    if bucket_name:
        os.environ['GCS_BUCKET_NAME'] = bucket_name
    
    if 'message' not in request.form and 'image' not in request.files and 'image_url' not in request.form:
        return jsonify({'error': 'No message, image, or image_url provided'}), 400

    message = request.form.get('message', '')
    # Allow multiple image files and multiple image URLs
    image_files = request.files.getlist('image') if request.files else []
    image_urls = request.form.getlist('image_url') if request.form else []
    image_mime_types_form = request.form.getlist('image_mime_type') if request.form else []

    image_paths = []
    image_mime_types = []

    try:
        # Handle image urls provided directly
        if image_urls:
            for i, url in enumerate(image_urls):
                if url:
                    image_paths.append(url)
                    mt = image_mime_types_form[i] if i < len(image_mime_types_form) else None
                    image_mime_types.append(mt)
        
        # Handle image files
        if image_files:
            for f in image_files:
                if not f or not f.filename:
                    continue
                filename = secure_filename(f.filename)
                if not filename:
                    continue
                gcs_url = gcp_bucket.upload_image_to_gcs(f, filename, user_id=user_id)
                image_paths.append(gcs_url)
                image_mime_types.append(f.mimetype)
        
        # If previously there was single 'image' param (compat), fallback
        if not image_paths and 'image' in request.files:
            image_file = request.files.get('image')
            if image_file and image_file.filename:
                filename = secure_filename(image_file.filename)
                image_path_single = gcp_bucket.upload_image_to_gcs(image_file, filename, user_id=user_id)
                image_paths.append(image_path_single)
                image_mime_types.append(image_file.mimetype)
            # Legacy compatibility: single `image` handling above already uploaded file

        # Parse optional conversation history sent from client
        history = None
        history_raw = request.form.get('history')
        if history_raw:
            try:
                history = json.loads(history_raw)
            except Exception:
                current_app.logger.warning('Unable to parse history from request; ignoring history.')

        # Get user's selected API key
        api_key = None
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        if user_profile and user_profile.selected_api_key:
            api_key = user_profile.selected_api_key.get_decrypted_key()

        # Get user's selected AI model
        ai_model = 'gemini-2.5-flash'  # default
        if user_profile and user_profile.ai_model:
            ai_model = user_profile.ai_model

        def generate():
            try:
                for chunk in vertex_ai.generate_streaming_response(
                    message,
                    image_paths=image_paths if image_paths else None,
                    image_mime_types=image_mime_types if image_mime_types else None,
                    history=history,
                    api_key=api_key,
                    model_name=ai_model
                ):
                    # Clean up common AI prefixes that might appear in responses
                    chunk = chunk.strip()
                    # Remove common prefixes that AI models might add
                    prefixes_to_remove = ['Assistant:', 'AI:', 'Bot:', 'System:', 'Human:']
                    for prefix in prefixes_to_remove:
                        if chunk.startswith(prefix):
                            chunk = chunk[len(prefix):].strip()
                            break
                    
                    yield f"data: {chunk}\n\n"
            except Exception as e:
                print(f"Error in streaming endpoint: {e}")
                yield f"data: Error: {str(e)}\n\n"

        return Response(generate(), mimetype='text/event-stream')

    except Exception as e:
        current_app.logger.error(f"Error in chat stream endpoint: {e}")
        return jsonify({'error': 'An error occurred while processing your request.'}), 500# ===== API Key Management Routes =====

@bp.route('/api/keys', methods=['GET'])
@jwt_required()
def get_api_keys():
    """Get all API keys for the current user."""
    from flask_jwt_extended import get_jwt_identity
    from .models import UserApiKey, UserProfile
    
    user_id = get_jwt_identity()
    
    try:
        api_keys = UserApiKey.query.filter_by(user_id=user_id).all()
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        
        result = {
            'api_keys': [key.to_dict() for key in api_keys],
            'selected_api_key_id': user_profile.selected_api_key_id if user_profile else None
        }
        
        return jsonify(result)
    except Exception as e:
        current_app.logger.error(f"Error getting API keys: {e}")
        return jsonify({'error': 'Failed to retrieve API keys'}), 500

@bp.route('/api/keys', methods=['POST'])
@jwt_required()
def create_api_key():
    """Create a new API key for the current user."""
    from flask_jwt_extended import get_jwt_identity
    from .models import UserApiKey, UserProfile, db
    
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or 'name' not in data or 'api_key' not in data:
        return jsonify({'error': 'Name and API key are required'}), 400
    
    name = data['name'].strip()
    api_key = data['api_key'].strip()
    
    if not name or not api_key:
        return jsonify({'error': 'Name and API key cannot be empty'}), 400
    
    try:
        new_key = UserApiKey(user_id=user_id, name=name)
        new_key.set_encrypted_key(api_key)
        
        db.session.add(new_key)
        db.session.commit()
        
        # Auto-select the newly created API key
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not user_profile:
            user_profile = UserProfile(user_id=user_id)
            db.session.add(user_profile)
        user_profile.selected_api_key_id = new_key.id
        db.session.commit()
        
        return jsonify({'message': 'API key created and selected successfully', 'api_key': new_key.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating API key: {e}")
        return jsonify({'error': 'Failed to create API key'}), 500

@bp.route('/api/keys/<int:key_id>', methods=['DELETE'])
@jwt_required()
def delete_api_key(key_id):
    """Delete an API key."""
    from flask_jwt_extended import get_jwt_identity
    from .models import UserApiKey, UserProfile, db
    
    user_id = get_jwt_identity()
    
    try:
        api_key = UserApiKey.query.filter_by(id=key_id, user_id=user_id).first()
        if not api_key:
            return jsonify({'error': 'API key not found'}), 404
        
        # Check if this key is selected by the user
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        if user_profile and user_profile.selected_api_key_id == key_id:
            user_profile.selected_api_key_id = None
            db.session.add(user_profile)
        
        db.session.delete(api_key)
        db.session.commit()
        
        return jsonify({'message': 'API key deleted successfully'})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting API key: {e}")
        return jsonify({'error': 'Failed to delete API key'}), 500

@bp.route('/api/keys/<int:key_id>/toggle', methods=['POST'])
@jwt_required()
def toggle_api_key(key_id):
    """Toggle the selection of an API key."""
    from flask_jwt_extended import get_jwt_identity
    from .models import UserApiKey, UserProfile, db
    
    user_id = get_jwt_identity()
    
    try:
        api_key = UserApiKey.query.filter_by(id=key_id, user_id=user_id).first()
        if not api_key:
            return jsonify({'error': 'API key not found'}), 404
        
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not user_profile:
            user_profile = UserProfile(user_id=user_id)
            db.session.add(user_profile)
        
        if user_profile.selected_api_key_id == key_id:
            # Deselect
            user_profile.selected_api_key_id = None
            message = 'API key deselected'
        else:
            # Select
            user_profile.selected_api_key_id = key_id
            message = 'API key selected'
        
        db.session.commit()
        
        return jsonify({'message': message, 'selected_api_key_id': user_profile.selected_api_key_id})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error toggling API key: {e}")
        return jsonify({'error': 'Failed to toggle API key'}), 500

@bp.route('/api/user/model', methods=['GET'])
@jwt_required()
def get_user_model():
    """Get the current user's selected AI model."""
    from flask_jwt_extended import get_jwt_identity
    from .models import UserProfile
    
    user_id = get_jwt_identity()
    
    try:
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not user_profile:
            # Return default model if no profile exists
            return jsonify({'ai_model': 'gemini-2.5-flash'})
        
        return jsonify({'ai_model': user_profile.ai_model or 'gemini-2.5-flash'})
    except Exception as e:
        current_app.logger.error(f"Error getting user model: {e}")
        return jsonify({'error': 'Failed to get user model'}), 500

@bp.route('/api/user/model', methods=['POST'])
@jwt_required()
def set_user_model():
    """Set the current user's selected AI model."""
    from flask_jwt_extended import get_jwt_identity
    from .models import UserProfile, db
    
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or 'ai_model' not in data:
        return jsonify({'error': 'ai_model is required'}), 400
    
    ai_model = data['ai_model']
    allowed_models = ['gemini-2.5-flash', 'gemini-2.5-pro']
    
    if ai_model not in allowed_models:
        return jsonify({'error': f'Invalid model. Allowed: {", ".join(allowed_models)}'}), 400
    
    try:
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not user_profile:
            user_profile = UserProfile(user_id=user_id)
            db.session.add(user_profile)
        
        user_profile.ai_model = ai_model
        db.session.commit()
        
        return jsonify({'message': 'AI model updated successfully', 'ai_model': ai_model})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error setting user model: {e}")
        return jsonify({'error': 'Failed to update AI model'}), 500

@bp.route('/api/user/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    """Get the current user's profile settings."""
    from flask_jwt_extended import get_jwt_identity
    from .models import UserProfile
    
    user_id = get_jwt_identity()
    
    try:
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not user_profile:
            # Return default profile if no profile exists
            return jsonify({
                'language': 'zh-TW',
                'theme': 'light',
                'bot_avatar': None,
                'selected_api_key_id': None,
                'ai_model': 'gemini-2.5-flash'
            })
        
        return jsonify(user_profile.to_dict())
    except Exception as e:
        current_app.logger.error(f"Error getting user profile: {e}")
        return jsonify({'error': 'Failed to get user profile'}), 500

@bp.route('/api/user/profile', methods=['POST'])
@jwt_required()
def update_user_profile():
    """Update the current user's profile settings."""
    from flask_jwt_extended import get_jwt_identity
    from .models import UserProfile, db
    
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    allowed_fields = {
        'language', 'theme', 'bot_avatar'
    }
    
    # Validate allowed languages
    allowed_languages = ['zh-TW', 'en', 'ja']
    if 'language' in data and data['language'] not in allowed_languages:
        return jsonify({'error': f'Invalid language. Allowed: {", ".join(allowed_languages)}'}), 400
    
    # Validate theme
    allowed_themes = ['light', 'dark', 'auto']
    if 'theme' in data and data['theme'] not in allowed_themes:
        return jsonify({'error': f'Invalid theme. Allowed: {", ".join(allowed_themes)}'}), 400
    
    try:
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not user_profile:
            user_profile = UserProfile(user_id=user_id)
            db.session.add(user_profile)
        
        # Update only allowed fields
        for field in allowed_fields:
            if field in data:
                setattr(user_profile, field, data[field])
        
        db.session.commit()
        
        return jsonify({'message': 'Profile updated successfully', 'profile': user_profile.to_dict()})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating user profile: {e}")
        return jsonify({'error': 'Failed to update profile'}), 500


# ===== Conversation & Message Routes =====

@bp.route('/conversations', methods=['GET'])
@jwt_required()
def list_conversations():
    """List conversations for the current user."""
    from flask_jwt_extended import get_jwt_identity
    from .models import Conversation

    user_id = get_jwt_identity()

    try:
        conversations = (
            Conversation.query
            .filter_by(user_id=user_id)
            .order_by(Conversation.is_pinned.desc(), Conversation.updated_at.desc())
            .all()
        )
        return jsonify({'conversations': [conversation.to_dict() for conversation in conversations]})
    except Exception as e:
        current_app.logger.error(f"Error listing conversations: {e}")
        return jsonify({'error': 'Failed to list conversations'}), 500


@bp.route('/conversations', methods=['POST'])
@jwt_required()
def create_conversation():
    """Create a new conversation and return its identifier."""
    from flask_jwt_extended import get_jwt_identity
    from .models import Conversation, db

    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    title = (data.get('title') or '').strip()
    if not title:
        title = 'New Conversation'

    try:
        conversation = Conversation(user_id=user_id, title=title)
        db.session.add(conversation)
        db.session.commit()
        return jsonify({'conversation_id': conversation.id, 'conversation': conversation.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating conversation: {e}")
        return jsonify({'error': 'Failed to create conversation'}), 500


@bp.route('/conversations/<int:conversation_id>', methods=['PATCH'])
@jwt_required()
def update_conversation(conversation_id):
    """Update conversation metadata (title, pin)."""
    from flask_jwt_extended import get_jwt_identity
    from .models import Conversation, db

    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    allowed_fields = {'title', 'is_pinned'}
    if not any(field in data for field in allowed_fields):
        return jsonify({'error': 'No updatable fields provided'}), 400

    try:
        conversation = Conversation.query.filter_by(id=conversation_id, user_id=user_id).first()
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404

        updated = False

        if 'title' in data:
            new_title = (data.get('title') or '').strip()
            if not new_title:
                return jsonify({'error': 'title cannot be empty'}), 400
            conversation.title = new_title
            updated = True

        if 'is_pinned' in data:
            is_pinned_value = data.get('is_pinned')
            if not isinstance(is_pinned_value, bool):
                return jsonify({'error': 'is_pinned must be a boolean'}), 400
            conversation.is_pinned = is_pinned_value
            updated = True

        if updated:
            conversation.updated_at = datetime.utcnow()
            db.session.commit()

        return jsonify({'conversation': conversation.to_dict()})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating conversation: {e}")
        return jsonify({'error': 'Failed to update conversation'}), 500


@bp.route('/conversations/<int:conversation_id>', methods=['DELETE'])
@jwt_required()
def delete_conversation(conversation_id):
    """Delete a conversation and its messages."""
    from flask_jwt_extended import get_jwt_identity
    from .models import Conversation, FileUpload, db

    user_id = get_jwt_identity()

    try:
        conversation = Conversation.query.filter_by(id=conversation_id, user_id=user_id).first()
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404

        # Delete associated files from GCS before deleting the conversation
        file_uploads = FileUpload.query.filter_by(conversation_id=conversation_id).all()
        for file_upload in file_uploads:
            gcp_bucket.delete_file_from_gcs(file_upload.file_path)

        db.session.delete(conversation)
        db.session.commit()
        return jsonify({'message': 'Conversation deleted'})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting conversation: {e}")
        return jsonify({'error': 'Failed to delete conversation'}), 500


@bp.route('/messages', methods=['POST'])
@jwt_required()
def create_message():
    """Create a new message inside an existing conversation."""
    from flask_jwt_extended import get_jwt_identity
    from .models import Conversation, Message, db

    user_id = get_jwt_identity()
    
    # Handle file uploads if present
    uploaded_files = []
    if request.files:
        files = request.files.getlist('files')
        # Get conversation_id from request data for file association
        temp_data = request.form.to_dict() if not request.is_json else (request.get_json(silent=True) or {})
        conv_id = temp_data.get('conversation_id')
        try:
            uploaded_files = gcp_bucket.upload_files_to_gcs(files, user_id=user_id, conversation_id=conv_id)
        except ValueError as ve:
            return jsonify({'error': str(ve)}), 400
    
    # Get data from JSON or form
    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict()
    
    conversation_id = data.get('conversation_id')
    sender = (data.get('sender') or '').strip().lower()
    content = (data.get('content') or '').strip()
    metadata = data.get('metadata')

    if not conversation_id:
        return jsonify({'error': 'conversation_id is required'}), 400
    if sender not in {'user', 'assistant'}:
        return jsonify({'error': "sender must be 'user' or 'assistant'"}), 400
    if not content and not uploaded_files:
        return jsonify({'error': 'content or files are required'}), 400

    try:
        conversation = Conversation.query.filter_by(id=conversation_id, user_id=user_id).first()
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404

        message = Message(conversation_id=conversation.id, sender=sender, content=content, meta=metadata, uploaded_files=uploaded_files or None)
        conversation.updated_at = datetime.utcnow()

        if sender == 'user' and (not conversation.title or conversation.title == 'New Conversation'):
            snippet = content[:60]
            conversation.title = snippet if len(content) <= 60 else f"{snippet}..."

        db.session.add(message)
        db.session.commit()

        # Update FileUpload records with message_id if files were uploaded
        if uploaded_files:
            from .models import FileUpload
            for gcs_url in uploaded_files:
                file_upload = FileUpload.query.filter_by(
                    user_id=user_id,
                    file_path=gcs_url,
                    conversation_id=conversation.id
                ).first()
                if file_upload and not file_upload.message_id:
                    file_upload.message_id = message.id
            db.session.commit()

        return jsonify({'message': message.to_dict(), 'conversation': conversation.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating message: {e}")
        return jsonify({'error': 'Failed to create message'}), 500


@bp.route('/conversations/<int:conversation_id>/messages', methods=['GET'])
@jwt_required()
def get_conversation_messages(conversation_id):
    """Retrieve ordered messages for a conversation."""
    from flask_jwt_extended import get_jwt_identity
    from .models import Conversation, Message

    user_id = get_jwt_identity()

    try:
        conversation = Conversation.query.filter_by(id=conversation_id, user_id=user_id).first()
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404

        messages = conversation.messages.order_by(Message.created_at.asc()).all()
        return jsonify({'conversation': conversation.to_dict(), 'messages': [message.to_dict() for message in messages]})
    except Exception as e:
        current_app.logger.error(f"Error fetching messages: {e}")
        return jsonify({'error': 'Failed to fetch messages'}), 500

@bp.route('/serve_file', methods=['GET'])
@jwt_required()
def serve_file():
    """Serve a file from Google Cloud Storage."""
    gcs_url = request.args.get('url')
    if not gcs_url:
        return jsonify({'error': 'url parameter is required'}), 400

    try:
        # Download file from GCS and get content type
        file_data, content_type = gcp_bucket.get_file_data_and_content_type(gcs_url)
        
        # Create a file-like object
        file_obj = io.BytesIO(file_data)
        file_obj.seek(0)
        
        return send_file(file_obj, mimetype=content_type, as_attachment=False)
    except Exception as e:
        current_app.logger.error(f"Error serving file from GCS: {e}")
        # Check if it's a 404 error (file not found)
        if '404' in str(e) or 'No such object' in str(e):
            return jsonify({'error': 'File not found in storage'}), 404
        return jsonify({'error': 'Failed to serve file'}), 500

@bp.route('/api/files', methods=['GET'])
@jwt_required()
def get_user_files():
    """Get all files uploaded by the current user."""
    from flask_jwt_extended import get_jwt_identity
    from .models import FileUpload

    user_id = get_jwt_identity()
    
    try:
        # Get query parameters for filtering
        conversation_id = request.args.get('conversation_id', type=int)
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        query = FileUpload.query.filter_by(user_id=user_id)
        
        if conversation_id:
            query = query.filter_by(conversation_id=conversation_id)
        
        files = query.order_by(FileUpload.uploaded_at.desc()).limit(limit).offset(offset).all()
        
        return jsonify({
            'files': [file.to_dict() for file in files],
            'total': query.count()
        })
    except Exception as e:
        current_app.logger.error(f"Error getting user files: {e}")
        return jsonify({'error': 'Failed to retrieve files'}), 500