/**
 * PoseRenderer - Renders pose keypoints and skeleton on canvas
 */
class PoseRenderer {
    constructor() {
        // Define connections between keypoints to form skeleton
        // Format: [startKeypointIndex, endKeypointIndex]
        this.POSE_CONNECTIONS = [
            // Arms
            [11, 13], [13, 15],  // Left arm: shoulder-elbow-wrist
            [12, 14], [14, 16],  // Right arm: shoulder-elbow-wrist
            
            // Shoulders
            [11, 12],
            
            // Torso
            [11, 23], [12, 24],  // Shoulders to hips
            
            // Hips
            [23, 24],
            
            // Legs
            [23, 25], [25, 27],  // Left leg: hip-knee-ankle
            [24, 26], [26, 28]   // Right leg: hip-knee-ankle
        ];
        
        // Keypoint names for reference (MediaPipe Pose indices)
        this.KEYPOINT_NAMES = [
            'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
            'right_eye_inner', 'right_eye', 'right_eye_outer',
            'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
            'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
            'left_index', 'right_index', 'left_thumb', 'right_thumb',
            'left_hip', 'right_hip', 'left_knee', 'right_knee',
            'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
            'left_foot_index', 'right_foot_index'
        ];
    }
    
    /**
     * Clear the canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    clearCanvas(ctx, width, height) {
        ctx.clearRect(0, 0, width, height);
    }
    
    /**
     * Get color based on confidence score
     * @param {number} confidence - Confidence score (0-1)
     * @returns {string} RGBA color string
     */
    getKeypointColor(confidence) {
        if (confidence >= 0.7) {
            return `rgba(0, 255, 0, ${confidence})`; // Green for high confidence
        } else if (confidence >= 0.3) {
            return `rgba(255, 255, 0, ${confidence})`; // Yellow for medium confidence
        } else {
            return `rgba(255, 0, 0, ${confidence * 0.5})`; // Red with low opacity for low confidence
        }
    }
    
    /**
     * Get color based on depth (z-coordinate)
     * Creates gradient: blue (far) → cyan → green → yellow → red (close)
     * @param {number} z - Depth coordinate (z_normalized, 0.0-1.0)
     * @param {number} minZ - Minimum z value in the set
     * @param {number} maxZ - Maximum z value in the set
     * @returns {string} RGBA color string
     */
    getDepthColor(z, minZ, maxZ) {
        // Normalize z to 0-1 range based on min/max
        let normalizedZ;
        if (maxZ === minZ) {
            normalizedZ = 0.5; // If all points at same depth, use middle color
        } else {
            normalizedZ = (z - minZ) / (maxZ - minZ);
        }
        
        // Create color gradient: blue (0) → cyan → green → yellow → red (1)
        // 0.0 = far (blue), 1.0 = close (red)
        let r, g, b;
        
        if (normalizedZ < 0.25) {
            // Blue to Cyan (0.0 - 0.25)
            const t = normalizedZ / 0.25;
            r = 0;
            g = Math.round(255 * t);
            b = 255;
        } else if (normalizedZ < 0.5) {
            // Cyan to Green (0.25 - 0.5)
            const t = (normalizedZ - 0.25) / 0.25;
            r = 0;
            g = 255;
            b = Math.round(255 * (1 - t));
        } else if (normalizedZ < 0.75) {
            // Green to Yellow (0.5 - 0.75)
            const t = (normalizedZ - 0.5) / 0.25;
            r = Math.round(255 * t);
            g = 255;
            b = 0;
        } else {
            // Yellow to Red (0.75 - 1.0)
            const t = (normalizedZ - 0.75) / 0.25;
            r = 255;
            g = Math.round(255 * (1 - t));
            b = 0;
        }
        
        return `rgba(${r}, ${g}, ${b}, 0.9)`;
    }
    
    /**
     * Calculate keypoint size based on depth
     * Closer keypoints are larger (0.5x to 1.5x base size)
     * @param {number} z - Depth coordinate (z_normalized, 0.0-1.0)
     * @param {number} minZ - Minimum z value in the set
     * @param {number} maxZ - Maximum z value in the set
     * @param {number} baseSize - Base size for keypoints (default: 5)
     * @returns {number} Scaled size in pixels
     */
    getDepthSize(z, minZ, maxZ, baseSize = 5) {
        // Normalize z to 0-1 range based on min/max
        let normalizedZ;
        if (maxZ === minZ) {
            normalizedZ = 0.5; // If all points at same depth, use middle size
        } else {
            normalizedZ = (z - minZ) / (maxZ - minZ);
        }
        
        // Scale from 0.5x to 1.5x base size
        // normalizedZ = 0 (far) -> 0.5x base size
        // normalizedZ = 1 (close) -> 1.5x base size
        const scaleFactor = 0.5 + normalizedZ;
        return baseSize * scaleFactor;
    }
    
    /**
     * Draw keypoints on canvas
     * @param {Array} keypoints - Array of keypoint objects with x, y, visibility
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    drawKeypoints(keypoints, ctx, canvasWidth, canvasHeight) {
        if (!keypoints || keypoints.length === 0) {
            return;
        }
        
        keypoints.forEach((keypoint, index) => {
            if (!keypoint) return;
            
            const x = keypoint.x * canvasWidth;
            const y = keypoint.y * canvasHeight;
            const confidence = keypoint.visibility || 0;
            
            // Only draw keypoints with some visibility
            if (confidence > 0) {
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = this.getKeypointColor(confidence);
                ctx.fill();
                
                // Add a border for better visibility
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    }
    
    /**
     * Draw skeleton connections between keypoints
     * @param {Array} keypoints - Array of keypoint objects with x, y, visibility
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    drawSkeleton(keypoints, ctx, canvasWidth, canvasHeight) {
        if (!keypoints || keypoints.length === 0) {
            return;
        }
        
        this.POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
            const startPoint = keypoints[startIdx];
            const endPoint = keypoints[endIdx];
            
            if (!startPoint || !endPoint) return;
            
            const startConfidence = startPoint.visibility || 0;
            const endConfidence = endPoint.visibility || 0;
            
            // Only draw connection if both keypoints are visible
            if (startConfidence > 0 && endConfidence > 0) {
                const avgConfidence = (startConfidence + endConfidence) / 2;
                
                const startX = startPoint.x * canvasWidth;
                const startY = startPoint.y * canvasHeight;
                const endX = endPoint.x * canvasWidth;
                const endY = endPoint.y * canvasHeight;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                
                // Apply confidence-based styling
                if (avgConfidence < 0.3) {
                    // Low confidence: thin red line with low opacity
                    ctx.strokeStyle = `rgba(255, 0, 0, ${avgConfidence * 0.5})`;
                    ctx.lineWidth = 1;
                } else if (avgConfidence < 0.7) {
                    // Medium confidence: yellow line
                    ctx.strokeStyle = `rgba(255, 255, 0, ${avgConfidence})`;
                    ctx.lineWidth = 2;
                } else {
                    // High confidence: green line
                    ctx.strokeStyle = `rgba(0, 255, 0, ${avgConfidence})`;
                    ctx.lineWidth = 3;
                }
                
                ctx.stroke();
            }
        });
    }
    
    /**
     * Draw keypoints with 3D depth visualization
     * @param {Array} keypoints - Array of keypoint objects with x, y, z_normalized, visibility
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    drawKeypoints3D(keypoints, ctx, canvasWidth, canvasHeight) {
        if (!keypoints || keypoints.length === 0) {
            return;
        }
        
        // Find min and max z values for normalization
        const visibleKeypoints = keypoints.filter(kp => kp && kp.visibility > 0 && kp.z_normalized !== undefined);
        if (visibleKeypoints.length === 0) {
            // Fall back to 2D rendering if no z data
            this.drawKeypoints(keypoints, ctx, canvasWidth, canvasHeight);
            return;
        }
        
        const zValues = visibleKeypoints.map(kp => kp.z_normalized);
        const minZ = Math.min(...zValues);
        const maxZ = Math.max(...zValues);
        
        keypoints.forEach((keypoint, index) => {
            if (!keypoint) return;
            
            const x = keypoint.x * canvasWidth;
            const y = keypoint.y * canvasHeight;
            const confidence = keypoint.visibility || 0;
            const z = keypoint.z_normalized;
            
            // Only draw keypoints with some visibility
            if (confidence > 0 && z !== undefined) {
                const size = this.getDepthSize(z, minZ, maxZ, 5);
                const color = this.getDepthColor(z, minZ, maxZ);
                
                ctx.beginPath();
                ctx.arc(x, y, size, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
                
                // Add a border for better visibility
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    }
    
    /**
     * Draw skeleton connections with 3D depth visualization
     * @param {Array} keypoints - Array of keypoint objects with x, y, z_normalized, visibility
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    drawSkeleton3D(keypoints, ctx, canvasWidth, canvasHeight) {
        if (!keypoints || keypoints.length === 0) {
            return;
        }
        
        // Find min and max z values for normalization
        const visibleKeypoints = keypoints.filter(kp => kp && kp.visibility > 0 && kp.z_normalized !== undefined);
        if (visibleKeypoints.length === 0) {
            // Fall back to 2D rendering if no z data
            this.drawSkeleton(keypoints, ctx, canvasWidth, canvasHeight);
            return;
        }
        
        const zValues = visibleKeypoints.map(kp => kp.z_normalized);
        const minZ = Math.min(...zValues);
        const maxZ = Math.max(...zValues);
        
        this.POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
            const startPoint = keypoints[startIdx];
            const endPoint = keypoints[endIdx];
            
            if (!startPoint || !endPoint) return;
            
            const startConfidence = startPoint.visibility || 0;
            const endConfidence = endPoint.visibility || 0;
            const startZ = startPoint.z_normalized;
            const endZ = endPoint.z_normalized;
            
            // Only draw connection if both keypoints are visible and have z data
            if (startConfidence > 0 && endConfidence > 0 && startZ !== undefined && endZ !== undefined) {
                const avgZ = (startZ + endZ) / 2;
                const avgConfidence = (startConfidence + endConfidence) / 2;
                
                const startX = startPoint.x * canvasWidth;
                const startY = startPoint.y * canvasHeight;
                const endX = endPoint.x * canvasWidth;
                const endY = endPoint.y * canvasHeight;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                
                // Use depth-based color
                const color = this.getDepthColor(avgZ, minZ, maxZ);
                ctx.strokeStyle = color;
                
                // Line width based on confidence
                if (avgConfidence < 0.3) {
                    ctx.lineWidth = 1;
                } else if (avgConfidence < 0.7) {
                    ctx.lineWidth = 2;
                } else {
                    ctx.lineWidth = 3;
                }
                
                ctx.stroke();
            }
        });
    }
    
    /**
     * Render complete 3D pose visualization
     * @param {Object} poseResults - Pose detection results with 3D data
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    render3D(poseResults, canvas) {
        if (!canvas || !canvas.getContext) {
            console.error('Invalid canvas element');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas first
        this.clearCanvas(ctx, width, height);
        
        // If no pose detected or no keypoints, leave canvas empty
        if (!poseResults || !poseResults.detected || !poseResults.keypoints || poseResults.keypoints.length === 0) {
            return;
        }
        
        // Check if we have 3D data (z_normalized field)
        const has3DData = poseResults.keypoints.some(kp => kp && kp.z_normalized !== undefined);
        
        if (has3DData) {
            // Draw skeleton first (so keypoints appear on top)
            this.drawSkeleton3D(poseResults.keypoints, ctx, width, height);
            
            // Draw keypoints on top
            this.drawKeypoints3D(poseResults.keypoints, ctx, width, height);
        } else {
            // Fall back to 2D rendering
            this.drawSkeleton(poseResults.keypoints, ctx, width, height);
            this.drawKeypoints(poseResults.keypoints, ctx, width, height);
        }
    }
    
    /**
     * Render complete pose visualization
     * @param {Object} poseResults - Pose detection results
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    render(poseResults, canvas) {
        if (!canvas || !canvas.getContext) {
            console.error('Invalid canvas element');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas first
        this.clearCanvas(ctx, width, height);
        
        // If no pose detected or no keypoints, leave canvas empty
        if (!poseResults || !poseResults.detected || !poseResults.keypoints || poseResults.keypoints.length === 0) {
            return;
        }
        
        // Draw skeleton first (so keypoints appear on top)
        this.drawSkeleton(poseResults.keypoints, ctx, width, height);
        
        // Draw keypoints on top
        this.drawKeypoints(poseResults.keypoints, ctx, width, height);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PoseRenderer;
}
