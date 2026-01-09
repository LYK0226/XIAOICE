from datetime import datetime
from flask import Blueprint, render_template, request, jsonify, current_app, redirect, url_for, Response, send_from_directory
from flask_jwt_extended import jwt_required, decode_token
import os
import json
import re
from . import vertex_ai
from werkzeug.utils import secure_filename
from typing import Any, Dict, List, Optional

bp = Blueprint('main', __name__)

# Evaluation logic moved to dedicated module to keep routes lightweight
from .pose_assessment import evaluate_pose_assessment

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

@bp.route('/child_assessment')
def child_assessment_page():
    """Render the child assessment page."""
    token = request.cookies.get('access_token')
    
    if not token:
        return redirect(url_for('main.login_page'))
    
    try:
        decode_token(token)
    except Exception:
        response = redirect(url_for('main.login_page'))
        response.delete_cookie('access_token')
        return response
    
    return render_template('child_assessment.html')


@bp.route('/pose_detection')
def pose_detection_page():
    """Render the pose detection page."""
    token = request.cookies.get('access_token')

    if not token:
        return redirect(url_for('main.login_page'))

    try:
        decode_token(token)
    except Exception:
        response = redirect(url_for('main.login_page'))
        response.delete_cookie('access_token')
        return response

    return render_template('pose_detection.html')


@bp.route('/video')
def video_management_page():
    """Render the dedicated video upload + analysis page."""
    token = request.cookies.get('access_token')

    if not token:
        return redirect(url_for('main.login_page'))

    try:
        decode_token(token)
    except Exception:
        response = redirect(url_for('main.login_page'))
        response.delete_cookie('access_token')
        return response

    return render_template('video_management_page.html')


@bp.route('/pose_detection/js/<path:filename>')
def serve_pose_detection_js(filename):
    """Serve JavaScript files from the pose_detection module."""
    pose_detection_dir = os.path.join(os.path.dirname(__file__), 'pose_detection')
    return send_from_directory(pose_detection_dir, filename)


# ==================== Pose/Action Assessment Endpoints ====================


@bp.route('/api/pose-assessment/runs', methods=['POST'])
@jwt_required()
def create_pose_assessment_run():
    """Receive pose assessment test data from frontend, score it, and store it."""
    from flask_jwt_extended import get_jwt_identity
    from .models import PoseAssessmentRun, db

    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    steps = data.get('steps')
    if not isinstance(steps, list) or len(steps) == 0:
        return jsonify({'error': 'steps is required and must be a non-empty array'}), 400

    evaluation = evaluate_pose_assessment(data)

    try:
        run = PoseAssessmentRun(user_id=user_id, payload=data, evaluation=evaluation)
        db.session.add(run)
        db.session.commit()
        return jsonify({'run': run.to_dict(include_payload=False)}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating pose assessment run: {e}")
        return jsonify({'error': 'Failed to store pose assessment run'}), 500


@bp.route('/api/pose-assessment/runs/latest', methods=['GET'])
@jwt_required()
def get_latest_pose_assessment_run():
    """Fetch latest pose assessment run for current user."""
    from flask_jwt_extended import get_jwt_identity
    from .models import PoseAssessmentRun

    user_id = int(get_jwt_identity())
    run = (
        PoseAssessmentRun.query
        .filter_by(user_id=user_id)
        .order_by(PoseAssessmentRun.created_at.desc())
        .first()
    )

    if not run:
        return jsonify({'run': None}), 200
    return jsonify({'run': run.to_dict(include_payload=True)}), 200


@bp.route('/api/pose-assessment/runs/latest', methods=['DELETE'])
@jwt_required()
def delete_latest_pose_assessment_run():
    """Delete the latest pose assessment run for the current user."""
    from flask_jwt_extended import get_jwt_identity
    from .models import PoseAssessmentRun, db

    user_id = int(get_jwt_identity())
    try:
        run = (
            PoseAssessmentRun.query
            .filter_by(user_id=user_id)
            .order_by(PoseAssessmentRun.created_at.desc())
            .first()
        )
        if not run:
            return jsonify({'deleted': False, 'message': 'No run found'}), 200

        db.session.delete(run)
        db.session.commit()
        return jsonify({'deleted': True}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting latest pose assessment run: {e}")
        return jsonify({'deleted': False, 'error': 'Failed to delete latest run'}), 500


@bp.route('/api/pose-assessment/runs', methods=['GET'])
@jwt_required()
def list_pose_assessment_runs():
    """List recent pose assessment runs for current user."""
    from flask_jwt_extended import get_jwt_identity
    from .models import PoseAssessmentRun

    user_id = int(get_jwt_identity())
    limit_raw = request.args.get('limit', '10')
    try:
        limit = max(1, min(50, int(limit_raw)))
    except Exception:
        limit = 10

    runs = (
        PoseAssessmentRun.query
        .filter_by(user_id=user_id)
        .order_by(PoseAssessmentRun.created_at.desc())
        .limit(limit)
        .all()
    )

    return jsonify({'runs': [r.to_dict(include_payload=False) for r in runs]}), 200


@bp.route('/api/pose-assessment/runs/<run_id>', methods=['GET'])
@jwt_required()
def get_pose_assessment_run(run_id):
    """Fetch a specific pose assessment run for current user by run_id."""
    from flask_jwt_extended import get_jwt_identity
    from .models import PoseAssessmentRun

    user_id = int(get_jwt_identity())
    run = PoseAssessmentRun.query.filter_by(user_id=user_id, run_id=run_id).first()
    if not run:
        return jsonify({'error': 'Run not found'}), 404
    return jsonify({'run': run.to_dict(include_payload=True)}), 200

@bp.route('/admin')
def admin_dashboard():
    """Render the admin dashboard page."""
    token = request.cookies.get('access_token')
    
    if not token:
        return redirect(url_for('main.login_page'))
    
    try:
        decode_token(token)
    except Exception:
        response = redirect(url_for('main.login_page'))
        response.delete_cookie('access_token')
        return response
    
    return render_template('admin_dashboard.html')

@bp.route('/chat/stream', methods=['POST'])
@jwt_required()
def chat_stream():
    """Handle streaming chat messages and image uploads."""
    from flask_jwt_extended import get_jwt_identity
    from .models import UserProfile, UserApiKey
    
    user_id = get_jwt_identity()
    
    if 'message' not in request.form and 'image' not in request.files:
        return jsonify({'error': 'No message or image provided'}), 400

    message = request.form.get('message', '')
    image_file = request.files.get('image')
    
    image_path = None
    image_mime_type = None

    try:
        if image_file:
            if not image_file.filename:
                 return jsonify({'error': 'No selected file'}), 400

            filename = secure_filename(image_file.filename)
            if not filename:
                return jsonify({'error': 'Invalid file name'}), 400

            # Save the uploaded image to the configured static folder
            upload_folder = current_app.config['UPLOAD_FOLDER']
            os.makedirs(upload_folder, exist_ok=True)

            name, ext = os.path.splitext(filename)
            timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
            unique_filename = f"{name}_{timestamp}{ext}" if name else f"upload_{timestamp}{ext}"

            image_path = os.path.join(upload_folder, unique_filename)
            image_file.save(image_path)
            image_mime_type = image_file.mimetype

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

        # Get logger outside of generator to avoid context issues
        logger = current_app.logger
        
        # Check if PDF file was uploaded
        pdf_path = None
        if image_path and image_path.lower().endswith('.pdf'):
            # If the "image" is actually a PDF, treat it as PDF
            pdf_path = image_path
            image_path = None
            image_mime_type = None

        def generate():
            try:
                for chunk in vertex_ai.generate_streaming_response(
                    message,
                    image_path=image_path,
                    image_mime_type=image_mime_type,
                    pdf_path=pdf_path,
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
                # Use logger captured from outer scope
                logger.error(f"Error in streaming endpoint: {e}")
                yield f"data: Error: {str(e)}\n\n"

        return Response(generate(), mimetype='text/event-stream')

    except Exception as e:
        current_app.logger.error(f"Error in chat stream endpoint: {e}")
        return jsonify({'error': 'An error occurred while processing your request.'}), 500

# ===== API Key Management Routes =====

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
    allowed_models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-exp']
    
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
    from .models import Conversation, db

    user_id = get_jwt_identity()

    try:
        conversation = Conversation.query.filter_by(id=conversation_id, user_id=user_id).first()
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404

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
        upload_folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)
        
        for file in files:
            if file.filename:
                filename = secure_filename(file.filename)
                if not filename:
                    continue
                name, ext = os.path.splitext(filename)
                timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
                unique_filename = f"{name}_{timestamp}{ext}" if name else f"upload_{timestamp}{ext}"
                file_path = os.path.join(upload_folder, unique_filename)
                file.save(file_path)
                relative_path = f"upload/{unique_filename}"
                uploaded_files.append(relative_path)
    
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


# ===== Quiz/Questionnaire Routes =====

@bp.route('/api/quiz/generate', methods=['POST'])
@jwt_required()
def generate_quiz():
    """根据 PDF 生成测验题目"""
    from flask_jwt_extended import get_jwt_identity
    from app.adk import PDFQuestionnaire
    import os
    
    user_id = get_jwt_identity()
    
    try:
        data = request.get_json()
        pdf_path = data.get('pdf_path')
        num_questions = data.get('num_questions', 5)
        question_type = data.get('question_type', 'choice')
        
        # 如果没有提供 PDF 路径，使用最新上传的
        if not pdf_path:
            upload_dir = current_app.config['UPLOAD_FOLDER']
            pdf_files = [f for f in os.listdir(upload_dir) if f.lower().endswith('.pdf')]
            if not pdf_files:
                return jsonify({'error': '没有找到 PDF 文件，请先上传 PDF'}), 400
            
            # 按时间排序，取最新的
            pdf_files_sorted = sorted(
                pdf_files,
                key=lambda x: os.path.getmtime(os.path.join(upload_dir, x)),
                reverse=True
            )
            pdf_path = os.path.join(upload_dir, pdf_files_sorted[0])
        
        # 生成问卷
        qnr = PDFQuestionnaire(
            pdf_path=pdf_path,
            user_id=str(user_id),
            max_questions=num_questions,
            question_type=question_type
        )
        
        # 返回问题
        return jsonify({
            'success': True,
            'test_id': qnr.test_id,
            'questions': qnr.questions,
            'total_questions': len(qnr.questions),
            'question_type': question_type
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error generating quiz: {e}")
        return jsonify({'error': f'生成测验失败: {str(e)}'}), 500


@bp.route('/api/quiz/submit', methods=['POST'])
@jwt_required()
def submit_quiz():
    """提交测验答案"""
    from flask_jwt_extended import get_jwt_identity
    from app.adk import PDFQuestionnaire
    from datetime import datetime
    
    user_id = get_jwt_identity()
    
    try:
        data = request.get_json()
        test_id = data.get('test_id')
        answers = data.get('answers', [])  # [{question_index, answer, ...}]
        
        # 计算分数（如果是选择题）
        correct_count = 0
        total = len(answers)
        
        for ans in answers:
            if ans.get('is_correct'):
                correct_count += 1
        
        score = (correct_count / total * 100) if total > 0 else 0
        
        # 保存结果（可以存到数据库）
        result = {
            'test_id': test_id,
            'user_id': user_id,
            'answers': answers,
            'score': f"{score:.1f}%",
            'correct_count': correct_count,
            'total_questions': total,
            'submitted_at': datetime.now().isoformat()
        }
        
        # TODO: 保存到数据库
        
        return jsonify({
            'success': True,
            'result': result
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error submitting quiz: {e}")
        return jsonify({'error': f'提交失败: {str(e)}'}), 500


# ==================== Child Development Assessment Endpoints ====================

@bp.route('/api/child-assessment/generate', methods=['POST'])
@jwt_required()
def generate_child_assessment():
    """
    Generate child development assessment questions from PDF
    Based on WS/T 580—2017 Standard (0-6 years old children)
    """
    from flask_jwt_extended import get_jwt_identity
    from app.child_assessment import ChildDevelopmentAssessmentWST580
    from app.models import ChildDevelopmentAssessmentRecord, db
    import uuid
    
    user_id = get_jwt_identity()
    
    try:
        data = request.get_json()
        child_name = data.get('child_name', 'Unknown')
        child_age_months = data.get('child_age_months', 24.0)
        pdf_path = data.get('pdf_path')  # Path to uploaded PDF
        
        # Validate age (0-84 months = 0-6 years)
        if not (0 <= float(child_age_months) <= 84):
            return jsonify({'error': '孩子年齡應在 0-84 個月之間 (0-6 歲)'}), 400
        
        # Create assessment object
        assessment = ChildDevelopmentAssessmentWST580(
            child_name=child_name,
            child_age_months=float(child_age_months),
            pdf_path=pdf_path
        )
        
        # Generate questions based on child's age
        questions = assessment.generate_assessment_questions()
        
        if not questions:
            return jsonify({'error': '無法為該年齡生成評估項目'}), 400
        
        # Create assessment record in database
        assessment_id = str(uuid.uuid4())
        
        record = ChildDevelopmentAssessmentRecord(
            assessment_id=assessment_id,
            user_id=user_id,
            child_name=child_name,
            child_age_months=float(child_age_months),
            questions=questions,  # Save questions list
            pdf_filename=pdf_path.split('/')[-1] if pdf_path else None,
            is_completed=False
        )
        
        db.session.add(record)
        db.session.commit()
        
        current_app.logger.info(f"Generated assessment {assessment_id} for user {user_id}")
        
        return jsonify({
            'success': True,
            'assessment_id': assessment_id,
            'child_name': child_name,
            'child_age_months': child_age_months,
            'total_questions': len(questions),
            'questions': questions[:5]  # Return first 5 questions for display
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error generating assessment: {e}", exc_info=True)
        return jsonify({'error': f'生成評估失敗: {str(e)}'}), 500


@bp.route('/api/child-assessment/<assessment_id>/submit', methods=['POST'])
@jwt_required()
def submit_child_assessment(assessment_id):
    """
    Submit child development assessment answers and calculate results
    """
    from flask_jwt_extended import get_jwt_identity
    from app.child_assessment import ChildDevelopmentAssessmentWST580
    from app.models import ChildDevelopmentAssessmentRecord, db
    from datetime import datetime
    
    user_id = get_jwt_identity()
    
    try:
        # Get assessment record
        record = ChildDevelopmentAssessmentRecord.query.filter_by(
            assessment_id=assessment_id,
            user_id=user_id
        ).first()
        
        if not record:
            return jsonify({'error': '評估記錄不存在'}), 404
        
        data = request.get_json()
        answers = data.get('answers', {})  # {item_id: passed_bool}
        
        # Recreate assessment object to calculate results
        assessment = ChildDevelopmentAssessmentWST580(
            child_name=record.child_name,
            child_age_months=record.child_age_months,
            pdf_path=None
        )
        
        # Record all answers
        for item_id, passed in answers.items():
            assessment.record_answer(item_id, bool(passed))
        
        # Calculate results (DQ, level, recommendations)
        results = assessment.calculate_assessment_results()
        recommendations = assessment.generate_recommendations()
        
        # Update record with results
        record.answers = answers
        record.overall_dq = results.get('dq')
        record.dq_level = results.get('dq_level')
        record.total_mental_age = results.get('total_mental_age')
        record.area_results = results.get('area_results')
        record.recommendations = recommendations
        record.is_completed = True
        record.completed_at = datetime.utcnow()
        
        db.session.commit()
        
        current_app.logger.info(f"Completed assessment {assessment_id} with DQ: {results.get('dq')}")
        
        return jsonify({
            'success': True,
            'assessment_id': assessment_id,
            'results': {
                'dq': results.get('dq'),
                'dq_level': results.get('dq_level'),
                'dq_description': results.get('dq_description'),
                'total_mental_age': results.get('total_mental_age'),
                'area_results': results.get('area_results'),
                'recommendations': recommendations
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error submitting assessment: {e}", exc_info=True)
        return jsonify({'error': f'提交評估失敗: {str(e)}'}), 500


@bp.route('/api/child-assessment/history', methods=['GET'])
@jwt_required()
def get_assessment_history():
    """
    Get all previous assessment records for the user
    """
    from flask_jwt_extended import get_jwt_identity
    from app.models import ChildDevelopmentAssessmentRecord
    
    user_id = get_jwt_identity()
    
    try:
        records = ChildDevelopmentAssessmentRecord.query.filter_by(
            user_id=user_id
        ).order_by(ChildDevelopmentAssessmentRecord.created_at.desc()).all()
        
        history = [record.to_dict() for record in records]
        
        return jsonify({
            'success': True,
            'total_assessments': len(history),
            'assessments': history
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching assessment history: {e}")
        return jsonify({'error': f'獲取評估歷史失敗: {str(e)}'}), 500


@bp.route('/api/child-assessment/<assessment_id>/detail', methods=['GET'])
@jwt_required()
def get_assessment_detail(assessment_id):
    """
    Get detailed assessment results including recommendations and export options
    """
    from flask_jwt_extended import get_jwt_identity
    from app.models import ChildDevelopmentAssessmentRecord
    
    user_id = get_jwt_identity()
    
    try:
        record = ChildDevelopmentAssessmentRecord.query.filter_by(
            assessment_id=assessment_id,
            user_id=user_id
        ).first()
        
        if not record:
            return jsonify({'error': '評估記錄不存在'}), 404
        
        if not record.is_completed:
            return jsonify({'error': '評估尚未完成'}), 400
        
        return jsonify({
            'success': True,
            'assessment': record.to_dict(include_answers=True)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching assessment detail: {e}")
        return jsonify({'error': f'獲取評估詳情失敗: {str(e)}'}), 500


@bp.route('/api/child-assessment/<assessment_id>/export', methods=['GET'])
@jwt_required()
def export_assessment_report(assessment_id):
    """
    Export assessment results as JSON
    """
    from flask_jwt_extended import get_jwt_identity
    from app.models import ChildDevelopmentAssessmentRecord
    import json
    
    user_id = get_jwt_identity()
    
    try:
        record = ChildDevelopmentAssessmentRecord.query.filter_by(
            assessment_id=assessment_id,
            user_id=user_id
        ).first()
        
        if not record:
            return jsonify({'error': '評估記錄不存在'}), 404
        
        if not record.is_completed:
            return jsonify({'error': '評估尚未完成'}), 400
        
        # Create export data
        export_data = {
            'assessment_id': record.assessment_id,
            'child_info': {
                'name': record.child_name,
                'age_months': record.child_age_months
            },
            'assessment_date': record.created_at.isoformat() if record.created_at else None,
            'standard': record.standard,
            'results': {
                'dq': record.overall_dq,
                'dq_level': record.dq_level,
                'total_mental_age': record.total_mental_age,
                'area_results': record.area_results
            },
            'recommendations': record.recommendations
        }
        
        # Return as JSON file download
        response = Response(
            json.dumps(export_data, ensure_ascii=False, indent=2),
            mimetype='application/json'
        )
        response.headers['Content-Disposition'] = f'attachment; filename=assessment_{assessment_id}.json'
        
        return response
        
    except Exception as e:
        current_app.logger.error(f"Error exporting assessment: {e}")
        return jsonify({'error': f'導出評估失敗: {str(e)}'}), 500


@bp.route('/api/upload-pdf', methods=['POST'])
@jwt_required()
def upload_pdf_for_assessment():
    """
    Upload PDF file for child assessment
    Supports PDF files up to 10MB
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': '沒有選擇文件'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': '沒有選擇文件'}), 400
        
        # Only accept PDF files
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': '只支持 PDF 文件'}), 400
        
        # Check file size (max 10MB)
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        max_size = 10 * 1024 * 1024  # 10MB
        if file_size > max_size:
            return jsonify({'error': f'文件太大，最大支持 10MB，實際大小 {file_size / 1024 / 1024:.2f}MB'}), 400
        
        # Save the PDF file
        upload_folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
        secure_name = secure_filename(file.filename)
        name_without_ext = secure_name.rsplit('.', 1)[0] if '.' in secure_name else secure_name
        unique_filename = f"{name_without_ext}_{timestamp}.pdf"
        
        file_path = os.path.join(upload_folder, unique_filename)
        file.save(file_path)
        
        current_app.logger.info(f"PDF uploaded successfully: {unique_filename}")
        
        return jsonify({
            'success': True,
            'file_path': file_path,
            'filename': unique_filename,
            'file_size': file_size
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error uploading PDF: {e}")
        return jsonify({'error': f'PDF 上傳失敗: {str(e)}'}), 500


# Video Management Endpoints
@bp.route('/api/upload-video', methods=['POST'])
@jwt_required()
def upload_video():
    """Upload a video file for transcription and analysis"""
    from flask_jwt_extended import get_jwt_identity
    from .models import db, VideoRecord
    import threading
    
    try:
        user_id = get_jwt_identity()
        
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        video_file = request.files['video']
        if not video_file.filename:
            return jsonify({'error': 'No selected file'}), 400
        
        # Validate file size (max 500MB)
        video_file.seek(0, os.SEEK_END)
        file_size = video_file.tell()
        video_file.seek(0)
        
        max_size = 500 * 1024 * 1024  # 500MB
        if file_size > max_size:
            return jsonify({'error': f'File too large. Max 500MB allowed'}), 400
        
        # Save video file into configured upload folder (e.g. app/static/upload)
        upload_folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)

        # Validate and preserve original extension
        secure_name = secure_filename(video_file.filename)
        if '.' in secure_name:
            name_without_ext, ext = secure_name.rsplit('.', 1)
            ext = ext.lower()
        else:
            name_without_ext = secure_name
            ext = ''

        allowed_exts = current_app.config.get('ALLOWED_VIDEO_EXTENSIONS', {'mp4', 'avi', 'mov', 'mkv', 'webm'})
        if ext == '' or ext not in allowed_exts:
            return jsonify({'error': f'不支援的影片格式。允許的格式: {", ".join(sorted(allowed_exts)).upper()}'}), 400

        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
        unique_filename = f"{name_without_ext}_{timestamp}.{ext}"
        
        file_path = os.path.join(upload_folder, unique_filename)
        video_file.save(file_path)
        
        # Create video record in database
        video_record = VideoRecord(
            user_id=user_id,
            filename=unique_filename,
            original_filename=video_file.filename,
            file_path=file_path,
            file_size=file_size,
            transcription_status='pending',
            analysis_status='pending'
        )
        
        db.session.add(video_record)
        db.session.commit()
        
        # Start transcription in background thread
        def transcribe_video():
            try:
                with current_app.app_context():
                    from moviepy.editor import VideoFileClip
                    
                    # Extract audio from video
                    video_clip = VideoFileClip(file_path)
                    duration = video_clip.duration
                    
                    # Update video record with duration
                    video_record.duration = duration
                    db.session.commit()
                    
                    # Save audio (replace original extension with .wav)
                    base, _ = os.path.splitext(file_path)
                    audio_path = f"{base}.wav"
                    video_clip.audio.write_audiofile(audio_path, verbose=False, logger=None)
                    video_clip.close()
                    
                    # Transcribe audio
                    video_record.transcription_status = 'processing'
                    db.session.commit()
                    
                    transcription_result = vertex_ai.generate_text_from_audio(audio_path)
                    
                    if transcription_result['success']:
                        video_record.full_transcription = transcription_result['text']
                        video_record.transcription_status = 'completed'
                        
                        # Create timestamps for each segment
                        from .models import VideoTimestamp
                        for segment in transcription_result.get('segments', []):
                            start_time = segment['start']
                            end_time = segment['end']
                            minutes = int(start_time // 60)
                            seconds = int(start_time % 60)
                            formatted_time = f"{minutes:02d}:{seconds:02d}:00"
                            
                            ts = VideoTimestamp(
                                video_id=video_record.id,
                                start_time=start_time,
                                end_time=end_time,
                                text=segment['text'],
                                formatted_time=formatted_time
                            )
                            db.session.add(ts)
                        
                        db.session.commit()
                    else:
                        video_record.transcription_status = 'failed'
                        db.session.commit()
                    
                    # Clean up audio file
                    if os.path.exists(audio_path):
                        os.remove(audio_path)
                        
            except Exception as e:
                current_app.logger.error(f"Error transcribing video: {e}")
                video_record.transcription_status = 'failed'
                db.session.commit()
        
        thread = threading.Thread(target=transcribe_video)
        thread.daemon = True
        thread.start()
        
        # Public URL for playback via static files
        video_url = f"/static/upload/{unique_filename}"

        return jsonify({
            'success': True,
            'video_id': video_record.id,
            'video_url': video_url,
            'file_path': file_path,
            'message': 'Video uploaded. Transcription processing...'
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error uploading video: {e}")
        return jsonify({'error': f'Video upload failed: {str(e)}'}), 500


@bp.route('/api/videos', methods=['GET'])
@jwt_required()
def get_videos():
    """Get user's uploaded videos"""
    from flask_jwt_extended import get_jwt_identity
    from .models import VideoRecord
    
    try:
        user_id = get_jwt_identity()
        videos = VideoRecord.query.filter_by(user_id=user_id).order_by(VideoRecord.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'videos': [video.to_dict() for video in videos]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching videos: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/video/<int:video_id>', methods=['GET'])
@jwt_required()
def get_video(video_id):
    """Get video details"""
    from flask_jwt_extended import get_jwt_identity
    from .models import VideoRecord
    
    try:
        user_id = get_jwt_identity()
        video = VideoRecord.query.filter_by(id=video_id, user_id=user_id).first()
        
        if not video:
            return jsonify({'error': 'Video not found'}), 404
        
        return jsonify({
            'success': True,
            'video': video.to_dict(include_timestamps=True)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching video: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/video/<int:video_id>/analyze', methods=['POST'])
@jwt_required()
def analyze_video(video_id):
    """Analyze video content"""
    from flask_jwt_extended import get_jwt_identity
    from .models import db, VideoRecord, UserProfile, UserApiKey
    import threading
    
    try:
        user_id = get_jwt_identity()
        video = VideoRecord.query.filter_by(id=video_id, user_id=user_id).first()
        
        if not video:
            return jsonify({'error': 'Video not found'}), 404
        
        if not video.full_transcription:
            return jsonify({'error': 'Transcription not yet completed'}), 400
        
        # Start analysis in background thread
        def analyze():
            try:
                with current_app.app_context():
                    video.analysis_status = 'processing'
                    db.session.commit()
                    
                    # Get user's API key
                    user_profile = UserProfile.query.filter_by(user_id=user_id).first()
                    api_key = None
                    if user_profile and user_profile.selected_api_key:
                        api_key = user_profile.selected_api_key.get_decrypted_key()
                    
                    # Analyze content
                    analysis_result = vertex_ai.analyze_video_content(
                        video.full_transcription,
                        api_key=api_key
                    )
                    
                    if analysis_result['success']:
                        video.analysis_report = analysis_result['analysis']
                        video.analysis_status = 'completed'
                    else:
                        video.analysis_status = 'failed'
                    
                    db.session.commit()
                    
            except Exception as e:
                current_app.logger.error(f"Error analyzing video: {e}")
                video.analysis_status = 'failed'
                db.session.commit()
        
        thread = threading.Thread(target=analyze)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Analysis started'
        }), 202
        
    except Exception as e:
        current_app.logger.error(f"Error starting analysis: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/video/<int:video_id>', methods=['DELETE'])
@jwt_required()
def delete_video(video_id):
    """Delete video and associated files"""
    from flask_jwt_extended import get_jwt_identity
    from .models import db, VideoRecord
    
    try:
        user_id = int(get_jwt_identity())
        video = VideoRecord.query.filter_by(id=video_id, user_id=user_id).first()
        
        if not video:
            return jsonify({'error': 'Video not found'}), 404
        
        # Delete file
        if os.path.exists(video.file_path):
            os.remove(video.file_path)
        
        # Delete database record
        db.session.delete(video)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Video deleted'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting video: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/api/videos/clear-all', methods=['POST'])
@jwt_required()
def clear_all_videos():
    """Clear all user videos"""
    from flask_jwt_extended import get_jwt_identity
    from .models import db, VideoRecord
    
    try:
        user_id = int(get_jwt_identity())
        videos = VideoRecord.query.filter_by(user_id=user_id).all()
        
        deleted_count = 0
        for video in videos:
            # Delete file
            if os.path.exists(video.file_path):
                try:
                    os.remove(video.file_path)
                except Exception as e:
                    current_app.logger.warning(f"Failed to delete file {video.file_path}: {e}")
            
            # Delete database record
            db.session.delete(video)
            deleted_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f'已清除 {deleted_count} 個影片',
            'deleted_count': deleted_count
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error clearing videos: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/api/video-file/<filename>')
@jwt_required()
def serve_video(filename):
    """Serve video files from upload folder with proper streaming"""
    from flask_jwt_extended import get_jwt_identity
    from .models import VideoRecord
    
    try:
        user_id = get_jwt_identity()
        upload_folder = current_app.config['UPLOAD_FOLDER']
        file_path = os.path.join(upload_folder, filename)
        
        # Security check: ensure file exists and belongs to user
        video = VideoRecord.query.filter_by(
            user_id=user_id,
            filename=filename
        ).first()
        
        if not video:
            return jsonify({'error': 'Video not found'}), 404
        
        if not os.path.exists(file_path):
            current_app.logger.error(f"Video file not found: {file_path}")
            return jsonify({'error': 'File not found on server'}), 404
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Handle Range requests (for video seeking)
        range_header = request.headers.get('Range', None)
        
        if range_header:
            # Parse range header
            try:
                range_match = re.match(r'bytes=(\d+)-(\d*)', range_header)
                if range_match:
                    start = int(range_match.group(1))
                    end = int(range_match.group(2)) if range_match.group(2) else file_size - 1
                    
                    if start >= file_size or end >= file_size or start > end:
                        return 'Requested Range Not Satisfiable', 416
                    
                    # Stream the requested byte range
                    from flask import send_file
                    with open(file_path, 'rb') as f:
                        f.seek(start)
                        data = f.read(end - start + 1)
                    
                    response = Response(data, status=206, mimetype='video/mp4')
                    response.headers.add('Content-Range', f'bytes {start}-{end}/{file_size}')
                    response.headers.add('Content-Length', len(data))
                    response.headers.add('Accept-Ranges', 'bytes')
                    return response
            except:
                pass
        
        # Serve entire file
        from flask import send_file
        return send_file(
            file_path,
            mimetype='video/mp4',
            as_attachment=False,
            conditional=True
        )
    
    except Exception as e:
        current_app.logger.error(f"Error serving video: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/video/analyze', methods=['POST'])
@jwt_required()
def analyze_video_upload():
    """Analyze uploaded video and extract frames for AI analysis."""
    from flask_jwt_extended import get_jwt_identity
    from .video_processor import VideoProcessor
    from .models import UserProfile
    
    user_id = int(get_jwt_identity())
    
    try:
        video_processor = VideoProcessor(current_app.config['UPLOAD_FOLDER'])
        video_path = None
        video_info = {}
        
        # Check if it's a file upload
        if 'video' in request.files:
            video_file = request.files['video']
            if not video_file.filename:
                return jsonify({'error': '沒有選擇文件'}), 400
            
            filename = secure_filename(video_file.filename)
            if not filename:
                return jsonify({'error': '無效的文件名'}), 400
            
            # Check file extension
            ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
            if ext not in current_app.config.get('ALLOWED_VIDEO_EXTENSIONS', {'mp4', 'avi', 'mov', 'mkv', 'webm'}):
                return jsonify({'error': f'不支援的影片格式。允許的格式: MP4, AVI, MOV, MKV, WebM'}), 400
            
            # Save the uploaded video
            upload_folder = current_app.config['UPLOAD_FOLDER']
            os.makedirs(upload_folder, exist_ok=True)
            
            timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
            unique_filename = f"video_{timestamp}.{ext}"
            video_path = os.path.join(upload_folder, unique_filename)
            video_file.save(video_path)
            
            current_app.logger.info(f"Saved uploaded video: {video_path}")
        
        else:
            return jsonify({'error': '請上傳影片文件'}), 400
        
        # Get video information
        if not video_info:
            video_info = video_processor.get_video_info(video_path)
        
        # Extract frames for analysis
        interval = current_app.config.get('VIDEO_FRAME_INTERVAL', 5)
        max_frames = current_app.config.get('VIDEO_MAX_FRAMES', 20)
        frames = video_processor.extract_frames(video_path, interval, max_frames)
        
        current_app.logger.info(f"Extracted {len(frames)} frames from video")
        
        # Get video URL for playback
        video_filename = os.path.basename(video_path)
        video_url = f"/static/upload/{video_filename}"
        
        return jsonify({
            'success': True,
            'video_info': video_info,
            'video_url': video_url,
            'video_path': video_path,
            'frames': frames,
            'is_youtube': False,
            'message': f'成功提取 {len(frames)} 個關鍵幀進行分析'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error analyzing video: {e}")
        return jsonify({'error': f'影片分析失敗: {str(e)}'}), 500


@bp.route('/video/stream-analysis', methods=['POST'])
@jwt_required()
def stream_video_analysis():
    """Stream AI analysis of video frames."""
    from flask_jwt_extended import get_jwt_identity
    from .models import UserProfile, UserApiKey
    import json
    
    user_id = int(get_jwt_identity())
    
    try:
        data = request.get_json()
        frames = data.get('frames', [])
        prompt = data.get('prompt', '請描述這個影片中發生了什麼事情，人物在做什麼動作。')
        video_info = data.get('video_info', {})
        
        if not frames:
            return jsonify({'error': '沒有提供影片幀數據'}), 400
        
        # Get user's API key and model
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        api_key = None
        if user_profile and user_profile.selected_api_key:
            api_key = user_profile.selected_api_key.get_decrypted_key()
        
        ai_model = 'gemini-2.5-flash'
        if user_profile and user_profile.ai_model:
            ai_model = user_profile.ai_model
        
        # Build prompt with video context
        video_title = video_info.get('title', '影片')
        video_duration = video_info.get('duration', 0)
        
        full_prompt = f"""# 影片分析任務

影片標題: {video_title}
影片長度: {video_duration} 秒
提取的關鍵幀數量: {len(frames)}

用戶問題: {prompt}

請根據提供的關鍵幀圖片，按時間順序分析影片內容，描述：
1. 影片中的人物在做什麼
2. 場景和環境
3. 動作和行為的變化
4. 任何重要的細節

請用繁體中文回答。"""
        
        # Prepare content for Gemini API (text + multiple images)
        parts = [{"text": full_prompt}]
        
        # Add all frames as images
        for frame in frames:
            timestamp = frame.get('timestamp', 0)
            frame_data = frame.get('data', '')
            
            parts.append({
                "text": f"\n\n[時間點 {timestamp}秒]"
            })
            parts.append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": frame_data
                }
            })
        
        # Stream the response
        def generate():
            try:
                for chunk in vertex_ai.stream_generate_content(
                    parts=parts,
                    api_key=api_key,
                    model=ai_model
                ):
                    if chunk:
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                yield "data: {\"done\": true}\n\n"
                
            except Exception as e:
                current_app.logger.error(f"Error in video analysis stream: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return Response(generate(), mimetype='text/event-stream')
        
    except Exception as e:
        current_app.logger.error(f"Error in video analysis: {e}")
        return jsonify({'error': f'影片分析失敗: {str(e)}'}), 500