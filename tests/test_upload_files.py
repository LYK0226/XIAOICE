import io
import pytest
from werkzeug.datastructures import FileStorage

from app import create_app
from app import gcp_bucket


def make_filestorage(name, content=b'data', content_type='application/octet-stream'):
    stream = io.BytesIO(content)
    return FileStorage(stream=stream, filename=name, content_type=content_type)


def test_upload_files_reject_non_pdf_documents():
    # Non-PDF document (e.g., .docx) should raise ValueError
    fs = make_filestorage('file.docx', b'test', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    with pytest.raises(ValueError):
        gcp_bucket.upload_files_to_gcs([fs])


def test_upload_files_allow_pdf_and_image(monkeypatch):
    # Monkeypatch the upload_file_to_gcs to not call real GCS
    monkeypatch.setattr(gcp_bucket, 'upload_file_to_gcs', lambda file_obj, filename, bucket_name=None: f"https://storage.googleapis.com/fake-bucket/{filename}")

    pdf = make_filestorage('doc.pdf', b'%PDF-1.4', 'application/pdf')
    jpg = make_filestorage('image.jpg', b'\xff\xd8\xff', 'image/jpeg')

    urls = gcp_bucket.upload_files_to_gcs([pdf, jpg])
    assert len(urls) == 2
    assert urls[0].endswith('.pdf')
    assert urls[1].endswith('.jpg')
