/**
 * 多人姿勢選擇模組
 * 
 * 提供點擊選擇（click-to-select）功能以配合多人姿勢偵測。
 * 使用「最接近質心（Closest Centroid）」追蹤演算法來跨影格保持對選擇對象的鎖定（因為 MediaPipe 不提供持久 ID）。
 * 
 * 功能：
 * - 多人偵測（最多 2 人）
 * - 點擊邊界框選擇
 * - 質心最近追蹤以維持選擇
 * - 選擇模式與追蹤模式的視覺回饋
 */
class MultiPersonSelector {
    /**
     * 初始化 MultiPersonSelector
     * 
     * @param {Object} config - 設定物件
     * @param {number} config.maxPersons - 最大偵測人數（預設: 2）
     * @param {string} config.selectionColor - 選擇模式邊界框的顏色（預設: '#0088ff'）
     * @param {string} config.lockedColor - 鎖定人物的顏色（預設: '#00ff00'）
     * @param {number} config.boundingBoxPadding - 邊界框周圍間距（預設: 20）
     * @param {number} config.trackingThreshold - 配對質心的最大距離（預設: 0.2）
     */
    constructor(config = {}) {
        this.config = {
            maxPersons: config.maxPersons || 2,
            selectionColor: config.selectionColor || '#0088ff',
            lockedColor: config.lockedColor || '#00ff00',
            boundingBoxPadding: config.boundingBoxPadding || 20,
            trackingThreshold: config.trackingThreshold || 0.2 // 正規化的距離門檻
        };
        
        // 狀態管理
        this.lockedTarget = null;  // 鎖定目標：{ index: 編號, centroid: {x, y}, boundingBox: {...} }
        this.isLocked = false;
        
        // 畫布與事件處理
        this.canvas = null;
        this.clickHandler = null;
        
        // 用於點擊匹配的最後偵測到的人
        this.lastDetectedPersons = []; 
        
        console.log('✅ MultiPersonSelector initialized');
    }
    
    /**
     * 將點擊處理器綁定到畫布以選擇人物
     * 
     * @param {HTMLCanvasElement} canvas - 要綁定點擊處理器的畫布元素
     * @param {Function} onSelect - 當人物被選取時的回呼
     */
    attachToCanvas(canvas, onSelect = null) {
        if (this.canvas && this.clickHandler) {
            this.canvas.removeEventListener('click', this.clickHandler);
        }
        
        this.canvas = canvas;
        this.onSelectCallback = onSelect;
        
        // 啟用畫布的指標事件以支援選擇
        canvas.style.pointerEvents = 'auto';
        canvas.style.cursor = 'pointer';
        
        this.clickHandler = (event) => this.handleCanvasClick(event);
        canvas.addEventListener('click', this.clickHandler);
        
        console.log('🖱️ Canvas click handler attached for person selection');
    }
    
    /**
     * Detach click handler from canvas
     */
    detachFromCanvas() {
        if (this.canvas && this.clickHandler) {
            this.canvas.removeEventListener('click', this.clickHandler);
            this.canvas.style.pointerEvents = 'none';
            this.canvas.style.cursor = 'default';
        }
        this.canvas = null;
        this.clickHandler = null;
    }
    
    /**
     * Handle canvas click event for person selection
     * 
     * @param {MouseEvent} event - Click event
     */
    handleCanvasClick(event) {
        if (this.isLocked) {
            console.log('🔒 目標已鎖定。使用 reset() 解鎖。');
            return;
        }
        
        if (this.lastDetectedPersons.length === 0) {
            console.log('⚠️ 尚無可選擇的人物偵測結果');
            return;
        }
        
        // 取得相對於畫布的點擊座標
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const clickX = (event.clientX - rect.left) * scaleX;
        const clickY = (event.clientY - rect.top) * scaleY;
        
        // 正規化為 0-1 範圍
        const normalizedX = clickX / this.canvas.width;
        const normalizedY = clickY / this.canvas.height;
        
        console.log(`🖱️ Click at normalized (${normalizedX.toFixed(3)}, ${normalizedY.toFixed(3)})`);
        
        // 檢查點擊是否在任何人的邊界框內
        for (let i = 0; i < this.lastDetectedPersons.length; i++) {
            const person = this.lastDetectedPersons[i];
            const bbox = person.boundingBox;
            
            if (this.isPointInBoundingBox(normalizedX, normalizedY, bbox)) {
                this.lockTarget(i, person);
                console.log(`✅ Person ${i} selected and locked`);
                
                if (this.onSelectCallback) {
                    this.onSelectCallback(i, person);
                }
                return;
            }
        }
        
        console.log('⚠️ Click was not inside any person\'s bounding box');
    }
    
    /**
     * Check if a point is inside a bounding box
     * 
     * @param {number} x - Normalized X coordinate (0-1)
     * @param {number} y - Normalized Y coordinate (0-1)
     * @param {Object} bbox - Bounding box {minX, minY, maxX, maxY}
     * @returns {boolean} True if point is inside bounding box
     */
    isPointInBoundingBox(x, y, bbox) {
        return x >= bbox.minX && x <= bbox.maxX && y >= bbox.minY && y <= bbox.maxY;
    }
    
    /**
     * Lock onto a target person
     * 
     * @param {number} index - Index of person in detection array
     * @param {Object} person - Person object with keypoints and boundingBox
     */
    lockTarget(index, person) {
        this.lockedTarget = {
            index: index,
            centroid: person.centroid,
            boundingBox: person.boundingBox,
            lastKeypoints: person.keypoints
        };
        this.isLocked = true;
        
        // 變更游標以顯示追蹤模式
        if (this.canvas) {
            this.canvas.style.cursor = 'crosshair';
        }
    }
    
    /**
     * Reset/unlock the current target
     */
    reset() {
        this.lockedTarget = null;
        this.isLocked = false;
        this.lastDetectedPersons = [];
        
        // 重設游標
        if (this.canvas) {
            this.canvas.style.cursor = 'pointer';
        }
        
        console.log('🔓 Target unlocked - Selection mode active');
    }
    
    /**
     * 處理偵測到的人並更新追蹤狀態
     * 此函式實作「最接近質心（Closest Centroid）」追蹤演算法
     * 
     * @param {Array} allPersonsKeypoints - 每位偵測到的人之關鍵點陣列
     * @returns {Object} 包含選中的人物或供選擇的所有人物之結果
     */
    processDetectedPersons(allPersonsKeypoints) {
        if (!allPersonsKeypoints || allPersonsKeypoints.length === 0) {
            return {
                mode: 'no-detection',
                persons: [],
                selectedPerson: null,
                selectedIndex: -1
            };
        }
        
        // 為每位偵測到的人計算邊界框與質心
        const personsWithMetadata = allPersonsKeypoints.map((keypoints, index) => {
            const bbox = this.calculateBoundingBox(keypoints);
            const centroid = this.calculateCentroid(keypoints);
            
            return {
                index: index,
                keypoints: keypoints,
                boundingBox: bbox,
                centroid: centroid
            };
        });
        
        // 儲存以供點擊偵測
        this.lastDetectedPersons = personsWithMetadata;
        
        // 選擇模式：尚未鎖定目標
        if (!this.isLocked || !this.lockedTarget) {
            return {
                mode: 'selection',
                persons: personsWithMetadata,
                selectedPerson: null,
                selectedIndex: -1
            };
        }
        
        // 追蹤模式：尋找先前鎖定質心的最近人物
        const previousCentroid = this.lockedTarget.centroid;
        let closestPerson = null;
        let closestDistance = Infinity;
        let closestIndex = -1;
        
        personsWithMetadata.forEach((person, index) => {
            const distance = this.calculateDistance(previousCentroid, person.centroid);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPerson = person;
                closestIndex = index;
            }
        });
        
        // 檢查最近的人是否在追蹤門檻內
        if (closestDistance > this.config.trackingThreshold) {
            console.warn(`⚠️ 追蹤到的人可能移動太遠（距離: ${closestDistance.toFixed(3)})`);
            // 仍會使用最近的人，但標記為可能已遺失
        }
        
        // 使用新質心更新鎖定目標
        if (closestPerson) {
            this.lockedTarget = {
                index: closestIndex,
                centroid: closestPerson.centroid,
                boundingBox: closestPerson.boundingBox,
                lastKeypoints: closestPerson.keypoints
            };
        }
        
        return {
            mode: 'tracking',
            persons: personsWithMetadata,
            selectedPerson: closestPerson,
            selectedIndex: closestIndex,
            trackingDistance: closestDistance
        };
    }
    
    /**
     * Calculate bounding box from keypoints
     * 
     * @param {Array} keypoints - Array of keypoint objects with x, y coordinates
     * @returns {Object} Bounding box {minX, minY, maxX, maxY} in normalized coordinates
     */
    calculateBoundingBox(keypoints) {
        if (!keypoints || keypoints.length === 0) {
            return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
        }
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        // 僅考慮具有可見性的關鍵點
        const visibleKeypoints = keypoints.filter(kp => 
            kp && (kp.visibility === undefined || kp.visibility > 0.3)
        );
        
        if (visibleKeypoints.length === 0) {
            return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
        }
        
        visibleKeypoints.forEach(kp => {
            if (kp.x < minX) minX = kp.x;
            if (kp.y < minY) minY = kp.y;
            if (kp.x > maxX) maxX = kp.x;
            if (kp.y > maxY) maxY = kp.y;
        });
        
        // 加上內距（正規化座標）
        const padding = this.config.boundingBoxPadding / 1000; // 近似的正規化內距
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(1, maxX + padding);
        maxY = Math.min(1, maxY + padding);
        
        return { minX, minY, maxX, maxY };
    }
    
    /**
     * Calculate centroid (center point) from keypoints
     * 
     * @param {Array} keypoints - Array of keypoint objects with x, y coordinates
     * @returns {Object} Centroid {x, y} in normalized coordinates
     */
    calculateCentroid(keypoints) {
        if (!keypoints || keypoints.length === 0) {
            return { x: 0.5, y: 0.5 };
        }
        
        // 使用核心身體點以取得較穩定的質心：臀部與肩膀
        // MediaPipe 索引：11=left_shoulder, 12=right_shoulder, 23=left_hip, 24=right_hip
        const coreIndices = [11, 12, 23, 24];
        const corePoints = coreIndices
            .map(i => keypoints[i])
            .filter(kp => kp && kp.visibility !== undefined && kp.visibility > 0.3);
        
        // 若有核心點則使用，否則使用所有可見點
        const pointsToUse = corePoints.length >= 2 ? corePoints : 
            keypoints.filter(kp => kp && (kp.visibility === undefined || kp.visibility > 0.3));
        
        if (pointsToUse.length === 0) {
            return { x: 0.5, y: 0.5 };
        }
        
        const sumX = pointsToUse.reduce((sum, kp) => sum + kp.x, 0);
        const sumY = pointsToUse.reduce((sum, kp) => sum + kp.y, 0);
        
        return {
            x: sumX / pointsToUse.length,
            y: sumY / pointsToUse.length
        };
    }
    
    /**
     * Calculate Euclidean distance between two points
     * 
     * @param {Object} p1 - First point {x, y}
     * @param {Object} p2 - Second point {x, y}
     * @returns {number} Euclidean distance
     */
    calculateDistance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * 在畫布上繪製選擇 UI
     * 
     * @param {CanvasRenderingContext2D} ctx - 畫布上下文
     * @param {number} canvasWidth - 畫布寬度（像素）
     * @param {number} canvasHeight - 畫布高度（像素）
     * @param {Object} processingResult - processDetectedPersons 的結果
     */
    drawSelectionUI(ctx, canvasWidth, canvasHeight, processingResult) {
        if (!processingResult || processingResult.mode === 'no-detection') {
            return;
        }
        
        const { mode, persons, selectedIndex } = processingResult;
        
        if (mode === 'selection') {
            // 選擇模式：在所有人物周圍繪製藍色邊界框
            persons.forEach((person, index) => {
                this.drawBoundingBox(
                    ctx, 
                    person.boundingBox, 
                    canvasWidth, 
                    canvasHeight,
                    this.config.selectionColor,
                    `Person ${index + 1} - Click to select`
                );
            });
            
            // 繪製操作指引文字
            this.drawInstruction(ctx, canvasWidth, canvasHeight, 
                `${persons.length} person(s) detected. Click on a person to select.`);
        } else if (mode === 'tracking') {
            // 追蹤模式：僅在選取的人周圍繪製綠色邊界框
            if (selectedIndex >= 0 && persons[selectedIndex]) {
                this.drawBoundingBox(
                    ctx,
                    persons[selectedIndex].boundingBox,
                    canvasWidth,
                    canvasHeight,
                    this.config.lockedColor,
                    `Tracking Person ${selectedIndex + 1}`
                );
            }
        }
    }
    
    /**
     * 在畫布上繪製邊界框
     * 
     * @param {CanvasRenderingContext2D} ctx - 畫布上下文
     * @param {Object} bbox - 邊界框 {minX, minY, maxX, maxY}（正規化座標）
     * @param {number} canvasWidth - 畫布寬度
     * @param {number} canvasHeight - 畫布高度
     * @param {string} color - 邊框顏色
     * @param {string} label - 標籤文字
     */
    drawBoundingBox(ctx, bbox, canvasWidth, canvasHeight, color, label = '') {
        const x = bbox.minX * canvasWidth;
        const y = bbox.minY * canvasHeight;
        const width = (bbox.maxX - bbox.minX) * canvasWidth;
        const height = (bbox.maxY - bbox.minY) * canvasHeight;
        
        // 繪製邊框
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);
        
        // 繪製標籤背景
        if (label) {
            ctx.font = 'bold 14px Arial';
            const textWidth = ctx.measureText(label).width;
            const padding = 6;
            
            ctx.fillStyle = color;
            ctx.fillRect(x, y - 24, textWidth + padding * 2, 22);
            
            // 繪製標籤文字
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, x + padding, y - 8);
        }
        
        // 繪製角落標記以提升可見性
        const cornerSize = 15;
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
        
        // 左上角
        ctx.beginPath();
        ctx.moveTo(x, y + cornerSize);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerSize, y);
        ctx.stroke();
        
        // 右上角
        ctx.beginPath();
        ctx.moveTo(x + width - cornerSize, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width, y + cornerSize);
        ctx.stroke();
        
        // 左下角
        ctx.beginPath();
        ctx.moveTo(x, y + height - cornerSize);
        ctx.lineTo(x, y + height);
        ctx.lineTo(x + cornerSize, y + height);
        ctx.stroke();
        
        // 右下角
        ctx.beginPath();
        ctx.moveTo(x + width - cornerSize, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x + width, y + height - cornerSize);
        ctx.stroke();
    }
    
    /**
     * 在畫布上繪製指示文字
     * 
     * @param {CanvasRenderingContext2D} ctx - 畫布上下文
     * @param {number} canvasWidth - 畫布寬度
     * @param {number} canvasHeight - 畫布高度
     * @param {string} text - 指示文字
     */
    drawInstruction(ctx, canvasWidth, canvasHeight, text) {
        ctx.font = 'bold 16px Arial';
        const textWidth = ctx.measureText(text).width;
        const x = (canvasWidth - textWidth) / 2;
        const y = canvasHeight - 30;
        
        // 繪製背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 10, y - 20, textWidth + 20, 30);
        
        // 繪製文字
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, x, y);
    }
    
    /**
     * 取得目前狀態
     * 
     * @returns {Object} 目前的 selector 狀態
     */
    getState() {
        return {
            isLocked: this.isLocked,
            lockedTarget: this.lockedTarget,
            detectedPersonsCount: this.lastDetectedPersons.length
        };
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.detachFromCanvas();
        this.reset();
        console.log('🧹 MultiPersonSelector destroyed');
    }
}

// 匯出供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiPersonSelector;
}