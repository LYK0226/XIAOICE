import os

class Config:
    """Set Flask configuration variables from .env file."""

    # General Config
    SECRET_KEY = os.environ.get('SECRET_KEY', 'a_default_secret_key')
    FLASK_APP = os.environ.get('FLASK_APP', 'run.py')
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development')

    # Google AI Studio
    GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
    
    # Gemini Model
    GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-1.5-flash')

    # Uploads
    UPLOAD_FOLDER = 'app/static/uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB

    # Database
    # Use DATABASE_URL environment variable if provided (Postgres, MySQL, etc.),
    # otherwise fall back to a local SQLite file at project root.
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # When True, create DB tables automatically on app startup (useful for dev)
    CREATE_DB_ON_STARTUP = os.environ.get('CREATE_DB_ON_STARTUP', 'true').lower() == 'true'

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt_default_secret_key')
