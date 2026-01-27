# POSE DETECTION MODULES (app/pose_detection/)

**Generated:** 2026-01-26T17:19:14Z
**Directory:** /workspaces/XIAOICE/app/pose_detection/

## OVERVIEW
Browser-based pose detection pipeline. Pure JavaScript modules (no Python).
Wraps MediaPipe Holistic (3D single-person) + Pose Landmarker (multi-person), analyzes body actions, renders on canvas.
UI orchestration lives in app/static/js/pose_detection.js (not here).

## WHERE TO LOOK
| Module | Purpose | Notes |
|--------|---------|-------|
| pose_detector_3d.js | MediaPipe Holistic wrapper | 543 keypoints: 33 pose + 468 face + 42 hands. Single-person. |
| multi_person_detector.js | MediaPipe Pose Landmarker wrapper | Multi-person (max 2). 33 pose keypoints per person (no face/hands). |
| multi_person_selector.js | Click-to-select person | Click bounding box to lock target; centroid-based cross-frame tracking. |
| action_detector.js | Fixed pose/action detection | Arm raises, squats, bowing, head turns, combos. Smoothing + debounce. |
| movement_detector.js | High-level action coordinator | Wraps ActionDetector, generates summaries/primary actions. |
| movement_analyzers.js | FixedActionAnalyzer wrapper | Integrates ActionDetector for fixed posture detection. |
| movement_descriptor.js | Action → display format | Multi-language (zh/en), icons, category colors. |
| pose_renderer.js | Canvas rendering | Draws keypoints + skeleton connections for pose/face/hands. |
| pose_error_handler.js | Error handling | Camera permissions, MediaPipe load failures, runtime errors. |

## CONVENTIONS
- **Keypoint structure:** { x, y, z, visibility } (MediaPipe format).
- **Language handling:** Chinese (zh) default, English (en) supported. Descriptors in action_detector.js include nameZh + name.
- **Webcam mirroring:** Right keypoints appear on LEFT side of screen. action_detector.js swaps labels for user-facing correctness.
- **Confidence smoothing:** ActionDetector applies smoothing (default 3 frames) + hysteresis to reduce jitter.
- **Session lifecycle:** Modules initialize async (await initialize()), must be ready before detectPose()/detectActions().

## ANTI-PATTERNS (THIS DIRECTORY)
- Do NOT expect DOM manipulation here; these are pure logic/analysis modules.
- Do NOT reference app/static/js/pose_detection.js from this directory (reverse dependency).
- Avoid creating Python files in this directory; backend pose logic (if any) lives elsewhere.
- Do NOT assume multi-person mode includes face/hand data (only 33 pose keypoints).

## NOTES
- MediaPipe CDN loaded via index.html (Holistic + Tasks Vision for multi-person).
- Multi-person uses lite model by default (pose_landmarker_lite.task) for speed; can swap to full/heavy.
- FixedActionAnalyzer (movement_analyzers.js) is a thin wrapper; actual detection is in ActionDetector.
- PoseRenderer handles 543 keypoints but only draws what's present (face/hands optional).
- Error messages in pose_error_handler.js are mixed zh/en; standardize if needed.
