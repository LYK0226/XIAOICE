import os

class Config:
    """Set Flask configuration variables from .env file."""

    # General Config
    SECRET_KEY = os.environ.get('SECRET_KEY', 'a_default_secret_key')
    FLASK_APP = os.environ.get('FLASK_APP', 'run.py')
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development')

    # Google Cloud
    GOOGLE_APPLICATION_CREDENTIALS = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    GCP_PROJECT_ID = os.environ.get('GCP_PROJECT_ID')
    GCP_LOCATION = os.environ.get('GCP_LOCATION', 'us-central1')

    # Vertex AI
    VERTEX_AI_MODEL = os.environ.get('VERTEX_AI_MODEL', 'gemini-1.5-flash-001')

    # Uploads
    UPLOAD_FOLDER = 'app/static/uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB
