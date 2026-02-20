import os
from flask import Flask, send_from_directory
from dotenv import load_dotenv
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager

# Load environment variables from .env file
load_dotenv()

# Import the shared `db` instance from models and create a Migrate instance
from .models import db, User
migrate = Migrate()
jwt = JWTManager()

# Initialize Flask-SocketIO (used by socket_events and run.py)
from flask_socketio import SocketIO
# Create the SocketIO server instance; CORS is allowed for development
socketio = SocketIO(cors_allowed_origins='*')

# Module-level holder for the created app; set by create_app() so that
# background threads (e.g. ADK agent tools) can push an app context even
# when no Flask request context is active.
_app_instance = None


def get_app():
    """Return the current Flask app instance (or None if not yet created)."""
    return _app_instance


def create_app():
    """Create and configure an instance of the Flask application."""
    app = Flask(__name__)

    # Load configuration from app/config.py
    app.config.from_object('app.config.Config')

    # Initialize database (SQLAlchemy)
    db.init_app(app)
    
    # Initialize Flask-Migrate to expose `flask db` commands
    try:
        migrate.init_app(app, db)
    except Exception:
        # If flask-migrate is not available or fails, continue without CLI commands
        pass
    
    # Initialize Flask-JWT-Extended
    jwt.init_app(app)

    # Initialize Flask-SocketIO with the app
    # Allow configuring CORS origins via app config if needed
    socketio.init_app(app, cors_allowed_origins=app.config.get('CORS_ALLOWED_ORIGINS', '*'))

    # Create an uploads folder if it doesn't exist
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    # Register blueprints
    from . import routes
    from . import auth
    # Video endpoints extracted to a separate module (renamed)
    from . import video_access_routes

    app.register_blueprint(routes.bp)
    app.register_blueprint(auth.auth_bp)
    app.register_blueprint(video_access_routes.bp)

    # Import socket events to register WebSocket handlers (must be after socketio exists)
    from . import socket_events
    
    # Register additional static routes for video questions
    videos_quesyions_path = os.path.join(os.path.dirname(__file__), 'videos_quesyions')
    if os.path.exists(videos_quesyions_path):
        @app.route('/static/videos_quesyions/<path:filename>')
        def serve_videos_quesyions(filename):
            return send_from_directory(videos_quesyions_path, filename)

    # Optionally create tables on startup (development convenience)
    if app.config.get('CREATE_DB_ON_STARTUP'):
        try:
            with app.app_context():
                # Ensure pgvector extension exists (required for RAG vector columns)
                if 'postgresql' in app.config.get('SQLALCHEMY_DATABASE_URI', ''):
                    try:
                        db.session.execute(db.text('CREATE EXTENSION IF NOT EXISTS vector'))
                        db.session.commit()
                    except Exception:
                        db.session.rollback()
                db.create_all()
        except Exception:
            # If create_all fails, don't crash the app startup; log is available when running
            pass

    # Store reference so background threads can push an app context
    global _app_instance
    _app_instance = app

    return app