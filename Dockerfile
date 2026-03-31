FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential pkg-config \
    libpq-dev \
    libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 libcairo2 libcairo2-dev libffi-dev shared-mime-info \
    fontconfig fonts-noto-cjk fonts-noto-color-emoji \
    ghostscript poppler-utils curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt
COPY . .

# Core app / Flask runtime
ENV PORT=8080
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV FLASK_APP=run.py
ENV FLASK_ENV=production

# JWT request/cookie behavior
ENV JWT_COOKIE_SECURE=true
ENV JWT_COOKIE_SAMESITE=Lax
ENV JWT_COOKIE_CSRF_PROTECT=false

# Google Cloud configuration
ENV GCS_BUCKET_NAME=steup-growth
ENV GOOGLE_CLOUD_LOCATION=global
ENV GEMINI_MODEL=gemini-3-flash-preview
# IMPORTANT: Set GOOGLE_CLOUD_PROJECT via Cloud Run environment variables.
# In Cloud Run, credentials are provided by the attached service account (ADC).

# RAG PDF conversion (ZeroX)
ENV RAG_PDF_MODEL=vertex_ai/gemini-3-flash-preview
ENV RAG_ZEROX_CONCURRENCY=10
ENV RAG_ZEROX_PAGE_BATCH_SIZE=20                                                
ENV RAG_ZEROX_MAINTAIN_FORMAT=false                                          
ENV RAG_ZEROX_TIMEOUT_SECONDS=300                                             
ENV RAG_ZEROX_TIMEOUT_RETRY=false                                             

# Firebase Auth                                    
ENV FIREBASE_AUTH_DOMAIN=fyp-project-4f3b7.firebaseapp.com
ENV FIREBASE_PROJECT_ID=fyp-project-4f3b7
# FIREBASE_CREDENTIALS_PATH intentionally not set in image (Firebase Admin SDK remains disabled).

ENV POSE_DETECTION_ENABLED=false
ENV USE_CLOUD_TASKS=true
ENV RUN_DB_MIGRATIONS_ON_STARTUP=false

EXPOSE 8080
CMD ["sh", "-c", "if [ \"${RUN_DB_MIGRATIONS_ON_STARTUP}\" = \"true\" ]; then flask db -d /app/migrations upgrade; fi && gunicorn --worker-class gthread --threads 8 -w 1 --bind 0.0.0.0:${PORT} --timeout 120 --keep-alive 5 --log-level info run:app"]