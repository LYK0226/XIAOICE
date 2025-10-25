from flask import Blueprint, render_template, request, jsonify, current_app
from flask_login import login_required, current_user
import os
import json
from . import vertex_ai

bp = Blueprint('main', __name__)

@bp.route('/')
@login_required
def index():
    """Render the main chat page."""
    return render_template('index.html')

@bp.route('/login')
def login_page():
    """Render the login/signup page."""
    return render_template('login_signup.html')

@bp.route('/demo')
@login_required
def demo():
    """Render the demo page."""
    return render_template('demo.html')

@bp.route('/chat', methods=['POST'])
@login_required
def chat():
    """Handle chat messages and image uploads."""
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

        # Get response from Vertex AI (pass history for memory/context)
        response_text = vertex_ai.generate_response(
            message,
            image_path=image_path,
            image_mime_type=image_mime_type,
            history=history,
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
@login_required
def test_api_page():
    """Render the API testing page."""
    return render_template('test-api.html')
