import os
from flask import Flask
from dotenv import load_dotenv
from flask_migrate import Migrate

# Load environment variables from .env file
load_dotenv()

# Import the shared `db` instance from models and create a Migrate instance
from .models import db
migrate = Migrate()

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

    # Create an uploads folder if it doesn't exist
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    # Register blueprints
    from . import routes
    app.register_blueprint(routes.bp)

    # Optionally create tables on startup (development convenience)
    if app.config.get('CREATE_DB_ON_STARTUP'):
        try:
            with app.app_context():
                db.create_all()
        except Exception:
            # If create_all fails, don't crash the app startup; log is available when running
            pass

    return app
