/**
 * Movement Descriptor Generator Module
 * 
 * This module converts detected movements into natural language descriptions
 * and prioritizes significant movements for display.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

class MovementDescriptorGenerator {
    /**
     * Generate natural language description of movement
     * 
     * Creates a human-readable descriptor from movement data.
     * 
     * @param {string} bodyPart - Body part identifier (e.g., 'right_hand', 'head')
     * @param {string} movementType - Movement classification (e.g., 'raising', 'turning')
     * @param {Object} delta - 3D movement vector with x, y, z
     * @param {number} confidence - Detection confidence (0.0-1.0)
     * @returns {string} Natural language descriptor
     */
    generateDescriptor(bodyPart, movementType, delta, confidence) {
        if (!bodyPart || !movementType) {
            return '';
        }

        // Format body part name (replace underscores with spaces)
        const formattedBodyPart = bodyPart.replace(/_/g, ' ');

        // Determine direction based on delta
        let direction = '';
        if (delta) {
            if (Math.abs(delta.y) > Math.abs(delta.x) && Math.abs(delta.y) > Math.abs(delta.z)) {
                direction = delta.y > 0 ? 'down' : 'up';
            } else if (Math.abs(delta.x) > Math.abs(delta.z)) {
                direction = delta.x > 0 ? 'right' : 'left';
            } else if (Math.abs(delta.z) > 0) {
                direction = delta.z > 0 ? 'backward' : 'forward';
            }
        }

        // Build descriptor
        let descriptor = '';

        switch (movementType) {
            case 'raising':
                descriptor = `raising ${formattedBodyPart}`;
                break;
            case 'lowering':
                descriptor = `lowering ${formattedBodyPart}`;
                break;
            case 'turning':
                descriptor = direction ? `turning ${formattedBodyPart} ${direction}` : `turning ${formattedBodyPart}`;
                break;
            case 'tilting':
                descriptor = direction ? `tilting ${formattedBodyPart} ${direction}` : `tilting ${formattedBodyPart}`;
                break;
            case 'tilting_side':
                descriptor = direction ? `tilting ${formattedBodyPart} to ${direction}` : `tilting ${formattedBodyPart}`;
                break;
            case 'extending':
                descriptor = direction ? `extending ${formattedBodyPart} ${direction}` : `extending ${formattedBodyPart}`;
                break;
            case 'moving_side':
                descriptor = `moving ${formattedBodyPart} to the side`;
                break;
            case 'bending':
                descriptor = `bending ${formattedBodyPart}`;
                break;
            case 'lifting':
                descriptor = `lifting ${formattedBodyPart}`;
                break;
            case 'kicking':
                descriptor = direction ? `kicking ${formattedBodyPart} ${direction}` : `kicking ${formattedBodyPart}`;
                break;
            case 'rotating':
                descriptor = direction ? `rotating ${formattedBodyPart} ${direction}` : `rotating ${formattedBodyPart}`;
                break;
            case 'leaning':
                descriptor = direction ? `leaning ${direction}` : `leaning`;
                break;
            default:
                descriptor = `${movementType} ${formattedBodyPart}`;
        }

        return descriptor;
    }

    /**
     * Prioritize movements for display
     * 
     * Selects the most significant movements based on magnitude, confidence,
     * and body part importance.
     * 
     * @param {Array<Object>} movements - Array of detected movements
     * @param {number} maxMovements - Maximum number of movements to return. Default: 3
     * @returns {Array<Object>} Sorted array of top movements
     */
    prioritizeMovements(movements, maxMovements = 3) {
        if (!movements || movements.length === 0) {
            return [];
        }

        // Define body part importance weights
        const bodyPartWeights = {
            'head': 1.2,
            'torso': 1.1,
            'right_arm': 1.0,
            'left_arm': 1.0,
            'right_hand': 1.0,
            'left_hand': 1.0,
            'right_leg': 0.9,
            'left_leg': 0.9,
            'right_foot': 0.9,
            'left_foot': 0.9,
            'right_elbow': 0.8,
            'left_elbow': 0.8,
            'right_knee': 0.8,
            'left_knee': 0.8
        };

        // Calculate priority score for each movement
        const scoredMovements = movements.map(movement => {
            const bodyPartWeight = bodyPartWeights[movement.bodyPart] || 1.0;
            const magnitudeScore = movement.magnitude || 0;
            const confidenceScore = movement.confidence || 0;

            // Priority = magnitude * confidence * body part weight
            const priorityScore = magnitudeScore * confidenceScore * bodyPartWeight;

            return {
                ...movement,
                priorityScore: priorityScore
            };
        });

        // Sort by priority score (descending)
        scoredMovements.sort((a, b) => b.priorityScore - a.priorityScore);

        // Return top N movements
        return scoredMovements.slice(0, maxMovements);
    }

    /**
     * Format movements for display
     * 
     * Converts movement objects to display-ready format with descriptors.
     * 
     * @param {Array<Object>} movements - Array of movements
     * @returns {Array<Object>} Formatted movements with descriptors
     */
    formatMovements(movements) {
        if (!movements || movements.length === 0) {
            return [];
        }

        return movements.map(movement => {
            // Generate descriptor if not already present
            if (!movement.descriptor) {
                movement.descriptor = this.generateDescriptor(
                    movement.bodyPart,
                    movement.movementType,
                    movement.delta,
                    movement.confidence
                );
            }

            return {
                bodyPart: movement.bodyPart,
                movementType: movement.movementType,
                descriptor: movement.descriptor,
                confidence: movement.confidence,
                magnitude: movement.magnitude,
                timestamp: movement.timestamp
            };
        });
    }

    /**
     * Get primary movement
     * 
     * Returns the single most significant movement from a list.
     * 
     * @param {Array<Object>} movements - Array of movements
     * @returns {Object|null} Primary movement or null if no movements
     */
    getPrimaryMovement(movements) {
        if (!movements || movements.length === 0) {
            return null;
        }

        const prioritized = this.prioritizeMovements(movements, 1);
        return prioritized.length > 0 ? prioritized[0] : null;
    }

    /**
     * Generate summary text
     * 
     * Creates a summary string of all detected movements.
     * 
     * @param {Array<Object>} movements - Array of movements
     * @param {number} maxMovements - Maximum movements to include. Default: 3
     * @returns {string} Summary text
     */
    generateSummary(movements, maxMovements = 3) {
        if (!movements || movements.length === 0) {
            return 'No movement detected';
        }

        const prioritized = this.prioritizeMovements(movements, maxMovements);
        const descriptors = prioritized.map(m => m.descriptor || '');

        if (descriptors.length === 0) {
            return 'No movement detected';
        } else if (descriptors.length === 1) {
            return descriptors[0];
        } else if (descriptors.length === 2) {
            return `${descriptors[0]} and ${descriptors[1]}`;
        } else {
            const last = descriptors.pop();
            return `${descriptors.join(', ')}, and ${last}`;
        }
    }
}

// Export for use in other modules
window.MovementDescriptorGenerator = MovementDescriptorGenerator;
