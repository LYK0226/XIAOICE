class UploadsManager {
    constructor(options = {}) {
        this.currentCategory = options.category || 'chatbox';
        this.uploads = [];
        this.containerSelector = options.containerSelector || '#uploadsList';
        this.emptySelector = options.emptySelector || '#uploadsEmpty';
        this.loadingSelector = options.loadingSelector || '.loading-spinner';
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
            container.innerHTML = `<div class="error-message">載入失敗：${error.message}</div>`;
        }
    }

    renderUploads() {
        const container = document.querySelector(this.containerSelector);
        if (!container) return;
        
        container.innerHTML = this.uploads.map(upload => this.renderUploadCard(upload)).join('');
        
        document.querySelectorAll('.delete-upload-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const uploadId = e.currentTarget.dataset.uploadId;
                this.deleteUpload(uploadId);
            });
        });
    }

    renderUploadCard(upload) {
        const isVideo = this.currentCategory === 'video_assess';
        const fileSize = upload.file_size ? this.formatFileSize(upload.file_size) : 'Unknown';
        const uploadDate = new Date(upload.uploaded_at || upload.created_at).toLocaleString('zh-TW');
        
        let statusBadge = '';
        if (isVideo) {
            const transcriptionStatus = this.getStatusBadge(upload.transcription_status);
            const analysisStatus = this.getStatusBadge(upload.analysis_status);
            statusBadge = `
                <div class="status-badges">
                    <span class="status-badge">${transcriptionStatus}</span>
                    <span class="status-badge">${analysisStatus}</span>
                </div>
            `;
        }
        
        return `
            <div class="upload-card" data-upload-id="${upload.id}">
                <div class="upload-icon">
                    <i class="fas ${isVideo ? 'fa-video' : this.getFileIcon(upload.file_type || upload.filename)}"></i>
                </div>
                <div class="upload-info">
                    <div class="upload-filename">${this.escapeHtml(upload.filename || upload.original_filename)}</div>
                    <div class="upload-meta">
                        <span><i class="fas fa-hdd"></i> ${fileSize}</span>
                        <span><i class="fas fa-clock"></i> ${uploadDate}</span>
                    </div>
                    ${statusBadge}
                </div>
                <div class="upload-actions">
                    ${upload.signed_url ? `<button class="view-upload-btn" onclick="window.open('${upload.signed_url}', '_blank')">
                        <i class="fas fa-eye"></i> 查看
                    </button>` : ''}
                    <button class="delete-upload-btn" data-upload-id="${upload.id}">
                        <i class="fas fa-trash"></i> 刪除
                    </button>
                </div>
            </div>
        `;
    }

    getStatusBadge(status) {
        const statusMap = {
            'pending': '<i class="fas fa-clock"></i> 待處理',
            'processing': '<i class="fas fa-spinner fa-spin"></i> 處理中',
            'completed': '<i class="fas fa-check-circle"></i> 完成',
            'failed': '<i class="fas fa-times-circle"></i> 失敗'
        };
        return statusMap[status] || status;
    }

    getFileIcon(fileType) {
        const iconMap = {
            'pdf': 'fa-file-pdf',
            'doc': 'fa-file-word',
            'docx': 'fa-file-word',
            'xls': 'fa-file-excel',
            'xlsx': 'fa-file-excel',
            'ppt': 'fa-file-powerpoint',
            'pptx': 'fa-file-powerpoint',
            'jpg': 'fa-file-image',
            'jpeg': 'fa-file-image',
            'png': 'fa-file-image',
            'gif': 'fa-file-image',
            'mp4': 'fa-file-video',
            'avi': 'fa-file-video',
            'mov': 'fa-file-video'
        };
        
        const ext = fileType?.toLowerCase() || '';
        return iconMap[ext] || 'fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async deleteUpload(uploadId) {
        if (!confirm('確定要刪除此檔案嗎？此操作無法復原。')) return;
        
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
            
            if (!response.ok) throw new Error('刪除失敗');
            
            this.loadUploads(this.currentCategory);
        } catch (error) {
            console.error('Error deleting upload:', error);
            alert(`刪除失敗：${error.message}`);
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
        return;
    }
    
    const uploadsManager = new UploadsManager();
    
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
