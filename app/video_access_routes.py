# Deprecated shim — use `video_access_routes.py`
from .video_access_routes import *

from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, redirect, Response
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

        storage_key = gcp_bucket.build_storage_key('video_assess', user_id, secure_name)
        gcs_url = gcp_bucket.upload_file_to_gcs(video_file, storage_key)

        # Ensure stream is at end after upload; reset for safety
        try:
            video_file.seek(0)
        except Exception:
            pass

        video_record = VideoRecord(
            user_id=user_id,
            filename=secure_name,
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
        ai_provider = 'ai_studio'
        vertex_config = None
        provider_for_request = 'ai_studio'
        if user_profile and user_profile.selected_api_key:
            api_key = user_profile.selected_api_key.get_decrypted_key()

        ai_model = user_profile.ai_model if (user_profile and user_profile.ai_model) else 'gemini-3-flash'
        if user_profile and user_profile.ai_provider:
            ai_provider = user_profile.ai_provider
        if user_profile and ai_provider == 'vertex_ai':
            from .models import VertexServiceAccount
            vertex_account = None
            if user_profile.selected_vertex_account_id:
                vertex_account = VertexServiceAccount.query.filter_by(
                    id=user_profile.selected_vertex_account_id, user_id=user_id
                ).first()
            elif user_profile.selected_vertex_account:
                vertex_account = user_profile.selected_vertex_account
            if vertex_account:
                vertex_config = {
                    'service_account': vertex_account.get_decrypted_credentials(),
                    'project_id': vertex_account.project_id,
                    'location': vertex_account.location or user_profile.vertex_location or 'us-central1'
                }
            provider_for_request = 'vertex_ai'
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
                        conversation_id=None,
                        provider=provider_for_request,
                        vertex_config=vertex_config
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
        video_url = f"/api/video-file/{secure_name}"

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
        ai_provider = 'ai_studio'
        vertex_config = None
        provider_for_request = 'ai_studio'
        if user_profile and user_profile.selected_api_key:
            api_key = user_profile.selected_api_key.get_decrypted_key()
        ai_model = user_profile.ai_model if (user_profile and user_profile.ai_model) else 'gemini-3-flash'
        if user_profile and user_profile.ai_provider:
            ai_provider = user_profile.ai_provider
        if user_profile and ai_provider == 'vertex_ai':
            from .models import VertexServiceAccount
            vertex_account = None
            if user_profile.selected_vertex_account_id:
                vertex_account = VertexServiceAccount.query.filter_by(
                    id=user_profile.selected_vertex_account_id, user_id=user_id
                ).first()
            elif user_profile.selected_vertex_account:
                vertex_account = user_profile.selected_vertex_account
            if vertex_account:
                vertex_config = {
                    'service_account': vertex_account.get_decrypted_credentials(),
                    'project_id': vertex_account.project_id,
                    'location': vertex_account.location or user_profile.vertex_location or 'us-central1'
                }
            provider_for_request = 'vertex_ai'

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
                        conversation_id=None,
                        provider=provider_for_request,
                        vertex_config=vertex_config
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
    """Delete video and associated files (including analysis reports)."""
    from .models import db, VideoRecord
    from .video_cleanup import delete_video_with_reports

    try:
        user_id = int(get_jwt_identity())
        video = VideoRecord.query.filter_by(id=video_id, user_id=user_id).first()
        if not video:
            return jsonify({'error': 'Video not found'}), 404

        delete_video_with_reports(video, db)
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
    from .video_cleanup import delete_video_with_reports

    try:
        user_id = int(get_jwt_identity())
        videos = VideoRecord.query.filter_by(user_id=user_id).all()

        deleted_count = 0
        for video in videos:
            delete_video_with_reports(video, db)
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


@bp.route('/api/videos/batch-delete', methods=['POST'])
@jwt_required()
def batch_delete_videos():
    """Delete multiple videos by IDs."""
    from .models import db, VideoRecord
    from .video_cleanup import delete_video_with_reports

    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        ids = data.get('ids', [])
        if not ids:
            return jsonify({'error': '未選擇任何項目'}), 400

        # Convert to integers
        int_ids = [int(i) for i in ids]

        videos = VideoRecord.query.filter(
            VideoRecord.id.in_(int_ids),
            VideoRecord.user_id == user_id
        ).all()

        deleted_count = 0
        for video in videos:
            # Delete GCS video file
            if isinstance(video.file_path, str) and video.file_path.startswith('https://storage.googleapis.com/'):
                try:
                    gcp_bucket.delete_file_from_gcs(video.file_path)
                except Exception:
                    pass

            delete_video_with_reports(video, db)
            deleted_count += 1

        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'已刪除 {deleted_count} 個影片',
            'deleted_count': deleted_count
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error batch deleting videos: {e}")
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
    from .models import FileUpload, VideoRecord, VideoAnalysisReport
    
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
                # Include latest analysis report info
                latest_report = VideoAnalysisReport.query.filter_by(
                    video_id=video.id, user_id=user_id
                ).order_by(VideoAnalysisReport.created_at.desc()).first()
                if latest_report:
                    video_dict['analysis_report_info'] = {
                        'report_id': latest_report.report_id,
                        'status': latest_report.status,
                        'child_name': latest_report.child_name,
                        'child_age_months': latest_report.child_age_months,
                        'has_pdf': bool(latest_report.pdf_storage_key),
                        'created_at': latest_report.created_at.isoformat() if latest_report.created_at else None,
                        'completed_at': latest_report.completed_at.isoformat() if latest_report.completed_at else None,
                    }
                else:
                    video_dict['analysis_report_info'] = None
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
    from .video_cleanup import delete_report_records, delete_video_assets
    
    user_id = int(get_jwt_identity())
    
    try:
        video = VideoRecord.query.filter_by(id=video_id, user_id=user_id).first()
        
        if not video:
            return jsonify({'error': 'Video not found or access denied'}), 404
        
        try:
            delete_video_assets(video, require_success=True)
        except Exception as e:
            current_app.logger.error(f"Failed to delete GCS video {video.storage_key}: {e}")
            return jsonify({'error': f'刪除失敗: {str(e)}'}), 500

        reports = list(video.analysis_reports or [])
        delete_report_records(reports, db)

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

# ---------------------------------------------------------------------------
#  Child Development Video Analysis (AI multi-agent)
# ---------------------------------------------------------------------------

@bp.route('/api/video/<int:video_id>/child-analyze', methods=['POST'])
@jwt_required()
def start_child_analysis(video_id):
    """
    Start AI child-development analysis on an uploaded video.
    Requires a child_id in JSON body so the system knows age / name.
    """
    from .models import db, VideoRecord, VideoAnalysisReport, Child, UserProfile, VertexServiceAccount

    user_id = int(get_jwt_identity())

    try:
        data = request.get_json(silent=True) or {}
        child_id = data.get('child_id')
        if not child_id:
            return jsonify({'error': '請選擇分析對象（child_id）'}), 400

        child = Child.query.filter_by(id=child_id, user_id=user_id).first()
        if not child:
            return jsonify({'error': '找不到該兒童資料，請先在設定中添加兒童'}), 404

        video = VideoRecord.query.filter_by(id=video_id, user_id=user_id).first()
        if not video:
            return jsonify({'error': '找不到影片'}), 404

        # Create report record
        report = VideoAnalysisReport(
            user_id=user_id,
            video_id=video.id,
            child_id=child.id,
            child_name=child.name,
            child_age_months=round(child.calculate_age_months(), 1),
            status='pending',
        )
        db.session.add(report)
        db.session.commit()

        # Gather provider config
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        api_key = None
        ai_provider = 'ai_studio'
        vertex_config = None
        if user_profile and user_profile.selected_api_key:
            api_key = user_profile.selected_api_key.get_decrypted_key()
        ai_model = (user_profile.ai_model if user_profile and user_profile.ai_model else 'gemini-2.0-flash')
        if user_profile and user_profile.ai_provider:
            ai_provider = user_profile.ai_provider
        if user_profile and ai_provider == 'vertex_ai':
            # Look up the VertexServiceAccount via the profile's selected ID
            vertex_account = None
            if user_profile.selected_vertex_account_id:
                vertex_account = VertexServiceAccount.query.filter_by(
                    id=user_profile.selected_vertex_account_id,
                    user_id=user_id,
                ).first()
            elif user_profile.selected_vertex_account:
                vertex_account = user_profile.selected_vertex_account
            if vertex_account:
                vertex_config = {
                    'service_account': vertex_account.get_decrypted_credentials(),
                    'project_id': vertex_account.project_id,
                    'location': vertex_account.location or user_profile.vertex_location or 'us-central1',
                }

        mime_type = gcp_bucket.get_content_type_from_url(video.file_path)
        app_obj = current_app._get_current_object()
        report_db_id = report.id
        report_uuid = report.report_id
        video_file_path = video.file_path

        def run_analysis_background():
            from .models import db, VideoAnalysisReport
            from .agent.video_analysis_agent import run_video_analysis
            from .report_generator import generate_and_upload_pdf

            with app_obj.app_context():
                rpt = VideoAnalysisReport.query.get(report_db_id)
                if not rpt:
                    return
                try:
                    rpt.status = 'processing'
                    db.session.commit()

                    results = run_video_analysis(
                        video_gcs_url=video_file_path,
                        video_mime_type=mime_type,
                        child_name=rpt.child_name,
                        child_age_months=rpt.child_age_months,
                        api_key=api_key,
                        model_name=ai_model,
                        user_id=str(user_id),
                        provider=ai_provider,
                        vertex_config=vertex_config,
                    )

                    if not results.get('success'):
                        rpt.status = 'failed'
                        rpt.error_message = results.get('error', 'Unknown error')
                        db.session.commit()
                        return

                    rpt.raw_transcription = _json.dumps(
                        results.get('transcription_result', {}), ensure_ascii=False
                    )
                    rpt.motor_analysis = results.get('motor_analysis_result')
                    rpt.language_analysis = results.get('language_analysis_result')
                    final_report = results.get('final_report', {})
                    rpt.overall_assessment = final_report
                    rpt.recommendations = (
                        final_report.get('overall_recommendations')
                        if isinstance(final_report, dict) else None
                    )
                    rpt.agent_log = results

                    # Generate PDF and upload
                    pdf_result = generate_and_upload_pdf(
                        report_data=final_report if isinstance(final_report, dict) else {},
                        child_name=rpt.child_name,
                        child_age_months=rpt.child_age_months,
                        user_id=user_id,
                        report_id=report_uuid,
                    )
                    if pdf_result.get('success'):
                        rpt.pdf_gcs_url = pdf_result['pdf_gcs_url']
                        rpt.pdf_storage_key = pdf_result.get('pdf_storage_key')

                    rpt.status = 'completed'
                    rpt.completed_at = datetime.utcnow()
                    db.session.commit()
                    current_app.logger.info(f"Video analysis report {report_uuid} completed")

                except Exception as e:
                    current_app.logger.error(f"Child analysis failed for report {report_uuid}: {e}")
                    try:
                        rpt = VideoAnalysisReport.query.get(report_db_id)
                        if rpt:
                            rpt.status = 'failed'
                            rpt.error_message = str(e)
                            db.session.commit()
                    except Exception:
                        pass

        thread = threading.Thread(target=run_analysis_background, daemon=True)
        thread.start()

        return jsonify({
            'success': True,
            'report_id': report.report_id,
            'message': '分析已開始，請稍候...',
        }), 202

    except Exception as e:
        current_app.logger.error(f"Error starting child analysis: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/video-analysis-reports', methods=['GET'])
@jwt_required()
def list_analysis_reports():
    """List all analysis reports for the current user."""
    from .models import VideoAnalysisReport

    user_id = int(get_jwt_identity())
    video_id = request.args.get('video_id', type=int)

    try:
        query = VideoAnalysisReport.query.filter_by(user_id=user_id)
        if video_id:
            query = query.filter_by(video_id=video_id)
        reports = query.order_by(VideoAnalysisReport.created_at.desc()).all()
        return jsonify({
            'success': True,
            'reports': [r.to_dict() for r in reports],
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error listing reports: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/video-analysis-report/<report_id>', methods=['GET'])
@jwt_required()
def get_analysis_report(report_id):
    """Get a single analysis report (full details)."""
    from .models import VideoAnalysisReport

    user_id = int(get_jwt_identity())
    try:
        report = VideoAnalysisReport.query.filter_by(report_id=report_id, user_id=user_id).first()
        if not report:
            return jsonify({'error': '找不到報告'}), 404
        return jsonify({
            'success': True,
            'report': report.to_dict(include_full=True),
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching report: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/video-analysis-report/<report_id>', methods=['DELETE'])
@jwt_required()
def delete_analysis_report(report_id):
    """Delete a single analysis report and its PDF if present."""
    from .models import VideoAnalysisReport, db
    from .video_cleanup import delete_report_records

    user_id = int(get_jwt_identity())
    try:
        report = VideoAnalysisReport.query.filter_by(report_id=report_id, user_id=user_id).first()
        if not report:
            return jsonify({'error': '找不到報告'}), 404

        delete_report_records([report], db)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Report deleted'}), 200
    except Exception as e:
        current_app.logger.error(f"Error deleting report: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/api/video-analysis-report/<report_id>/download', methods=['GET'])
@jwt_required()
def download_analysis_report(report_id):
    """Download the PDF/HTML report file with proper Content-Disposition."""
    from .models import VideoAnalysisReport

    user_id = int(get_jwt_identity())
    try:
        report = VideoAnalysisReport.query.filter_by(report_id=report_id, user_id=user_id).first()
        if not report:
            return jsonify({'error': '找不到報告'}), 404
        if not report.pdf_storage_key:
            return jsonify({'error': '報告 PDF 尚未生成'}), 404

        # Download file bytes from GCS and serve with attachment header
        try:
            from urllib.parse import quote
            file_bytes = gcp_bucket.download_file_from_gcs(
                report.pdf_gcs_url
            )
            if report.pdf_storage_key.endswith('.pdf'):
                content_type = 'application/pdf'
                download_name = f"兒童發展分析報告_{report.child_name}_{report.report_id[:8]}.pdf"
            else:
                content_type = 'text/html'
                download_name = f"兒童發展分析報告_{report.child_name}_{report.report_id[:8]}.html"
            encoded_name = quote(download_name, safe='')
            return Response(
                file_bytes,
                mimetype=content_type,
                headers={
                    'Content-Disposition': f"attachment; filename*=UTF-8''{encoded_name}",
                    'Content-Length': str(len(file_bytes)),
                },
            )
        except Exception as dl_err:
            current_app.logger.warning(f"Direct download failed, trying signed URL: {dl_err}")
            # Fallback: try signed URL with response_disposition param
            try:
                signed_url = gcp_bucket.generate_signed_url(report.pdf_storage_key, expiration_minutes=30)
                return redirect(signed_url)
            except Exception:
                if report.pdf_gcs_url:
                    return redirect(report.pdf_gcs_url)
                return jsonify({'error': '無法產生下載連結'}), 500
    except Exception as e:
        current_app.logger.error(f"Error downloading report: {e}")
        return jsonify({'error': str(e)}), 500