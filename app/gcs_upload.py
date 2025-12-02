import os
from google.cloud import storage
import tempfile
from datetime import datetime
from werkzeug.utils import secure_filename

def get_gcs_client():
    """Initialize and return GCS client.

    This function reads credentials path from the environment variable
    `GCS_CREDENTIALS_PATH` (or `GOOGLE_APPLICATION_CREDENTIALS`) and does not
    require Flask application context. It ensures the streaming generator can
    call into GCS without depending on `current_app`.
    """
    # Prefer explicit GOOGLE_APPLICATION_CREDENTIALS; otherwise read GCS_CREDENTIALS_PATH
    credentials_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS') or os.environ.get('GCS_CREDENTIALS_PATH')
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
        bucket_name = os.environ.get('GCS_BUCKET_NAME')
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
    elif url_lower.endswith('.mp4'):
        return 'video/mp4'
    elif url_lower.endswith('.webm'):
        return 'video/webm'
    elif url_lower.endswith('.ogg'):
        return 'video/ogg'
    elif url_lower.endswith('.mov'):
        return 'video/quicktime'
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

def delete_file_from_gcs(gcs_url):
    """
    Delete a file from Google Cloud Storage.

    Args:
        gcs_url: Full GCS URL (https://storage.googleapis.com/bucket/filename or gs://bucket/filename)

    Returns:
        bool: True if deleted successfully, False otherwise
    """
    try:
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
        
        # Delete the blob
        blob.delete()
        return True
    except Exception as e:
        print(f"Error deleting file from GCS: {e}")
        return False

def upload_files_to_gcs(files, user_id=None, conversation_id=None, message_id=None):
    """
    Upload multiple files to Google Cloud Storage and save to database.

    Args:
        files: List of file objects (from request.files.getlist)
        user_id: User ID who uploaded the files
        conversation_id: Optional conversation ID
        message_id: Optional message ID

    Returns:
        list: List of GCS URLs for the uploaded files
    """
    from .models import FileUpload, db

    uploaded_urls = []
    for file in files:
        if file.filename:
            filename = secure_filename(file.filename)
            if not filename:
                continue
            name, ext = os.path.splitext(filename)
            timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
            unique_filename = f"{name}_{timestamp}{ext}" if name else f"upload_{timestamp}{ext}"

            # Get file size before uploading (seek to end, get position, seek back)
            file.seek(0, 2)  # Seek to end
            file_size = file.tell()
            file.seek(0)  # Seek back to beginning
            
            # Upload to Google Cloud Storage
            gcs_url = upload_file_to_gcs(file, unique_filename)

            # Save to database if user_id provided
            if user_id:
                # Extract file type (extension without the dot)
                file_type = ext[1:].lower() if ext else 'unknown'
                
                file_upload = FileUpload(
                    user_id=user_id,
                    filename=file.filename,  # Original filename
                    file_path=gcs_url,
                    file_type=file_type,
                    content_type=file.content_type or 'application/octet-stream',
                    file_size=file_size,
                    conversation_id=conversation_id,
                    message_id=message_id
                )
                db.session.add(file_upload)

            uploaded_urls.append(gcs_url)

    # Commit database changes
    if user_id:
        db.session.commit()

    return uploaded_urls

def upload_image_to_gcs(image_file, filename=None, user_id=None, conversation_id=None, message_id=None):
    """
    Upload an image file to Google Cloud Storage with unique naming and save to database.

    Args:
        image_file: File object
        filename: Optional base filename
        user_id: User ID who uploaded the file
        conversation_id: Optional conversation ID
        message_id: Optional message ID

    Returns:
        str: GCS URL of the uploaded image
    """
    from .models import FileUpload, db

    if not filename:
        filename = secure_filename(image_file.filename)
    name, ext = os.path.splitext(filename)
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
    unique_filename = f"{name}_{timestamp}{ext}" if name else f"upload_{timestamp}{ext}"

    # Get file size before uploading
    image_file.seek(0, 2)  # Seek to end
    file_size = image_file.tell()
    image_file.seek(0)  # Seek back to beginning
    
    gcs_url = upload_file_to_gcs(image_file, unique_filename)

    # Save to database if user_id provided
    if user_id:
        # Extract file type (extension without the dot)
        _, ext = os.path.splitext(image_file.filename)
        file_type = ext[1:].lower() if ext else 'unknown'
        
        file_upload = FileUpload(
            user_id=user_id,
            filename=image_file.filename,  # Original filename
            file_path=gcs_url,
            file_type=file_type,
            content_type=image_file.content_type or 'application/octet-stream',
            file_size=file_size,
            conversation_id=conversation_id,
            message_id=message_id
        )
        db.session.add(file_upload)
        db.session.commit()

    return gcs_url