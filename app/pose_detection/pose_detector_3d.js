/**
 * 3D Pose Detector Module
 * 
 * This module provides real-time 3D pose detection using MediaPipe Pose.
 * It extracts 3D keypoints (x, y, z) from video frames and normalizes
 * depth coordinates for consistent visualization.
 * 
 * Requirements: 1.1, 1.2, 1.3
 */

class PoseDetector3D {
    /**
     * Initialize PoseDetector3D with configuration
     * 
     * @param {Object} config - Configuration object
     * @param {number} config.modelComplexity - Model complexity (0, 1, or 2). Default: 1
     * @param {boolean} config.smoothLandmarks - Enable landmark smoothing. Default: true
     * @param {number} config.minDetectionConfidence - Minimum detection confidence (0.0-1.0). Default: 0.5
     * @param {number} config.minTrackingConfidence - Minimum tracking confidence (0.0-1.0). Default: 0.5
     */
    constructor(config = {}) {
        this.config = {
            modelComplexity: config.modelComplexity !== undefined ? config.modelComplexity : 1,
            smoothLandmarks: config.smoothLandmarks !== false,
            minDetectionConfidence: config.minDetectionConfidence !== undefined ? config.minDetectionConfidence : 0.5,
            minTrackingConfidence: config.minTrackingConfidence !== undefined ? config.minTrackingConfidence : 0.5
        };
        
        this.pose = null;
        this.isInitialized = false;
        this.lastResults = null;
        
        // MediaPipe keypoint names (33 keypoints)
        this.keypointNames = [
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
    }

    /**
     * Initialize MediaPipe Pose model
     * 
     * Loads the MediaPipe Pose model from CDN and prepares it for inference.
     * This must be called before detectPose() can be used.
     * 
     * @returns {Promise<void>} Resolves when model is loaded and ready
     * @throws {Error} If model fails to load
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('⚠️ PoseDetector3D already initialized');
            return;
        }

        try {
            // Check if MediaPipe Pose is available
            if (typeof Pose === 'undefined') {
                const error = new Error('MediaPipe Pose library not loaded. Please check your internet connection and refresh the page.');
                error.code = 'MEDIAPIPE_NOT_LOADED';
                throw error;
            }

            // Create Pose instance with configuration
            this.pose = new Pose({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                }
            });

            // Configure pose detection options
            this.pose.setOptions({
                modelComplexity: this.config.modelComplexity,
                smoothLandmarks: this.config.smoothLandmarks,
                minDetectionConfidence: this.config.minDetectionConfidence,
                minTrackingConfidence: this.config.minTrackingConfidence,
                selfieMode: false
            });

            // Set up callback for pose detection results
            this.pose.onResults((results) => {
                this.lastResults = results;
            });

            this.isInitialized = true;
            console.log('✅ PoseDetector3D initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize PoseDetector3D:', error);
            this.isInitialized = false;
            
            // Enhance error message for common issues
            if (error.code === 'MEDIAPIPE_NOT_LOADED') {
                throw error;
            } else if (error.message && error.message.includes('network')) {
                const networkError = new Error('Failed to load MediaPipe model. Please check your internet connection.');
                networkError.code = 'NETWORK_ERROR';
                networkError.originalError = error;
                throw networkError;
            } else {
                const genericError = new Error('Failed to initialize pose detection. Please try again.');
                genericError.code = 'INITIALIZATION_ERROR';
                genericError.originalError = error;
                throw genericError;
            }
        }
    }

    /**
     * Detect pose from video element
     * 
     * Processes a video frame to extract 3D pose keypoints.
     * 
     * @param {HTMLVideoElement} videoElement - Video element to process
     * @returns {Promise<Object>} Detection results with keypoints and metadata
     * @returns {Object.keypoints} Array of keypoint objects with x, y, z, visibility
     * @returns {Object.detected} Boolean indicating if pose was detected
     * @returns {Object.timestamp} Frame timestamp in milliseconds
     * @throws {Error} If not initialized or video element is invalid
     */
    async detectPose(videoElement) {
        if (!this.isInitialized || !this.pose) {
            const error = new Error('PoseDetector3D not initialized. Call initialize() first.');
            error.code = 'NOT_INITIALIZED';
            throw error;
        }

        if (!videoElement || !(videoElement instanceof HTMLVideoElement)) {
            const error = new Error('Invalid video element provided');
            error.code = 'INVALID_VIDEO_ELEMENT';
            throw error;
        }

        // Check if video is ready
        if (videoElement.readyState < 2) {
            // Video not ready yet, return empty result
            return {
                keypoints: [],
                detected: false,
                timestamp: Date.now(),
                error: 'Video not ready'
            };
        }

        try {
            // Send frame to MediaPipe for processing
            await this.pose.send({ image: videoElement });

            // Handle case when no pose is detected
            if (!this.lastResults || !this.lastResults.poseLandmarks || this.lastResults.poseLandmarks.length === 0) {
                return {
                    keypoints: [],
                    detected: false,
                    timestamp: Date.now()
                };
            }

            // Extract and format keypoints from results
            const keypoints = this.extractKeypoints(this.lastResults);

            // Handle low confidence keypoints gracefully
            const validKeypoints = keypoints.filter(kp => kp.visibility > 0.1);
            
            if (validKeypoints.length < 10) {
                // Too few visible keypoints, likely poor detection
                return {
                    keypoints: keypoints,
                    detected: false,
                    timestamp: Date.now(),
                    warning: 'Low confidence detection - too few visible keypoints'
                };
            }

            // Normalize depth coordinates
            const normalizedKeypoints = this.normalizeDepthCoordinates(keypoints);

            return {
                keypoints: normalizedKeypoints,
                detected: true,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('❌ Error detecting pose:', error);
            
            // Return empty result instead of throwing to allow graceful degradation
            return {
                keypoints: [],
                detected: false,
                timestamp: Date.now(),
                error: error.message || 'Unknown error during pose detection'
            };
        }
    }

    /**
     * Extract keypoints from MediaPipe landmarks
     * 
     * Converts MediaPipe landmark format to standardized keypoint format.
     * Each keypoint includes x, y, z coordinates and visibility score.
     * 
     * @param {Object} results - MediaPipe Pose detection results
     * @returns {Array<Object>} Array of keypoint objects
     */
    extractKeypoints(results) {
        const keypoints = [];

        if (!results || !results.poseLandmarks || results.poseLandmarks.length === 0) {
            // Return empty keypoints array if no pose detected
            return keypoints;
        }

        // Extract each landmark
        results.poseLandmarks.forEach((landmark, index) => {
            const keypoint = {
                name: this.keypointNames[index] || `keypoint_${index}`,
                index: index,
                x: landmark.x,           // Normalized x (0.0-1.0)
                y: landmark.y,           // Normalized y (0.0-1.0)
                z: landmark.z,           // Depth coordinate (relative to hips)
                visibility: landmark.visibility || 0,  // Confidence score (0.0-1.0)
                presence: landmark.presence || 0       // Presence score
            };

            keypoints.push(keypoint);
        });

        return keypoints;
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

        // Find min and max z values to determine range
        let minZ = Infinity;
        let maxZ = -Infinity;

        keypoints.forEach(kp => {
            if (typeof kp.z === 'number') {
                minZ = Math.min(minZ, kp.z);
                maxZ = Math.max(maxZ, kp.z);
            }
        });

        // Handle case where all z values are the same
        const zRange = maxZ - minZ;
        const hasZVariation = zRange > 0.0001;

        // Normalize z coordinates
        keypoints.forEach(kp => {
            if (typeof kp.z === 'number') {
                if (hasZVariation) {
                    // Normalize to 0.0-1.0 range
                    kp.z_normalized = (kp.z - minZ) / zRange;
                } else {
                    // If no variation, use middle value
                    kp.z_normalized = 0.5;
                }

                // Clamp to 0.0-1.0 range to handle floating point errors
                kp.z_normalized = Math.max(0.0, Math.min(1.0, kp.z_normalized));
            } else {
                kp.z_normalized = 0.5;
            }
        });

        return keypoints;
    }

    /**
     * Release resources and cleanup
     * 
     * Closes the MediaPipe Pose instance and releases any allocated resources.
     * After calling this, initialize() must be called again before detectPose() can be used.
     */
    close() {
        if (this.pose) {
            this.pose.close();
            this.pose = null;
        }

        this.isInitialized = false;
        this.lastResults = null;

        console.log('🧹 PoseDetector3D closed and resources released');
    }

    /**
     * Get initialization status
     * 
     * @returns {boolean} True if initialized and ready to detect poses
     */
    getIsInitialized() {
        return this.isInitialized;
    }

    /**
     * Get current configuration
     * 
     * @returns {Object} Current configuration object
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update configuration
     * 
     * Updates the pose detection configuration. Changes take effect on next detection.
     * 
     * @param {Object} newConfig - Partial configuration object to update
     */
    updateConfig(newConfig) {
        if (!newConfig || typeof newConfig !== 'object') {
            return;
        }

        // Update config properties
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

        // Apply new configuration to pose instance if initialized
        if (this.isInitialized && this.pose) {
            this.pose.setOptions({
                modelComplexity: this.config.modelComplexity,
                smoothLandmarks: this.config.smoothLandmarks,
                minDetectionConfidence: this.config.minDetectionConfidence,
                minTrackingConfidence: this.config.minTrackingConfidence,
                selfieMode: false
            });
        }
    }
}

// Export for use in other modules
window.PoseDetector3D = PoseDetector3D;
