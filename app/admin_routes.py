from flask import Blueprint, Response, current_app, jsonify, redirect, render_template, request, url_for
from flask_jwt_extended import jwt_required, decode_token, get_jwt_identity as _get_jwt_identity


admin_bp = Blueprint('admin', __name__)


ATTENTION_LEVEL_RANK = {
	'normal': 0,
	'warning': 1,
	'critical': 2,
}


def _get_admin_request_user():
	"""Return the current admin user or an error response."""
	from .models import User

	user_id = _get_jwt_identity()
	user = User.query.get(user_id)
	if not user or not user.is_admin():
		return None, (jsonify({'error': 'Admin access required'}), 403)
	return user, None


def _promote_attention_level(current_level, next_level):
	"""Return the higher-priority attention level."""
	if ATTENTION_LEVEL_RANK.get(next_level, 0) > ATTENTION_LEVEL_RANK.get(current_level, 0):
		return next_level
	return current_level


def _collect_dimension_sections(report):
	"""Collect all structured dimension sections from a video report."""
	overall = report.overall_assessment or {}
	return [
		('身體動作', report.motor_analysis or overall.get('motor_development') or {}),
		('語言發展', report.language_analysis or overall.get('language_development') or {}),
		('社交情緒', report.social_emotional_analysis or overall.get('social_emotional') or {}),
		('認知發展', report.cognitive_analysis or overall.get('cognitive') or {}),
		('適應行為', report.adaptive_behavior_analysis or overall.get('adaptive_behavior') or {}),
		('自理能力', report.selfcare_analysis or overall.get('selfcare') or {}),
	]


def _build_video_report_attention(report):
	"""Build normalized attention metadata for a structured video report."""
	level = 'normal'
	reasons = []
	overall = report.overall_assessment or {}

	if report.status == 'failed':
		level = _promote_attention_level(level, 'critical')
		reasons.append('報告處理失敗')

	if overall.get('professional_referral_needed'):
		level = _promote_attention_level(level, 'critical')
		reasons.append('建議專業轉介')

	referral_reason = overall.get('referral_reason')
	if referral_reason:
		reasons.append(f'轉介原因：{referral_reason}')

	dimension_statuses = []
	for section_name, section_data in _collect_dimension_sections(report):
		if not isinstance(section_data, dict) or not section_data:
			continue

		section_status = (section_data.get('status') or section_data.get('overall_status') or '').upper()
		if section_status:
			dimension_statuses.append({'name': section_name, 'status': section_status})

		if section_status == 'NEEDS_ATTENTION':
			level = _promote_attention_level(level, 'critical')
			reasons.append(f'{section_name}：需要注意')
		elif section_status == 'CONCERN':
			level = _promote_attention_level(level, 'warning')
			reasons.append(f'{section_name}：需要關注')

		standards = section_data.get('standards_table') or section_data.get('standards_compliance') or []
		if isinstance(standards, list) and any((item or {}).get('status') == 'CONCERN' for item in standards):
			level = _promote_attention_level(level, 'warning')
			reasons.append(f'{section_name}：年齡標準比對有關注項目')

	normalized_reasons = []
	for reason in reasons:
		if reason not in normalized_reasons:
			normalized_reasons.append(reason)

	return {
		'is_flagged': level != 'normal',
		'attention_level': level,
		'attention_reasons': normalized_reasons,
		'dimension_statuses': dimension_statuses,
		'professional_referral_needed': bool(overall.get('professional_referral_needed')),
	}


def _build_video_attention(video, latest_report=None):
	"""Build normalized attention metadata for a video record."""
	level = 'normal'
	reasons = []

	if video.transcription_status == 'failed':
		level = _promote_attention_level(level, 'critical')
		reasons.append('轉錄失敗')
	if video.analysis_status == 'failed':
		level = _promote_attention_level(level, 'critical')
		reasons.append('影片分析失敗')

	report_attention = None
	if latest_report:
		report_attention = _build_video_report_attention(latest_report)
		level = _promote_attention_level(level, report_attention['attention_level'])
		reasons.extend(report_attention['attention_reasons'])

	normalized_reasons = []
	for reason in reasons:
		if reason not in normalized_reasons:
			normalized_reasons.append(reason)

	return {
		'is_flagged': level != 'normal',
		'attention_level': level,
		'attention_reasons': normalized_reasons,
		'latest_report_attention': report_attention,
	}


def _build_assessment_attention(record):
	"""Build normalized attention metadata for a development assessment."""
	level = 'normal'
	reasons = []

	dq_level = (record.dq_level or '').strip()
	if not record.is_completed:
		level = _promote_attention_level(level, 'warning')
		reasons.append('評估尚未完成')

	if dq_level in {'邊界低下', '發育遲緩', 'borderline_low', 'disability'}:
		level = _promote_attention_level(level, 'critical')
		reasons.append(f'DQ 等級：{dq_level}')

	area_results = record.area_results or {}
	if isinstance(area_results, dict):
		for area_name, area_data in area_results.items():
			if not isinstance(area_data, dict):
				continue
			status = (area_data.get('status') or '').lower()
			label = area_data.get('label') or area_name
			if status in {'needs_improvement', 'borderline_low'}:
				level = _promote_attention_level(level, 'warning')
				reasons.append(f'{label}：需要加強')
			elif status in {'disability', 'failed'}:
				level = _promote_attention_level(level, 'critical')
				reasons.append(f'{label}：結果未達標')

	normalized_reasons = []
	for reason in reasons:
		if reason not in normalized_reasons:
			normalized_reasons.append(reason)

	return {
		'is_flagged': level != 'normal',
		'attention_level': level,
		'attention_reasons': normalized_reasons,
	}


def _build_pose_attention(run):
	"""Build normalized attention metadata for a pose assessment run."""
	level = 'normal'
	reasons = []
	evaluation = run.evaluation or {}
	score = evaluation.get('score') or {}
	percent = score.get('percent') or 0
	failures = evaluation.get('failures') or []

	if percent < 50:
		level = _promote_attention_level(level, 'critical')
		reasons.append(f'姿態測驗完成率偏低（{percent}%）')
	elif percent < 70:
		level = _promote_attention_level(level, 'warning')
		reasons.append(f'姿態測驗需要加強（{percent}%）')

	if failures:
		level = _promote_attention_level(level, 'critical' if len(failures) >= 2 else 'warning')
		reasons.append(f'未完成動作：{len(failures)} 項')

	if not evaluation:
		level = _promote_attention_level(level, 'warning')
		reasons.append('缺少姿態評估結果')

	return {
		'is_flagged': level != 'normal',
		'attention_level': level,
		'attention_reasons': reasons,
	}


def _serialize_video_record_for_admin(video):
	"""Serialize a video record for the admin dashboard."""
	from .models import VideoAnalysisReport

	latest_report = (
		VideoAnalysisReport.query
		.filter_by(video_id=video.id)
		.order_by(VideoAnalysisReport.created_at.desc())
		.first()
	)
	attention = _build_video_attention(video, latest_report)
	user = video.user
	latest_report_payload = None

	if latest_report:
		latest_report_attention = attention.get('latest_report_attention') or _build_video_report_attention(latest_report)
		latest_report_payload = {
			'report_id': latest_report.report_id,
			'status': latest_report.status,
			'child_name': latest_report.child_name,
			'created_at': latest_report.created_at.isoformat() if latest_report.created_at else None,
			'attention_level': latest_report_attention['attention_level'],
			'is_flagged': latest_report_attention['is_flagged'],
		}

	return {
		'id': video.id,
		'user_id': video.user_id,
		'username': user.username if user else '-',
		'email': user.email if user else '-',
		'original_filename': video.original_filename,
		'file_size': video.file_size,
		'duration': video.duration,
		'transcription_status': video.transcription_status,
		'analysis_status': video.analysis_status,
		'created_at': video.created_at.isoformat() if video.created_at else None,
		'updated_at': video.updated_at.isoformat() if video.updated_at else None,
		'attention': attention,
		'latest_report': latest_report_payload,
	}


def _serialize_video_report_for_admin(report, include_full=False):
	"""Serialize a structured video report for the admin dashboard."""
	attention = _build_video_report_attention(report)
	user = report.user
	video = report.video
	video_stream_url = f'/admin/videos/{report.video_id}/file' if video else None
	payload = {
		'id': report.id,
		'report_id': report.report_id,
		'user_id': report.user_id,
		'username': user.username if user else '-',
		'email': user.email if user else '-',
		'video_id': report.video_id,
		'video_filename': video.original_filename if video else '-',
		'video_stream_url': video_stream_url,
		'child_id': report.child_id,
		'child_name': report.child_name,
		'child_age_months': report.child_age_months,
		'status': report.status,
		'error_message': report.error_message,
		'pdf_gcs_url': report.pdf_gcs_url,
		'created_at': report.created_at.isoformat() if report.created_at else None,
		'updated_at': report.updated_at.isoformat() if report.updated_at else None,
		'completed_at': report.completed_at.isoformat() if report.completed_at else None,
		'attention': attention,
	}
	if include_full:
		payload.update(report.to_dict(include_full=True))
		payload['username'] = user.username if user else '-'
		payload['email'] = user.email if user else '-'
		payload['video_filename'] = video.original_filename if video else '-'
		payload['video_stream_url'] = video_stream_url
		payload['attention'] = attention
	return payload


def _serialize_assessment_for_admin(record, include_answers=False):
	"""Serialize a development assessment for the admin dashboard."""
	attention = _build_assessment_attention(record)
	user = record.user
	payload = record.to_dict(include_answers=include_answers)
	payload.update({
		'username': user.username if user else '-',
		'email': user.email if user else '-',
		'attention': attention,
	})
	return payload


def _serialize_pose_run_for_admin(run, include_payload=False):
	"""Serialize a pose assessment run for the admin dashboard."""
	attention = _build_pose_attention(run)
	user = run.user
	payload = run.to_dict(include_payload=include_payload)
	payload.update({
		'username': user.username if user else '-',
		'email': user.email if user else '-',
		'attention': attention,
	})
	return payload


def _filter_admin_items_by_attention(items, attention_filter):
	"""Filter serialized admin items by normalized attention level."""
	if attention_filter not in {'flagged', 'critical', 'warning'}:
		return items
	if attention_filter == 'flagged':
		return [item for item in items if item.get('attention', {}).get('is_flagged')]
	return [item for item in items if item.get('attention', {}).get('attention_level') == attention_filter]


@admin_bp.route('/admin')
def admin():
	"""Render the admin dashboard page (admin-only)."""
	token = request.cookies.get('access_token')

	if not token:
		return redirect(url_for('main.login_page'))

	try:
		data = decode_token(token)
		from .models import User

		user = User.query.get(data.get('sub'))
		if not user or not user.is_admin():
			return redirect(url_for('main.index'))
	except Exception:
		response = redirect(url_for('main.login_page'))
		response.delete_cookie('access_token')
		return response

	return render_template('admin.html', user=user)


@admin_bp.route('/admin/rag/documents', methods=['POST'])
@jwt_required()
def rag_upload_document():
	"""Upload a document to the global RAG knowledge base (admin only)."""
	from .models import RagDocument, User, db
	from . import gcp_bucket as gcs

	user_id = _get_jwt_identity()
	user = User.query.get(user_id)
	if not user or not user.is_admin():
		return jsonify({'error': 'Admin access required'}), 403

	if 'file' not in request.files:
		return jsonify({'error': 'No file provided'}), 400

	file = request.files['file']
	if not file.filename:
		return jsonify({'error': 'Empty filename'}), 400

	ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
	allowed = current_app.config.get('RAG_ALLOWED_EXTENSIONS', {'pdf', 'txt', 'md'})
	if ext not in allowed:
		return jsonify({'error': f'Unsupported file type: .{ext}. Allowed: {sorted(allowed)}'}), 400

	try:
		gcs_path, file_size = gcs.upload_rag_document(file, file.filename, file.content_type)
		content_type = file.content_type
		if not content_type or content_type == 'application/octet-stream':
			content_type = gcs.get_content_type_from_url(file.filename)

		doc = RagDocument(
			filename=gcs_path.split('/')[-1],
			original_filename=file.filename,
			content_type=content_type,
			gcs_path=gcs_path,
			file_size=file_size,
			status='pending',
			uploaded_by=user_id,
		)
		db.session.add(doc)
		db.session.commit()

		from app import socketio
		from app.rag.processor import process_document

		app = current_app._get_current_object()
		doc_id = doc.id

		def _bg_process():
			with app.app_context():
				process_document(doc_id)

		socketio.start_background_task(_bg_process)

		return jsonify({
			'message': 'Document uploaded — processing in background',
			'document': doc.to_dict(),
		}), 201
	except Exception as e:
		db.session.rollback()
		return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@admin_bp.route('/admin/rag/documents', methods=['GET'])
@jwt_required()
def rag_list_documents():
	"""List all RAG documents (admin only)."""
	from .models import RagDocument

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	docs = RagDocument.query.order_by(RagDocument.created_at.desc()).all()
	return jsonify({'documents': [d.to_dict() for d in docs]}), 200


@admin_bp.route('/admin/rag/documents/<int:doc_id>', methods=['GET'])
@jwt_required()
def rag_get_document(doc_id):
	"""Get a RAG document with chunk previews (admin only)."""
	from .models import RagDocument

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	doc = RagDocument.query.get(doc_id)
	if not doc:
		return jsonify({'error': 'Document not found'}), 404

	return jsonify({'document': doc.to_dict(include_chunks=True)}), 200


@admin_bp.route('/admin/rag/documents/<int:doc_id>', methods=['DELETE'])
@jwt_required()
def rag_delete_document(doc_id):
	"""Delete a RAG document, its chunks, and GCS file (admin only)."""
	from . import gcp_bucket as gcs
	from .models import RagDocument
	from app.rag.processor import delete_document_data

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	doc = RagDocument.query.get(doc_id)
	if not doc:
		return jsonify({'error': 'Document not found'}), 404

	gcs_path = doc.gcs_path
	delete_document_data(doc_id)
	gcs.delete_rag_document(gcs_path)
	return jsonify({'message': 'Document deleted'}), 200


@admin_bp.route('/admin/rag/documents/<int:doc_id>/reprocess', methods=['POST'])
@jwt_required()
def rag_reprocess_document(doc_id):
	"""Re-chunk and re-embed a document (admin only)."""
	from .models import RagDocument
	from app.rag.processor import process_document

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	doc = RagDocument.query.get(doc_id)
	if not doc:
		return jsonify({'error': 'Document not found'}), 404

	from app import socketio

	app = current_app._get_current_object()
	doc_id_val = doc.id

	def _bg_reprocess():
		with app.app_context():
			process_document(doc_id_val)

	socketio.start_background_task(_bg_reprocess)

	return jsonify({
		'message': 'Reprocessing started — status will update via Socket.IO',
		'document': doc.to_dict(),
	}), 200


@admin_bp.route('/admin/rag/documents/batch', methods=['DELETE'])
@jwt_required()
def rag_batch_delete():
	"""Batch delete multiple RAG documents (admin only)."""
	from . import gcp_bucket as gcs
	from .models import RagDocument
	from app.rag.processor import delete_document_data

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	data = request.get_json() or {}
	doc_ids = data.get('document_ids', [])
	if not doc_ids or not isinstance(doc_ids, list):
		return jsonify({'error': 'document_ids array is required'}), 400

	deleted = 0
	for doc_id in doc_ids:
		doc = RagDocument.query.get(doc_id)
		if doc:
			delete_document_data(doc_id)
			gcs.delete_rag_document(doc.gcs_path)
			deleted += 1

	return jsonify({'message': f'{deleted} document(s) deleted', 'deleted': deleted}), 200


@admin_bp.route('/admin/rag/search', methods=['POST'])
@jwt_required()
def rag_test_search():
	"""Test search endpoint for admins to verify retrieval quality."""
	from app.rag.retriever import search_knowledge

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	data = request.get_json() or {}
	query = data.get('query', '').strip()
	if not query:
		return jsonify({'error': 'Query is required'}), 400

	top_k = data.get('top_k', current_app.config.get('RAG_TOP_K', 5))
	results = search_knowledge(query, top_k=top_k)
	return jsonify({'query': query, 'results': results}), 200


@admin_bp.route('/admin/users', methods=['GET'])
@jwt_required()
def admin_list_users():
	"""List all users with pagination, search, and filter (admin only)."""
	from .models import User, db

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	page = request.args.get('page', 1, type=int)
	per_page = min(request.args.get('per_page', 20, type=int), 100)
	search = request.args.get('search', '').strip()
	role_filter = request.args.get('role', '').strip()
	status_filter = request.args.get('status', '').strip()

	query = User.query
	if search:
		search_pattern = f'%{search}%'
		query = query.filter(db.or_(User.username.ilike(search_pattern), User.email.ilike(search_pattern)))
	if role_filter and role_filter != 'all':
		query = query.filter(User.role == role_filter)
	if status_filter == 'active':
		query = query.filter(User.is_active == True)
	elif status_filter == 'inactive':
		query = query.filter(User.is_active == False)

	total = query.count()
	users = query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
	return jsonify({
		'users': [u.to_dict() for u in users.items],
		'total': total,
		'page': page,
		'per_page': per_page,
		'pages': users.pages,
	}), 200


@admin_bp.route('/admin/users', methods=['POST'])
@jwt_required()
def admin_create_user():
	"""Create a new user (admin only)."""
	from .models import User, db

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	data = request.get_json()
	if not data:
		return jsonify({'error': 'No data provided'}), 400

	username = data.get('username', '').strip()
	email = data.get('email', '').strip()
	password = data.get('password', '').strip()
	role = data.get('role', 'user').strip()

	if not username or not email or not password:
		return jsonify({'error': 'Username, email, and password are required'}), 400
	if role not in ['user', 'admin', 'teacher']:
		return jsonify({'error': 'Invalid role. Allowed: user, admin, teacher'}), 400
	if User.query.filter_by(username=username).first():
		return jsonify({'error': 'Username already exists'}), 400
	if User.query.filter_by(email=email).first():
		return jsonify({'error': 'Email already exists'}), 400

	try:
		new_user = User(username=username, email=email, role=role)
		new_user.set_password(password)
		db.session.add(new_user)
		db.session.commit()
		return jsonify({'message': 'User created successfully', 'user': new_user.to_dict()}), 201
	except Exception as e:
		db.session.rollback()
		current_app.logger.error(f'Error creating user: {e}')
		return jsonify({'error': 'Failed to create user'}), 500


@admin_bp.route('/admin/users/<int:target_user_id>', methods=['GET'])
@jwt_required()
def admin_get_user(target_user_id):
	"""Get a specific user by ID (admin only)."""
	from .models import User

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	target_user = User.query.get(target_user_id)
	if not target_user:
		return jsonify({'error': 'User not found'}), 404
	return jsonify({'user': target_user.to_dict()}), 200


@admin_bp.route('/admin/users/<int:target_user_id>', methods=['PUT'])
@jwt_required()
def admin_update_user(target_user_id):
	"""Update a user's information (admin only)."""
	from .models import User, db

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	target_user = User.query.get(target_user_id)
	if not target_user:
		return jsonify({'error': 'User not found'}), 404

	data = request.get_json()
	if not data:
		return jsonify({'error': 'No data provided'}), 400

	if 'username' in data:
		username = data['username'].strip()
		if username and username != target_user.username:
			if User.query.filter_by(username=username).first():
				return jsonify({'error': 'Username already exists'}), 400
			target_user.username = username
	if 'email' in data:
		email = data['email'].strip()
		if email and email != target_user.email:
			if User.query.filter_by(email=email).first():
				return jsonify({'error': 'Email already exists'}), 400
			target_user.email = email
	if 'password' in data:
		password = data['password'].strip()
		if password:
			target_user.set_password(password)
	if 'role' in data:
		role = data['role'].strip()
		if role in ['user', 'admin', 'teacher']:
			target_user.role = role
	if 'is_active' in data:
		target_user.is_active = bool(data['is_active'])

	try:
		db.session.commit()
		return jsonify({'message': 'User updated successfully', 'user': target_user.to_dict()}), 200
	except Exception as e:
		db.session.rollback()
		current_app.logger.error(f'Error updating user: {e}')
		return jsonify({'error': 'Failed to update user'}), 500


@admin_bp.route('/admin/users/<int:target_user_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_user(target_user_id):
	"""Delete a user (admin only). Cannot delete yourself."""
	from .models import User, UserProfile, db

	user_id = _get_jwt_identity()
	user = User.query.get(user_id)
	if not user or not user.is_admin():
		return jsonify({'error': 'Admin access required'}), 403
	if target_user_id == user_id:
		return jsonify({'error': 'Cannot delete your own account'}), 400

	target_user = User.query.get(target_user_id)
	if not target_user:
		return jsonify({'error': 'User not found'}), 404

	try:
		UserProfile.query.filter_by(user_id=target_user_id).delete()
		db.session.delete(target_user)
		db.session.commit()
		return jsonify({'message': 'User deleted successfully'}), 200
	except Exception as e:
		db.session.rollback()
		current_app.logger.error(f'Error deleting user: {e}')
		return jsonify({'error': 'Failed to delete user'}), 500


@admin_bp.route('/admin/users/<int:target_user_id>/role', methods=['PATCH'])
@jwt_required()
def admin_update_user_role(target_user_id):
	"""Update a user's role (admin only)."""
	from .models import User, db

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	target_user = User.query.get(target_user_id)
	if not target_user:
		return jsonify({'error': 'User not found'}), 404

	data = request.get_json()
	if not data or 'role' not in data:
		return jsonify({'error': 'Role is required'}), 400

	role = data['role'].strip()
	if role not in ['user', 'admin', 'teacher']:
		return jsonify({'error': 'Invalid role. Allowed: user, admin, teacher'}), 400

	target_user.role = role
	try:
		db.session.commit()
		return jsonify({'message': 'User role updated successfully', 'user': target_user.to_dict()}), 200
	except Exception as e:
		db.session.rollback()
		current_app.logger.error(f'Error updating user role: {e}')
		return jsonify({'error': 'Failed to update user role'}), 500


@admin_bp.route('/admin/users/<int:target_user_id>/status', methods=['PATCH'])
@jwt_required()
def admin_toggle_user_status(target_user_id):
	"""Toggle a user's active status (admin only)."""
	from .models import User, db

	user_id = _get_jwt_identity()
	user = User.query.get(user_id)
	if not user or not user.is_admin():
		return jsonify({'error': 'Admin access required'}), 403

	target_user = User.query.get(target_user_id)
	if not target_user:
		return jsonify({'error': 'User not found'}), 404
	if target_user_id == user_id:
		return jsonify({'error': 'Cannot toggle your own status'}), 400

	target_user.is_active = not target_user.is_active
	try:
		db.session.commit()
		return jsonify({
			'message': f"User {'activated' if target_user.is_active else 'deactivated'} successfully",
			'user': target_user.to_dict(),
		}), 200
	except Exception as e:
		db.session.rollback()
		current_app.logger.error(f'Error toggling user status: {e}')
		return jsonify({'error': 'Failed to toggle user status'}), 500


@admin_bp.route('/admin/stats', methods=['GET'])
@jwt_required()
def admin_get_stats():
	"""Get system statistics (admin only)."""
	from .models import (
		Child,
		ChildDevelopmentAssessmentRecord,
		Conversation,
		Message,
		PoseAssessmentRun,
		User,
		VideoAnalysisReport,
		VideoRecord,
		db,
	)

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	try:
		total_users = User.query.count()
		admin_users = User.query.filter_by(role='admin').count()
		teacher_users = User.query.filter_by(role='teacher').count()
		regular_users = User.query.filter_by(role='user').count()
		active_users = User.query.filter_by(is_active=True).count()
		total_conversations = Conversation.query.count()
		total_messages = Message.query.count()
		total_children = Child.query.count()
		total_assessments = ChildDevelopmentAssessmentRecord.query.count()
		completed_assessments = ChildDevelopmentAssessmentRecord.query.filter_by(is_completed=True).count()
		total_videos = VideoRecord.query.count()
		total_reports = VideoAnalysisReport.query.count()
		total_pose_runs = PoseAssessmentRun.query.count()
		failed_videos = VideoRecord.query.filter(db.or_(VideoRecord.transcription_status == 'failed', VideoRecord.analysis_status == 'failed')).count()
		flagged_reports = sum(1 for report in VideoAnalysisReport.query.all() if _build_video_report_attention(report)['is_flagged'])
		flagged_assessments = sum(1 for record in ChildDevelopmentAssessmentRecord.query.all() if _build_assessment_attention(record)['is_flagged'])
		flagged_pose_runs = sum(1 for run in PoseAssessmentRun.query.all() if _build_pose_attention(run)['is_flagged'])

		from datetime import datetime
		today = datetime.utcnow().date()
		today_start = datetime.combine(today, datetime.min.time())
		new_users_today = User.query.filter(User.created_at >= today_start).count()
		new_videos_today = VideoRecord.query.filter(VideoRecord.created_at >= today_start).count()

		return jsonify({
			'users': {
				'total': total_users,
				'admins': admin_users,
				'teachers': teacher_users,
				'regular': regular_users,
				'active': active_users,
				'new_today': new_users_today,
			},
			'conversations': {'total': total_conversations},
			'messages': {'total': total_messages},
			'children': {'total': total_children},
			'assessments': {
				'total': total_assessments,
				'completed': completed_assessments,
				'flagged': flagged_assessments,
			},
			'videos': {
				'total': total_videos,
				'failed': failed_videos,
				'new_today': new_videos_today,
			},
			'reports': {
				'total': total_reports,
				'flagged': flagged_reports,
			},
			'pose_runs': {
				'total': total_pose_runs,
				'flagged': flagged_pose_runs,
			},
		}), 200
	except Exception as e:
		current_app.logger.error(f'Error getting admin stats: {e}')
		return jsonify({'error': 'Failed to get statistics'}), 500


@admin_bp.route('/admin/videos', methods=['GET'])
@jwt_required()
def admin_list_videos():
	"""List all uploaded videos for admins."""
	from .models import User, VideoRecord, db

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	page = request.args.get('page', 1, type=int)
	per_page = min(request.args.get('per_page', 10, type=int), 100)
	search = request.args.get('search', '').strip()
	status = request.args.get('status', '').strip().lower()
	attention = request.args.get('attention', '').strip().lower()

	query = VideoRecord.query.join(User, VideoRecord.user_id == User.id)
	if search:
		pattern = f'%{search}%'
		query = query.filter(db.or_(User.username.ilike(pattern), User.email.ilike(pattern), VideoRecord.original_filename.ilike(pattern)))
	if status == 'failed':
		query = query.filter(db.or_(VideoRecord.transcription_status == 'failed', VideoRecord.analysis_status == 'failed'))
	elif status == 'completed':
		query = query.filter(VideoRecord.analysis_status == 'completed')
	elif status == 'processing':
		query = query.filter(db.or_(VideoRecord.transcription_status == 'processing', VideoRecord.analysis_status == 'processing'))
	elif status == 'pending':
		query = query.filter(db.or_(VideoRecord.transcription_status == 'pending', VideoRecord.analysis_status == 'pending'))

	items = [_serialize_video_record_for_admin(video) for video in query.order_by(VideoRecord.created_at.desc()).all()]
	items = _filter_admin_items_by_attention(items, attention)
	total = len(items)
	start = (page - 1) * per_page
	page_items = items[start:start + per_page]
	pages = max((total + per_page - 1) // per_page, 1)
	return jsonify({'videos': page_items, 'page': page, 'per_page': per_page, 'pages': pages, 'total': total}), 200


@admin_bp.route('/admin/videos/<int:video_id>', methods=['GET'])
@jwt_required()
def admin_get_video(video_id):
	"""Get a specific video record for admins."""
	from .models import VideoAnalysisReport, VideoRecord

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	video = VideoRecord.query.get(video_id)
	if not video:
		return jsonify({'error': 'Video not found'}), 404

	payload = _serialize_video_record_for_admin(video)
	payload['reports'] = [
		_serialize_video_report_for_admin(report)
		for report in VideoAnalysisReport.query.filter_by(video_id=video.id).order_by(VideoAnalysisReport.created_at.desc()).all()
	]
	return jsonify({'video': payload}), 200


@admin_bp.route('/admin/videos/<int:video_id>/file', methods=['GET'])
@jwt_required()
def admin_stream_video_file(video_id):
	"""Stream the stored video file for admins through the backend."""
	from urllib.parse import quote

	from .models import VideoRecord
	from . import gcp_bucket

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	video = VideoRecord.query.get(video_id)
	if not video:
		return jsonify({'error': 'Video not found'}), 404

	if isinstance(video.file_path, str) and video.file_path.startswith(('https://storage.googleapis.com/', 'gs://')):
		try:
			file_bytes = gcp_bucket.download_file_from_gcs(video.file_path)
			content_type = gcp_bucket.get_content_type_from_url(video.file_path)
			encoded_name = quote(video.original_filename or f'video_{video.id}', safe='')
			return Response(
				file_bytes,
				mimetype=content_type,
				headers={
					'Content-Disposition': f"inline; filename*=UTF-8''{encoded_name}",
					'Content-Length': str(len(file_bytes)),
					'Accept-Ranges': 'bytes',
				},
			)
		except Exception as exc:
			current_app.logger.error(f'Error streaming admin video file: {exc}')
			return jsonify({'error': 'Failed to load video file'}), 500

	return jsonify({'error': 'File not available'}), 404


@admin_bp.route('/admin/video-reports', methods=['GET'])
@jwt_required()
def admin_list_video_reports():
	"""List all structured video analysis reports for admins."""
	from .models import User, VideoAnalysisReport, VideoRecord, db

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	page = request.args.get('page', 1, type=int)
	per_page = min(request.args.get('per_page', 10, type=int), 100)
	search = request.args.get('search', '').strip()
	status = request.args.get('status', '').strip().lower()
	attention = request.args.get('attention', '').strip().lower()

	query = VideoAnalysisReport.query.join(User, VideoAnalysisReport.user_id == User.id).join(VideoRecord, VideoAnalysisReport.video_id == VideoRecord.id)
	if search:
		pattern = f'%{search}%'
		query = query.filter(db.or_(
			User.username.ilike(pattern),
			User.email.ilike(pattern),
			VideoAnalysisReport.child_name.ilike(pattern),
			VideoRecord.original_filename.ilike(pattern),
			VideoAnalysisReport.report_id.ilike(pattern),
		))
	if status and status != 'all':
		query = query.filter(VideoAnalysisReport.status == status)

	items = [_serialize_video_report_for_admin(report) for report in query.order_by(VideoAnalysisReport.created_at.desc()).all()]
	items = _filter_admin_items_by_attention(items, attention)
	total = len(items)
	start = (page - 1) * per_page
	page_items = items[start:start + per_page]
	pages = max((total + per_page - 1) // per_page, 1)
	return jsonify({'reports': page_items, 'page': page, 'per_page': per_page, 'pages': pages, 'total': total}), 200


@admin_bp.route('/admin/video-reports/<report_id>', methods=['GET'])
@jwt_required()
def admin_get_video_report(report_id):
	"""Get a structured video report for admins."""
	from .models import VideoAnalysisReport

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	report = VideoAnalysisReport.query.filter_by(report_id=report_id).first()
	if not report:
		return jsonify({'error': 'Report not found'}), 404
	return jsonify({'report': _serialize_video_report_for_admin(report, include_full=True)}), 200


@admin_bp.route('/admin/assessments', methods=['GET'])
@jwt_required()
def admin_list_assessments():
	"""List all child development assessments for admins."""
	from .models import ChildDevelopmentAssessmentRecord, User, db

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	page = request.args.get('page', 1, type=int)
	per_page = min(request.args.get('per_page', 10, type=int), 100)
	search = request.args.get('search', '').strip()
	status = request.args.get('status', '').strip().lower()
	attention = request.args.get('attention', '').strip().lower()

	query = ChildDevelopmentAssessmentRecord.query.join(User, ChildDevelopmentAssessmentRecord.user_id == User.id)
	if search:
		pattern = f'%{search}%'
		query = query.filter(db.or_(
			User.username.ilike(pattern),
			User.email.ilike(pattern),
			ChildDevelopmentAssessmentRecord.child_name.ilike(pattern),
			ChildDevelopmentAssessmentRecord.assessment_id.ilike(pattern),
		))
	if status == 'completed':
		query = query.filter(ChildDevelopmentAssessmentRecord.is_completed == True)
	elif status == 'pending':
		query = query.filter(ChildDevelopmentAssessmentRecord.is_completed == False)

	items = [_serialize_assessment_for_admin(record) for record in query.order_by(ChildDevelopmentAssessmentRecord.created_at.desc()).all()]
	items = _filter_admin_items_by_attention(items, attention)
	total = len(items)
	start = (page - 1) * per_page
	page_items = items[start:start + per_page]
	pages = max((total + per_page - 1) // per_page, 1)
	return jsonify({'assessments': page_items, 'page': page, 'per_page': per_page, 'pages': pages, 'total': total}), 200


@admin_bp.route('/admin/assessments/<assessment_id>', methods=['GET'])
@jwt_required()
def admin_get_assessment(assessment_id):
	"""Get a development assessment for admins."""
	from .models import ChildDevelopmentAssessmentRecord

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	record = ChildDevelopmentAssessmentRecord.query.filter_by(assessment_id=assessment_id).first()
	if not record:
		return jsonify({'error': 'Assessment not found'}), 404
	return jsonify({'assessment': _serialize_assessment_for_admin(record, include_answers=True)}), 200


@admin_bp.route('/admin/pose-runs', methods=['GET'])
@jwt_required()
def admin_list_pose_runs():
	"""List all pose assessment runs for admins."""
	from .models import PoseAssessmentRun, User, db

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	page = request.args.get('page', 1, type=int)
	per_page = min(request.args.get('per_page', 10, type=int), 100)
	search = request.args.get('search', '').strip()
	attention = request.args.get('attention', '').strip().lower()

	query = PoseAssessmentRun.query.join(User, PoseAssessmentRun.user_id == User.id)
	if search:
		pattern = f'%{search}%'
		query = query.filter(db.or_(User.username.ilike(pattern), User.email.ilike(pattern), PoseAssessmentRun.run_id.ilike(pattern)))

	items = [_serialize_pose_run_for_admin(run) for run in query.order_by(PoseAssessmentRun.created_at.desc()).all()]
	items = _filter_admin_items_by_attention(items, attention)
	total = len(items)
	start = (page - 1) * per_page
	page_items = items[start:start + per_page]
	pages = max((total + per_page - 1) // per_page, 1)
	return jsonify({'runs': page_items, 'page': page, 'per_page': per_page, 'pages': pages, 'total': total}), 200


@admin_bp.route('/admin/pose-runs/<run_id>', methods=['GET'])
@jwt_required()
def admin_get_pose_run(run_id):
	"""Get a pose assessment run for admins."""
	from .models import PoseAssessmentRun

	_, error_response = _get_admin_request_user()
	if error_response:
		return error_response

	run = PoseAssessmentRun.query.filter_by(run_id=run_id).first()
	if not run:
		return jsonify({'error': 'Pose run not found'}), 404
	return jsonify({'run': _serialize_pose_run_for_admin(run, include_payload=True)}), 200
