import os
from flask import Flask, send_from_directory, redirect, url_for
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from config import config
from models import db
from routes import api_bp

# Load environment variables
load_dotenv()

def create_app(config_name=None):
    """Create and configure Flask application"""
    
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    # Get the path to frontend files
    # Try multiple paths for Docker and local development
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)
    
    # Possible frontend paths
    possible_paths = [
        os.path.join(parent_dir, 'frontend'),      # Local: ../frontend
        os.path.join(current_dir, 'frontend'),     # Local: ./frontend
        os.path.join(current_dir, '../frontend'),  # Docker: ../frontend
        '/app/frontend',                            # Docker explicit path
    ]
    
    frontend_path = None
    for path in possible_paths:
        if os.path.isdir(path):
            frontend_path = path
            break
    
    # Fallback to current directory if no frontend folder found
    if frontend_path is None:
        frontend_path = current_dir
    
    app = Flask(__name__, static_folder=frontend_path, static_url_path='')
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, resources={
        r"/api/*": {
            "origins": ["*"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    JWTManager(app)
    
    # Register blueprints
    app.register_blueprint(api_bp)
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    # Serve static files
    @app.route('/')
    def index():
        """Redirect root to login page"""
        return redirect('/login.html')
    
    @app.route('/<path:filename>')
    def serve_static(filename):
        """Serve static files from frontend folder"""
        return send_from_directory(frontend_path, filename)
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
