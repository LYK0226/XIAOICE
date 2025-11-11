import os
from google.cloud import storage
from flask import current_app
import tempfile
from datetime import datetime
from werkzeug.utils import secure_filename

def get_gcs_client():
    """Initialize and return GCS client."""
    # Service account credentials should be set via GOOGLE_APPLICATION_CREDENTIALS env var
    # or via explicit key file path in config
    credentials_path = current_app.config.get('GCS_CREDENTIALS_PATH')
    if credentials_path:
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path

    return storage.Client()

def upload_file_to_gcs(file_obj, filename, bucket_name=None):
    """
    Upload a file-like object to Google Cloud Storage.

    Args:
        file_obj: File-like object to upload
        filename: Desired filename in GCS
        bucket_name: GCS bucket name (optional, uses config default)

    Returns:
        str: GCS URL of the uploaded file
    """
    if not bucket_name:
        bucket_name = current_app.config.get('GCS_BUCKET_NAME')
        if not bucket_name:
            raise ValueError("GCS_BUCKET_NAME not configured")

    client = get_gcs_client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(filename)

    # Upload the file
    blob.upload_from_file(file_obj, content_type=file_obj.content_type)

    # Return the public URL (assuming bucket is public, or use signed URLs if needed)
    return f"https://storage.googleapis.com/{bucket_name}/{filename}"

def download_file_from_gcs(gcs_url):
    """
    Download a file from GCS and return its content as bytes.

    Args:
        gcs_url: Full GCS URL (gs://bucket/filename) or HTTPS URL

    Returns:
        bytes: File content
    """
    client = get_gcs_client()

    if gcs_url.startswith('https://storage.googleapis.com/'):
        # Parse bucket and blob from URL
        parts = gcs_url.replace('https://storage.googleapis.com/', '').split('/')
        bucket_name = parts[0]
        blob_name = '/'.join(parts[1:])
    elif gcs_url.startswith('gs://'):
        parts = gcs_url.replace('gs://', '').split('/')
        bucket_name = parts[0]
        blob_name = '/'.join(parts[1:])
    else:
        raise ValueError("Invalid GCS URL format")

    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    # Download to bytes
    return blob.download_as_bytes()

def get_file_from_gcs(gcs_url):
    """
    Get a file-like object from GCS for reading.

    Args:
        gcs_url: Full GCS URL

    Returns:
        file-like object
    """
    data = download_file_from_gcs(gcs_url)
    # Create a temporary file-like object
    temp_file = tempfile.NamedTemporaryFile(delete=False)
    temp_file.write(data)
    temp_file.seek(0)
    return temp_file

def get_content_type_from_url(url):
    """
    Determine content type based on file extension in URL.

    Args:
        url: File URL or path

    Returns:
        str: MIME content type
    """
    url_lower = url.lower()
    if url_lower.endswith('.pdf'):
        return 'application/pdf'
    elif url_lower.endswith(('.jpg', '.jpeg')):
        return 'image/jpeg'
    elif url_lower.endswith('.png'):
        return 'image/png'
    elif url_lower.endswith('.gif'):
        return 'image/gif'
    else:
        return 'application/octet-stream'

def get_file_data_and_content_type(gcs_url):
    """
    Download file from GCS and determine its content type.

    Args:
        gcs_url: Full GCS URL

    Returns:
        tuple: (file_data_bytes, content_type)
    """
    file_data = download_file_from_gcs(gcs_url)
    content_type = get_content_type_from_url(gcs_url)
    return file_data, content_type

def upload_files_to_gcs(files):
    """
    Upload multiple files to Google Cloud Storage.

    Args:
        files: List of file objects (from request.files.getlist)

    Returns:
        list: List of GCS URLs for the uploaded files
    """
    uploaded_urls = []
    for file in files:
        if file.filename:
            filename = secure_filename(file.filename)
            if not filename:
                continue
            name, ext = os.path.splitext(filename)
            timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
            unique_filename = f"{name}_{timestamp}{ext}" if name else f"upload_{timestamp}{ext}"
            # Upload to Google Cloud Storage
            gcs_url = upload_file_to_gcs(file, unique_filename)
            uploaded_urls.append(gcs_url)
    return uploaded_urls

def upload_image_to_gcs(image_file, filename=None):
    """
    Upload an image file to Google Cloud Storage with unique naming.

    Args:
        image_file: File object
        filename: Optional base filename

    Returns:
        str: GCS URL of the uploaded image
    """
    if not filename:
        filename = secure_filename(image_file.filename)
    name, ext = os.path.splitext(filename)
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
    unique_filename = f"{name}_{timestamp}{ext}" if name else f"upload_{timestamp}{ext}"
    return upload_file_to_gcs(image_file, unique_filename)