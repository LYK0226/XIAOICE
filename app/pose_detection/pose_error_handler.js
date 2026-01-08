/**
 * 姿勢錯誤處理模組
 * 
 * 為姿勢偵測系統提供集中式錯誤處理。
 * 處理相機權限、MediaPipe 模型載入與執行時錯誤。
 */

class PoseErrorHandler {
    constructor() {
        this.errorCallbacks = [];
        this.lastError = null;
    }

    /**
     * Register error callback
     * 
     * @param {Function} callback - Function to call when error occurs
     */
    onError(callback) {
        if (typeof callback === 'function') {
            this.errorCallbacks.push(callback);
        }
    }

    /**
     * Handle camera permission errors
     * 
     * @param {Error} error - Camera permission error
     * @returns {Object} User-friendly error object
     */
    handleCameraError(error) {
        let userMessage = '';
        let errorCode = 'CAMERA_ERROR';
        let suggestions = [];

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorCode = 'CAMERA_PERMISSION_DENIED';
            userMessage = '攝影機存取被拒。請在瀏覽器設定中允許攝影機權限。';
            suggestions = [
                '點選瀏覽器網址列的相機圖示',
                '選擇「允許」以開啟攝影機存取',
                '重新整理頁面後再試一次'
            ];
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorCode = 'CAMERA_NOT_FOUND';
            userMessage = 'No camera found. Please connect a camera and try again.';
            suggestions = [
                'Check if your camera is properly connected',
                'Try a different USB port',
                'Restart your browser'
            ];
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorCode = 'CAMERA_IN_USE';
            userMessage = 'Camera is already in use by another application.';
            suggestions = [
                'Close other applications using the camera',
                'Close other browser tabs using the camera',
                'Restart your browser'
            ];
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            errorCode = 'CAMERA_CONSTRAINTS_ERROR';
            userMessage = 'Camera does not support the required settings.';
            suggestions = [
                'Try using a different camera',
                'Update your camera drivers'
            ];
        } else if (error.name === 'TypeError') {
            errorCode = 'CAMERA_NOT_SUPPORTED';
            userMessage = 'Camera access is not supported in this browser.';
            suggestions = [
                'Use a modern browser (Chrome, Firefox, Edge, Safari)',
                'Make sure you are using HTTPS or localhost'
            ];
        } else {
            errorCode = 'CAMERA_UNKNOWN_ERROR';
            userMessage = 'Failed to access camera. Please try again.';
            suggestions = [
                'Refresh the page',
                'Try a different browser',
                'Check your camera settings'
            ];
        }

        const errorObj = {
            code: errorCode,
            message: userMessage,
            suggestions: suggestions,
            originalError: error,
            timestamp: Date.now()
        };

        this.lastError = errorObj;
        this.notifyCallbacks(errorObj);

        return errorObj;
    }

    /**
     * Handle MediaPipe model load errors
     * 
     * @param {Error} error - Model loading error
     * @returns {Object} User-friendly error object
     */
    handleModelLoadError(error) {
        let userMessage = '';
        let errorCode = 'MODEL_LOAD_ERROR';
        let suggestions = [];

        if (error.code === 'MEDIAPIPE_NOT_LOADED') {
            errorCode = 'MEDIAPIPE_NOT_LOADED';
            userMessage = '姿勢偵測函式庫載入失敗。請檢查您的網路連線。';
            suggestions = [
                '檢查網路連線',
                '重新整理頁面',
                '稍後再試'
            ];
        } else if (error.code === 'NETWORK_ERROR' || (error.message && error.message.includes('network'))) {
            errorCode = 'NETWORK_ERROR';
            userMessage = 'Network error while loading pose detection model.';
            suggestions = [
                'Check your internet connection',
                'Disable VPN or proxy if enabled',
                'Try again in a few moments'
            ];
        } else if (error.message && error.message.includes('CORS')) {
            errorCode = 'CORS_ERROR';
            userMessage = 'Failed to load pose detection model due to security restrictions.';
            suggestions = [
                'Refresh the page',
                'Clear your browser cache',
                'Contact support if the issue persists'
            ];
        } else {
            errorCode = 'MODEL_LOAD_UNKNOWN';
            userMessage = 'Failed to initialize pose detection. Please try again.';
            suggestions = [
                'Refresh the page',
                'Clear your browser cache',
                'Try a different browser'
            ];
        }

        const errorObj = {
            code: errorCode,
            message: userMessage,
            suggestions: suggestions,
            originalError: error,
            timestamp: Date.now()
        };

        this.lastError = errorObj;
        this.notifyCallbacks(errorObj);

        return errorObj;
    }

    /**
     * Handle pose detection runtime errors
     * 
     * @param {Error} error - Runtime error
     * @returns {Object} User-friendly error object
     */
    handleDetectionError(error) {
        let userMessage = '';
        let errorCode = 'DETECTION_ERROR';
        let suggestions = [];

        if (error.code === 'NOT_INITIALIZED') {
            errorCode = 'NOT_INITIALIZED';
            userMessage = 'Pose detector not initialized. Please restart detection.';
            suggestions = [
                'Click "Stop Detection" and then "Start Detection"',
                'Refresh the page if the issue persists'
            ];
        } else if (error.code === 'INVALID_VIDEO_ELEMENT') {
            errorCode = 'INVALID_VIDEO_ELEMENT';
            userMessage = 'Video stream error. Please restart detection.';
            suggestions = [
                'Stop and restart detection',
                'Refresh the page'
            ];
        } else if (error.message && error.message.includes('memory')) {
            errorCode = 'MEMORY_ERROR';
            userMessage = 'Insufficient memory for pose detection.';
            suggestions = [
                'Close other browser tabs',
                'Close other applications',
                'Restart your browser'
            ];
        } else {
            errorCode = 'DETECTION_UNKNOWN';
            userMessage = 'An error occurred during pose detection.';
            suggestions = [
                'Try restarting detection',
                'Refresh the page',
                'Check console for details'
            ];
        }

        const errorObj = {
            code: errorCode,
            message: userMessage,
            suggestions: suggestions,
            originalError: error,
            timestamp: Date.now()
        };

        this.lastError = errorObj;
        this.notifyCallbacks(errorObj);

        return errorObj;
    }

    /**
     * Handle no pose detected scenario
     * 
     * @returns {Object} Info object (not an error)
     */
    handleNoPoseDetected() {
        const infoObj = {
            code: 'NO_POSE_DETECTED',
            message: '畫面中未偵測到任何人。',
            suggestions: [
                '確保您在攝影機可視範圍內',
                '確保良好光線',
                '靠近攝影機',
                '確認攝影機方向對準您'
            ],
            severity: 'info',
            timestamp: Date.now()
        };

        return infoObj;
    }

    /**
     * Handle low confidence detection
     * 
     * @param {number} confidence - Detection confidence score
     * @returns {Object} Warning object
     */
    handleLowConfidence(confidence) {
        const warningObj = {
            code: 'LOW_CONFIDENCE',
            message: `Low detection confidence (${Math.round(confidence * 100)}%).`,
            suggestions: [
                'Improve lighting conditions',
                'Move to a less cluttered background',
                'Ensure your full body is visible',
                'Avoid rapid movements'
            ],
            severity: 'warning',
            confidence: confidence,
            timestamp: Date.now()
        };

        return warningObj;
    }

    /**
     * Handle partial occlusion
     * 
     * @param {number} visibleKeypointsCount - Number of visible keypoints
     * @returns {Object} Warning object
     */
    handlePartialOcclusion(visibleKeypointsCount) {
        const warningObj = {
            code: 'PARTIAL_OCCLUSION',
            message: `Partial body occlusion detected (${visibleKeypointsCount}/33 keypoints visible).`,
            suggestions: [
                'Ensure your full body is visible',
                'Move away from obstacles',
                'Adjust camera angle',
                'Step back from the camera'
            ],
            severity: 'warning',
            visibleKeypoints: visibleKeypointsCount,
            timestamp: Date.now()
        };

        return warningObj;
    }

    /**
     * Handle multiple people detected
     * 
     * @returns {Object} Warning object
     */
    handleMultiplePeople() {
        const warningObj = {
            code: 'MULTIPLE_PEOPLE',
            message: 'Multiple people detected. Tracking the most prominent person.',
            suggestions: [
                'Ensure only one person is in frame',
                'Move others out of camera view',
                'Position yourself closer to the camera'
            ],
            severity: 'warning',
            timestamp: Date.now()
        };

        return warningObj;
    }

    /**
     * Notify all registered callbacks
     * 
     * @param {Object} errorObj - Error object to pass to callbacks
     */
    notifyCallbacks(errorObj) {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(errorObj);
            } catch (error) {
                console.error('Error in error callback:', error);
            }
        });
    }

    /**
     * 取得最後一筆錯誤
     * 
     * @returns {Object|null} 最後一次錯誤物件或 null
     */
    getLastError() {
        return this.lastError;
    }

    /**
     * Clear last error
     */
    clearError() {
        this.lastError = null;
    }

    /**
     * Format error for display
     * 
     * @param {Object} errorObj - Error object
     * @returns {string} Formatted error message with suggestions
     */
    formatErrorMessage(errorObj) {
        if (!errorObj) return '';

        let message = errorObj.message;

        if (errorObj.suggestions && errorObj.suggestions.length > 0) {
            message += '\n\nSuggestions:\n';
            errorObj.suggestions.forEach((suggestion, index) => {
                message += `${index + 1}. ${suggestion}\n`;
            });
        }

        return message;
    }

    /**
     * Check if error is recoverable
     * 
     * @param {Object} errorObj - Error object
     * @returns {boolean} True if error is recoverable
     */
    isRecoverable(errorObj) {
        if (!errorObj) return true;

        const unrecoverableErrors = [
            'CAMERA_NOT_FOUND',
            'CAMERA_NOT_SUPPORTED',
            'MEDIAPIPE_NOT_LOADED'
        ];

        return !unrecoverableErrors.includes(errorObj.code);
    }
}

// 匯出供其他模組使用
window.PoseErrorHandler = PoseErrorHandler;
