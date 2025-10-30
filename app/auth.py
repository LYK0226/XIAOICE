from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from .models import db, User, UserProfile
import re

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

def validate_email(email):
    """Validate email format."""
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength (at least 6 characters)."""
    return len(password) >= 6

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
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Handle user logout."""
    return jsonify({'message': 'Logged out successfully'}), 200

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

@auth_bp.route('/check', methods=['GET'])
@jwt_required(optional=True)
def check_auth():
    """Check if user is authenticated."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if user:
            return jsonify({
                'authenticated': True,
                'user': user.to_dict()
            }), 200
    except:
        pass

    return jsonify({
        'authenticated': False
    }), 200

# ============================================================================
# Password Reset Functionality
# ============================================================================

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Handle password reset request."""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        # Check if user exists
        user = User.query.filter_by(email=email).first()

        if not user:
            # Don't reveal if email exists or not for security
            return jsonify({
                'message': 'If an account with this email exists, a password reset link has been sent.'
            }), 200

        # In a real application, you would:
        # 1. Generate a secure reset token
        # 2. Store it in database with expiration
        # 3. Send email with reset link
        # For now, we'll just return a success message

        # TODO: Implement actual password reset functionality
        # - Generate secure token
        # - Store in database with expiration
        # - Send email with reset link

        return jsonify({
            'message': 'Password reset link sent! Please check your email.'
        }), 200

    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@auth_bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    """Handle password reset with token."""
    try:
        data = request.get_json()
        new_password = data.get('password', '')

        if not new_password:
            return jsonify({'error': 'New password is required'}), 400

        if not validate_password(new_password):
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        # TODO: Implement token validation
        # - Verify token exists and is not expired
        # - Get user from token
        # - Update password
        # - Delete used token

        # For now, return success
        return jsonify({
            'message': 'Password reset successfully!'
        }), 200

    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500
