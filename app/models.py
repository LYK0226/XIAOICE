from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'avatar': self.avatar,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active
        }

class UserProfile(db.Model):
    __tablename__ = 'user_profiles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    language = db.Column(db.String(20), default='zh-CN')
    theme = db.Column(db.String(20), default='light')
    background_type = db.Column(db.String(20), default='gradient')
    background_value = db.Column(db.Text, default='linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
    bot_avatar = db.Column(db.Text)
    selected_api_key_id = db.Column(db.Integer, db.ForeignKey('user_api_keys.id'), nullable=True)
    ai_model = db.Column(db.String(50), default='gemini-2.5-flash')  # Add AI model selection
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = db.relationship('User', backref='profile')
    selected_api_key = db.relationship('UserApiKey', foreign_keys=[selected_api_key_id])
    
    def __repr__(self):
        return f'<UserProfile {self.user_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'language': self.language,
            'theme': self.theme,
            'background_type': self.background_type,
            'background_value': self.background_value,
            'bot_avatar': self.bot_avatar,
            'selected_api_key_id': self.selected_api_key_id,
            'ai_model': self.ai_model
        }

class UserApiKey(db.Model):
    __tablename__ = 'user_api_keys'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=True)
    encrypted_key = db.Column(db.Text, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship back to user
    user = db.relationship('User', backref='api_keys')
    
    def __repr__(self):
        return f'<UserApiKey {self.name or self.id}>'
    
    def to_dict(self, show_key=False):
        """Return dict representation, optionally showing decrypted key"""
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if show_key:
            result['decrypted_key'] = self.get_decrypted_key()
        else:
            # Show masked key for security
            decrypted = self.get_decrypted_key()
            if decrypted and len(decrypted) > 8:
                result['masked_key'] = decrypted[:4] + '*' * (len(decrypted) - 8) + decrypted[-4:]
            else:
                result['masked_key'] = '*' * len(decrypted) if decrypted else ''
        return result
    
    def set_encrypted_key(self, plain_key):
        """Encrypt and store the API key"""
        from cryptography.fernet import Fernet
        import base64
        import os
        
        # Use a fixed key for encryption (in production, use environment variable)
        encryption_key = os.environ.get('ENCRYPTION_KEY')
        if not encryption_key:
            # Generate a key if not set (for development)
            encryption_key = base64.urlsafe_b64encode(os.urandom(32)).decode()
            # In production, this should be set in environment
        
        cipher = Fernet(encryption_key.encode())
        self.encrypted_key = cipher.encrypt(plain_key.encode()).decode()
    
    def get_decrypted_key(self):
        """Decrypt and return the API key"""
        if not self.encrypted_key:
            return None
            
        from cryptography.fernet import Fernet
        import base64
        import os
        
        encryption_key = os.environ.get('ENCRYPTION_KEY')
        if not encryption_key:
            # For development, try to decrypt with generated key (won't work)
            return None
        
        try:
            cipher = Fernet(encryption_key.encode())
            return cipher.decrypt(self.encrypted_key.encode()).decode()
        except Exception:
            return None
