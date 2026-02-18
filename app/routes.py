from datetime import datetime
from flask import Blueprint, render_template, request, jsonify, current_app, redirect, url_for, Response, send_file, send_from_directory
from flask_jwt_extended import jwt_required, decode_token, get_jwt_identity as _get_jwt_identity
import os
import json
from . import agent
from werkzeug.utils import secure_filename
from . import gcp_bucket
import io

# Evaluation logic moved to dedicated module to keep routes lightweight
from .pose_detection.pose_assessment import evaluate_pose_assessment

bp = Blueprint('main', __name__)

SUPPORTED_LOCALES = {'zh-TW', 'en', 'ja'}

@bp.route("/")
@bp.route("/index")
def index():
    """Render the main chat page."""
    token = request.cookies.get('access_token')

    if not token:
        return redirect(url_for('main.login_page'))

    try:
        data = decode_token(token)
        from .models import User
        user = User.query.get(data.get('sub'))
        if not user:
            return redirect(url_for('main.login_page'))
    except Exception:
        response = redirect(url_for('main.login_page'))
        response.delete_cookie('access_token')
        return response

    return render_template('index.html', user=user)

@bp.route('/login')
def login_page():
    """Render the login/signup page."""
    return render_template('login_signup.html')


@bp.route('/<lang_code>')
@bp.route('/<lang_code>/')
@bp.route('/<lang_code>/<path:subpath>')
def localized_route(lang_code, subpath=''):
    """Redirect locale-prefixed URLs to their non-prefixed routes."""
    if lang_code not in SUPPORTED_LOCALES:
        return jsonify({'error': 'Not Found'}), 404

    if not subpath or subpath == 'index':
        return redirect(url_for('main.index'))

    target = f"/{subpath}"
    if request.query_string:
        target = f"{target}?{request.query_string.decode('utf-8')}"

    return redirect(target)

@bp.route('/chatbox')
@bp.route('/chatbox/')
def chatbox_page():
    """Render the chatbox page."""
    token = request.cookies.get('access_token')

    if not token:
        return redirect(url_for('main.login_page'))

    try:
        decode_token(token)
    except Exception:
        response = redirect(url_for('main.login_page'))
        response.delete_cookie('access_token')
        return response

    return render_template('chatbox.html')

@bp.route('/forgot_password')
@bp.route('/forgot_password/')
def forgot_password_page():
    """Render the forgot password page."""
    return render_template('forget_password.html')


@bp.route('/child_assessment')
@bp.route('/child_assessment/')
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
@bp.route('/pose_detection/')
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
@bp.route('/video/')
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

    return render_template('video_access.html')


@bp.route('/admin')
def admin():
    """Render the admin dashboard page (admin-only)."""
    token = request.cookies.get('access_token')

    if not token:
        return redirect(url_for('main.login_page'))

    try:
        data = decode_token(token)
        from .models import User
        user = User.query.get(data.get('sub'))
        if not user or not user.is_admin():
            return redirect(url_for('main.index'))
    except Exception:
        response = redirect(url_for('main.login_page'))
        response.delete_cookie('access_token')
        return response

    return render_template('admin.html', user=user)


# ---------------------------------------------------------------------------
# RAG Admin API Endpoints
# ---------------------------------------------------------------------------

@bp.route('/admin/rag/documents', methods=['POST'])
@jwt_required()
def rag_upload_document():
    """Upload a document to the global RAG knowledge base (admin only)."""
    from flask_jwt_extended import get_jwt_identity
    from .auth import admin_required
    from .models import User, RagDocument, db
    from . import gcp_bucket as gcs

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin():
        return jsonify({'error': 'Admin access required'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'Empty filename'}), 400

    # Validate extension
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    allowed = current_app.config.get('RAG_ALLOWED_EXTENSIONS', {'pdf', 'txt', 'md'})
    if ext not in allowed:
        return jsonify({'error': f'Unsupported file type: .{ext}. Allowed: {sorted(allowed)}'}), 400

    try:
        gcs_path, file_size = gcs.upload_rag_document(file, file.filename, file.content_type)

        doc = RagDocument(
            filename=gcs_path.split('/')[-1],
            original_filename=file.filename,
            content_type=file.content_type or 'application/octet-stream',
            gcs_path=gcs_path,
            file_size=file_size,
            status='pending',
            uploaded_by=user_id,
        )
        db.session.add(doc)
        db.session.commit()

        # Process document (chunk + embed) synchronously
        from app.rag.processor import process_document
        success = process_document(doc.id)

        # Refresh to get updated status
        db.session.refresh(doc)
        return jsonify({
            'message': 'Document uploaded and processed' if success else 'Document uploaded but processing failed',
            'document': doc.to_dict(),
        }), 201 if success else 207

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@bp.route('/admin/rag/documents', methods=['GET'])
@jwt_required()
def rag_list_documents():
    """List all RAG documents (admin only)."""
    from flask_jwt_extended import get_jwt_identity
    from .models import User, RagDocument

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin():
        return jsonify({'error': 'Admin access required'}), 403

    docs = RagDocument.query.order_by(RagDocument.created_at.desc()).all()
    return jsonify({'documents': [d.to_dict() for d in docs]}), 200


@bp.route('/admin/rag/documents/<int:doc_id>', methods=['GET'])
@jwt_required()
def rag_get_document(doc_id):
    """Get a RAG document with chunk previews (admin only)."""
    from flask_jwt_extended import get_jwt_identity
    from .models import User, RagDocument

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin():
        return jsonify({'error': 'Admin access required'}), 403

    doc = RagDocument.query.get(doc_id)
    if not doc:
        return jsonify({'error': 'Document not found'}), 404

    return jsonify({'document': doc.to_dict(include_chunks=True)}), 200


@bp.route('/admin/rag/documents/<int:doc_id>', methods=['DELETE'])
@jwt_required()
def rag_delete_document(doc_id):
    """Delete a RAG document, its chunks, and GCS file (admin only)."""
    from flask_jwt_extended import get_jwt_identity
    from .models import User, RagDocument, db
    from . import gcp_bucket as gcs
    from app.rag.processor import delete_document_data

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin():
        return jsonify({'error': 'Admin access required'}), 403

    doc = RagDocument.query.get(doc_id)
    if not doc:
        return jsonify({'error': 'Document not found'}), 404

    gcs_path = doc.gcs_path
    delete_document_data(doc_id)
    gcs.delete_rag_document(gcs_path)

    return jsonify({'message': 'Document deleted'}), 200


@bp.route('/admin/rag/documents/<int:doc_id>/reprocess', methods=['POST'])
@jwt_required()
def rag_reprocess_document(doc_id):
    """Re-chunk and re-embed a document (admin only)."""
    from flask_jwt_extended import get_jwt_identity
    from .models import User, RagDocument, db
    from app.rag.processor import process_document

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin():
        return jsonify({'error': 'Admin access required'}), 403

    doc = RagDocument.query.get(doc_id)
    if not doc:
        return jsonify({'error': 'Document not found'}), 404

    success = process_document(doc.id)
    db.session.refresh(doc)

    return jsonify({
        'message': 'Reprocessing complete' if success else 'Reprocessing failed',
        'document': doc.to_dict(),
    }), 200 if success else 500


@bp.route('/admin/rag/search', methods=['POST'])
@jwt_required()
def rag_test_search():
    """Test search endpoint for admins to verify retrieval quality."""
    from flask_jwt_extended import get_jwt_identity
    from .models import User
    from app.rag.retriever import search_knowledge

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin():
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json() or {}
    query = data.get('query', '').strip()
    if not query:
        return jsonify({'error': 'Query is required'}), 400

    top_k = data.get('top_k', current_app.config.get('RAG_TOP_K', 5))
    results = search_knowledge(query, top_k=top_k, user_id=user.id)

    return jsonify({'query': query, 'results': results}), 200


# ---------------------------------------------------------------------------
# Admin User Management API Endpoints
# ---------------------------------------------------------------------------

@bp.route('/admin/users', methods=['GET'])
@jwt_required()
def admin_list_users():
    """List all users with pagination, search, and filter (admin only)."""
    from flask_jwt_extended import get_jwt_identity
    from .models import User, db
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin():
        return jsonify({'error': 'Admin access required'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '').strip()
    role_filter = request.args.get('role', '').strip()
    status_filter = request.args.get('status', '').strip()
    
    per_page = min(per_page, 100)
    
    query = User.query
    
    if search:
        search_pattern = f'%{search}%'
        query = query.filter(
            db.or_(
                User.username.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )
    
    if role_filter and role_filter != 'all':
        query = query.filter(User.role == role_filter)
    
    if status_filter:
        if status_filter == 'active':
            query = query.filter(User.is_active == True)
        elif status_filter == 'inactive':
            query = query.filter(User.is_active == False)
    
    total = query.count()
    users = query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'users': [u.to_dict() for u in users.items],
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': users.pages
    }), 200


@bp.route('/admin/users', methods=['POST'])
@jwt_required()
def admin_create_user():
    """Create a new user (admin only)."""
    from flask_jwt_extended import get_jwt_identity
    from .models import User, db
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin():
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'user').strip()
    
    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required'}), 400
    
    if role not in ['user', 'admin', 'teacher']:
        return jsonify({'error': 'Invalid role. Allowed: user, admin, teacher'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    try:
        new_user = User(username=username, email=email, role=role)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'User created successfully',
            'user': new_user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating user: {e}")
        return jsonify({'error': 'Failed to create user'}), 500


@bp.route('/admin/users/<int:target_user_id>', methods=['GET'])
@jwt_required()
def admin_get_user(target_user_id):
    """Get a specific user by ID (admin only)."""
    from flask_jwt_extended import get_jwt_identity
    from .models import User
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin():
        return jsonify({'error': 'Admin access required'}), 403
    
    target_user = User.query.get(target_user_id)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': target_user.to_dict()}), 200


@bp.route('/admin/users/<int:target_user_id>', methods=['PUT'])
@jwt_required()
def admin_update_user(target_user_id):
    """Update a user's information (admin only)."""
    from flask_jwt_extended import get_jwt_identity
    from .models import User, db
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin():
        return jsonify({'error': 'Admin access required'}), 403
    
    target_user = User.query.get(target_user_id)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'username' in data:
        username = data['username'].strip()
        if username and username != target_user.username:
            if User.query.filter_by(username=username).first():
                return jsonify({'error': 'Username already exists'}), 400
            target_user.username = username
    
    if 'email' in data:
        email = data['email'].strip()
        if email and email != target_user.email:
            if User.query.filter_by(email=email).first():
                return jsonify({'error': 'Email already exists'}), 400
            target_user.email = email
    
    if 'password' in data:
        password = data['password'].strip()
        if password:
            target_user.set_password(password)
    
    if 'role' in data:
        role = data['role'].strip()
        if role in ['user', 'admin', 'teacher']:
            target_user.role = role
    
    if 'is_active' in data:
        target_user.is_active = bool(data['is_active'])
    
    try:
        db.session.commit()
        return jsonify({
            'message': 'User updated successfully',
            'user': target_user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating user: {e}")
        return jsonify({'error': 'Failed to update user'}), 500


@bp.route('/admin/users/<int:target_user_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_user(target_user_id):
    """Delete a user (admin only). Cannot delete yourself."""
    from flask_jwt_extended import get_jwt_identity
    from .models import User, db
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin():
        return jsonify({'error': 'Admin access required'}), 403
    
    if target_user_id == user_id:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    target_user = User.query.get(target_user_id)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404
    
    try:
        from .models import UserProfile
        UserProfile.query.filter_by(user_id=target_user_id).delete()
        db.session.delete(target_user)
        db.session.commit()
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting user: {e}")
        return jsonify({'error': 'Failed to delete user'}), 500


@bp.route('/admin/users/<int:target_user_id>/role', methods=['PATCH'])
@jwt_required()
def admin_update_user_role(target_user_id):
    """Update a user's role (admin only)."""
    from flask_jwt_extended import get_jwt_identity
    from .models import User, db
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin():
        return jsonify({'error': 'Admin access required'}), 403
    
    target_user = User.query.get(target_user_id)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    if not data or 'role' not in data:
        return jsonify({'error': 'Role is required'}), 400
    
    role = data['role'].strip()
    if role not in ['user', 'admin', 'teacher']:
        return jsonify({'error': 'Invalid role. Allowed: user, admin, teacher'}), 400
    
    target_user.role = role
    
    try:
        db.session.commit()
        return jsonify({
            'message': 'User role updated successfully',
            'user': target_user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating user role: {e}")
        return jsonify({'error': 'Failed to update user role'}), 500


@bp.route('/admin/users/<int:target_user_id>/status', methods=['PATCH'])
@jwt_required()
def admin_toggle_user_status(target_user_id):
    """Toggle a user's active status (admin only)."""
    from flask_jwt_extended import get_jwt_identity
    from .models import User, db
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin():
        return jsonify({'error': 'Admin access required'}), 403
    
    target_user = User.query.get(target_user_id)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404
    
    if target_user_id == user_id:
        return jsonify({'error': 'Cannot toggle your own status'}), 400
    
    target_user.is_active = not target_user.is_active
    
    try:
        db.session.commit()
        return jsonify({
            'message': f"User {'activated' if target_user.is_active else 'deactivated'} successfully",
            'user': target_user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error toggling user status: {e}")
        return jsonify({'error': 'Failed to toggle user status'}), 500


@bp.route('/admin/stats', methods=['GET'])
@jwt_required()
def admin_get_stats():
    """Get system statistics (admin only)."""
    from flask_jwt_extended import get_jwt_identity
    from .models import User, Conversation, Message, Child, ChildDevelopmentAssessmentRecord, VideoRecord
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        total_users = User.query.count()
        admin_users = User.query.filter_by(role='admin').count()
        teacher_users = User.query.filter_by(role='teacher').count()
        regular_users = User.query.filter_by(role='user').count()
        active_users = User.query.filter_by(is_active=True).count()
        
        total_conversations = Conversation.query.count()
        total_messages = Message.query.count()
        total_children = Child.query.count()
        total_assessments = ChildDevelopmentAssessmentRecord.query.count()
        completed_assessments = ChildDevelopmentAssessmentRecord.query.filter_by(is_completed=True).count()
        total_videos = VideoRecord.query.count()
        
        from datetime import datetime, timedelta
        today = datetime.utcnow().date()
        today_start = datetime.combine(today, datetime.min.time())
        new_users_today = User.query.filter(User.created_at >= today_start).count()
        
        return jsonify({
            'users': {
                'total': total_users,
                'admins': admin_users,
                'teachers': teacher_users,
                'regular': regular_users,
                'active': active_users,
                'new_today': new_users_today
            },
            'conversations': {
                'total': total_conversations
            },
            'messages': {
                'total': total_messages
            },
            'children': {
                'total': total_children
            },
            'assessments': {
                'total': total_assessments,
                'completed': completed_assessments
            },
            'videos': {
                'total': total_videos
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting admin stats: {e}")
        return jsonify({'error': 'Failed to get statistics'}), 500


@bp.route('/pose_detection/js/<path:filename>')
def serve_pose_detection_js(filename):
    """Serve JavaScript files from the pose_detection module."""
    pose_detection_dir = os.path.join(os.path.dirname(__file__), 'pose_detection')
    return send_from_directory(pose_detection_dir, filename)

@bp.route('/chat/stream', methods=['POST'])
@jwt_required()
def chat_stream():
    """Handle streaming chat messages and image uploads."""
    from flask_jwt_extended import get_jwt_identity
    from .models import UserProfile, UserApiKey, VertexServiceAccount
    
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
    image_file = request.files.get('image')
    
    image_path = None
    image_mime_type = None

    try:
        if 'image_url' in request.form:
            image_path = request.form['image_url']
            image_mime_type = request.form.get('image_mime_type')
        elif image_file:
            if not image_file.filename:
                 return jsonify({'error': 'No selected file'}), 400

            filename = secure_filename(image_file.filename)
            if not filename:
                return jsonify({'error': 'Invalid file name'}), 400

            # Upload to Google Cloud Storage
            image_path = gcp_bucket.upload_image_to_gcs(image_file, filename, user_id=user_id)
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

        # Get user's selected AI model and provider
        ai_model = 'gemini-3-flash-preview'  # default
        ai_provider = 'ai_studio'  # default
        vertex_config = None
        provider_for_request = 'ai_studio'
        
        if user_profile:
            if user_profile.ai_model:
                ai_model = user_profile.ai_model
            if user_profile.ai_provider:
                ai_provider = user_profile.ai_provider
            
            # If using Vertex AI, get Vertex configuration
            if ai_provider == 'vertex_ai':
                vertex_account = None
                if user_profile.selected_vertex_account_id:
                    vertex_account = VertexServiceAccount.query.filter_by(
                        id=user_profile.selected_vertex_account_id,
                        user_id=user_id
                    ).first()
                elif user_profile.selected_vertex_account:
                    vertex_account = user_profile.selected_vertex_account

                if not vertex_account:
                    return jsonify({'error': 'Vertex AI service account is not configured'}), 400

                vertex_config = {
                    'service_account': vertex_account.get_decrypted_credentials(),
                    'project_id': vertex_account.project_id,
                    'location': vertex_account.location or 'us-central1'
                }
                if not vertex_config['service_account'] or not vertex_config['project_id']:
                    return jsonify({'error': 'Vertex AI service account is missing or invalid'}), 400
                provider_for_request = 'vertex_ai'
            else:
                provider_for_request = 'ai_studio'

        # Get conversation_id if provided (for session persistence)
        conversation_id = request.form.get('conversation_id', type=int)

        def generate():
            try:
                for chunk in agent.generate_streaming_response(
                    message,
                    image_path=image_path,
                    image_mime_type=image_mime_type,
                    history=history,
                    api_key=api_key,
                    model_name=ai_model,
                    user_id=str(user_id),
                    conversation_id=conversation_id,
                    provider=provider_for_request,
                    vertex_config=vertex_config
                ):
                    # Clean up common AI prefixes that might appear in responses
                    chunk = chunk.strip()
                    if not chunk:
                        continue
                    
                    # Remove common prefixes that AI models might add
                    prefixes_to_remove = ['Assistant:', 'AI:', 'Bot:', 'System:', 'Human:']
                    for prefix in prefixes_to_remove:
                        if chunk.startswith(prefix):
                            chunk = chunk[len(prefix):].strip()
                            break
                    
                    if chunk:
                        # JSON-encode the chunk so newlines (\n) don't break SSE framing.
                        # The client will JSON.parse() to restore the original text.
                        yield f"data: {json.dumps(chunk)}\n\n"
            except Exception as e:
                current_app.logger.error(f"Error in streaming endpoint: {e}")
                import traceback
                traceback.print_exc()
                yield f"data: {json.dumps('Error: ' + str(e))}\n\n"

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
    provider = data.get('provider', 'ai_studio')  # Default to ai_studio
    
    if not name or not api_key:
        return jsonify({'error': 'Name and API key cannot be empty'}), 400
    
    if provider != 'ai_studio':
        return jsonify({'error': 'Invalid provider'}), 400
    
    try:
        new_key = UserApiKey(user_id=user_id, name=name, provider=provider)
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
    """Get the current user's selected AI model and provider."""
    from flask_jwt_extended import get_jwt_identity
    from .models import UserProfile, VertexServiceAccount
    
    user_id = get_jwt_identity()
    
    try:
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not user_profile:
            # Return default configuration if no profile exists
            return jsonify({
                'ai_model': 'gemini-3-flash-preview',
                'ai_provider': 'ai_studio',
                'selected_vertex_account_id': None,
                'vertex_account': None
            })
        
        # Get selected vertex account details if any
        vertex_account_data = None
        if user_profile.selected_vertex_account_id:
            vertex_account = VertexServiceAccount.query.get(user_profile.selected_vertex_account_id)
            if vertex_account:
                vertex_account_data = vertex_account.to_dict()

        # Choose a sensible default model depending on provider
        if user_profile.ai_model:
            ai_model = user_profile.ai_model
        else:
            ai_model = 'gemini-2.5-flash' if user_profile.ai_provider == 'vertex_ai' else 'gemini-3-flash-preview'
        
        return jsonify({
            'ai_model': ai_model,
            'ai_provider': user_profile.ai_provider or 'ai_studio',
            'selected_vertex_account_id': user_profile.selected_vertex_account_id,
            'vertex_account': vertex_account_data
        })
    except Exception as e:
        current_app.logger.error(f"Error getting user model: {e}")
        return jsonify({'error': 'Failed to get user model'}), 500

@bp.route('/api/user/model', methods=['POST'])
@jwt_required()
def set_user_model():
    """Set the current user's selected AI model and provider."""
    from flask_jwt_extended import get_jwt_identity
    from .models import UserProfile, db
    
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not user_profile:
            user_profile = UserProfile(user_id=user_id)
            db.session.add(user_profile)
        
        # Update AI model if provided
        if 'ai_model' in data:
            ai_model = data['ai_model']
            # Define allowed models for each provider
            ai_studio_models = ['gemini-3-flash-preview', 'gemini-3-pro-preview']
            vertex_ai_models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-flash-preview', 'gemini-3-pro-preview']
            all_allowed_models = ai_studio_models + vertex_ai_models
            
            if ai_model not in all_allowed_models:
                return jsonify({'error': f'Invalid model. Allowed: {", ".join(all_allowed_models)}'}), 400
            
            user_profile.ai_model = ai_model
        
        # Update AI provider if provided
        if 'ai_provider' in data:
            ai_provider = data['ai_provider']
            if ai_provider not in ['ai_studio', 'vertex_ai']:
                return jsonify({'error': 'Invalid provider. Allowed: ai_studio, vertex_ai'}), 400
            
            # If switching provider, ensure selected model is valid for the provider
            ai_studio_models = ['gemini-3-flash-preview', 'gemini-3-pro-preview']
            vertex_ai_models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-flash-preview', 'gemini-3-pro-preview']
            if ai_provider == 'vertex_ai' and user_profile.ai_model not in vertex_ai_models:
                # Set to vertex default
                user_profile.ai_model = 'gemini-2.5-flash'
            if ai_provider == 'ai_studio' and user_profile.ai_model not in ai_studio_models:
                user_profile.ai_model = 'gemini-3-flash-preview'

            user_profile.ai_provider = ai_provider
        
        db.session.commit()
        
        return jsonify({
            'message': 'Configuration updated successfully',
            'ai_model': user_profile.ai_model,
            'ai_provider': user_profile.ai_provider
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error setting user model: {e}")
        return jsonify({'error': 'Failed to update configuration'}), 500

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
                'ai_model': 'gemini-3-flash-preview'
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
    allowed_languages = ['zh-TW', 'zh-CN', 'en', 'ja']
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


# ===== Children Management Routes =====

@bp.route('/api/children', methods=['GET'])
@jwt_required()
def get_children():
    """Get all children profiles for the current user."""
    from flask_jwt_extended import get_jwt_identity
    from .models import Child
    
    user_id = get_jwt_identity()
    
    try:
        children = Child.query.filter_by(user_id=user_id).order_by(Child.created_at.desc()).all()
        return jsonify({
            'children': [child.to_dict() for child in children],
            'count': len(children)
        })
    except Exception as e:
        current_app.logger.error(f"Error getting children: {e}")
        return jsonify({'error': 'Failed to retrieve children profiles'}), 500

@bp.route('/api/children', methods=['POST'])
@jwt_required()
def create_child():
    """Create a new child profile for the current user."""
    from flask_jwt_extended import get_jwt_identity
    from .models import Child, db
    from datetime import datetime
    
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Validate required fields
    if 'name' not in data or not data['name'].strip():
        return jsonify({'error': 'Name is required'}), 400
    
    if 'birthdate' not in data or not data['birthdate']:
        return jsonify({'error': 'Birthdate is required'}), 400
    
    try:
        # Parse birthdate
        birthdate_str = data['birthdate']
        try:
            birthdate = datetime.strptime(birthdate_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid birthdate format. Use YYYY-MM-DD'}), 400
        
        # Validate birthdate is not in the future
        from datetime import date
        if birthdate > date.today():
            return jsonify({'error': 'Birthdate cannot be in the future'}), 400
        
        # Validate gender if provided
        gender = data.get('gender')
        if gender:
            gender = gender.strip() if isinstance(gender, str) else None
            if gender and gender not in ['male', 'female', 'other']:
                return jsonify({'error': 'Invalid gender. Allowed: male, female, other'}), 400
        else:
            gender = None
        
        # Handle notes
        notes = data.get('notes')
        if notes:
            notes = notes.strip() if isinstance(notes, str) else None
            if not notes:
                notes = None
        else:
            notes = None
        
        # Create new child profile
        new_child = Child(
            user_id=user_id,
            name=data['name'].strip(),
            birthdate=birthdate,
            gender=gender,
            notes=notes
        )
        
        db.session.add(new_child)
        db.session.commit()
        
        return jsonify({
            'message': 'Child profile created successfully',
            'child': new_child.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating child profile: {e}")
        return jsonify({'error': 'Failed to create child profile'}), 500

@bp.route('/api/children/<int:child_id>', methods=['GET'])
@jwt_required()
def get_child(child_id):
    """Get a specific child profile."""
    from flask_jwt_extended import get_jwt_identity
    from .models import Child
    
    user_id = get_jwt_identity()
    
    try:
        child = Child.query.filter_by(id=child_id, user_id=user_id).first()
        if not child:
            return jsonify({'error': 'Child profile not found'}), 404
        
        return jsonify(child.to_dict())
    except Exception as e:
        current_app.logger.error(f"Error getting child profile: {e}")
        return jsonify({'error': 'Failed to retrieve child profile'}), 500

@bp.route('/api/children/<int:child_id>', methods=['PUT'])
@jwt_required()
def update_child(child_id):
    """Update a child profile."""
    from flask_jwt_extended import get_jwt_identity
    from .models import Child, db
    from datetime import datetime
    
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        child = Child.query.filter_by(id=child_id, user_id=user_id).first()
        if not child:
            return jsonify({'error': 'Child profile not found'}), 404
        
        # Update name if provided
        if 'name' in data:
            name = data['name'].strip()
            if not name:
                return jsonify({'error': 'Name cannot be empty'}), 400
            child.name = name
        
        # Update birthdate if provided
        if 'birthdate' in data:
            birthdate_str = data['birthdate']
            try:
                birthdate = datetime.strptime(birthdate_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid birthdate format. Use YYYY-MM-DD'}), 400
            
            from datetime import date
            if birthdate > date.today():
                return jsonify({'error': 'Birthdate cannot be in the future'}), 400
            
            child.birthdate = birthdate
        
        # Update gender if provided
        if 'gender' in data:
            gender = data['gender']
            if gender:
                gender = gender.strip() if isinstance(gender, str) else None
                if gender and gender not in ['male', 'female', 'other']:
                    return jsonify({'error': 'Invalid gender. Allowed: male, female, other'}), 400
            else:
                gender = None
            child.gender = gender
        
        # Update notes if provided
        if 'notes' in data:
            notes = data['notes']
            if notes:
                notes = notes.strip() if isinstance(notes, str) else None
                if not notes:
                    notes = None
            else:
                notes = None
            child.notes = notes
        
        db.session.commit()
        
        return jsonify({
            'message': 'Child profile updated successfully',
            'child': child.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating child profile: {e}")
        return jsonify({'error': 'Failed to update child profile'}), 500

@bp.route('/api/children/<int:child_id>', methods=['DELETE'])
@jwt_required()
def delete_child(child_id):
    """Delete a child profile."""
    from flask_jwt_extended import get_jwt_identity
    from .models import Child, db
    from .video_cleanup import delete_reports_for_child
    
    user_id = get_jwt_identity()
    
    try:
        child = Child.query.filter_by(id=child_id, user_id=user_id).first()
        if not child:
            return jsonify({'error': 'Child profile not found'}), 404
        
        delete_reports_for_child(child_id, user_id, db)

        db.session.delete(child)
        db.session.commit()
        
        return jsonify({'message': 'Child profile deleted successfully'})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting child profile: {e}")
        return jsonify({'error': 'Failed to delete child profile'}), 500


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
        uploaded_files = gcp_bucket.upload_files_to_gcs(files, user_id=user_id, conversation_id=conv_id)
    
    # Get data from JSON or form
    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict()
    
    conversation_id = data.get('conversation_id')
    sender = (data.get('sender') or '').strip().lower()
    content = (data.get('content') or '').strip()
    metadata = data.get('metadata')
    temp_id = data.get('temp_id')  # Get temp_id for optimistic UI

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

        # Prepare response with temp_id if provided
        response_data = {
            'message': message.to_dict(),
            'conversation': conversation.to_dict()
        }
        if temp_id:
            response_data['temp_id'] = temp_id
        
        # Emit socket event with temp_id for real-time updates
        from app import socketio
        socketio.emit('new_message', {
            'message': message.to_dict(),
            'conversation_id': conversation.id,
            'temp_id': temp_id
        }, room=f"conversation_{conversation.id}")

        return jsonify(response_data), 201
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

@bp.route('/api/upload_file', methods=['POST'])
@jwt_required()
def upload_file_websocket():
    """
    Upload file(s) to GCS and broadcast via WebSocket.
    This endpoint is used for file uploads in WebSocket-based chat.
    """
    from flask_jwt_extended import get_jwt_identity
    from .models import Conversation, Message, db
    from app import socketio
    
    user_id = get_jwt_identity()
    
    try:
        # Get conversation_id and optional message content
        conversation_id = request.form.get('conversation_id', type=int)
        message_content = request.form.get('message', '').strip()
        
        if not conversation_id:
            return jsonify({'error': 'conversation_id is required'}), 400
        
        # Verify conversation exists and belongs to user
        conversation = Conversation.query.filter_by(id=conversation_id, user_id=user_id).first()
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404
        
        # Get uploaded files
        files = request.files.getlist('files')
        if not files or not files[0].filename:
            return jsonify({'error': 'No files provided'}), 400
        
        # Upload files to GCS
        uploaded_urls = gcp_bucket.upload_files_to_gcs(
            files, 
            user_id=user_id, 
            conversation_id=conversation_id
        )
        
        if not uploaded_urls:
            return jsonify({'error': 'Failed to upload files'}), 500
        
        # Create user message with file attachments
        user_message = Message(
            conversation_id=conversation_id,
            sender='user',
            content=message_content or '[File attachment]',
            uploaded_files=uploaded_urls
        )
        db.session.add(user_message)
        db.session.commit()
        
        # Update FileUpload records with message_id
        from .models import FileUpload
        for gcs_url in uploaded_urls:
            file_upload = FileUpload.query.filter_by(
                user_id=user_id,
                file_path=gcs_url,
                conversation_id=conversation_id
            ).order_by(FileUpload.uploaded_at.desc()).first()
            
            if file_upload and not file_upload.message_id:
                file_upload.message_id = user_message.id
        
        db.session.commit()
        
        # Broadcast file upload to WebSocket room
        room = f"conversation_{conversation_id}"
        socketio.emit('file_uploaded', {
            'message_id': user_message.id,
            'role': 'user',
            'content': user_message.content,
            'files': uploaded_urls,
            'timestamp': user_message.created_at.isoformat() if user_message.created_at else None,
            'conversation_id': conversation_id
        }, room=room)
        
        return jsonify({
            'success': True,
            'message_id': user_message.id,
            'files': uploaded_urls,
            'conversation_id': conversation_id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error uploading file: {e}")
        return jsonify({'error': f'Failed to upload file: {str(e)}'}), 500


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


# ===== Quiz/Questionnaire Routes =====


@bp.route('/api/quiz/generate', methods=['POST'])
@jwt_required()
def generate_quiz():
    """根据 PDF 生成测验题目"""
    from flask_jwt_extended import get_jwt_identity
    from app.adk import PDFQuestionnaire

    user_id = get_jwt_identity()

    try:
        data = request.get_json() or {}
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
    from datetime import datetime

    user_id = get_jwt_identity()

    try:
        data = request.get_json() or {}
        test_id = data.get('test_id')
        answers = data.get('answers', [])  # [{question_index, answer, ...}]

        # 计算分数（如果是选择题）
        correct_count = 0
        total = len(answers)

        for ans in answers:
            if ans.get('is_correct'):
                correct_count += 1

        score = (correct_count / total * 100) if total > 0 else 0

        result = {
            'test_id': test_id,
            'user_id': user_id,
            'answers': answers,
            'score': f"{score:.1f}%",
            'correct_count': correct_count,
            'total_questions': total,
            'submitted_at': datetime.now().isoformat()
        }

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
    """Generate child development assessment questions from PDF (WS/T 580—2017)."""
    from flask_jwt_extended import get_jwt_identity
    from app.child_assessment import ChildDevelopmentAssessmentWST580
    from app.models import ChildDevelopmentAssessmentRecord, db
    import uuid

    user_id = get_jwt_identity()

    try:
        data = request.get_json() or {}
        child_name = data.get('child_name', 'Unknown')
        child_age_months = data.get('child_age_months', 24.0)
        pdf_path = data.get('pdf_path')

        # Validate age (0-84 months = 0-6 years)
        if not (0 <= float(child_age_months) <= 84):
            return jsonify({'error': '孩子年齡應在 0-84 個月之間 (0-6 歲)'}), 400

        assessment = ChildDevelopmentAssessmentWST580(
            child_name=child_name,
            child_age_months=float(child_age_months),
            pdf_path=pdf_path
        )

        questions = assessment.generate_assessment_questions()
        if not questions:
            return jsonify({'error': '無法為該年齡生成評估項目'}), 400

        assessment_id = str(uuid.uuid4())

        record = ChildDevelopmentAssessmentRecord(
            assessment_id=assessment_id,
            user_id=user_id,
            child_name=child_name,
            child_age_months=float(child_age_months),
            questions=questions,
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
            'questions': questions[:5]
        }), 201

    except Exception as e:
        current_app.logger.error(f"Error generating assessment: {e}", exc_info=True)
        return jsonify({'error': f'生成評估失敗: {str(e)}'}), 500


@bp.route('/api/child-assessment/<assessment_id>/submit', methods=['POST'])
@jwt_required()
def submit_child_assessment(assessment_id):
    """Submit child development assessment answers and calculate results."""
    from flask_jwt_extended import get_jwt_identity
    from app.child_assessment import ChildDevelopmentAssessmentWST580
    from app.models import ChildDevelopmentAssessmentRecord, db
    from datetime import datetime

    user_id = get_jwt_identity()

    try:
        record = ChildDevelopmentAssessmentRecord.query.filter_by(
            assessment_id=assessment_id,
            user_id=user_id
        ).first()

        if not record:
            return jsonify({'error': '評估記錄不存在'}), 404

        data = request.get_json() or {}
        answers = data.get('answers', {})

        assessment = ChildDevelopmentAssessmentWST580(
            child_name=record.child_name,
            child_age_months=record.child_age_months,
            pdf_path=None
        )

        for item_id, passed in answers.items():
            assessment.record_answer(item_id, bool(passed))

        results = assessment.calculate_assessment_results()
        recommendations = assessment.generate_recommendations()

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
    """Get all previous assessment records for the user."""
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
    """Get detailed assessment results including recommendations and export options."""
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
    """Export assessment results as JSON."""
    from flask_jwt_extended import get_jwt_identity
    from app.models import ChildDevelopmentAssessmentRecord
    import json as _json

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

        response = Response(
            _json.dumps(export_data, ensure_ascii=False, indent=2),
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
    """Upload PDF file for child assessment. Supports PDF files up to 10MB."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': '沒有選擇文件'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '沒有選擇文件'}), 400

        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': '只支持 PDF 文件'}), 400

        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        max_size = 10 * 1024 * 1024
        if file_size > max_size:
            return jsonify({'error': f'文件太大，最大支持 10MB，實際大小 {file_size / 1024 / 1024:.2f}MB'}), 400

        upload_folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)

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


# ===== Vertex AI Service Account Management =====

@bp.route('/api/vertex/accounts', methods=['POST'])
@jwt_required()
def create_vertex_account():
    """Create a new Vertex AI service account configuration."""
    from flask_jwt_extended import get_jwt_identity
    from .models import VertexServiceAccount, db
    import json
    
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Validate required fields
    name = data.get('name', '').strip()
    service_account_json = data.get('service_account_json', '').strip()
    location = data.get('location', 'us-central1')
    
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    
    if not service_account_json:
        return jsonify({'error': 'Service account JSON is required'}), 400
    
    try:
        # Create new vertex account
        vertex_account = VertexServiceAccount(
            user_id=user_id,
            name=name,
            location=location
        )
        
        # This will validate JSON, extract project_id and client_email, and encrypt credentials
        vertex_account.set_encrypted_credentials(service_account_json)
        
        db.session.add(vertex_account)
        db.session.commit()
        
        current_app.logger.info(f"Vertex account created: {vertex_account.name} (project: {vertex_account.project_id})")
        
        return jsonify({
            'message': 'Vertex AI configuration created successfully',
            'account': vertex_account.to_dict()
        }), 201
        
    except ValueError as e:
        # Validation error from set_encrypted_credentials
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating Vertex account: {e}")
        return jsonify({'error': 'Failed to create Vertex AI configuration'}), 500


@bp.route('/api/vertex/accounts', methods=['GET'])
@jwt_required()
def get_vertex_accounts():
    """Get all Vertex AI service account configurations for the current user."""
    from flask_jwt_extended import get_jwt_identity
    from .models import VertexServiceAccount
    
    user_id = get_jwt_identity()
    
    try:
        accounts = VertexServiceAccount.query.filter_by(user_id=user_id).order_by(VertexServiceAccount.created_at.desc()).all()
        
        return jsonify({
            'accounts': [account.to_dict() for account in accounts]
        })
    except Exception as e:
        current_app.logger.error(f"Error getting Vertex accounts: {e}")
        return jsonify({'error': 'Failed to get Vertex AI configurations'}), 500


@bp.route('/api/vertex/accounts/<int:account_id>', methods=['PUT'])
@jwt_required()
def update_vertex_account(account_id):
    """Update a Vertex AI service account configuration."""
    from flask_jwt_extended import get_jwt_identity
    from .models import VertexServiceAccount, db
    
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        # Get the account and verify ownership
        account = VertexServiceAccount.query.filter_by(id=account_id, user_id=user_id).first()
        if not account:
            return jsonify({'error': 'Vertex account not found'}), 404
        
        # Update fields
        if 'name' in data:
            name = data['name'].strip()
            if not name:
                return jsonify({'error': 'Name cannot be empty'}), 400
            account.name = name
        
        if 'location' in data:
            account.location = data['location']
        
        if 'service_account_json' in data:
            service_account_json = data['service_account_json'].strip()
            if service_account_json:
                # This will re-validate and re-encrypt
                account.set_encrypted_credentials(service_account_json)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Vertex AI configuration updated successfully',
            'account': account.to_dict()
        })
        
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating Vertex account: {e}")
        return jsonify({'error': 'Failed to update Vertex AI configuration'}), 500


@bp.route('/api/vertex/accounts/<int:account_id>', methods=['DELETE'])
@jwt_required()
def delete_vertex_account(account_id):
    """Delete a Vertex AI service account configuration."""
    from flask_jwt_extended import get_jwt_identity
    from .models import VertexServiceAccount, UserProfile, db
    
    user_id = get_jwt_identity()
    
    try:
        # Get the account and verify ownership
        account = VertexServiceAccount.query.filter_by(id=account_id, user_id=user_id).first()
        if not account:
            return jsonify({'error': 'Vertex account not found'}), 404
        
        # Check if this account is currently selected in user profile
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        if profile and profile.selected_vertex_account_id == account_id:
            # Clear the selection
            profile.selected_vertex_account_id = None
        
        db.session.delete(account)
        db.session.commit()
        
        current_app.logger.info(f"Vertex account deleted: {account.name} (ID: {account_id})")
        
        return jsonify({'message': 'Vertex AI configuration deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting Vertex account: {e}")
        return jsonify({'error': 'Failed to delete Vertex AI configuration'}), 500


@bp.route('/api/vertex/accounts/<int:account_id>/activate', methods=['POST'])
@jwt_required()
def activate_vertex_account(account_id):
    """Activate a Vertex AI service account (set as selected)."""
    from flask_jwt_extended import get_jwt_identity
    from .models import VertexServiceAccount, UserProfile, db
    
    user_id = get_jwt_identity()
    
    try:
        # Get the account and verify ownership
        account = VertexServiceAccount.query.filter_by(id=account_id, user_id=user_id).first()
        if not account:
            return jsonify({'error': 'Vertex account not found'}), 404
        
        # Get or create user profile
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not profile:
            profile = UserProfile(user_id=user_id)
            db.session.add(profile)
        
        # Set as selected
        profile.selected_vertex_account_id = account_id
        profile.ai_provider = 'vertex_ai'  # Also switch provider to Vertex AI
        
        # Update last_used_at
        account.update_last_used()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Vertex AI account activated successfully',
            'account': account.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error activating Vertex account: {e}")
        return jsonify({'error': 'Failed to activate Vertex AI configuration'}), 500
