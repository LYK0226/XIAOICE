/**
 * 多人姿勢偵測模組
 * 
 * 此模組使用 MediaPipe Pose Landmarker (Tasks API) 提供多人姿勢偵測。
 * 與僅支援單人的 Holistic 模型不同，Pose Landmarker 可同時偵測多個人。
 * 
 * 注意：此模組專注於姿勢關鍵點（每人 33 個），多人模式不包含臉部與手部關鍵點。
 */
class MultiPersonPoseDetector {
    /**
     * 初始化 MultiPersonPoseDetector
     * 
     * @param {Object} config - 設定物件
     * @param {number} config.maxNumPoses - 最大偵測人數（預設: 2）
     * @param {number} config.minDetectionConfidence - 最小偵測信心（預設: 0.5）
     * @param {number} config.minTrackingConfidence - 最小追蹤信心（預設: 0.5）
     * @param {string} config.modelAssetPath - Pose Landmarker 模型路徑（預設: CDN）
     */
    constructor(config = {}) {
        this.config = {
            maxNumPoses: config.maxNumPoses || 2,
            minDetectionConfidence: config.minDetectionConfidence || 0.5,
            minTrackingConfidence: config.minTrackingConfidence || 0.5,
            modelAssetPath: config.modelAssetPath || 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
        };
        
        this.poseLandmarker = null;
        this.isInitialized = false;
        this.lastResults = null;
        
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
        
        console.log('🔧 MultiPersonPoseDetector created with config:', this.config);
    }
    
    /**
     * 初始化 MediaPipe Pose Landmarker 模型
     * 
     * @returns {Promise<void>} 模型載入並準備好後解析
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('⚠️ MultiPersonPoseDetector already initialized');
            return;
        }
        
        try {
            // 檢查 MediaPipe Tasks Vision 是否可用
            if (typeof PoseLandmarker === 'undefined') {
                throw new Error('MediaPipe Pose Landmarker 未載入。請引入 MediaPipe Tasks Vision 函式庫。');
            }
            
            // 從 CDN 建立檔案集
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            );
            
            // 建立支援多人模式的 Pose Landmarker
            this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: this.config.modelAssetPath,
                    delegate: 'GPU' // 若可用則使用 GPU 加速
                },
                runningMode: 'VIDEO',
                numPoses: this.config.maxNumPoses,
                minPoseDetectionConfidence: this.config.minDetectionConfidence,
                minTrackingConfidence: this.config.minTrackingConfidence,
                minPosePresenceConfidence: 0.5,
                outputSegmentationMasks: false
            });
            
            this.isInitialized = true;
            console.log(`✅ MultiPersonPoseDetector initialized - detecting up to ${this.config.maxNumPoses} people`);
            
        } catch (error) {
            console.error('❌ Failed to initialize MultiPersonPoseDetector:', error);
            this.isInitialized = false;
            throw error;
        }
    }
    
    /**
     * 從影片元素偵測姿勢
     * 
     * @param {HTMLVideoElement} videoElement - 要處理的影片元素
     * @returns {Promise<Object>} 包含所有偵測到的人的偵測結果
     */
    async detectPoses(videoElement) {
        if (!this.isInitialized || !this.poseLandmarker) {
            throw new Error('MultiPersonPoseDetector 尚未初始化。請先呼叫 initialize()。');
        }
        
        if (!videoElement || videoElement.readyState < 2) {
            return {
                persons: [],
                detected: false,
                timestamp: Date.now()
            };
        }
        
        try {
            const timestamp = performance.now();
            const results = this.poseLandmarker.detectForVideo(videoElement, timestamp);
            
            this.lastResults = results;
            
            if (!results.landmarks || results.landmarks.length === 0) {
                return {
                    persons: [],
                    detected: false,
                    timestamp: Date.now()
                };
            }
            
            // 處理每位偵測到的人
            const persons = results.landmarks.map((landmarks, personIndex) => {
                const keypoints = this.extractKeypoints(landmarks, results.worldLandmarks?.[personIndex]);
                
                return {
                    index: personIndex,
                    keypoints: keypoints,
                    detected: true
                };
            });
            
            return {
                persons: persons,
                detected: true,
                personCount: persons.length,
                timestamp: Date.now()
            };
            
        } catch (error) {
            console.error('❌ Error detecting poses:', error);
            return {
                persons: [],
                detected: false,
                timestamp: Date.now(),
                error: error.message
            };
        }
    }
    
    /**
     * 從 MediaPipe 標記點抽取關鍵點
     * 
     * @param {Array} landmarks - 偵測得到的標準化標記點
     * @param {Array} worldLandmarks - 世界座標標記點（選用，用於 3D）
     * @returns {Array} 關鍵點物件陣列
     */
    extractKeypoints(landmarks, worldLandmarks = null) {
        const keypoints = [];
        
        landmarks.forEach((landmark, index) => {
            const keypoint = {
                name: this.poseKeypointNames[index] || `pose_${index}`,
                index: index,
                type: 'pose',
                x: landmark.x,
                y: landmark.y,
                z: landmark.z || 0,
                visibility: landmark.visibility || 0
            };
            
            // 若有世界座標則加入
            if (worldLandmarks && worldLandmarks[index]) {
                keypoint.worldX = worldLandmarks[index].x;
                keypoint.worldY = worldLandmarks[index].y;
                keypoint.worldZ = worldLandmarks[index].z;
            }
            
            keypoints.push(keypoint);
        });
        
        return keypoints;
    }
    
    /**
     * 取得特定人物的關鍵點
     * 
     * @param {number} personIndex - 人物索引（從 0 開始）
     * @returns {Array|null} 找不到則回傳 null，否則回傳關鍵點陣列
     */
    getPersonKeypoints(personIndex) {
        if (!this.lastResults || !this.lastResults.landmarks) {
            return null;
        }
        
        if (personIndex < 0 || personIndex >= this.lastResults.landmarks.length) {
            return null;
        }
        
        return this.extractKeypoints(
            this.lastResults.landmarks[personIndex],
            this.lastResults.worldLandmarks?.[personIndex]
        );
    }
    
    /**
     * Close and cleanup resources
     */
    close() {
        if (this.poseLandmarker) {
            this.poseLandmarker.close();
            this.poseLandmarker = null;
        }
        this.isInitialized = false;
        this.lastResults = null;
        console.log('🧹 MultiPersonPoseDetector closed');
    }
}

/**
 * 使用 Holistic 的多人偵測補充器
 * 
 * 由於 MediaPipe Tasks API 在部分環境中可能不可用，
 * 此補充器使用現有的 Holistic 模型（僅單人）模擬多人偵測行為。
 * 
 * 要求真正的多人支援時，請使用支援 Tasks API 的 MultiPersonPoseDetector。
 */
class HolisticMultiPersonAdapter {
    /**
     * Initialize adapter that wraps existing PoseDetector3D
     * 
     * @param {PoseDetector3D} poseDetector3D - Existing holistic detector
     */
    constructor(poseDetector3D) {
        this.detector = poseDetector3D;
        this.isInitialized = false;
        console.log('🔧 HolisticMultiPersonAdapter created (single-person fallback mode)');
    }
    
    async initialize() {
        if (!this.detector.isInitialized) {
            await this.detector.initialize();
        }
        this.isInitialized = true;
        console.log('✅ HolisticMultiPersonAdapter initialized (single-person mode)');
    }
    
    /**
     * Detect poses - returns single person as array for compatibility
     * 
     * @param {HTMLVideoElement} videoElement - Video element
     * @returns {Promise<Object>} Detection results
     */
    async detectPoses(videoElement) {
        const result = await this.detector.detectPose(videoElement);
        
        if (!result.detected || result.keypoints.length === 0) {
            return {
                persons: [],
                detected: false,
                timestamp: Date.now()
            };
        }
        
        // 將單人結果包裝成陣列以保持相容性
        return {
            persons: [{ 
                index: 0,
                keypoints: result.keypoints,
                faceLandmarks: result.faceLandmarks,
                leftHandLandmarks: result.leftHandLandmarks,
                rightHandLandmarks: result.rightHandLandmarks,
                detected: true
            }],
            detected: true,
            personCount: 1,
            timestamp: result.timestamp
        };
    }
    
    close() {
        if (this.detector) {
            this.detector.close();
        }
        this.isInitialized = false;
    }
}

// 匯出供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MultiPersonPoseDetector, HolisticMultiPersonAdapter };
}