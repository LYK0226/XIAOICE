/**
 * 動作分析模組 (Movement Analyzers)
 * 
 * 此模組現已整合 ActionDetector，專注於固定動作偵測。
 * 
 * 支援的固定動作類別：
 * - 手臂動作（舉手、T字姿勢、雙手叉腰等）
 * - 腿部動作（抬腿、深蹲、跪姿等）
 * - 身體動作（彎腰、傾斜、扭轉等）
 * - 頭部動作（轉頭、點頭、抬頭等）
 * - 組合動作（開合跳、勝利姿勢等）
 */

/**
 * 固定動作分析器
 * 
 * 整合 ActionDetector 提供固定姿勢偵測功能。
 */
class FixedActionAnalyzer {
    constructor(config = {}) {
        this.config = {
            confidenceThreshold: config.confidenceThreshold || 0.5,
            enableSmoothing: config.enableSmoothing !== false,
            smoothingFrames: config.smoothingFrames || 3,
            language: config.language || 'zh'
        };

        this.actionDetector = null;
        this.lastDetectedActions = [];

        this.initActionDetector();
    }

    /**
     * 初始化 ActionDetector
     */
    initActionDetector() {
        if (typeof ActionDetector !== 'undefined') {
            this.actionDetector = new ActionDetector({
                confidenceThreshold: this.config.confidenceThreshold,
                enableSmoothing: this.config.enableSmoothing,
                smoothingFrames: this.config.smoothingFrames
            });
            console.log('✅ FixedActionAnalyzer: ActionDetector initialized');
        } else {
            console.warn('⚠️ FixedActionAnalyzer: ActionDetector not loaded');
        }
    }

    /**
     * 分析固定動作
     * 
     * @param {Array<Object>} keypoints - 當前畫面關鍵點
     * @returns {Array<Object>} 偵測到的固定動作
     */
    analyze(keypoints) {
        if (!this.actionDetector) {
            this.initActionDetector();
        }

        if (!this.actionDetector || !keypoints || keypoints.length === 0) {
            return [];
        }

        // 使用 ActionDetector 偵測動作
        const detectedActions = this.actionDetector.detectActions(keypoints);
        this.lastDetectedActions = detectedActions;

        return detectedActions;
    }

    /**
     * 取得最後偵測到的動作
     */
    getLastDetectedActions() {
        return this.lastDetectedActions;
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
<<<<<<< HEAD
     * 依類別取得動作
     */
    getActionsByCategory(category) {
        if (this.actionDetector) {
            return this.actionDetector.getActionsByCategory(category);
        }
        return [];
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
            this.config.language = newConfig.language;
        }
    }

    /**
     * 清除歷史
     */
    clearHistory() {
        this.lastDetectedActions = [];
        if (this.actionDetector) {
            this.actionDetector.clearHistory();
        }
    }
}

// 匯出供其他模組使用
window.FixedActionAnalyzer = FixedActionAnalyzer;

