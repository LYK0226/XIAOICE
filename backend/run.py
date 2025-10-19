#!/usr/bin/env python3
"""
Run script for XIAOICE Flask application
"""
import os
import sys
from app import create_app

# Get environment
env = os.getenv('FLASK_ENV', 'development')

# Create app (at module level for Gunicorn)
app = create_app(env)

if __name__ == '__main__':
    # Run app
    print(f"Starting XIAOICE API Server in {env} mode...")
    print(f"Server running at: http://localhost:5000")
    print(f"API documentation: http://localhost:5000/api/health")
    print(f"Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
    
    app.run(
        debug=app.config['DEBUG'],
        host='0.0.0.0',
        port=5000,
        use_reloader=True
    )
