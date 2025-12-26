/**
 * Child Development Assessment Module
 * WS/T 580—2017 Standard (0-6 years old children)
 * 
 * Features:
 * - Generate assessment questions from PDF content
 * - Save test-id and user-id for future reference
 * - Display previous assessment results
 * - Calculate DQ and provide improvement suggestions
 * - Export results as JSON
 */

class ChildDevelopmentAssessment {
    constructor() {
        this.currentAssessmentId = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.assessmentData = null;
        this.isAssessmentActive = false;
    }

    /**
     * Initialize the assessment UI
     */
    static init() {
        console.log('Initializing Child Development Assessment Module');
        
        // Bind event listeners
        document.addEventListener('click', (e) => {
            if (e.target.id === 'btn-generate-assessment') {
                this.showAssessmentSetup();
            }
            if (e.target.closest('.btn-submit-assessment')) {
                this.submitAssessmentAnswers();
            }
            if (e.target.closest('.btn-export-assessment')) {
                this.exportAssessmentResults();
            }
            if (e.target.closest('.btn-view-history')) {
                this.showAssessmentHistory();
            }
        });
    }

    /**
     * Show assessment setup dialog
     */
    static showAssessmentSetup() {
        const messagesDiv = document.getElementById('messages');
        
        // 清空之前的消息（可选）
        // messagesDiv.innerHTML = '';
        
        // 建立欢迎消息
        const welcomeMsg = this.createChatbotMessage(
            `👶 欢迎使用兒童發育評估系統\n\n` +
            `本評估基於 WS/T 580—2017 標準，\n` +
            `將評估以下五大能區:\n` +
            `🦵 大運動 | ✋ 精細動作 | 💬 語言\n` +
            `🍴 適應能力 | 😊 社會行為\n\n` +
            `請提供以下信息開始評估:`
        );
        messagesDiv.appendChild(welcomeMsg);
        
        // 建立表單容器
        const formContainer = document.createElement('div');
        formContainer.style.cssText = `
            background: #f9fafb;
            padding: 16px;
            margin: 10px;
            border-radius: 8px;
            border: 2px solid #667eea;
        `;
        
        // 兒童名稱輸入
        const nameGroup = document.createElement('div');
        nameGroup.style.cssText = `
            margin-bottom: 12px;
        `;
        nameGroup.innerHTML = `
            <label style="font-weight: bold; color: #333; display: block; margin-bottom: 4px;">
                👧 兒童姓名 *
            </label>
            <input type="text" id="child_name" placeholder="例: 李小明" style="
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                box-sizing: border-box;
            ">
        `;
        formContainer.appendChild(nameGroup);
        
        // 年齡輸入
        const ageGroup = document.createElement('div');
        ageGroup.style.cssText = `
            margin-bottom: 12px;
        `;
        ageGroup.innerHTML = `
            <label style="font-weight: bold; color: #333; display: block; margin-bottom: 4px;">
                📅 年齡 (月) * 
            </label>
            <input type="number" id="child_age_months" min="0" max="84" placeholder="例: 24" value="24" style="
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                box-sizing: border-box;
            ">
            <small style="color: #999; display: block; margin-top: 4px;">
                範圍: 0-84 月 (0-6 歲)
            </small>
        `;
        formContainer.appendChild(ageGroup);
        
        // PDF 上傳
        const pdfGroup = document.createElement('div');
        pdfGroup.style.cssText = `
            margin-bottom: 12px;
        `;
        pdfGroup.innerHTML = `
            <label style="font-weight: bold; color: #333; display: block; margin-bottom: 4px;">
                📄 上傳 PDF (可選)
            </label>
            <input type="file" id="pdf_file" accept=".pdf" style="
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 13px;
                box-sizing: border-box;
            ">
            <small style="color: #999; display: block; margin-top: 4px;">
                用於生成更相關的評估建議
            </small>
        `;
        formContainer.appendChild(pdfGroup);
        
        // 按鈕容器
        const buttonDiv = document.createElement('div');
        buttonDiv.style.cssText = `
            display: flex;
            gap: 10px;
            margin-top: 12px;
        `;
        
        // 取消按鈕
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            flex: 1;
            background: #e0e0e0;
            color: #333;
            padding: 10px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        `;
        cancelBtn.onclick = () => formContainer.remove();
        buttonDiv.appendChild(cancelBtn);
        
        // 開始評估按鈕
        const startBtn = document.createElement('button');
        startBtn.textContent = '✨ 開始評估';
        startBtn.style.cssText = `
            flex: 1;
            background: #667eea;
            color: white;
            padding: 10px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s ease;
        `;
        startBtn.onmouseover = () => startBtn.style.background = '#5568d3';
        startBtn.onmouseout = () => startBtn.style.background = '#667eea';
        startBtn.onclick = () => this.startAssessment(formContainer);
        buttonDiv.appendChild(startBtn);
        
        formContainer.appendChild(buttonDiv);
        messagesDiv.appendChild(formContainer);
        
        // 自動滾動到底部
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    /**
     * Start the assessment process
     */
    static async startAssessment(formContainer) {
        const childName = document.getElementById('child_name').value;
        const childAgeMonths = parseFloat(document.getElementById('child_age_months').value);
        const pdfFile = document.getElementById('pdf_file').files[0];
        
        if (!childName || !childAgeMonths) {
            alert('請填寫兒童姓名和年齡');
            return;
        }
        
        try {
            // Show loading message in chatbox
            const messagesDiv = document.getElementById('messages');
            const loadingMsg = this.createChatbotMessage('正在生成評估題目，請稍候...');
            messagesDiv.appendChild(loadingMsg);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Remove form container
            if (formContainer) formContainer.remove();
            
            // Upload PDF if provided
            let pdfPath = null;
            if (pdfFile) {
                pdfPath = await this.uploadPDF(pdfFile);
            }
            
            // Call API to generate assessment
            const response = await fetch('/api/child-assessment/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    child_name: childName,
                    child_age_months: childAgeMonths,
                    pdf_path: pdfPath
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '生成評估失敗');
            }
            
            const data = await response.json();
            this.currentAssessmentId = data.assessment_id;
            this.assessmentData = {
                childName: childName,
                childAgeMonths: childAgeMonths,
                questions: data.questions,
                totalQuestions: data.total_questions
            };
            
            // Remove loading message
            loadingMsg.remove();
            
            // Start interactive quiz
            this.startInteractiveAssessment();
            
        } catch (error) {
            console.error('Error starting assessment:', error);
            alert('錯誤: ' + error.message);
        }
    }

    /**
     * Upload PDF file to server
     */
    static async uploadPDF(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('/api/upload-pdf', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'PDF 上傳失敗');
            }
            
            const data = await response.json();
            return data.file_path;
            
        } catch (error) {
            console.warn('PDF upload failed, continuing without PDF:', error);
            return null;
        }
    }

    /**
     * Start interactive assessment quiz in chatbox style
     */
    static startInteractiveAssessment() {
        // 安全檢查：確保 assessmentData 已初始化
        if (!this.assessmentData) {
            alert('❌ 評估數據未初始化，請重新開始評估');
            return;
        }
        
        // Create chatbox-style assessment container
        const messagesDiv = document.getElementById('messages');
        const inputContainer = document.getElementById('input-container');
        
        // Show assessment started message
        const startMsg = this.createChatbotMessage(
            `👋 歡迎進行兒童發育評估！\n\n` +
            `👧 兒童: ${this.assessmentData.childName || '未知'}\n` +
            `📅 年齡: ${this.assessmentData.childAgeMonths || '未知'} 個月\n\n` +
            `我將進行 ${this.assessmentData.totalQuestions || 10} 題評估。`
        );
        messagesDiv.appendChild(startMsg);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Disable input during assessment
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        messageInput.disabled = true;
        sendButton.disabled = true;
        
        this.isAssessmentActive = true;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        
        // Start showing questions after delay
        setTimeout(() => {
            this.showQuestion(0);
        }, 1500);
    }
    
    /**
     * Create a chatbot message element
     */
    static createChatbotMessage(text) {
        const container = document.createElement('div');
        container.className = 'bot-message-container';
        container.style.cssText = 'margin: 12px 0; display: flex; gap: 8px;';
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar bot-avatar';
        avatar.style.cssText = 'font-size: 24px; min-width: 40px; text-align: center;';
        avatar.innerHTML = '👶';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.style.cssText = 'background: #e8f0f7; padding: 12px 16px; border-radius: 8px; max-width: 60%; word-wrap: break-word;';
        content.textContent = text;
        
        container.appendChild(avatar);
        container.appendChild(content);
        
        return container;
    }
    
    /**
     * Create a user message element
     */
    static createUserMessage(text) {
        const container = document.createElement('div');
        container.className = 'user-message-container';
        container.style.cssText = 'margin: 12px 0; display: flex; gap: 8px; justify-content: flex-end;';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 16px; border-radius: 8px; max-width: 60%; word-wrap: break-word;';
        content.textContent = text;
        
        container.appendChild(content);
        
        return container;
    }

    /**
     * Show a specific question
     */
    static showQuestion(index) {
        if (index >= this.assessmentData.questions.length) {
            this.completeAssessment();
            return;
        }
        
        this.currentQuestionIndex = index;
        const question = this.assessmentData.questions[index];
        const messagesDiv = document.getElementById('messages');
        
        // 建立問題消息容器
        const questionContainer = document.createElement('div');
        questionContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
        `;
        
        // 建立問題文本消息
        const questionMsg = this.createChatbotMessage(
            `❓ 問題 ${index + 1}/${this.assessmentData.questions.length}\n\n` +
            `${question.description || question.name}`
        );
        questionContainer.appendChild(questionMsg);
        
        // 建立信息面板
        const infoPanel = document.createElement('div');
        infoPanel.style.cssText = `
            background: #f0f7ff;
            border-left: 4px solid #667eea;
            padding: 12px;
            border-radius: 8px;
            margin: 0 10px;
            font-size: 13px;
            color: #666;
        `;
        infoPanel.innerHTML = `
            <p><strong>能區:</strong> ${question.domain_emoji} ${question.domain_name}</p>
            <p style="margin-top: 8px;"><strong>說明:</strong> ${question.expected_behavior}</p>
        `;
        questionContainer.appendChild(infoPanel);
        
        // 建立答案選項按鈕容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin: 0 10px;
        `;
        
        // 是的按鈕
        const yesBtn = document.createElement('button');
        yesBtn.textContent = '✅ 是 - 兒童表現正常';
        yesBtn.style.cssText = `
            background: #11998e;
            color: white;
            padding: 12px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.3s ease;
        `;
        yesBtn.onmouseover = () => yesBtn.style.background = '#0d7a6e';
        yesBtn.onmouseout = () => yesBtn.style.background = '#11998e';
        yesBtn.onclick = () => this.recordAnswer(question.item_id, 'yes');
        buttonContainer.appendChild(yesBtn);
        
        // 否的按鈕
        const noBtn = document.createElement('button');
        noBtn.textContent = '❌ 否 - 兒童未能達到';
        noBtn.style.cssText = `
            background: #eb3349;
            color: white;
            padding: 12px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.3s ease;
        `;
        noBtn.onmouseover = () => noBtn.style.background = '#d62841';
        noBtn.onmouseout = () => noBtn.style.background = '#eb3349';
        noBtn.onclick = () => this.recordAnswer(question.item_id, 'no');
        buttonContainer.appendChild(noBtn);
        
        // 描述按鈕
        const descBtn = document.createElement('button');
        descBtn.textContent = '📝 簡單描述 - 請輸入說明';
        descBtn.style.cssText = `
            background: #f59e0b;
            color: white;
            padding: 12px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.3s ease;
        `;
        descBtn.onmouseover = () => descBtn.style.background = '#d97706';
        descBtn.onmouseout = () => descBtn.style.background = '#f59e0b';
        descBtn.onclick = () => this.showDescriptionInput(question.item_id);
        buttonContainer.appendChild(descBtn);
        
        questionContainer.appendChild(buttonContainer);
        messagesDiv.appendChild(questionContainer);
        
        // 自動滾動到底部
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    /**
     * Show description input for complex answer
     */
    static showDescriptionInput(itemId) {
        const messagesDiv = document.getElementById('messages');
        
        // 建立描述輸入容器
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = `
            background: #fff9e6;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 10px;
            border-radius: 8px;
        `;
        
        // 建立說明文本
        const label = document.createElement('p');
        label.textContent = '📝 請簡單描述兒童的表現';
        label.style.cssText = `
            color: #f59e0b;
            font-weight: bold;
            margin: 0 0 8px 0;
        `;
        inputContainer.appendChild(label);
        
        // 建立文本區域
        const textarea = document.createElement('textarea');
        textarea.id = 'description-input';
        textarea.placeholder = '例: 兒童能說一些詞語，但不太清楚...';
        textarea.style.cssText = `
            width: 100%;
            min-height: 80px;
            padding: 10px;
            border: 2px solid #f59e0b;
            border-radius: 6px;
            font-size: 13px;
            font-family: 'Microsoft YaHei', sans-serif;
            resize: vertical;
            box-sizing: border-box;
        `;
        inputContainer.appendChild(textarea);
        
        // 建立按鈕容器
        const buttonDiv = document.createElement('div');
        buttonDiv.style.cssText = `
            display: flex;
            gap: 10px;
            margin-top: 8px;
        `;
        
        // 取消按鈕
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            flex: 1;
            background: #ccc;
            color: #333;
            padding: 10px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        `;
        cancelBtn.onclick = () => this.showQuestion(this.currentQuestionIndex);
        buttonDiv.appendChild(cancelBtn);
        
        // 提交按鈕
        const submitBtn = document.createElement('button');
        submitBtn.textContent = '✅ 提交描述';
        submitBtn.style.cssText = `
            flex: 1;
            background: #f59e0b;
            color: white;
            padding: 10px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s ease;
        `;
        submitBtn.onmouseover = () => submitBtn.style.background = '#d97706';
        submitBtn.onmouseout = () => submitBtn.style.background = '#f59e0b';
        submitBtn.onclick = () => this.submitDescription(itemId);
        buttonDiv.appendChild(submitBtn);
        
        inputContainer.appendChild(buttonDiv);
        messagesDiv.appendChild(inputContainer);
        
        // 自動滾動到底部並聚焦
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        setTimeout(() => textarea.focus(), 100);
    }

    /**
     * Submit description answer
     */
    static submitDescription(itemId) {
        const textarea = document.getElementById('description-input');
        const description = textarea.value.trim();
        
        if (!description) {
            alert('請輸入描述內容');
            return;
        }
        
        this.recordAnswer(itemId, description);
    }

    /**
     * Record an answer and move to next question
     */
    static recordAnswer(itemId, answer) {
        this.userAnswers[itemId] = answer;
        const messagesDiv = document.getElementById('messages');
        
        // 確定答案類型的顏色和圖標
        let feedbackColor, feedbackText, feedbackIcon;
        
        if (answer === 'yes') {
            feedbackColor = '#11998e';
            feedbackText = '✅ 正常發育';
            feedbackIcon = '✅';
        } else if (answer === 'no') {
            feedbackColor = '#eb3349';
            feedbackText = '❌ 已記錄';
            feedbackIcon = '❌';
        } else {
            feedbackColor = '#f59e0b';
            feedbackText = '📝 描述已記錄';
            feedbackIcon = '📝';
        }
        
        // 建立用戶回答消息
        const userMsg = this.createUserMessage(`${feedbackIcon} ${feedbackText}`);
        messagesDiv.appendChild(userMsg);
        
        // 建立進度指示
        const progressDiv = document.createElement('div');
        progressDiv.style.cssText = `
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 10px;
            margin: 10px;
            border-radius: 6px;
            font-size: 12px;
            color: #666;
        `;
        
        const answeredCount = Object.keys(this.userAnswers).length;
        const totalQuestions = this.assessmentData.questions.length;
        progressDiv.innerHTML = `
            📊 進度: ${answeredCount}/${totalQuestions} (${Math.round((answeredCount/totalQuestions)*100)}%)
        `;
        messagesDiv.appendChild(progressDiv);
        
        // 自動滾動到底部
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // 2秒後進入下一題
        setTimeout(() => {
            this.showQuestion(this.currentQuestionIndex + 1);
        }, 2000);
    }

    /**
     * Complete assessment and show results
     */
    static completeAssessment() {
        this.showLoading('正在計算評估結果...');
        this.submitAssessmentAnswers();
    }

    /**
     * Submit assessment answers to server
     */
    static async submitAssessmentAnswers() {
        try {
            const response = await fetch(`/api/child-assessment/${this.currentAssessmentId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    answers: this.userAnswers
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '提交評估失敗');
            }
            
            const data = await response.json();
            
            // Remove loading
            const loading = document.getElementById('loading-overlay');
            if (loading) loading.remove();
            
            // Show results
            this.showAssessmentResults(data.results);
            
        } catch (error) {
            console.error('Error submitting assessment:', error);
            const loading = document.getElementById('loading-overlay');
            if (loading) loading.remove();
            alert('錯誤: ' + error.message);
        }
    }

    /**
     * Show assessment results
     */
    static showAssessmentResults(results) {
        // 安全檢查：確保 results 和必需字段存在
        if (!results) {
            alert('❌ 評估結果數據缺失，無法顯示結果');
            return;
        }
        
        const dqLevel = results.dq_level || 'normal';
        const dqColor = this.getDQColor(dqLevel);
        const dqEmoji = this.getDQEmoji(dqLevel);
        const messagesDiv = document.getElementById('messages');
        
        // 禁用輸入框
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        if (messageInput) messageInput.disabled = true;
        if (sendButton) sendButton.disabled = true;
        
        // 1. DQ 結果摘要
        const dqValue = results.dq ? results.dq.toFixed(1) : 'N/A';
        const resultMsg = this.createChatbotMessage(
            `${dqEmoji} 評估完成！\n\n` +
            `🎯 發育商(DQ): ${dqValue}\n` +
            `${results.dq_description || '評估進行中'}`
        );
        messagesDiv.appendChild(resultMsg);
        
        // 2. 成績卡片
        const totalItems = results.total_items || 1;
        const totalPassed = results.total_passed || 0;
        const accuracyPercent = ((totalPassed / totalItems) * 100).toFixed(1);
        const scoreCard = document.createElement('div');
        scoreCard.style.cssText = `
            background: linear-gradient(135deg, ${dqColor}20 0%, ${dqColor}40 100%);
            border: 2px solid ${dqColor};
            padding: 16px;
            margin: 10px;
            border-radius: 8px;
            text-align: center;
        `;
        scoreCard.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">📈 成績卡片</div>
            <div style="font-size: 32px; font-weight: bold; color: ${dqColor};">
                ${results.total_passed} / ${results.total_items}
            </div>
            <div style="font-size: 14px; color: #666;">
                正確率: ${accuracyPercent}%
            </div>
        `;
        messagesDiv.appendChild(scoreCard);
        
        // 3. 計算過程
        const childAge = this.assessmentData?.childAgeMonths || 0;
        const mentalAge = results.total_mental_age ? results.total_mental_age.toFixed(1) : 'N/A';
        const dqCalc = dqValue === 'N/A' ? 'N/A' : dqValue;
        const calculationMsg = this.createChatbotMessage(
            `🧮 計算過程\n\n` +
            `📝 答題統計:\n` +
            `✅ 通過題數: ${totalPassed} 題\n` +
            `❌ 未通過題數: ${totalItems - totalPassed} 題\n` +
            `📊 總題數: ${totalItems} 題\n\n` +
            `📐 計算公式:\n` +
            `正確率 = ${totalPassed} ÷ ${totalItems} × 100% = ${accuracyPercent}%\n\n` +
            `🎯 DQ計算:\n` +
            `智齡 = ${childAge} × ${accuracyPercent}% = ${mentalAge} 月\n` +
            `DQ = (${mentalAge} ÷ ${childAge}) × 100 = ${dqCalc}`
        );
        messagesDiv.appendChild(calculationMsg);
        
        // 4. 評估指標
        const metricsCard = document.createElement('div');
        metricsCard.style.cssText = `
            background: #f0f7ff;
            padding: 12px;
            margin: 10px;
            border-radius: 8px;
        `;
        metricsCard.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">📊 評估指標</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                    <small>📅 實際年齡</small>
                    <div style="font-size: 16px; font-weight: bold;">
                        ${childAge} 月
                    </div>
                </div>
                <div>
                    <small>🧠 智齡</small>
                    <div style="font-size: 16px; font-weight: bold;">
                        ${mentalAge} 月
                    </div>
                </div>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e7ff;">
                <small>⏰ 年齡符合度:</small>
                ${this.renderAgeCompliance(results.dq || 0, childAge)}
            </div>
        `;
        messagesDiv.appendChild(metricsCard);
        
        // 5. 五大能區結果
        const areaMsg = this.createChatbotMessage(
            `🎯 五大能區評估結果:\n\n` +
            this.formatAreaResultsForChat(results.area_results || {})
        );
        messagesDiv.appendChild(areaMsg);
        
        // 6. 改進建議
        const recommendationMsg = this.createChatbotMessage(
            `💡 改進建議:\n\n` +
            this.formatRecommendationsForChat(results.recommendations)
        );
        messagesDiv.appendChild(recommendationMsg);
        
        // 7. DQ 解釋
        const explanationMsg = this.createChatbotMessage(
            `ℹ️ DQ 解釋:\n\n` +
            `DQ (發育商) = (智齡 ÷ 實際年齡) × 100\n\n` +
            `≥130: 優秀 - 發育超前\n` +
            `110-129: 良好 - 發育良好\n` +
            `80-109: 中等 - 發育正常\n` +
            `70-79: 臨界偏低 - 需要關注\n` +
            `<70: 障礙 - 需要專業評估`
        );
        messagesDiv.appendChild(explanationMsg);
        
        // 8. 操作按鈕
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
            margin: 10px;
            flex-wrap: wrap;
        `;
        
        // 新評估按鈕
        const newAssessmentBtn = document.createElement('button');
        newAssessmentBtn.textContent = '✨ 新評估';
        newAssessmentBtn.style.cssText = `
            flex: 1;
            min-width: 120px;
            background: #667eea;
            color: white;
            padding: 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        `;
        newAssessmentBtn.onclick = () => this.startNewAssessment();
        buttonContainer.appendChild(newAssessmentBtn);
        
        // 導出結果按鈕
        const exportBtn = document.createElement('button');
        exportBtn.textContent = '📥 導出結果';
        exportBtn.style.cssText = `
            flex: 1;
            min-width: 120px;
            background: #11998e;
            color: white;
            padding: 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        `;
        exportBtn.onclick = () => this.exportAssessmentResults();
        buttonContainer.appendChild(exportBtn);
        
        messagesDiv.appendChild(buttonContainer);
        
        // 自動滾動到底部
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    /**
     * Format area results for chat display
     */
    static formatAreaResultsForChat(areaResults) {
        // 防禦性檢查：確保 areaResults 存在
        if (!areaResults || typeof areaResults !== 'object') {
            return '無能區評估結果';
        }

        const domains = {
            'gross_motor': '🦵 大運動',
            'fine_motor': '✋ 精細動作',
            'language': '💬 語言',
            'adaptive': '🍴 適應能力',
            'social_behavior': '😊 社會行為'
        };
        
        let text = '';
        for (const [domain, label] of Object.entries(domains)) {
            const result = areaResults[domain] || {};
            const accuracy = (result.accuracy || 0).toFixed(0);
            const passed = result.passed_items || 0;
            const total = result.total_items || 0;
            
            text += `${label}: ${passed}/${total} (${accuracy}%)\n`;
        }
        
        return text;
    }
    
    /**
     * Format recommendations for chat display
     */
    static formatRecommendationsForChat(recommendations) {
        let text = '';
        if (Array.isArray(recommendations)) {
            recommendations.forEach((rec, index) => {
                text += `${index + 1}. ${rec}\n`;
            });
        } else if (typeof recommendations === 'string') {
            text = recommendations;
        }
        return text || '無特別建議';
    }

    /**
     * Render area results
     */
    static renderAreaResults(areaResults) {
        // 防禦性檢查：確保 areaResults 存在
        if (!areaResults || typeof areaResults !== 'object') {
            return '<div style="padding: 12px; color: #999;">無能區評估結果</div>';
        }

        let html = '<div style="display: grid; gap: 12px;">';
        
        const domains = {
            'gross_motor': '🦵 大運動',
            'fine_motor': '✋ 精細動作',
            'language': '💬 語言',
            'adaptive': '🍴 適應能力',
            'social_behavior': '😊 社會行為'
        };
        
        for (const [domain, label] of Object.entries(domains)) {
            const result = areaResults[domain] || {};
            const accuracy = typeof result.accuracy === 'number' ? result.accuracy : 0;
            const passed = result.passed_items || 0;
            const total = result.total_items || 0;
            const status = result.status || 'normal';
            
            // Determine color based on accuracy
            let statusColor = '#e74c3c';  // needs_improvement - red
            if (status === 'excellent') statusColor = '#11998e';  // green
            else if (status === 'good') statusColor = '#3498db';  // blue
            else if (status === 'normal') statusColor = '#f39c12';  // orange
            
            html += `
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border-left: 4px solid ${statusColor};
                ">
                    <div style="flex: 1;">
                        <strong>${label}</strong><br>
                        <small style="color: #666;">通過: ${passed}/${total} | 心理年齡: ${result.mental_age_months ? result.mental_age_months.toFixed(1) : 0} 月</small>
                    </div>
                    <div style="
                        font-size: 24px;
                        font-weight: bold;
                        color: ${statusColor};
                    ">
                        ${Number(accuracy).toFixed(0)}%
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Render recommendations
     */
    static renderRecommendations(recommendations) {
        let html = '<div style="display: grid; gap: 12px;">';
        
        // Handle both old and new recommendation formats
        for (const [domain, rec] of Object.entries(recommendations || {})) {
            if (domain === 'overall') {
                // Overall recommendation
                const dqLevel = rec.dq_level || 'unknown';
                const summary = rec.summary || '無特別建議';
                
                html += `
                    <div style="
                        padding: 12px;
                        background: #fff3e0;
                        border-radius: 8px;
                        border-left: 4px solid #ff9800;
                    ">
                        <div style="color: #ff9800; font-weight: bold; margin-bottom: 8px;">
                            📌 整體評估: ${dqLevel}
                        </div>
                        <small>${summary}</small>
                    </div>
                `;
            } else {
                // Domain-specific recommendations
                const status = rec.status || 'normal';
                const suggestion = rec.suggestion || '無特別建議';
                
                let statusColor = '#e74c3c';
                if (status === 'excellent') statusColor = '#11998e';
                else if (status === 'good') statusColor = '#3498db';
                else if (status === 'normal') statusColor = '#f39c12';
                
                html += `
                    <div style="
                        padding: 12px;
                        background: #f8f9fa;
                        border-radius: 8px;
                        border-left: 4px solid ${statusColor};
                    ">
                        <div style="color: ${statusColor}; font-weight: bold; margin-bottom: 8px;">
                            ${rec.domain_name || '未知'}: ${status}
                        </div>
                        <small>${suggestion}</small>
                    </div>
                `;
            }
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Render age compliance indicator
     */
    static renderAgeCompliance(dq, ageMonths) {
        let complianceStatus = '未知';
        let complianceColor = '#95a5a6';
        let complianceEmoji = '❓';
        
        if (dq >= 115) {
            complianceStatus = '✅ 超前 - 發育快於年齡';
            complianceColor = '#11998e';
            complianceEmoji = '⭐';
        } else if (dq >= 85) {
            complianceStatus = '✅ 符合 - 發育與年齡相符';
            complianceColor = '#27ae60';
            complianceEmoji = '✓';
        } else if (dq >= 70) {
            complianceStatus = '⚠️ 略低 - 發育略低於年齡';
            complianceColor = '#f39c12';
            complianceEmoji = '⚠';
        } else {
            complianceStatus = '❌ 明顯延遲 - 需要專業評估';
            complianceColor = '#e74c3c';
            complianceEmoji = '🔴';
        }
        
        return `
            <div style="
                padding: 8px 12px;
                background: ${complianceColor}15;
                border-radius: 6px;
                margin-top: 8px;
                color: ${complianceColor};
                font-weight: bold;
                font-size: 14px;
            ">
                ${complianceEmoji} ${complianceStatus}
            </div>
        `;
    }

    /**
     * Export assessment results as JSON
     */
    static async exportAssessmentResults() {
        try {
            const response = await fetch(`/api/child-assessment/${this.currentAssessmentId}/export`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('導出失敗');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `assessment_${this.currentAssessmentId}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('✅ 評估結果已導出!');
            
        } catch (error) {
            console.error('Error exporting:', error);
            alert('❌ 導出失敗: ' + error.message);
        }
    }

    /**
     * Show assessment history
     */
    static async showAssessmentHistory() {
        try {
            this.showLoading('正在載入評估歷史...');
            
            const response = await fetch('/api/child-assessment/history', {
                method: 'GET'
            });
            
            const loading = document.getElementById('loading-overlay');
            if (loading) loading.remove();
            
            if (!response.ok) {
                throw new Error('無法載入評估歷史');
            }
            
            const data = await response.json();
            const assessments = data.assessments || [];
            
            let html = `
                <div id="history-modal" class="modal" style="display: flex;">
                    <div class="modal-content" style="max-width: 800px;">
                        <div class="modal-header">
                            <h2>📋 評估歷史</h2>
                            <button class="btn-close" onclick="document.getElementById('history-modal').remove()">×</button>
                        </div>
                        
                        <div class="modal-body">
                            ${assessments.length === 0 ? `
                                <div style="text-align: center; padding: 40px; color: #999;">
                                    <p style="font-size: 48px; margin: 0;">📭</p>
                                    <p>目前沒有評估記錄</p>
                                </div>
                            ` : `
                                <div style="display: grid; gap: 12px;">
                                    ${assessments.map(a => `
                                        <div style="
                                            border: 1px solid #e0e0e0;
                                            padding: 16px;
                                            border-radius: 8px;
                                            display: flex;
                                            justify-content: space-between;
                                            align-items: center;
                                        ">
                                            <div>
                                                <h4 style="margin: 0 0 8px 0;">👧 ${a.child_name}</h4>
                                                <small style="color: #666;">
                                                    年齡: ${a.child_age_months} 個月 | 
                                                    DQ: ${a.overall_dq ? a.overall_dq.toFixed(1) : 'N/A'} | 
                                                    ${new Date(a.created_at).toLocaleDateString('zh-TW')}
                                                </small>
                                            </div>
                                            <button class="btn btn-primary" data-assessment-id="${a.assessment_id}" onclick="ChildDevelopmentAssessment.viewAssessmentDetail(this.getAttribute('data-assessment-id'))">
                                                查看
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </div>
                        
                        <div class="modal-footer">
                            <button class="btn btn-secondary" onclick="document.getElementById('history-modal').remove()">
                                關閉
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', html);
            this.addModalStyles();
            
        } catch (error) {
            console.error('Error loading history:', error);
            alert('❌ 載入失敗: ' + error.message);
        }
    }

    /**
     * View assessment detail
     */
    static async viewAssessmentDetail(assessmentId) {
        try {
            // 防禦性檢查：確保 assessmentId 存在
            if (!assessmentId || typeof assessmentId !== 'string') {
                throw new Error('評估 ID 無效：' + assessmentId);
            }
            
            console.log('Loading assessment detail:', assessmentId);
            this.showLoading('正在載入評估詳情...');
            
            const response = await fetch(`/api/child-assessment/${assessmentId}/detail`, {
                method: 'GET'
            });
            
            const loading = document.getElementById('loading-overlay');
            if (loading) loading.remove();
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                throw new Error(`無法載入評估詳情 (${response.status})`);
            }
            
            const data = await response.json();
            console.log('Assessment data received:', data);
            
            if (!data.assessment) {
                throw new Error('API 返回的數據不包含 assessment 字段');
            }
            
            const assessment = data.assessment;
            
            // 防禦性檢查：確保所有必需字段存在
            if (!assessment.overall_dq && assessment.overall_dq !== 0) {
                console.warn('Warning: assessment.overall_dq is missing or zero');
            }
            if (!assessment.dq_level) {
                console.warn('Warning: assessment.dq_level is missing');
            }
            if (!assessment.area_results) {
                console.warn('Warning: assessment.area_results is missing');
            }
            
            // 轉換評估對象格式，從 overall_dq 轉換為 dq，以匹配 showAssessmentResults() 期望的格式
            const convertedResults = {
                dq: assessment.overall_dq || 0,
                dq_level: assessment.dq_level || 'normal',
                dq_description: assessment.dq_level === 'excellent' ? '優秀 - 發育超前' :
                                assessment.dq_level === 'good' ? '良好 - 發育良好' :
                                assessment.dq_level === 'normal' ? '中等 - 發育正常' :
                                assessment.dq_level === 'borderline_low' ? '臨界偏低 - 需要關注' :
                                assessment.dq_level === 'disability' ? '障礙 - 需要專業評估' : '未知',
                total_items: 1,  // 默認值
                total_passed: 1,  // 默認值
                total_mental_age: assessment.total_mental_age || 0,
                area_results: assessment.area_results || {},
                recommendations: assessment.recommendations || []
            };
            
            console.log('Converted results:', convertedResults);
            this.showAssessmentResults(convertedResults);
            
        } catch (error) {
            console.error('Error loading detail:', error);
            const loading = document.getElementById('loading-overlay');
            if (loading) loading.remove();
            alert('❌ 載入失敗: ' + error.message);
        }
    }

    /**
     * Save questions and answers to file
     */
    static async saveQuestions() {
        try {
            // 安全檢查
            if (!this.currentAssessmentId || Object.keys(this.userAnswers).length === 0) {
                alert('❌ 沒有問題或答案可保存');
                return;
            }
            
            if (!this.assessmentData) {
                alert('❌ 評估數據缺失，無法保存');
                return;
            }
            
            // Get current questions and answers
            const questionsData = {
                assessment_id: this.currentAssessmentId,
                child_name: this.assessmentData.childName || '未知',
                child_age_months: this.assessmentData.childAgeMonths || 0,
                total_questions: (this.assessmentData.questions && this.assessmentData.questions.length) || 0,
                questions: (this.assessmentData.questions || []).map(q => ({
                    item_id: q.item_id,
                    description: q.description,
                    domain: q.domain_name,
                    expected_behavior: q.expected_behavior
                })),
                user_answers: this.userAnswers,
                timestamp: new Date().toISOString()
            };
            
            // Create JSON blob
            const blob = new Blob([JSON.stringify(questionsData, null, 2)], {
                type: 'application/json'
            });
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `questions_${this.currentAssessmentId}_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('✅ 題目已保存!');
            
        } catch (error) {
            console.error('Error saving questions:', error);
            alert('❌ 保存失敗: ' + error.message);
        }
    }

    /**
     * Export questions as CSV
     */
    static async exportQuestionsAsCSV() {
        try {
            if (!this.currentAssessmentId || this.assessmentData.questions.length === 0) {
                alert('❌ 沒有問題可導出');
                return;
            }
            
            // Create CSV content
            let csvContent = '題目編號,題目描述,能區,預期行為,用戶答案\n';
            
            this.assessmentData.questions.forEach((q, index) => {
                const answer = this.userAnswers[q.item_id] || '未作答';
                csvContent += `"${index + 1}","${q.description}","${q.domain_name}","${q.expected_behavior}","${answer}"\n`;
            });
            
            // Create CSV blob
            const blob = new Blob([csvContent], {
                type: 'text/csv;charset=utf-8;'
            });
            
            // Create download link
            const link = document.createElement('a');
            const url = window.URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `questions_${this.currentAssessmentId}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            alert('✅ 題目已導出為 CSV!');
            
        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('❌ 導出失敗: ' + error.message);
        }
    }

    /**
     * Cancel assessment
     */
    static cancelAssessment() {
        if (confirm('確定要取消評估嗎?')) {
            this.isAssessmentActive = false;
            const container = document.getElementById('assessment-container');
            if (container) container.remove();
        }
    }

    /**
     * Start new assessment
     */
    static startNewAssessment() {
        const modal = document.getElementById('results-modal');
        if (modal) modal.remove();
        
        this.currentAssessmentId = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.assessmentData = null;
        
        this.showAssessmentSetup();
    }

    /**
     * Show loading overlay
     */
    static showLoading(text = 'Loading...') {
        const html = `
            <div id="loading-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1001;
            ">
                <div style="
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    text-align: center;
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #667eea;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 16px;
                    "></div>
                    <p>${text}</p>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
    }

    /**
     * Get domain label
     */
    static getDomainLabel(domain) {
        const labels = {
            'gross_motor': '🦵 大運動',
            'fine_motor': '✋ 精細動作',
            'language': '💬 語言',
            'adaptive': '🍴 適應能力',
            'social_behavior': '😊 社會行為'
        };
        return labels[domain] || domain;
    }

    /**
     * Get DQ color based on level
     */
    static getDQColor(level) {
        const colors = {
            'excellent': '#11998e',       // Green
            'good': '#3498db',            // Blue
            'normal': '#f39c12',          // Orange
            'borderline_low': '#e67e22',  // Dark orange
            'disability': '#e74c3c'       // Red
        };
        return colors[level] || '#95a5a6';
    }

    /**
     * Get DQ emoji based on level
     */
    static getDQEmoji(level) {
        const emojis = {
            'excellent': '🌟',
            'good': '⭐',
            'normal': '✅',
            'borderline_low': '⚠️',
            'disability': '🔴'
        };
        return emojis[level] || '📊';
    }

    /**
     * Add modal styles
     */
    static addModalStyles() {
        if (document.getElementById('modal-styles-added')) return;
        
        const styles = `
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 1000;
                padding: 20px;
            }
            
            .modal-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                display: flex;
                flex-direction: column;
                max-height: 90vh;
                overflow: hidden;
                margin: auto;
            }
            
            .modal-header {
                padding: 20px;
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .modal-header h2 {
                margin: 0;
                font-size: 20px;
            }
            
            .modal-body {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }
            
            .modal-footer {
                padding: 16px 20px;
                border-top: 1px solid #e0e0e0;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            
            .btn-close {
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: #999;
            }
            
            .form-group {
                margin-bottom: 20px;
            }
            
            .form-group label {
                display: block;
                font-weight: bold;
                margin-bottom: 8px;
            }
            
            .form-group input {
                width: 100%;
                padding: 10px;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                font-size: 14px;
            }
            
            .form-group small {
                display: block;
                margin-top: 4px;
                color: #999;
            }
            
            .btn {
                padding: 10px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.3s ease;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            }
            
            .btn-secondary {
                background: #e0e0e0;
                color: #333;
            }
            
            .btn-success {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
            }
            
            .btn-danger {
                background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
                color: white;
            }
        `;
        
        const style = document.createElement('style');
        style.id = 'modal-styles-added';
        style.textContent = styles;
        document.head.appendChild(style);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ChildDevelopmentAssessment.addModalStyles();
});
