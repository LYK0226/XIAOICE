# Implementation Plan

## Overview

This implementation plan breaks down the 3D pose movement detection feature into manageable coding tasks. All components run in the frontend (browser) using MediaPipe Pose JavaScript library. Tasks are sequenced to build incrementally from core infrastructure to complete feature.

---

## Phase 1: Core Infrastructure

- [x] 1. Set up project structure and dependencies




  - Create `app/static/js/pose_detector_3d.js` for 3D pose detection
  - Create `app/static/js/movement_detector.js` for movement analysis
  - Create `app/static/js/movement_analyzers.js` for body part analyzers
  - Create `app/static/js/movement_descriptor.js` for text generation
  - Add MediaPipe Pose CDN link to pose detection HTML template
  - _Requirements: 1.1, 12.1_

- [x] 1.1 Write unit tests for module initialization






  - Test PoseDetector3D initialization
  - Test MovementDetector initialization
  - Test analyzer registration
  - _Requirements: 1.1_

---

## Phase 2: 3D Pose Detection

- [x] 2. Implement PoseDetector3D class






  - Create class with constructor accepting config (modelComplexity, smoothLandmarks, confidence thresholds)
  - Implement `initialize()` method to load MediaPipe Pose model from CDN
  - Implement `detectPose(videoElement)` method to process video frames
  - Implement `extractKeypoints(landmarks)` to format MediaPipe output
  - Implement `normalizeDepthCoordinates(keypoints)` to normalize z-values to 0.0-1.0
  - Implement `close()` method to release resources
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 2.1 Write property test for 3D coordinate extraction
  - **Feature: 3d-pose-movement-detection, Property 1: 3D Coordinate Extraction**
  - Generate random video frames with detected persons
  - Verify all 33 keypoints have valid x, y, z numeric values
  - Verify coordinates are normalized (0.0-1.0 for x, y)
  - _Requirements: 1.1_

- [ ]* 2.2 Write property test for depth normalization
  - **Feature: 3d-pose-movement-detection, Property 2: Depth Normalization Consistency**
  - Generate keypoints with various z-coordinate ranges
  - Verify z_normalized values are in 0.0-1.0 range
  - Verify normalization is consistent across different z ranges
  - _Requirements: 1.3_

- [x] 2.3 Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 3: Movement Detection Core

- [x] 3. Implement MovementDetector class





  - Create class with constructor accepting config (movementThreshold, historySize, confidenceThreshold)
  - Implement `updateHistory(keypoints)` to maintain keypoint history buffer
  - Implement `calculateDelta(kp1, kp2)` to compute 3D position changes
  - Implement `calculateMagnitude(delta)` to compute movement vector magnitude
  - Implement `detectMovements(keypoints)` to orchestrate analyzer evaluation
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3.1 Write property test for movement detection universality






  - **Feature: 3d-pose-movement-detection, Property 3: Movement Detection Universality**
  - Generate random keypoint deltas exceeding movement threshold
  - Verify system detects movements regardless of body part
  - Verify movements below threshold are not reported
  - _Requirements: 2.1, 2.4, 2.5_

- [x] 3.2 Write property test for simultaneous movement detection






  - **Feature: 3d-pose-movement-detection, Property 4: Simultaneous Movement Detection**
  - Generate frames with multiple body parts moving simultaneously
  - Verify all significant movements are detected and reported
  - _Requirements: 2.2_

- [x] 3.3 Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 4: Body Part Movement Analyzers

- [x] 4. Implement HeadMovementAnalyzer





  - Create class extending MovementAnalyzer
  - Analyze nose, left_ear, right_ear keypoints
  - Detect head turning left/right (horizontal rotation)
  - Detect head tilting forward/backward (vertical tilt)
  - Detect head tilting left/right (lateral tilt)
  - Calculate confidence based on keypoint visibility and movement consistency
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4.1 Implement ArmMovementAnalyzer

  - Create class extending MovementAnalyzer with side parameter (left/right)
  - Analyze shoulder, elbow, wrist keypoints for specified side
  - Detect arm raising/lowering (vertical movement)
  - Detect arm extending forward/backward (depth movement)
  - Detect arm moving to side (horizontal movement)
  - Detect elbow bending (angle change)
  - Calculate confidence based on keypoint visibility and movement magnitude
  - _Requirements: 4.1, 4.2, 6.1, 6.2, 6.3, 6.4_

- [x] 4.2 Implement LegMovementAnalyzer

  - Create class extending MovementAnalyzer with side parameter (left/right)
  - Analyze hip, knee, ankle keypoints for specified side
  - Detect leg lifting (vertical movement)
  - Detect leg kicking forward/backward (depth movement)
  - Detect knee bending (angle change)
  - Calculate confidence based on keypoint visibility and movement magnitude
  - _Requirements: 4.3, 4.4, 6.5, 6.6, 6.7_

- [x] 4.3 Implement TorsoMovementAnalyzer

  - Create class extending MovementAnalyzer
  - Analyze shoulder and hip keypoints
  - Detect torso rotation left/right (horizontal rotation)
  - Detect forward/backward bending (vertical tilt)
  - Detect side leaning (lateral tilt)
  - Calculate confidence based on keypoint visibility and movement magnitude
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 4.4 Write property test for body part identification
  - **Feature: 3d-pose-movement-detection, Property 5: Body Part Identification**
  - Generate movements for each body part
  - Verify each detected movement includes correct body part identifier
  - _Requirements: 2.3_

- [x] 4.5 Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 5: Movement Descriptors

- [x] 5. Implement MovementDescriptorGenerator class





  - Create class with movement descriptor templates
  - Implement `generateDescriptor(bodyPart, movementType, delta, confidence)` method
  - Generate descriptors in format: "[verb] [body_part]" (e.g., "raising right hand")
  - Include direction when applicable (e.g., "turning head left")
  - Implement `prioritizeMovements(movements, maxMovements)` method
  - Prioritize by: magnitude > confidence > body part importance
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5.1 Write property test for descriptor generation







  - **Feature: 3d-pose-movement-detection, Property 6: Movement Descriptor Generation**
  - Generate random movements for all body parts
  - Verify descriptors contain body part name and movement type
  - Verify descriptors are non-empty strings
  - _Requirements: 3.1, 3.2, 3.3_
- [x] 5.2 Write property test for movement prioritization






  - **Feature: 3d-pose-movement-detection, Property 7: Movement Prioritization**
  - Generate multiple simultaneous movements with varying magnitudes/confidence
  - Verify returned movements are sorted by significance
  - Verify only top N movements are returned
  - _Requirements: 3.5_

- [x] 5.3 Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 6: Confidence Scoring

- [x] 6. Implement confidence score calculation















  - Add confidence calculation to each analyzer
  - Base confidence on keypoint visibility scores
  - Adjust confidence based on movement consistency across frames
  - Ensure confidence scores are in 0.0-1.0 range
  - Reduce confidence when keypoint visibility is low
  - _Requirements: 9.1, 9.5_

- [x] 6.1 Write property test for confidence scoring




  - **Feature: 3d-pose-movement-detection, Property 8: Confidence Score Calculation**
  - Generate movements with varying keypoint visibility
  - Verify confidence scores are between 0.0 and 1.0
  - Verify low visibility correlates with lower confidence
  - _Requirements: 9.1, 9.5_

- [x] 6.2 Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 7: 3D Visualization

- [x] 7. Enhance PoseRenderer for 3D depth visualization





  - Implement `getDepthColor(z, minZ, maxZ)` method
  - Create color gradient: blue (far) → cyan → green → yellow → red (close)
  - Implement `getDepthSize(z, minZ, maxZ, baseSize)` method
  - Scale keypoint size based on depth (0.5x to 1.5x base size)
  - Implement `drawKeypoints3D(keypoints, ctx, canvasWidth, canvasHeight)` method
  - Draw keypoints with depth-based color and size
  - Implement `drawSkeleton3D(keypoints, ctx, canvasWidth, canvasHeight)` method
  - Draw skeleton connections with depth visualization
  - Implement `render3D(poseResults, canvas)` method
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 7.1 Write property test for depth visualization



  - **Feature: 3d-pose-movement-detection, Property 12: Depth Visualization**
  - Generate keypoints at different depths
  - Verify closer keypoints have larger sizes
  - Verify closer keypoints have warmer colors
  - _Requirements: 10.3, 10.4_

- [x] 7.2 Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 8: Integration and Performance

- [x] 8. Integrate all components into pose detection pipeline



  - Modify pose detection HTML template to include all new JavaScript files
  - Create main initialization function that:
    - Initializes PoseDetector3D
    - Initializes MovementDetector with all analyzers
    - Sets up video capture loop
    - Calls detectPose() and detectMovements() each frame
    - Calls render3D() to display results
  - Implement frame rate monitoring
  - Ensure processing completes within 200ms per frame
  - _Requirements: 8.1, 8.4, 12.1_

- [x] 8.1 Write property test for real-time processing





  - **Feature: 3d-pose-movement-detection, Property 10: Real-Time Processing**
  - Process 100+ frames and measure processing time
  - Verify all frames complete within 200ms
  - _Requirements: 8.1_

- [x] 8.2 Write property test for frame rate maintenance




  - **Feature: 3d-pose-movement-detection, Property 11: Frame Rate Maintenance**
  - Run continuous video stream for 10+ seconds
  - Verify minimum 15 FPS is maintained
  - _Requirements: 8.4_

- [x] 8.3 Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 9: Data Format and Compatibility
-

- [x] 9. Extend WebSocket message format for 3D data



  - Modify pose_results event to include:
    - 3D keypoints with z and z_normalized fields
    - movements array with detected movements
    - primary_movement field (most significant movement)
  - Ensure backward compatibility with existing 2D format
  - Update frontend to handle new movement data
  - _Requirements: 12.3, 12.4_

- [x] 9.1 Write property test for data format extension






  - **Feature: 3d-pose-movement-detection, Property 13: Data Format Extension**
  - Generate pose results with 3D data
  - Verify transmitted data includes both 2D and 3D coordinates
  - Verify movement descriptors are included
  - Verify format is backward compatible
  - _Requirements: 12.4_

- [x] 9.2 Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 10: Extensibility and Modularity

- [x] 10. Implement modular analyzer registration system








  - Create analyzer registry in MovementDetector
  - Implement `registerAnalyzer(analyzer)` method
  - Allow adding new analyzers without modifying existing code
  - Implement `unregisterAnalyzer(analyzerName)` method
  - _Requirements: 11.2, 11.4_

- [x] 10.1 Write property test for modular architecture



  - **Feature: 3d-pose-movement-detection, Property 14: Modular Analyzer Architecture**
  - Create a test analyzer and register it
  - Verify it's evaluated without modifying existing analyzers
  - _Requirements: 11.2_

- [x] 10.2 Write property test for multi-analyzer evaluation






  - **Feature: 3d-pose-movement-detection, Property 15: Multi-Analyzer Evaluation**
  - Register multiple analyzers
  - Verify all are evaluated and results are combined
  - _Requirements: 11.4_

- [x] 10.3 Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 11: UI Integration

- [x] 11. Create UI display layer for movement information
  - Add text overlay on canvas for movement descriptors
  - Display primary movement prominently
  - Display confidence indicator (color-coded or numeric)
  - Display neutral state when no significant movement detected
  - Update display in real-time as movements change
  - _Requirements: 3.1, 8.2, 8.3, 9.2_

- [x] 11.1 Integrate movement display with existing pose detection UI
  - Modify pose_detection.html template
  - Add movement text display area
  - Add confidence indicator display
  - Ensure visual integration with existing components
  - _Requirements: 12.1, 12.2_

- [x] 11.2 Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 12: Error Handling and Edge Cases

- [x] 12. Implement error handling




  - Handle case when no pose is detected (return empty results)
  - Handle low confidence keypoints gracefully
  - Handle insufficient history for movement detection
  - Handle MediaPipe model load failures
  - Handle camera permission denied
  - Provide user-friendly error messages
  - _Requirements: 1.5, 2.5_

- [x] 12.1 Test edge cases





  - Test with no person in frame
  - Test with partial occlusion
  - Test with low-light conditions
  - Test with rapid movement changes
  - Test with multiple people (verify single person detection)
  - _Requirements: 1.5_

- [x] 12.2 Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 13: Final Integration and Testing

- [x] 13. End-to-end integration testing





  - Test full pipeline: video capture → pose detection → movement analysis → rendering
  - Test with various movement types
  - Test with different lighting conditions
  - Test with different camera distances
  - Verify all requirements are met
  - _Requirements: All_

- [x] 13.1 Performance optimization


  - Profile code to identify bottlenecks
  - Optimize hot paths
  - Ensure consistent 15+ FPS
  - Ensure < 200ms processing per frame
  - _Requirements: 8.1, 8.4_

- [x] 13.2 Final checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

---

## Summary

**Total Tasks**: 13 main tasks + 15 optional testing tasks

**Key Milestones**:
1. Core infrastructure and dependencies
2. 3D pose detection working
3. Movement detection core
4. All body part analyzers
5. Natural language descriptors
6. Confidence scoring
7. 3D visualization
8. Full integration and performance
9. Data format compatibility
10. Extensible architecture
11. UI integration
12. Error handling
13. Final testing and optimization

**Testing Approach**:
- Unit tests for individual components
- Property-based tests for correctness properties
- Integration tests for full pipeline
- Performance tests for latency and frame rate
