import os

class Config:
    """Set Flask configuration variables from .env file."""

    # General Config
    SECRET_KEY = os.environ.get('SECRET_KEY', 'a_default_secret_key')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)
    FLASK_APP = os.environ.get('FLASK_APP', 'run.py')
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
    
    # Gemini Model
    GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')

    # Uploads
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'upload')
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB

    # Google Cloud Storage
    GCS_BUCKET_NAME = os.environ.get('GCS_BUCKET_NAME')
    GCS_CREDENTIALS_PATH = os.environ.get('GCS_CREDENTIALS_PATH')

    # Database
    # Use DATABASE_URL environment variable if provided (Postgres, MySQL, etc.),
    # otherwise fall back to a local SQLite file at project root.
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # When True, create DB tables automatically on app startup (useful for dev)
    CREATE_DB_ON_STARTUP = os.environ.get('CREATE_DB_ON_STARTUP', 'true').lower() == 'true'

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt_default_secret_key')

    # JWT token handling (support both Authorization header and secure cookies)
    JWT_TOKEN_LOCATION = ['headers', 'cookies', 'query_string']
    JWT_HEADER_NAME = os.environ.get('JWT_HEADER_NAME', 'Authorization')
    JWT_HEADER_TYPE = os.environ.get('JWT_HEADER_TYPE', 'Bearer')
    JWT_ACCESS_COOKIE_NAME = os.environ.get('JWT_ACCESS_COOKIE_NAME', 'access_token')
    JWT_REFRESH_COOKIE_NAME = os.environ.get('JWT_REFRESH_COOKIE_NAME', 'refresh_token')
    JWT_COOKIE_SECURE = os.environ.get('JWT_COOKIE_SECURE', 'false').lower() == 'true'
    JWT_COOKIE_SAMESITE = os.environ.get('JWT_COOKIE_SAMESITE', 'Lax')
    # Disable CSRF protection for cookie-based JWTs since we pair them with Authorization headers
    JWT_COOKIE_CSRF_PROTECT = os.environ.get('JWT_COOKIE_CSRF_PROTECT', 'false').lower() == 'true'

    # Pose Detection Configuration
    POSE_DETECTION_ENABLED = os.environ.get('POSE_DETECTION_ENABLED', 'true').lower() == 'true'
    POSE_MODEL_COMPLEXITY = int(os.environ.get('POSE_MODEL_COMPLEXITY', '1'))  # 0=lite, 1=full, 2=heavy
    POSE_MIN_DETECTION_CONFIDENCE = float(os.environ.get('POSE_MIN_DETECTION_CONFIDENCE', '0.5'))
    POSE_MIN_TRACKING_CONFIDENCE = float(os.environ.get('POSE_MIN_TRACKING_CONFIDENCE', '0.5'))
    POSE_MAX_CONCURRENT_SESSIONS = int(os.environ.get('POSE_MAX_CONCURRENT_SESSIONS', '50'))
    POSE_FRAME_SIZE_LIMIT_MB = int(os.environ.get('POSE_FRAME_SIZE_LIMIT_MB', '5'))
