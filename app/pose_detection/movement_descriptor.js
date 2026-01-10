/**
 * 動作描述產生模組 (Movement Descriptor)
 * 
 * 此模組將偵測到的固定動作轉換為顯示格式。
 * 支援多語言（中文/英文）和自訂顯示選項。
 */

class MovementDescriptorGenerator {
    /**
     * 初始化
     * @param {Object} config - 設定物件
     */
    constructor(config = {}) {
        this.config = {
            language: config.language || 'zh',
            showIcon: config.showIcon !== false
        };

        // 類別名稱
        this.categoryNames = {
            'arm': { en: 'Arms', zh: '手臂' },
            'leg': { en: 'Legs', zh: '腿部' },
            'torso': { en: 'Body', zh: '身體' },
            'head': { en: 'Head', zh: '頭部' },
            'combo': { en: 'Combo', zh: '組合' }
        };

        // 類別顏色
        this.categoryColors = {
            'arm': '#4CAF50',
            'leg': '#2196F3',
            'torso': '#FF9800',
            'head': '#9C27B0',
            'combo': '#E91E63'
        };
    }

    /**
     * 設定語言
     */
    setLanguage(language) {
        this.config.language = language;
    }

    /**
     * 格式化固定動作
     * 
     * 將 ActionDetector 偵測到的動作格式化為顯示用格式
     * 
     * @param {Array<Object>} actions - ActionDetector 回傳的動作陣列
     * @returns {Array<Object>} 格式化後的動作
     */
    formatActions(actions) {
        if (!actions || actions.length === 0) {
            return [];
        }

        return actions.map(action => {
            const name = this.config.language === 'zh' ? action.nameZh : action.name;
            const iconPrefix = this.config.showIcon ? `${action.icon} ` : '';

            return {
                id: action.id,
                name: action.name,
                nameZh: action.nameZh,
                category: action.category,
                categoryName: this.getCategoryName(action.category),
                categoryColor: this.getCategoryColor(action.category),
                icon: action.icon,
                descriptor: `${iconPrefix}${name}`,
                confidence: action.confidence,
                confidencePercent: Math.round(action.confidence * 100),
                timestamp: action.timestamp
            };
        });
    }

    /**
     * 取得類別名稱
     */
    getCategoryName(category) {
        const names = this.categoryNames[category];
        if (names) {
            return this.config.language === 'zh' ? names.zh : names.en;
        }
        return category;
    }

    /**
     * 取得類別顏色
     */
    getCategoryColor(category) {
        return this.categoryColors[category] || '#667eea';
    }

    /**
     * 生成動作摘要
     * 
     * @param {Array<Object>} actions - 偵測到的動作
     * @param {number} maxActions - 最大動作數
     * @returns {string} 摘要文字
     */
    generateSummary(actions, maxActions = 3) {
        if (!actions || actions.length === 0) {
            return this.config.language === 'zh' ? '未偵測到動作' : 'No action detected';
        }

        const topActions = actions.slice(0, maxActions);
        const names = topActions.map(a => {
            const name = this.config.language === 'zh' ? a.nameZh : a.name;
            return this.config.showIcon ? `${a.icon} ${name}` : name;
        });

        if (names.length === 1) {
            return names[0];
        } else if (names.length === 2) {
            const connector = this.config.language === 'zh' ? ' 和 ' : ' and ';
            return `${names[0]}${connector}${names[1]}`;
        } else {
            const last = names.pop();
            const connector = this.config.language === 'zh' ? '，和 ' : ', and ';
            return `${names.join(', ')}${connector}${last}`;
        }
    }

    /**
     * 取得主要動作
     * 
     * @param {Array<Object>} actions - 動作陣列
     * @returns {Object|null} 主要動作或 null
     */
    getPrimaryAction(actions) {
        if (!actions || actions.length === 0) {
            return null;
        }
        return actions[0]; // Actions are already sorted by confidence
    }

    /**
     * 依類別分組動作
     * 
     * @param {Array<Object>} actions - 動作陣列
     * @returns {Object} 依類別分組的動作
     */
    groupActionsByCategory(actions) {
        const grouped = {
            arm: [],
            leg: [],
            torso: [],
            head: [],
            combo: []
        };

        actions.forEach(action => {
            if (grouped[action.category]) {
                grouped[action.category].push(action);
            }
        });

        return grouped;
    }

    /**
     * 生成 HTML 顯示
     * 
     * @param {Array<Object>} actions - 動作陣列
     * @param {Object} options - 顯示選項
     * @returns {string} HTML 字串
     */
    generateHTML(actions, options = {}) {
        const {
            showConfidence = true,
            showIcon = true,
            showCategory = true,
            maxActions = 5
        } = options;

        if (!actions || actions.length === 0) {
            const noAction = this.config.language === 'zh' ? '未偵測到動作' : 'No action detected';
            return `<div class="no-action">${noAction}</div>`;
        }

        const displayActions = actions.slice(0, maxActions);
        
        return displayActions.map(action => {
            const name = this.config.language === 'zh' ? action.nameZh : action.name;
            const confidence = Math.round(action.confidence * 100);
            const categoryColor = this.getCategoryColor(action.category);
            const categoryName = this.getCategoryName(action.category);
            
            return `
                <div class="action-item" data-category="${action.category}" style="border-left: 3px solid ${categoryColor};">
                    ${showIcon ? `<span class="action-icon">${action.icon}</span>` : ''}
                    <span class="action-name">${name}</span>
                    ${showCategory ? `<span class="action-category" style="color: ${categoryColor};">${categoryName}</span>` : ''}
                    ${showConfidence ? `<span class="action-confidence">${confidence}%</span>` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * 計算動作統計
     * 
     * @param {Array<Object>} actions - 動作陣列
     * @returns {Object} 統計資料
     */
    calculateStats(actions) {
        const stats = {
            total: actions.length,
            byCategory: {
                arm: 0,
                leg: 0,
                torso: 0,
                head: 0,
                combo: 0
            },
            averageConfidence: 0,
            highConfidenceCount: 0
        };

        if (actions.length === 0) {
            return stats;
        }

        let totalConfidence = 0;

        actions.forEach(action => {
            // 按類別統計
            if (stats.byCategory.hasOwnProperty(action.category)) {
                stats.byCategory[action.category]++;
            }

            // 信心度統計
            totalConfidence += action.confidence;
            if (action.confidence >= 0.8) {
                stats.highConfidenceCount++;
            }
        });

        stats.averageConfidence = totalConfidence / actions.length;

        return stats;
    }

    /**
     * 取得信心度等級
     */
    getConfidenceLevel(confidence) {
        if (confidence >= 0.8) return { level: 'high', color: '#4CAF50' };
        if (confidence >= 0.6) return { level: 'medium', color: '#FFC107' };
        return { level: 'low', color: '#FF5722' };
    }
}

// 匯出供其他模組使用
window.MovementDescriptorGenerator = MovementDescriptorGenerator;