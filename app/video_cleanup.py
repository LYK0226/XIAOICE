"""Shared cleanup helpers for videos and analysis reports."""

from . import gcp_bucket


def delete_report_assets(report):
    if report.pdf_storage_key:
        gcp_bucket.delete_file_from_gcs(report.pdf_storage_key)
    elif report.pdf_gcs_url:
        gcp_bucket.delete_file_from_gcs(report.pdf_gcs_url)


def delete_report_records(reports, db):
    for rpt in reports:
        delete_report_assets(rpt)
        db.session.delete(rpt)


def delete_video_assets(video, require_success=False):
    success = True
    if isinstance(video.file_path, str) and video.file_path.startswith('https://storage.googleapis.com/'):
        success = gcp_bucket.delete_file_from_gcs(video.file_path)
    elif video.storage_key:
        success = gcp_bucket.delete_file_from_gcs(video.storage_key)

    if require_success and not success:
        raise RuntimeError(f"Failed to delete video from GCS: {video.storage_key or video.file_path}")

    return success


def delete_video_only(video, db, require_success=False):
    delete_video_assets(video, require_success=require_success)
    db.session.delete(video)


def delete_video_with_reports(video, db):
    from .models import VideoAnalysisReport

    delete_video_assets(video)
    reports = VideoAnalysisReport.query.filter_by(video_id=video.id).all()
    delete_report_records(reports, db)
    db.session.delete(video)


def delete_reports_for_child(child_id, user_id, db):
    from .models import VideoAnalysisReport, VideoRecord
    from sqlalchemy import or_

    reports = VideoAnalysisReport.query.filter_by(child_id=child_id, user_id=user_id).all()
    video_ids = {rpt.video_id for rpt in reports if rpt.video_id}
    delete_report_records(reports, db)

    for video_id in video_ids:
        remaining = VideoAnalysisReport.query.filter(
            VideoAnalysisReport.video_id == video_id,
            or_(
                VideoAnalysisReport.child_id != child_id,
                VideoAnalysisReport.child_id.is_(None)
            )
        ).count()
        if remaining == 0:
            video = VideoRecord.query.filter_by(id=video_id, user_id=user_id).first()
            if video:
                delete_video_only(video, db)
