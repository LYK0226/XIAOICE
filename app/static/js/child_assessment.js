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
        if (assessmentScreen) assessmentScreen.style.display = 'block';
        
        // Update header
        const titleEl = document.getElementById('assessmentTitle');
        const infoEl = document.getElementById('assessmentInfo');
        
        if (titleEl) {
            titleEl.textContent = `評估進行中 - ${childName} (${childAge}個月)`;
        }
        if (infoEl) {
            infoEl.textContent = `評估類型: ${this.getAssessmentTypeLabel(assessmentType)}`;
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
            <div class="question-container">
                <h3>
                    <span style="color: #667eea;">${question.emoji} ${question.domain}</span>
                </h3>
                <p style="font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #4A3B5C;">
                    問題 ${current}/${total}: ${question.question}
                </p>
                
                <!-- 視頻示範區域 -->
                <div style="background: #f5f7fa; padding: 20px; border-radius: 15px; margin-bottom: 20px;">
                    <h4 style="margin-bottom: 15px; color: #4A3B5C;">
                        🎬 觀看熊熊示範影片
                    </h4>
                    <video 
                        id="demoVideo"
                        controls 
                        autoplay
                        loop
                        style="width: 100%; max-width: 600px; border-radius: 10px; display: block; margin: 0 auto;"
                    >
                        <source src="${question.videoUrl}" type="video/mp4">
                        您的瀏覽器不支持視頻播放。
                    </video>
                </div>
                
                <div style="background: #e8f0f7; padding: 15px; border-radius: 10px; margin-bottom: 25px;">
                    <p style="margin: 0; color: #666; font-size: 14px;">
                        <strong>📋 評估說明:</strong> ${question.description}
                    </p>
                </div>
                
                <!-- 做到/做不到按鈕 -->
                <div style="text-align: center;">
                    <p style="font-size: 18px; font-weight: 600; margin-bottom: 20px; color: #4A3B5C;">
                        您的孩子能做到這個動作嗎？
                    </p>
                    <div class="answer-buttons">
                        <button 
                            class="answer-btn can-do-btn"
                            onclick="ChildAssessmentModule.recordAnswer(${question.id}, 'yes')">
                            <i class="fas fa-check-circle"></i>
                            <span>✔ 做到</span>
                        </button>
                        <button 
                            class="answer-btn cannot-do-btn"
                            onclick="ChildAssessmentModule.recordAnswer(${question.id}, 'no')">
                            <i class="fas fa-times-circle"></i>
                            <span>✖ 做不到</span>
                        </button>
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
                <div class="question-container" style="background: #e8f5e9; border-left-color: #4caf50; text-align: center;">
                    <h3 style="color: #2e7d32; margin-bottom: 10px;">✓ 評估完成</h3>
                    <p style="color: #2e7d32; margin: 0;">所有問題已回答。請點擊下方按鈕提交評估。</p>
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
            <div class="question-container" style="text-align: center;">
                <h2 style="color: #4A3B5C; margin-bottom: 20px;">📊 評估結果</h2>
                
                <div style="background: linear-gradient(135deg, #8B7AA8, #9B8AB8); color: white; border-radius: 20px; padding: 40px; margin: 20px 0;">
                    <div style="font-size: 72px; font-weight: 700; margin-bottom: 10px;">${dq.toFixed(0)}</div>
                    <div style="font-size: 24px; margin-bottom: 10px;">發育商 (DQ)</div>
                    <div style="font-size: 18px; opacity: 0.9;">等級: ${level}</div>
                </div>
                
                <div style="background: #f5f7fa; padding: 25px; border-radius: 15px; margin: 20px 0; text-align: left;">
                    <h3 style="margin-bottom: 15px; color: #4A3B5C;">📋 評估詳情</h3>
                    <p style="margin: 8px 0;"><strong>兒童姓名:</strong> ${this.assessmentData.childName}</p>
                    <p style="margin: 8px 0;"><strong>年齡:</strong> ${this.assessmentData.childAge} 個月</p>
                    <p style="margin: 8px 0;"><strong>評估類型:</strong> ${this.getAssessmentTypeLabel(this.assessmentData.assessmentType)}</p>
                    <p style="margin: 8px 0;"><strong>評估時間:</strong> ${new Date(this.assessmentData.timestamp).toLocaleString('zh-TW')}</p>
                    <p style="margin: 8px 0;"><strong>完成率:</strong> ${yesCount}/${totalQuestions} 題 (${percentage.toFixed(0)}%)</p>
                    <p style="margin: 8px 0;"><strong>做到題數:</strong> ✔ ${yesCount} 題</p>
                    <p style="margin: 8px 0;"><strong>做不到題數:</strong> ✖ ${totalQuestions - yesCount} 題</p>
                </div>
                
                <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: left;">
                    <p style="margin: 0; color: #2e7d32; font-size: 14px; line-height: 1.6;">
                        <strong>💡 評估說明:</strong><br>
                        DQ (發育商) 是衡量兒童發育水平的指標，滿分為100分。<br>
                        • DQ 90-100: 優異<br>
                        • DQ 80-89: 良好<br>
                        • DQ 70-79: 中等<br>
                        • DQ 60-69: 及格<br>
                        • DQ < 60: 需要關注
                    </p>
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
