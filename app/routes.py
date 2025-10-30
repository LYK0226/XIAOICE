from flask import Blueprint, render_template, request, jsonify, current_app
from flask_jwt_extended import jwt_required
import os
import json
from . import vertex_ai

bp = Blueprint('main', __name__)

@bp.route("/")
@bp.route("/index")
def index():
    """Render the main chat page."""
    return render_template('index.html')

@bp.route('/login')
def login_page():
    """Render the login/signup page."""
    return render_template('login_signup.html')

@bp.route('/forgot_password')
def forgot_password_page():
    """Render the forgot password page."""
    return render_template('forget_password.html')

@bp.route('/demo')
@jwt_required()
def demo():
    """Render the demo page."""
    return render_template('demo.html')

@bp.route('/chat', methods=['POST'])
@jwt_required()
def chat():
    """Handle chat messages and image uploads."""
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
            
            # Save the uploaded image
            upload_folder = current_app.config['UPLOAD_FOLDER']
            if not os.path.exists(upload_folder):
                os.makedirs(upload_folder)
            
            image_path = os.path.join(upload_folder, image_file.filename)
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

        # Get response from Vertex AI (pass history for memory/context)
        response_text = vertex_ai.generate_response(
            message,
            image_path=image_path,
            image_mime_type=image_mime_type,
            history=history,
            api_key=api_key,
            model_name=ai_model
        )
        
        return jsonify({'response': response_text})

    except Exception as e:
        current_app.logger.error(f"Error in chat endpoint: {e}")
        return jsonify({'error': 'An error occurred while processing your request.'}), 500
    finally:
        # Clean up the saved image file
        if image_path and os.path.exists(image_path):
            os.remove(image_path)

@bp.route('/test-api')
@jwt_required()
def test_api_page():
    """Render the API testing page."""
    return render_template('test-api.html')

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
