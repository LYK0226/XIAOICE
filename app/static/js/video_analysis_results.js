/**
 * Video Analysis Results Configuration
 * 
 * Easy-to-manage mapping of video filenames to their analysis results.
 * Add new entries here without touching the main video_management.js code.
 * 
 * Structure:
 * - key: filename pattern (case-insensitive, partial match)
 * - value: HTML content for analysis result
 */

const VIDEO_ANALYSIS_RESULTS = {
    // Example video results - customize these
    /** filename */
    '拍手掌demo video': `
        <h3>✅ 分析完成：示範影片</h3>
        <p><strong>影片類型：</strong>教學示範</p>
        <p><strong>重點摘要：</strong>小朋友需要對著鏡頭做出要求的動作</p>
        <p><strong>優點：</strong></p>
        <ul>
            <li>節奏很好</li>
            <li>步驟完整</li>
            <li>沒有冗餘內容</li>
        </ul>
        <p><strong>建議改進：</strong>目前步驟完整，可依操作複雜度調整節奏。</p>
    `,

    'aaa': `
        <h3>✅ 分析完成：教學影片</h3>
        <p><strong>影片類型：</strong>教學內容</p>
        <p><strong>重點摘要：</strong>詳細的教學內容，適合初學者學習。</p>
        <p><strong>優點：</strong></p>
        <ul>
            <li>內容結構清晰</li>
            <li>重點突出</li>
            <li>實例豐富</li>
        </ul>
        <p><strong>目標受眾：</strong>初學者到中級用戶</p>
    `,

    'presentation': `
        <h3>✅ 分析完成：簡報影片</h3>
        <p><strong>影片類型：</strong>演示簡報</p>
        <p><strong>重點摘要：</strong>專業的商業簡報內容，邏輯清晰。</p>
        <p><strong>優點：</strong></p>
        <ul>
            <li>簡報設計專業</li>
            <li>數據可視化效果好</li>
            <li>演講節奏適當</li>
        </ul>
        <p><strong>建議：</strong>可以增加互動環節，提高觀眾參與度。</p>
    `,

    'video-test01': `
        <h3>✅ 分析完成：訪談影片</h3>
        <p><strong>影片類型：</strong>人物訪談</p>
        <p><strong>重點摘要：</strong>深入的訪談內容，涵蓋了關鍵話題。</p>
        <p><strong>訪談亮點：</strong></p>
        <ul>
            <li>問題設計精準</li>
            <li>受訪者回答詳實</li>
            <li>氛圍輕鬆自然</li>
        </ul>
        <p><strong>後期建議：</strong>可以添加關鍵字幕，方便觀眾快速定位重點。</p>
    `,

    // Default result for unmatched videos
    'default': `
        <h3>✅ 分析完成</h3>
        <p><strong>影片類型：</strong>一般影片</p>
        <p><strong>重點摘要：</strong>影片內容清晰，整體品質良好。</p>
        <p><strong>技術評估：</strong></p>
        <ul>
            <li>畫面品質：良好</li>
            <li>音訊品質：清晰</li>
            <li>內容完整度：完整</li>
        </ul>
        <p><strong>建議：</strong></p>
        <ul>
            <li>保持良好的拍攝環境</li>
            <li>確保聲音清晰</li>
            <li>注意鏡頭穩定性</li>
        </ul>
        <p><strong>下一步：</strong>你可以繼續上載其他影片進行分析。</p>
    `
};

/**
 * Get analysis result for a given filename
 * @param {string} filename - The video filename (can be original or processed)
 * @returns {string} HTML content for the analysis result
 */
function getAnalysisResult(filename) {
    if (!filename) {
        return VIDEO_ANALYSIS_RESULTS['default'];
    }

    // Normalize filename: lowercase and remove extension
    const normalizedName = filename.toLowerCase().replace(/\.[^/.]+$/, '');

    // Try to find a matching result (partial match)
    for (const [key, result] of Object.entries(VIDEO_ANALYSIS_RESULTS)) {
        if (key === 'default') continue;
        
        // Check if the key is contained in the filename
        if (normalizedName.includes(key.toLowerCase())) {
            return result;
        }
    }

    // Return default if no match found
    return VIDEO_ANALYSIS_RESULTS['default'];
}

// Export for use in video_management.js
window.getAnalysisResult = getAnalysisResult;
window.VIDEO_ANALYSIS_RESULTS = VIDEO_ANALYSIS_RESULTS;
