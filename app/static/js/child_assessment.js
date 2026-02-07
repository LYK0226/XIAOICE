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
        const backBar = document.getElementById('childBackBar');
        if (backBar) {
            backBar.style.display = 'flex';
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
        
        const template = document.getElementById('questionCardTemplate');
        const clone = template.content.cloneNode(true);
        
        // Fill in question data
        clone.querySelector('.question-emoji').textContent = question.emoji;
        clone.querySelector('.question-domain').textContent = question.domain;
        clone.querySelector('.current-count').textContent = current;
        clone.querySelector('.total-count').textContent = total;
        clone.querySelector('.question-text').textContent = question.question;
        clone.querySelector('.question-description').textContent = question.description;
        
        // Set up answer buttons
        const canBtn = clone.querySelector('[data-answer="yes"]');
        const cannotBtn = clone.querySelector('[data-answer="no"]');
        
        canBtn.addEventListener('click', () => this.recordAnswer(question.id, 'yes'));
        cannotBtn.addEventListener('click', () => this.recordAnswer(question.id, 'no'));
        
        const container = document.getElementById('assessmentContent');
        container.innerHTML = '';
        container.appendChild(clone);
        
        // Set video source after appending to DOM
        const video = document.getElementById('demoVideo');
        if (video && question.videoUrl) {
            video.src = question.videoUrl;
        }
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
            
            // Use template for finished card
            const template = document.getElementById('finishedCardTemplate');
            const clone = template.content.cloneNode(true);
            
            const totalQuestions = 10;
            clone.querySelectorAll('.total-questions').forEach(el => {
                el.textContent = totalQuestions;
            });
            clone.querySelector('.answered-count').textContent = totalQuestions;
            
            const container = document.getElementById('assessmentContent');
            container.innerHTML = '';
            container.appendChild(clone);
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
        
        // Use template for results view
        const template = document.getElementById('resultsViewTemplate');
        const clone = template.content.cloneNode(true);
        
        // Fill in results data
        clone.querySelector('.dq-score').textContent = dq.toFixed(0);
        clone.querySelector('.level-badge').textContent = level;
        clone.querySelector('.child-name').textContent = this.assessmentData.childName;
        clone.querySelector('.child-age').textContent = this.assessmentData.childAge + ' 個月';
        clone.querySelector('.assessment-type').textContent = this.getAssessmentTypeLabel(this.assessmentData.assessmentType);
        clone.querySelector('.completion-rate').textContent = `${percentage.toFixed(0)}% (${yesCount}/${totalQuestions})`;
        
        // Update summary text
        const summaryText = clone.querySelector('.summary-text');
        summaryText.innerHTML = `根據本次評估，您的孩子在<strong>${this.getAssessmentTypeLabel(this.assessmentData.assessmentType)}</strong>領域的表現為<strong>${level}</strong>。`;
        
        const assessmentContent = document.getElementById('assessmentContent');
        if (assessmentContent) {
            assessmentContent.innerHTML = '';
            assessmentContent.appendChild(clone);
        }
        
        // Hide progress bar
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) progressBar.style.display = 'none';
        
        // Hide submit button if visible
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.style.display = 'none';
    }
    
    /**
     * Export assessment results as PDF (paginated)
     */
    static async exportResults() {
        // Page sizing (px) approximates A4 at 96dpi for container width 800px
        const pageWidthPx = 800;
        const pageHeightPx = 1122; // ~297mm at 96dpi
        const pageStyle = `width: ${pageWidthPx}px; padding: 30px; background: white; font-family: 'Microsoft YaHei', '微軟正黑體', Arial, sans-serif; color: #333; position: absolute; left: -9999px;`;

        // Calculate DQ and level
        const totalQuestions = 10;
        const yesCount = Object.values(this.assessmentAnswers).filter(a => a === 'yes').length;
        const dq = (yesCount / totalQuestions) * 100;
        const level = dq >= 90 ? '優異' : dq >= 80 ? '良好' : dq >= 70 ? '中等' : dq >= 60 ? '及格' : '需要關注';
        const levelColor = dq >= 90 ? '#28a745' : dq >= 80 ? '#17a2b8' : dq >= 70 ? '#ffc107' : dq >= 60 ? '#fd7e14' : '#dc3545';

        // Format date
        const date = new Date(this.assessmentData.timestamp);
        const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
        const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

        // Build first page (title + summary)
        const firstPage = document.createElement('div');
        firstPage.style.cssText = pageStyle;
        firstPage.innerHTML = `
            <div style="text-align: center; margin-bottom: 25px;">
                <h1 style="color: #2c3e50; font-size: 28px; margin: 0 0 8px 0; font-weight: bold;">📊 兒童發展評估報告</h1>
                <div style="width: 100%; height: 3px; background: linear-gradient(to right, #4285f4, #34a853, #fbbc05, #ea4335); margin: 15px 0;"></div>
                <p style="color: #666; font-size: 13px; margin: 8px 0;">基於 WS/T 580-2017 標準 (0-6歲兒童)</p>
            </div>
            
            <div style="background: #f8f9fa; border-left: 4px solid #4285f4; padding: 15px; margin-bottom: 20px; border-radius: 4px; page-break-inside: avoid;">
                <h2 style="color: #2c3e50; font-size: 18px; margin: 0 0 12px 0; font-weight: bold;">👶 基本資料</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 6px 0; font-size: 15px; color: #555; width: 30%;"><strong>兒童姓名：</strong></td><td style="padding: 6px 0; font-size: 15px; color: #333;">${this.assessmentData.childName}</td></tr>
                    <tr><td style="padding: 6px 0; font-size: 15px; color: #555;"><strong>年齡：</strong></td><td style="padding: 6px 0; font-size: 15px; color: #333;">${this.assessmentData.childAge} 個月</td></tr>
                    <tr><td style="padding: 6px 0; font-size: 15px; color: #555;"><strong>評估類型：</strong></td><td style="padding: 6px 0; font-size: 15px; color: #333;">${this.getAssessmentTypeLabel(this.assessmentData.assessmentType)}</td></tr>
                    <tr><td style="padding: 6px 0; font-size: 15px; color: #555;"><strong>評估日期：</strong></td><td style="padding: 6px 0; font-size: 15px; color: #333;">${formattedDate} ${formattedTime}</td></tr>
                </table>
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; margin-bottom: 20px; border-radius: 8px; text-align: center; color: white; page-break-inside: avoid;">
                <h2 style="font-size: 18px; margin: 0 0 15px 0; font-weight: bold;">📈 評估結果</h2>
                <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="font-size: 42px; font-weight: bold; margin-bottom: 5px;">${dq.toFixed(0)}</div>
                    <div style="font-size: 15px; opacity: 0.9;">發育商 (DQ)</div>
                </div>
                <div style="background: ${levelColor}; padding: 8px 18px; border-radius: 20px; display: inline-block; font-size: 16px; font-weight: bold;">${level}</div>
                <div style="margin-top: 12px; font-size: 13px; opacity: 0.9;">完成率：${(yesCount / totalQuestions * 100).toFixed(0)}% (${yesCount}/${totalQuestions} 題)</div>
            </div>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px; page-break-inside: avoid;">
                <h2 style="color: #2c3e50; font-size: 18px; margin: 0 0 12px 0; font-weight: bold;">📊 DQ 等級參考</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background: #f8f9fa;"><td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold; width: 25%; font-size: 14px;">分數範圍</td><td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold; font-size: 14px;">評級</td><td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold; font-size: 14px;">說明</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;">90-100</td><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;"><span style="background: #28a745; color: white; padding: 3px 10px; border-radius: 12px; font-weight: bold;">優異</span></td><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;">發展超前，表現優秀</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;">80-89</td><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;"><span style="background: #17a2b8; color: white; padding: 3px 10px; border-radius: 12px; font-weight: bold;">良好</span></td><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;">發展良好，符合預期</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;">70-79</td><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;"><span style="background: #ffc107; color: white; padding: 3px 10px; border-radius: 12px; font-weight: bold;">中等</span></td><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;">基本達標，可加強練習</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;">60-69</td><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;"><span style="background: #fd7e14; color: white; padding: 3px 10px; border-radius: 12px; font-weight: bold;">及格</span></td><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;">需要更多關注與練習</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;">&lt; 60</td><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;"><span style="background: #dc3545; color: white; padding: 3px 10px; border-radius: 12px; font-weight: bold;">需關注</span></td><td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;">建議諮詢專業人士</td></tr>
                </table>
            </div>
            
            <div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin-bottom: 20px; border-radius: 4px; page-break-inside: avoid;">
                <h2 style="color: #2c3e50; font-size: 18px; margin: 0 0 12px 0; font-weight: bold;">💡 專業建議</h2>
                <p style="line-height: 1.6; font-size: 14px; margin: 0; color: #333;">${this.getRecommendation(dq, level)}</p>
            </div>
        `;

        // Build answer table rows and paginate them into pages that fit the height
        const rows = this.getAnswerRowsArray();
        const tableHeader = `
            <div style="background: #e7f3ff; border-left: 4px solid #4285f4; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <h2 style="color: #2c3e50; font-size: 18px; margin: 0 0 12px 0; font-weight: bold;">📝 答題明細</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #4285f4; color: white;">
                            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: center; width: 10%; font-size: 14px;">題號</th>
                            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left; font-size: 14px;">評估項目</th>
                            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: center; width: 15%; font-size: 14px;">結果</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // pagination: assemble pages with header + subset of rows
        const pages = [firstPage];
        let currentRowsHtml = '';
        const measureDiv = document.createElement('div');
        measureDiv.style.cssText = pageStyle + 'position:absolute; left:-9999px; top:0;';
        document.body.appendChild(measureDiv);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // test by adding this row
            measureDiv.innerHTML = tableHeader + currentRowsHtml + row + '</tbody></table>';
            // Add a small safety margin
            if (measureDiv.scrollHeight > pageHeightPx - 120) {
                // finalize previous page with currentRowsHtml
                const pageDiv = document.createElement('div');
                pageDiv.style.cssText = pageStyle;
                pageDiv.innerHTML = tableHeader + currentRowsHtml + '</tbody></table></div>';
                pages.push(pageDiv);
                // start new page with this row
                currentRowsHtml = row;
            } else {
                currentRowsHtml += row;
            }
        }

        // push remaining rows as a page
        if (currentRowsHtml.trim().length > 0) {
            const pageDiv = document.createElement('div');
            pageDiv.style.cssText = pageStyle;
            pageDiv.innerHTML = tableHeader + currentRowsHtml + '</tbody></table></div>';
            pages.push(pageDiv);
        }

        document.body.removeChild(measureDiv);

        // render each page with html2canvas and add to PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        for (let p = 0; p < pages.length; p++) {
            const pageEl = pages[p];
            document.body.appendChild(pageEl);
            // render
            // eslint-disable-next-line no-await-in-loop
            const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (p === 0) {
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            } else {
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            }

            document.body.removeChild(pageEl);
        }

        const fileName = `兒童評估報告_${this.assessmentData.childName}_${Date.now()}.pdf`;
        pdf.save(fileName);
    }
    
    /**
     * Get recommendation based on DQ score
     */
    static getRecommendation(dq, level) {
        if (dq >= 90) {
            return `根據本次評估，您的孩子在 <strong>${this.getAssessmentTypeLabel(this.assessmentData.assessmentType)}</strong> 領域表現 <strong>優異</strong>！
                    孩子的發展超前於同齡水平，這是非常值得鼓勵的。建議您繼續提供多樣化的學習機會，
                    讓孩子在輕鬆愉快的環境中探索和成長。保持現有的互動方式和活動安排，
                    同時也要注意平衡發展，確保孩子在各個領域都能獲得充分的鍛煉。`;
        } else if (dq >= 80) {
            return `根據本次評估，您的孩子在 <strong>${this.getAssessmentTypeLabel(this.assessmentData.assessmentType)}</strong> 領域發展 <strong>良好</strong>。
                    孩子的整體表現符合該年齡段的發展預期，大部分能力都已掌握。
                    建議在日常生活中多給孩子練習的機會，特別是在尚未完全掌握的項目上，
                    通過遊戲和互動的方式循序漸進地引導孩子提升。保持耐心和鼓勵，
                    相信孩子會有更好的進步。`;
        } else if (dq >= 70) {
            return `根據本次評估，您的孩子在 <strong>${this.getAssessmentTypeLabel(this.assessmentData.assessmentType)}</strong> 領域表現為 <strong>中等</strong>水平。
                    孩子已經掌握了基本能力，但還有提升的空間。建議您針對評估中未能完成的項目，
                    設計一些有趣的練習活動，每天安排固定的時間進行練習。
                    可以將練習融入到日常遊戲中，讓孩子在玩樂中自然地提升能力。
                    必要時可以尋求專業的早期教育指導。`;
        } else if (dq >= 60) {
            return `根據本次評估，您的孩子在 <strong>${this.getAssessmentTypeLabel(this.assessmentData.assessmentType)}</strong> 領域需要 <strong>更多關注</strong>。
                    孩子在某些項目上可能需要額外的練習和指導。建議您：
                    1) 每天安排專門的練習時間；2) 將目標分解為小步驟，循序漸進；
                    3) 給予充分的鼓勵和正面反饋。如果持續一段時間後仍未見明顯改善，
                    建議諮詢兒科醫生或發展專家，以獲得更專業的評估和指導方案。`;
        } else {
            return `根據本次評估，您的孩子在 <strong>${this.getAssessmentTypeLabel(this.assessmentData.assessmentType)}</strong> 領域表現 <strong>需要關注</strong>。
                    <span style="color: #dc3545; font-weight: bold;">我們強烈建議您盡快帶孩子前往醫療機構進行全面的發展評估。</span>
                    專業的兒科醫生或發展專家可以提供更詳細的檢查，並制定個性化的干預計劃。
                    早期發現和干預對孩子的發展至關重要。同時，請不要過度擔心，
                    在專業指導下，通過系統的訓練和家庭配合，孩子會有很大的進步空間。`;
        }
    }

    /**
     * Get answer rows array (for pagination)
     */
    static getAnswerRowsArray() {
        let questions = [];
        if (typeof AssessmentQuestions !== 'undefined' && AssessmentQuestions[this.assessmentData.assessmentType]) {
            questions = AssessmentQuestions[this.assessmentData.assessmentType];
        } else {
            questions = this.getDefaultQuestions();
        }

        const rows = [];
        questions.forEach((q, index) => {
            const answer = this.assessmentAnswers[q.id];
            const resultIcon = answer === 'yes' ? '✓' : '✗';
            const resultText = answer === 'yes' ? '做到' : '做不到';
            const resultColor = answer === 'yes' ? '#28a745' : '#dc3545';
            const bgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';

            const row = `
                <tr style="background: ${bgColor};">
                    <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center; font-size: 13px;">${index + 1}</td>
                    <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;">${q.question}</td>
                    <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">
                        <span style="background: ${resultColor}; color: white; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 12px;">${resultIcon} ${resultText}</span>
                    </td>
                </tr>
            `;
            rows.push(row);
        });

        return rows;
    }

    /**
     * Get answer details
     */
    static getAnswerDetails() {
        let questions = [];
        if (typeof AssessmentQuestions !== 'undefined' && AssessmentQuestions[this.assessmentData.assessmentType]) {
            questions = AssessmentQuestions[this.assessmentData.assessmentType];
        } else {
            questions = this.getDefaultQuestions();
        }
        
        let html = '<table style="width: 100%; border-collapse: collapse;">';
        html += `
            <tr style="background: #4285f4; color: white;">
                <th style="padding: 8px; border: 1px solid #dee2e6; text-align: center; width: 10%; font-size: 14px;">題號</th>
                <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left; font-size: 14px;">評估項目</th>
                <th style="padding: 8px; border: 1px solid #dee2e6; text-align: center; width: 15%; font-size: 14px;">結果</th>
            </tr>
        `;
        
        questions.forEach((q, index) => {
            const answer = this.assessmentAnswers[q.id];
            const resultIcon = answer === 'yes' ? '✓' : '✗';
            const resultText = answer === 'yes' ? '做到' : '做不到';
            const resultColor = answer === 'yes' ? '#28a745' : '#dc3545';
            const bgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
            
            html += `
                <tr style="background: ${bgColor};">
                    <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center; font-size: 13px;">${index + 1}</td>
                    <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 13px;">${q.question}</td>
                    <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">
                        <span style="background: ${resultColor}; color: white; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 12px;">
                            ${resultIcon} ${resultText}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        html += '</table>';
        return html;
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
