// 評估配置文件

const AssessmentConfig = {
    // 評估類別配置
    categories: [
        {
            id: 'gross_motor_0_6',
            name: '大運動評估 (0-6個月)',
            nameEn: '大運動評估 (0-6個月)',
            description: '評估嬰兒基本大運動能力',
            descriptionEn: '評估嬰兒基本大運動能力',
            icon: '👶',
            color: '#FF6B9D',
            ageRange: '0-6 個月',
            questionCount: 10,
            enabled: true
        },
        {
            id: 'gross_motor_6_12',
            name: '大運動評估 (6-12個月)',
            nameEn: '大運動評估 (6-12個月)',
            description: '評估嬰兒進階大運動能力',
            descriptionEn: '評估嬰兒進階大運動能力',
            icon: '🚼',
            color: '#4ECDC4',
            ageRange: '6-12 個月',
            questionCount: 10,
            enabled: true
        },
        {
            id: 'fine_motor_12_24',
            name: '精細動作評估 (12-24個月)',
            nameEn: '精細動作評估 (12-24個月)',
            description: '評估幼兒精細動作發展',
            descriptionEn: '評估幼兒精細動作發展',
            icon: '✋',
            color: '#FFD93D',
            ageRange: '12-24 個月',
            questionCount: 10,
            enabled: true
        },
        {
            id: 'language_12_24',
            name: '語言發展評估 (12-24個月)',
            nameEn: '語言發展評估 (12-24個月)',
            description: '評估幼兒語言能力',
            descriptionEn: '評估幼兒語言能力',
            icon: '💬',
            color: '#A8E6CF',
            ageRange: '12-24 個月',
            questionCount: 10,
            enabled: true
        },
        {
            id: 'social_24_36',
            name: '社交能力評估 (24-36個月)',
            nameEn: '社交能力評估 (24-36個月)',
            description: '評估兒童社交互動能力',
            descriptionEn: '評估兒童社交互動能力',
            icon: '👥',
            color: '#FFB6B9',
            ageRange: '24-36 個月',
            questionCount: 10,
            enabled: true
        },
        {
            id: 'cognitive_36_48',
            name: '認知發展評估 (36-48個月)',
            nameEn: '認知發展評估 (36-48個月)',
            description: '評估兒童認知能力',
            descriptionEn: '評估兒童認知能力',
            icon: '🧠',
            color: '#C7CEEA',
            ageRange: '36-48 個月',
            questionCount: 10,
            enabled: true
        }
    ],

    // 獲取所有啟用的評估類別
    getEnabledCategories() {
        return this.categories.filter(cat => cat.enabled);
    },

    // 根據ID獲取評估類別
    getCategoryById(id) {
        return this.categories.find(cat => cat.id === id);
    },

    // 根據年齡推薦評估
    recommendByAge(ageInMonths) {
        return this.categories.filter(cat => {
            const [min, max] = cat.ageRange.split('-').map(s => parseInt(s));
            return ageInMonths >= min && ageInMonths <= max;
        });
    }
};

// 導出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssessmentConfig;
}
