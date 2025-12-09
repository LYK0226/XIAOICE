/**
 * Body Part Movement Analyzers Module
 * 
 * This module provides specialized analyzers for detecting movements of different body parts.
 * Each analyzer focuses on specific keypoints and movement patterns.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1-6.7, 7.1-7.5
 */

/**
 * Base class for movement analyzers
 * 
 * Provides common functionality for all body part analyzers.
 */
class MovementAnalyzer {
    /**
     * Analyze movement for specific body part
     * 
     * @param {Array<Object>} currentKeypoints - Current frame keypoints
     * @param {Array<Object>} previousKeypoints - Previous frame keypoints
     * @param {number} threshold - Movement threshold
     * @returns {Array<Object>} Array of detected movements
     */
    analyze(currentKeypoints, previousKeypoints, threshold) {
        // To be implemented by subclasses
        return [];
    }

    /**
     * Calculate 3D position change between two keypoints
     * 
     * @param {Object} kp1 - First keypoint
     * @param {Object} kp2 - Second keypoint
     * @returns {Object} Delta with x, y, z components
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
     * @param {Object} delta - Delta with x, y, z components
     * @returns {number} Magnitude
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
     * Find keypoint by name
     * 
     * @param {Array<Object>} keypoints - Array of keypoints
     * @param {string} name - Keypoint name
     * @returns {Object|null} Keypoint or null if not found
     */
    findKeypoint(keypoints, name) {
        if (!keypoints || !Array.isArray(keypoints)) {
            return null;
        }

        return keypoints.find(kp => kp.name === name) || null;
    }

    /**
     * Calculate average visibility of keypoints
     * 
     * @param {Array<Object>} keypoints - Array of keypoints
     * @returns {number} Average visibility (0.0-1.0)
     */
    calculateAverageVisibility(keypoints) {
        if (!keypoints || keypoints.length === 0) {
            return 0;
        }

        const sum = keypoints.reduce((acc, kp) => acc + (kp.visibility || 0), 0);
        return sum / keypoints.length;
    }
}

/**
 * Head Movement Analyzer
 * 
 * Detects head movements including turning, tilting, and nodding.
 * Analyzes nose, left_ear, and right_ear keypoints.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
class HeadMovementAnalyzer extends MovementAnalyzer {
    analyze(currentKeypoints, previousKeypoints, threshold) {
        const movements = [];

        // Find head keypoints
        const currentNose = this.findKeypoint(currentKeypoints, 'nose');
        const currentLeftEar = this.findKeypoint(currentKeypoints, 'left_ear');
        const currentRightEar = this.findKeypoint(currentKeypoints, 'right_ear');

        const previousNose = this.findKeypoint(previousKeypoints, 'nose');
        const previousLeftEar = this.findKeypoint(previousKeypoints, 'left_ear');
        const previousRightEar = this.findKeypoint(previousKeypoints, 'right_ear');

        if (!currentNose || !previousNose) {
            return movements;
        }

        // Calculate nose movement
        const noseDelta = this.calculateDelta(previousNose, currentNose);
        const noseMagnitude = this.calculateMagnitude(noseDelta);

        // Calculate confidence based on visibility
        const headKeypoints = [currentNose, currentLeftEar, currentRightEar].filter(kp => kp);
        const confidence = this.calculateAverageVisibility(headKeypoints);

        // Detect head turning (horizontal movement)
        if (Math.abs(noseDelta.x) > threshold && Math.abs(noseDelta.x) > Math.abs(noseDelta.y)) {
            const direction = noseDelta.x > 0 ? 'right' : 'left';
            movements.push({
                bodyPart: 'head',
                movementType: 'turning',
                direction: direction,
                descriptor: `turning head ${direction}`,
                confidence: confidence,
                delta: noseDelta,
                magnitude: noseMagnitude,
                timestamp: Date.now()
            });
        }

        // Detect head tilting forward/backward (vertical movement)
        if (Math.abs(noseDelta.y) > threshold && Math.abs(noseDelta.y) > Math.abs(noseDelta.x)) {
            const direction = noseDelta.y > 0 ? 'forward' : 'backward';
            movements.push({
                bodyPart: 'head',
                movementType: 'tilting',
                direction: direction,
                descriptor: `tilting head ${direction}`,
                confidence: confidence,
                delta: noseDelta,
                magnitude: noseMagnitude,
                timestamp: Date.now()
            });
        }

        // Detect head tilting to side (using ear positions)
        if (currentLeftEar && currentRightEar && previousLeftEar && previousRightEar) {
            const currentEarDiff = currentLeftEar.y - currentRightEar.y;
            const previousEarDiff = previousLeftEar.y - previousRightEar.y;
            const earDiffChange = Math.abs(currentEarDiff - previousEarDiff);

            if (earDiffChange > threshold) {
                const direction = currentEarDiff > previousEarDiff ? 'left' : 'right';
                movements.push({
                    bodyPart: 'head',
                    movementType: 'tilting_side',
                    direction: direction,
                    descriptor: `tilting head to ${direction}`,
                    confidence: confidence,
                    delta: noseDelta,
                    magnitude: earDiffChange,
                    timestamp: Date.now()
                });
            }
        }

        return movements;
    }
}


/**
 * Arm Movement Analyzer
 * 
 * Detects arm movements including raising, lowering, extending, and bending.
 * Analyzes shoulder, elbow, and wrist keypoints for specified side.
 * 
 * Requirements: 4.1, 4.2, 6.1, 6.2, 6.3, 6.4
 */
class ArmMovementAnalyzer extends MovementAnalyzer {
    constructor(side) {
        super();
        this.side = side; // 'left' or 'right'
    }

    analyze(currentKeypoints, previousKeypoints, threshold) {
        const movements = [];

        // Find arm keypoints
        const currentShoulder = this.findKeypoint(currentKeypoints, `${this.side}_shoulder`);
        const currentElbow = this.findKeypoint(currentKeypoints, `${this.side}_elbow`);
        const currentWrist = this.findKeypoint(currentKeypoints, `${this.side}_wrist`);

        const previousShoulder = this.findKeypoint(previousKeypoints, `${this.side}_shoulder`);
        const previousElbow = this.findKeypoint(previousKeypoints, `${this.side}_elbow`);
        const previousWrist = this.findKeypoint(previousKeypoints, `${this.side}_wrist`);

        if (!currentWrist || !previousWrist || !currentShoulder || !previousShoulder) {
            return movements;
        }

        // Calculate wrist movement
        const wristDelta = this.calculateDelta(previousWrist, currentWrist);
        const wristMagnitude = this.calculateMagnitude(wristDelta);

        // Calculate confidence
        const armKeypoints = [currentShoulder, currentElbow, currentWrist].filter(kp => kp);
        const confidence = this.calculateAverageVisibility(armKeypoints);

        // Detect arm raising/lowering (vertical movement)
        if (Math.abs(wristDelta.y) > threshold) {
            const direction = wristDelta.y < 0 ? 'raising' : 'lowering';
            movements.push({
                bodyPart: `${this.side}_arm`,
                movementType: direction,
                direction: 'vertical',
                descriptor: `${direction} ${this.side} hand`,
                confidence: confidence,
                delta: wristDelta,
                magnitude: wristMagnitude,
                timestamp: Date.now()
            });
        }

        // Detect arm extending forward/backward (depth movement)
        if (Math.abs(wristDelta.z) > threshold) {
            const direction = wristDelta.z < 0 ? 'forward' : 'backward';
            movements.push({
                bodyPart: `${this.side}_arm`,
                movementType: 'extending',
                direction: direction,
                descriptor: `extending ${this.side} arm ${direction}`,
                confidence: confidence,
                delta: wristDelta,
                magnitude: wristMagnitude,
                timestamp: Date.now()
            });
        }

        // Detect arm moving to side (horizontal movement)
        if (Math.abs(wristDelta.x) > threshold && Math.abs(wristDelta.x) > Math.abs(wristDelta.y)) {
            movements.push({
                bodyPart: `${this.side}_arm`,
                movementType: 'moving_side',
                direction: 'horizontal',
                descriptor: `moving ${this.side} arm to the side`,
                confidence: confidence,
                delta: wristDelta,
                magnitude: wristMagnitude,
                timestamp: Date.now()
            });
        }

        // Detect elbow bending (angle change)
        if (currentElbow && previousElbow) {
            const elbowDelta = this.calculateDelta(previousElbow, currentElbow);
            const elbowMagnitude = this.calculateMagnitude(elbowDelta);

            if (elbowMagnitude > threshold) {
                movements.push({
                    bodyPart: `${this.side}_elbow`,
                    movementType: 'bending',
                    direction: 'angle_change',
                    descriptor: `bending ${this.side} elbow`,
                    confidence: confidence,
                    delta: elbowDelta,
                    magnitude: elbowMagnitude,
                    timestamp: Date.now()
                });
            }
        }

        return movements;
    }
}

/**
 * Leg Movement Analyzer
 * 
 * Detects leg movements including lifting, kicking, and bending.
 * Analyzes hip, knee, and ankle keypoints for specified side.
 * 
 * Requirements: 4.3, 4.4, 6.5, 6.6, 6.7
 */
class LegMovementAnalyzer extends MovementAnalyzer {
    constructor(side) {
        super();
        this.side = side; // 'left' or 'right'
    }

    analyze(currentKeypoints, previousKeypoints, threshold) {
        const movements = [];

        // Find leg keypoints
        const currentHip = this.findKeypoint(currentKeypoints, `${this.side}_hip`);
        const currentKnee = this.findKeypoint(currentKeypoints, `${this.side}_knee`);
        const currentAnkle = this.findKeypoint(currentKeypoints, `${this.side}_ankle`);

        const previousHip = this.findKeypoint(previousKeypoints, `${this.side}_hip`);
        const previousKnee = this.findKeypoint(previousKeypoints, `${this.side}_knee`);
        const previousAnkle = this.findKeypoint(previousKeypoints, `${this.side}_ankle`);

        if (!currentAnkle || !previousAnkle || !currentHip || !previousHip) {
            return movements;
        }

        // Calculate ankle movement
        const ankleDelta = this.calculateDelta(previousAnkle, currentAnkle);
        const ankleMagnitude = this.calculateMagnitude(ankleDelta);

        // Calculate confidence
        const legKeypoints = [currentHip, currentKnee, currentAnkle].filter(kp => kp);
        const confidence = this.calculateAverageVisibility(legKeypoints);

        // Detect leg lifting (vertical movement)
        if (Math.abs(ankleDelta.y) > threshold && ankleDelta.y < 0) {
            movements.push({
                bodyPart: `${this.side}_leg`,
                movementType: 'lifting',
                direction: 'vertical',
                descriptor: `lifting ${this.side} foot`,
                confidence: confidence,
                delta: ankleDelta,
                magnitude: ankleMagnitude,
                timestamp: Date.now()
            });
        }

        // Detect leg kicking forward/backward (depth movement)
        if (Math.abs(ankleDelta.z) > threshold) {
            const direction = ankleDelta.z < 0 ? 'forward' : 'backward';
            movements.push({
                bodyPart: `${this.side}_leg`,
                movementType: 'kicking',
                direction: direction,
                descriptor: `kicking ${this.side} leg ${direction}`,
                confidence: confidence,
                delta: ankleDelta,
                magnitude: ankleMagnitude,
                timestamp: Date.now()
            });
        }

        // Detect knee bending (angle change)
        if (currentKnee && previousKnee) {
            const kneeDelta = this.calculateDelta(previousKnee, currentKnee);
            const kneeMagnitude = this.calculateMagnitude(kneeDelta);

            if (kneeMagnitude > threshold) {
                movements.push({
                    bodyPart: `${this.side}_knee`,
                    movementType: 'bending',
                    direction: 'angle_change',
                    descriptor: `bending ${this.side} knee`,
                    confidence: confidence,
                    delta: kneeDelta,
                    magnitude: kneeMagnitude,
                    timestamp: Date.now()
                });
            }
        }

        return movements;
    }
}

/**
 * Torso Movement Analyzer
 * 
 * Detects torso movements including rotation, bending, and leaning.
 * Analyzes shoulder and hip keypoints.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
class TorsoMovementAnalyzer extends MovementAnalyzer {
    analyze(currentKeypoints, previousKeypoints, threshold) {
        const movements = [];

        // Find torso keypoints
        const currentLeftShoulder = this.findKeypoint(currentKeypoints, 'left_shoulder');
        const currentRightShoulder = this.findKeypoint(currentKeypoints, 'right_shoulder');
        const currentLeftHip = this.findKeypoint(currentKeypoints, 'left_hip');
        const currentRightHip = this.findKeypoint(currentKeypoints, 'right_hip');

        const previousLeftShoulder = this.findKeypoint(previousKeypoints, 'left_shoulder');
        const previousRightShoulder = this.findKeypoint(previousKeypoints, 'right_shoulder');
        const previousLeftHip = this.findKeypoint(previousKeypoints, 'left_hip');
        const previousRightHip = this.findKeypoint(previousKeypoints, 'right_hip');

        if (!currentLeftShoulder || !currentRightShoulder || !currentLeftHip || !currentRightHip ||
            !previousLeftShoulder || !previousRightShoulder || !previousLeftHip || !previousRightHip) {
            return movements;
        }

        // Calculate torso center movement
        const currentTorsoCenter = {
            x: (currentLeftShoulder.x + currentRightShoulder.x + currentLeftHip.x + currentRightHip.x) / 4,
            y: (currentLeftShoulder.y + currentRightShoulder.y + currentLeftHip.y + currentRightHip.y) / 4,
            z: (currentLeftShoulder.z + currentRightShoulder.z + currentLeftHip.z + currentRightHip.z) / 4
        };

        const previousTorsoCenter = {
            x: (previousLeftShoulder.x + previousRightShoulder.x + previousLeftHip.x + previousRightHip.x) / 4,
            y: (previousLeftShoulder.y + previousRightShoulder.y + previousLeftHip.y + previousRightHip.y) / 4,
            z: (previousLeftShoulder.z + previousRightShoulder.z + previousLeftHip.z + previousRightHip.z) / 4
        };

        const torsoDelta = this.calculateDelta(previousTorsoCenter, currentTorsoCenter);
        const torsoMagnitude = this.calculateMagnitude(torsoDelta);

        // Calculate confidence
        const torsoKeypoints = [currentLeftShoulder, currentRightShoulder, currentLeftHip, currentRightHip];
        const confidence = this.calculateAverageVisibility(torsoKeypoints);

        // Detect torso rotation (horizontal shoulder movement difference)
        const currentShoulderDiff = currentLeftShoulder.x - currentRightShoulder.x;
        const previousShoulderDiff = previousLeftShoulder.x - previousRightShoulder.x;
        const shoulderDiffChange = currentShoulderDiff - previousShoulderDiff;

        if (Math.abs(shoulderDiffChange) > threshold) {
            const direction = shoulderDiffChange > 0 ? 'left' : 'right';
            movements.push({
                bodyPart: 'torso',
                movementType: 'rotating',
                direction: direction,
                descriptor: `rotating torso ${direction}`,
                confidence: confidence,
                delta: torsoDelta,
                magnitude: Math.abs(shoulderDiffChange),
                timestamp: Date.now()
            });
        }

        // Detect forward/backward bending (vertical movement)
        if (Math.abs(torsoDelta.y) > threshold) {
            const direction = torsoDelta.y > 0 ? 'forward' : 'backward';
            movements.push({
                bodyPart: 'torso',
                movementType: 'bending',
                direction: direction,
                descriptor: `bending ${direction}`,
                confidence: confidence,
                delta: torsoDelta,
                magnitude: torsoMagnitude,
                timestamp: Date.now()
            });
        }

        // Detect side leaning (horizontal movement)
        if (Math.abs(torsoDelta.x) > threshold && Math.abs(torsoDelta.x) > Math.abs(torsoDelta.y)) {
            const direction = torsoDelta.x > 0 ? 'right' : 'left';
            movements.push({
                bodyPart: 'torso',
                movementType: 'leaning',
                direction: direction,
                descriptor: `leaning ${direction}`,
                confidence: confidence,
                delta: torsoDelta,
                magnitude: torsoMagnitude,
                timestamp: Date.now()
            });
        }

        return movements;
    }
}

// Export for use in other modules
window.MovementAnalyzer = MovementAnalyzer;
window.HeadMovementAnalyzer = HeadMovementAnalyzer;
window.ArmMovementAnalyzer = ArmMovementAnalyzer;
window.LegMovementAnalyzer = LegMovementAnalyzer;
window.TorsoMovementAnalyzer = TorsoMovementAnalyzer;
