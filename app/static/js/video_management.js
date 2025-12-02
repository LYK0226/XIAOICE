/**
 * Video Management Module
 * Handles video upload, transcription, and analysis
 */

class VideoManager {
    constructor() {
        this.videoModal = document.getElementById('videoModal');
        this.videoUploadBtn = document.getElementById('videoUploadBtn');
        this.closeVideoModal = document.getElementById('closeVideoModal');
        this.videoUploadZone = document.getElementById('videoUploadZone');
        this.videoInput = document.getElementById('videoInput');
        this.videoList = document.getElementById('videoList');
        this.videoDetails = document.getElementById('videoDetails');
        
        this.currentVideoId = null;
        this.analysisInProgress = false;
        this.analysisPaused = false;
        this.analysisPollingInterval = null;
        
        this.initEventListeners();
        this.loadVideos();
    }
    
    initEventListeners() {
        // Open modal
        this.videoUploadBtn.addEventListener('click', () => {
            this.videoModal.style.display = 'flex';
        });
        
        // Close modal
        this.closeVideoModal.addEventListener('click', () => {
            this.videoModal.style.display = 'none';
        });
        
        // Click outside to close
        this.videoModal.addEventListener('click', (e) => {
            if (e.target === this.videoModal) {
                this.videoModal.style.display = 'none';
            }
        });
        
        // Upload zone
        this.videoUploadZone.addEventListener('click', () => {
            this.videoInput.click();
        });
        
        // Drag and drop
        this.videoUploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.videoUploadZone.style.background = 'rgba(102, 126, 234, 0.2)';
        });
        
        this.videoUploadZone.addEventListener('dragleave', () => {
            this.videoUploadZone.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)';
        });
        
        this.videoUploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.videoUploadZone.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)';
            
            if (e.dataTransfer.files.length > 0) {
                this.videoInput.files = e.dataTransfer.files;
                this.uploadVideo();
            }
        });
        
        // File input change
        this.videoInput.addEventListener('change', () => {
            this.uploadVideo();
        });
        
        // Action buttons
        document.getElementById('analyzeVideoBtn').addEventListener('click', () => {
            this.analyzeVideo();
        });
        
        document.getElementById('pauseAnalysisBtn').addEventListener('click', () => {
            this.pauseAnalysis();
        });
        
        document.getElementById('resumeAnalysisBtn').addEventListener('click', () => {
            this.resumeAnalysis();
        });
        
        document.getElementById('downloadReportBtn').addEventListener('click', () => {
            this.downloadReport();
        });
        
        document.getElementById('deleteVideoBtn').addEventListener('click', () => {
            this.deleteVideo();
        });
        
        document.getElementById('backToListBtn').addEventListener('click', () => {
            this.videoDetails.style.display = 'none';
            this.videoList.style.display = 'grid';
        });
    }
    
    uploadVideo() {
        const file = this.videoInput.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('video', file);
        
        const progressDiv = document.getElementById('uploadProgress');
        const progressFill = document.querySelector('.progress-fill');
        const uploadStatus = document.getElementById('uploadStatus');
        
        progressDiv.style.display = 'block';
        progressFill.style.width = '0%';
        uploadStatus.textContent = '上載中...';
        
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressFill.style.width = percentComplete + '%';
                uploadStatus.textContent = `上載中... ${Math.round(percentComplete)}%`;
            }
        });
        
        xhr.addEventListener('load', () => {
            if (xhr.status === 201) {
                const response = JSON.parse(xhr.responseText);
                uploadStatus.textContent = '上載成功！正在轉錄...';
                
                setTimeout(() => {
                    this.loadVideos();
                    progressDiv.style.display = 'none';
                    this.videoInput.value = '';
                }, 1500);
            } else {
                uploadStatus.textContent = '上載失敗：' + (JSON.parse(xhr.responseText).error || 'Unknown error');
            }
        });
        
        xhr.addEventListener('error', () => {
            uploadStatus.textContent = '上載錯誤，請重試';
        });
        
        xhr.open('POST', '/api/upload-video');
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('access_token')}`);
        xhr.send(formData);
    }
    
    loadVideos() {
        fetch('/api/videos', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.videos.length > 0) {
                this.videoList.innerHTML = data.videos.map(video => `
                    <div class="video-item" onclick="videoManager.viewVideoDetails(${video.id})">
                        <div class="video-item-icon">
                            <i class="fas fa-video"></i>
                        </div>
                        <div class="video-item-name" title="${video.original_filename}">
                            ${video.original_filename.substring(0, 15)}...
                        </div>
                        <div class="video-item-size">
                            ${(video.file_size / 1024 / 1024).toFixed(2)} MB
                        </div>
                        <div class="video-item-size" style="color: #667eea; margin-top: 4px;">
                            ${video.transcription_status === 'completed' ? '✓ 已轉錄' : '轉錄中...'}
                        </div>
                    </div>
                `).join('');
            } else {
                this.videoList.innerHTML = '<p class="empty-state">尚無影片</p>';
            }
        })
        .catch(err => {
            console.error('Error loading videos:', err);
            this.videoList.innerHTML = '<p class="empty-state">載入失敗</p>';
        });
    }
    
    viewVideoDetails(videoId) {
        this.currentVideoId = videoId;
        
        fetch(`/api/video/${videoId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const video = data.video;
                
                // Show details
                this.videoList.style.display = 'none';
                this.videoDetails.style.display = 'block';
                
                // Set up video player
                const videoPlayer = document.getElementById('videoPlayer');
                const videoSource = document.getElementById('videoSource');
                
                // Extract filename from file_path
                const filePath = video.file_path;
                const filename = filePath.split('/').pop() || filePath.split('\\').pop();
                
                // Use API route instead of static path
                videoSource.src = `/api/video-file/${filename}`;
                videoSource.type = 'video/mp4';
                
                // Handle video player errors
                videoPlayer.onerror = (e) => {
                    console.error('Video player error:', e);
                    videoPlayer.innerHTML = '<p style="color: red; padding: 20px;">影片無法播放。請確保檔案格式正確。</p>';
                };
                
                videoPlayer.load();
                
                // Fill in details
                document.getElementById('detailFileName').textContent = video.original_filename;
                document.getElementById('detailFileSize').textContent = (video.file_size / 1024 / 1024).toFixed(2) + ' MB';
                document.getElementById('detailDuration').textContent = video.duration ? Math.round(video.duration) + ' seconds' : 'Unknown';
                
                // Update transcription status badge
                const statusBadge = document.getElementById('transcriptionStatusBadge');
                if (video.transcription_status === 'completed') {
                    statusBadge.textContent = '✓ 已完成';
                    statusBadge.style.background = '#10b981';
                } else if (video.transcription_status === 'processing') {
                    statusBadge.textContent = '⏳ 進行中';
                    statusBadge.style.background = '#f59e0b';
                } else if (video.transcription_status === 'failed') {
                    statusBadge.textContent = '✗ 失敗';
                    statusBadge.style.background = '#ef4444';
                } else {
                    statusBadge.textContent = '⏸ 等待中';
                    statusBadge.style.background = '#6b7280';
                }
                
                // Update transcription progress
                if (video.transcription_status === 'processing') {
                    this.startTranscriptionPolling(videoId);
                } else if (video.transcription_status === 'completed') {
                    document.getElementById('transcriptionPercentage').textContent = '100%';
                    document.getElementById('transcriptionProgressFill').style.width = '100%';
                    document.getElementById('transcriptionProgressFill').style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
                    document.getElementById('transcriptionProgressText').textContent = '✓ 轉錄已完成';
                }
                
                // Transcription
                const transcriptionText = document.getElementById('transcriptionText');
                if (video.full_transcription) {
                    transcriptionText.textContent = video.full_transcription;
                    // Update word count
                    const wordCount = video.full_transcription.length;
                    document.getElementById('wordCount').textContent = `${wordCount} 字`;
                } else if (video.transcription_status === 'processing') {
                    transcriptionText.textContent = '轉錄進行中，請稍候...';
                    document.getElementById('wordCount').textContent = '0 字';
                } else {
                    transcriptionText.textContent = '尚未轉錄';
                    document.getElementById('wordCount').textContent = '0 字';
                }
                
                // Timestamps
                const timestampsContainer = document.getElementById('timestampsContainer');
                if (video.timestamps && video.timestamps.length > 0) {
                    timestampsContainer.innerHTML = video.timestamps.map(ts => `
                        <div class="timestamp-item">
                            <div class="timestamp-time" onclick="document.getElementById('videoPlayer').currentTime = ${ts.start_time}; document.getElementById('videoPlayer').play();">
                                <i class="fas fa-play" style="margin-right: 8px;"></i>
                                <strong>${ts.formatted_time}</strong>
                            </div>
                            <div class="timestamp-text">${ts.text}</div>
                        </div>
                    `).join('');
                } else {
                    timestampsContainer.innerHTML = '<p style="color: #999;">轉錄完成後將生成時間戳記</p>';
                }
                
                // Analysis
                const analysisContainer = document.getElementById('analysisContainer');
                if (video.analysis_report) {
                    const report = video.analysis_report;
                    let analysisHtml = '<div>';
                    if (report.summary) analysisHtml += `<p><strong>[Summary]</strong> ${report.summary}</p>`;
                    if (report.sentiment) analysisHtml += `<p><strong>[Sentiment]</strong> ${report.sentiment}</p>`;
                    if (report.key_points && report.key_points.length > 0) {
                        analysisHtml += '<p><strong>[Key Points]</strong><ul>';
                        report.key_points.forEach(point => {
                            analysisHtml += `<li>${point}</li>`;
                        });
                        analysisHtml += '</ul></p>';
                    }
                    if (report.topics && report.topics.length > 0) {
                        analysisHtml += '<p><strong>[Topics]</strong> ' + report.topics.join(', ') + '</p>';
                    }
                    analysisHtml += '</div>';
                    analysisContainer.innerHTML = analysisHtml;
                } else if (video.analysis_status === 'processing') {
                    analysisContainer.innerHTML = '<p style="color: #3b82f6;">[Processing] Analysis in progress...</p>';
                } else {
                    analysisContainer.innerHTML = '<p style="color: #999;">No analysis yet</p>';
                }
            }
        })
        .catch(err => {
            console.error('Error loading video details:', err);
            alert('無法載入影片詳情，請稍後重試');
        });
    }
    
    startTranscriptionPolling(videoId) {
        const pollInterval = setInterval(() => {
            fetch(`/api/video/${videoId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const video = data.video;
                    
                    // Update transcription text
                    const transcriptionText = document.getElementById('transcriptionText');
                    if (video.full_transcription) {
                        transcriptionText.textContent = video.full_transcription;
                        document.getElementById('wordCount').textContent = `${video.full_transcription.length} 字`;
                    }
                    
                    // Update progress
                    if (video.timestamps && video.timestamps.length > 0) {
                        const estimatedPercent = Math.min((video.timestamps.length / Math.max(Math.ceil(video.duration / 60), 1)) * 100, 95);
                        document.getElementById('transcriptionPercentage').textContent = Math.round(estimatedPercent) + '%';
                        document.getElementById('transcriptionProgressFill').style.width = estimatedPercent + '%';
                        document.getElementById('transcriptionProgressText').textContent = `已轉錄 ${video.timestamps.length} 分鐘...`;
                    }
                    
                    // Check if completed
                    if (video.transcription_status === 'completed') {
                        clearInterval(pollInterval);
                        document.getElementById('transcriptionPercentage').textContent = '100%';
                        document.getElementById('transcriptionProgressFill').style.width = '100%';
                        document.getElementById('transcriptionProgressFill').style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
                        document.getElementById('transcriptionProgressText').textContent = '✓ 轉錄已完成';
                        
                        // Update timestamps
                        const timestampsContainer = document.getElementById('timestampsContainer');
                        if (video.timestamps && video.timestamps.length > 0) {
                            timestampsContainer.innerHTML = video.timestamps.map(ts => `
                                <div class="timestamp-item">
                                    <div class="timestamp-time" onclick="document.getElementById('videoPlayer').currentTime = ${ts.start_time}; document.getElementById('videoPlayer').play();">
                                        <i class="fas fa-play" style="margin-right: 8px;"></i>
                                        <strong>${ts.formatted_time}</strong>
                                    </div>
                                    <div class="timestamp-text">${ts.text}</div>
                                </div>
                            `).join('');
                        }
                    }
                }
            });
        }, 1000); // Poll every second for real-time updates
    }
    
    analyzeVideo() {
        if (!this.currentVideoId) return;
        if (this.analysisInProgress) return;
        
        this.analysisInProgress = true;
        this.analysisPaused = false;
        this.updateAnalysisButtonState();
        
        fetch(`/api/video/${this.currentVideoId}/analyze`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('分析已開始，請稍候...');
                
                // Poll for updates
                this.analysisPollingInterval = setInterval(() => {
                    if (this.analysisPaused) return; // Skip polling if paused
                    
                    fetch(`/api/video/${this.currentVideoId}`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                        }
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.video.analysis_status === 'completed') {
                            clearInterval(this.analysisPollingInterval);
                            this.analysisInProgress = false;
                            this.updateAnalysisButtonState();
                            this.viewVideoDetails(this.currentVideoId);
                        }
                    });
                }, 2000);
            }
        })
        .catch(err => console.error('Error analyzing video:', err));
    }
    
    pauseAnalysis() {
        this.analysisPaused = true;
        this.updateAnalysisButtonState();
        
        const analysisContainer = document.getElementById('analysisContainer');
        analysisContainer.innerHTML = '<p style="color: #f59e0b;">⏸️ 分析已暫停</p>';
    }
    
    resumeAnalysis() {
        this.analysisPaused = false;
        this.updateAnalysisButtonState();
        
        const analysisContainer = document.getElementById('analysisContainer');
        analysisContainer.innerHTML = '<p style="color: #3b82f6;">⏳ 分析繼續進行中...</p>';
        
        // Resume polling
        this.analysisPollingInterval = setInterval(() => {
            if (this.analysisPaused) return;
            
            fetch(`/api/video/${this.currentVideoId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.video.analysis_status === 'completed') {
                    clearInterval(this.analysisPollingInterval);
                    this.analysisInProgress = false;
                    this.updateAnalysisButtonState();
                    this.viewVideoDetails(this.currentVideoId);
                }
            })
            .catch(err => console.error('Error polling analysis:', err));
        }, 2000);
    }
    
    updateAnalysisButtonState() {
        const analyzeBtn = document.getElementById('analyzeVideoBtn');
        const pauseBtn = document.getElementById('pauseAnalysisBtn');
        const resumeBtn = document.getElementById('resumeAnalysisBtn');
        
        if (!analyzeBtn || !pauseBtn || !resumeBtn) return;
        
        if (this.analysisInProgress && !this.analysisPaused) {
            analyzeBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-block';
            resumeBtn.style.display = 'none';
        } else if (this.analysisInProgress && this.analysisPaused) {
            analyzeBtn.style.display = 'none';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'inline-block';
        } else {
            analyzeBtn.style.display = 'inline-block';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'none';
        }
    }
    
    downloadReport() {
        if (!this.currentVideoId) return;
        
        fetch(`/api/video/${this.currentVideoId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const video = data.video;
                const reportData = {
                    filename: video.original_filename,
                    file_size: video.file_size,
                    duration: video.duration,
                    transcription: video.full_transcription,
                    analysis: video.analysis_report,
                    timestamps: video.timestamps,
                    created_at: video.created_at
                };
                
                const dataStr = JSON.stringify(reportData, null, 2);
                const dataBlob = new Blob([dataStr], {type: 'application/json'});
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `video_report_${this.currentVideoId}.json`;
                link.click();
            }
        })
        .catch(err => console.error('Error downloading report:', err));
    }
    
    deleteVideo() {
        if (!this.currentVideoId || !confirm('確定要刪除此影片嗎？')) return;
        
        fetch(`/api/video/${this.currentVideoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('影片已刪除');
                this.videoDetails.style.display = 'none';
                this.videoList.style.display = 'grid';
                this.loadVideos();
                this.currentVideoId = null;
            }
        })
        .catch(err => console.error('Error deleting video:', err));
    }
}

// Initialize video manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.videoManager = new VideoManager();
});
