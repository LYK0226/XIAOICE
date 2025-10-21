from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import config
from models import db
from routes import api_bp
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object(config['default'])
    
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    JWTManager(app)
    app.register_blueprint(api_bp)
    
    @app.route('/') 
    def index():
        return send_from_directory('../frontend', 'index.html')
    
    @app.route('/<path:f>')
    def serve(f):
        return send_from_directory('../frontend', f)
    
    with app.app_context():
        db.create_all()
    
    return app

if __name__ == '__main__':
    create_app().run(host='0.0.0.0', port=5000)
