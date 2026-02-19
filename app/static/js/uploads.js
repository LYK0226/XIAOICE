class UploadsManager {
    constructor(options = {}) {
        this.currentCategory = options.category || 'chatbox';
        this.uploads = [];
        this.containerSelector = options.containerSelector || '#uploadsList';
        this.emptySelector = options.emptySelector || '#uploadsEmpty';
        this.loadingSelector = options.loadingSelector || '.loading-spinner';
        this.selectedIds = new Set();
        this.batchMode = false;
    }

    _resolveLanguage() {
        const lang = typeof currentLanguage !== 'undefined' ? currentLanguage : 
                     (window.currentLanguage || localStorage.getItem('language') || localStorage.getItem('preferredLanguage') || 'zh-TW');
        const supported = ['zh-TW', 'zh-CN', 'en', 'ja'];
        return supported.includes(lang) ? lang : 'en';
    }

    t(key, vars = {}) {
        const lang = this._resolveLanguage();
        const translations = window.translations && window.translations[lang] ? window.translations[lang] : {};
        let text = translations[key] || key;
        
        for (const [k, v] of Object.entries(vars)) {
            text = text.replace(`{${k}}`, v);
        }
        return text;
    }

    init() {
        this.attachEventListeners();
        this.loadUploads(this.currentCategory);
    }

    attachEventListeners() {
        const tabs = document.querySelectorAll('.upload-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentCategory = tab.dataset.category;
                this.loadUploads(this.currentCategory);
            });
        });
    }

    async loadUploads(category) {
        this.currentCategory = category;
        this.selectedIds.clear();
        this.batchMode = false;
        const container = document.querySelector(this.containerSelector);
        const emptyState = document.querySelector(this.emptySelector);
        const loadingSpinner = document.querySelector(this.loadingSelector);
        
        if (!container) return;
        
        if (loadingSpinner) loadingSpinner.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        container.innerHTML = '';
        
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/uploads?category=${category}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load uploads');
            
            const data = await response.json();
            this.uploads = data.uploads || [];
            
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            
            if (this.uploads.length === 0) {
                if (emptyState) emptyState.style.display = 'flex';
                return;
            }
            
            this.renderUploads();
        } catch (error) {
            console.error('Error loading uploads:', error);
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            container.innerHTML = `<div class="error-message">${this.t('uploads.loadFailed')}：${error.message}</div>`;
        }
    }

    /* ── Render ── */

    renderUploads() {
        const container = document.querySelector(this.containerSelector);
        if (!container) return;
        
        const isVideo = this.currentCategory === 'video_assess';
        
        // Batch toolbar (video page only)
        let toolbarHtml = '';
        if (isVideo && this.uploads.length > 0) {
            toolbarHtml = `
                <div class="batch-toolbar">
                    <button class="batch-toggle-btn" id="batchToggleBtn">
                        <i class="fas fa-check-double"></i> ${this.t('uploads.batchManage')}
                    </button>
                    <div class="batch-actions" id="batchActions" style="display:none;">
                        <label class="batch-select-all">
                            <input type="checkbox" id="batchSelectAll"> ${this.t('uploads.selectAll')}
                        </label>
                        <span class="batch-count" id="batchCount">${this.t('uploads.selectedItems', { count: 0 })}</span>
                        <button class="batch-delete-btn" id="batchDeleteBtn" disabled>
                            <i class="fas fa-trash"></i> ${this.t('uploads.batchDelete')}
                        </button>
                        <button class="batch-cancel-btn" id="batchCancelBtn">${this.t('uploads.cancel')}</button>
                    </div>
                </div>
            `;
        }

        // Group by child name for video uploads
        if (isVideo) {
            const groups = this._groupByChild(this.uploads);
            let html = toolbarHtml;
            
            for (const [childName, items] of groups) {
                const groupId = `group-${childName.replace(/\W/g, '_')}`;
                html += `
                    <div class="upload-group">
                        <div class="upload-group-header" data-group-id="${groupId}">
                            <i class="fas fa-chevron-down group-toggle-icon"></i>
                            <span class="group-name">${this.escapeHtml(childName)}</span>
                            <span class="group-count">(${items.length})</span>
                        </div>
                        <div class="upload-group-body" id="${groupId}">
                            ${items.map(upload => this.renderUploadCard(upload)).join('')}
                        </div>
                    </div>
                `;
            }
            container.innerHTML = html;
        } else {
            container.innerHTML = this.uploads.map(upload => this.renderUploadCard(upload)).join('');
        }
        
        this._bindCardEvents();
    }

    /** Group uploads by child name from analysis_report_info, sorted alphabetically. */
    _groupByChild(uploads) {
        const map = new Map();
        const UNCATEGORIZED = this.t('uploads.uncategorized');
        
        for (const u of uploads) {
            const childName = u.analysis_report_info?.child_name || UNCATEGORIZED;
            if (!map.has(childName)) map.set(childName, []);
            map.get(childName).push(u);
        }
        
        // Sort: named groups alphabetically, 未分類 at the end
        const sorted = [...map.entries()].sort((a, b) => {
            if (a[0] === UNCATEGORIZED) return 1;
            if (b[0] === UNCATEGORIZED) return -1;
            return a[0].localeCompare(b[0], 'zh-Hant');
        });
        return sorted;
    }

    /** Bind all interactive events after DOM render */
    _bindCardEvents() {
        // Delete buttons
        document.querySelectorAll('.delete-upload-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteUpload(e.currentTarget.dataset.uploadId);
            });
        });

        // Report view buttons
        document.querySelectorAll('.view-report-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.viewReport(e.currentTarget.dataset.reportId);
            });
        });

        // Group collapse/expand
        document.querySelectorAll('.upload-group-header').forEach(header => {
            header.addEventListener('click', () => {
                const body = document.getElementById(header.dataset.groupId);
                if (!body) return;
                const icon = header.querySelector('.group-toggle-icon');
                const collapsed = body.style.display === 'none';
                body.style.display = collapsed ? '' : 'none';
                if (icon) {
                    icon.classList.toggle('fa-chevron-down', collapsed);
                    icon.classList.toggle('fa-chevron-right', !collapsed);
                }
            });
        });

        // Batch management
        const toggleBtn = document.getElementById('batchToggleBtn');
        const cancelBtn = document.getElementById('batchCancelBtn');
        const selectAllCb = document.getElementById('batchSelectAll');
        const deleteBtn = document.getElementById('batchDeleteBtn');

        if (toggleBtn) toggleBtn.addEventListener('click', () => this._enterBatchMode());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this._exitBatchMode());
        if (selectAllCb) selectAllCb.addEventListener('change', (e) => this._toggleSelectAll(e.target.checked));
        if (deleteBtn) deleteBtn.addEventListener('click', () => this.batchDelete());

        // Individual checkboxes
        document.querySelectorAll('.batch-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = e.target.dataset.uploadId;
                if (e.target.checked) this.selectedIds.add(id);
                else this.selectedIds.delete(id);
                this._updateBatchCount();
            });
        });
    }

    /* ── Batch mode ── */

    _enterBatchMode() {
        this.batchMode = true;
        this.selectedIds.clear();
        document.getElementById('batchToggleBtn')?.style.setProperty('display', 'none');
        document.getElementById('batchActions')?.style.setProperty('display', 'flex');
        document.querySelectorAll('.batch-checkbox').forEach(cb => cb.style.display = '');
        document.querySelectorAll('.upload-actions').forEach(el => el.style.display = 'none');
    }

    _exitBatchMode() {
        this.batchMode = false;
        this.selectedIds.clear();
        document.getElementById('batchToggleBtn')?.style.setProperty('display', '');
        document.getElementById('batchActions')?.style.setProperty('display', 'none');
        const selectAllCb = document.getElementById('batchSelectAll');
        if (selectAllCb) selectAllCb.checked = false;
        document.querySelectorAll('.batch-checkbox').forEach(cb => { cb.style.display = 'none'; cb.checked = false; });
        document.querySelectorAll('.upload-actions').forEach(el => el.style.display = '');
        this._updateBatchCount();
    }

    _toggleSelectAll(checked) {
        document.querySelectorAll('.batch-checkbox').forEach(cb => {
            cb.checked = checked;
            const id = cb.dataset.uploadId;
            if (checked) this.selectedIds.add(id);
            else this.selectedIds.delete(id);
        });
        this._updateBatchCount();
    }

    _updateBatchCount() {
        const countEl = document.getElementById('batchCount');
        const deleteBtn = document.getElementById('batchDeleteBtn');
        if (countEl) countEl.textContent = this.t('uploads.selectedItems', { count: this.selectedIds.size });
        if (deleteBtn) deleteBtn.disabled = this.selectedIds.size === 0;
    }

    async batchDelete() {
        if (this.selectedIds.size === 0) return;
        if (!confirm(this.t('uploads.confirmBatchDelete', { count: this.selectedIds.size }))) return;

        const token = localStorage.getItem('access_token');
        const ids = [...this.selectedIds];

        try {
            const isVideo = this.currentCategory === 'video_assess';
            const endpoint = isVideo ? '/api/videos/batch-delete' : '/api/uploads/batch-delete';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || this.t('uploads.batchDeleteFailed'));
            }

            const result = await response.json();
            this.selectedIds.clear();
            this.batchMode = false;
            this.loadUploads(this.currentCategory);
        } catch (error) {
            console.error('Batch delete error:', error);
            alert(this.t('uploads.batchDeleteFailed') + '：' + error.message);
        }
    }

    /* ── Report modal ── */

    async viewReport(reportId) {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const res = await fetch(`/api/video-analysis-report/${reportId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.report) {
                alert(payload.error || '無法載入報告');
                return;
            }
            const report = payload.report;

            const modal = document.getElementById('analysisResultModal');
            const body = document.getElementById('analysisResultBody');
            if (modal && body) {
                body.innerHTML = this._buildReportHtml(report);
                modal.style.display = 'block';
            } else {
                const w = window.open('', '_blank');
                w.document.write(`<html><head><title>分析報告</title><meta charset="UTF-8"></head><body style="font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px;">${this._buildReportHtml(report)}</body></html>`);
                w.document.close();
            }
        } catch (err) {
            console.error('viewReport error:', err);
            alert('載入報告失敗：' + err.message);
        }
    }

    _buildReportHtml(report) {
        const motor = report?.motor_analysis || {};
        const language = report?.language_analysis || {};
        const overall = report?.overall_assessment || {};
        const recs = report?.recommendations || overall?.overall_recommendations || [];

        const statusBadge = (s) => {
            const colors = { TYPICAL: '#c6f6d5', CONCERN: '#fefcbf', NEEDS_ATTENTION: '#fed7d7' };
            const labels = { TYPICAL: '✅ 正常', CONCERN: '⚠️ 需要關注', NEEDS_ATTENTION: '🔴 需要注意' };
            const bg = colors[s] || '#e2e8f0';
            const label = labels[s] || s || '—';
            return `<span style="background:${bg};padding:2px 10px;border-radius:12px;font-weight:bold;">${this.escapeHtml(label)}</span>`;
        };

        const listHtml = (items) => {
            if (!items || items.length === 0) return '<li>無</li>';
            if (typeof items === 'string') return `<li>${this.escapeHtml(items)}</li>`;
            return items.map(i => `<li>${this.escapeHtml(i)}</li>`).join('');
        };

        const execSummary = overall?.executive_summary || '分析已完成';
        const motorSection = overall?.motor_development || motor;
        const langSection = overall?.language_development || language;
        const overallRecs = Array.isArray(recs) ? recs : (overall?.overall_recommendations || []);

        const downloadBtn = report?.pdf_gcs_url
            ? `<a href="/api/video-analysis-report/${report.report_id}/download" class="btn btn-primary" style="margin-top:12px;display:inline-block;text-decoration:none;">
                 <i class="fas fa-download"></i> 下載完整報告
               </a>`
            : '';

        return `
            <h3>🧒 兒童發展影片分析報告</h3>
            <p><strong>兒童：</strong>${this.escapeHtml(report?.child_name || '')}
               <strong style="margin-left:16px;">年齡：</strong>${report?.child_age_months?.toFixed(0) || '?'} 個月</p>
            <h4>📋 綜合摘要</h4>
            <p>${this.escapeHtml(execSummary)}</p>
            <h4>🏃 身體動作發展 ${statusBadge(motorSection?.status)}</h4>
            <p>${this.escapeHtml(motorSection?.findings || '')}</p>
            ${motorSection?.concerns?.length ? '<p><strong>關注事項：</strong></p><ul>' + listHtml(motorSection.concerns) + '</ul>' : ''}
            ${motorSection?.recommendations?.length ? '<p><strong>建議：</strong></p><ul>' + listHtml(motorSection.recommendations) + '</ul>' : ''}
            <h4>🗣️ 語言發展 ${statusBadge(langSection?.status)}</h4>
            <p>${this.escapeHtml(langSection?.findings || '')}</p>
            ${langSection?.concerns?.length ? '<p><strong>關注事項：</strong></p><ul>' + listHtml(langSection.concerns) + '</ul>' : ''}
            ${langSection?.recommendations?.length ? '<p><strong>建議：</strong></p><ul>' + listHtml(langSection.recommendations) + '</ul>' : ''}
            ${overallRecs.length ? '<h4>📌 整體建議</h4><ul>' + listHtml(overallRecs) + '</ul>' : ''}
            ${downloadBtn}
        `;
    }

    /* ── Card rendering (simplified) ── */

    renderUploadCard(upload) {
        const isVideo = this.currentCategory === 'video_assess';
        const uploadDate = new Date(upload.uploaded_at || upload.created_at).toLocaleDateString('zh-TW');

        const displayName = this._simplifyFilename(upload.original_filename || upload.filename);

        let reportButtons = '';
        if (isVideo && upload.analysis_report_info) {
            const rpt = upload.analysis_report_info;
            if (rpt.status === 'completed') {
                reportButtons = `
                    <div class="report-actions">
                        <button class="view-report-btn btn-sm" data-report-id="${rpt.report_id}">
                            <i class="fas fa-file-alt"></i> ${this.t('uploads.viewReport')}
                        </button>
                        ${rpt.has_pdf ? `<a href="/api/video-analysis-report/${rpt.report_id}/download" class="btn-sm report-download-btn">
                            <i class="fas fa-download"></i> ${this.t('uploads.downloadReport')}
                        </a>` : ''}
                    </div>
                `;
            } else if (rpt.status === 'processing' || rpt.status === 'pending') {
                reportButtons = `
                    <div class="report-actions">
                        <span class="report-processing"><i class="fas fa-spinner fa-spin"></i> ${this.t('uploads.reportGenerating')}</span>
                    </div>
                `;
            } else if (rpt.status === 'failed') {
                reportButtons = `
                    <div class="report-actions">
                        <span class="report-failed"><i class="fas fa-exclamation-circle"></i> ${this.t('uploads.analysisFailed')}</span>
                    </div>
                `;
            }
        }

        const checkboxHtml = isVideo
            ? `<input type="checkbox" class="batch-checkbox" data-upload-id="${upload.id}" style="display:none;">`
            : '';

        const fileIcon = isVideo ? 'fa-video' : this.getFileIcon(upload.file_type || upload.filename);
        
        return `
            <div class="upload-card" data-upload-id="${upload.id}">
                ${checkboxHtml}
                <div class="upload-info">
                    <div class="upload-filename">${this.escapeHtml(displayName)}</div>
                    <div class="upload-meta">
                        <span><i class="fas fa-clock"></i> ${uploadDate}</span>
                    </div>
                    ${reportButtons}
                </div>
                <div class="upload-actions">
                    ${upload.signed_url ? `<button class="view-upload-btn" onclick="window.open('${upload.signed_url}', '_blank')">
                        <i class="fas fa-play"></i> ${this.t('uploads.viewVideo')}
                    </button>` : ''}
                    <button class="delete-upload-btn" data-upload-id="${upload.id}">
                        <i class="fas fa-trash"></i> ${this.t('uploads.delete')}
                    </button>
                </div>
            </div>
        `;
    }

    /** Strip timestamp portions from auto-generated filenames.
     *  e.g. "video_20260210181456123456.mp4" → "video.mp4"
     *       "my_file_20260101120000.pdf" → "my_file.pdf"
     */
    _simplifyFilename(name) {
        if (!name) return this.t('uploads.unnamed');
        // Remove _YYYYMMDDHHMMSSxxxxxx pattern before extension
        return name.replace(/_\d{14,}(?=\.\w+$)/, '');
    }

    getFileIcon(fileType) {
        const iconMap = {
            'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'docx': 'fa-file-word',
            'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel',
            'ppt': 'fa-file-powerpoint', 'pptx': 'fa-file-powerpoint',
            'jpg': 'fa-file-image', 'jpeg': 'fa-file-image', 'png': 'fa-file-image', 'gif': 'fa-file-image',
            'mp4': 'fa-file-video', 'avi': 'fa-file-video', 'mov': 'fa-file-video'
        };
        const ext = fileType?.toLowerCase() || '';
        return iconMap[ext] || 'fa-file';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async deleteUpload(uploadId) {
        if (!confirm(this.t('uploads.confirmDelete'))) return;
        
        try {
            const token = localStorage.getItem('access_token');
            const endpoint = this.currentCategory === 'video_assess' 
                ? `/api/videos/${uploadId}` 
                : `/api/uploads/${uploadId}`;
            
            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) throw new Error(this.t('uploads.deleteFailed'));
            
            this.loadUploads(this.currentCategory);
        } catch (error) {
            console.error('Error deleting upload:', error);
            alert(this.t('uploads.deleteFailed') + '：' + error.message);
        }
    }
}

window.UploadsManager = UploadsManager;

document.addEventListener('DOMContentLoaded', () => {
    const videoPageContainer = document.getElementById('videoUploadsList');
    if (videoPageContainer) {
        const videoUploadsManager = new UploadsManager({
            category: 'video_assess',
            containerSelector: '#videoUploadsList',
            emptySelector: '#videoUploadsEmpty',
            loadingSelector: '#videoUploadsListContainer .loading-spinner'
        });
        videoUploadsManager.init();
        window.videoUploadsManager = videoUploadsManager;
        
        window.addEventListener('languageChanged', () => {
            if (videoUploadsManager.uploads.length > 0) {
                videoUploadsManager.renderUploads();
            }
        });
        return;
    }
    
    const uploadsManager = new UploadsManager();
    
    window.addEventListener('languageChanged', () => {
        if (uploadsManager.uploads.length > 0) {
            uploadsManager.renderUploads();
        }
    });
    
    const avatarModal = document.getElementById('avatarModal');
    if (avatarModal) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style') {
                    const display = window.getComputedStyle(avatarModal).display;
                    if (display !== 'none' && document.getElementById('uploadsTab')?.classList.contains('active')) {
                        uploadsManager.init();
                    }
                }
            });
        });
        observer.observe(avatarModal, { attributes: true });
    }
    
    const uploadsTabs = document.querySelectorAll('.settings-group[data-group="uploads"]');
    uploadsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            setTimeout(() => uploadsManager.init(), 100);
        });
    });
});
