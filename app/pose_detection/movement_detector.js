/**
 * 動作偵測模組 (Movement Detector)
 * 
 * 此模組使用 ActionDetector 偵測固定動作/姿勢。
 * 支援即時偵測並顯示結果。
 * 
 * 可偵測的動作包括：
 * - 手臂動作：舉手、T字姿勢、雙手叉腰等
 * - 腿部動作：抬腿、深蹲、跪姿等
 * - 身體動作：彎腰、傾斜、扭轉等
 * - 頭部動作：轉頭、點頭、抬頭等
 * - 組合動作：開合跳、勝利姿勢等
 */

class MovementDetector {
    /**
     * 使用設定初始化 MovementDetector
     * 
     * @param {Object} config - 設定物件
     * @param {number} config.confidenceThreshold - 報告動作的最小信心值（預設: 0.5）
     * @param {boolean} config.enableSmoothing - 啟用信心度平滑化（預設: true）
     * @param {number} config.smoothingFrames - 平滑化影格數（預設: 3）
     * @param {string} config.language - 顯示語言（預設: 'zh'）
     */
    constructor(config = {}) {
        this.config = {
            confidenceThreshold: config.confidenceThreshold !== undefined ? config.confidenceThreshold : 0.5,
            enableSmoothing: config.enableSmoothing !== false,
            smoothingFrames: config.smoothingFrames || 3,
            language: config.language || 'zh'
        };

        // 固定動作偵測器
        this.actionDetector = null;
        this.descriptorGenerator = null;

        // 最新偵測結果
        this.lastActions = [];

        // 初始化
        this.initialize();
    }

    /**
     * 初始化偵測系統
     */
    initialize() {
        // 初始化 ActionDetector
        if (typeof ActionDetector !== 'undefined') {
            this.actionDetector = new ActionDetector({
                confidenceThreshold: this.config.confidenceThreshold,
                enableSmoothing: this.config.enableSmoothing,
                smoothingFrames: this.config.smoothingFrames
            });
            console.log('✅ MovementDetector: ActionDetector initialized');
        } else {
            console.error('❌ MovementDetector: ActionDetector not available');
        }

        // 初始化描述生成器
        if (typeof MovementDescriptorGenerator !== 'undefined') {
            this.descriptorGenerator = new MovementDescriptorGenerator({
                language: this.config.language,
                showIcon: true
            });
        }
    }

    /**
     * 偵測動作
     * 
     * @param {Array<Object>} keypoints - 關鍵點陣列 (含 x, y, z, visibility)
     * @returns {Object} 偵測結果 { actions, primaryAction, summary }
     */
    detectMovements(keypoints) {
        // 處理空或無效的關鍵點
        if (!keypoints || keypoints.length === 0) {
            return { actions: [], fixedActions: [], primaryAction: null, summary: '' };
        }

        // 過濾低可見度關鍵點
        const validKeypoints = keypoints.filter(kp => kp && kp.visibility > 0.1);
        if (validKeypoints.length < 10) {
            console.warn('⚠️ 可見關鍵點不足，無法進行動作偵測');
            return { actions: [], fixedActions: [], primaryAction: null, summary: '' };
        }

        // 偵測動作
        let actions = [];
        if (this.actionDetector) {
            actions = this.actionDetector.detectActions(keypoints);
            this.lastActions = actions;
        }

        // 生成摘要
        let summary = '';
        let primaryAction = null;
        if (this.descriptorGenerator && actions.length > 0) {
            summary = this.descriptorGenerator.generateSummary(actions);
            primaryAction = this.descriptorGenerator.getPrimaryAction(actions);
        }

        return {
            actions: actions,
            fixedActions: actions,  // Alias for backward compatibility
            primaryAction: primaryAction,
            summary: summary
        };
    }

    /**
     * 只偵測動作（不更新顯示）
     * 
     * @param {Array<Object>} keypoints - 關鍵點陣列
     * @returns {Array<Object>} 動作陣列
     */
    detectActionsOnly(keypoints) {
        if (!this.actionDetector || !keypoints || keypoints.length === 0) {
            return [];
        }

        return this.actionDetector.detectActions(keypoints);
    }

    /**
     * 取得最後偵測到的動作
     */
    getLastActions() {
        return this.lastActions;
    }

    /**
     * 取得所有可偵測的動作定義
     */
    getActionDefinitions() {
        if (this.actionDetector) {
            return this.actionDetector.getActionDefinitions();
        }
        return [];
    }

    /**
     * 依類別取得動作定義
     */
    getActionsByCategory(category) {
        if (this.actionDetector) {
            return this.actionDetector.getActionsByCategory(category);
        }
        return [];
    }

    /**
     * 設定語言
     */
    setLanguage(language) {
        this.config.language = language;
        if (this.descriptorGenerator) {
            this.descriptorGenerator.setLanguage(language);
        }
    }

    /**
     * 更新設定
     */
    updateConfig(newConfig) {
        if (newConfig.confidenceThreshold !== undefined) {
            this.config.confidenceThreshold = newConfig.confidenceThreshold;
            if (this.actionDetector) {
                this.actionDetector.config.confidenceThreshold = newConfig.confidenceThreshold;
            }
        }
        if (newConfig.language !== undefined) {
            this.setLanguage(newConfig.language);
        }
    }

    /**
     * 取得設定
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * 清除歷史
     */
    clearHistory() {
        this.lastActions = [];
        if (this.actionDetector) {
            this.actionDetector.clearHistory();
        }
    }

    /**
     * 銷毀偵測器
     */
    destroy() {
        this.clearHistory();
        this.actionDetector = null;
        this.descriptorGenerator = null;
    }
}

// 匯出供其他模組使用
window.MovementDetector = MovementDetector;
