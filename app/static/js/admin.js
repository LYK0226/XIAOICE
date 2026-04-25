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
	// ===== Language System =====
	const ADMIN_I18N_CACHE_KEY = 'i18n_cache_admin_';
	const SUPPORTED_LANGS = ['zh-TW', 'zh-CN', 'en', 'ja'];
	window.adminTranslations = window.adminTranslations || {};

	function loadAdminTranslationCache(lang) {
		try {
			const cached = localStorage.getItem(ADMIN_I18N_CACHE_KEY + lang);
			return cached ? JSON.parse(cached) : null;
		} catch (e) {
			return null;
		}
	}

	function storeAdminTranslationCache(lang, data) {
		try {
			localStorage.setItem(ADMIN_I18N_CACHE_KEY + lang, JSON.stringify(data));
		} catch (e) {}
	}

	function applyAdminLanguage(t) {
		if (!t) return;
		document.querySelectorAll('[data-i18n]').forEach(el => {
			const key = el.getAttribute('data-i18n');
			if (t[key]) el.textContent = t[key];
		});
		document.querySelectorAll('option[data-i18n]').forEach(option => {
			const key = option.getAttribute('data-i18n');
			if (t[key]) option.textContent = t[key];
		});
		document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
			const key = el.getAttribute('data-i18n-placeholder');
			if (t[key]) el.placeholder = t[key];
		});
		document.querySelectorAll('[data-i18n-title]').forEach(el => {
			const key = el.getAttribute('data-i18n-title');
			if (t[key]) el.title = t[key];
		});
	}

	function getAdminT() {
		return window.adminTranslations[window.currentLanguage] || {};
	}

	async function initializeAdminLanguage() {
		const savedLang = localStorage.getItem('preferredLanguage') || 'zh-TW';
		const langToUse = SUPPORTED_LANGS.includes(savedLang) ? savedLang : 'zh-TW';

		let langData = window.adminTranslations[langToUse];
		if (!langData) {
			const cached = loadAdminTranslationCache(langToUse);
			if (cached) {
				langData = cached;
				window.adminTranslations[langToUse] = cached;
			}
		}

		if (!langData) {
			try {
				const res = await fetch(`/static/i18n/${langToUse}.json`, { cache: 'no-store' });
				if (res.ok) {
					langData = await res.json();
					storeAdminTranslationCache(langToUse, langData);
					window.adminTranslations[langToUse] = langData;
				}
			} catch (e) {
				console.warn('Failed to load admin translations for', langToUse, e);
			}
		}

		if (langData) {
			applyAdminLanguage(langData);
		}
		window.currentLanguage = langToUse;
		document.documentElement.setAttribute('data-i18n-ready', 'true');
	}

	window.addEventListener('languageChanged', async (e) => {
		const lang = e.detail?.lang || localStorage.getItem('preferredLanguage') || 'zh-TW';
		window.currentLanguage = lang;

		if (!window.adminTranslations[lang]) {
			const cached = loadAdminTranslationCache(lang);
			if (cached) {
				window.adminTranslations[lang] = cached;
			} else {
				try {
					const res = await fetch(`/static/i18n/${lang}.json`, { cache: 'no-store' });
					if (res.ok) {
						const data = await res.json();
						storeAdminTranslationCache(lang, data);
						window.adminTranslations[lang] = data;
					}
				} catch (e) {
					console.warn('Failed to load admin translations for', lang, e);
				}
			}
		}

		const t = window.adminTranslations[lang];
		if (t) {
			applyAdminLanguage(t);
		}
	});

	initializeAdminLanguage();

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
				alert(window.currentLanguage === 'en' ? 'User created successfully!' : '用戶創建成功！');
				modal.classList.remove('active');
				loadUsers();
			} else {
				alert(window.currentLanguage === 'en' ? `Error: ${data.error || 'Creation failed'}` : `錯誤: ${data.error || '創建失敗'}`);
			}
		} catch (err) {
			alert(window.currentLanguage === 'en' ? `Creation failed: ${err.message}` : `創建失敗: ${err.message}`);
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
				alert(window.currentLanguage === 'en' ? 'User updated successfully!' : '用戶更新成功！');
				editModal.classList.remove('active');
				loadUsers();
			} else {
				alert(window.currentLanguage === 'en' ? `Error: ${result.error || 'Update failed'}` : `錯誤: ${result.error || '更新失敗'}`);
			}
		} catch (err) {
			alert(window.currentLanguage === 'en' ? `Update failed: ${err.message}` : `更新失敗: ${err.message}`);
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
			newUsersBadge.textContent = window.currentLanguage === 'en'
				? `+${statsData.users.new_today || 0} today`
				: `+${statsData.users.new_today || 0} 今日`;
		}
		if (activeUsersStat) {
			activeUsersStat.textContent = (statsData.users.active || 0).toLocaleString();
		}
		if (adminUsersBadge) {
			const t = getAdminT();
			adminUsersBadge.textContent = `${statsData.users.admins || 0} ${t['admin.stat.admins'] || '位管理員'}`;
		}
		if (assessmentsStat) {
			assessmentsStat.textContent = (statsData.assessments.total || 0).toLocaleString();
		}
		if (completedAssessmentsBadge) {
			const t = getAdminT();
			completedAssessmentsBadge.textContent = `${statsData.assessments.flagged || 0} ${t['admin.stat.needsAttention'] || '需關注'}`;
		}
		if (videosStat) {
			videosStat.textContent = (statsData.videos.total || 0).toLocaleString();
		}
		if (childrenStatBadge) {
			const t = getAdminT();
			childrenStatBadge.textContent = `${statsData.videos.failed || 0} ${t['admin.stat.failed'] || '筆失敗'}`;
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
		const t = getAdminT();
		usersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">${t['admin.users.loading'] || '載入中...'}</td></tr>`;
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
				usersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">${t['admin.kb.searchError'] || '錯誤'}: ${data.error || t['admin.users.loadError'] || '載入失敗'}</td></tr>`;
				return;
			}

			userState.totalPages = data.pages;
			renderUsersTable(data.users);
			updatePagination();
		} catch (e) {
			usersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">${t['admin.kb.searchError'] || '錯誤'}: ${e.message}</td></tr>`;
		}
	}

	function renderUsersTable(users) {
		const t = getAdminT();
		if (!users || users.length === 0) {
			usersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">${t['admin.users.noData'] || '尚無用戶數據'}</td></tr>`;
			return;
		}

		usersTableBody.innerHTML = users.map((u) => {
			const roleLabels = { admin: t['admin.users.roleAdmin'] || '管理員', teacher: t['admin.users.roleTeacher'] || '教師', user: t['admin.users.roleStudent'] || '學生' };
			const roleLabel = roleLabels[u.role] || u.role;
			const roleClass = { admin: 'admin', teacher: 'teacher', user: 'student' }[u.role] || 'student';
			const statusLabels = { active: t['admin.users.statusActive'] || '活躍', inactive: t['admin.users.statusInactive'] || '停用' };
			const statusLabel = statusLabels[u.is_active ? 'active' : 'inactive'];
			const statusClass = u.is_active ? 'active' : 'inactive';
			const createdDate = u.created_at ? new Date(u.created_at).toLocaleDateString('zh-TW') : '-';
			const rawUsername = typeof u.username === 'string' ? u.username.trim() : '';
			const displayName = rawUsername || u.display_name || u.email || `User ${u.id}`;
			const avatarInitial = displayName.charAt(0).toUpperCase();
			const safeDisplayName = escapeHtml(displayName);
			const safeEmail = escapeHtml(u.email || '-');
			const editUsernameArg = JSON.stringify(rawUsername || displayName);
			const editEmailArg = JSON.stringify(u.email || '');
			const editRoleArg = JSON.stringify(u.role || 'user');
			const isActiveArg = u.is_active ? 'true' : 'false';

			return `
				<tr data-user-id="${u.id}">
					<td><input type="checkbox"></td>
					<td>
						<div class="user-cell">
							<div class="user-avatar ${roleClass}">${escapeHtml(avatarInitial)}</div>
							<span>${safeDisplayName}</span>
						</div>
					</td>
					<td>${safeEmail}</td>
					<td><span class="role-badge ${roleClass}">${roleLabel}</span></td>
					<td>${createdDate}</td>
					<td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
					<td>
						<button class="table-btn edit" onclick='openEditUser(${u.id}, ${editUsernameArg}, ${editEmailArg}, ${editRoleArg}, ${isActiveArg})'><i class="fas fa-edit"></i></button>
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

			const filterKey = this.getAttribute('data-i18n');
			if (filterKey === 'admin.users.filterAll' || (!filterKey && this.textContent.trim() === (getAdminT()['admin.users.filterAll'] || '全部'))) {
				userState.role = '';
			} else if (filterKey === 'admin.users.filterAdmin' || this.textContent.trim().includes(getAdminT()['admin.users.roleAdmin'] || '管理員')) {
				userState.role = 'admin';
			} else if (filterKey === 'admin.users.filterTeacher' || this.textContent.trim().includes(getAdminT()['admin.users.roleTeacher'] || '教師')) {
				userState.role = 'teacher';
			} else if (filterKey === 'admin.users.filterStudent' || this.textContent.trim().includes(getAdminT()['admin.users.roleStudent'] || '學生')) {
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
		document.getElementById('editUsername').value = username || '';
		document.getElementById('editEmail').value = email || '';
		document.getElementById('editPassword').value = '';
		document.getElementById('editRole').value = role || 'user';
		document.getElementById('editStatus').value = isActive ? 'active' : 'inactive';
		editModal.classList.add('active');
	};

	window.deleteUser = async function (id) {
		if (!confirm(window.currentLanguage === 'en' ? 'Delete this user? This cannot be undone.' : '確定要刪除此用戶嗎？此操作無法復原。')) return;
		try {
			const res = await fetch(`/admin/users/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${getToken()}` }
			});
			const data = await res.json();
			if (res.ok) {
				alert(window.currentLanguage === 'en' ? 'User deleted' : '用戶已刪除');
				loadUsers();
			} else {
				alert(window.currentLanguage === 'en' ? `Error: ${data.error || 'Delete failed'}` : `錯誤: ${data.error || '刪除失敗'}`);
			}
		} catch (e) {
			alert(window.currentLanguage === 'en' ? `Delete failed: ${e.message}` : `刪除失敗: ${e.message}`);
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
			return `<span class="attention-badge normal">${window.currentLanguage === 'en' ? 'Normal' : '正常'}</span>`;
		}
		const t = getAdminT();
		const level = attention.attention_level || 'warning';
		const label = level === 'critical' ? (t['admin.filterCritical'] || '需立即關注') : (t['admin.focus.flaggedReports'] || '需關注');
		const title = (attention.attention_reasons || []).join('、');
		return `<span class="attention-badge ${escapeHtml(level)}" title="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
	}

	function statusChip(status) {
		const normalized = String(status || 'unknown').toLowerCase();
		const t = getAdminT();
		const labels = {
			completed: t['admin.filterCompleted'] || '已完成',
			processing: t['admin.filterProcessing'] || '處理中',
			pending: t['admin.filterPending'] || '等待中',
			failed: t['admin.filterFailed'] || '失敗',
			active: t['admin.users.statusActive'] || '啟用',
			inactive: t['admin.users.statusInactive'] || '停用'
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
		infoEl.textContent = window.currentLanguage === 'en'
			? `Page ${state.page} of ${Math.max(state.totalPages || 1, 1)}`
			: `第 ${state.page} 頁，共 ${Math.max(state.totalPages || 1, 1)} 頁`;
		prevEl.disabled = state.page <= 1;
		nextEl.disabled = state.page >= Math.max(state.totalPages || 1, 1);
	}

	function createDetailList(items) {
		if (!items || items.length === 0) return window.currentLanguage === 'en' ? '<li>None</li>' : '<li>無</li>';
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

	function normalizeKbStatus(status) {
		const normalized = String(status || '').toLowerCase();
		if (['pending', 'processing', 'chunking', 'enriching', 'embedding'].includes(normalized)) {
			return 'processing';
		}
		return normalized || 'unknown';
	}

	function kbStatusLabel(status) {
		const t = getAdminT();
		const labels = {
			processing: t['admin.kb.status.processing'] || '進行中',
			ready: t['admin.kb.status.ready'] || '完成',
			error: t['admin.kb.status.error'] || '失敗',
			failed: t['admin.kb.status.failed'] || '失敗',
			unknown: t['admin.kb.status.unknown'] || '未知'
		};
		return labels[status] || status;
	}

	async function loadAdminReports() { /* extracted below */ }
	async function loadAdminAssessments() { /* extracted below */ }
	async function loadAdminPoseRuns() { /* extracted below */ }

	loadAdminReports = async function () {
		const t = getAdminT();
		adminReportsBody.innerHTML = `<tr><td colspan="7" class="kb-empty">${t['admin.reports.loading'] || '載入中...'}</td></tr>`;
		try {
			const params = new URLSearchParams({
				page: reportState.page,
				per_page: reportState.perPage,
				search: reportState.search,
				status: reportState.status,
				attention: reportState.attention
			});
			const res = await fetch(`/admin/video-reports?${params}`, {
				headers: {
					Authorization: `Bearer ${getToken()}`,
					'X-Interface-Language': window.currentLanguage || 'zh-TW'
				}
			});
			const data = await res.json();
			const t = getAdminT();
			if (!res.ok) throw new Error(data.error || t['admin.reports.loadFailed'] || '載入失敗');

			reportState.totalPages = data.pages || 1;
			reportListSummary.textContent = (t['admin.reports.count'] || '共 {count} 筆影片分析報告').replace('{count}', data.total || 0);
			if (!data.reports || data.reports.length === 0) {
				adminReportsBody.innerHTML = `<tr><td colspan="7" class="kb-empty">${t['admin.reports.noData'] || '目前沒有符合條件的影片分析報告'}</td></tr>`;
			} else {
				const ageMonths = t['admin.reports.ageMonths'] || '個月';
				const clickHint = t['admin.reports.clickHint'] || '點擊查看詳細內容';
				adminReportsBody.innerHTML = data.reports.map((report) => `
					<tr class="${report.attention?.is_flagged ? `row-flagged row-${report.attention.attention_level}` : ''}" onclick="viewAdminReport('${report.report_id}')" style="cursor: pointer;" title="${clickHint}">
						<td>
							<div class="table-primary">${escapeHtml(report.report_id.slice(0, 8))}</div>
							<div class="table-secondary">${escapeHtml(report.report_id)}</div>
						</td>
						<td><div class="table-primary">${escapeHtml(report.username)}</div><div class="table-secondary">${escapeHtml(report.email)}</div></td>
						<td><div class="table-primary">${escapeHtml(report.child_name)}</div><div class="table-secondary">${escapeHtml((report.child_age_months || 0).toFixed(0))} ${ageMonths}</div></td>
						<td>${escapeHtml(report.video_filename || '-')}</td>
						<td>${statusChip(report.status)}</td>
						<td>${attentionBadge(report.attention)}<div class="table-secondary">${summarizeReasons(report.attention)}</div></td>
						<td>${formatDate(report.created_at)}</td>
						
					</tr>
				`).join('');
			}
			updateSectionPagination(reportState, reportPageInfo, reportPrevPage, reportNextPage);
		} catch (error) {
			adminReportsBody.innerHTML = `<tr><td colspan="7" class="kb-empty">${t['admin.kb.searchError'] || '錯誤'}：${escapeHtml(error.message)}</td></tr>`;
		}
	};

	loadAdminAssessments = async function () {
		const t = getAdminT();
		adminAssessmentsBody.innerHTML = `<tr><td colspan="8" class="kb-empty">${t['admin.assessments.loading'] || '載入中...'}</td></tr>`;
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
			if (!res.ok) throw new Error(data.error || t['admin.assessments.loadFailed'] || '載入失敗');

			assessmentState.totalPages = data.pages || 1;
			assessmentListSummary.textContent = (t['admin.assessments.count'] || '共 {count} 筆評估記錄').replace('{count}', data.total || 0);
			if (!data.assessments || data.assessments.length === 0) {
				adminAssessmentsBody.innerHTML = `<tr><td colspan="8" class="kb-empty">${t['admin.assessments.noData'] || '目前沒有符合條件的發展評估紀錄'}</td></tr>`;
			} else {
				const ageMonths = t['admin.assessments.ageMonths'] || '個月';
				const clickHint = t['admin.reports.clickHint'] || '點擊查看詳細內容';
				adminAssessmentsBody.innerHTML = data.assessments.map((record) => `
					<tr class="${record.attention?.is_flagged ? `row-flagged row-${record.attention.attention_level}` : ''}" onclick="viewAdminAssessment('${record.assessment_id}')" style="cursor: pointer;" title="${clickHint}">
						<td><div class="table-primary">${escapeHtml(record.assessment_id.slice(0, 8))}</div><div class="table-secondary">${escapeHtml(record.assessment_id)}</div></td>
						<td><div class="table-primary">${escapeHtml(record.username)}</div><div class="table-secondary">${escapeHtml(record.email)}</div></td>
						<td><div class="table-primary">${escapeHtml(record.child_name)}</div><div class="table-secondary">${escapeHtml((record.child_age_months || 0).toFixed(1))} ${ageMonths}</div></td>
						<td>${record.overall_dq ?? '-'}</td>
						<td>${escapeHtml(record.dq_level || '-')}</td>
						<td>${statusChip(record.is_completed ? 'completed' : 'pending')}</td>
						<td>${attentionBadge(record.attention)}<div class="table-secondary">${summarizeReasons(record.attention)}</div></td>
						<td>${formatDate(record.created_at)}</td>
						
					</tr>
				`).join('');
			}
			updateSectionPagination(assessmentState, assessmentPageInfo, assessmentPrevPage, assessmentNextPage);
		} catch (error) {
			adminAssessmentsBody.innerHTML = `<tr><td colspan="8" class="kb-empty">${t['admin.kb.searchError'] || '錯誤'}：${escapeHtml(error.message)}</td></tr>`;
		}
	};

	loadAdminPoseRuns = async function () {
		const t = getAdminT();
		adminPoseRunsBody.innerHTML = `<tr><td colspan="7" class="kb-empty">${t['admin.pose.loading'] || '載入中...'}</td></tr>`;
		try {
			const params = new URLSearchParams({
				page: poseState.page,
				per_page: poseState.perPage,
				search: poseState.search,
				attention: poseState.attention
			});
			const res = await fetch(`/admin/pose-runs?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || t['admin.pose.loadFailed'] || '載入失敗');

			poseState.totalPages = data.pages || 1;
			poseListSummary.textContent = (t['admin.pose.count'] || '共 {count} 筆姿態記錄').replace('{count}', data.total || 0);
			if (!data.runs || data.runs.length === 0) {
				adminPoseRunsBody.innerHTML = `<tr><td colspan="7" class="kb-empty">${t['admin.pose.noData'] || '目前沒有符合條件的姿態測驗紀錄'}</td></tr>`;
			} else {
				const clickHint = t['admin.reports.clickHint'] || '點擊查看詳細內容';
				adminPoseRunsBody.innerHTML = data.runs.map((run) => {
					const score = run.evaluation?.score || {};
					return `
						<tr class="${run.attention?.is_flagged ? `row-flagged row-${run.attention.attention_level}` : ''}" onclick="viewAdminPoseRun('${run.run_id}')" style="cursor: pointer;" title="${clickHint}">
							<td><div class="table-primary">${escapeHtml(run.run_id.slice(0, 8))}</div><div class="table-secondary">${escapeHtml(run.run_id)}</div></td>
							<td><div class="table-primary">${escapeHtml(run.username)}</div><div class="table-secondary">${escapeHtml(run.email)}</div></td>
							<td>${score.completed ?? 0} / ${score.total ?? 0}</td>
							<td>${score.percent ?? 0}%</td>
							<td>${escapeHtml(run.evaluation?.level || '-')}</td>
							<td>${attentionBadge(run.attention)}<div class="table-secondary">${summarizeReasons(run.attention)}</div></td>
							<td>${formatDate(run.created_at)}</td>
							
						</tr>
					`;
				}).join('');
			}
			updateSectionPagination(poseState, posePageInfo, posePrevPage, poseNextPage);
		} catch (error) {
			adminPoseRunsBody.innerHTML = `<tr><td colspan="7" class="kb-empty">${t['admin.kb.searchError'] || '錯誤'}：${escapeHtml(error.message)}</td></tr>`;
		}
	};

	window.viewAdminReport = async function (reportId) {
		const t = getAdminT();
		const isEnglish = window.currentLanguage === 'en';
		try {
			const res = await fetch(`/admin/video-reports/${reportId}`, {
				headers: {
					Authorization: `Bearer ${getToken()}`,
					'X-Interface-Language': window.currentLanguage || 'zh-TW'
				}
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || t['admin.reports.loadFailed'] || '載入失敗');
			const report = data.report;
			const overall = report.overall_assessment || {};
			const recommendationItems = Array.isArray(report.recommendations) ? report.recommendations : (overall.overall_recommendations || []);
			const ageMonths = t['admin.reports.detail.childAge'] || '個月';
			const videoPreviewHtml = report.video_stream_url
				? `
					<div class="detail-section">
						<h4>${t['admin.kb.colAction'] || (isEnglish ? 'Action' : '操作')}</h4>
						<div class="detail-actions">
							<a class="detail-link-btn" href="${escapeHtml(report.video_stream_url)}" target="_blank" rel="noopener noreferrer">
								<i class="fas fa-film"></i>
								<span>${t['admin.reports.clickHint'] || '點擊查看詳細內容'}</span>
								<i class="fas fa-arrow-up-right-from-square detail-link-btn__icon"></i>
							</a>
						</div>
					</div>
				`
				: `
					<div class="detail-section">
						<h4>${t['admin.kb.colAction'] || (isEnglish ? 'Action' : '操作')}</h4>
						<p>${t['admin.reports.noVideo'] || '目前沒有可用的影片連結。'}</p>
					</div>
				`;
			const reportLabel = (key, en, zh) => t[key] || (isEnglish ? en : zh);
			openDetailModal(t['admin.reports.detail.title'] || '影片分析報告詳情', `
				<div class="detail-grid">
					<div class="detail-grid-card"><strong>${reportLabel('admin.reports.detail.reportId', 'Report ID', '報告 ID')}</strong><span>${escapeHtml(report.report_id)}</span></div>
					<div class="detail-grid-card"><strong>${reportLabel('admin.reports.detail.user', 'User', '用戶')}</strong><span>${escapeHtml(report.username)} / ${escapeHtml(report.email)}</span></div>
					<div class="detail-grid-card"><strong>${t['admin.reports.colChild'] || '兒童'}</strong><span>${escapeHtml(report.child_name)}（${escapeHtml((report.child_age_months || 0).toFixed(0))} ${ageMonths}）</span></div>
					<div class="detail-grid-card"><strong>${reportLabel('admin.reports.detail.originalVideo', 'Original Video', '原始影片')}</strong><span>${escapeHtml(report.video_filename || '-')}</span></div>
					<div class="detail-grid-card"><strong>${t['admin.reports.colStatus'] || '狀態'}</strong><span>${escapeHtml(report.status)}</span></div>
					<div class="detail-grid-card"><strong>${reportLabel('admin.reports.detail.referral', 'Referral Recommendation', '轉介建議')}</strong><span>${overall.professional_referral_needed ? (isEnglish ? 'Yes' : '是') : (isEnglish ? 'No' : '否')}</span></div>
				</div>
				<div class="detail-section">
					<h4>${t['admin.reports.colAttention'] || '關注'}</h4>
					<ul class="detail-list">${createDetailList(report.attention?.attention_reasons)}</ul>
				</div>
				<div class="detail-section">
					<h4>${t['video.reportSummaryTitle'] || '綜合摘要'}</h4>
					<p>${escapeHtml(overall.executive_summary || '—')}</p>
				</div>
				<div class="detail-section">
					<h4>${t['video.reportOverallRecommendations'] || '整體建議'}</h4>
					<ul class="detail-list">${createDetailList(recommendationItems)}</ul>
				</div>
				${videoPreviewHtml}
			`);
		} catch (error) {
			alert(`${t['admin.kb.searchError'] || '錯誤'}：${error.message}`);
		}
	};

	window.viewAdminAssessment = async function (assessmentId) {
		const t = getAdminT();
		const isEnglish = window.currentLanguage === 'en';
		try {
			const res = await fetch(`/admin/assessments/${assessmentId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || t['admin.assessments.loadFailed'] || '載入失敗');
			const assessment = data.assessment;
			const areas = assessment.area_results || {};
			const ageMonths = t['admin.assessments.detail.childAge'] || '個月';
			const areaRows = Object.entries(areas).map(([key, value]) => `<li><strong>${escapeHtml(value.label || key)}</strong>: ${escapeHtml(value.status || '—')} | ${isEnglish ? 'Mental age' : '心智年齡'} ${escapeHtml(value.mental_age || '-')}</li>`).join('') || (isEnglish ? '<li>None</li>' : '<li>無</li>');
			openDetailModal(isEnglish ? 'Development Assessment Details' : '發展評估詳情', `
				<div class="detail-grid">
					<div class="detail-grid-card"><strong>${isEnglish ? 'Assessment ID' : '評估 ID'}</strong><span>${escapeHtml(assessment.assessment_id)}</span></div>
					<div class="detail-grid-card"><strong>${isEnglish ? 'User' : '用戶'}</strong><span>${escapeHtml(assessment.username)} / ${escapeHtml(assessment.email)}</span></div>
					<div class="detail-grid-card"><strong>${t['admin.assessments.colChild'] || '兒童'}</strong><span>${escapeHtml(assessment.child_name)}（${escapeHtml((assessment.child_age_months || 0).toFixed(1))} ${ageMonths}）</span></div>
					<div class="detail-grid-card"><strong>DQ</strong><span>${escapeHtml(assessment.overall_dq ?? '-')}</span></div>
					<div class="detail-grid-card"><strong>${isEnglish ? 'DQ Level' : 'DQ 等級'}</strong><span>${escapeHtml(assessment.dq_level || '-')}</span></div>
					<div class="detail-grid-card"><strong>${t['admin.assessments.colCompletion'] || (isEnglish ? 'Completion Status' : '完成狀態')}</strong><span>${assessment.is_completed ? (isEnglish ? 'Completed' : '已完成') : (isEnglish ? 'Incomplete' : '未完成')}</span></div>
				</div>
				<div class="detail-section">
					<h4>${t['admin.reports.colAttention'] || (isEnglish ? 'Attention' : '關注')}</h4>
					<ul class="detail-list">${createDetailList(assessment.attention?.attention_reasons)}</ul>
				</div>
				<div class="detail-section">
					<h4>${isEnglish ? 'Domain Results' : '各領域結果'}</h4>
					<ul class="detail-list">${areaRows}</ul>
				</div>
			`);
		} catch (error) {
			alert(`${t['admin.kb.searchError'] || '錯誤'}：${error.message}`);
		}
	};

	window.viewAdminPoseRun = async function (runId) {
		const t = getAdminT();
		const isEnglish = window.currentLanguage === 'en';
		try {
			const res = await fetch(`/admin/pose-runs/${runId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || t['admin.pose.loadFailed'] || '載入失敗');
			const run = data.run;
			const score = run.evaluation?.score || {};
			const steps = run.evaluation?.steps || [];
			openDetailModal(isEnglish ? 'Pose Assessment Details' : '姿態檢測詳情', `
				<div class="detail-grid">
					<div class="detail-grid-card"><strong>Run ID</strong><span>${escapeHtml(run.run_id)}</span></div>
					<div class="detail-grid-card"><strong>${isEnglish ? 'User' : '用戶'}</strong><span>${escapeHtml(run.username)} / ${escapeHtml(run.email)}</span></div>
					<div class="detail-grid-card"><strong>${isEnglish ? 'Completion Rate' : '完成率'}</strong><span>${escapeHtml(score.percent ?? 0)}%</span></div>
					<div class="detail-grid-card"><strong>${isEnglish ? 'Completed Steps' : '完成步數'}</strong><span>${escapeHtml(score.completed ?? 0)} / ${escapeHtml(score.total ?? 0)}</span></div>
					<div class="detail-grid-card"><strong>${isEnglish ? 'Level' : '評級'}</strong><span>${escapeHtml(run.evaluation?.level || '-')}</span></div>
					<div class="detail-grid-card"><strong>${isEnglish ? 'Created At' : '建立時間'}</strong><span>${escapeHtml(formatDate(run.created_at))}</span></div>
				</div>
				<div class="detail-section">
					<h4>${isEnglish ? 'Attention Reasons' : '關注原因'}</h4>
					<ul class="detail-list">${createDetailList(run.attention?.attention_reasons)}</ul>
				</div>
				<div class="detail-section">
					<h4>${isEnglish ? 'Step Results' : '動作步驟結果'}</h4>
					<ul class="detail-list">${steps.length ? steps.map((step) => `<li><strong>${escapeHtml(step.nameEn || step.nameZh || step.key || (isEnglish ? 'Step' : '步驟'))}</strong>: ${escapeHtml(step.passed ? (isEnglish ? 'Pass' : '通過') : (isEnglish ? 'Fail' : '未通過'))} | ${escapeHtml((step.notes || []).join('、') || (isEnglish ? 'None' : '無'))}</li>`).join('') : `<li>${isEnglish ? 'No step data' : '無步驟資料'}</li>`}</ul>
				</div>
			`);
		} catch (error) {
			alert(`${isEnglish ? 'Failed to load pose details' : '載入姿態詳情失敗'}：${error.message}`);
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
		if (!confirm(window.currentLanguage === 'en'
			? `Delete the ${ids.length} selected documents and all related data?`
			: `確定刪除已選的 ${ids.length} 個文件及所有相關資料？`)) return;
		try {
			const res = await fetch('/admin/rag/documents/batch', {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({ document_ids: ids })
			});
			const data = await res.json();
			alert(data.message || (window.currentLanguage === 'en' ? 'Deleted' : '刪除完成'));
			loadKbDocuments();
		} catch (e) {
			alert(window.currentLanguage === 'en' ? `Batch delete failed: ${e.message}` : `批量刪除失敗: ${e.message}`);
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
			kbUploadArea.innerHTML = `<div class="upload-icon spin"><i class="fas fa-spinner"></i></div><div class="upload-text"><h3>${window.currentLanguage === 'en' ? 'Uploading...' : '上傳中...'} (${i + 1}/${total})</h3><p>${file.name}</p></div>`;

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
					errors.push(`${file.name}: ${data.error || (window.currentLanguage === 'en' ? 'Upload failed' : '上傳失敗')}`);
				}
			} catch (e) {
				failCount += 1;
				errors.push(`${file.name}: ${e.message}`);
			}
		}

		let message = window.currentLanguage === 'en'
			? `Submitted ${successCount} document(s); processing in the background`
			: `已提交 ${successCount} 個文件，背景處理中`;
		if (failCount > 0) {
			message += window.currentLanguage === 'en' ? `, ${failCount} failed` : `，失敗 ${failCount} 個`;
		}
		if (errors.length > 0 && errors.length <= 3) {
			message += `\n${errors.join('\n')}`;
		} else if (errors.length > 3) {
			message += window.currentLanguage === 'en'
				? `\n${errors.slice(0, 3).join('\n')}\n...and ${errors.length - 3} more error(s)`
				: `\n${errors.slice(0, 3).join('\n')}\n...及其他 ${errors.length - 3} 個錯誤`;
		}
		alert(message);

		kbUploadArea.innerHTML = window.currentLanguage === 'en'
			? '<div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div><div class="upload-text"><h3>Click or drop files to upload</h3><p>Supported formats: PDF, TXT, Markdown (batch upload supported)</p></div><input type="file" id="kbFileInput" accept=".pdf,.txt,.md" multiple style="display:none;">'
			: '<div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div><div class="upload-text"><h3>點擊或拖放文件上傳</h3><p>支援格式：PDF、TXT、Markdown（可批量上傳）</p></div><input type="file" id="kbFileInput" accept=".pdf,.txt,.md" multiple style="display:none;">';
		document.getElementById('kbFileInput').addEventListener('change', () => {
			if (kbFileInput.files.length) uploadKbFiles(kbFileInput.files);
		});
		loadKbDocuments();
	}

	// --- Document list ---
	async function loadKbDocuments() {
		const t = getAdminT();
		try {
			const res = await fetch('/admin/rag/documents', { headers: { Authorization: `Bearer ${getToken()}` } });
			const data = await res.json();
			if (!res.ok) {
				kbDocBody.innerHTML = `<tr><td colspan="6" class="kb-empty">${t['admin.kb.loadFailed'] || '載入失敗'}</td></tr>`;
				return;
			}

			const docs = data.documents || [];
			if (docs.length === 0) {
				kbDocBody.innerHTML = `<tr><td colspan="6" class="kb-empty">${t['admin.kb.noDocuments'] || '尚無文件。上傳文件以建立知識庫。'}</td></tr>`;
				document.getElementById('kbSelectAll').checked = false;
				document.getElementById('kbSelectAll').indeterminate = false;
				updateBatchDeleteBtn();
				return;
			}
			kbDocBody.innerHTML = docs.map((d) => {
				const displayStatus = normalizeKbStatus(d.status);
				const displayTime = d.updated_at || d.created_at;
				return `
				<tr data-doc-id="${d.id}">
					<td><input type="checkbox" class="kb-doc-checkbox" value="${d.id}" onchange="updateBatchDeleteBtn()"></td>
					<td><a href="/view_rag_document/${d.id}/${encodeURIComponent(d.original_filename)}" target="_blank" class="kb-doc-link" title="${d.original_filename}">${d.original_filename.length > 30 ? `${d.original_filename.slice(0, 27)}...` : d.original_filename}</a></td>
					<td>${d.content_type.split('/').pop().toUpperCase()}</td>
					<td><span class="kb-status ${displayStatus}" data-doc-status="${d.id}">${kbStatusLabel(displayStatus)}</span></td>
					<td data-doc-time="${d.id}">${formatDate(displayTime)}</td>
					<td>
						<button class="kb-btn kb-btn-reprocess" onclick="reprocessDoc(${d.id})"><i class="fas fa-redo"></i></button>
						<button class="kb-btn kb-btn-delete" onclick="deleteDoc(${d.id})"><i class="fas fa-trash"></i></button>
					</td>
				</tr>
			`;
			}).join('');
			document.getElementById('kbSelectAll').checked = false;
			updateBatchDeleteBtn();
		} catch (e) {
			kbDocBody.innerHTML = `<tr><td colspan="6" class="kb-empty">${t['admin.kb.searchError'] || '錯誤'}: ${e.message}</td></tr>`;
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
			const res = await fetch(`/admin/rag/documents/${id}/reprocess`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${getToken()}` }
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || '重新處理失敗');
			}

			const badge = document.querySelector(`[data-doc-status="${id}"]`);
			if (badge) {
				const displayStatus = normalizeKbStatus(data?.document?.status || 'processing');
				badge.className = `kb-status ${displayStatus}`;
				badge.textContent = kbStatusLabel(displayStatus);
			}

			const timeCell = document.querySelector(`[data-doc-time="${id}"]`);
			if (timeCell) {
				timeCell.textContent = formatDate(data?.document?.updated_at || new Date().toISOString());
			}
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
				transports: ['websocket'],
				auth: { token },
				reconnection: true,
				reconnectionAttempts: 3,
				reconnectionDelay: 1000,
				reconnectionDelayMax: 5000
			});

			const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
			let refreshRequired = false;
			let lastUserActivityAt = Date.now();

			const touchUserActivity = () => {
				lastUserActivityAt = Date.now();
			};

			const userActivityListener = () => touchUserActivity();
			['click', 'keydown', 'input', 'scroll', 'touchstart', 'pointerdown'].forEach((eventName) => {
				window.addEventListener(eventName, userActivityListener, { passive: true });
			});

			const idleTimer = window.setInterval(() => {
				if (refreshRequired || !socket.connected) return;

				if ((Date.now() - lastUserActivityAt) >= IDLE_TIMEOUT_MS) {
					refreshRequired = true;
					socket.io.opts.reconnection = false;
					socket.disconnect();
					alert('連線已因閒置中斷，請重新整理頁面後再繼續使用。');
				}
			}, 30000);

			const cleanup = () => {
				window.clearInterval(idleTimer);
				['click', 'keydown', 'input', 'scroll', 'touchstart', 'pointerdown'].forEach((eventName) => {
					window.removeEventListener(eventName, userActivityListener);
				});
			};

			window.addEventListener('pagehide', () => {
				socket.io.opts.reconnection = false;
				socket.disconnect();
				cleanup();
			});

			socket.on('connect_error', () => {
				if (refreshRequired) return;
			});

			socket.on('disconnect', (reason) => {
				if (refreshRequired) return;
				if (reason === 'io server disconnect') {
					refreshRequired = true;
					socket.io.opts.reconnection = false;
					const t = window.translations && window.translations[window.currentLanguage] || {};
					alert(t['admin.socket.disconnected'] || '連線已被伺服器中斷，請重新整理頁面後再連線。');
				}
			});

			socket.on('idle_timeout', (data) => {
				refreshRequired = true;
				socket.io.opts.reconnection = false;
				socket.disconnect();
				const t = window.translations && window.translations[window.currentLanguage] || {};
				alert((data && data.message) || t['admin.socket.idle'] || '連線已因閒置中斷，請重新整理頁面後再繼續使用。');
			});

			socket.on('rag_document_status', (data) => {
				touchUserActivity();
				const badge = document.querySelector(`[data-doc-status="${data.document_id}"]`);
				if (badge) {
					const displayStatus = normalizeKbStatus(data.status);
					badge.className = `kb-status ${displayStatus}`;
					badge.textContent = kbStatusLabel(displayStatus);
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
		const t = window.translations && window.translations[window.currentLanguage] || {};
		const query = kbSearchInput.value.trim();
		if (!query) return;
		kbSearchResults.innerHTML = `<div class="kb-empty">${t['admin.kb.searchSearching'] || '搜尋中...'}</div>`;
		try {
			const res = await fetch('/admin/rag/search', {
				method: 'POST',
				headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({ query })
			});
			const data = await res.json();
			if (!res.ok) {
				kbSearchResults.innerHTML = `<div class="kb-empty">${t['admin.kb.searchError'] || '錯誤'}: ${data.error || t['admin.kb.searchFailed'] || '搜尋失敗'}</div>`;
				return;
			}

			const results = data.results || [];
			if (results.length === 0) {
				kbSearchResults.innerHTML = `<div class="kb-empty">${t['admin.kb.searchNoResults'] || '未找到相關結果'}</div>`;
				return;
			}
			const resultFormat = t['admin.kb.searchResultFormat'] || '#{index} | {name}{page}{heading} | 相關度: {score}%';
			const pageSuffix = t['admin.kb.searchResultPage'] || ' p.{page}';
			const headingSuffix = t['admin.kb.searchResultHeading'] || ' | {heading}';
			kbSearchResults.innerHTML = results.map((r, i) => `
				<div class="kb-result-item">
					<div class="kb-result-meta">
						<i class="fas fa-file-alt"></i> ${resultFormat.replace('#{index}', i + 1).replace('{name}', r.document_name).replace('{page}', r.page_number ? pageSuffix.replace('{page}', r.page_number) : '').replace('{heading}', r.heading ? headingSuffix.replace('{heading}', r.heading) : '').replace('{score}', (r.similarity * 100).toFixed(0))}
					</div>
					<div class="kb-result-content">${r.content.length > 500 ? `${r.content.slice(0, 500)}...` : r.content}</div>
				</div>
			`).join('');
		} catch (e) {
			kbSearchResults.innerHTML = `<div class="kb-empty">${t['admin.kb.searchError'] || '錯誤'}: ${e.message}</div>`;
		}
	}
});
