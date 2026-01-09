/**
 * 3D 全方位偵測模組
 * 
 * 此模組使用 MediaPipe Holistic 提供即時全方位偵測。
 * 可抽取總計 543 個標記點：
 * - 33 個姿勢（身體）標記點
 * - 468 個臉部標記點（face mesh）
 * - 每手 21 個手部標記點（兩手共 42 個）
 */

class PoseDetector3D {
    /**
     * Initialize PoseDetector3D (Holistic) with configuration

     * 
     * @param {Object} config - Configuration object
     * @param {number} config.modelComplexity - Model complexity (0, 1, or 2). Default: 1
     * @param {boolean} config.smoothLandmarks - Enable landmark smoothing. Default: true
     * @param {number} config.minDetectionConfidence - Minimum detection confidence (0.0-1.0). Default: 0.5
     * @param {number} config.minTrackingConfidence - Minimum tracking confidence (0.0-1.0). Default: 0.5
     * @param {boolean} config.refineFaceLandmarks - Enable refined face landmarks. Default: true
     * @param {boolean} config.enableSegmentation - Enable segmentation. Default: false
     */
    constructor(config = {}) {
        this.config = {
            modelComplexity: config.modelComplexity !== undefined ? config.modelComplexity : 1,
            smoothLandmarks: config.smoothLandmarks !== false,
            minDetectionConfidence: config.minDetectionConfidence !== undefined ? config.minDetectionConfidence : 0.5,
            minTrackingConfidence: config.minTrackingConfidence !== undefined ? config.minTrackingConfidence : 0.5,
            refineFaceLandmarks: config.refineFaceLandmarks !== false,
            enableSegmentation: config.enableSegmentation === true
        };
        
        this.holistic = null;
        this.isInitialized = false;
        this.lastResults = null;
        this.pendingResolve = null;  // 用於同步處理結果
        
        // MediaPipe 姿勢關鍵點名稱（33 個）
        this.poseKeypointNames = [
            'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
            'right_eye_inner', 'right_eye', 'right_eye_outer',
            'left_ear', 'right_ear',
            'mouth_left', 'mouth_right',
            'left_shoulder', 'right_shoulder',
            'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist',
            'left_pinky', 'right_pinky',
            'left_index', 'right_index',
            'left_thumb', 'right_thumb',
            'left_hip', 'right_hip',
            'left_knee', 'right_knee',
            'left_ankle', 'right_ankle',
            'left_heel', 'right_heel',
            'left_foot_index', 'right_foot_index'
        ];

        // 手部標記名稱（每手 21 個）
        this.handLandmarkNames = [
            'wrist',
            'thumb_cmc', 'thumb_mcp', 'thumb_ip', 'thumb_tip',
            'index_finger_mcp', 'index_finger_pip', 'index_finger_dip', 'index_finger_tip',
            'middle_finger_mcp', 'middle_finger_pip', 'middle_finger_dip', 'middle_finger_tip',
            'ring_finger_mcp', 'ring_finger_pip', 'ring_finger_dip', 'ring_finger_tip',
            'pinky_mcp', 'pinky_pip', 'pinky_dip', 'pinky_tip'
        ];

        // 為向後相容保留 keypointNames（姿勢標記）
        this.keypointNames = this.poseKeypointNames;
    }

    /**
     * Initialize MediaPipe Holistic model
     * 
     * Loads the MediaPipe Holistic model from CDN and prepares it for inference.
     * This must be called before detectPose() can be used.
     * 
     * @returns {Promise<void>} Resolves when model is loaded and ready
     * @throws {Error} If model fails to load
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('⚠️ PoseDetector3D (Holistic) already initialized');
            return;
        }

        try {
            // 檢查 MediaPipe Holistic 是否可用
            if (typeof Holistic === 'undefined') {
                const error = new Error('MediaPipe Holistic 函式庫未載入。請檢查網路連線並重新整理頁面。');
                error.code = 'MEDIAPIPE_NOT_LOADED';
                throw error;
            }

            // 使用設定建立 Holistic 實例
            this.holistic = new Holistic({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
                }
            });

            // 設定 Holistic 偵測選項
            this.holistic.setOptions({
                modelComplexity: this.config.modelComplexity,
                smoothLandmarks: this.config.smoothLandmarks,
                minDetectionConfidence: this.config.minDetectionConfidence,
                minTrackingConfidence: this.config.minTrackingConfidence,
                refineFaceLandmarks: this.config.refineFaceLandmarks,
                enableSegmentation: this.config.enableSegmentation,
                selfieMode: false
            });

            // 設定 Holistic 偵測結果的回呼
            // 為即時效能使用即時 promise 解析
            this.holistic.onResults((results) => {
                this.lastResults = results;
                // 結果到達時立即解析待處理的 promise
                if (this.pendingResolve) {
                    this.pendingResolve(results);
                    this.pendingResolve = null;
                }
            });

            this.isInitialized = true;
            console.log('✅ PoseDetector3D (Holistic) initialized successfully - 543 landmarks available');

        } catch (error) {
            console.error('❌ Failed to initialize PoseDetector3D (Holistic):', error);
            this.isInitialized = false;
            
            // 提升常見問題的錯誤訊息說明
            if (error.code === 'MEDIAPIPE_NOT_LOADED') {
                throw error;
            } else if (error.message && error.message.includes('network')) {
                const networkError = new Error('Failed to load MediaPipe Holistic model. Please check your internet connection.');
                networkError.code = 'NETWORK_ERROR';
                networkError.originalError = error;
                throw networkError;
            } else {
                const genericError = new Error('Failed to initialize holistic detection. Please try again.');
                genericError.code = 'INITIALIZATION_ERROR';
                genericError.originalError = error;
                throw genericError;
            }
        }
    }

    /**
     * Detect pose from video element
     * 
     * Processes a video frame to extract all holistic landmarks (pose, face, hands).
     * 
     * @param {HTMLVideoElement} videoElement - Video element to process
     * @returns {Promise<Object>} Detection results with keypoints and metadata
     * @returns {Object.keypoints} Array of pose keypoint objects with x, y, z, visibility
     * @returns {Object.faceLandmarks} Array of face landmarks (468 points)
     * @returns {Object.leftHandLandmarks} Array of left hand landmarks (21 points)
     * @returns {Object.rightHandLandmarks} Array of right hand landmarks (21 points)
     * @returns {Object.detected} Boolean indicating if pose was detected
     * @returns {Object.timestamp} Frame timestamp in milliseconds
     * @throws {Error} If not initialized or video element is invalid
     */
    async detectPose(videoElement) {
        if (!this.isInitialized || !this.holistic) {
            const error = new Error('PoseDetector3D (Holistic) not initialized. Call initialize() first.');
            error.code = 'NOT_INITIALIZED';
            throw error;
        }

        if (!videoElement || !(videoElement instanceof HTMLVideoElement)) {
            const error = new Error('Invalid video element provided');
            error.code = 'INVALID_VIDEO_ELEMENT';
            throw error;
        }

        // 檢查影片是否已就緒
        if (videoElement.readyState < 2) {
            // 影片尚未就緒，回傳空結果
            return {
                keypoints: [],
                faceLandmarks: [],
                leftHandLandmarks: [],
                rightHandLandmarks: [],
                detected: false,
                timestamp: Date.now(),
                error: 'Video not ready'
            };
        }

        try {
            // 建立會在 onResults 回呼觸發時解析的 promise
            const resultsPromise = new Promise((resolve) => {
                this.pendingResolve = resolve;
            });

            // 傳送影格到 MediaPipe 進行處理
            await this.holistic.send({ image: videoElement });

            // 等待回呼傳回實際結果
            const results = await resultsPromise;

            // 處理未偵測到姿勢的情況
            if (!results || !results.poseLandmarks || results.poseLandmarks.length === 0) {
                return {
                    keypoints: [],
                    faceLandmarks: [],
                    leftHandLandmarks: [],
                    rightHandLandmarks: [],
                    detected: false,
                    timestamp: Date.now()
                };
            }

            // 從結果抽取並格式化關鍵點
            const keypoints = this.extractPoseKeypoints(results);
            const faceLandmarks = this.extractFaceLandmarks(results);
            const leftHandLandmarks = this.extractHandLandmarks(results, 'left');
            const rightHandLandmarks = this.extractHandLandmarks(results, 'right');

            // 優雅地處理低信心的關鍵點
            const validKeypoints = keypoints.filter(kp => kp.visibility > 0.1);
            
            if (validKeypoints.length < 10) {
                // 可見關鍵點太少，偵測品質可能不佳
                return {
                    keypoints: keypoints,
                    faceLandmarks: faceLandmarks,
                    leftHandLandmarks: leftHandLandmarks,
                    rightHandLandmarks: rightHandLandmarks,
                    detected: false,
                    timestamp: Date.now(),
                    warning: 'Low confidence detection - too few visible keypoints'
                };
            }

            // 對姿勢關鍵點進行深度座標正規化
            const normalizedKeypoints = this.normalizeDepthCoordinates(keypoints);

            // 計算偵測到的標記點總數
            const totalLandmarks = keypoints.length + faceLandmarks.length + 
                                   leftHandLandmarks.length + rightHandLandmarks.length;

            return {
                keypoints: normalizedKeypoints,
                faceLandmarks: faceLandmarks,
                leftHandLandmarks: leftHandLandmarks,
                rightHandLandmarks: rightHandLandmarks,
                detected: true,
                timestamp: Date.now(),
                totalLandmarks: totalLandmarks,
                // 保留原始結果以供進階使用
                rawResults: this.lastResults
            };

        } catch (error) {
            console.error('❌ Error detecting pose:', error);

            // 為了優雅降級回傳空結果，而非拋出錯誤
            return {
                keypoints: [],
                faceLandmarks: [],
                leftHandLandmarks: [],
                rightHandLandmarks: [],

                detected: false,
                timestamp: Date.now(),
                error: error.message || 'Unknown error during pose detection'
            };
        }
    }

    /**
     * Extract pose keypoints from MediaPipe Holistic results
     * 
     * @param {Object} results - MediaPipe Holistic detection results
     * @returns {Array<Object>} Array of pose keypoint objects (33 keypoints)
     */
    extractPoseKeypoints(results) {
        const keypoints = [];

        if (!results || !results.poseLandmarks || results.poseLandmarks.length === 0) {
            return keypoints;
        }

        // 抽取每個姿勢標記點
        results.poseLandmarks.forEach((landmark, index) => {
            const keypoint = {
                name: this.poseKeypointNames[index] || `pose_${index}`,
                index: index,
                type: 'pose',
                x: landmark.x,           // Normalized x (0.0-1.0)
                y: landmark.y,           // Normalized y (0.0-1.0)
                z: landmark.z,           // Depth coordinate (relative to hips)
                visibility: landmark.visibility || 0  // Confidence score (0.0-1.0)
            };

            keypoints.push(keypoint);
        });

        return keypoints;
    }

    /**
     * Extract face landmarks from MediaPipe Holistic results
     * 
     * @param {Object} results - MediaPipe Holistic detection results
     * @returns {Array<Object>} Array of face landmark objects (468 keypoints)
     */
    extractFaceLandmarks(results) {
        const landmarks = [];

        if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
            return landmarks;
        }

        // 抽取每個臉部標記點
        results.faceLandmarks.forEach((landmark, index) => {
            landmarks.push({
                name: `face_${index}`,
                index: index,
                type: 'face',
                x: landmark.x,
                y: landmark.y,
                z: landmark.z || 0,
                visibility: 1.0  // Face landmarks don't have visibility
            });
        });

        return landmarks;
    }

    /**
     * Extract hand landmarks from MediaPipe Holistic results
     * 
     * @param {Object} results - MediaPipe Holistic detection results
     * @param {string} side - 'left' 或 'right'（代表左或右）
     * @returns {Array<Object>} Array of hand landmark objects (21 keypoints)
     */
    extractHandLandmarks(results, side) {
        const landmarks = [];
        const handLandmarks = side === 'left' ? results.leftHandLandmarks : results.rightHandLandmarks;

        if (!results || !handLandmarks || handLandmarks.length === 0) {
            return landmarks;
        }

        // 抽取每個手部標記點
        handLandmarks.forEach((landmark, index) => {
            landmarks.push({
                name: `${side}_hand_${this.handLandmarkNames[index] || index}`,
                index: index,
                type: `${side}_hand`,
                x: landmark.x,
                y: landmark.y,
                z: landmark.z || 0,
                visibility: 1.0  // Hand landmarks don't have visibility score
            });
        });

        return landmarks;
    }

    /**
     * Extract keypoints from MediaPipe landmarks (backward compatibility)
     * 
     * @param {Object} results - MediaPipe detection results
     * @returns {Array<Object>} Array of keypoint objects
     */
    extractKeypoints(results) {
        return this.extractPoseKeypoints(results);
    }

    /**
     * Normalize depth coordinates to 0.0-1.0 range
     * 
     * Normalizes z-coordinates to a consistent scale independent of camera distance.
     * This ensures depth visualization is consistent regardless of how far the person
     * is from the camera.
     * 
     * @param {Array<Object>} keypoints - Array of keypoint objects with z coordinates
     * @returns {Array<Object>} Keypoints with added z_normalized field
     */
    normalizeDepthCoordinates(keypoints) {
        if (!keypoints || keypoints.length === 0) {
            return keypoints;
        }

        // 找出用於計算範圍的最小與最大 z 值
        let minZ = Infinity;
        let maxZ = -Infinity;

        keypoints.forEach(kp => {
            if (typeof kp.z === 'number') {
                minZ = Math.min(minZ, kp.z);
                maxZ = Math.max(maxZ, kp.z);
            }
        });

        // 處理所有 z 值相同的情況
        const zRange = maxZ - minZ;
        const hasZVariation = zRange > 0.0001;

        // 正規化 z 座標
        keypoints.forEach(kp => {
            if (typeof kp.z === 'number') {
                if (hasZVariation) {
                    // 正規化到 0.0-1.0 範圍
                    kp.z_normalized = (kp.z - minZ) / zRange;
                } else {
                    // 若無變化，使用中間值
                    kp.z_normalized = 0.5;
                }

                // 將值限制在 0.0-1.0 範圍以處理浮點誤差

                kp.z_normalized = Math.max(0.0, Math.min(1.0, kp.z_normalized));
            } else {
                kp.z_normalized = 0.5;
            }
        });

        return keypoints;
    }

    /**
     * 取得包含臉與手的全部 Holistic 結果
     * 
     * @returns {Object|null} 最後一次偵測結果，若無則為 null
     */
    getLastResults() {
        return this.lastResults;
    }

    /**
     * Check if face was detected in last frame
     * 
     * @returns {boolean} True if face landmarks are available
     */
    hasFaceDetection() {
        return this.lastResults && 
               this.lastResults.faceLandmarks && 
               this.lastResults.faceLandmarks.length > 0;
    }

    /**
     * Check if left hand was detected in last frame
     * 
     * @returns {boolean} True if left hand landmarks are available
     */
    hasLeftHandDetection() {
        return this.lastResults && 
               this.lastResults.leftHandLandmarks && 
               this.lastResults.leftHandLandmarks.length > 0;
    }

    /**
     * Check if right hand was detected in last frame
     * 
     * @returns {boolean} True if right hand landmarks are available
     */
    hasRightHandDetection() {
        return this.lastResults && 
               this.lastResults.rightHandLandmarks && 
               this.lastResults.rightHandLandmarks.length > 0;
    }

    /**
     * Release resources and cleanup
     * 
     * Closes the MediaPipe Holistic instance and releases any allocated resources.
     * After calling this, initialize() must be called again before detectPose() can be used.
     */
    close() {
        // 清除任何待處理的 promise
        if (this.pendingResolve) {
            this.pendingResolve(null);
            this.pendingResolve = null;
        }

        if (this.holistic) {
            this.holistic.close();
            this.holistic = null;
        }

        this.isInitialized = false;
        this.lastResults = null;

        console.log('🧹 PoseDetector3D (Holistic) closed and resources released');
    }

    /**
     * 取得初始化狀態
     * 
     * @returns {boolean} 若已初始化且可偵測則回傳 true
     */
    getIsInitialized() {
        return this.isInitialized;
    }

    /**
     * 取得目前設定
     * 
     * @returns {Object} 目前的設定物件

     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update configuration
     * 
     * Updates the holistic detection configuration. Changes take effect on next detection.

     * 
     * @param {Object} newConfig - Partial configuration object to update
     */
    updateConfig(newConfig) {
        if (!newConfig || typeof newConfig !== 'object') {
            return;
        }

        // 更新設定屬性
        if (newConfig.modelComplexity !== undefined) {
            this.config.modelComplexity = newConfig.modelComplexity;
        }
        if (newConfig.smoothLandmarks !== undefined) {
            this.config.smoothLandmarks = newConfig.smoothLandmarks;
        }
        if (newConfig.minDetectionConfidence !== undefined) {
            this.config.minDetectionConfidence = newConfig.minDetectionConfidence;
        }
        if (newConfig.minTrackingConfidence !== undefined) {
            this.config.minTrackingConfidence = newConfig.minTrackingConfidence;
        }
        if (newConfig.refineFaceLandmarks !== undefined) {
            this.config.refineFaceLandmarks = newConfig.refineFaceLandmarks;
        }
        if (newConfig.enableSegmentation !== undefined) {
            this.config.enableSegmentation = newConfig.enableSegmentation;
        }

        // 如已初始化則將新設定套用到 Holistic 實例
        if (this.isInitialized && this.holistic) {
            this.holistic.setOptions({
                modelComplexity: this.config.modelComplexity,
                smoothLandmarks: this.config.smoothLandmarks,
                minDetectionConfidence: this.config.minDetectionConfidence,
                minTrackingConfidence: this.config.minTrackingConfidence,
                refineFaceLandmarks: this.config.refineFaceLandmarks,
                enableSegmentation: this.config.enableSegmentation,
                selfieMode: false
            });
        }
    }
}

// 匯出供其他模組使用
window.PoseDetector3D = PoseDetector3D;
