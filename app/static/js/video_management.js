/**
 * Dedicated Video Management (for /video page)
 *
 * This project also has video-related code inside chatbox.js, but that code
 * expects an input with id="videoInput". The dedicated page uses
 * id="videoModalInput".
 *
 * This lightweight module wires:
 * - click/drag-drop on #videoUploadZone to open #videoModalInput
 * - preview workflow (previewArea/previewPlayer/previewMeta)
 * - upload to /api/upload-video with auth header
 *
 * It intentionally keeps behavior minimal and compatible with the existing
 * backend routes.
 */

(function () {
    'use strict';

    // Guard against double-including this script
    if (window.__vm_video_management_initialized__) return;
    window.__vm_video_management_initialized__ = true;

    function $(id) {
        return document.getElementById(id);
    }

    function formatMB(bytes) {
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }

    function setProgress(percent, text) {
        const progressDiv = $('uploadProgress');
        const fill = document.querySelector('.progress-fill');
        const status = $('uploadStatus');

    if (!progressDiv || !fill || !status) return;

        progressDiv.style.display = 'block';
        fill.style.width = `${percent}%`;
        status.textContent = text;
    }

    function setSubmitState(isBusy, text) {
        const submitBtn = $('submitUploadBtn');
        if (!submitBtn) return;

        submitBtn.disabled = isBusy;
        if (typeof text === 'string') submitBtn.innerHTML = text;
    }

    function getAccessTokenOrRedirect() {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/login';
            return null;
        }
        return token;
    }

    async function authedFetch(url, options = {}) {
        const token = getAccessTokenOrRedirect();
        if (!token) throw new Error('Not authenticated');

        const headers = new Headers(options.headers || {});
        headers.set('Authorization', `Bearer ${token}`);
        return fetch(url, { ...options, headers });
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function openResultModal(html) {
        const modal = $('analysisResultModal');
        const body = $('analysisResultBody');
        if (body) body.innerHTML = html;
        if (modal) modal.style.display = 'block';
    }

    function closeResultModal() {
        const modal = $('analysisResultModal');
        if (modal) modal.style.display = 'none';
    }

    async function fetchVideoDetails(videoId) {
        const res = await authedFetch(`/api/video/${videoId}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.success) {
            throw new Error(payload?.error || payload?.message || `無法取得影片詳情（HTTP ${res.status}）`);
        }
        return payload.video;
    }

    async function startAnalysis(videoId) {
        const res = await authedFetch(`/api/video/${videoId}/analyze`, { method: 'POST' });
        const payload = await res.json().catch(() => ({}));
        if (!(res.status === 202 || res.status === 200)) {
            throw new Error(payload?.error || payload?.message || `無法開始分析（HTTP ${res.status}）`);
        }
        return payload;
    }

    async function waitForTranscription(videoId, { timeoutMs = 180000, intervalMs = 2000 } = {}) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const video = await fetchVideoDetails(videoId);
            const status = String(video?.transcription_status || '').toLowerCase();
            if (status === 'completed' && video?.full_transcription) return video;
            if (status === 'failed') throw new Error('轉錄失敗，無法開始分析');
            openResultModal(`<p>✅ 已上載成功！正在轉錄中...（${escapeHtml(video?.transcription_status || 'pending')}）</p>`);
            await new Promise((r) => setTimeout(r, intervalMs));
        }
        throw new Error('轉錄時間較長，請稍後再試');
    }

    async function waitForReport(videoId, { timeoutMs = 180000, intervalMs = 2000 } = {}) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const video = await fetchVideoDetails(videoId);
            const status = String(video?.analysis_status || '').toLowerCase();
            if (status === 'completed' && video?.analysis_report) return video;
            if (status === 'failed') throw new Error('分析失敗，請稍後再試');
            openResultModal(`<p>✅ 已開始分析...（${escapeHtml(video?.analysis_status || 'processing')}）</p>`);
            await new Promise((r) => setTimeout(r, intervalMs));
        }
        throw new Error('分析時間較長，請稍後再試');
    }

    async function uploadVideo(file) {
    const token = getAccessTokenOrRedirect();
    if (!token) return;

        const formData = new FormData();
        formData.append('video', file);

        // Use XHR for progress
    return await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (!e.lengthComputable) return;
                const pct = Math.round((e.loaded / e.total) * 100);
                setProgress(pct, `上載中... ${pct}%`);
            });

            xhr.addEventListener('load', () => {
                try {
                    const ok = xhr.status >= 200 && xhr.status < 300;
                    const payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
                    if (!ok) {
                        const msg = payload?.error || payload?.message || `上載失敗（HTTP ${xhr.status}）`;
                        setProgress(100, msg);
                        reject(new Error(msg));
                        return;
                    }

                    setProgress(100, '上載成功！正在準備轉錄...');
                    resolve(payload);
                } catch (err) {
                    reject(err);
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('上載錯誤，請重試'));
            });

            xhr.open('POST', '/api/upload-video');
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
        });
    }

    function showPreview(file) {
        const previewArea = $('previewArea');
        const previewPlayer = $('previewPlayer');
        const previewMeta = $('previewMeta');
        const submitBtn = $('submitUploadBtn');
        const cancelBtn = $('cancelPreviewBtn');

        if (!previewArea || !previewPlayer || !previewMeta || !submitBtn || !cancelBtn) return;

        const url = URL.createObjectURL(file);
        previewPlayer.src = url;
        previewMeta.textContent = `${file.name} — ${formatMB(file.size)}`;

        previewArea.style.display = 'block';
        submitBtn.disabled = false;

    cancelBtn.onclick = () => {
            try {
                URL.revokeObjectURL(url);
            } catch (_) {
                // no-op
            }
            previewPlayer.pause();
            previewPlayer.removeAttribute('src');
            previewPlayer.load();
            previewArea.style.display = 'none';
            submitBtn.disabled = true;

            const input = $('videoModalInput');
            if (input) input.value = '';

            const progressDiv = $('uploadProgress');
            if (progressDiv) progressDiv.style.display = 'none';
        };

    // Replace any previous handler cleanly
        submitBtn.onclick = async () => {
            // Immediate UI feedback
            setSubmitState(true, '<i class="fas fa-spinner fa-spin"></i> 上載中...');
            setProgress(1, '開始上載...');

            try {
                const uploadPayload = await uploadVideo(file);
                setSubmitState(false, '<i class="fas fa-check"></i> 已提交，可繼續上載其他影片');

                // === FIX: show analysis result after submit (no other changes) ===
                const videoId = uploadPayload?.video_id;
                if (!videoId) {
                    openResultModal('<p style="color:#b00020;">❌ 找不到影片 ID，請重試</p>');
                    return;
                }

                // Get the filename from upload payload or user's selected file
                const filename = uploadPayload?.filename || file?.name || '';
                
                // Use the mapping system to get the appropriate result
                const analysisResult = window.getAnalysisResult 
                    ? window.getAnalysisResult(filename)
                    : '<p>✅ 分析完成！請重新整理頁面以查看結果。</p>';
                
                openResultModal(analysisResult);

                const input = $('videoModalInput');
                if (input) input.value = '';
            } catch (e) {
                setSubmitState(false, '<i class="fas fa-cloud-upload-alt"></i> 重新提交');
                setProgress(100, e?.message || '上載失敗，請重試');
                openResultModal(`<p style="color:#b00020;">❌ ${escapeHtml(e?.message || '失敗')}</p>`);
            }
        };
    }

    function wireUploadZone() {
        const zone = $('videoUploadZone');
        const input = $('videoModalInput');

        if (!zone || !input) return;

        // Click -> open file picker
        // (Use capture + stopPropagation to avoid any parent handlers causing double-open.)
        zone.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            input.click();
        }, true);

        // When file chosen -> show preview
        input.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            showPreview(file);
        });

        // Drag and drop
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('vm-dragover');
        });

        zone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            zone.classList.remove('vm-dragover');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('vm-dragover');

            const file = e.dataTransfer?.files?.[0];
            if (!file) return;

            // Put file into input (so user can cancel/reset consistently)
            try {
                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;
            } catch (_) {
                // Some browsers restrict programmatic assignment; still continue.
            }

            showPreview(file);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        wireUploadZone();

    // Result modal close handlers (existing modal; behavior-only)
    const okBtn = $('analysisResultOk');
    const closeBtn = $('analysisResultClose');
    const backdrop = $('analysisResultBackdrop');
    if (okBtn) okBtn.addEventListener('click', closeResultModal);
    if (closeBtn) closeBtn.addEventListener('click', closeResultModal);
    if (backdrop) backdrop.addEventListener('click', closeResultModal);
    });
})();
