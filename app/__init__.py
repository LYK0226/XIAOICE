import os
from flask import Flask
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def create_app():
    """Create and configure an instance of the Flask application."""
    app = Flask(__name__)

    # Load configuration from config.py
    app.config.from_object('config.Config')

    # Create an uploads folder if it doesn't exist
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    # Register blueprints
    from . import routes
    app.register_blueprint(routes.bp)

    return app
