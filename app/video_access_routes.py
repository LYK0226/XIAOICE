# Deprecated shim — use `video_access_routes.py`
from .video_access_routes import *

from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
import tempfile
import threading
import json as _json

from . import gcp_bucket, agent

bp = Blueprint('video', __name__)


@bp.route('/api/upload-video', methods=['POST'])
@jwt_required()
def upload_video():
    """Upload a video file for transcription and analysis (stored in GCS)."""
    from .models import db, VideoRecord, UserProfile

    user_id = int(get_jwt_identity())

    try:
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400

        video_file = request.files['video']
        if not video_file.filename:
            return jsonify({'error': 'No selected file'}), 400

        # Validate file size (max 500MB)
        video_file.seek(0, os.SEEK_END)
        file_size = video_file.tell()
        video_file.seek(0)

        max_size = 500 * 1024 * 1024
        if file_size > max_size:
            return jsonify({'error': 'File too large. Max 500MB allowed'}), 400

        secure_name = secure_filename(video_file.filename)
        if '.' in secure_name:
            name_without_ext, ext = secure_name.rsplit('.', 1)
            ext = ext.lower()
        else:
            name_without_ext = secure_name
            ext = ''

        allowed_exts = current_app.config.get('ALLOWED_VIDEO_EXTENSIONS', {'mp4', 'avi', 'mov', 'mkv', 'webm'})
        if ext == '' or ext not in allowed_exts:
            return jsonify({'error': f'不支援的影片格式。允許的格式: {", ".join(sorted(allowed_exts)).upper()}'}), 400

        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
        unique_filename = f"{name_without_ext}_{timestamp}.{ext}"

        storage_key = gcp_bucket.build_storage_key('video_assess', user_id, unique_filename)
        gcs_url = gcp_bucket.upload_file_to_gcs(video_file, storage_key)

        # Ensure stream is at end after upload; reset for safety
        try:
            video_file.seek(0)
        except Exception:
            pass

        video_record = VideoRecord(
            user_id=user_id,
            filename=unique_filename,
            original_filename=video_file.filename,
            file_path=gcs_url,
            storage_key=storage_key,
            file_size=file_size,
            transcription_status='pending',
            analysis_status='pending'
        )

        db.session.add(video_record)
        db.session.commit()

        # Prepare auth/user settings for background work
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        api_key = None
        if user_profile and user_profile.selected_api_key:
            api_key = user_profile.selected_api_key.get_decrypted_key()

        ai_model = user_profile.ai_model if (user_profile and user_profile.ai_model) else 'gemini-2.5-flash'
        mime_type = video_file.content_type or gcp_bucket.get_content_type_from_url(gcs_url)

        app_obj = current_app._get_current_object()
        video_id = video_record.id

        def transcribe_video_background():
            from .models import VideoRecord, db

            with app_obj.app_context():
                try:
                    video = VideoRecord.query.get(video_id)
                    if not video:
                        return

                    video.transcription_status = 'processing'
                    db.session.commit()

                    prompt = (
                        "請將此影片中的語音逐字轉錄成純文字。\n"
                        "- 若影片沒有語音，請回答：『（無語音）』\n"
                        "- 請不要加上多餘的前言或標題。"
                    )

                    chunks = []
                    for chunk in agent.generate_streaming_response(
                        prompt,
                        image_path=gcs_url,
                        image_mime_type=mime_type,
                        history=None,
                        api_key=api_key,
                        model_name=ai_model,
                        user_id=str(user_id),
                        conversation_id=None
                    ):
                        if chunk:
                            chunks.append(chunk)

                    transcript = ''.join(chunks).strip()
                    if not transcript:
                        video.transcription_status = 'failed'
                    else:
                        video.full_transcription = transcript
                        video.transcription_status = 'completed'

                    db.session.commit()
                except Exception as e:
                    current_app.logger.error(f"Error transcribing video: {e}")
                    try:
                        video = VideoRecord.query.get(video_id)
                        if video:
                            video.transcription_status = 'failed'
                            db.session.commit()
                    except Exception:
                        pass

        thread = threading.Thread(target=transcribe_video_background, daemon=True)
        thread.start()

        # Provide an authenticated playback URL; server will redirect to GCS
        video_url = f"/api/video-file/{unique_filename}"

        return jsonify({
            'success': True,
            'video_id': video_record.id,
            'video_url': video_url,
            'file_path': gcs_url,
            'message': 'Video uploaded. Transcription processing...'
        }), 201

    except Exception as e:
        current_app.logger.error(f"Error uploading video: {e}")
        return jsonify({'error': f'Video upload failed: {str(e)}'}), 500


@bp.route('/api/videos', methods=['GET'])
@jwt_required()
def get_videos():
    """Get user's uploaded videos."""
    from .models import VideoRecord

    try:
        user_id = int(get_jwt_identity())
        videos = VideoRecord.query.filter_by(user_id=user_id).order_by(VideoRecord.created_at.desc()).all()

        return jsonify({
            'success': True,
            'videos': [video.to_dict() for video in videos]
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching videos: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/video/<int:video_id>', methods=['GET'])
@jwt_required()
def get_video(video_id):
    """Get video details."""
    from .models import VideoRecord

    try:
        user_id = int(get_jwt_identity())
        video = VideoRecord.query.filter_by(id=video_id, user_id=user_id).first()

        if not video:
            return jsonify({'error': 'Video not found'}), 404

        return jsonify({
            'success': True,
            'video': video.to_dict(include_timestamps=True)
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching video: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/video/<int:video_id>/analyze', methods=['POST'])
@jwt_required()
def analyze_video(video_id):
    """Analyze video content based on transcription."""
    from .models import db, VideoRecord, UserProfile

    user_id = int(get_jwt_identity())

    try:
        video = VideoRecord.query.filter_by(id=video_id, user_id=user_id).first()
        if not video:
            return jsonify({'error': 'Video not found'}), 404

        if (video.transcription_status or '').lower() != 'completed' or not (video.full_transcription or '').strip():
            return jsonify({'error': 'Transcription not yet completed'}), 400

        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        api_key = None
        if user_profile and user_profile.selected_api_key:
            api_key = user_profile.selected_api_key.get_decrypted_key()
        ai_model = user_profile.ai_model if (user_profile and user_profile.ai_model) else 'gemini-2.5-flash'

        app_obj = current_app._get_current_object()

        def analyze_background():
            from .models import db, VideoRecord

            with app_obj.app_context():
                try:
                    v = VideoRecord.query.filter_by(id=video_id, user_id=user_id).first()
                    if not v:
                        return

                    v.analysis_status = 'processing'
                    db.session.commit()

                    prompt = (
                        "請根據以下逐字稿，輸出一個 JSON 物件（只輸出 JSON，不要其他文字）。\n"
                        "JSON 欄位：summary（摘要）, key_points（重點陣列）, suggestions（建議陣列）, risks（注意事項陣列）。\n\n"
                        f"逐字稿：\n{v.full_transcription}"
                    )

                    chunks = []
                    for chunk in agent.generate_streaming_response(
                        prompt,
                        history=None,
                        api_key=api_key,
                        model_name=ai_model,
                        user_id=str(user_id),
                        conversation_id=None
                    ):
                        if chunk:
                            chunks.append(chunk)

                    raw = ''.join(chunks).strip()
                    try:
                        analysis_json = _json.loads(raw)
                    except Exception:
                        analysis_json = {'raw': raw}

                    v.analysis_report = analysis_json
                    v.analysis_status = 'completed'
                    db.session.commit()
                except Exception as e:
                    current_app.logger.error(f"Error analyzing video: {e}")
                    try:
                        v = VideoRecord.query.filter_by(id=video_id, user_id=user_id).first()
                        if v:
                            v.analysis_status = 'failed'
                            db.session.commit()
                    except Exception:
                        pass

        thread = threading.Thread(target=analyze_background, daemon=True)
        thread.start()

        return jsonify({'success': True, 'message': 'Analysis started'}), 202

    except Exception as e:
        current_app.logger.error(f"Error starting analysis: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/video/<int:video_id>', methods=['DELETE'])
@jwt_required()
def delete_video(video_id):
    """Delete video and associated files."""
    from .models import db, VideoRecord

    try:
        user_id = int(get_jwt_identity())
        video = VideoRecord.query.filter_by(id=video_id, user_id=user_id).first()
        if not video:
            return jsonify({'error': 'Video not found'}), 404

        # Delete from GCS if applicable
        if isinstance(video.file_path, str) and video.file_path.startswith('https://storage.googleapis.com/'):
            gcp_bucket.delete_file_from_gcs(video.file_path)

        db.session.delete(video)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Video deleted'}), 200

    except Exception as e:
        current_app.logger.error(f"Error deleting video: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/api/videos/clear-all', methods=['POST'])
@jwt_required()
def clear_all_videos():
    """Clear all user videos."""
    from .models import db, VideoRecord

    try:
        user_id = int(get_jwt_identity())
        videos = VideoRecord.query.filter_by(user_id=user_id).all()

        deleted_count = 0
        for video in videos:
            if isinstance(video.file_path, str) and video.file_path.startswith('https://storage.googleapis.com/'):
                gcp_bucket.delete_file_from_gcs(video.file_path)
            db.session.delete(video)
            deleted_count += 1

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'已清除 {deleted_count} 個影片',
            'deleted_count': deleted_count
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error clearing videos: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/api/video-file/<filename>')
@jwt_required()
def serve_video(filename):
    """Serve video files for the current user (auth-gated redirect to GCS URL)."""
    from .models import VideoRecord

    user_id = int(get_jwt_identity())

    video = VideoRecord.query.filter_by(user_id=user_id, filename=filename).first()
    if not video:
        return jsonify({'error': 'Video not found'}), 404

    if isinstance(video.file_path, str) and video.file_path.startswith('https://storage.googleapis.com/'):
        return redirect(video.file_path)

    return jsonify({'error': 'File not available'}), 404


@bp.route('/video/analyze', methods=['POST'])
@jwt_required()
def analyze_video_upload():
    from .video_processor import VideoProcessor

    user_id = int(get_jwt_identity())

    try:
        video_path = None
        video_info = {}
        temp_file_path = None

        if 'video' in request.files:
            video_file = request.files['video']
            if not video_file.filename:
                return jsonify({'error': '\u6c92\u6709\u9078\u64c7\u6587\u4ef6'}), 400

            filename = secure_filename(video_file.filename)
            if not filename:
                return jsonify({'error': '\u7121\u6548\u7684\u6587\u4ef6\u540d'}), 400

            ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
            if ext not in current_app.config.get('ALLOWED_VIDEO_EXTENSIONS', {'mp4', 'avi', 'mov', 'mkv', 'webm'}):
                return jsonify({'error': '\u4e0d\u652f\u63f4\u7684\u5f71\u7247\u683c\u5f0f\u3002\u5141\u8a31\u7684\u683c\u5f0f: MP4, AVI, MOV, MKV, WebM'}), 400

            storage_key = gcp_bucket.build_storage_key('video_assess', user_id, filename)
            gcs_url = gcp_bucket.upload_file_to_gcs(video_file, storage_key)

            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f'.{ext}')
            temp_file_path = temp_file.name
            temp_file.close()
            
            video_data = gcp_bucket.download_file_from_gcs(gcs_url)
            with open(temp_file_path, 'wb') as f:
                f.write(video_data)

            video_path = temp_file_path
            current_app.logger.info(f"Downloaded video from GCS to temp: {temp_file_path}")
        else:
            return jsonify({'error': '\u8acb\u4e0a\u50b3\u5f71\u7247\u6587\u4ef6'}), 400

        video_processor = VideoProcessor(os.path.dirname(temp_file_path))
        
        if not video_info:
            video_info = video_processor.get_video_info(video_path)

        interval = current_app.config.get('VIDEO_FRAME_INTERVAL', 5)
        max_frames = current_app.config.get('VIDEO_MAX_FRAMES', 20)
        frames = video_processor.extract_frames(video_path, interval, max_frames)

        current_app.logger.info(f"Extracted {len(frames)} frames from video")

        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
            current_app.logger.info(f"Cleaned up temp file: {temp_file_path}")

        return jsonify({
            'success': True,
            'video_info': video_info,
            'video_url': gcs_url,
            'video_path': storage_key,
            'frames': frames,
            'is_youtube': False,
            'message': f'\u6210\u529f\u63d0\u53d6 {len(frames)} \u500b\u95dc\u9375\u5e40\u9032\u884c\u5206\u6790'
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error analyzing video: {e}")
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception:
                pass
        return jsonify({'error': f'\u5f71\u7247\u5206\u6790\u5931\u6557: {str(e)}'}), 500


@bp.route('/video/stream-analysis', methods=['POST'])
@jwt_required()
def stream_video_analysis():
    return jsonify({'error': 'video frame streaming analysis is not implemented in this build'}), 501


@bp.route('/api/uploads', methods=['GET'])
@jwt_required()
def get_uploads():
    from .models import FileUpload, VideoRecord
    
    user_id = int(get_jwt_identity())
    category = request.args.get('category')
    
    try:
        if category == 'video_assess':
            videos = VideoRecord.query.filter_by(user_id=user_id).order_by(VideoRecord.created_at.desc()).all()
            uploads = []
            for video in videos:
                video_dict = video.to_dict()
                if video.storage_key:
                    try:
                        video_dict['signed_url'] = gcp_bucket.generate_signed_url(video.storage_key)
                    except Exception as e:
                        current_app.logger.warning(f"Failed to generate signed URL for video {video.id}: {e}")
                        video_dict['signed_url'] = None
                uploads.append(video_dict)
            
            return jsonify({
                'success': True,
                'category': 'video_assess',
                'uploads': uploads
            }), 200
        else:
            query = FileUpload.query.filter_by(user_id=user_id, deleted_at=None)
            
            if category:
                query = query.filter_by(upload_category=category)
            
            files = query.order_by(FileUpload.uploaded_at.desc()).all()
            uploads = []
            for file_upload in files:
                file_dict = file_upload.to_dict()
                if file_upload.storage_key:
                    try:
                        file_dict['signed_url'] = gcp_bucket.generate_signed_url(file_upload.storage_key)
                    except Exception as e:
                        current_app.logger.warning(f"Failed to generate signed URL for file {file_upload.id}: {e}")
                        file_dict['signed_url'] = None
                uploads.append(file_dict)
            
            return jsonify({
                'success': True,
                'category': category or 'all',
                'uploads': uploads
            }), 200
            
    except Exception as e:
        current_app.logger.error(f"Error fetching uploads: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/uploads/<int:upload_id>', methods=['DELETE'])
@jwt_required()
def delete_upload(upload_id):
    from .models import FileUpload, db
    
    user_id = int(get_jwt_identity())
    
    try:
        file_upload = FileUpload.query.filter_by(id=upload_id, user_id=user_id).first()
        
        if not file_upload:
            return jsonify({'error': 'File not found or access denied'}), 404
        
        if file_upload.storage_key:
            try:
                success = gcp_bucket.delete_file_from_gcs(file_upload.file_path)
                if not success:
                    raise Exception(f"Failed to delete file from GCS: {file_upload.storage_key}")
            except Exception as e:
                current_app.logger.error(f"Failed to delete GCS file {file_upload.storage_key}: {e}")
                return jsonify({'error': f'刪除失敗: {str(e)}'}), 500
        
        db.session.delete(file_upload)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'File deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting upload: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/videos/<int:video_id>', methods=['DELETE'])
@jwt_required()
def delete_video_record(video_id):
    from .models import VideoRecord, db
    
    user_id = int(get_jwt_identity())
    
    try:
        video = VideoRecord.query.filter_by(id=video_id, user_id=user_id).first()
        
        if not video:
            return jsonify({'error': 'Video not found or access denied'}), 404
        
        if video.storage_key:
            try:
                success = gcp_bucket.delete_file_from_gcs(video.file_path)
                if not success:
                    raise Exception(f"Failed to delete video from GCS: {video.storage_key}")
            except Exception as e:
                current_app.logger.error(f"Failed to delete GCS video {video.storage_key}: {e}")
                return jsonify({'error': f'刪除失敗: {str(e)}'}), 500
        
        db.session.delete(video)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Video deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting video: {e}")
        return jsonify({'error': str(e)}), 500
