from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User, UserProfile
import re

api_bp = Blueprint('api', __name__, url_prefix='/api')

def err(msg, code=400):
    return jsonify({'error': msg, 'success': False}), code

def ok(data=None, msg='OK', code=200):
    return jsonify({'success': True, 'message': msg, 'data': data}), code

@api_bp.route('/signup', methods=['POST'])
def signup():
    try:
        d = request.get_json() or {}
        u, e, p, c = d.get('username', '').strip(), d.get('email', '').strip(), d.get('password', ''), d.get('confirm_password', '')
        
        if not (3 <= len(u) <= 80 and re.match(r'^[a-zA-Z0-9_]+$', u)):
            return err('Invalid username')
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', e):
            return err('Invalid email')
        if len(p) < 6:
            return err('Password too short')
        if p != c:
            return err('Passwords don\'t match')
        
        if User.query.filter((User.username == u) | (User.email == e)).first():
            return err('User exists', 409)
        
        user = User(username=u, email=e)
        user.set_password(p)
        db.session.add(user)
        db.session.flush()
        db.session.add(UserProfile(user_id=user.id))
        db.session.commit()
        
        return ok({'user': user.to_dict(), 'access_token': create_access_token(identity=user.id)}, 'Registered', 201)
    except Exception as e:
        db.session.rollback()
        return err(f'Error: {str(e)}', 500)

@api_bp.route('/login', methods=['POST'])
def login():
    try:
        d = request.get_json() or {}
        e, p = d.get('email', '').strip(), d.get('password', '')
        
        if not e or not p:
            return err('Missing credentials')
        
        user = User.query.filter_by(email=e).first()
        if not user or not user.check_password(p):
            return err('Invalid credentials', 401)
        
        prof = user.profile[0] if user.profile else None
        return ok({'user': user.to_dict(), 'profile': prof.to_dict() if prof else None, 'access_token': create_access_token(identity=user.id)})
    except Exception as e:
        return err(str(e), 500)

@api_bp.route('/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user = User.query.get(get_jwt_identity())
        if not user:
            return err('Not found', 404)
        prof = user.profile[0] if user.profile else None
        return ok({'user': user.to_dict(), 'profile': prof.to_dict() if prof else None})
    except Exception as e:
        return err(str(e), 500)

@api_bp.route('/health', methods=['GET'])
def health():
    return ok(None, 'Running')

@api_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        d = request.get_json() or {}
        e, p = d.get('email', '').strip().lower(), d.get('new_password', '')
        
        if not e or not p:
            return err('Missing email or password')
        
        if len(p) < 6:
            return err('Password too short')
        
        user = User.query.filter_by(email=e).first()
        if not user:
            return err('User not found', 404)
        
        user.set_password(p)
        db.session.commit()
        
        return ok(None, 'Password reset successfully')
    except Exception as e:
        db.session.rollback()
        return err(str(e), 500)

