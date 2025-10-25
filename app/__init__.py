import os
from flask import Flask
from dotenv import load_dotenv
from flask_migrate import Migrate
from flask_login import LoginManager

# Load environment variables from .env file
load_dotenv()

# Import the shared `db` instance from models and create a Migrate instance
from .models import db, User
migrate = Migrate()
login_manager = LoginManager()

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
    
    # Initialize Flask-Login
    login_manager.init_app(app)
    login_manager.login_view = 'main.login_page'
    login_manager.login_message = 'Please log in to access this page.'
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Create an uploads folder if it doesn't exist
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    # Register blueprints
    from . import routes
    from . import auth
    app.register_blueprint(routes.bp)
    app.register_blueprint(auth.auth_bp)

    # Optionally create tables on startup (development convenience)
    if app.config.get('CREATE_DB_ON_STARTUP'):
        try:
            with app.app_context():
                db.create_all()
        except Exception:
            # If create_all fails, don't crash the app startup; log is available when running
            pass

    return app
