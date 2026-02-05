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
    language = db.Column(db.String(20), default='zh-TW')
    theme = db.Column(db.String(20), default='light')
    bot_avatar = db.Column(db.Text)
    selected_api_key_id = db.Column(db.Integer, db.ForeignKey('user_api_keys.id'), nullable=True)
    ai_model = db.Column(db.String(50), default='gemini-3-flash')  # Add AI model selection
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


class Conversation(db.Model):
    __tablename__ = 'conversations'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False, default='New Conversation')
    is_pinned = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('conversations', lazy='dynamic', cascade='all, delete-orphan'))
    messages = db.relationship('Message', backref='conversation', lazy='dynamic', cascade='all, delete-orphan', order_by='Message.created_at')

    def __repr__(self):
        return f'<Conversation {self.id}>'

    def to_dict(self, include_messages=False):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'is_pinned': self.is_pinned,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_messages:
            data['messages'] = [message.to_dict() for message in self.messages.all()]
        return data


class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False, index=True)
    sender = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    meta = db.Column('metadata', db.JSON, nullable=True)
    uploaded_files = db.Column(db.JSON, nullable=True)  # List of relative paths to uploaded files
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        db.CheckConstraint("sender IN ('user', 'assistant')", name='ck_messages_sender'),
    )

    def __repr__(self):
        return f'<Message {self.id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'sender': self.sender,
            'content': self.content,
            'metadata': self.meta,
            'uploaded_files': self.uploaded_files,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class FileUpload(db.Model):
    __tablename__ = 'file_uploads'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)  # Original filename
    file_path = db.Column(db.Text, nullable=False)  # GCS URL or file path
    storage_key = db.Column(db.String(512), nullable=True, index=True)  # GCS object name/key (e.g., chatbox/123/uuid.ext)
    file_type = db.Column(db.String(50), nullable=False)  # File extension/type (e.g., 'pdf', 'jpg', 'docx')
    content_type = db.Column(db.String(100), nullable=False)  # MIME type
    upload_category = db.Column(db.String(50), nullable=True, index=True)  # Category: chatbox, video_assess, etc.
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=True, index=True)
    file_size = db.Column(db.BigInteger, nullable=False, default=0)  # File size in bytes
    uploaded_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)  # Soft delete timestamp
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id', ondelete='CASCADE'), nullable=True, index=True)

    # Relationships
    user = db.relationship('User', backref=db.backref('file_uploads', lazy='dynamic', cascade='all, delete-orphan'))
    conversation = db.relationship('Conversation', backref=db.backref('file_uploads', lazy='dynamic', cascade='all, delete-orphan'))
    message = db.relationship('Message', backref=db.backref('file_uploads', lazy='dynamic'))

    def __repr__(self):
        return f'<FileUpload {self.filename}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'filename': self.filename,
            'file_path': self.file_path,
            'storage_key': self.storage_key,
            'file_type': self.file_type,
            'content_type': self.content_type,
            'upload_category': self.upload_category,
            'file_size': self.file_size,
            'conversation_id': self.conversation_id,
            'message_id': self.message_id,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None
        }
class ChildDevelopmentAssessmentRecord(db.Model):
    """
    Child Development Assessment Record based on WS/T 580—2017 Standard
    Stores assessment history for 0-6 year old children
    """
    __tablename__ = 'child_development_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.String(36), unique=True, nullable=False, index=True)  # UUID for unique assessment
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    child_name = db.Column(db.String(100), nullable=False)
    child_age_months = db.Column(db.Float, nullable=False)  # Precise monthly age (e.g., 24.5)
    
    # Assessment questions and answers
    questions = db.Column(db.JSON, nullable=True)  # List of questions with IDs
    answers = db.Column(db.JSON, nullable=True)    # User's answers {item_id: passed_bool}
    
    # Results from WS/T 580—2017 Standard
    overall_dq = db.Column(db.Float, nullable=True)           # DQ (Developmental Quotient)
    dq_level = db.Column(db.String(50), nullable=True)        # Classification: excellent/good/normal/borderline_low/disability
    total_mental_age = db.Column(db.Float, nullable=True)     # Calculated mental age in months
    
    # Per-domain results (5 domains: gross_motor, fine_motor, language, adaptive, social_behavior)
    area_results = db.Column(db.JSON, nullable=True)          # {domain_id: {passed_items, mental_age, status}}
    
    # Recommendations and suggestions
    recommendations = db.Column(db.JSON, nullable=True)       # {domain_id: {status, suggestion}}
    
    # PDF and metadata
    pdf_filename = db.Column(db.String(255), nullable=True)
    pdf_content_summary = db.Column(db.Text, nullable=True)   # Summary of PDF content used for assessment
    
    # Status tracking
    is_completed = db.Column(db.Boolean, default=False, index=True)
    standard = db.Column(db.String(50), default='WS/T 580—2017')  # Standard version
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('assessments', cascade='all, delete-orphan'))
    
    def __repr__(self):
        return f'<ChildDevelopmentAssessment {self.assessment_id}>'
    
    def to_dict(self, include_answers=False):
        """Convert to dictionary format for JSON responses"""
        data = {
            'assessment_id': self.assessment_id,
            'user_id': self.user_id,
            'child_name': self.child_name,
            'child_age_months': self.child_age_months,
            'overall_dq': self.overall_dq,
            'dq_level': self.dq_level,
            'total_mental_age': self.total_mental_age,
            'area_results': self.area_results,
            'recommendations': self.recommendations,
            'is_completed': self.is_completed,
            'standard': self.standard,
            'created_at': self.created_at.isoformat() if self.created_at else None,
			'updated_at': self.updated_at.isoformat() if self.updated_at else None,
			'completed_at': self.completed_at.isoformat() if self.completed_at else None,
			'pdf_filename': self.pdf_filename,
			'pdf_content_summary': self.pdf_content_summary,
		}
        
        if include_answers:
            data['questions'] = self.questions
            data['answers'] = self.answers
        
        return data


class PoseAssessmentRun(db.Model):
    """Stores a user's pose/action assessment run (from /pose_detection)."""

    __tablename__ = 'pose_assessment_runs'

    id = db.Column(db.Integer, primary_key=True)
    run_id = db.Column(db.String(36), unique=True, nullable=False, index=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    # Raw payload from frontend (steps, timings, detected actions, etc.)
    payload = db.Column(db.JSON, nullable=False)

    # Computed scoring/evaluation summary
    evaluation = db.Column(db.JSON, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    user = db.relationship('User', backref=db.backref('pose_assessment_runs', cascade='all, delete-orphan'))

    def to_dict(self, include_payload=True):
        data = {
            'run_id': self.run_id,
            'user_id': self.user_id,
            'evaluation': self.evaluation,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_payload:
            data['payload'] = self.payload
        return data


class VideoRecord(db.Model):
    __tablename__ = 'video_records'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    storage_key = db.Column(db.String(512), nullable=True, index=True)
    file_size = db.Column(db.Integer)
    duration = db.Column(db.Float)
    full_transcription = db.Column(db.Text)
    transcription_status = db.Column(db.String(50), default='pending')
    analysis_report = db.Column(db.JSON)
    analysis_status = db.Column(db.String(50), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('videos', cascade='all, delete-orphan'))
    timestamps = db.relationship('VideoTimestamp', backref='video', cascade='all, delete-orphan', lazy='dynamic')
    
    def __repr__(self):
        return f'<VideoRecord {self.id}>'
    
    def to_dict(self, include_timestamps=False):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'storage_key': self.storage_key,
            'file_size': self.file_size,
            'duration': self.duration,
            'full_transcription': self.full_transcription,
            'transcription_status': self.transcription_status,
            'analysis_report': self.analysis_report,
            'analysis_status': self.analysis_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_timestamps:
            data['timestamps'] = [ts.to_dict() for ts in self.timestamps]
        
        return data


class VideoTimestamp(db.Model):
    """Model for storing 1-minute segment transcriptions"""
    __tablename__ = 'video_timestamps'
    
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey('video_records.id'), nullable=False, index=True)
    start_time = db.Column(db.Float)  # in seconds
    end_time = db.Column(db.Float)  # in seconds
    text = db.Column(db.Text)  # transcription text for this segment
    formatted_time = db.Column(db.String(20))  # HH:MM:SS format
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<VideoTimestamp {self.id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'video_id': self.video_id,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'text': self.text,
            'formatted_time': self.formatted_time,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

