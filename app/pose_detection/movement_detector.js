/**
 * Movement Detector Module
 * 
 * This module detects and classifies body part movements from 3D keypoint sequences.
 * It maintains a history of keypoints and uses registered analyzers to detect
 * specific movements like raising arms, turning head, etc.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

class MovementDetector {
    /**
     * Initialize MovementDetector with configuration
     * 
     * @param {Object} config - Configuration object
     * @param {number} config.movementThreshold - Minimum movement magnitude to detect. Default: 0.02
     * @param {number} config.historySize - Number of frames to keep in history. Default: 5
     * @param {number} config.confidenceThreshold - Minimum confidence for reporting movements. Default: 0.5
     */
    constructor(config = {}) {
        this.config = {
            movementThreshold: config.movementThreshold !== undefined ? config.movementThreshold : 0.02,
            historySize: config.historySize !== undefined ? config.historySize : 5,
            confidenceThreshold: config.confidenceThreshold !== undefined ? config.confidenceThreshold : 0.5
        };

        // Keypoint history for delta calculations
        this.keypointHistory = [];

        // Movement history for consistency tracking
        this.movementHistory = {};

        // Initialize body part movement analyzers
        this.analyzers = [
            new HeadMovementAnalyzer(),
            new ArmMovementAnalyzer('left'),
            new ArmMovementAnalyzer('right'),
            new LegMovementAnalyzer('left'),
            new LegMovementAnalyzer('right'),
            new TorsoMovementAnalyzer()
        ];
    }

    /**
     * Detect all significant movements from current keypoints
     * 
     * Evaluates all registered analyzers and returns detected movements
     * that exceed the movement threshold and confidence threshold.
     * 
     * @param {Array<Object>} keypoints - Current frame keypoints with x, y, z, visibility
     * @returns {Array<Object>} Array of detected movements with descriptors and confidence
     */
    detectMovements(keypoints) {
        // Handle empty or invalid keypoints
        if (!keypoints || keypoints.length === 0) {
            return [];
        }

        // Handle low confidence keypoints gracefully
        const validKeypoints = keypoints.filter(kp => kp && kp.visibility > 0.1);
        if (validKeypoints.length < 10) {
            // Too few visible keypoints for reliable movement detection
            console.warn('⚠️ Insufficient visible keypoints for movement detection');
            return [];
        }

        // Update history with current keypoints
        this.updateHistory(keypoints);

        // Handle insufficient history for movement detection
        if (this.keypointHistory.length < 2) {
            console.debug('ℹ️ Building keypoint history... (' + this.keypointHistory.length + '/' + this.config.historySize + ')');
            return [];
        }

        const movements = [];

        // Evaluate each analyzer
        this.analyzers.forEach(analyzer => {
            try {
                const analyzerMovements = analyzer.analyze(
                    keypoints,
                    this.keypointHistory[this.keypointHistory.length - 2],
                    this.config.movementThreshold
                );

                // Adjust confidence based on movement consistency and filter by threshold
                if (analyzerMovements && Array.isArray(analyzerMovements)) {
                    analyzerMovements.forEach(movement => {
                        // Validate movement object
                        if (!movement || typeof movement.confidence !== 'number') {
                            console.warn('⚠️ Invalid movement object from analyzer:', analyzer.constructor.name);
                            return;
                        }

                        // Adjust confidence based on movement consistency across frames
                        const adjustedConfidence = this.adjustConfidenceForConsistency(movement);
                        movement.confidence = adjustedConfidence;

                        // Filter by confidence threshold
                        if (movement.confidence >= this.config.confidenceThreshold) {
                            movements.push(movement);
                        }
                    });
                }
            } catch (error) {
                console.error(`❌ Error in analyzer ${analyzer.constructor.name}:`, error);
                // Continue with other analyzers instead of failing completely
            }
        });

        return movements;
    }

    /**
     * Update keypoint history for delta calculations
     * 
     * Maintains a sliding window of keypoint frames for movement analysis.
     * Older frames are removed when history exceeds configured size.
     * 
     * @param {Array<Object>} keypoints - Current frame keypoints
     */
    updateHistory(keypoints) {
        if (!keypoints || keypoints.length === 0) {
            return;
        }

        // Add current keypoints to history
        this.keypointHistory.push(keypoints);

        // Maintain history size limit
        while (this.keypointHistory.length > this.config.historySize) {
            this.keypointHistory.shift();
        }
    }

    /**
     * Calculate 3D position change between two keypoints
     * 
     * Computes the delta vector (change in x, y, z) between two keypoint positions.
     * 
     * @param {Object} kp1 - First keypoint with x, y, z coordinates
     * @param {Object} kp2 - Second keypoint with x, y, z coordinates
     * @returns {Object} Delta object with x, y, z components
     */
    calculateDelta(kp1, kp2) {
        if (!kp1 || !kp2) {
            return { x: 0, y: 0, z: 0 };
        }

        return {
            x: (kp2.x || 0) - (kp1.x || 0),
            y: (kp2.y || 0) - (kp1.y || 0),
            z: (kp2.z || 0) - (kp1.z || 0)
        };
    }

    /**
     * Calculate magnitude of 3D movement vector
     * 
     * Computes the Euclidean distance (magnitude) of a 3D delta vector.
     * 
     * @param {Object} delta - Delta object with x, y, z components
     * @returns {number} Magnitude of the movement vector
     */
    calculateMagnitude(delta) {
        if (!delta) {
            return 0;
        }

        const x = delta.x || 0;
        const y = delta.y || 0;
        const z = delta.z || 0;

        return Math.sqrt(x * x + y * y + z * z);
    }

    /**
     * Register a new movement analyzer
     * 
     * Allows adding custom analyzers without modifying existing code.
     * 
     * @param {MovementAnalyzer} analyzer - Analyzer instance to register
     */
    registerAnalyzer(analyzer) {
        if (!analyzer || typeof analyzer.analyze !== 'function') {
            console.error('Invalid analyzer: must have analyze() method');
            return;
        }

        this.analyzers.push(analyzer);
    }

    /**
     * Unregister a movement analyzer
     * 
     * Removes an analyzer by name or instance.
     * 
     * @param {string|Object} analyzerNameOrInstance - Analyzer name or instance to remove
     */
    unregisterAnalyzer(analyzerNameOrInstance) {
        if (typeof analyzerNameOrInstance === 'string') {
            // Remove by class name
            this.analyzers = this.analyzers.filter(
                analyzer => analyzer.constructor.name !== analyzerNameOrInstance
            );
        } else {
            // Remove by instance
            const index = this.analyzers.indexOf(analyzerNameOrInstance);
            if (index > -1) {
                this.analyzers.splice(index, 1);
            }
        }
    }

    /**
     * Get all registered analyzers
     * 
     * @returns {Array<MovementAnalyzer>} Array of registered analyzers
     */
    getAnalyzers() {
        return [...this.analyzers];
    }

    /**
     * Adjust confidence based on movement consistency across frames
     * 
     * Tracks movement patterns over time and boosts confidence for consistent
     * movements while reducing confidence for sporadic movements.
     * 
     * @param {Object} movement - Movement object with bodyPart, movementType, confidence
     * @returns {number} Adjusted confidence score (0.0-1.0)
     */
    adjustConfidenceForConsistency(movement) {
        if (!movement || typeof movement.confidence !== 'number') {
            return 0;
        }

        // Create a unique key for this movement type
        const movementKey = `${movement.bodyPart}_${movement.movementType}`;

        // Initialize movement history for this key if it doesn't exist
        if (!this.movementHistory[movementKey]) {
            this.movementHistory[movementKey] = {
                count: 0,
                totalConfidence: 0,
                lastSeen: Date.now()
            };
        }

        const history = this.movementHistory[movementKey];
        const currentTime = Date.now();
        const timeSinceLastSeen = currentTime - history.lastSeen;

        // If movement hasn't been seen recently (>1 second), reset history
        if (timeSinceLastSeen > 1000) {
            history.count = 0;
            history.totalConfidence = 0;
        }

        // Update history
        history.count++;
        history.totalConfidence += movement.confidence;
        history.lastSeen = currentTime;

        // Calculate consistency bonus based on how many consecutive frames
        // this movement has been detected
        // Bonus increases with consistency, up to 20% boost
        const consistencyBonus = Math.min(0.2, (history.count - 1) * 0.05);

        // Calculate adjusted confidence
        // Base confidence from visibility + consistency bonus
        let adjustedConfidence = movement.confidence + consistencyBonus;

        // Ensure confidence stays in 0.0-1.0 range
        adjustedConfidence = Math.max(0.0, Math.min(1.0, adjustedConfidence));

        return adjustedConfidence;
    }

    /**
     * Clear keypoint history
     * 
     * Resets the history buffer. Useful when starting a new detection session.
     */
    clearHistory() {
        this.keypointHistory = [];
        this.movementHistory = {};
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
     * @param {Object} newConfig - Partial configuration object to update
     */
    updateConfig(newConfig) {
        if (!newConfig || typeof newConfig !== 'object') {
            return;
        }

        if (newConfig.movementThreshold !== undefined) {
            this.config.movementThreshold = newConfig.movementThreshold;
        }
        if (newConfig.historySize !== undefined) {
            this.config.historySize = newConfig.historySize;
        }
        if (newConfig.confidenceThreshold !== undefined) {
            this.config.confidenceThreshold = newConfig.confidenceThreshold;
        }
    }
}

// Export for use in other modules
window.MovementDetector = MovementDetector;
