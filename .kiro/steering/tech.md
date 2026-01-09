# Technology Stack

## Backend

- **Framework**: Flask 3.1.2 with Flask-SocketIO 5.4.1 for WebSocket support
- **Database**: SQLAlchemy ORM with Flask-Migrate for migrations (supports SQLite, PostgreSQL)
- **Authentication**: Flask-JWT-Extended 4.7.1 with JWT tokens
- **AI/ML**: 
  - Google ADK 1.18.0 (multi-agent system)
  - Google GenAI 1.52.0
  - MediaPipe 0.10.14 (pose detection)
  - OpenCV 4.10.0 (image processing)
  - NumPy 2.2.6 (numerical operations)
- **Storage**: Google Cloud Storage 3.5.0 for file uploads
- **Security**: Cryptography 46.0.3 for API key encryption
- **Server**: Gunicorn 23.0.0, Eventlet 0.37.0

## Frontend

- **Vanilla JavaScript** with modular architecture
- **WebSocket** for real-time communication
- **Canvas API** for pose visualization
- **WebRTC** for webcam access

## Testing

- **pytest** 9.0.1+ for unit tests
- **Hypothesis** 6.148.7 for property-based testing

## Development Environment

- **Docker**: Dev container with docker-compose for PostgreSQL and pgAdmin
- **Python**: 3.8+ required
- **Virtual Environment**: `.venv` for dependency isolation

## Common Commands

### Setup
```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.\.venv\Scripts\Activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Initialize database
flask db init
flask db migrate
flask db upgrade
```

### Running
```bash
# Development server
python run.py

# Or with Flask CLI
flask --debug run --host=0.0.0.0

# Docker environment
cd .devcontainer && docker-compose up -d
```

### Testing
```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest test/test_api.py

# Property-based tests with more iterations
pytest --hypothesis-iterations=200
```

### Database Management
```bash
# View database contents
python view_database.py

# View specific tables
python view_database.py users
python view_database.py profiles
python view_database.py stats

# Search users
python view_database.py search "username"

# Delete user (careful!)
python view_database.py delete <user_id>
```

### API Testing
```bash
# Test API connectivity
python test/check_api_keys.py
```

## Configuration

All configuration is managed through `.env` file (copy from `.env.example`):

- `SECRET_KEY`, `JWT_SECRET_KEY`: Flask and JWT secrets
- `ENCRYPTION_KEY`: Fernet key for API key encryption (never commit!)
- `GOOGLE_API_KEY`: Default Google AI API key
- `GEMINI_MODEL`: Default model (e.g., gemini-2.5-flash)
- `DATABASE_URL`: Database connection string
- `GCS_BUCKET_NAME`, `GCS_CREDENTIALS_PATH`: Google Cloud Storage config
- `POSE_*`: Pose detection configuration (enabled, model complexity, confidence thresholds)

## Key Libraries

- **google-adk**: Multi-agent framework with coordinator and specialized agents
- **mediapipe**: Real-time pose estimation with 33 keypoints
- **flask-socketio**: WebSocket events for streaming responses and pose data
- **cryptography**: Fernet encryption for secure API key storage
- **pillow**: Image processing and validation
