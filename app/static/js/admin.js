// Auth check - use localStorage since cookie is httponly
if (!localStorage.getItem('access_token')) {
	window.location.href = '/login';
}

// Token getter for API calls
function getToken() {
	return localStorage.getItem('access_token') || '';
}

// User Management State
let userState = {
	page: 1,
	perPage: 20,
	search: '',
	role: '',
	status: '',
	totalPages: 1
};

let reportState = {
	page: 1,
	perPage: 10,
	search: '',
	status: 'all',
	attention: 'all',
	totalPages: 1
};

let assessmentState = {
	page: 1,
	perPage: 10,
	search: '',
	status: 'all',
	attention: 'all',
	totalPages: 1
};

let poseState = {
	page: 1,
	perPage: 10,
	search: '',
	attention: 'all',
	totalPages: 1
};

// Stats State
let statsData = null;

document.addEventListener('DOMContentLoaded', () => {
	// ===== Modal: Add User =====
	const modal = document.getElementById('userModal');
	const btnAddUser = document.getElementById('btnAddUser');
	const btnUploadRag = document.getElementById('btnUploadRag');
	const btnCancel = document.getElementById('btnCancel');
	const btnCancel2 = document.getElementById('btnCancel2');
	const addUserForm = document.getElementById('addUserForm');

	btnAddUser.addEventListener('click', () => {
		modal.classList.add('active');
		resetAddUserForm();
	});
	btnUploadRag.addEventListener('click', () => {
		const knowledgeBaseNav = document.querySelector('[data-section="knowledge-base"]');
		if (knowledgeBaseNav) {
			knowledgeBaseNav.click();
		}
		const uploadInput = document.getElementById('kbFileInput');
		if (uploadInput) {
			uploadInput.click();
		}
	});
	btnCancel.addEventListener('click', () => modal.classList.remove('active'));
	btnCancel2.addEventListener('click', () => modal.classList.remove('active'));
	modal.addEventListener('click', (e) => {
		if (e.target === modal) modal.classList.remove('active');
	});

	function resetAddUserForm() {
		addUserForm.reset();
		document.querySelectorAll('#addUserRoleSelector .role-btn').forEach((b) => b.classList.remove('active'));
		document.querySelector('#addUserRoleSelector .role-btn[data-role="user"]').classList.add('active');
	}

	// Role selector for add user
	document.querySelectorAll('#addUserRoleSelector .role-btn').forEach((btn) => {
		btn.addEventListener('click', function () {
			document.querySelectorAll('#addUserRoleSelector .role-btn').forEach((b) => b.classList.remove('active'));
			this.classList.add('active');
		});
	});

	addUserForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const username = document.getElementById('addUsername').value.trim();
		const email = document.getElementById('addEmail').value.trim();
		const password = document.getElementById('addPassword').value;
		const role = document.querySelector('#addUserRoleSelector .role-btn.active').dataset.role;

		try {
			const res = await fetch('/admin/users', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${getToken()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ username, email, password, role })
			});
			const data = await res.json();
			if (res.ok) {
				alert('用戶創建成功！');
				modal.classList.remove('active');
				loadUsers();
			} else {
				alert(`錯誤: ${data.error || '創建失敗'}`);
			}
		} catch (err) {
			alert(`創建失敗: ${err.message}`);
		}
	});

	// ===== Modal: Edit User =====
	const editModal = document.getElementById('editUserModal');
	const btnEditCancel = document.getElementById('btnEditCancel');
	const btnEditCancel2 = document.getElementById('btnEditCancel2');
	const editUserForm = document.getElementById('editUserForm');

	btnEditCancel.addEventListener('click', () => editModal.classList.remove('active'));
	btnEditCancel2.addEventListener('click', () => editModal.classList.remove('active'));
	editModal.addEventListener('click', (e) => {
		if (e.target === editModal) editModal.classList.remove('active');
	});

	editUserForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const userId = document.getElementById('editUserId').value;
		const username = document.getElementById('editUsername').value.trim();
		const email = document.getElementById('editEmail').value.trim();
		const password = document.getElementById('editPassword').value;
		const role = document.getElementById('editRole').value;
		const isActive = document.getElementById('editStatus').value === 'active';

		const data = { username, email, role, is_active: isActive };
		if (password) data.password = password;

		try {
			const res = await fetch(`/admin/users/${userId}`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${getToken()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});
			const result = await res.json();
			if (res.ok) {
				alert('用戶更新成功！');
				editModal.classList.remove('active');
				loadUsers();
			} else {
				alert(`錯誤: ${result.error || '更新失敗'}`);
			}
		} catch (err) {
			alert(`更新失敗: ${err.message}`);
		}
	});

	// ===== Navigation =====
	const navCards = document.querySelectorAll('.nav-card');
	const sections = document.querySelectorAll('.content-section');

	navCards.forEach((card) => {
		card.addEventListener('click', function () {
			navCards.forEach((n) => n.classList.remove('active'));
			this.classList.add('active');

			const target = this.dataset.section;
			sections.forEach((s) => s.classList.remove('active'));
			document.getElementById(`section-${target}`).classList.add('active');

			if (target === 'overview') loadStats();
			if (target === 'knowledge-base') loadKbDocuments();
			if (target === 'users') {
				loadUsers();
				loadStats();
			}
			if (target === 'reports') loadAdminReports();
			if (target === 'assessments') loadAdminAssessments();
			if (target === 'pose-runs') loadAdminPoseRuns();
		});
	});

	// Load stats on page load (for overview section)
	loadStats();

	// ===== Theme Toggle =====
	document.querySelectorAll('.theme-btn').forEach((btn) => {
		btn.addEventListener('click', function () {
			document.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
			this.classList.add('active');
			const theme = this.dataset.theme;
			if (theme === 'dark') {
				document.body.classList.add('dark-theme');
			} else {
				document.body.classList.remove('dark-theme');
			}
		});
	});

	// ===== User Management Functions =====
	const usersTableBody = document.querySelector('.users-table tbody');
	const userSearchInput = document.querySelector('.search-box input');
	const filterTabs = document.querySelectorAll('.filter-tab');
	const pageInfo = document.querySelector('.page-info');
	const prevPageBtn = document.querySelector('.pagination .page-btn:first-child');
	const nextPageBtn = document.querySelector('.pagination .page-btn:last-child');

	async function loadStats() {
		try {
			const res = await fetch('/admin/stats', { headers: { Authorization: `Bearer ${getToken()}` } });
			const data = await res.json();
			if (res.ok) {
				statsData = data;
				updateStatsDisplay();
			}
		} catch (e) {
			console.error('Failed to load stats:', e);
		}
	}

	function updateStatsDisplay() {
		if (!statsData) return;
		const totalUsersStat = document.getElementById('totalUsersStat');
		const newUsersBadge = document.getElementById('newUsersBadge');
		const activeUsersStat = document.getElementById('activeUsersStat');
		const adminUsersBadge = document.getElementById('adminUsersBadge');
		const assessmentsStat = document.getElementById('assessmentsStat');
		const completedAssessmentsBadge = document.getElementById('completedAssessmentsBadge');
		const videosStat = document.getElementById('videosStat');
		const childrenStatBadge = document.getElementById('childrenStatBadge');
		const flaggedReportsCount = document.getElementById('flaggedReportsCount');
		const flaggedAssessmentsCount = document.getElementById('flaggedAssessmentsCount');
		const flaggedPoseRunsCount = document.getElementById('flaggedPoseRunsCount');
		if (totalUsersStat) {
			totalUsersStat.textContent = (statsData.users.total || 0).toLocaleString();
		}
		if (newUsersBadge) {
			newUsersBadge.textContent = `+${statsData.users.new_today || 0} 今日`;
		}
		if (activeUsersStat) {
			activeUsersStat.textContent = (statsData.users.active || 0).toLocaleString();
		}
		if (adminUsersBadge) {
			adminUsersBadge.textContent = `${statsData.users.admins || 0} 位管理員`;
		}
		if (assessmentsStat) {
			assessmentsStat.textContent = (statsData.assessments.total || 0).toLocaleString();
		}
		if (completedAssessmentsBadge) {
			completedAssessmentsBadge.textContent = `${statsData.assessments.flagged || 0} 需關注`;
		}
		if (videosStat) {
			videosStat.textContent = (statsData.videos.total || 0).toLocaleString();
		}
		if (childrenStatBadge) {
			childrenStatBadge.textContent = `${statsData.videos.failed || 0} 筆失敗`;
		}
		if (flaggedReportsCount) {
			flaggedReportsCount.textContent = (statsData.reports?.flagged || 0).toLocaleString();
		}
		if (flaggedAssessmentsCount) {
			flaggedAssessmentsCount.textContent = (statsData.assessments?.flagged || 0).toLocaleString();
		}
		if (flaggedPoseRunsCount) {
			flaggedPoseRunsCount.textContent = (statsData.pose_runs?.flagged || 0).toLocaleString();
		}
	}

	async function loadUsers() {
		usersTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">載入中...</td></tr>';
		try {
			const params = new URLSearchParams({
				page: userState.page,
				per_page: userState.perPage
			});
			if (userState.search) params.append('search', userState.search);
			if (userState.role) params.append('role', userState.role);
			if (userState.status) params.append('status', userState.status);

			const res = await fetch(`/admin/users?${params}`, {
				headers: { Authorization: `Bearer ${getToken()}` }
			});
			const data = await res.json();

			if (!res.ok) {
				usersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">錯誤: ${data.error || '載入失敗'}</td></tr>`;
				return;
			}

			userState.totalPages = data.pages;
			renderUsersTable(data.users);
			updatePagination();
		} catch (e) {
			usersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">錯誤: ${e.message}</td></tr>`;
		}
	}

	function renderUsersTable(users) {
		if (!users || users.length === 0) {
			usersTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">尚無用戶數據</td></tr>';
			return;
		}

		usersTableBody.innerHTML = users.map((u) => {
			const roleLabel = { admin: '管理員', teacher: '教師', user: '學生' }[u.role] || u.role;
			const roleClass = { admin: 'admin', teacher: 'teacher', user: 'student' }[u.role] || 'student';
			const statusLabel = u.is_active ? '活躍' : '停用';
			const statusClass = u.is_active ? 'active' : 'inactive';
			const createdDate = u.created_at ? new Date(u.created_at).toLocaleDateString('zh-TW') : '-';

			return `
				<tr data-user-id="${u.id}">
					<td><input type="checkbox"></td>
					<td>
						<div class="user-cell">
							<div class="user-avatar ${roleClass}">${u.username.charAt(0).toUpperCase()}</div>
							<span>${u.username}</span>
						</div>
					</td>
					<td>${u.email}</td>
					<td><span class="role-badge ${roleClass}">${roleLabel}</span></td>
					<td>${createdDate}</td>
					<td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
					<td>
						<button class="table-btn edit" onclick="openEditUser(${u.id}, '${u.username}', '${u.email}', '${u.role}', ${u.is_active})"><i class="fas fa-edit"></i></button>
						<button class="table-btn delete" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
					</td>
				</tr>
			`;
		}).join('');
	}

	function updatePagination() {
		if (pageInfo) {
			pageInfo.textContent = `第 ${userState.page} 頁，共 ${userState.totalPages} 頁`;
		}
		if (prevPageBtn) {
			prevPageBtn.disabled = userState.page <= 1;
		}
		if (nextPageBtn) {
			nextPageBtn.disabled = userState.page >= userState.totalPages;
		}
	}

	// User search
	let searchTimeout;
	userSearchInput.addEventListener('input', (e) => {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			userState.search = e.target.value.trim();
			userState.page = 1;
			loadUsers();
		}, 300);
	});

	// Filter tabs
	filterTabs.forEach((tab) => {
		tab.addEventListener('click', function () {
			filterTabs.forEach((t) => t.classList.remove('active'));
			this.classList.add('active');

			const filterText = this.textContent.trim();
			if (filterText === '全部') {
				userState.role = '';
			} else if (filterText === '管理員') {
				userState.role = 'admin';
			} else if (filterText === '教師') {
				userState.role = 'teacher';
			} else if (filterText === '學生') {
				userState.role = 'user';
			}
			userState.page = 1;
			loadUsers();
		});
	});

	// Pagination buttons
	if (prevPageBtn) {
		prevPageBtn.addEventListener('click', () => {
			if (userState.page > 1) {
				userState.page--;
				loadUsers();
			}
		});
	}
	if (nextPageBtn) {
		nextPageBtn.addEventListener('click', () => {
			if (userState.page < userState.totalPages) {
				userState.page++;
				loadUsers();
			}
		});
	}

	// Global functions for table buttons
	window.openEditUser = function (id, username, email, role, isActive) {
		document.getElementById('editUserId').value = id;
		document.getElementById('editUsername').value = username;
		document.getElementById('editEmail').value = email;
		document.getElementById('editPassword').value = '';
		document.getElementById('editRole').value = role;
		document.getElementById('editStatus').value = isActive ? 'active' : 'inactive';
		editModal.classList.add('active');
	};

	window.deleteUser = async function (id) {
		if (!confirm('確定要刪除此用戶嗎？此操作無法復原。')) return;
		try {
			const res = await fetch(`/admin/users/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${getToken()}` }
			});
			const data = await res.json();
			if (res.ok) {
				alert('用戶已刪除');
				loadUsers();
			} else {
				alert(`錯誤: ${data.error || '刪除失敗'}`);
			}
		} catch (e) {
			alert(`刪除失敗: ${e.message}`);
		}
	};

	// ===== Global Admin Records =====
	const detailModal = document.getElementById('recordDetailModal');
	const detailTitle = document.getElementById('recordDetailTitle');
	const detailBody = document.getElementById('recordDetailBody');
	const detailClose = document.getElementById('recordDetailClose');

	const reportSearchInput = document.getElementById('reportSearchInput');
	const reportStatusFilter = document.getElementById('reportStatusFilter');
	const reportAttentionFilter = document.getElementById('reportAttentionFilter');
	const reportRefreshBtn = document.getElementById('reportRefreshBtn');
	const adminReportsBody = document.getElementById('adminReportsBody');
	const reportListSummary = document.getElementById('reportListSummary');
	const reportPageInfo = document.getElementById('reportPageInfo');
	const reportPrevPage = document.getElementById('reportPrevPage');
	const reportNextPage = document.getElementById('reportNextPage');

	const assessmentSearchInput = document.getElementById('assessmentSearchInput');
	const assessmentStatusFilter = document.getElementById('assessmentStatusFilter');
	const assessmentAttentionFilter = document.getElementById('assessmentAttentionFilter');
	const assessmentRefreshBtn = document.getElementById('assessmentRefreshBtn');
	const adminAssessmentsBody = document.getElementById('adminAssessmentsBody');
	const assessmentListSummary = document.getElementById('assessmentListSummary');
	const assessmentPageInfo = document.getElementById('assessmentPageInfo');
	const assessmentPrevPage = document.getElementById('assessmentPrevPage');
	const assessmentNextPage = document.getElementById('assessmentNextPage');

	const poseSearchInput = document.getElementById('poseSearchInput');
	const poseAttentionFilter = document.getElementById('poseAttentionFilter');
	const poseRefreshBtn = document.getElementById('poseRefreshBtn');
	const adminPoseRunsBody = document.getElementById('adminPoseRunsBody');
	const poseListSummary = document.getElementById('poseListSummary');
	const posePageInfo = document.getElementById('posePageInfo');
	const posePrevPage = document.getElementById('posePrevPage');
	const poseNextPage = document.getElementById('poseNextPage');

	function escapeHtml(value) {
		return String(value ?? '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function openDetailModal(title, contentHtml) {
		detailTitle.innerHTML = `<i class="fas fa-circle-info"></i> ${escapeHtml(title)}`;
		detailBody.innerHTML = contentHtml;
		detailModal.classList.add('active');
	}

	if (detailClose) {
		detailClose.addEventListener('click', () => detailModal.classList.remove('active'));
	}
	if (detailModal) {
		detailModal.addEventListener('click', (event) => {
			if (event.target === detailModal) detailModal.classList.remove('active');
		});
	}

	function attentionBadge(attention) {
		if (!attention || !attention.is_flagged) {
			return '<span class="attention-badge normal">正常</span>';
		}
		const level = attention.attention_level || 'warning';
		const label = level === 'critical' ? '需立即關注' : '需關注';
		const title = (attention.attention_reasons || []).join('、');
		return `<span class="attention-badge ${escapeHtml(level)}" title="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
	}

	function statusChip(status) {
		const normalized = String(status || 'unknown').toLowerCase();
		const labels = {
			completed: '已完成',
			processing: '處理中',
			pending: '等待中',
			failed: '失敗',
			active: '啟用',
			inactive: '停用'
		};
		return `<span class="status-chip ${escapeHtml(normalized)}">${escapeHtml(labels[normalized] || status || '—')}</span>`;
	}

	function formatFileSize(size) {
		if (!size && size !== 0) return '-';
		const units = ['B', 'KB', 'MB', 'GB'];
		let value = size;
		let idx = 0;
		while (value >= 1024 && idx < units.length - 1) {
			value /= 1024;
			idx += 1;
		}
		return `${value.toFixed(value >= 100 || idx === 0 ? 0 : 1)} ${units[idx]}`;
	}

	function summarizeReasons(attention) {
		if (!attention || !attention.attention_reasons || attention.attention_reasons.length === 0) return '—';
		return attention.attention_reasons.slice(0, 2).map(escapeHtml).join('、');
	}

	function updateSectionPagination(state, infoEl, prevEl, nextEl) {
		infoEl.textContent = `第 ${state.page} 頁，共 ${Math.max(state.totalPages || 1, 1)} 頁`;
		prevEl.disabled = state.page <= 1;
		nextEl.disabled = state.page >= Math.max(state.totalPages || 1, 1);
	}

	function createDetailList(items) {
		if (!items || items.length === 0) return '<li>無</li>';
		return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
	}

	function attachSearchDebounce(input, handler) {
		let timeoutId;
		input.addEventListener('input', (event) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => handler(event.target.value.trim()), 300);
		});
	}

	function formatDate(iso) {
		if (!iso) return '-';
		const d = new Date(iso);
		return `${d.toLocaleDateString('zh-TW')} ${d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
	}

	async function loadAdminReports() { /* extracted below */ }
	async function loadAdminAssessments() { /* extracted below */ }
	async function loadAdminPoseRuns() { /* extracted below */ }

	loadAdminReports = async function () {
		adminReportsBody.innerHTML = '<tr><td colspan="8" class="kb-empty">載入中...</td></tr>';
		try {
			const params = new URLSearchParams({
				page: reportState.page,
				per_page: reportState.perPage,
				search: reportState.search,
				status: reportState.status,
				attention: reportState.attention
			});
			const res = await fetch(`/admin/video-reports?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || '載入失敗');

			reportState.totalPages = data.pages || 1;
			reportListSummary.textContent = `共 ${data.total || 0} 筆影片分析報告`;
			if (!data.reports || data.reports.length === 0) {
				adminReportsBody.innerHTML = '<tr><td colspan="8" class="kb-empty">目前沒有符合條件的影片分析報告</td></tr>';
			} else {
				adminReportsBody.innerHTML = data.reports.map((report) => `
					<tr class="${report.attention?.is_flagged ? `row-flagged row-${report.attention.attention_level}` : ''}">
						<td>
							<div class="table-primary">${escapeHtml(report.report_id.slice(0, 8))}</div>
							<div class="table-secondary">${escapeHtml(report.report_id)}</div>
						</td>
						<td><div class="table-primary">${escapeHtml(report.username)}</div><div class="table-secondary">${escapeHtml(report.email)}</div></td>
						<td><div class="table-primary">${escapeHtml(report.child_name)}</div><div class="table-secondary">${escapeHtml((report.child_age_months || 0).toFixed(0))} 個月</div></td>
						<td>${escapeHtml(report.video_filename || '-')}</td>
						<td>${statusChip(report.status)}</td>
						<td>${attentionBadge(report.attention)}<div class="table-secondary">${summarizeReasons(report.attention)}</div></td>
						<td>${formatDate(report.created_at)}</td>
						<td><button class="table-btn edit" onclick="viewAdminReport('${report.report_id}')"><i class="fas fa-eye"></i></button></td>
					</tr>
				`).join('');
			}
			updateSectionPagination(reportState, reportPageInfo, reportPrevPage, reportNextPage);
		} catch (error) {
			adminReportsBody.innerHTML = `<tr><td colspan="8" class="kb-empty">錯誤：${escapeHtml(error.message)}</td></tr>`;
		}
	};

	loadAdminAssessments = async function () {
		adminAssessmentsBody.innerHTML = '<tr><td colspan="9" class="kb-empty">載入中...</td></tr>';
		try {
			const params = new URLSearchParams({
				page: assessmentState.page,
				per_page: assessmentState.perPage,
				search: assessmentState.search,
				status: assessmentState.status,
				attention: assessmentState.attention
			});
			const res = await fetch(`/admin/assessments?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || '載入失敗');

			assessmentState.totalPages = data.pages || 1;
			assessmentListSummary.textContent = `共 ${data.total || 0} 筆發展評估紀錄`;
			if (!data.assessments || data.assessments.length === 0) {
				adminAssessmentsBody.innerHTML = '<tr><td colspan="9" class="kb-empty">目前沒有符合條件的發展評估紀錄</td></tr>';
			} else {
				adminAssessmentsBody.innerHTML = data.assessments.map((record) => `
					<tr class="${record.attention?.is_flagged ? `row-flagged row-${record.attention.attention_level}` : ''}">
						<td><div class="table-primary">${escapeHtml(record.assessment_id.slice(0, 8))}</div><div class="table-secondary">${escapeHtml(record.assessment_id)}</div></td>
						<td><div class="table-primary">${escapeHtml(record.username)}</div><div class="table-secondary">${escapeHtml(record.email)}</div></td>
						<td><div class="table-primary">${escapeHtml(record.child_name)}</div><div class="table-secondary">${escapeHtml((record.child_age_months || 0).toFixed(1))} 個月</div></td>
						<td>${record.overall_dq ?? '-'}</td>
						<td>${escapeHtml(record.dq_level || '-')}</td>
						<td>${statusChip(record.is_completed ? 'completed' : 'pending')}</td>
						<td>${attentionBadge(record.attention)}<div class="table-secondary">${summarizeReasons(record.attention)}</div></td>
						<td>${formatDate(record.created_at)}</td>
						<td><button class="table-btn edit" onclick="viewAdminAssessment('${record.assessment_id}')"><i class="fas fa-eye"></i></button></td>
					</tr>
				`).join('');
			}
			updateSectionPagination(assessmentState, assessmentPageInfo, assessmentPrevPage, assessmentNextPage);
		} catch (error) {
			adminAssessmentsBody.innerHTML = `<tr><td colspan="9" class="kb-empty">錯誤：${escapeHtml(error.message)}</td></tr>`;
		}
	};

	loadAdminPoseRuns = async function () {
		adminPoseRunsBody.innerHTML = '<tr><td colspan="8" class="kb-empty">載入中...</td></tr>';
		try {
			const params = new URLSearchParams({
				page: poseState.page,
				per_page: poseState.perPage,
				search: poseState.search,
				attention: poseState.attention
			});
			const res = await fetch(`/admin/pose-runs?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || '載入失敗');

			poseState.totalPages = data.pages || 1;
			poseListSummary.textContent = `共 ${data.total || 0} 筆姿態測驗紀錄`;
			if (!data.runs || data.runs.length === 0) {
				adminPoseRunsBody.innerHTML = '<tr><td colspan="8" class="kb-empty">目前沒有符合條件的姿態測驗紀錄</td></tr>';
			} else {
				adminPoseRunsBody.innerHTML = data.runs.map((run) => {
					const score = run.evaluation?.score || {};
					return `
						<tr class="${run.attention?.is_flagged ? `row-flagged row-${run.attention.attention_level}` : ''}">
							<td><div class="table-primary">${escapeHtml(run.run_id.slice(0, 8))}</div><div class="table-secondary">${escapeHtml(run.run_id)}</div></td>
							<td><div class="table-primary">${escapeHtml(run.username)}</div><div class="table-secondary">${escapeHtml(run.email)}</div></td>
							<td>${score.completed ?? 0} / ${score.total ?? 0}</td>
							<td>${score.percent ?? 0}%</td>
							<td>${escapeHtml(run.evaluation?.level || '-')}</td>
							<td>${attentionBadge(run.attention)}<div class="table-secondary">${summarizeReasons(run.attention)}</div></td>
							<td>${formatDate(run.created_at)}</td>
							<td><button class="table-btn edit" onclick="viewAdminPoseRun('${run.run_id}')"><i class="fas fa-eye"></i></button></td>
						</tr>
					`;
				}).join('');
			}
			updateSectionPagination(poseState, posePageInfo, posePrevPage, poseNextPage);
		} catch (error) {
			adminPoseRunsBody.innerHTML = `<tr><td colspan="8" class="kb-empty">錯誤：${escapeHtml(error.message)}</td></tr>`;
		}
	};

	window.viewAdminReport = async function (reportId) {
		try {
			const res = await fetch(`/admin/video-reports/${reportId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || '載入失敗');
			const report = data.report;
			const overall = report.overall_assessment || {};
			const recommendationItems = Array.isArray(report.recommendations) ? report.recommendations : (overall.overall_recommendations || []);
			const videoPreviewHtml = report.video_stream_url
				? `
					<div class="detail-section">
						<h4>相關影片</h4>
						<div class="detail-actions">
							<a class="detail-link-btn" href="${escapeHtml(report.video_stream_url)}" target="_blank" rel="noopener noreferrer">
								<i class="fas fa-film"></i>
								<span>查看原始影片</span>
								<i class="fas fa-arrow-up-right-from-square detail-link-btn__icon"></i>
							</a>
						</div>
					</div>
				`
				: `
					<div class="detail-section">
						<h4>相關影片</h4>
						<p>目前沒有可用的影片連結。</p>
					</div>
				`;
			openDetailModal('影片分析報告詳情', `
				<div class="detail-grid">
					<div class="detail-grid-card"><strong>報告 ID</strong><span>${escapeHtml(report.report_id)}</span></div>
					<div class="detail-grid-card"><strong>用戶</strong><span>${escapeHtml(report.username)} / ${escapeHtml(report.email)}</span></div>
					<div class="detail-grid-card"><strong>兒童</strong><span>${escapeHtml(report.child_name)}（${escapeHtml((report.child_age_months || 0).toFixed(0))} 個月）</span></div>
					<div class="detail-grid-card"><strong>原始影片</strong><span>${escapeHtml(report.video_filename || '-')}</span></div>
					<div class="detail-grid-card"><strong>狀態</strong><span>${escapeHtml(report.status)}</span></div>
					<div class="detail-grid-card"><strong>轉介建議</strong><span>${overall.professional_referral_needed ? '需要' : '否'}</span></div>
				</div>
				<div class="detail-section">
					<h4>關注原因</h4>
					<ul class="detail-list">${createDetailList(report.attention?.attention_reasons)}</ul>
				</div>
				<div class="detail-section">
					<h4>綜合摘要</h4>
					<p>${escapeHtml(overall.executive_summary || '—')}</p>
				</div>
				<div class="detail-section">
					<h4>整體建議</h4>
					<ul class="detail-list">${createDetailList(recommendationItems)}</ul>
				</div>
				${videoPreviewHtml}
			`);
		} catch (error) {
			alert(`載入報告詳情失敗：${error.message}`);
		}
	};

	window.viewAdminAssessment = async function (assessmentId) {
		try {
			const res = await fetch(`/admin/assessments/${assessmentId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || '載入失敗');
			const assessment = data.assessment;
			const areas = assessment.area_results || {};
			const areaRows = Object.entries(areas).map(([key, value]) => `<li><strong>${escapeHtml(value.label || key)}</strong>：${escapeHtml(value.status || '—')}｜心智年齡 ${escapeHtml(value.mental_age || '-')}</li>`).join('') || '<li>無</li>';
			openDetailModal('發展評估詳情', `
				<div class="detail-grid">
					<div class="detail-grid-card"><strong>評估 ID</strong><span>${escapeHtml(assessment.assessment_id)}</span></div>
					<div class="detail-grid-card"><strong>用戶</strong><span>${escapeHtml(assessment.username)} / ${escapeHtml(assessment.email)}</span></div>
					<div class="detail-grid-card"><strong>兒童</strong><span>${escapeHtml(assessment.child_name)}（${escapeHtml((assessment.child_age_months || 0).toFixed(1))} 個月）</span></div>
					<div class="detail-grid-card"><strong>DQ</strong><span>${escapeHtml(assessment.overall_dq ?? '-')}</span></div>
					<div class="detail-grid-card"><strong>DQ 等級</strong><span>${escapeHtml(assessment.dq_level || '-')}</span></div>
					<div class="detail-grid-card"><strong>完成狀態</strong><span>${assessment.is_completed ? '已完成' : '未完成'}</span></div>
				</div>
				<div class="detail-section">
					<h4>關注原因</h4>
					<ul class="detail-list">${createDetailList(assessment.attention?.attention_reasons)}</ul>
				</div>
				<div class="detail-section">
					<h4>各領域結果</h4>
					<ul class="detail-list">${areaRows}</ul>
				</div>
			`);
		} catch (error) {
			alert(`載入評估詳情失敗：${error.message}`);
		}
	};

	window.viewAdminPoseRun = async function (runId) {
		try {
			const res = await fetch(`/admin/pose-runs/${runId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || '載入失敗');
			const run = data.run;
			const score = run.evaluation?.score || {};
			const steps = run.evaluation?.steps || [];
			openDetailModal('姿態檢測詳情', `
				<div class="detail-grid">
					<div class="detail-grid-card"><strong>Run ID</strong><span>${escapeHtml(run.run_id)}</span></div>
					<div class="detail-grid-card"><strong>用戶</strong><span>${escapeHtml(run.username)} / ${escapeHtml(run.email)}</span></div>
					<div class="detail-grid-card"><strong>完成率</strong><span>${escapeHtml(score.percent ?? 0)}%</span></div>
					<div class="detail-grid-card"><strong>完成步數</strong><span>${escapeHtml(score.completed ?? 0)} / ${escapeHtml(score.total ?? 0)}</span></div>
					<div class="detail-grid-card"><strong>評級</strong><span>${escapeHtml(run.evaluation?.level || '-')}</span></div>
					<div class="detail-grid-card"><strong>建立時間</strong><span>${escapeHtml(formatDate(run.created_at))}</span></div>
				</div>
				<div class="detail-section">
					<h4>關注原因</h4>
					<ul class="detail-list">${createDetailList(run.attention?.attention_reasons)}</ul>
				</div>
				<div class="detail-section">
					<h4>動作步驟結果</h4>
					<ul class="detail-list">${steps.length ? steps.map((step) => `<li><strong>${escapeHtml(step.nameZh || step.key || '步驟')}</strong>：${escapeHtml(step.passed ? '通過' : '未通過')}｜${escapeHtml((step.notes || []).join('、') || '—')}</li>`).join('') : '<li>無步驟資料</li>'}</ul>
				</div>
			`);
		} catch (error) {
			alert(`載入姿態詳情失敗：${error.message}`);
		}
	};

	attachSearchDebounce(reportSearchInput, (value) => {
		reportState.search = value;
		reportState.page = 1;
		loadAdminReports();
	});
	attachSearchDebounce(assessmentSearchInput, (value) => {
		assessmentState.search = value;
		assessmentState.page = 1;
		loadAdminAssessments();
	});
	attachSearchDebounce(poseSearchInput, (value) => {
		poseState.search = value;
		poseState.page = 1;
		loadAdminPoseRuns();
	});

	reportStatusFilter.addEventListener('change', () => {
		reportState.status = reportStatusFilter.value;
		reportState.page = 1;
		loadAdminReports();
	});
	reportAttentionFilter.addEventListener('change', () => {
		reportState.attention = reportAttentionFilter.value;
		reportState.page = 1;
		loadAdminReports();
	});
	reportRefreshBtn.addEventListener('click', loadAdminReports);
	reportPrevPage.addEventListener('click', () => {
		if (reportState.page > 1) {
			reportState.page -= 1;
			loadAdminReports();
		}
	});
	reportNextPage.addEventListener('click', () => {
		if (reportState.page < reportState.totalPages) {
			reportState.page += 1;
			loadAdminReports();
		}
	});

	assessmentStatusFilter.addEventListener('change', () => {
		assessmentState.status = assessmentStatusFilter.value;
		assessmentState.page = 1;
		loadAdminAssessments();
	});
	assessmentAttentionFilter.addEventListener('change', () => {
		assessmentState.attention = assessmentAttentionFilter.value;
		assessmentState.page = 1;
		loadAdminAssessments();
	});
	assessmentRefreshBtn.addEventListener('click', loadAdminAssessments);
	assessmentPrevPage.addEventListener('click', () => {
		if (assessmentState.page > 1) {
			assessmentState.page -= 1;
			loadAdminAssessments();
		}
	});
	assessmentNextPage.addEventListener('click', () => {
		if (assessmentState.page < assessmentState.totalPages) {
			assessmentState.page += 1;
			loadAdminAssessments();
		}
	});

	poseAttentionFilter.addEventListener('change', () => {
		poseState.attention = poseAttentionFilter.value;
		poseState.page = 1;
		loadAdminPoseRuns();
	});
	poseRefreshBtn.addEventListener('click', loadAdminPoseRuns);
	posePrevPage.addEventListener('click', () => {
		if (poseState.page > 1) {
			poseState.page -= 1;
			loadAdminPoseRuns();
		}
	});
	poseNextPage.addEventListener('click', () => {
		if (poseState.page < poseState.totalPages) {
			poseState.page += 1;
			loadAdminPoseRuns();
		}
	});

	// ===== Knowledge Base Functions =====
	const kbUploadArea = document.getElementById('kbUploadArea');
	const kbFileInput = document.getElementById('kbFileInput');
	const kbDocBody = document.getElementById('kbDocBody');
	const kbSearchInput = document.getElementById('kbSearchInput');
	const kbSearchBtn = document.getElementById('kbSearchBtn');
	const kbSearchResults = document.getElementById('kbSearchResults');
	const kbBatchDeleteBtn = document.getElementById('kbBatchDeleteBtn');
	const kbSelectedCount = document.getElementById('kbSelectedCount');

	// --- Checkbox / batch delete ---
	window.updateBatchDeleteBtn = function () {
		const checked = document.querySelectorAll('.kb-doc-checkbox:checked');
		const total = document.querySelectorAll('.kb-doc-checkbox').length;
		kbSelectedCount.textContent = checked.length;
		kbBatchDeleteBtn.style.display = checked.length > 0 ? 'inline-flex' : 'none';
		const selectAll = document.getElementById('kbSelectAll');
		if (selectAll) {
			selectAll.checked = total > 0 && checked.length === total;
			selectAll.indeterminate = checked.length > 0 && checked.length < total;
		}
	};

	window.toggleSelectAll = function (el) {
		document.querySelectorAll('.kb-doc-checkbox').forEach((cb) => {
			cb.checked = el.checked;
		});
		updateBatchDeleteBtn();
	};

	window.batchDeleteDocs = async function () {
		const ids = Array.from(document.querySelectorAll('.kb-doc-checkbox:checked')).map((cb) => parseInt(cb.value, 10));
		if (ids.length === 0) return;
		if (!confirm(`確定刪除已選的 ${ids.length} 個文件及所有相關資料？`)) return;
		try {
			const res = await fetch('/admin/rag/documents/batch', {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({ document_ids: ids })
			});
			const data = await res.json();
			alert(data.message || '刪除完成');
			loadKbDocuments();
		} catch (e) {
			alert(`批量刪除失敗: ${e.message}`);
		}
	};

	// --- Upload ---
	kbUploadArea.addEventListener('click', () => kbFileInput.click());
	kbUploadArea.addEventListener('dragover', (e) => {
		e.preventDefault();
		kbUploadArea.classList.add('dragover');
	});
	kbUploadArea.addEventListener('dragleave', () => kbUploadArea.classList.remove('dragover'));
	kbUploadArea.addEventListener('drop', (e) => {
		e.preventDefault();
		kbUploadArea.classList.remove('dragover');
		if (e.dataTransfer.files.length) uploadKbFiles(e.dataTransfer.files);
	});
	kbFileInput.addEventListener('change', () => {
		if (kbFileInput.files.length) uploadKbFiles(kbFileInput.files);
	});

	async function uploadKbFiles(files) {
		const fileArray = Array.from(files);
		const total = fileArray.length;
		let successCount = 0;
		let failCount = 0;
		const errors = [];

		for (let i = 0; i < fileArray.length; i += 1) {
			const file = fileArray[i];
			kbUploadArea.innerHTML = `<div class="upload-icon spin"><i class="fas fa-spinner"></i></div><div class="upload-text"><h3>上傳中... (${i + 1}/${total})</h3><p>${file.name}</p></div>`;

			const fd = new FormData();
			fd.append('file', file);
			try {
				const res = await fetch('/admin/rag/documents', {
					method: 'POST',
					headers: { Authorization: `Bearer ${getToken()}` },
					body: fd
				});
				const data = await res.json();
				if (res.ok) {
					successCount += 1;
				} else {
					failCount += 1;
					errors.push(`${file.name}: ${data.error || '上傳失敗'}`);
				}
			} catch (e) {
				failCount += 1;
				errors.push(`${file.name}: ${e.message}`);
			}
		}

		let message = `已提交 ${successCount} 個文件，背景處理中`;
		if (failCount > 0) {
			message += `，失敗 ${failCount} 個`;
		}
		if (errors.length > 0 && errors.length <= 3) {
			message += `\n${errors.join('\n')}`;
		} else if (errors.length > 3) {
			message += `\n${errors.slice(0, 3).join('\n')}\n...及其他 ${errors.length - 3} 個錯誤`;
		}
		alert(message);

		kbUploadArea.innerHTML = '<div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div><div class="upload-text"><h3>點擊或拖放文件上傳</h3><p>支援格式：PDF、TXT、Markdown（可批量上傳）</p></div><input type="file" id="kbFileInput" accept=".pdf,.txt,.md" multiple style="display:none;">';
		document.getElementById('kbFileInput').addEventListener('change', () => {
			if (kbFileInput.files.length) uploadKbFiles(kbFileInput.files);
		});
		loadKbDocuments();
	}

	// --- Document list ---
	async function loadKbDocuments() {
		try {
			const res = await fetch('/admin/rag/documents', { headers: { Authorization: `Bearer ${getToken()}` } });
			const data = await res.json();
			if (!res.ok) {
				kbDocBody.innerHTML = '<tr><td colspan="6" class="kb-empty">載入失敗</td></tr>';
				return;
			}

			const docs = data.documents || [];
			if (docs.length === 0) {
				kbDocBody.innerHTML = '<tr><td colspan="6" class="kb-empty">尚無文件。上傳文件以建立知識庫。</td></tr>';
				document.getElementById('kbSelectAll').checked = false;
				document.getElementById('kbSelectAll').indeterminate = false;
				updateBatchDeleteBtn();
				return;
			}
			kbDocBody.innerHTML = docs.map((d) => `
				<tr data-doc-id="${d.id}">
					<td><input type="checkbox" class="kb-doc-checkbox" value="${d.id}" onchange="updateBatchDeleteBtn()"></td>
					<td><a href="/view_rag_document/${d.id}/${encodeURIComponent(d.original_filename)}" target="_blank" class="kb-doc-link" title="${d.original_filename}">${d.original_filename.length > 30 ? `${d.original_filename.slice(0, 27)}...` : d.original_filename}</a></td>
					<td>${d.content_type.split('/').pop().toUpperCase()}</td>
					<td><span class="kb-status ${d.status}" data-doc-status="${d.id}">${d.status}</span></td>
					<td>${formatDate(d.created_at)}</td>
					<td>
						<button class="kb-btn kb-btn-reprocess" onclick="reprocessDoc(${d.id})"><i class="fas fa-redo"></i></button>
						<button class="kb-btn kb-btn-delete" onclick="deleteDoc(${d.id})"><i class="fas fa-trash"></i></button>
					</td>
				</tr>
			`).join('');
			document.getElementById('kbSelectAll').checked = false;
			updateBatchDeleteBtn();
		} catch (e) {
			kbDocBody.innerHTML = `<tr><td colspan="6" class="kb-empty">錯誤: ${e.message}</td></tr>`;
		}
	}

	window.deleteDoc = async function (id) {
		if (!confirm('確定刪除此文件及所有相關資料？')) return;
		try {
			await fetch(`/admin/rag/documents/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
			loadKbDocuments();
		} catch (e) {
			alert(`刪除失敗: ${e.message}`);
		}
	};

	window.reprocessDoc = async function (id) {
		if (!confirm('重新分段並嵌入此文件？')) return;
		try {
			await fetch(`/admin/rag/documents/${id}/reprocess`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
		} catch (e) {
			alert(`重新處理失敗: ${e.message}`);
		}
	};

	// --- Socket.IO for real-time status updates ---
	(function initKbSocket() {
		if (typeof io === 'undefined') {
			const script = document.createElement('script');
			script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
			script.onload = connectKbSocket;
			document.head.appendChild(script);
		} else {
			connectKbSocket();
		}

		function connectKbSocket() {
			const token = getToken();
			const socket = io({
				transports: ['websocket', 'polling'],
				auth: { token }
			});
			socket.on('rag_document_status', (data) => {
				const badge = document.querySelector(`[data-doc-status="${data.document_id}"]`);
				if (badge) {
					badge.className = `kb-status ${data.status}`;
					badge.textContent = data.status;
				} else {
					loadKbDocuments();
				}
			});
		}
	})();

	// --- Search ---
	kbSearchBtn.addEventListener('click', searchKb);
	kbSearchInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') searchKb();
	});

	async function searchKb() {
		const query = kbSearchInput.value.trim();
		if (!query) return;
		kbSearchResults.innerHTML = '<div class="kb-empty">搜尋中...</div>';
		try {
			const res = await fetch('/admin/rag/search', {
				method: 'POST',
				headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({ query })
			});
			const data = await res.json();
			if (!res.ok) {
				kbSearchResults.innerHTML = `<div class="kb-empty">錯誤: ${data.error || '搜尋失敗'}</div>`;
				return;
			}

			const results = data.results || [];
			if (results.length === 0) {
				kbSearchResults.innerHTML = '<div class="kb-empty">未找到相關結果</div>';
				return;
			}
			kbSearchResults.innerHTML = results.map((r, i) => `
				<div class="kb-result-item">
					<div class="kb-result-meta">
						<i class="fas fa-file-alt"></i> #${i + 1} | ${r.document_name}${r.page_number ? ` p.${r.page_number}` : ''}${r.heading ? ` | ${r.heading}` : ''} | 相關度: ${(r.similarity * 100).toFixed(0)}%
					</div>
					<div class="kb-result-content">${r.content.length > 500 ? `${r.content.slice(0, 500)}...` : r.content}</div>
				</div>
			`).join('');
		} catch (e) {
			kbSearchResults.innerHTML = `<div class="kb-empty">錯誤: ${e.message}</div>`;
		}
	}
});
