// Auth check
if (!localStorage.getItem('access_token')) {
	window.location.href = '/login';
}

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
	body.classList.add('dark-theme');
	if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}

if (themeToggle) {
	themeToggle.addEventListener('click', () => {
		body.classList.toggle('dark-theme');
		const isDark = body.classList.contains('dark-theme');
		themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	});
}

// 3D Pose Detection System with Multi-Person Support
let poseDetector3D = null;
let multiPersonSelector = null; // Multi-person click-to-select manager
let movementDetector = null;
let movementDescriptor = null;
let poseRenderer = null;
let videoStream = null;
let animationFrameId = null;
let isDetecting = false;

// Multi-person detection mode
let useMultiPersonMode = true; // Enable multi-person click-to-select

// Detection info (stats)
let lastFrameTimestamp = 0;
let smoothedFps = 0;

// UI Elements
const videoElement = document.getElementById('poseVideo');
const canvasElement = document.getElementById('poseCanvas');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const selectionStatus = document.getElementById('selectionStatus');
const selectionStatusText = document.getElementById('selectionStatusText');
const videoWrapper = document.getElementById('videoWrapper');
const currentActionValue = document.getElementById('currentActionValue');
const detectionModeValue = document.getElementById('detectionModeValue');
const detectedPersonCountValue = document.getElementById('detectedPersonCountValue');
const trackedPersonValue = document.getElementById('trackedPersonValue');
const trackingDistanceValue = document.getElementById('trackingDistanceValue');
const fpsValue = document.getElementById('fpsValue');
const frameTimeValue = document.getElementById('frameTimeValue');
const errorContainer = document.getElementById('errorContainer');

// Assessment UI Elements
const testProgressValue = document.getElementById('testProgressValue');
const testScoreValue = document.getElementById('testScoreValue');
const testHint = document.getElementById('testHint');
const startTestBtn = document.getElementById('startTestBtn');
const skipTestBtn = document.getElementById('skipTestBtn');
const resetTestBtn = document.getElementById('resetTestBtn');

// Current Test Action Card Elements
const currentTestActionContent = document.getElementById('currentTestActionContent');
const testActionIcon = document.getElementById('testActionIcon');
const testActionName = document.getElementById('testActionName');
const testActionInstruction = document.getElementById('testActionInstruction');

// Assessment (5-action test) state
const ASSESSMENT_STEPS = [
	{
		key: 'right_hand_up',
		nameZh: '右手舉起',
		instruction: '只舉起右手，保持 1.5 秒。',
		type: 'hold_any',
		// Note: action IDs are mirrored for webcam view; this ID corresponds to 右手
		actionIds: ['left_hand_raised'],
		holdMs: 1500
	},
	{
		key: 'left_hand_up',
		nameZh: '左手舉起',
		instruction: '只舉起左手，保持 1.5 秒。',
		type: 'hold_any',
		// Note: action IDs are mirrored for webcam view; this ID corresponds to 左手
		actionIds: ['right_hand_raised'],
		holdMs: 1500
	},
    {
		key: 'both_hands_up',
		nameZh: '雙手舉起',
		instruction: '雙手同時舉起，保持 1.5 秒。',
		type: 'hold_any',
		actionIds: ['both_hands_raised'],
		holdMs: 1500
	},
	{
		key: 'left_leg_stand',
		nameZh: '左腳單腳站立',
		instruction: '抬起左腳（單腳站立），保持 2 秒。',
		type: 'hold_any',
		// Note: action IDs are mirrored for webcam view; this ID corresponds to 左腳
		actionIds: ['right_leg_raised'],
		holdMs: 2000
	},
	{
		key: 'right_leg_stand',
		nameZh: '右腳單腳站立',
		instruction: '抬起右腳（單腳站立），保持 2 秒。',
		type: 'hold_any',
		// Note: action IDs are mirrored for webcam view; this ID corresponds to 右腳
		actionIds: ['left_leg_raised'],
		holdMs: 2000
	},
	{
		key: 'jumping_jack',
		nameZh: '開合跳',
		instruction: '做開合跳 3 下（張開 → 合上算 1 下）。',
		type: 'rep_single',
		actionId: 'jumping_jack',
		repsTarget: 3
	},
	{
		key: 'high_knees',
		nameZh: '高抬腿',
		instruction: '左右腳輪流高抬腿，共 6 下（左右交替計數）。',
		type: 'rep_alternating',
		leftActionId: 'left_leg_raised',
		rightActionId: 'right_leg_raised',
		repsTarget: 6
	},
	{
		key: 'bend_left',
		nameZh: '向左彎腰',
		instruction: '身體向左側彎，保持 1.5 秒。',
		type: 'hold_any',
		// Note: action IDs are mirrored for webcam view
		actionIds: ['leaning_left'],
		holdMs: 1500
	},
	{
		key: 'bend_right',
		nameZh: '向右彎腰',
		instruction: '身體向右側彎，保持 1.5 秒。',
		type: 'hold_any',
		// Note: action IDs are mirrored for webcam view
		actionIds: ['leaning_right'],
		holdMs: 1500
	},
	{
		key: 'squat',
		nameZh: '深蹲',
		instruction: '做深蹲 3 下（蹲下 → 起身算 1 下）。',
		type: 'rep_single',
		actionId: 'squatting',
		repsTarget: 3
	}
];

const assessmentState = {
	running: false,
	completed: new Array(ASSESSMENT_STEPS.length).fill(false),
	score: 0,
	stepIndex: 0,
	stepHoldMs: 0,
	stepReps: 0,
	prevActive: false,
	lastCountedSide: null,
	finished: false,
	lastFrameTs: null,
	hasTrackedPerson: false,
	lastMode: '—',
	backendRunId: null,
	submitting: false,
	justCompletedStep: null
};

// Capture a structured test run that can be stored/scored by backend
const poseAssessmentRunState = {
	runStartedAtMs: null,
	stepStartedAtMs: null,
	steps: []
};

function _getAuthHeaders(contentType = null) {
	const headers = {};
	const accessToken = localStorage.getItem('access_token');
	if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
	if (contentType) headers['Content-Type'] = contentType;
	return headers;
}

async function submitPoseAssessmentRun(payload) {
	try {
		assessmentState.submitting = true;
		const response = await fetch('/api/pose-assessment/runs', {
			method: 'POST',
			headers: _getAuthHeaders('application/json'),
			body: JSON.stringify(payload)
		});

		if (response.status === 401 || response.status === 422) {
			localStorage.removeItem('access_token');
			localStorage.removeItem('refresh_token');
			window.location.href = '/login';
			return null;
		}

		const data = await response.json().catch(() => ({}));
		if (!response.ok) {
			console.error('Failed to submit pose assessment run:', data);
			return null;
		}

		// If evaluation exists, show it immediately
		if (data.run && data.run.evaluation) {
			await renderEvaluation(data.run.evaluation);
		} else {
			await renderEvaluation(buildLocalEvaluationFallback());
		}

		return data.run || null;
	} catch (e) {
		console.error('Error submitting pose assessment run:', e);
		return null;
	} finally {
		assessmentState.submitting = false;
	}
}

// Fetch child information to display in the report
async function fetchChildInfo() {
	try {
		const response = await fetch('/api/child-assessment/history', {
			method: 'GET',
			headers: _getAuthHeaders()
		});
		if (!response.ok) return null;
		const data = await response.json().catch(() => ({}));
		if (data.assessments && data.assessments.length > 0) {
			return data.assessments[0]; // Return the latest one
		}
	} catch (e) {
		console.warn('Failed to fetch child info:', e);
	}
	return null;
}

function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function escapeHtmlWithLineBreaks(value) {
	return escapeHtml(value).replaceAll('\n', '<br>');
}

// Render evaluation summary and details into the UI
async function renderEvaluation(evaluation) {
	if (!evaluation) return;
	
	const panel = document.getElementById('evaluationPanel');
	const showReportBtn = document.getElementById('showReportBtn');
	const clearBtn = document.getElementById('clearEvalBtn');
	const modalBody = document.getElementById('modalBody');

	if (!panel || !showReportBtn || !modalBody) return;

	// Show the evaluation panel (which now only contains "Show Report" and "Clear" buttons)
	panel.style.display = 'block';

	// Fetch child info for the report cards
	const childInfo = await fetchChildInfo();
	
	let assessmentType = '大運動評估 (動態)';
	if (childInfo && childInfo.child_age_months) {
		const age = childInfo.child_age_months;
		if (age <= 12) assessmentType = '大運動評估 (6-12個月)';
		else if (age <= 24) assessmentType = '大運動評估 (12-24個月)';
		else assessmentType = '大運動評估 (2歲以上)';
	}
	
	// Calculate DQ score
	const s = evaluation.score || {completed:0, total: ASSESSMENT_STEPS.length, percent:0};
	const dqScore = s.percent || 0;

	const recommendations = Array.isArray(evaluation.recommendations) ? evaluation.recommendations : [];
	let suggestionItems = recommendations
		.filter(Boolean)
		.slice(0, 6)
		.map(r => `<li>${escapeHtml(r)}</li>`)
		.join('');

	if (!suggestionItems) {
		const fallback = [];
		fallback.push('確認鏡頭能完整拍到頭、手與腳，避免遮擋。');
		fallback.push('光線充足且背景乾淨，提升偵測穩定度。');
		fallback.push('動作放慢一點、幅度做完整，系統更容易判斷。');
		if (dqScore < 70) fallback.push('先練習保持類動作（hold），再進行重複類動作（rep）。');
		if (dqScore < 50) fallback.push('將鏡頭距離拉遠一點，讓全身都在畫面內。');
		suggestionItems = fallback.slice(0, 6).map(t => `<li>${escapeHtml(t)}</li>`).join('');
	}
	
	// Create badge based on score
	let badgeText = '優異';
	let badgeColor = '#4caf50';
	if (dqScore >= 90) { badgeText = '優異'; badgeColor = '#4caf50'; }
	else if (dqScore >= 80) { badgeText = '良好'; badgeColor = '#8bc34a'; }
	else if (dqScore >= 70) { badgeText = '中等'; badgeColor = '#ffc107'; }
	else if (dqScore >= 60) { badgeText = '及格'; badgeColor = '#ff9800'; }
	else { badgeText = '需注意'; badgeColor = '#f44336'; }

	// Generate dynamic summary based on score
	let dynamicSummary = '';
	if (dqScore >= 90) {
		dynamicSummary = '您的孩子在大運動發展方面表現優異，動作協調性和平衡感都非常出色。繼續保持這種活躍的生活方式，將有助於全面的發育。';
	} else if (dqScore >= 80) {
		dynamicSummary = '您的孩子在大運動發展方面表現良好，基本動作掌握得不錯。建議繼續練習一些複雜的動作，以進一步提升協調能力。';
	} else if (dqScore >= 70) {
		dynamicSummary = '您的孩子在大運動發展方面表現中等，一些動作需要更多練習。建議增加日常運動時間，並注意動作的正確性。';
	} else if (dqScore >= 60) {
		dynamicSummary = '您的孩子在大運動發展方面表現及格，但還有進步空間。建議從基礎動作開始練習，並尋求專業指導。';
	} else {
		dynamicSummary = '您的孩子在大運動發展方面需要特別關注，建議及早進行專業評估和訓練，以幫助改善動作協調和身體發育。';
	}

	const FALLBACK_SUMMARY_ZH = '測驗已完成。若完整評語尚未生成，請稍候或稍後重整頁面查看。';
	const summaryText = (evaluation.summaryZh && String(evaluation.summaryZh).trim() && evaluation.summaryZh !== FALLBACK_SUMMARY_ZH)
		? String(evaluation.summaryZh)
		: dynamicSummary;

	// Prepare the Report Content HTML matching the image style
	let reportHtml = `
		<div class="report-score-card">
			<div class="report-dq-value">${dqScore}</div>
			<div class="report-dq-label">發育商 (DQ)</div>
			<div class="report-badge">${badgeText}</div>
		</div>

		<div class="report-grid">
			<div class="report-grid-card">
				<div class="report-card-label">評估類型</div>
				<div class="report-card-value">${assessmentType}</div>
			</div>
			<div class="report-grid-card">
				<div class="report-card-label">完成率</div>
				<div class="report-card-value">${dqScore}% (${s.completed}/${s.total})</div>
			</div>
		</div>

		<div class="report-advice-section">
			<div class="report-advice-title">💡 專業建議與說明</div>
			<div class="report-advice-text">
				${escapeHtmlWithLineBreaks(summaryText)}
			</div>
			<div style="margin-top: 12px; background: rgba(255,255,255,0.7); border-radius: 14px; padding: 12px 14px; border: 1px solid rgba(0,0,0,0.04);">
				<div style="font-weight: 800; color: #3d2e52; margin-bottom: 8px;">建議你可以這樣做</div>
				<ul style="margin: 0; padding-left: 18px; color: #6b5a86; line-height: 1.6;">
					${suggestionItems}
				</ul>
			</div>
			<div class="report-legend">
				<span class="legend-item" style="background:#4caf50;">90-100 優異</span>
				<span class="legend-item" style="background:#8bc34a;">80-89 良好</span>
				<span class="legend-item" style="background:#ffc107;">70-79 中等</span>
				<span class="legend-item" style="background:#ff9800;">60-69 及格</span>
				<span class="legend-item" style="background:#f44336;">&lt;60 需注意</span>
			</div>
		</div>
	`;

	// Add detailed steps if available (optional, but good for completeness)
	if (evaluation.steps && evaluation.steps.length > 0) {
		reportHtml += `
			<div style="margin-top: 24px; padding: 0 10px;">
				<div style="font-size: 18px; font-weight: 800; color: #3d2e52; margin-bottom: 16px;">動作執行詳情</div>
				<div style="display: flex; flex-direction: column; gap: 12px;">
		`;
		for (const p of evaluation.steps) {
			const passed = p.passed;
			reportHtml += `
				<div style="background: white; padding: 16px; border-radius: 16px; display: flex; align-items: center; justify-content: space-between; border: 1px solid rgba(0,0,0,0.03);">
					<div>
						<div style="font-weight: 700; color: #3d2e52;">${p.nameZh || p.key}</div>
						<div style="font-size: 13px; color: #9b8ab8;">${p.notes && p.notes.length ? p.notes[0] : '正常執行'}</div>
					</div>
					<div style="color: ${passed ? '#4caf50' : '#f44336'}; font-weight: 800; font-size: 15px;">
						${passed ? '● 通過' : '○ 未通過'}
					</div>
				</div>
			`;
		}
		reportHtml += `</div></div>`;
	}

	modalBody.innerHTML = reportHtml;

	// Button handlers
	showReportBtn.onclick = () => {
		openEvaluationModal();
	};

	if (clearBtn) {
		clearBtn.onclick = async () => {
			if (!confirm('確定要刪除上一筆評估紀錄嗎？此動作無法復原。')) return;
			try {
				const resp = await fetch('/api/pose-assessment/runs/latest', {
					method: 'DELETE',
					headers: _getAuthHeaders()
				});
				const data = await resp.json().catch(() => ({}));
				if (resp.ok && data.deleted) {
					panel.style.display = 'none';
					closeEvaluationModal();
					if (testHint) testHint.textContent = '已清除先前紀錄';
				} else {
					alert('清除失敗：' + (data.message || data.error || '請稍後再試'));
				}
			} catch (e) {
				console.error('Error deleting latest run:', e);
				alert('清除失敗，請重試');
			}
		};
	}
}

function buildLocalEvaluationFallback() {
	const total = ASSESSMENT_STEPS.length;
	const completed = assessmentState.completed.filter(Boolean).length;
	const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

	const steps = (poseAssessmentRunState.steps || []).map((s) => ({
		key: s.key,
		nameZh: s.nameZh,
		status: s.status,
		passed: s.status === 'completed',
		notes: s.status === 'completed' ? ['動作已完成（本機紀錄）'] : ['此動作已跳過（本機紀錄）'],
		advice: s.status === 'completed' ? [] : ['可重做此動作以獲得更完整評估'],
		target: s.target || {},
		achieved: s.achieved || {},
		durationMs: s.durationMs
	}));

	return {
		score: { completed, total, percent },
		level: null,
		// Keep empty so UI uses dynamic, score-based summary immediately.
		summaryZh: '',
		steps,
		recommendations: [],
		failures: steps.filter(p => !p.passed).map(p => p.key || p.nameZh),
		evaluatedAt: new Date().toISOString()
	};
}

// Fetch latest run on load and render evaluation if present
async function fetchLatestPoseAssessmentRun() {
	try {
		const response = await fetch('/api/pose-assessment/runs/latest', {
			method: 'GET',
			headers: _getAuthHeaders()
		});

		if (!response.ok) return;
		const data = await response.json().catch(() => ({}));
		if (data.run && data.run.evaluation) {
			await renderEvaluation(data.run.evaluation);
		}
	} catch (e) {
		console.warn('Failed to fetch latest pose assessment run:', e);
	}
}

// Call fetchLatestPoseAssessmentRun after page init
window.addEventListener('load', () => {
	setTimeout(fetchLatestPoseAssessmentRun, 600);
});

function resetAssessmentState({ keepDetection = true } = {}) {
	assessmentState.running = false;
	assessmentState.completed = new Array(ASSESSMENT_STEPS.length).fill(false);
	assessmentState.score = 0;
	assessmentState.stepIndex = 0;
	assessmentState.stepHoldMs = 0;
	assessmentState.stepReps = 0;
	assessmentState.prevActive = false;
	assessmentState.lastCountedSide = null;
	assessmentState.finished = false;
	assessmentState.lastFrameTs = null;
	assessmentState.backendRunId = null;
	assessmentState.submitting = false;
	assessmentState.justCompletedStep = null;

	poseAssessmentRunState.runStartedAtMs = null;
	poseAssessmentRunState.stepStartedAtMs = null;
	poseAssessmentRunState.steps = [];

	if (!keepDetection) {
		assessmentState.hasTrackedPerson = false;
		assessmentState.lastMode = '—';
	}

	updateAssessmentUI();
}

function canStartAssessment() {
	// We only analyze when tracking a selected person
	return Boolean(isDetecting && assessmentState.hasTrackedPerson);
}

function getCurrentStep() {
	return ASSESSMENT_STEPS[assessmentState.stepIndex] || null;
}

function formatScoreText() {
	return `${assessmentState.score} / ${ASSESSMENT_STEPS.length}`;
}

function updateAssessmentUI() {
	const step = getCurrentStep();
	const total = ASSESSMENT_STEPS.length;
	const progressText = assessmentState.finished
		? `完成 ${total} / ${total}`
		: `第 ${Math.min(assessmentState.stepIndex + 1, total)} 項 / ${total}`;

	if (testProgressValue) testProgressValue.textContent = progressText;
	if (testScoreValue) testScoreValue.textContent = formatScoreText();

	if (assessmentState.finished) {
		if (testHint) testHint.textContent = '測驗完成。可以按「重設」再做一次。';
	} else if (!step) {
		if (testHint) testHint.textContent = '—';
	} else {
		let detail = step.instruction;
		if (assessmentState.running) {
			if (step.type.startsWith('hold')) {
				detail += `（已保持 ${(assessmentState.stepHoldMs / 1000).toFixed(1)}s）`;
			} else if (step.type.startsWith('rep')) {
				detail += `（${assessmentState.stepReps} / ${step.repsTarget}）`;
			}
		}

		if (testHint) {
			if (!isDetecting) {
				testHint.textContent = '先點「開始檢測」開攝影機。';
			} else if (!assessmentState.hasTrackedPerson) {
				testHint.textContent = '點擊畫面選擇要追蹤的人，先鎖定追蹤對象。';
			} else if (!assessmentState.running) {
				testHint.textContent = `準備好就按「開始測驗」。${step.instruction}`;
			} else {
				testHint.textContent = detail;
			}
		}
	}

	if (startTestBtn) startTestBtn.disabled = !canStartAssessment() || assessmentState.running || assessmentState.finished;
	if (skipTestBtn) skipTestBtn.disabled = !assessmentState.running || assessmentState.finished;
	if (resetTestBtn) resetTestBtn.disabled = !isDetecting;

	// Update Current Test Action Card
	updateCurrentTestActionCard();
}

function updateCurrentTestActionCard() {
	const step = getCurrentStep();

	if (assessmentState.finished) {
		if (testActionIcon) testActionIcon.textContent = '✅';
		if (testActionName) testActionName.textContent = '測驗完成';
		if (testActionInstruction) testActionInstruction.textContent = '恭喜！所有動作都完成了';
	} else if (assessmentState.justCompletedStep) {
		// Show completion feedback for just completed step
		if (testActionIcon) testActionIcon.textContent = '✅';
		if (testActionName) testActionName.textContent = `${assessmentState.justCompletedStep.nameZh} 完成`;
		if (testActionInstruction) testActionInstruction.textContent = '做得好！準備下一個動作...';
	} else if (!step) {
		if (testActionIcon) testActionIcon.textContent = '🎯';
		if (testActionName) testActionName.textContent = '—';
		if (testActionInstruction) testActionInstruction.textContent = '請先開始測驗';
	} else {
		// Set icon based on action type
		let icon = '🎯';
		if (step.key === 'both_hands_up') icon = '🙌';
		else if (step.key === 'left_hand_up') icon = '🤚';
		else if (step.key === 'right_hand_up') icon = '✋';
		else if (step.key === 'left_leg_stand') icon = '🦵';
		else if (step.key === 'right_leg_stand') icon = '🦵';
		else if (step.key === 'jumping_jack') icon = '⭐';
		else if (step.key === 'high_knees') icon = '🏃';
		else if (step.key === 'bend_left') icon = '↙️';
		else if (step.key === 'bend_right') icon = '↘️';
		else if (step.key === 'squat') icon = '🏋️';

		if (testActionIcon) testActionIcon.textContent = icon;
		if (testActionName) testActionName.textContent = step.nameZh;

		let instruction = step.instruction;
		if (assessmentState.running) {
			if (step.type.startsWith('hold')) {
				const remaining = Math.max(0, (step.holdMs - assessmentState.stepHoldMs) / 1000);
				instruction = `保持 ${(remaining).toFixed(1)} 秒`;
			} else if (step.type.startsWith('rep')) {
				instruction = `完成 ${assessmentState.stepReps} / ${step.repsTarget} 次`;
			}
		}

		if (testActionInstruction) testActionInstruction.textContent = instruction;
	}
}

function startAssessment() {
	if (!canStartAssessment()) {
		updateAssessmentUI();
		return;
	}
	if (assessmentState.finished) {
		resetAssessmentState();
	}
	assessmentState.running = true;
	assessmentState.lastFrameTs = performance.now();
	assessmentState.stepHoldMs = 0;
	assessmentState.stepReps = 0;
	assessmentState.prevActive = false;
	assessmentState.lastCountedSide = null;
	assessmentState.backendRunId = null;
	assessmentState.submitting = false;

	poseAssessmentRunState.runStartedAtMs = Date.now();
	poseAssessmentRunState.stepStartedAtMs = Date.now();
	poseAssessmentRunState.steps = [];
	updateAssessmentUI();
}

function recordCurrentStepResult(status) {
	const step = getCurrentStep();
	if (!step) return;

	const now = Date.now();
	const startedAt = poseAssessmentRunState.stepStartedAtMs || now;
	const durationMs = Math.max(0, now - startedAt);

	const target = {};
	const achieved = {};

	if (step.type.startsWith('hold')) {
		target.holdMs = step.holdMs;
		achieved.holdMs = Math.round(assessmentState.stepHoldMs);
	} else if (step.type.startsWith('rep')) {
		target.repsTarget = step.repsTarget;
		achieved.reps = assessmentState.stepReps;
	}

	poseAssessmentRunState.steps.push({
		key: step.key,
		nameZh: step.nameZh,
		type: step.type,
		status,
		target,
		achieved,
		durationMs
	});

	poseAssessmentRunState.stepStartedAtMs = Date.now();
}

function completeCurrentStep() {
	const step = getCurrentStep();
	if (!step) return;

	recordCurrentStepResult('completed');

	assessmentState.completed[assessmentState.stepIndex] = true;
	assessmentState.score = assessmentState.completed.filter(Boolean).length;

	// Set just completed step for visual feedback
	assessmentState.justCompletedStep = step;

	// Clear the just completed step after 2 seconds
	setTimeout(() => {
		assessmentState.justCompletedStep = null;
		updateCurrentTestActionCard();
	}, 2000);

	// Move to next step
	assessmentState.stepIndex += 1;
	assessmentState.stepHoldMs = 0;
	assessmentState.stepReps = 0;
	assessmentState.prevActive = false;
	assessmentState.lastCountedSide = null;

	if (assessmentState.stepIndex >= ASSESSMENT_STEPS.length) {
		assessmentState.finished = true;
		assessmentState.running = false;

		// Ensure the report button is available immediately after completion
		renderEvaluation(buildLocalEvaluationFallback());

		// Submit run to backend for scoring/storage
		if (!assessmentState.submitting) {
			const payload = {
				source: 'pose_detection',
				runStartedAt: new Date(poseAssessmentRunState.runStartedAtMs || Date.now()).toISOString(),
				runEndedAt: new Date().toISOString(),
				steps: poseAssessmentRunState.steps,
				clientScore: {
					completed: assessmentState.score,
					total: ASSESSMENT_STEPS.length
				}
			};
			submitPoseAssessmentRun(payload).then((run) => {
				if (!run) return;
				assessmentState.backendRunId = run.run_id;
				if (testHint && run.evaluation && run.evaluation.summaryZh) {
					testHint.textContent = `測驗完成。後端評語：${run.evaluation.summaryZh}`;
				}
			});
		}
	}

	updateAssessmentUI();
}

function skipCurrentStep() {
	const step = getCurrentStep();
	if (!step) return;

	recordCurrentStepResult('skipped');

	// Don't mark as completed (no score increase)
	assessmentState.completed[assessmentState.stepIndex] = false;

	// Move to next step
	assessmentState.stepIndex += 1;
	assessmentState.stepHoldMs = 0;
	assessmentState.stepReps = 0;
	assessmentState.prevActive = false;
	assessmentState.lastCountedSide = null;

	if (assessmentState.stepIndex >= ASSESSMENT_STEPS.length) {
		assessmentState.finished = true;
		assessmentState.running = false;

		// Ensure the report button is available immediately after completion
		renderEvaluation(buildLocalEvaluationFallback());

		// Submit run to backend for scoring/storage
		if (!assessmentState.submitting) {
			const payload = {
				source: 'pose_detection',
				runStartedAt: new Date(poseAssessmentRunState.runStartedAtMs || Date.now()).toISOString(),
				runEndedAt: new Date().toISOString(),
				steps: poseAssessmentRunState.steps,
				clientScore: {
					completed: assessmentState.score,
					total: ASSESSMENT_STEPS.length
				}
			};
			submitPoseAssessmentRun(payload).then((run) => {
				if (!run) return;
				assessmentState.backendRunId = run.run_id;
				if (testHint && run.evaluation && run.evaluation.summaryZh) {
					testHint.textContent = `測驗完成。後端評語：${run.evaluation.summaryZh}`;
				}
			});
		}
	}

	updateAssessmentUI();
}

function updateAssessmentFromActions(actions, nowTs) {
	if (!assessmentState.running || assessmentState.finished) return;

	const step = getCurrentStep();
	if (!step) return;

	if (assessmentState.lastFrameTs == null) {
		assessmentState.lastFrameTs = nowTs;
		return;
	}

	const dt = Math.max(0, nowTs - assessmentState.lastFrameTs);
	assessmentState.lastFrameTs = nowTs;

	const activeIds = new Set((actions || []).map(a => a.id));

	if (step.type === 'hold_any') {
		const isActive = step.actionIds.some(id => activeIds.has(id));
		if (isActive) {
			assessmentState.stepHoldMs += dt;
			if (assessmentState.stepHoldMs >= step.holdMs) {
				completeCurrentStep();
				return;
			}
		} else {
			assessmentState.stepHoldMs = 0;
		}
	} else if (step.type === 'rep_single') {
		const isActive = activeIds.has(step.actionId);
		if (isActive && !assessmentState.prevActive) {
			assessmentState.stepReps += 1;
			if (assessmentState.stepReps >= step.repsTarget) {
				completeCurrentStep();
				return;
			}
		}
		assessmentState.prevActive = isActive;
	} else if (step.type === 'rep_alternating') {
		const leftActive = activeIds.has(step.leftActionId);
		const rightActive = activeIds.has(step.rightActionId);
		const side = leftActive ? 'left' : (rightActive ? 'right' : null);
		const isActive = Boolean(side);

		// Count only on rising edge and only if side alternates
		if (isActive && !assessmentState.prevActive) {
			if (!assessmentState.lastCountedSide || assessmentState.lastCountedSide !== side) {
				assessmentState.stepReps += 1;
				assessmentState.lastCountedSide = side;
				if (assessmentState.stepReps >= step.repsTarget) {
					completeCurrentStep();
					return;
				}
			}
		}

		assessmentState.prevActive = isActive;
	}

	// Refresh UI at a reasonable rate; cheap enough per frame
	updateAssessmentUI();
}

function setDetectionInfo({
	modeText = '—',
	personCountText = '—',
	trackedPersonText = '—',
	trackingDistanceText = '—',
	fpsText = '—',
	frameTimeText = '—'
} = {}) {
	if (detectionModeValue) detectionModeValue.textContent = modeText;
	if (detectedPersonCountValue) detectedPersonCountValue.textContent = personCountText;
	if (trackedPersonValue) trackedPersonValue.textContent = trackedPersonText;
	if (trackingDistanceValue) trackingDistanceValue.textContent = trackingDistanceText;
	if (fpsValue) fpsValue.textContent = fpsText;
	if (frameTimeValue) frameTimeValue.textContent = frameTimeText;
}

// Current action display updates (1Hz)
// Store actions detected in the last second: [{text, timestamp}, ...]
let recentActionsBuffer = [];
let currentActionIntervalId = null;

function setCurrentActionText(text) {
	if (!currentActionValue) return;
	currentActionValue.textContent = text || '—';
	currentActionValue.className = 'status-value' + (text && text !== '—' ? ' active' : ' inactive');
}

function addToRecentActions(actionText) {
	if (!actionText || actionText === '—') return;
	recentActionsBuffer.push({ text: actionText, timestamp: Date.now() });
}

function getRecentActionsDisplay() {
	const now = Date.now();
	// Filter to only keep actions from the last 1 second
	recentActionsBuffer = recentActionsBuffer.filter(a => now - a.timestamp < 1000);

	if (recentActionsBuffer.length === 0) {
		return '—';
	}

	// Get unique action texts (avoid duplicates in the same second)
	const uniqueActions = [...new Set(recentActionsBuffer.map(a => a.text))];
	return uniqueActions.join(' ');
}

function startCurrentActionTimer() {
	if (currentActionIntervalId) return;
	currentActionIntervalId = setInterval(() => {
		setCurrentActionText(getRecentActionsDisplay());
	}, 1000);
}

function stopCurrentActionTimer() {
	if (!currentActionIntervalId) return;
	clearInterval(currentActionIntervalId);
	currentActionIntervalId = null;
}

function clearRecentActionsBuffer() {
	recentActionsBuffer = [];
}

// Initialize 3D pose detection system with multi-person support
async function initializePoseSystem() {
	try {
		console.log('🚀 Initializing 3D pose detection system with multi-person support...');

		// Initialize PoseDetector3D with optimized settings for real-time
		poseDetector3D = new PoseDetector3D({
			modelComplexity: 1, // Use medium model for better tracking during rapid movements
			smoothLandmarks: false, // Disable smoothing to prevent lag during jumping jacks
			minDetectionConfidence: 0.5,
			minTrackingConfidence: 0.3, // Lower threshold to maintain tracking during fast movements
			refineFaceLandmarks: false // Disable for better performance
		});
		await poseDetector3D.initialize();

		// Initialize MultiPersonSelector for click-to-select functionality
		multiPersonSelector = new MultiPersonSelector({
			maxPersons: 2,
			selectionColor: '#0088ff', // Blue for selection mode
			lockedColor: '#00ff00', // Green for tracking mode
			boundingBoxPadding: 25,
			trackingThreshold: 0.25 // Max distance for centroid tracking
		});

		// Initialize MovementDetector with fixed action detection
		movementDetector = new MovementDetector({
			confidenceThreshold: 0.5,
			enableSmoothing: true,
			smoothingFrames: 2, // Reduced from 3 to 2 for faster response during jumping jacks
			language: 'zh'
		});

		// Initialize MovementDescriptorGenerator
		movementDescriptor = new MovementDescriptorGenerator({
			language: 'zh',
			showIcon: true
		});

		// Initialize PoseRenderer
		poseRenderer = new PoseRenderer();

		console.log('✅ 3D pose detection system initialized with multi-person support');
		return true;
	} catch (error) {
		console.error('❌ Failed to initialize pose system:', error);
		showError('初始化失敗', error.message || '無法載入姿態檢測模型');
		return false;
	}
}

// Start camera and detection
async function startDetection() {
	try {
		videoWrapper.classList.add('loading');

		// Initialize system if not already done
		if (!poseDetector3D) {
			const success = await initializePoseSystem();
			if (!success) {
				throw new Error('Failed to initialize pose detection system');
			}
		}

		// Request camera access with optimized resolution for real-time
		videoStream = await navigator.mediaDevices.getUserMedia({
			video: {
				width: { ideal: 640 },
				height: { ideal: 480 },
				facingMode: 'user',
				frameRate: { ideal: 30 }
			}
		});

		videoElement.srcObject = videoStream;
		await videoElement.play();

		// Function to sync canvas size and position with video
		function syncCanvasWithVideo() {
			// Get the actual displayed size of the video element
			const videoRect = videoElement.getBoundingClientRect();
			const wrapperRect = videoWrapper.getBoundingClientRect();

			// Set canvas internal resolution to match video intrinsic size (fallback to element size if metadata missing)
			const intrinsicVideoWidth = videoElement.videoWidth || videoRect.width;
			const intrinsicVideoHeight = videoElement.videoHeight || videoRect.height;
			canvasElement.width = intrinsicVideoWidth;
			canvasElement.height = intrinsicVideoHeight;

			// Adjust the overlay to follow the actual displayed video content inside the element
			let displayWidth = videoRect.width;
			let displayHeight = videoRect.height;
			let offsetX = 0;
			let offsetY = 0;

			if (intrinsicVideoWidth && intrinsicVideoHeight && videoRect.width && videoRect.height) {
				const videoAspect = intrinsicVideoWidth / intrinsicVideoHeight;
				const elementAspect = videoRect.width / videoRect.height;
				if (videoAspect > elementAspect) {
					// Video is wider than the container: letterbox top/bottom
					displayHeight = videoRect.width / videoAspect;
					offsetY = (videoRect.height - displayHeight) / 2;
				} else {
					// Video is taller than the container: letterbox left/right
					displayWidth = videoRect.height * videoAspect;
					offsetX = (videoRect.width - displayWidth) / 2;
				}
			}

			canvasElement.style.width = `${displayWidth}px`;
			canvasElement.style.height = `${displayHeight}px`;
			canvasElement.style.left = `${Math.round(videoRect.left - wrapperRect.left + offsetX)}px`;
			canvasElement.style.top = `${Math.round(videoRect.top - wrapperRect.top + offsetY)}px`;
		}

		// Initial sync
		syncCanvasWithVideo();

		// Add resize handler to keep canvas in sync
		const resizeObserver = new ResizeObserver(() => {
			syncCanvasWithVideo();
		});
		resizeObserver.observe(videoWrapper);
		resizeObserver.observe(videoElement);

		// Store observer for cleanup
		window.canvasResizeObserver = resizeObserver;

		// Attach multi-person selector click handler to canvas
		if (multiPersonSelector && useMultiPersonMode) {
			multiPersonSelector.attachToCanvas(canvasElement, (personIndex, person) => {
				console.log(`🎯 Person ${personIndex + 1} selected for tracking`);
				updateSelectionStatus(true, personIndex + 1);

				// Immediately allow starting the assessment after selection.
				// The detection loop will keep this in sync, but this removes the need
				// to click "重設" just to refresh the UI.
				assessmentState.hasTrackedPerson = true;
				updateAssessmentUI();
			});

			// Show selection status
			selectionStatus.style.display = 'flex';
			updateSelectionStatus(false);
		}

		// Start detection loop
		isDetecting = true;
		// Reset assessment but keep any detection-agnostic state
		resetAssessmentState({ keepDetection: true });
		detectLoop();

		// Start 1Hz current-action UI refresh
		clearRecentActionsBuffer();
		startCurrentActionTimer();

		// Update UI
		startBtn.style.display = 'none';
		stopBtn.style.display = 'flex';
		if (useMultiPersonMode) {
			resetBtn.style.display = 'flex';
		}
		videoWrapper.classList.remove('loading');
		videoWrapper.classList.add('active');
		setCurrentActionText('—');
		setDetectionInfo({
			modeText: useMultiPersonMode ? '選擇中' : '偵測中',
			personCountText: '—',
			trackedPersonText: '—',
			trackingDistanceText: '—',
			fpsText: '—',
			frameTimeText: '—'
		});
		errorContainer.classList.remove('show');

		console.log('▶️ Detection started with multi-person support');
	} catch (error) {
		console.error('❌ Failed to start detection:', error);
		videoWrapper.classList.remove('loading');
		setCurrentActionText('—');
		setDetectionInfo({
			modeText: '未開始',
			personCountText: '—',
			trackedPersonText: '—',
			trackingDistanceText: '—',
			fpsText: '—',
			frameTimeText: '—'
		});

		if (error.name === 'NotAllowedError') {
			showError('攝影機權限被拒絕', '請允許訪問攝影機以使用姿態檢測功能');
		} else {
			showError('啟動失敗', error.message || '無法啟動攝影機');
		}
	}
}

// Update selection status UI
function updateSelectionStatus(isTracking, personNumber = null) {
	if (isTracking && personNumber) {
		selectionStatus.classList.add('tracking');
		selectionStatusText.textContent = `正在追蹤第 ${personNumber} 人`;
		resetBtn.style.display = 'flex';
	} else {
		selectionStatus.classList.remove('tracking');
		selectionStatusText.textContent = '點擊畫面選擇要追蹤的人';
		// Keep reset button visible if we were tracking before
	}
}

// Reset person selection
function resetSelection() {
	if (multiPersonSelector) {
		multiPersonSelector.reset();
		updateSelectionStatus(false);
		clearRecentActionsBuffer();
		setCurrentActionText('—');

		// Reset assessment since tracking target is cleared
		assessmentState.hasTrackedPerson = false;
		resetAssessmentState({ keepDetection: true });

		setDetectionInfo({
			modeText: '選擇中',
			trackedPersonText: '—',
			trackingDistanceText: '—'
		});

		// Clear movement history for fresh start
		if (movementDetector) {
			movementDetector.clearHistory();
		}

		console.log('🔄 Person selection reset - click to select again');
	}
}

// Stop detection
function stopDetection() {
	isDetecting = false;

	stopCurrentActionTimer();
	clearRecentActionsBuffer();

	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}

	// Cleanup resize observer
	if (window.canvasResizeObserver) {
		window.canvasResizeObserver.disconnect();
		window.canvasResizeObserver = null;
	}

	if (videoStream) {
		videoStream.getTracks().forEach(track => track.stop());
		videoStream = null;
	}

	if (videoElement.srcObject) {
		videoElement.srcObject = null;
	}

	// Cleanup multi-person selector
	if (multiPersonSelector) {
		multiPersonSelector.detachFromCanvas();
		multiPersonSelector.reset();
	}

	// Clear canvas
	const ctx = canvasElement.getContext('2d');
	ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

	// Update UI
	startBtn.style.display = 'flex';
	stopBtn.style.display = 'none';
	resetBtn.style.display = 'none';
	selectionStatus.style.display = 'none';
	videoWrapper.classList.remove('active');
	setCurrentActionText('—');
	setDetectionInfo({
		modeText: '未開始',
		personCountText: '—',
		trackedPersonText: '—',
		trackingDistanceText: '—',
		fpsText: '—',
		frameTimeText: '—'
	});

	lastFrameTimestamp = 0;
	smoothedFps = 0;

	resetAssessmentState({ keepDetection: false });

	console.log('⏹️ Detection stopped');
}

// Main detection loop with multi-person support
async function detectLoop() {
	if (!isDetecting) return;

	try {
		const nowTs = performance.now();
		const startTime = performance.now();

		// Detect 3D pose (single person from Holistic)
		const poseResults = await poseDetector3D.detectPose(videoElement);

		// Clear canvas for fresh render
		const ctx = canvasElement.getContext('2d');
		ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

		if (poseResults.detected && poseResults.keypoints.length > 0) {
			// Wrap single detection as array for multi-person selector
			// Note: Holistic only detects one person, but this structure supports future multi-person
			const allPersonsKeypoints = [poseResults.keypoints];

			// Process through multi-person selector
			const selectionResult = multiPersonSelector.processDetectedPersons(allPersonsKeypoints);

			// Update detection info card
			const personCount = selectionResult.persons ? selectionResult.persons.length : 0;
			let modeText = '—';
			if (selectionResult.mode === 'tracking') modeText = '追蹤中';
			else if (selectionResult.mode === 'selection') modeText = '選擇中';
			else if (selectionResult.mode === 'no-detection') modeText = '未偵測到人';

			const trackedText = selectionResult.selectedIndex >= 0 ? `第 ${selectionResult.selectedIndex + 1} 人` : '—';
			const distanceText = (selectionResult.mode === 'tracking' && typeof selectionResult.trackingDistance === 'number')
				? selectionResult.trackingDistance.toFixed(3)
				: '—';

			// FPS / frame time
			const now = performance.now();
			if (lastFrameTimestamp > 0) {
				const dt = now - lastFrameTimestamp;
				if (dt > 0) {
					const instFps = 1000 / dt;
					smoothedFps = smoothedFps ? (smoothedFps * 0.9 + instFps * 0.1) : instFps;
				}
			}
			lastFrameTimestamp = now;

			// Draw selection UI (bounding boxes)
			multiPersonSelector.drawSelectionUI(ctx, canvasElement.width, canvasElement.height, selectionResult);

			// Determine which keypoints to use for analysis
			let keypointsForAnalysis = null;
			let shouldAnalyze = false;

			if (selectionResult.mode === 'tracking' && selectionResult.selectedPerson) {
				// Tracking mode: Use selected person's keypoints
				keypointsForAnalysis = selectionResult.selectedPerson.keypoints;
				shouldAnalyze = true;

				assessmentState.hasTrackedPerson = true;
				assessmentState.lastMode = 'tracking';

				// Render only the tracked person's landmarks (in green)
				poseRenderer.render({
					...poseResults,
					keypoints: keypointsForAnalysis
				}, canvasElement, { highlightColor: '#00ff00' });
			} else if (selectionResult.mode === 'selection') {
				// Selection mode: Render all detected persons with lighter styling
				poseRenderer.render(poseResults, canvasElement, { opacity: 0.6 });
				// Don't analyze movements until a person is selected
				shouldAnalyze = false;

				assessmentState.hasTrackedPerson = false;
				assessmentState.lastMode = 'selection';
			}

			// Only analyze movements when tracking a specific person
			if (shouldAnalyze && keypointsForAnalysis) {
				// Detect fixed actions
				const detectionResult = movementDetector.detectMovements(keypointsForAnalysis);
				const actions = detectionResult.actions || [];

				// Log actions to history (they are already filtered and displayed)
				if (actions.length > 0) {
					const primaryAction = actions[0];
					addToRecentActions(`${primaryAction.icon} ${primaryAction.nameZh || primaryAction.name}`);
				}

				// Update assessment scoring from current actions
				updateAssessmentFromActions(actions, nowTs);
			} else {
				// Not tracking a person; keep assessment UI accurate
				updateAssessmentUI();
			}

			const processingTime = performance.now() - startTime;
			setDetectionInfo({
				modeText,
				personCountText: String(personCount),
				trackedPersonText: trackedText,
				trackingDistanceText: distanceText,
				fpsText: smoothedFps ? smoothedFps.toFixed(1) : '—',
				frameTimeText: `${processingTime.toFixed(1)}ms`
			});
		}

		const processingTime = performance.now() - startTime;
		console.debug(`⏱️ Frame processed in ${processingTime.toFixed(1)}ms`);
	} catch (error) {
		console.error('❌ Error in detection loop:', error);
	}

	// Continue loop
	animationFrameId = requestAnimationFrame(detectLoop);
}

// Show error
function showError(title, message) {
	const errorTitle = document.getElementById('errorTitle');
	const errorMessage = document.getElementById('errorMessage');

	if (errorTitle) errorTitle.textContent = title;
	if (errorMessage) errorMessage.textContent = message;
	errorContainer.classList.add('show');
}

// Modal control functions
function openEvaluationModal() {
	const modal = document.getElementById('modalOverlay');
	if (modal) {
		modal.style.display = 'flex';
		document.body.style.overflow = 'hidden';
	}
}

function closeEvaluationModal() {
	const modal = document.getElementById('modalOverlay');
	if (modal) {
		modal.style.display = 'none';
		document.body.style.overflow = '';
	}
}

// Event listeners
startBtn.addEventListener('click', startDetection);
stopBtn.addEventListener('click', stopDetection);
resetBtn.addEventListener('click', resetSelection);

if (startTestBtn) startTestBtn.addEventListener('click', startAssessment);
if (skipTestBtn) skipTestBtn.addEventListener('click', skipCurrentStep);
if (resetTestBtn) resetTestBtn.addEventListener('click', () => resetAssessmentState({ keepDetection: true }));

// Modal event listeners
const closeModalBtn = document.getElementById('closeModalBtn');
const modalOverlay = document.getElementById('modalOverlay');

if (closeModalBtn) {
	closeModalBtn.addEventListener('click', closeEvaluationModal);
}

if (modalOverlay) {
	modalOverlay.addEventListener('click', (e) => {
		if (e.target === modalOverlay) {
			closeEvaluationModal();
		}
	});
}

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape') {
		closeEvaluationModal();
	}
});

// Init assessment UI
updateAssessmentUI();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
	stopDetection();
	if (poseDetector3D) {
		poseDetector3D.close();
	}
	if (multiPersonSelector) {
		multiPersonSelector.destroy();
	}
	if (movementDetector) {
		movementDetector.destroy();
	}
});

console.log('✅ 3D pose detection page loaded with multi-person click-to-select support and fixed action detection');
