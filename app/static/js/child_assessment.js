/**
 * Child Development Assessment Module
 * WS/T 580—2017 Standard (0-6 years old children)
 * 
 * Simplified text-based assessment without chatbot
 */

class ChildAssessmentModule {
    static assessmentData = null;
    static currentQuestionIndex = 0;
    static assessmentAnswers = {};
    
    /**
     * Start new assessment
     */
    static startNewAssessment(childName, childAge, pdfFile, assessmentType) {
        if (!childName || !childAge) {
            alert('請填寫兒童姓名和年齡');
            return;
        }
        
        this.assessmentData = {
            childName: childName,
            childAge: childAge,
            assessmentType: assessmentType,
            timestamp: new Date().toISOString()
        };
        
        this.assessmentAnswers = {};
        this.currentQuestionIndex = 0;
        
        // Hide start screen and show assessment screen
        const startScreen = document.getElementById('startScreen');
        const assessmentScreen = document.getElementById('assessmentScreen');
        
        if (startScreen) startScreen.style.display = 'none';
        if (assessmentScreen) {
            assessmentScreen.style.display = 'flex';
            assessmentScreen.style.justifyContent = 'center';
            assessmentScreen.style.width = '100%';
        }
        
        // Load assessment questions
        this.loadQuestions();
    }
    
    /**
     * Get assessment type label
     */
    static getAssessmentTypeLabel(type) {
        const types = {
            'gross_motor_0_6': '大運動評估 (0-6個月)',
            'gross_motor_6_12': '大運動評估 (6-12個月)',
            'fine_motor_12_24': '精細動作評估 (12-24個月)',
            'language_12_24': '語言發展評估 (12-24個月)',
            'social_24_36': '社交能力評估 (24-36個月)',
            'cognitive_36_48': '認知發展評估 (36-48個月)',
            'general': '常規評估',
            'motion': '肢體動作評估',
            'speech': '言語發展評估',
            'comprehensive': '綜合評估'
        };
        return types[type] || '常規評估';
    }
    
    /**
     * Load assessment questions from database
     */
    static loadQuestions() {
        let questions = [];
        
        // 從評估題庫加載題目
        if (typeof AssessmentQuestions !== 'undefined' && AssessmentQuestions[this.assessmentData.assessmentType]) {
            questions = AssessmentQuestions[this.assessmentData.assessmentType];
        } else {
            // 如果沒有找到，使用默認10題
            questions = this.getDefaultQuestions();
        }
        
        this.displayQuestion(questions[0]);
    }
    
    /**
     * Get default 10 questions
     */
    static getDefaultQuestions() {
        return [
            { id: 1, domain: '大運動', emoji: '🐻', question: '兒童能否舉起雙手？', description: '觀察兒童是否能將雙手舉起到頭部上方。', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
            { id: 2, domain: '精細動作', emoji: '🐻', question: '兒童能否拍手？', description: '觀察兒童是否能雙手合掌拍打。', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
            { id: 3, domain: '大運動', emoji: '🐻', question: '兒童能否踢腿？', description: '觀察兒童是否能抬起一隻腿做踢腿動作。', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
            { id: 4, domain: '精細動作', emoji: '🐻', question: '兒童能否揮手？', description: '觀察兒童是否能做出揮手告別的動作。', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
            { id: 5, domain: '大運動', emoji: '🐻', question: '兒童能否蹲下？', description: '觀察兒童是否能從站立姿勢蹲下。', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
            { id: 6, domain: '大運動', emoji: '🐻', question: '兒童能否跳躍？', description: '觀察兒童是否能雙腳離地跳躍。', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
            { id: 7, domain: '精細動作', emoji: '🐻', question: '兒童能否轉圈？', description: '觀察兒童是否能原地轉一圈。', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
            { id: 8, domain: '大運動', emoji: '🐻', question: '兒童能否單腳站立？', description: '觀察兒童是否能單腳站立幾秒。', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
            { id: 9, domain: '精細動作', emoji: '🐻', question: '兒童能否摸頭？', description: '觀察兒童是否能用手摸自己的頭。', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
            { id: 10, domain: '大運動', emoji: '🐻', question: '兒童能否走直線？', description: '觀察兒童是否能沿著直線走路。', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' }
        ];
    }
    
    /**
     * Display a question with video demo and Can/Cannot buttons
     */
    static displayQuestion(question) {
        const total = 10; // 改為10題
        const current = this.currentQuestionIndex + 1;
        const progress = (current / total) * 100;
        
        document.getElementById('progressFill').style.width = progress + '%';
        
        let html = `
            <div class="question-card">
                <div class="question-badge-row">
                    <div class="question-domain-badge">
                        <span>${question.emoji}</span>
                        <span>${question.domain}</span>
                    </div>
                    <div class="question-count-badge">
                        ${current} / ${total}
                    </div>
                </div>
                
                <div class="question-main-content">
                    <h3>${question.question}</h3>
                    
                    <div class="video-frame-container">
                        <video 
                            id="demoVideo"
                            class="demo-video"
                            controls 
                            autoplay
                            loop
                            muted
                        >
                            <source src="${question.videoUrl}" type="video/mp4">
                            您的瀏覽器不支持視頻播放。
                        </video>
                    </div>
                    
                    <div class="desc-info-box">
                        <h4>📋 評估說明</h4>
                        <p>${question.description}</p>
                    </div>
                    
                    <div class="action-options">
                        <p class="action-title">您的孩子能做到這個動作嗎？</p>
                        <div class="assessment-btns">
                            <button 
                                class="action-btn can"
                                onclick="ChildAssessmentModule.recordAnswer(${question.id}, 'yes')">
                                <i class="fas fa-check-circle"></i>
                                <span>做到</span>
                            </button>
                            <button 
                                class="action-btn cannot"
                                onclick="ChildAssessmentModule.recordAnswer(${question.id}, 'no')">
                                <i class="fas fa-times-circle"></i>
                                <span>做不到</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('assessmentContent').innerHTML = html;
    }
    
    /**
     * Record answer (Can do / Cannot do)
     */
    static recordAnswer(questionId, answer) {
        // Save answer
        this.assessmentAnswers[questionId] = answer;
        
        // Pause video
        const video = document.getElementById('demoVideo');
        if (video) {
            video.pause();
        }
        
        // Move to next question
        this.currentQuestionIndex++;
        this.nextQuestion();
    }
    
    /**
     * Move to next question
     */
    static nextQuestion() {
        
        // Load next question or finish
        if (this.currentQuestionIndex < 10) {
            // 從題庫或默認題目加載
            let questions = [];
            if (typeof AssessmentQuestions !== 'undefined' && AssessmentQuestions[this.assessmentData.assessmentType]) {
                questions = AssessmentQuestions[this.assessmentData.assessmentType];
            } else {
                questions = this.getDefaultQuestions();
            }
            this.displayQuestion(questions[this.currentQuestionIndex]);
        } else {
            // Show submit button
            document.getElementById('submitBtn').style.display = 'inline-block';
            document.getElementById('assessmentContent').innerHTML = `
                <div class="question-card finished-card">
                    <div class="finished-icon">🎉</div>
                    <h3>評估已完成！</h3>
                    <p>您已經完成了所有 10 個項目的評估。現在可以查看您的孩子的發育商 (DQ) 報告了。</p>
                    <div class="finished-info">
                        <span>已作答: 10 / 10 題</span>
                    </div>
                </div>
            `;
        }
    }
    
    /**
     * Submit assessment
     */
    static submitAssessment() {
        if (this.currentQuestionIndex < 5) {
            this.nextQuestion();
            return;
        }
        
        console.log('提交評估:', this.assessmentAnswers);
        
        // Calculate DQ based on correct answers (100 point scale)
        const totalQuestions = 10;
        const yesCount = Object.values(this.assessmentAnswers).filter(a => a === 'yes').length;
        const dq = (yesCount / totalQuestions) * 100;
        const level = dq >= 90 ? '優異' : dq >= 80 ? '良好' : dq >= 70 ? '中等' : dq >= 60 ? '及格' : '需要關注';
        
        this.showResults(dq, level);
    }
    
    /**
     * Show assessment results
     */
    static showResults(dq, level) {
        // Calculate score based on answers (10 questions)
        const totalQuestions = 10;
        const yesCount = Object.values(this.assessmentAnswers).filter(a => a === 'yes').length;
        const percentage = (yesCount / totalQuestions) * 100;
        
        const resultsHtml = `
            <div class="question-card results-view">
                <h2 class="results-main-title">📊 評估診斷報告</h2>
                
                <div class="score-display-card">
                    <div class="dq-score">${dq.toFixed(0)}</div>
                    <div class="dq-label">發育商 (DQ)</div>
                    <div class="level-badge">${level}</div>
                </div>
                
                <div class="results-grid">
                    <div class="result-info-item">
                        <span class="label">兒童姓名</span>
                        <span class="value">${this.assessmentData.childName}</span>
                    </div>
                    <div class="result-info-item">
                        <span class="label">年齡</span>
                        <span class="value">${this.assessmentData.childAge} 個月</span>
                    </div>
                    <div class="result-info-item">
                        <span class="label">評估類型</span>
                        <span class="value">${this.getAssessmentTypeLabel(this.assessmentData.assessmentType)}</span>
                    </div>
                    <div class="result-info-item">
                        <span class="label">完成率</span>
                        <span class="value">${percentage.toFixed(0)}% (${yesCount}/${totalQuestions})</span>
                    </div>
                </div>

                <div class="results-summary-box">
                    <h4>💡 專業建議與說明</h4>
                    <div class="summary-content">
                        <p>根據本次評估，您的孩子在<strong>${this.getAssessmentTypeLabel(this.assessmentData.assessmentType)}</strong>領域的表現為<strong>${level}</strong>。</p>
                        <div class="dq-scale-info">
                            <div class="scale-item"><span class="range">90-100</span> <span class="tag excellent">優異</span></div>
                            <div class="scale-item"><span class="range">80-89</span> <span class="tag good">良好</span></div>
                            <div class="scale-item"><span class="range">70-79</span> <span class="tag normal">中等</span></div>
                            <div class="scale-item"><span class="range">60-69</span> <span class="tag fair">及格</span></div>
                            <div class="scale-item"><span class="range">&lt; 60</span> <span class="tag concern">關注</span></div>
                        </div>
                    </div>
                </div>

                <div class="result-actions">
                    <button class="result-btn primary" onclick="ChildAssessmentModule.exportResults()">
                        <i class="fas fa-file-export"></i> 導出報告
                    </button>
                    <button class="result-btn secondary" onclick="ChildAssessmentModule.reset()">
                        <i class="fas fa-undo"></i> 重新評估
                    </button>
                </div>
            </div>
        `;
        
        const assessmentContent = document.getElementById('assessmentContent');
        if (assessmentContent) {
            assessmentContent.innerHTML = resultsHtml;
        }
        
        // Hide progress bar
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) progressBar.style.display = 'none';
        
        // Hide submit button if visible
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.style.display = 'none';
    }
    
    /**
     * Export assessment results
     */
    static exportResults() {
        const data = {
            childName: this.assessmentData.childName,
            childAge: this.assessmentData.childAge,
            assessmentType: this.assessmentData.assessmentType,
            timestamp: this.assessmentData.timestamp,
            answers: this.assessmentAnswers
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assessment_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    /**
     * Reset module
     */
    static reset() {
        this.assessmentData = null;
        this.currentQuestionIndex = 0;
        this.assessmentAnswers = {};
        
        // Reset UI
        const startScreen = document.getElementById('startScreen');
        const assessmentScreen = document.getElementById('assessmentScreen');
        
        if (startScreen) startScreen.style.display = 'block';
        if (assessmentScreen) assessmentScreen.style.display = 'none';
        
        // Reset progress bar
        const progressFill = document.getElementById('progressFill');
        if (progressFill) progressFill.style.width = '0%';
        
        // Clear assessment content
        const assessmentContent = document.getElementById('assessmentContent');
        if (assessmentContent) assessmentContent.innerHTML = '';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Assessment module initialized');
});
