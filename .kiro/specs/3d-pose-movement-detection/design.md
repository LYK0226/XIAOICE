# Design Document - 3D Pose Movement Detection (Frontend-Based)

## Overview

This design upgrades the existing 2D pose detection system to a comprehensive 3D pose detection and movement analysis system running entirely in the frontend. The system will:

- Extract 3D coordinates (x, y, z) from video frames using MediaPipe Pose JavaScript library
- Detect and classify granular body part movements (e.g., "raising right hand", "turning head left")
- Provide real-time natural language descriptions of detected movements
- Visualize depth information through color gradients and size scaling
- Run entirely in the browser with no server-side pose processing

## Architecture

### High-Level Architecture (Frontend-Based)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Frontend (Browser)                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      Video Capture                                  │ │
│  │                    (getUserMedia API)                               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                  ↓                                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │              3D Pose Detector (pose_detector.js - NEW)             │ │
│  │              - MediaPipe Pose (JavaScript/WASM)                    │ │
│  │              - Extracts 3D keypoints (x, y, z) locally             │ │
│  │              - No server round-trip needed                         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                  ↓                                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │         Movement Detector (movement_detector.js - NEW)             │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  Movement History Tracker                                    │  │ │
│  │  │  - Stores previous frame keypoints in memory                 │  │ │
│  │  │  - Calculates 3D deltas (position changes)                   │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  Body Part Movement Analyzers                                │  │ │
│  │  │  - HeadMovementAnalyzer                                      │  │ │
│  │  │  - ArmMovementAnalyzer (left/right)                          │  │ │
│  │  │  - LegMovementAnalyzer (left/right)                          │  │ │
│  │  │  - TorsoMovementAnalyzer                                     │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  Movement Descriptor Generator                               │  │ │
│  │  │  - Converts detected movements to natural language           │  │ │
│  │  │  - Prioritizes significant movements                         │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                  ↓                                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │              3D Pose Renderer (pose_renderer.js)                   │ │
│  │              - Renders skeleton with depth visualization           │ │
│  │              - Displays movement descriptors                       │ │
│  │              - Color gradients for depth (warm=close, cool=far)    │ │
│  │              - Size scaling based on z-coordinate                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                  ↓                                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    UI Display Layer                                │ │
│  │  - Canvas overlay on video                                         │ │
│  │  - Movement text display                                           │ │
│  │  - Confidence indicators                                           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓ (Optional: Analytics/Logging)
┌─────────────────────────────────────────────────────────────────────────┐
│                          Backend (Flask) - OPTIONAL                      │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │              WebSocket Event Handler                               │ │
│  │              - Receives movement events for logging (optional)     │ │
│  │              - Stores session analytics (optional)                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Video Capture**: Frontend captures video frames using getUserMedia API
2. **Local Pose Detection**: MediaPipe Pose (JavaScript) extracts 3D keypoints in browser
3. **Movement Analysis**: Movement detector compares current frame with history (all in browser)
4. **Movement Classification**: Body part analyzers detect specific movements (client-side)
5. **Description Generation**: Natural language descriptors created locally
6. **Visualization**: Renderer displays 3D pose with depth cues and movement text
7. **Optional Backend**: Send movement events to backend for analytics/logging only

### Key Architectural Benefits

- **Lower Latency**: No network round-trip for pose detection (~50-100ms saved per frame)
- **Reduced Server Load**: All processing happens in the browser
- **Privacy**: Video frames never leave the user's device
- **Offline Capable**: Works without backend connection (except for initial page load)
- **Scalability**: Server resources not consumed by pose processing

## Components and Interfaces

### 1. 3D Pose Detector (pose_detector.js - NEW)

**Purpose**: Frontend module for real-time 3D pose detection using MediaPipe Pose JavaScript library

**Technology**: MediaPipe Pose for JavaScript (https://google.github.io/mediapipe/solutions/pose.html)

**Class: PoseDetector3D**

```javascript
class PoseDetector3D {
    constructor(config = {}) {
        this.config = {
            modelComplexity: config.modelComplexity || 1,
            smoothLandmarks: config.smoothLandmarks !== false,
            minDetectionConfidence: config.minDetectionConfidence || 0.5,
            minTrackingConfidence: config.minTrackingConfidence || 0.5
        };
        this.pose = null;
        this.isInitialized = false;
    }
    
    async initialize() {
        // Initialize MediaPipe Pose model
        // Returns Promise that resolves when model is loaded
    }
    
    async detectPose(videoElement) {
        // Detect 3D pose from video element
        // Returns: { keypoints, detected, timestamp }
    }
    
    extractKeypoints(landmarks) {
        // Extract and format keypoints from MediaPipe landmarks
        // Returns array of keypoint objects with x, y, z, visibility
    }
    
    normalizeDepthCoordinates(keypoints) {
        // Normalize z-coordinates to 0.0-1.0 range
        // Returns keypoints with z_normalized field added
    }
    
    close() {
        // Release resources
    }
}
```

### 2. Movement Detector (movement_detector.js - NEW)

**Purpose**: Detect and classify body part movements from keypoint sequences

**Class: MovementDetector**

```javascript
class MovementDetector {
    constructor(config = {}) {
        this.config = {
            movementThreshold: config.movementThreshold || 0.02,
            historySize: config.historySize || 5,
            confidenceThreshold: config.confidenceThreshold || 0.5
        };
        
        this.keypointHistory = [];
        this.analyzers = [
            new HeadMovementAnalyzer(),
            new ArmMovementAnalyzer('left'),
            new ArmMovementAnalyzer('right'),
            new LegMovementAnalyzer('left'),
            new LegMovementAnalyzer('right'),
            new TorsoMovementAnalyzer()
        ];
    }
    
    detectMovements(keypoints) {
        // Detect all significant movements from current keypoints
        // Returns: Array of movement objects with descriptors and confidence
    }
    
    updateHistory(keypoints) {
        // Update keypoint history for delta calculations
    }
    
    calculateDelta(kp1, kp2) {
        // Calculate 3D position change between keypoints
        // Returns: { x, y, z } delta
    }
    
    calculateMagnitude(delta) {
        // Calculate magnitude of 3D movement vector
        // Returns: float magnitude
    }
}
```

### 3. Body Part Movement Analyzers (movement_analyzers.js - NEW)

**Base Class: MovementAnalyzer**

```javascript
class MovementAnalyzer {
    analyze(currentKeypoints, previousKeypoints, threshold) {
        // Analyze movement for specific body part
        // Returns: Array of detected movements with descriptors
    }
    
    calculateDelta(kp1, kp2) {
        // Calculate 3D position change
    }
    
    calculateMagnitude(delta) {
        // Calculate magnitude of movement vector
    }
}
```

**Concrete Analyzers**:

1. **HeadMovementAnalyzer**: Detects head turning, tilting, nodding
   - Analyzes nose, left_ear, right_ear keypoints
   - Detects: "turning head left/right", "tilting head forward/backward", "tilting head left/right"

2. **ArmMovementAnalyzer**: Detects arm raising, lowering, extending, bending
   - Analyzes shoulder, elbow, wrist keypoints
   - Detects: "raising/lowering arm", "extending arm forward/backward/sideways", "bending elbow"

3. **LegMovementAnalyzer**: Detects leg lifting, kicking, bending
   - Analyzes hip, knee, ankle keypoints
   - Detects: "lifting leg", "kicking leg forward/backward", "bending knee"

4. **TorsoMovementAnalyzer**: Detects torso rotation, bending, leaning
   - Analyzes shoulder and hip keypoints
   - Detects: "rotating torso left/right", "bending forward/backward", "leaning left/right"

### 4. Movement Descriptor Generator (movement_descriptor.js - NEW)

**Purpose**: Convert detected movements into natural language descriptions

**Class: MovementDescriptorGenerator**

```javascript
class MovementDescriptorGenerator {
    generateDescriptor(bodyPart, movementType, delta, confidence) {
        // Generate natural language description of movement
        // Returns: String descriptor (e.g., "raising right hand")
    }
    
    prioritizeMovements(movements, maxMovements = 3) {
        // Select most significant movements to display
        // Prioritizes by: magnitude, confidence, body part importance
        // Returns: Sorted array of top movements
    }
}
```

### 5. Enhanced 3D Pose Renderer (pose_renderer.js - MODIFIED)

**Modifications**: Add depth visualization capabilities

**New Methods**:

```javascript
getDepthColor(z, minZ, maxZ) {
    // Get color based on depth (z-coordinate)
    // Closer = warmer colors (red/orange)
    // Farther = cooler colors (blue/cyan)
    // Returns: RGBA color string
}

getDepthSize(z, minZ, maxZ, baseSize = 5) {
    // Calculate keypoint size based on depth
    // Closer keypoints are larger
    // Returns: Size in pixels
}

drawKeypoints3D(keypoints, ctx, canvasWidth, canvasHeight) {
    // Draw keypoints with 3D depth visualization
    // Uses depth color and size scaling
}

drawSkeleton3D(keypoints, ctx, canvasWidth, canvasHeight) {
    // Draw skeleton connections with depth visualization
}

render3D(poseResults, canvas) {
    // Render complete 3D pose visualization
}
```

## Data Models

### Keypoint Data Structure (JavaScript)

```javascript
{
    name: string,              // Keypoint name (e.g., 'left_wrist')
    x: number,                 // Normalized x coordinate (0.0-1.0)
    y: number,                 // Normalized y coordinate (0.0-1.0)
    z: number,                 // Depth coordinate (relative to hips)
    z_normalized: number,      // Normalized depth (0.0-1.0) for visualization
    visibility: number         // Confidence score (0.0-1.0)
}
```

### Movement Data Structure (JavaScript)

```javascript
{
    bodyPart: string,          // Body part identifier (e.g., 'right_hand')
    movementType: string,      // Movement classification (e.g., 'raising')
    descriptor: string,        // Natural language description
    confidence: number,        // Detection confidence (0.0-1.0)
    delta: {                   // 3D movement vector
        x: number,
        y: number,
        z: number
    },
    magnitude: number,         // Total movement magnitude
    timestamp: number          // Frame timestamp
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: 3D Coordinate Extraction
*For any* video frame with a detected person, the system SHALL extract x, y, and z coordinates for all 33 keypoints with valid numeric values.
**Validates: Requirements 1.1**

### Property 2: Depth Normalization Consistency
*For any* set of keypoints, normalizing z-coordinates to 0.0-1.0 range SHALL produce consistent results independent of camera distance.
**Validates: Requirements 1.3**

### Property 3: Movement Detection Universality
*For any* body part position change exceeding the movement threshold, the system SHALL detect and report the movement regardless of predefined action patterns.
**Validates: Requirements 2.1, 2.4**

### Property 4: Simultaneous Movement Detection
*For any* frame with multiple body parts moving simultaneously above threshold, the system SHALL detect and report all significant movements.
**Validates: Requirements 2.2**

### Property 5: Body Part Identification
*For any* detected movement, the system SHALL include a specific body part identifier in the movement descriptor.
**Validates: Requirements 2.3**

### Property 6: Movement Descriptor Generation
*For any* detected movement, the system SHALL generate a natural language descriptor containing both body part name and movement type.
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 7: Movement Prioritization
*For any* set of detected movements, the system SHALL prioritize and return the most significant movements (by magnitude and confidence) first.
**Validates: Requirements 3.5**

### Property 8: Confidence Score Calculation
*For any* detected movement, the system SHALL calculate a confidence score between 0.0 and 1.0 based on keypoint visibility and movement consistency.
**Validates: Requirements 9.1, 9.5**

### Property 9: Low Visibility Impact
*For any* movement detected with low keypoint visibility, the confidence score SHALL be reduced proportionally to the visibility reduction.
**Validates: Requirements 9.5**

### Property 10: Real-Time Processing
*For any* video frame, the system SHALL complete pose detection and movement analysis within 200 milliseconds.
**Validates: Requirements 8.1**

### Property 11: Frame Rate Maintenance
*For any* continuous video stream, the system SHALL maintain a minimum frame processing rate of 15 frames per second.
**Validates: Requirements 8.4**

### Property 12: Depth Visualization
*For any* set of keypoints at different depths, the system SHALL render closer keypoints with larger markers and warmer colors than farther keypoints.
**Validates: Requirements 10.3, 10.4**

### Property 13: Data Format Extension
*For any* pose detection result, the system SHALL include 3D coordinates and movement descriptors while maintaining backward compatibility with existing 2D data format.
**Validates: Requirements 12.4**

### Property 14: Modular Analyzer Architecture
*For any* new body part movement analyzer, the system SHALL allow registration without modifying existing analyzer code.
**Validates: Requirements 11.2**

### Property 15: Multi-Analyzer Evaluation
*For any* frame with multiple movement analyzers active, the system SHALL evaluate all analyzers and combine their results.
**Validates: Requirements 11.4**

## Error Handling

- **No Pose Detected**: Return empty keypoints array with `detected: false`
- **Low Confidence Keypoints**: Mark with low visibility score; movement detection uses visibility threshold
- **Insufficient History**: Skip movement detection until history buffer is populated
- **MediaPipe Load Failure**: Display user-friendly error; provide fallback or retry mechanism
- **Camera Permission Denied**: Handle gracefully with appropriate UI message

## Testing Strategy

### Unit Testing

- Test keypoint extraction from MediaPipe landmarks
- Test depth normalization with various z-coordinate ranges
- Test delta calculation for 3D vectors
- Test movement magnitude calculations
- Test descriptor generation for all movement types
- Test movement prioritization logic

### Property-Based Testing

- **Property 1**: Generate random video frames and verify all keypoints have x, y, z values
- **Property 3**: Generate random keypoint deltas above threshold and verify detection
- **Property 6**: Generate random movements and verify descriptors contain body part and movement type
- **Property 8**: Generate movements with varying keypoint visibility and verify confidence correlation
- **Property 10**: Measure processing time for 100+ frames and verify < 200ms
- **Property 12**: Generate keypoints at different depths and verify rendering size/color correlation
- **Property 13**: Verify transmitted data includes both 2D and 3D coordinates

### Integration Testing

- Test full pipeline: video capture → pose detection → movement analysis → rendering
- Test with multiple simultaneous movements
- Test with rapid movement changes
- Test with low-light conditions
- Test with partial occlusion

## Dependencies

- **MediaPipe Pose JavaScript**: https://cdn.jsdelivr.net/npm/@mediapipe/pose/
- **Canvas API**: Built-in browser API for rendering
- **getUserMedia API**: Built-in browser API for video capture
- **No backend dependencies**: All processing is client-side
