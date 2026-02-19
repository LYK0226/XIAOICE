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
    function resolveVideoAccessLanguage() {
        const stored = localStorage.getItem('preferredLanguage');
        const candidate = stored || (typeof currentLanguage !== 'undefined' ? currentLanguage : 'zh-TW');
        const supported = ['zh-TW', 'zh-CN', 'en', 'ja'];
        if (candidate && supported.includes(candidate)) {
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
        const translations = window.translations && window.translations[lang] ? window.translations[lang] : {};
        
        // Try with video. prefix first, then without
        let template = translations[`video.${key}`] || translations[key] || key;
        
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
    let childSelectChangeHandler = null;
    
    async function loadChildren() {
        const select = $('childSelect');
        const warning = $('noChildWarning');
        const addBtn = $('addChildHintBtn');
        const ageDisplay = $('childAgeDisplay');
        if (!select) return;

        const previousValue = select.value;

        try {
            const res = await authedFetch('/api/children');
            const data = await res.json().catch(() => ({}));
            const children = data?.children || [];

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

            if (previousValue) {
                select.value = previousValue;
            }

            if (childSelectChangeHandler) {
                select.removeEventListener('change', childSelectChangeHandler);
            }
            childSelectChangeHandler = () => {
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
            };
            select.addEventListener('change', childSelectChangeHandler);

            if (select.value) {
                select.dispatchEvent(new Event('change'));
            }
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
    
    // Re-render child selector when language changes
    window.addEventListener('languageChanged', loadChildren);
    });
})();
