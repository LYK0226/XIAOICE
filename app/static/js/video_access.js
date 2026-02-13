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

    const videoAccessTranslations = {
        'zh-TW': {
            ok: '確定',
            analysisPreparing: '正在整理分析結果...',
            analysisHint: '即將顯示分析結果',
            errorFetchVideo: '無法取得影片詳情（HTTP {status}）',
            errorStartAnalysis: '無法開始分析（HTTP {status}）',
            errorTranscriptionFailed: '轉錄失敗，無法開始分析',
            statusTranscribing: '✅ 已上載成功！正在轉錄中...（{status}）',
            errorTranscriptionTimeout: '轉錄時間較長，請稍後再試',
            errorAnalysisFailed: '分析失敗，請稍後再試',
            statusAnalyzing: '✅ 已開始分析...（{status}）',
            errorAnalysisTimeout: '分析時間較長，請稍後再試',
            progressUploading: '上載中... {pct}%',
            errorUploadFailedHttp: '上載失敗（HTTP {status}）',
            successUploadPreparing: '上載成功！正在準備轉錄...',
            errorUploadGeneric: '上載錯誤，請重試',
            errorSelectChild: '⚠️ 請先選擇分析對象（兒童）再提交影片。',
            submitUploading: '<i class="fas fa-spinner fa-spin"></i> 上載中...',
            submitStart: '開始上載...',
            submitDone: '<i class="fas fa-check"></i> 已提交',
            errorMissingVideoId: '❌ 找不到影片 ID，請重試',
            analysisStarting: '正在啟動 AI 分析...',
            analysisStartFailed: '分析啟動失敗',
            submitRetry: '<i class="fas fa-cloud-upload-alt"></i> 重新提交',
            errorUploadRetry: '上載失敗，請重試',
            errorGeneric: '失敗',
            childPlaceholder: '— 請選擇兒童 —',
            childAgeMonths: '{months}個月',
            childAgeDetail: '年齡：{months} 個月（{years} 歲）',
            childLoadFailed: '⚠️ 無法載入兒童資料，請重新整理頁面。',
            reportStatusPending: '⏳ 排隊中...',
            reportStatusProcessing: '🔄 AI 正在分析影片...',
            reportQueryFailed: '查詢報告失敗',
            reportFailed: '分析失敗：{error}',
            reportProcessing: '分析中...',
            reportHint: '這可能需要 1-3 分鐘，取決於影片長度',
            reportTimeout: '⏰ 分析時間較長，請稍後在報告列表中查看結果。',
            reportTitle: '🧒 兒童發展影片分析報告',
            reportChildLabel: '兒童：',
            reportAgeLabel: '年齡：',
            reportSummaryTitle: '📋 綜合摘要',
            reportMotorTitle: '🏃 身體動作發展',
            reportLanguageTitle: '🗣️ 語言發展',
            reportConcerns: '關注事項：',
            reportRecommendations: '建議：',
            reportOverallRecommendations: '📌 整體建議',
            reportDownload: '下載完整報告（PDF）',
            reportKeep: '保留記錄',
            reportDiscard: '不保留記錄',
            reportDiscardConfirm: '確定不保留此記錄嗎？影片和分析結果將被永久刪除。',
            reportDiscarding: '<i class="fas fa-spinner fa-spin"></i> 刪除中...',
            reportDiscardFailed: '刪除失敗：{error}',
            reportDiscardFailedGeneric: '未知錯誤',
            reportDeleteVideoFailed: '刪除影片失敗',
            reportDeleteReportFailed: '刪除報告失敗',
            reportNoItems: '無',
            reportCompleted: '分析已完成',
            reportStatusTypical: '✅ 正常',
            reportStatusConcern: '⚠️ 需要關注',
            reportStatusNeedsAttention: '🔴 需要注意'
        },
        'zh-CN': {
            ok: '确定',
            analysisPreparing: '正在整理分析结果...',
            analysisHint: '即将显示分析结果',
            errorFetchVideo: '无法获取视频详情（HTTP {status}）',
            errorStartAnalysis: '无法开始分析（HTTP {status}）',
            errorTranscriptionFailed: '转录失败，无法开始分析',
            statusTranscribing: '✅ 已上传成功！正在转录中...（{status}）',
            errorTranscriptionTimeout: '转录时间较长，请稍后再试',
            errorAnalysisFailed: '分析失败，请稍后再试',
            statusAnalyzing: '✅ 已开始分析...（{status}）',
            errorAnalysisTimeout: '分析时间较长，请稍后再试',
            progressUploading: '上传中... {pct}%',
            errorUploadFailedHttp: '上传失败（HTTP {status}）',
            successUploadPreparing: '上传成功！正在准备转录...',
            errorUploadGeneric: '上传错误，请重试',
            errorSelectChild: '⚠️ 请先选择分析对象（儿童）再提交视频。',
            submitUploading: '<i class="fas fa-spinner fa-spin"></i> 上传中...',
            submitStart: '开始上传...',
            submitDone: '<i class="fas fa-check"></i> 已提交',
            errorMissingVideoId: '❌ 找不到视频 ID，请重试',
            analysisStarting: '正在启动 AI 分析...',
            analysisStartFailed: '分析启动失败',
            submitRetry: '<i class="fas fa-cloud-upload-alt"></i> 重新提交',
            errorUploadRetry: '上传失败，请重试',
            errorGeneric: '失败',
            childPlaceholder: '— 请选择儿童 —',
            childAgeMonths: '{months}个月',
            childAgeDetail: '年龄：{months} 个月（{years} 岁）',
            childLoadFailed: '⚠️ 无法加载儿童资料，请刷新页面。',
            reportStatusPending: '⏳ 排队中...',
            reportStatusProcessing: '🔄 AI 正在分析视频...',
            reportQueryFailed: '查询报告失败',
            reportFailed: '分析失败：{error}',
            reportProcessing: '分析中...',
            reportHint: '这可能需要 1-3 分钟，取决于视频长度',
            reportTimeout: '⏰ 分析时间较长，请稍后在报告列表中查看结果。',
            reportTitle: '🧒 儿童发展视频分析报告',
            reportChildLabel: '儿童：',
            reportAgeLabel: '年龄：',
            reportSummaryTitle: '📋 综合摘要',
            reportMotorTitle: '🏃 身体动作发展',
            reportLanguageTitle: '🗣️ 语言发展',
            reportConcerns: '关注事项：',
            reportRecommendations: '建议：',
            reportOverallRecommendations: '📌 整体建议',
            reportDownload: '下载完整报告（PDF）',
            reportKeep: '保留记录',
            reportDiscard: '不保留记录',
            reportDiscardConfirm: '确定不保留此记录吗？视频和分析结果将被永久删除。',
            reportDiscarding: '<i class="fas fa-spinner fa-spin"></i> 删除中...',
            reportDiscardFailed: '删除失败：{error}',
            reportDiscardFailedGeneric: '未知错误',
            reportDeleteVideoFailed: '删除视频失败',
            reportDeleteReportFailed: '删除报告失败',
            reportNoItems: '无',
            reportCompleted: '分析已完成',
            reportStatusTypical: '✅ 正常',
            reportStatusConcern: '⚠️ 需要关注',
            reportStatusNeedsAttention: '🔴 需要注意'
        },
        en: {
            ok: 'OK',
            analysisPreparing: 'Preparing analysis results...',
            analysisHint: 'Showing results shortly',
            errorFetchVideo: 'Unable to fetch video details (HTTP {status})',
            errorStartAnalysis: 'Unable to start analysis (HTTP {status})',
            errorTranscriptionFailed: 'Transcription failed, cannot start analysis',
            statusTranscribing: '✅ Upload complete! Transcribing... ({status})',
            errorTranscriptionTimeout: 'Transcription is taking longer. Please try again later.',
            errorAnalysisFailed: 'Analysis failed. Please try again later.',
            statusAnalyzing: '✅ Analysis started... ({status})',
            errorAnalysisTimeout: 'Analysis is taking longer. Please try again later.',
            progressUploading: 'Uploading... {pct}%',
            errorUploadFailedHttp: 'Upload failed (HTTP {status})',
            successUploadPreparing: 'Upload complete! Preparing transcription...',
            errorUploadGeneric: 'Upload error. Please retry.',
            errorSelectChild: '⚠️ Please select a child before submitting the video.',
            submitUploading: '<i class="fas fa-spinner fa-spin"></i> Uploading...',
            submitStart: 'Starting upload...',
            submitDone: '<i class="fas fa-check"></i> Submitted',
            errorMissingVideoId: '❌ Missing video ID. Please retry.',
            analysisStarting: 'Starting AI analysis...',
            analysisStartFailed: 'Failed to start analysis',
            submitRetry: '<i class="fas fa-cloud-upload-alt"></i> Retry Submit',
            errorUploadRetry: 'Upload failed. Please retry.',
            errorGeneric: 'Failed',
            childPlaceholder: '— Select a child —',
            childAgeMonths: '{months} months',
            childAgeDetail: 'Age: {months} months ({years} years)',
            childLoadFailed: '⚠️ Unable to load child profiles. Please refresh.',
            reportStatusPending: '⏳ In queue...',
            reportStatusProcessing: '🔄 AI is analyzing the video...',
            reportQueryFailed: 'Failed to fetch report',
            reportFailed: 'Analysis failed: {error}',
            reportProcessing: 'Analyzing...',
            reportHint: 'This may take 1-3 minutes depending on video length',
            reportTimeout: '⏰ Analysis is taking longer. Check the report list later.',
            reportTitle: '🧒 Child Development Video Report',
            reportChildLabel: 'Child: ',
            reportAgeLabel: 'Age: ',
            reportSummaryTitle: '📋 Summary',
            reportMotorTitle: '🏃 Motor Development',
            reportLanguageTitle: '🗣️ Language Development',
            reportConcerns: 'Concerns:',
            reportRecommendations: 'Recommendations:',
            reportOverallRecommendations: '📌 Overall Recommendations',
            reportDownload: 'Download Full Report (PDF)',
            reportKeep: 'Keep Record',
            reportDiscard: 'Discard Record',
            reportDiscardConfirm: 'Discard this record? The video and analysis will be permanently deleted.',
            reportDiscarding: '<i class="fas fa-spinner fa-spin"></i> Deleting...',
            reportDiscardFailed: 'Delete failed: {error}',
            reportDiscardFailedGeneric: 'Unknown error',
            reportDeleteVideoFailed: 'Failed to delete video',
            reportDeleteReportFailed: 'Failed to delete report',
            reportNoItems: 'None',
            reportCompleted: 'Analysis complete',
            reportStatusTypical: '✅ Typical',
            reportStatusConcern: '⚠️ Needs attention',
            reportStatusNeedsAttention: '🔴 Needs review'
        },
        ja: {
            ok: 'OK',
            analysisPreparing: '分析結果を準備中...',
            analysisHint: 'まもなく分析結果を表示します',
            errorFetchVideo: '動画の詳細を取得できませんでした（HTTP {status}）',
            errorStartAnalysis: '分析を開始できませんでした（HTTP {status}）',
            errorTranscriptionFailed: '文字起こしに失敗しました。分析を開始できません。',
            statusTranscribing: '✅ アップロード完了！文字起こし中...（{status}）',
            errorTranscriptionTimeout: '文字起こしに時間がかかっています。後でもう一度お試しください。',
            errorAnalysisFailed: '分析に失敗しました。後でもう一度お試しください。',
            statusAnalyzing: '✅ 分析開始...（{status}）',
            errorAnalysisTimeout: '分析に時間がかかっています。後でもう一度お試しください。',
            progressUploading: 'アップロード中... {pct}%',
            errorUploadFailedHttp: 'アップロードに失敗しました（HTTP {status}）',
            successUploadPreparing: 'アップロード完了！文字起こしを準備中...',
            errorUploadGeneric: 'アップロードエラー。再試行してください。',
            errorSelectChild: '⚠️ 動画を送信する前に子どもを選択してください。',
            submitUploading: '<i class="fas fa-spinner fa-spin"></i> アップロード中...',
            submitStart: 'アップロード開始...',
            submitDone: '<i class="fas fa-check"></i> 送信済み',
            errorMissingVideoId: '❌ 動画 ID が見つかりません。再試行してください。',
            analysisStarting: 'AI 分析を開始しています...',
            analysisStartFailed: '分析の開始に失敗しました',
            submitRetry: '<i class="fas fa-cloud-upload-alt"></i> 再送信',
            errorUploadRetry: 'アップロードに失敗しました。再試行してください。',
            errorGeneric: '失敗',
            childPlaceholder: '— 子どもを選択 —',
            childAgeMonths: '{months}ヶ月',
            childAgeDetail: '年齢：{months} ヶ月（{years} 歳）',
            childLoadFailed: '⚠️ 子ども情報を読み込めませんでした。再読み込みしてください。',
            reportStatusPending: '⏳ 待機中...',
            reportStatusProcessing: '🔄 AI が動画を分析中...',
            reportQueryFailed: 'レポートの取得に失敗しました',
            reportFailed: '分析に失敗しました：{error}',
            reportProcessing: '分析中...',
            reportHint: '動画の長さによって 1-3 分かかる場合があります',
            reportTimeout: '⏰ 分析に時間がかかっています。後でレポート一覧をご確認ください。',
            reportTitle: '🧒 児童発達動画分析レポート',
            reportChildLabel: 'お子様：',
            reportAgeLabel: '年齢：',
            reportSummaryTitle: '📋 総合概要',
            reportMotorTitle: '🏃 運動発達',
            reportLanguageTitle: '🗣️ 言語発達',
            reportConcerns: '懸念事項：',
            reportRecommendations: '提案：',
            reportOverallRecommendations: '📌 全体的な提案',
            reportDownload: '完全レポートをダウンロード（PDF）',
            reportKeep: '記録を保持',
            reportDiscard: '記録を破棄',
            reportDiscardConfirm: 'この記録を破棄しますか？動画と分析結果は完全に削除されます。',
            reportDiscarding: '<i class="fas fa-spinner fa-spin"></i> 削除中...',
            reportDiscardFailed: '削除に失敗しました：{error}',
            reportDiscardFailedGeneric: '不明なエラー',
            reportDeleteVideoFailed: '動画の削除に失敗しました',
            reportDeleteReportFailed: 'レポートの削除に失敗しました',
            reportNoItems: 'なし',
            reportCompleted: '分析が完了しました',
            reportStatusTypical: '✅ 正常',
            reportStatusConcern: '⚠️ 要注意',
            reportStatusNeedsAttention: '🔴 要確認'
        }
    };

    function resolveVideoAccessLanguage() {
        const stored = localStorage.getItem('preferredLanguage');
        const candidate = stored || (typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW');
        if (candidate && videoAccessTranslations[candidate]) {
            return candidate;
        }
        return 'en';
    }

    function formatTemplate(template, vars) {
        if (!vars) {
            return template;
        }
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            if (Object.prototype.hasOwnProperty.call(vars, key)) {
                return String(vars[key]);
            }
            return match;
        });
    }

    function t(key, vars) {
        const lang = resolveVideoAccessLanguage();
        const fallback = videoAccessTranslations.en[key] || key;
        const template = (videoAccessTranslations[lang] && videoAccessTranslations[lang][key]) || fallback;
        return formatTemplate(template, vars);
    }

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

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
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
        // Restore default footer with 確定 button
        const footer = document.querySelector('.analysis-result-modal__footer');
        if (footer) {
            footer.innerHTML = `<button type="button" class="btn btn-primary" id="analysisResultOk">${t('ok')}</button>`;
            const newOkBtn = document.getElementById('analysisResultOk');
            if (newOkBtn) newOkBtn.addEventListener('click', closeResultModal);
        }
    }

    async function showAnalysisResultWithDelay(html, { delayMs = 5000, animationText = t('analysisPreparing') } = {}) {
        const modal = $('analysisResultModal');
        const animationMarkup = `
            <div class="analysis-animation">
                <div class="analysis-animation__circle" aria-hidden="true"></div>
                <p>${escapeHtml(animationText)}</p>
                <span class="analysis-animation__hint">${escapeHtml(t('analysisHint'))}</span>
            </div>
        `;
        openResultModal(animationMarkup);
        await sleep(delayMs);
        if (!modal || modal.style.display === 'none') return;
        const body = $('analysisResultBody');
        if (body) body.innerHTML = html;
    }

    async function fetchVideoDetails(videoId) {
        const res = await authedFetch(`/api/video/${videoId}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.success) {
            throw new Error(payload?.error || payload?.message || t('errorFetchVideo', { status: res.status }));
        }
        return payload.video;
    }

    async function startAnalysis(videoId) {
        const res = await authedFetch(`/api/video/${videoId}/analyze`, { method: 'POST' });
        const payload = await res.json().catch(() => ({}));
        if (!(res.status === 202 || res.status === 200)) {
            throw new Error(payload?.error || payload?.message || t('errorStartAnalysis', { status: res.status }));
        }
        return payload;
    }

    async function waitForTranscription(videoId, { timeoutMs = 180000, intervalMs = 2000 } = {}) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const video = await fetchVideoDetails(videoId);
            const status = String(video?.transcription_status || '').toLowerCase();
            if (status === 'completed' && video?.full_transcription) return video;
            if (status === 'failed') throw new Error(t('errorTranscriptionFailed'));
            openResultModal(`<p>${escapeHtml(t('statusTranscribing', { status: video?.transcription_status || 'pending' }))}</p>`);
            await new Promise((r) => setTimeout(r, intervalMs));
        }
        throw new Error(t('errorTranscriptionTimeout'));
    }

    async function waitForReport(videoId, { timeoutMs = 180000, intervalMs = 2000 } = {}) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const video = await fetchVideoDetails(videoId);
            const status = String(video?.analysis_status || '').toLowerCase();
            if (status === 'completed' && video?.analysis_report) return video;
            if (status === 'failed') throw new Error(t('errorAnalysisFailed'));
            openResultModal(`<p>${escapeHtml(t('statusAnalyzing', { status: video?.analysis_status || 'processing' }))}</p>`);
            await new Promise((r) => setTimeout(r, intervalMs));
        }
        throw new Error(t('errorAnalysisTimeout'));
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
                setProgress(pct, t('progressUploading', { pct }));
            });

            xhr.addEventListener('load', () => {
                try {
                    const ok = xhr.status >= 200 && xhr.status < 300;
                    const payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
                    if (!ok) {
                        const msg = payload?.error || payload?.message || t('errorUploadFailedHttp', { status: xhr.status });
                        setProgress(100, msg);
                        reject(new Error(msg));
                        return;
                    }

                    setProgress(100, t('successUploadPreparing'));
                    resolve(payload);
                } catch (err) {
                    reject(err);
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error(t('errorUploadGeneric')));
            });

            xhr.open('POST', '/api/upload-video');
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
        });
    }

    function showPreview(file) {
        const zone = $('videoUploadZone');
        const hint = $('uploadHint');
        const previewArea = $('previewArea');
        const previewPlayer = $('previewPlayer');
        const previewMeta = $('previewMeta');
        const submitBtn = $('submitUploadBtn');
        const cancelBtn = $('cancelPreviewBtn');

        if (!previewArea || !previewPlayer || !previewMeta || !submitBtn || !cancelBtn) return;

        // Hide upload zone and hint to focus on preview/submission
        if (zone) zone.style.display = 'none';
        if (hint) hint.style.display = 'none';

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

            // Show upload zone and hint again
            if (zone) zone.style.display = 'flex';
            if (hint) hint.style.display = 'block';

            const input = $('videoModalInput');
            if (input) input.value = '';

            const progressDiv = $('uploadProgress');
            if (progressDiv) progressDiv.style.display = 'none';
        };

        // Replace any previous handler cleanly
        submitBtn.onclick = async () => {
            // --- Validate child selection ---
            const childSelect = $('childSelect');
            const selectedChildId = childSelect ? childSelect.value : '';
            if (!selectedChildId) {
                openResultModal(`<p style="color:#b00020;">${escapeHtml(t('errorSelectChild'))}</p>`);
                return;
            }

            // Immediate UI feedback
            setSubmitState(true, t('submitUploading'));
            setProgress(1, t('submitStart'));

            try {
                const uploadPayload = await uploadVideo(file);
                setSubmitState(false, t('submitDone'));

                const videoId = uploadPayload?.video_id;
                if (!videoId) {
                    openResultModal(`<p style="color:#b00020;">${t('errorMissingVideoId')}</p>`);
                    return;
                }

                // Start AI child-development analysis
                openResultModal(`<div class="analysis-animation"><div class="analysis-animation__circle" aria-hidden="true"></div><p>${escapeHtml(t('analysisStarting'))}</p></div>`);

                const analyzeRes = await authedFetch(`/api/video/${videoId}/child-analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ child_id: parseInt(selectedChildId) }),
                });
                const analyzePayload = await analyzeRes.json().catch(() => ({}));
                if (!analyzeRes.ok || !analyzePayload?.success) {
                    openResultModal(`<p style="color:#b00020;">❌ ${escapeHtml(analyzePayload?.error || t('analysisStartFailed'))}</p>`);
                    return;
                }

                const reportId = analyzePayload.report_id;

                // Poll for report completion
                await pollForReport(reportId, { videoId });

                const input = $('videoModalInput');
                if (input) input.value = '';

                // Reset UI state after successful process
                previewArea.style.display = 'none';
                if (zone) zone.style.display = 'flex';
                if (hint) hint.style.display = 'block';
                const progressDiv = $('uploadProgress');
                if (progressDiv) progressDiv.style.display = 'none';

            } catch (e) {
                setSubmitState(false, t('submitRetry'));
                setProgress(100, e?.message || t('errorUploadRetry'));
                openResultModal(`<p style="color:#b00020;">❌ ${escapeHtml(e?.message || t('errorGeneric'))}</p>`);
            }
        };
    }

    // ---------------------------------------------------------------
    //  Child Selector – loads children from /api/children
    // ---------------------------------------------------------------
    async function loadChildren() {
        const select = $('childSelect');
        const warning = $('noChildWarning');
        const addBtn = $('addChildHintBtn');
        const ageDisplay = $('childAgeDisplay');
        if (!select) return;

        try {
            const res = await authedFetch('/api/children');
            const data = await res.json().catch(() => ({}));
            const children = data?.children || [];

            // Clear existing options except placeholder
            select.innerHTML = `<option value="">${t('childPlaceholder')}</option>`;
            if (children.length === 0) {
                if (warning) warning.style.display = 'block';
                if (addBtn) addBtn.style.display = 'inline-flex';
                return;
            }
            if (warning) warning.style.display = 'none';
            if (addBtn) addBtn.style.display = 'none';

            children.forEach((child) => {
                const opt = document.createElement('option');
                opt.value = child.id;
                const ageMonths = child.age_months ? t('childAgeMonths', { months: child.age_months.toFixed(0) }) : '';
                opt.textContent = `${child.name}${ageMonths ? ' (' + ageMonths + ')' : ''}`;
                opt.dataset.ageMonths = child.age_months || 0;
                select.appendChild(opt);
            });

            select.addEventListener('change', () => {
                const selectedOpt = select.options[select.selectedIndex];
                if (ageDisplay && selectedOpt && selectedOpt.value) {
                    const age = parseFloat(selectedOpt.dataset.ageMonths || 0);
                    ageDisplay.textContent = t('childAgeDetail', {
                        months: age.toFixed(0),
                        years: (age / 12).toFixed(1)
                    });
                } else if (ageDisplay) {
                    ageDisplay.textContent = '';
                }
            });
        } catch (e) {
            console.error('Failed to load children:', e);
            if (warning) {
                warning.textContent = t('childLoadFailed');
                warning.style.display = 'block';
            }
        }
    }

    // ---------------------------------------------------------------
    //  Poll for analysis report completion
    // ---------------------------------------------------------------
    async function pollForReport(reportId, { timeoutMs = 600000, intervalMs = 3000, videoId = null } = {}) {
        const start = Date.now();
        const statusMessages = {
            pending: t('reportStatusPending'),
            processing: t('reportStatusProcessing')
        };

        while (Date.now() - start < timeoutMs) {
            const res = await authedFetch(`/api/video-analysis-report/${reportId}`);
            const payload = await res.json().catch(() => ({}));

            if (!res.ok) {
                openResultModal(`<p style="color:#b00020;">❌ ${escapeHtml(payload?.error || t('reportQueryFailed'))}</p>`);
                return;
            }

            const report = payload?.report;
            const status = (report?.status || '').toLowerCase();

            if (status === 'completed') {
                showReportResult(report, videoId);
                return;
            }

            if (status === 'failed') {
                openResultModal(`<p style="color:#b00020;">❌ ${escapeHtml(t('reportFailed', { error: report?.error_message || t('reportDiscardFailedGeneric') }))}</p>`);
                return;
            }

            // Still processing – update animation
            const msg = statusMessages[status] || t('reportProcessing');
            openResultModal(`
                <div class="analysis-animation">
                    <div class="analysis-animation__circle" aria-hidden="true"></div>
                    <p>${escapeHtml(msg)}</p>
                    <span class="analysis-animation__hint">${escapeHtml(t('reportHint'))}</span>
                </div>
            `);

            await sleep(intervalMs);
        }

        openResultModal(`<p style="color:#b00020;">${escapeHtml(t('reportTimeout'))}</p>`);
    }

    // ---------------------------------------------------------------
    //  Render completed report in modal
    // ---------------------------------------------------------------
    function showReportResult(report, videoId) {
        const motor = report?.motor_analysis || {};
        const language = report?.language_analysis || {};
        const overall = report?.overall_assessment || {};
        const recs = report?.recommendations || overall?.overall_recommendations || [];

        function statusBadge(s) {
            const colors = { TYPICAL: '#c6f6d5', CONCERN: '#fefcbf', NEEDS_ATTENTION: '#fed7d7' };
            const labels = {
                TYPICAL: t('reportStatusTypical'),
                CONCERN: t('reportStatusConcern'),
                NEEDS_ATTENTION: t('reportStatusNeedsAttention')
            };
            const bg = colors[s] || '#e2e8f0';
            const label = labels[s] || s || '—';
            return `<span style="background:${bg};padding:2px 10px;border-radius:12px;font-weight:bold;">${escapeHtml(label)}</span>`;
        }

        function listHtml(items) {
            if (!items || items.length === 0) return `<li>${escapeHtml(t('reportNoItems'))}</li>`;
            if (typeof items === 'string') return `<li>${escapeHtml(items)}</li>`;
            return items.map(i => `<li>${escapeHtml(i)}</li>`).join('');
        }

        const execSummary = overall?.executive_summary || t('reportCompleted');
        const motorSection = overall?.motor_development || motor;
        const langSection = overall?.language_development || language;
        const overallRecs = Array.isArray(recs) ? recs : (overall?.overall_recommendations || []);

                const ageText = t('childAgeMonths', {
                    months: report?.child_age_months?.toFixed(0) || '?'
                });

                const downloadBtn = report?.pdf_gcs_url
                        ? `<a href="/api/video-analysis-report/${report.report_id}/download" target="_blank" class="btn btn-primary" style="margin-top:12px;display:inline-block;text-decoration:none;">
                                 <i class="fas fa-download"></i> ${escapeHtml(t('reportDownload'))}
                             </a>`
            : '';

        const html = `
                <h3>${escapeHtml(t('reportTitle'))}</h3>
                <p><strong>${escapeHtml(t('reportChildLabel'))}</strong>${escapeHtml(report?.child_name || '')}
                    <strong style="margin-left:16px;">${escapeHtml(t('reportAgeLabel'))}</strong>${escapeHtml(ageText)}</p>

                <h4>${escapeHtml(t('reportSummaryTitle'))}</h4>
            <p>${escapeHtml(execSummary)}</p>

                <h4>${escapeHtml(t('reportMotorTitle'))} ${statusBadge(motorSection?.status)}</h4>
            <p>${escapeHtml(motorSection?.findings || '')}</p>
                ${motorSection?.concerns?.length ? '<p><strong>' + escapeHtml(t('reportConcerns')) + '</strong></p><ul>' + listHtml(motorSection.concerns) + '</ul>' : ''}
                ${motorSection?.recommendations?.length ? '<p><strong>' + escapeHtml(t('reportRecommendations')) + '</strong></p><ul>' + listHtml(motorSection.recommendations) + '</ul>' : ''}

                <h4>${escapeHtml(t('reportLanguageTitle'))} ${statusBadge(langSection?.status)}</h4>
            <p>${escapeHtml(langSection?.findings || '')}</p>
                ${langSection?.concerns?.length ? '<p><strong>' + escapeHtml(t('reportConcerns')) + '</strong></p><ul>' + listHtml(langSection.concerns) + '</ul>' : ''}
                ${langSection?.recommendations?.length ? '<p><strong>' + escapeHtml(t('reportRecommendations')) + '</strong></p><ul>' + listHtml(langSection.recommendations) + '</ul>' : ''}

                ${overallRecs.length ? '<h4>' + escapeHtml(t('reportOverallRecommendations')) + '</h4><ul>' + listHtml(overallRecs) + '</ul>' : ''}
            ${downloadBtn}
        `;

        openResultModal(html);

        if (!report?.pdf_gcs_url) {
            pollForPdf(report.report_id).catch(console.error);
        }

        // Replace footer "確定" button with keep/discard buttons
        const footer = document.querySelector('.analysis-result-modal__footer');
        if (footer) {
            footer.innerHTML = `
                <button id="keepReportBtn" class="btn btn-keep" style="padding:10px 28px;background:#48bb78;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:background 0.2s;">
                    <i class="fas fa-check"></i> ${escapeHtml(t('reportKeep'))}
                </button>
                <button id="discardReportBtn" class="btn btn-discard" style="padding:10px 28px;background:#e53e3e;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:background 0.2s;">
                    <i class="fas fa-trash-alt"></i> ${escapeHtml(t('reportDiscard'))}
                </button>
            `;
        }

        // Bind keep / discard buttons
        const keepBtn = document.getElementById('keepReportBtn');
        const discardBtn = document.getElementById('discardReportBtn');

        if (keepBtn) {
            keepBtn.addEventListener('click', () => {
                closeResultModal();
                // Refresh upload history
                if (window.videoUploadsManager) window.videoUploadsManager.loadUploads('video_assess');
            });
        }

        if (discardBtn) {
            discardBtn.addEventListener('click', async () => {
                    if (!confirm(t('reportDiscardConfirm'))) return;
                discardBtn.disabled = true;
                    discardBtn.innerHTML = t('reportDiscarding');
                try {
                    await discardVideoAndReport(videoId, report?.report_id);
                    closeResultModal();
                    if (window.videoUploadsManager) window.videoUploadsManager.loadUploads('video_assess');
                } catch (err) {
                        alert(t('reportDiscardFailed', { error: err.message || t('reportDiscardFailedGeneric') }));
                    discardBtn.disabled = false;
                        discardBtn.innerHTML = `<i class="fas fa-trash-alt"></i> ${escapeHtml(t('reportDiscard'))}`;
                }
            });
        }
    }

    async function pollForPdf(reportId, { timeoutMs = 300000, intervalMs = 2000 } = {}) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const res = await authedFetch(`/api/video-analysis-report/${reportId}`);
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) break;
            const report = payload?.report;
            if (report?.pdf_gcs_url) {
                                const downloadBtn = `<a href="/api/video-analysis-report/${report.report_id}/download" target="_blank" class="btn btn-primary" style="margin-top:12px;display:inline-block;text-decoration:none;">
                                         <i class="fas fa-download"></i> ${escapeHtml(t('reportDownload'))}
                                     </a>`;
                const body = $('analysisResultBody');
                if (body) {
                    const existingBtn = body.querySelector('.btn-primary[href*="download"]');
                    if (existingBtn) {
                        existingBtn.parentElement.innerHTML = downloadBtn;
                    } else {
                        const overallSection = body.querySelector('h4:last-of-type');
                        if (overallSection) {
                            overallSection.insertAdjacentHTML('afterend', downloadBtn);
                        } else {
                            body.innerHTML += downloadBtn;
                        }
                    }
                }
                return true;
            }
            await new Promise(r => setTimeout(r, intervalMs));
        }
        return false;
    }

    /**
     * Delete video record + analysis report + GCS files in one go.
     */
    async function discardVideoAndReport(videoId, reportId) {
        const token = localStorage.getItem('access_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Delete the video (cascades to report via backend)
        if (videoId) {
            const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE', headers });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || t('reportDeleteVideoFailed'));
            }
        } else if (reportId) {
            // Fallback: delete report only if we don't have videoId
            const res = await fetch(`/api/video-analysis-report/${reportId}`, { method: 'DELETE', headers });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || t('reportDeleteReportFailed'));
            }
        }
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
        loadChildren();  // Load child profiles for selection

    // Result modal close handlers (existing modal; behaviour-only)
    const okBtn = $('analysisResultOk');
    const closeBtn = $('analysisResultClose');
    const backdrop = $('analysisResultBackdrop');
    if (okBtn) okBtn.addEventListener('click', closeResultModal);
    if (closeBtn) closeBtn.addEventListener('click', closeResultModal);
    if (backdrop) backdrop.addEventListener('click', closeResultModal);
    });
})();
