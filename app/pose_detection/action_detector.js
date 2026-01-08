/**
 * 動作偵測模組 (Action Detector)
 * 
 * 此模組用於偵測固定動作/姿勢，例如：
 * - 舉手 (Raising hand)
 * - 抬腿 (Lifting leg)
 * - 彎腰 (Bending over)
 * - 轉頭 (Turning head)
 * - 雙手舉起 (Both hands up)
 * - 深蹲 (Squatting)
 * - 等等...
 */

class ActionDetector {
    /**
     * 初始化動作偵測器
     * 
     * @param {Object} config - 設定物件
     * @param {number} config.confidenceThreshold - 偵測信心閾值 (預設: 0.5)
     * @param {boolean} config.enableSmoothing - 啟用動作平滑化 (預設: true)
     * @param {number} config.smoothingFrames - 平滑化影格數 (預設: 3)
     */
    constructor(config = {}) {
        this.config = {
            confidenceThreshold: config.confidenceThreshold || 0.5,
            enableSmoothing: config.enableSmoothing !== false,
            smoothingFrames: config.smoothingFrames || 3,
            hysteresisMargin: config.hysteresisMargin || 0.1,  // 滯後閾值邊距
            debounceFrames: config.debounceFrames || 10  // 時間窗口：需連續N幀
        };

        // 動作歷史記錄（用於平滑化和去抖動）
        this.actionHistory = {};
        
        // 動作狀態追蹤（用於滯後閾值）
        this.actionStates = {};  // { actionId: { active: boolean, frameCount: 0 } }
        
        // 定義所有可偵測的動作
        this.actionDefinitions = this.initializeActionDefinitions();
    }

    /**
     * 初始化動作定義
     * 每個動作包含名稱、描述、偵測函數
     */
    initializeActionDefinitions() {
        return {
            // ===== 手部動作 =====
            // Note: Labels and detection are swapped because webcam view is mirrored
            // right keypoints appear on LEFT side of screen
            'right_hand_raised': {
                name: 'Left Hand Raised',
                nameZh: '左手舉起',
                category: 'arm',
                icon: '🤚',
                detect: (kp) => this.detectHandRaised(kp, 'left')  // Detect LEFT keypoint for screen RIGHT
            },
            'left_hand_raised': {
                name: 'Right Hand Raised',
                nameZh: '右手舉起',
                category: 'arm',
                icon: '✋',
                detect: (kp) => this.detectHandRaised(kp, 'right')  // Detect RIGHT keypoint for screen LEFT
            },
            'both_hands_raised': {
                name: 'Both Hands Raised',
                nameZh: '雙手舉起',
                category: 'arm',
                icon: '🙌',
                detect: (kp) => this.detectBothHandsRaised(kp)
            },
            'right_hand_waving': {
                name: 'Left Hand Waving',
                nameZh: '左手揮動',
                category: 'arm',
                icon: '👋',
                detect: (kp) => this.detectHandWaving(kp, 'left')
            },
            'left_hand_waving': {
                name: 'Right Hand Waving',
                nameZh: '右手揮動',
                category: 'arm',
                icon: '👋',
                detect: (kp) => this.detectHandWaving(kp, 'right')
            },
            'arms_crossed': {
                name: 'Arms Crossed',
                nameZh: '雙手交叉',
                category: 'arm',
                icon: '🤞',
                detect: (kp) => this.detectArmsCrossed(kp)
            },
            'arms_akimbo': {
                name: 'Arms Akimbo',
                nameZh: '雙手叉腰',
                category: 'arm',
                icon: '💪',
                detect: (kp) => this.detectArmsAkimbo(kp)
            },

            // ===== 腿部動作 =====
            // Note: Labels and detection are swapped because webcam view is mirrored
            'right_leg_raised': {
                name: 'Left Leg Raised',
                nameZh: '左腿抬起',
                category: 'leg',
                icon: '🦵',
                detect: (kp) => this.detectLegRaised(kp, 'left')
            },
            'left_leg_raised': {
                name: 'Right Leg Raised',
                nameZh: '右腿抬起',
                category: 'leg',
                icon: '🦵',
                detect: (kp) => this.detectLegRaised(kp, 'right')
            },
            'squatting': {
                name: 'Squatting',
                nameZh: '深蹲',
                category: 'leg',
                icon: '🏋️',
                detect: (kp) => this.detectSquatting(kp)
            },

            // ===== 身體動作 =====
            'bending_forward': {
                name: 'Bending Forward',
                nameZh: '向前彎腰',
                category: 'torso',
                icon: '🙇',
                detect: (kp) => this.detectBendingForward(kp)
            },
            // Note: Labels and detection are swapped because webcam view is mirrored
            'leaning_left': {
                name: 'Leaning Right',
                nameZh: '向右傾斜',
                category: 'torso',
                icon: '↘️',
                detect: (kp) => this.detectLeaning(kp, 'right')
            },
            'leaning_right': {
                name: 'Leaning Left',
                nameZh: '向左傾斜',
                category: 'torso',
                icon: '↙️',
                detect: (kp) => this.detectLeaning(kp, 'left')
            },
            'torso_twist_left': {
                name: 'Torso Twist Right',
                nameZh: '身體右轉',
                category: 'torso',
                icon: '↪️',
                detect: (kp) => this.detectTorsoTwist(kp, 'right')
            },
            'torso_twist_right': {
                name: 'Torso Twist Left',
                nameZh: '身體左轉',
                category: 'torso',
                icon: '↩️',
                detect: (kp) => this.detectTorsoTwist(kp, 'left')
            },

            // ===== 頭部動作 =====
            // Note: Labels are swapped because webcam view is mirrored
            'head_turn_left': {
                name: 'Head Turn Right',
                nameZh: '頭向右轉',
                category: 'head',
                icon: '👉',
                detect: (kp) => this.detectHeadTurn(kp, 'left')
            },
            'head_turn_right': {
                name: 'Head Turn Left',
                nameZh: '頭向左轉',
                category: 'head',
                icon: '👈',
                detect: (kp) => this.detectHeadTurn(kp, 'right')
            },
            'head_tilt_left': {
                name: 'Head Tilt Right',
                nameZh: '頭向右傾',
                category: 'head',
                icon: '↗️',
                detect: (kp) => this.detectHeadTilt(kp, 'right')
            },
            'head_tilt_right': {
                name: 'Head Tilt Left',
                nameZh: '頭向左傾',
                category: 'head',
                icon: '↖️',
                detect: (kp) => this.detectHeadTilt(kp, 'left')
            },
            'head_nod': {
                name: 'Head Nod (Looking Down)',
                nameZh: '低頭',
                category: 'head',
                icon: '👇',
                detect: (kp) => this.detectHeadNod(kp)
            },
            'head_up': {
                name: 'Head Up (Looking Up)',
                nameZh: '抬頭',
                category: 'head',
                icon: '👆',
                detect: (kp) => this.detectHeadUp(kp)
            },

            // ===== 組合動作 =====
            'jumping_jack': {
                name: 'Jumping Jack',
                nameZh: '開合跳姿勢',
                category: 'combo',
                icon: '⭐',
                detect: (kp) => this.detectJumpingJack(kp)
            },
            'victory_pose': {
                name: 'Victory Pose',
                nameZh: '勝利姿勢',
                category: 'combo',
                icon: '✌️',
                detect: (kp) => this.detectVictoryPose(kp)
            },
            
        };
    }

    /**
     * 依名稱尋找關鍵點
     */
    findKeypoint(keypoints, name) {
        if (!keypoints || !Array.isArray(keypoints)) return null;
        return keypoints.find(kp => kp.name === name) || null;
    }

    /**
     * 計算兩點之間的距離
     */
    calculateDistance(p1, p2) {
        if (!p1 || !p2) return Infinity;
        const dx = (p1.x || 0) - (p2.x || 0);
        const dy = (p1.y || 0) - (p2.y || 0);
        const dz = (p1.z || 0) - (p2.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * 計算三點形成的角度（以 p2 為頂點）
     */
    calculateAngle(p1, p2, p3) {
        if (!p1 || !p2 || !p3) return 0;

        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

        const dot = v1.x * v2.x + v1.y * v2.y;
        const cross = v1.x * v2.y - v1.y * v2.x;

        return Math.atan2(cross, dot) * (180 / Math.PI);
    }

    /**
     * 計算關鍵點平均可見度
     */
    calculateAverageVisibility(keypoints) {
        const validKps = keypoints.filter(kp => kp);
        if (validKps.length === 0) return 0;
        return validKps.reduce((sum, kp) => sum + (kp.visibility || 0), 0) / validKps.length;
    }

    /**
     * 計算軀幹長度（用於標準化距離）
     * 使用肩膀到臀部的平均距離
     */
    calculateTorsoLength(keypoints) {
        const leftShoulder = this.findKeypoint(keypoints, 'left_shoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'right_shoulder');
        const leftHip = this.findKeypoint(keypoints, 'left_hip');
        const rightHip = this.findKeypoint(keypoints, 'right_hip');

        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
            return 1.0; // 預設值避免除以0
        }

        const leftTorso = this.calculateDistance(leftShoulder, leftHip);
        const rightTorso = this.calculateDistance(rightShoulder, rightHip);
        return (leftTorso + rightTorso) / 2;
    }

    /**
     * 標準化距離（相對於軀幹長度）
     */
    normalizeDistance(distance, keypoints) {
        const torsoLength = this.calculateTorsoLength(keypoints);
        return distance / torsoLength;
    }

    // ========== 動作偵測函數 ==========

    /**
     * 判斷關鍵點是否可用（存在且可見度足夠）
     */
    isKeypointUsable(kp, minVisibility = 0.15) {
        return !!kp && (kp.visibility === undefined || kp.visibility >= minVisibility);
    }

    /**
     * 偵測單手舉起
     */
    detectHandRaised(keypoints, side) {
        const wrist = this.findKeypoint(keypoints, `${side}_wrist`);
        const shoulder = this.findKeypoint(keypoints, `${side}_shoulder`);
        const elbow = this.findKeypoint(keypoints, `${side}_elbow`);
        const hip = this.findKeypoint(keypoints, `${side}_hip`);

        // elbow 可能因遮擋/角度不穩，允許在缺少 elbow 時使用較嚴格的 wrist 判斷
        if (!wrist || !shoulder) {
            return { detected: false, confidence: 0 };
        }

        // 若關鍵點可見度太低，避免抖動造成誤判
        const visibility = this.calculateAverageVisibility([wrist, shoulder, elbow].filter(Boolean));
        if (visibility < 0.15) {
            return { detected: false, confidence: 0 };
        }

        // 手腕高於肩膀
        const wristAboveShoulder = wrist.y < shoulder.y;

        // 手肘條件放寬：手肘略低於肩膀時仍可能是舉手（鏡頭角度/遮擋常見）
        const elbowNearOrAboveShoulder = elbow ? (elbow.y < shoulder.y + 0.15) : false;

        // 當手腕「明顯高於肩」時，不強制要求手肘高度
        const wristClearlyAbove = wrist.y < shoulder.y - 0.05;

        if (wristAboveShoulder && (elbowNearOrAboveShoulder || wristClearlyAbove)) {
            // 以「手腕高於肩膀的程度」做一點加成，讓長時間舉手更穩
            const heightGain = Math.max(0, Math.min(1, (shoulder.y - wrist.y) / 0.25));
            const confidence = Math.min(1.0, visibility * (0.75 + heightGain * 0.55));
            return { detected: true, confidence };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測雙手舉起
     */
    detectBothHandsRaised(keypoints) {
        const leftResult = this.detectHandRaised(keypoints, 'left');
        const rightResult = this.detectHandRaised(keypoints, 'right');

        if (leftResult.detected && rightResult.detected) {
            // 平均會在其中一邊被遮擋時下降過多；給一點小的 "both" 加成，避免長時間只剩單手
            const avg = (leftResult.confidence + rightResult.confidence) / 2;
            const minSide = Math.min(leftResult.confidence, rightResult.confidence);
            const confidence = Math.min(1.0, avg * 0.85 + minSide * 0.25 + 0.08);
            return { detected: true, confidence };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測手揮動（需要歷史資料）
     */
    detectHandWaving(keypoints, side) {
        const wrist = this.findKeypoint(keypoints, `${side}_wrist`);
        const shoulder = this.findKeypoint(keypoints, `${side}_shoulder`);

        if (!wrist || !shoulder) {
            return { detected: false, confidence: 0 };
        }

        // 簡化版：手腕在肩膀上方且在側邊
        const wristAboveShoulder = wrist.y < shoulder.y;
        const wristToSide = Math.abs(wrist.x - shoulder.x) > 0.1;

        if (wristAboveShoulder && wristToSide) {
            const visibility = this.calculateAverageVisibility([wrist, shoulder]);
            return { detected: true, confidence: visibility * 0.8 };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測雙手交叉
     */
    detectArmsCrossed(keypoints) {
        const leftWrist = this.findKeypoint(keypoints, 'left_wrist');
        const rightWrist = this.findKeypoint(keypoints, 'right_wrist');
        const leftShoulder = this.findKeypoint(keypoints, 'left_shoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'right_shoulder');
        const leftElbow = this.findKeypoint(keypoints, 'left_elbow');
        const rightElbow = this.findKeypoint(keypoints, 'right_elbow');

        if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) {
            return { detected: false, confidence: 0 };
        }

        const visibility = this.calculateAverageVisibility([leftWrist, rightWrist, leftShoulder, rightShoulder]);
        if (visibility < 0.15) {
            return { detected: false, confidence: 0 };
        }

        // 以「靠近對側肩膀」判定交叉，比單純比較 x 更耐鏡像/角度/靠近中心時的誤差
        const leftWristToLeftShoulder = this.calculateDistance(leftWrist, leftShoulder);
        const leftWristToRightShoulder = this.calculateDistance(leftWrist, rightShoulder);
        const rightWristToRightShoulder = this.calculateDistance(rightWrist, rightShoulder);
        const rightWristToLeftShoulder = this.calculateDistance(rightWrist, leftShoulder);

        const leftOnOppositeSide = leftWristToRightShoulder + 1e-6 < leftWristToLeftShoulder;
        const rightOnOppositeSide = rightWristToLeftShoulder + 1e-6 < rightWristToRightShoulder;
        const wristsCrossed = leftOnOppositeSide && rightOnOppositeSide;

        // 手腕在胸前（以肩膀中心附近作約束）
        const centerY = (leftShoulder.y + rightShoulder.y) / 2;
        const wristsNearChest = Math.abs(leftWrist.y - centerY) < 0.38 &&
                    Math.abs(rightWrist.y - centerY) < 0.38;

        // 退而求其次：在鏡像/角度下，對側肩距離不一定穩；加上「跨過身體中心線」的判斷
        const centerX = (leftShoulder.x + rightShoulder.x) / 2;
        const crossingCenterLine = (leftWrist.x > centerX) && (rightWrist.x < centerX);

        // 手腕彼此距離不要太遠（避免只是把手張開到對側）
        const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
        const wristsClose = this.calculateDistance(leftWrist, rightWrist) < Math.max(0.25, shoulderWidth * 1.25);

        if ((wristsCrossed || crossingCenterLine) && wristsNearChest && wristsClose) {
            // 交叉常因遮擋造成 visibility 偏低；信心度用基底 + visibility 加權，較容易過閾值
            const confidence = Math.min(1.0, 0.45 + visibility * 0.75);
            return { detected: true, confidence };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測雙手叉腰
     */
    detectArmsAkimbo(keypoints) {
        const leftWrist = this.findKeypoint(keypoints, 'left_wrist');
        const rightWrist = this.findKeypoint(keypoints, 'right_wrist');
        const leftHip = this.findKeypoint(keypoints, 'left_hip');
        const rightHip = this.findKeypoint(keypoints, 'right_hip');
        const leftElbow = this.findKeypoint(keypoints, 'left_elbow');
        const rightElbow = this.findKeypoint(keypoints, 'right_elbow');

        if (!leftWrist || !rightWrist || !leftHip || !rightHip) {
            return { detected: false, confidence: 0 };
        }

        // 手腕靠近臀部
        const leftWristNearHip = this.calculateDistance(leftWrist, leftHip) < 0.15;
        const rightWristNearHip = this.calculateDistance(rightWrist, rightHip) < 0.15;
        
        // 手肘向外張開
        const leftElbowOut = leftElbow && leftElbow.x < leftWrist.x;
        const rightElbowOut = rightElbow && rightElbow.x > rightWrist.x;

        if (leftWristNearHip && rightWristNearHip) {
            const visibility = this.calculateAverageVisibility([leftWrist, rightWrist, leftHip, rightHip]);
            return { detected: true, confidence: visibility * 0.9 };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測腿抬起（使用標準化距離）
     */
    detectLegRaised(keypoints, side) {
        const ankle = this.findKeypoint(keypoints, `${side}_ankle`);
        const knee = this.findKeypoint(keypoints, `${side}_knee`);
        const hip = this.findKeypoint(keypoints, `${side}_hip`);
        const otherAnkle = this.findKeypoint(keypoints, `${side === 'left' ? 'right' : 'left'}_ankle`);

        if (!ankle || !knee || !hip || !otherAnkle) {
            return { detected: false, confidence: 0 };
        }

        // 使用標準化距離（相對於軀幹長度）
        const torsoLength = this.calculateTorsoLength(keypoints);
        const ankleDiff = otherAnkle.y - ankle.y;
        const normalizedDiff = ankleDiff / torsoLength;
        
        // 腳踝明顯高於另一隻腳（標準化閾值）
        const legRaised = normalizedDiff > 0.15;

        if (legRaised) {
            const visibility = this.calculateAverageVisibility([ankle, knee, hip]);
            const confidence = Math.min(1.0, visibility * (0.7 + normalizedDiff * 2));
            return { detected: true, confidence };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測深蹲
     */
    detectSquatting(keypoints) {
        const leftKnee = this.findKeypoint(keypoints, 'left_knee');
        const rightKnee = this.findKeypoint(keypoints, 'right_knee');
        const leftHip = this.findKeypoint(keypoints, 'left_hip');
        const rightHip = this.findKeypoint(keypoints, 'right_hip');
        const leftAnkle = this.findKeypoint(keypoints, 'left_ankle');
        const rightAnkle = this.findKeypoint(keypoints, 'right_ankle');

        if (!leftKnee || !rightKnee || !leftHip || !rightHip) {
            return { detected: false, confidence: 0 };
        }

        // 深蹲容易與「單腳抬腿/單膝彎曲」混淆。
        // 這裡改成：必須同時滿足「臀部下降」+「雙膝彎曲（且腳踝可用）」才算深蹲。

        const visibility = this.calculateAverageVisibility([leftKnee, rightKnee, leftHip, rightHip, leftAnkle, rightAnkle].filter(Boolean));
        if (visibility < 0.15) {
            return { detected: false, confidence: 0 };
        }

        const anklesUsable = this.isKeypointUsable(leftAnkle) && this.isKeypointUsable(rightAnkle);
        if (!anklesUsable) {
            return { detected: false, confidence: 0 };
        }

        // 臀部下降（臀部接近膝蓋高度）
        const hipLevel = (leftHip.y + rightHip.y) / 2;
        const kneeLevel = (leftKnee.y + rightKnee.y) / 2;
        const hipLowered = hipLevel > kneeLevel - 0.10;

        // 膝蓋彎曲角度（較寬鬆的角度閾值，但要求雙膝）
        const leftKneeAngle = Math.abs(this.calculateAngle(leftHip, leftKnee, leftAnkle));
        const rightKneeAngle = Math.abs(this.calculateAngle(rightHip, rightKnee, rightAnkle));
        const kneesBentBoth = leftKneeAngle < 135 && rightKneeAngle < 135;

        if (hipLowered && kneesBentBoth) {
            return { detected: true, confidence: Math.min(1.0, visibility * 0.95) };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測向前彎腰
     */
    detectBendingForward(keypoints) {
        const nose = this.findKeypoint(keypoints, 'nose');
        const leftShoulder = this.findKeypoint(keypoints, 'left_shoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'right_shoulder');
        const leftHip = this.findKeypoint(keypoints, 'left_hip');
        const rightHip = this.findKeypoint(keypoints, 'right_hip');

        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
            return { detected: false, confidence: 0 };
        }

        // 肩膀中心
        const shoulderCenter = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2,
            z: ((leftShoulder.z || 0) + (rightShoulder.z || 0)) / 2
        };
        // 臀部中心
        const hipCenter = {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2,
            z: ((leftHip.z || 0) + (rightHip.z || 0)) / 2
        };

        // 肩膀低於正常站立位置（接近臀部高度）
        const shoulderLowered = shoulderCenter.y > hipCenter.y - 0.2;
        
        // 肩膀向前傾（z軸）
        const leaningForward = shoulderCenter.z < hipCenter.z - 0.1;

        // 鼻子位置低
        const noseDown = nose && nose.y > shoulderCenter.y;

        if (shoulderLowered || leaningForward || noseDown) {
            const visibility = this.calculateAverageVisibility([leftShoulder, rightShoulder, leftHip, rightHip]);
            return { detected: true, confidence: visibility * 0.85 };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測身體側傾
     */
    detectLeaning(keypoints, direction) {
        const leftShoulder = this.findKeypoint(keypoints, 'left_shoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'right_shoulder');
        const leftHip = this.findKeypoint(keypoints, 'left_hip');
        const rightHip = this.findKeypoint(keypoints, 'right_hip');

        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
            return { detected: false, confidence: 0 };
        }

        // 肩膀傾斜角度
        const shoulderSlope = leftShoulder.y - rightShoulder.y;
        const hipSlope = leftHip.y - rightHip.y;

        const threshold = 0.05;
        let leaning = false;

        if (direction === 'left') {
            leaning = shoulderSlope < -threshold;
        } else {
            leaning = shoulderSlope > threshold;
        }

        if (leaning) {
            const visibility = this.calculateAverageVisibility([leftShoulder, rightShoulder]);
            return { detected: true, confidence: visibility * 0.85 };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測身體扭轉
     */
    detectTorsoTwist(keypoints, direction) {
        const leftShoulder = this.findKeypoint(keypoints, 'left_shoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'right_shoulder');
        const leftHip = this.findKeypoint(keypoints, 'left_hip');
        const rightHip = this.findKeypoint(keypoints, 'right_hip');

        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
            return { detected: false, confidence: 0 };
        }

        // 肩膀寬度與臀部寬度比較
        const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
        const hipWidth = Math.abs(leftHip.x - rightHip.x);

        // 肩膀中心偏移
        const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
        const hipCenterX = (leftHip.x + rightHip.x) / 2;
        const twist = shoulderCenterX - hipCenterX;

        const threshold = 0.03;
        let twisting = false;

        if (direction === 'left') {
            twisting = twist < -threshold;
        } else {
            twisting = twist > threshold;
        }

        if (twisting || shoulderWidth < hipWidth * 0.7) {
            const visibility = this.calculateAverageVisibility([leftShoulder, rightShoulder, leftHip, rightHip]);
            return { detected: true, confidence: visibility * 0.8 };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測頭部轉向
     */
    detectHeadTurn(keypoints, direction) {
        const nose = this.findKeypoint(keypoints, 'nose');
        const leftEar = this.findKeypoint(keypoints, 'left_ear');
        const rightEar = this.findKeypoint(keypoints, 'right_ear');
        const leftShoulder = this.findKeypoint(keypoints, 'left_shoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'right_shoulder');

        if (!nose || !leftShoulder || !rightShoulder) {
            return { detected: false, confidence: 0 };
        }

        // Normalize nose offset by shoulder width (more stable across zoom/camera distance)
        const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
        const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
        if (shoulderWidth < 1e-6) {
            return { detected: false, confidence: 0 };
        }

        const noseOffsetNorm = (nose.x - shoulderCenterX) / shoulderWidth; // ~[-0.5, 0.5]

        // Secondary cue: nose closer to one shoulder (also normalized)
        const distToLeft = Math.abs(nose.x - leftShoulder.x);
        const distToRight = Math.abs(nose.x - rightShoulder.x);
        const closenessNorm = (distToRight - distToLeft) / shoulderWidth; // >0 means nose closer to left shoulder

        const threshold = 0.12;
        let turning = false;
        let signedScore = 0;

        if (direction === 'left') {
            // 'left' means keypoint left, which appears RIGHT on mirrored screen
            // So nose should move RIGHT (positive x offset)
            turning = noseOffsetNorm > threshold || closenessNorm < -threshold;
            signedScore = Math.max(noseOffsetNorm, -closenessNorm);
        } else {
            // 'right' means keypoint right, which appears LEFT on mirrored screen
            // So nose should move LEFT (negative x offset)
            turning = noseOffsetNorm < -threshold || closenessNorm > threshold;
            signedScore = Math.max(-noseOffsetNorm, closenessNorm);
        }

        // Ear visibility is often noisy; only use it as a weak hint.
        if (!turning && leftEar && rightEar) {
            const leftV = leftEar.visibility || 0;
            const rightV = rightEar.visibility || 0;
            if (direction === 'left') {
                turning = rightV > leftV + 0.25;
            } else {
                turning = leftV > rightV + 0.25;
            }
        }

        if (turning) {
            const visibility = this.calculateAverageVisibility([nose, leftShoulder, rightShoulder, leftEar, rightEar].filter(Boolean));
            const magnitude = Math.max(0, Math.abs(signedScore) - threshold);
            const score = Math.min(1.0, magnitude / 0.25);
            const confidence = Math.min(1.0, visibility * 0.75 + score * 0.65);
            return { detected: true, confidence };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測頭部傾斜
     */
    detectHeadTilt(keypoints, direction) {
        const leftEar = this.findKeypoint(keypoints, 'left_ear');
        const rightEar = this.findKeypoint(keypoints, 'right_ear');
        const leftEye = this.findKeypoint(keypoints, 'left_eye');
        const rightEye = this.findKeypoint(keypoints, 'right_eye');
        const leftShoulder = this.findKeypoint(keypoints, 'left_shoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'right_shoulder');

        // Prefer ears; fall back to eyes when ears are missing/unstable
        const leftPoint = leftEar || leftEye;
        const rightPoint = rightEar || rightEye;

        if (!leftPoint || !rightPoint) {
            return { detected: false, confidence: 0 };
        }

        const headWidth = Math.abs(rightPoint.x - leftPoint.x);
        if (headWidth < 1e-6) {
            return { detected: false, confidence: 0 };
        }

        // Remove torso lean influence by subtracting shoulder slope (when available)
        const rawDiff = leftPoint.y - rightPoint.y;
        const shoulderDiff = (leftShoulder && rightShoulder) ? (leftShoulder.y - rightShoulder.y) : 0;
        const adjustedDiff = rawDiff - shoulderDiff * 0.7;

        const tiltNorm = adjustedDiff / headWidth;
        const threshold = 0.10;

        let tilting = false;
        let signedScore = 0;
        if (direction === 'left') {
            tilting = tiltNorm > threshold;
            signedScore = tiltNorm;
        } else {
            tilting = tiltNorm < -threshold;
            signedScore = -tiltNorm;
        }

        if (tilting) {
            const visibility = this.calculateAverageVisibility([leftPoint, rightPoint, leftShoulder, rightShoulder].filter(Boolean));
            const magnitude = Math.max(0, signedScore - threshold);
            const score = Math.min(1.0, magnitude / 0.25);
            const confidence = Math.min(1.0, visibility * 0.75 + score * 0.65);
            return { detected: true, confidence };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測低頭
     */
    detectHeadNod(keypoints) {
        const nose = this.findKeypoint(keypoints, 'nose');
        const leftShoulder = this.findKeypoint(keypoints, 'left_shoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'right_shoulder');

        if (!nose || !leftShoulder || !rightShoulder) {
            return { detected: false, confidence: 0 };
        }

        // 肩膀高度
        const shoulderLevel = (leftShoulder.y + rightShoulder.y) / 2;
        
        // 鼻子接近或低於肩膀
        const headDown = nose.y > shoulderLevel - 0.1;

        if (headDown) {
            const visibility = nose.visibility || 0.5;
            return { detected: true, confidence: visibility * 0.9 };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測抬頭
     */
    detectHeadUp(keypoints) {
        const nose = this.findKeypoint(keypoints, 'nose');
        const leftEye = this.findKeypoint(keypoints, 'left_eye');
        const rightEye = this.findKeypoint(keypoints, 'right_eye');
        const leftShoulder = this.findKeypoint(keypoints, 'left_shoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'right_shoulder');

        if (!nose || !leftShoulder || !rightShoulder) {
            return { detected: false, confidence: 0 };
        }

        // 鼻子遠高於肩膀
        const shoulderLevel = (leftShoulder.y + rightShoulder.y) / 2;
        const headUp = nose.y < shoulderLevel - 0.25;

        // 眼睛可見度低（因為仰頭看）
        const eyeVisibility = leftEye && rightEye ? 
            ((leftEye.visibility || 0) + (rightEye.visibility || 0)) / 2 : 1;

        if (headUp) {
            const visibility = nose.visibility || 0.5;
            return { detected: true, confidence: visibility * 0.9 };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測開合跳姿勢
     */
    detectJumpingJack(keypoints) {
        // Jumping Jack uses an internal "arms spread" check (previously reused T-pose).
        const leftWrist = this.findKeypoint(keypoints, 'left_wrist');
        const rightWrist = this.findKeypoint(keypoints, 'right_wrist');
        const leftShoulder = this.findKeypoint(keypoints, 'left_shoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'right_shoulder');

        let armsSpreadDetected = false;
        let armsSpreadConfidence = 0;
        if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
            const shoulderLevel = (leftShoulder.y + rightShoulder.y) / 2;
            const leftArmHorizontal = Math.abs(leftWrist.y - shoulderLevel) < 0.1;
            const rightArmHorizontal = Math.abs(rightWrist.y - shoulderLevel) < 0.1;

            const leftArmExtended = leftWrist.x < leftShoulder.x;
            const rightArmExtended = rightWrist.x > rightShoulder.x;

            if (leftArmHorizontal && rightArmHorizontal && leftArmExtended && rightArmExtended) {
                armsSpreadDetected = true;
                armsSpreadConfidence = this.calculateAverageVisibility([leftWrist, rightWrist, leftShoulder, rightShoulder]);
            }
        }

        const leftAnkle = this.findKeypoint(keypoints, 'left_ankle');
        const rightAnkle = this.findKeypoint(keypoints, 'right_ankle');
        const leftHip = this.findKeypoint(keypoints, 'left_hip');
        const rightHip = this.findKeypoint(keypoints, 'right_hip');

        if (!leftAnkle || !rightAnkle || !leftHip || !rightHip) {
            return { detected: false, confidence: 0 };
        }

        // 雙腳分開
        const hipWidth = Math.abs(leftHip.x - rightHip.x);
        const ankleWidth = Math.abs(leftAnkle.x - rightAnkle.x);
        const legsSpread = ankleWidth > hipWidth * 1.2;

        // 手臂展開 + 雙腳分開
        if (armsSpreadDetected && legsSpread) {
            return { detected: true, confidence: armsSpreadConfidence };
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測勝利姿勢 (V字手勢)
     */
    detectVictoryPose(keypoints) {
        const bothHandsRaised = this.detectBothHandsRaised(keypoints);
        const leftWrist = this.findKeypoint(keypoints, 'left_wrist');
        const rightWrist = this.findKeypoint(keypoints, 'right_wrist');
        const leftShoulder = this.findKeypoint(keypoints, 'left_shoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'right_shoulder');

        if (!bothHandsRaised.detected) {
            return { detected: false, confidence: 0 };
        }

        // 雙手向外張開形成 V 字
        if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
            const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
            const wristWidth = Math.abs(leftWrist.x - rightWrist.x);
            const vShape = wristWidth > shoulderWidth * 1.5;

            if (vShape) {
                return { detected: true, confidence: bothHandsRaised.confidence };
            }
        }

        return { detected: false, confidence: 0 };
    }

    /**
     * 偵測所有動作
     * 
     * @param {Array<Object>} keypoints - 關鍵點陣列
     * @returns {Array<Object>} 偵測到的動作陣列
     */
    detectActions(keypoints) {
        if (!keypoints || keypoints.length === 0) {
            return [];
        }

        const detectedActions = [];

        // 遍歷所有動作定義
        for (const [actionId, actionDef] of Object.entries(this.actionDefinitions)) {
            try {
                const result = actionDef.detect(keypoints);
                
                // 應用滯後閾值和去抖動
                const shouldReport = this.applyHysteresisAndDebounce(
                    actionId, 
                    result.detected, 
                    result.confidence
                );
                
                if (shouldReport) {
                    // 應用平滑化
                    const smoothedConfidence = this.applySmoothing(actionId, result.confidence);
                    
                    detectedActions.push({
                        id: actionId,
                        name: actionDef.name,
                        nameZh: actionDef.nameZh,
                        category: actionDef.category,
                        icon: actionDef.icon,
                        confidence: smoothedConfidence,
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                console.warn(`⚠️ Error detecting action ${actionId}:`, error);
            }
        }

        // 按信心度排序
        detectedActions.sort((a, b) => b.confidence - a.confidence);

        return detectedActions;
    }

    /**
     * 應用滯後閾值和去抖動
     * 滯後閾值：進入閾值 > 退出閾值，避免邊界閃爍
     * 去抖動：必須連續N幀符合條件才報告
     */
    applyHysteresisAndDebounce(actionId, rawDetected, rawConfidence) {
        // 初始化狀態
        if (!this.actionStates[actionId]) {
            this.actionStates[actionId] = {
                active: false,
                frameCount: 0
            };
        }

        const state = this.actionStates[actionId];

        // 部分動作（例如雙手同時/交叉）容易因遮擋、鏡像與手腕抖動導致短暫掉幀。
        // 針對這些動作降低去抖幀數與滯後邊距，讓「持續做同一個動作」更容易穩定維持。
        let hysteresisMargin = this.config.hysteresisMargin;
        let debounceFrames = this.config.debounceFrames;
        const stableComboActions = new Set(['both_hands_raised', 'arms_crossed']);
        if (stableComboActions.has(actionId)) {
            hysteresisMargin = Math.min(hysteresisMargin, 0.05);
            debounceFrames = Math.min(debounceFrames, 4);
        }

        const enterThreshold = this.config.confidenceThreshold + hysteresisMargin;
        const exitThreshold = this.config.confidenceThreshold - hysteresisMargin;

        // 滯後閾值邏輯
        if (state.active) {
            // 已激活：需低於退出閾值才取消
            if (!rawDetected || rawConfidence < exitThreshold) {
                state.frameCount = Math.max(0, state.frameCount - 2); // 快速衰減
                if (state.frameCount === 0) {
                    state.active = false;
                }
            } else {
                state.frameCount = Math.min(debounceFrames, state.frameCount + 1);
            }
        } else {
            // 未激活：需高於進入閾值才激活
            if (rawDetected && rawConfidence >= enterThreshold) {
                state.frameCount++;
                if (state.frameCount >= debounceFrames) {
                    state.active = true;
                }
            } else {
                state.frameCount = Math.max(0, state.frameCount - 1);
            }
        }

        return state.active;
    }

    /**
     * 應用動作平滑化
     */
    applySmoothing(actionId, confidence) {
        if (!this.config.enableSmoothing) {
            return confidence;
        }

        if (!this.actionHistory[actionId]) {
            this.actionHistory[actionId] = [];
        }

        this.actionHistory[actionId].push(confidence);

        // 保持指定影格數
        while (this.actionHistory[actionId].length > this.config.smoothingFrames) {
            this.actionHistory[actionId].shift();
        }

        // 計算平均信心度
        const avg = this.actionHistory[actionId].reduce((sum, c) => sum + c, 0) / 
                    this.actionHistory[actionId].length;

        return avg;
    }

    /**
     * 重置動作歷史
     */
    resetActionHistory(actionId) {
        if (this.actionHistory[actionId]) {
            this.actionHistory[actionId] = [];
        }
    }

    /**
     * 清除所有歷史
     */
    clearHistory() {
        this.actionHistory = {};
        this.actionStates = {};
    }

    /**
     * 取得所有可偵測的動作定義
     */
    getActionDefinitions() {
        return Object.entries(this.actionDefinitions).map(([id, def]) => ({
            id,
            name: def.name,
            nameZh: def.nameZh,
            category: def.category,
            icon: def.icon
        }));
    }

    /**
     * 依類別取得動作
     */
    getActionsByCategory(category) {
        return this.getActionDefinitions().filter(action => action.category === category);
    }
}

// 匯出供其他模組使用
window.ActionDetector = ActionDetector;