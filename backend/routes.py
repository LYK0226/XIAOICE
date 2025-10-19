from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User, UserProfile
from functools import wraps
import re

# Create blueprint
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Helper functions
def validate_email(email):
    """Validate email format"""
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

def validate_username(username):
    """Validate username format"""
    if len(username) < 3 or len(username) > 80:
        return False
    # Only allow alphanumeric and underscore
    return re.match(r'^[a-zA-Z0-9_]+$', username) is not None

def validate_password(password):
    """Validate password strength"""
    return len(password) >= 6

# Error response helper
def error_response(message, status_code=400):
    """Generate error response"""
    return jsonify({'error': message, 'success': False}), status_code

def success_response(data, message='Success', status_code=200):
    """Generate success response"""
    response = {
        'success': True,
        'message': message,
    }
    if data:
        response['data'] = data
    return jsonify(response), status_code

# Routes

@api_bp.route('/signup', methods=['POST'])
def signup():
    """
    Register a new user
    Expected JSON:
    {
        "username": "string",
        "email": "string",
        "password": "string",
        "confirm_password": "string"
    }
    """
    try:
        data = request.get_json()
        
        # Validate input
        if not data:
            return error_response('No data provided')
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        
        # Validation checks
        if not username or not validate_username(username):
            return error_response('Invalid username. Must be 3-80 characters, alphanumeric and underscore only.')
        
        if not email or not validate_email(email):
            return error_response('Invalid email format.')
        
        if not password or not validate_password(password):
            return error_response('Password must be at least 6 characters.')
        
        if password != confirm_password:
            return error_response('Passwords do not match.')
        
        # Check if user already exists
        existing_user = User.query.filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if existing_user:
            if existing_user.username == username:
                return error_response('Username already exists.', 409)
            else:
                return error_response('Email already exists.', 409)
        
        # Create new user
        user = User(username=username, email=email)
        user.set_password(password)
        
        db.session.add(user)
        db.session.flush()  # Get user ID without committing
        
        # Create user profile
        profile = UserProfile(user_id=user.id)
        db.session.add(profile)
        
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        return success_response({
            'user': user.to_dict(),
            'access_token': access_token
        }, 'User registered successfully.', 201)
    
    except Exception as e:
        db.session.rollback()
        return error_response(f'Error during registration: {str(e)}', 500)


@api_bp.route('/login', methods=['POST'])
def login():
    """
    Login user
    Expected JSON:
    {
        "email": "string",
        "password": "string"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return error_response('No data provided')
        
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not email or not password:
            return error_response('Email and password are required.')
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            return error_response('Invalid email or password.', 401)
        
        if not user.is_active:
            return error_response('User account is inactive.', 403)
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        # Get user profile (use first() since it's a relationship)
        profile = user.profile[0] if user.profile else None
        
        return success_response({
            'user': user.to_dict(),
            'profile': profile.to_dict() if profile else None,
            'access_token': access_token
        }, 'Login successful.')
    
    except Exception as e:
        return error_response(f'Error during login: {str(e)}', 500)


@api_bp.route('/user/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    """
    Get current user profile
    Requires JWT token
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return error_response('User not found.', 404)
        
        profile = user.profile[0] if user.profile else None
        
        return success_response({
            'user': user.to_dict(),
            'profile': profile.to_dict() if profile else None
        }, 'Profile retrieved successfully.')
    
    except Exception as e:
        return error_response(f'Error retrieving profile: {str(e)}', 500)


@api_bp.route('/user/profile', methods=['PUT'])
@jwt_required()
def update_user_profile():
    """
    Update user profile
    Requires JWT token
    Expected JSON:
    {
        "language": "string",
        "theme": "string",
        "background_type": "string",
        "background_value": "string",
        "bot_avatar": "string"
    }
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return error_response('User not found.', 404)
        
        data = request.get_json()
        profile = user.profile[0] if user.profile else None
        
        if not profile:
            profile = UserProfile(user_id=user_id)
            db.session.add(profile)
        
        # Update profile fields if provided
        if 'language' in data:
            profile.language = data['language']
        if 'theme' in data:
            profile.theme = data['theme']
        if 'background_type' in data:
            profile.background_type = data['background_type']
        if 'background_value' in data:
            profile.background_value = data['background_value']
        if 'bot_avatar' in data:
            profile.bot_avatar = data['bot_avatar']
        
        db.session.commit()
        
        return success_response({
            'profile': profile.to_dict()
        }, 'Profile updated successfully.')
    
    except Exception as e:
        db.session.rollback()
        return error_response(f'Error updating profile: {str(e)}', 500)


@api_bp.route('/user/avatar', methods=['PUT'])
@jwt_required()
def update_avatar():
    """
    Update user avatar
    Requires JWT token
    Expected JSON:
    {
        "avatar": "base64_string_or_url"
    }
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return error_response('User not found.', 404)
        
        data = request.get_json()
        
        if 'avatar' in data:
            user.avatar = data['avatar']
            db.session.commit()
        
        return success_response({
            'user': user.to_dict()
        }, 'Avatar updated successfully.')
    
    except Exception as e:
        db.session.rollback()
        return error_response(f'Error updating avatar: {str(e)}', 500)


@api_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return success_response(None, 'API is running.')


@api_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """
    Reset user password
    Expected JSON:
    {
        "email": "user@example.com",
        "new_password": "newpassword123"
    }
    """
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        new_password = data.get('new_password', '').strip()
        
        # Validate input
        if not email or not new_password:
            return error_response('Email and password are required', 400)
        
        if not validate_email(email):
            return error_response('Invalid email format', 400)
        
        if not validate_password(new_password):
            return error_response('Password must be at least 6 characters', 400)
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Security: Don't reveal if email exists
            return error_response('If an account with this email exists, password has been reset', 200)
        
        # Update password
        from werkzeug.security import generate_password_hash
        user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        
        return success_response({
            'email': user.email,
            'username': user.username
        }, 'Password reset successfully. Please login with your new password.')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'Error resetting password: {str(e)}', 500)
