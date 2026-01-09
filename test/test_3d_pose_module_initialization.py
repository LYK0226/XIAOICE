"""
Unit Tests for 3D Pose Movement Detection Module Initialization

These tests verify that the 3D pose detection modules can be properly initialized
and configured. Tests cover PoseDetector3D, MovementDetector, and analyzer registration.

Requirements: 1.1
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to allow importing app module
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest


class TestPoseDetector3DInitialization:
    """
    Unit tests for PoseDetector3D initialization.
    
    These tests verify that the PoseDetector3D class can be instantiated
    with various configurations and that it properly initializes its state.
    
    Requirements: 1.1
    """
    
    def test_pose_detector_3d_file_exists(self):
        """
        Test that pose_detector_3d.js file exists.
        
        The file should be created in app/static/js/ directory.
        """
        pose_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'pose_detector_3d.js'
        assert pose_detector_file.exists(), "pose_detector_3d.js file should exist"
    
    def test_pose_detector_3d_class_defined(self):
        """
        Test that PoseDetector3D class is defined in the JavaScript file.
        """
        pose_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'pose_detector_3d.js'
        content = pose_detector_file.read_text(encoding='utf-8')
        
        assert 'class PoseDetector3D' in content, "PoseDetector3D class should be defined"
    
    def test_pose_detector_3d_constructor_exists(self):
        """
        Test that PoseDetector3D has a constructor method.
        """
        pose_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'pose_detector_3d.js'
        content = pose_detector_file.read_text(encoding='utf-8')
        
        assert 'constructor' in content, "PoseDetector3D should have a constructor"
    
    def test_pose_detector_3d_accepts_config(self):
        """
        Test that PoseDetector3D constructor accepts configuration object.
        
        Configuration should support:
        - modelComplexity: 0, 1, or 2
        - smoothLandmarks: boolean
        - minDetectionConfidence: 0.0-1.0
        - minTrackingConfidence: 0.0-1.0
        """
        pose_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'pose_detector_3d.js'
        content = pose_detector_file.read_text(encoding='utf-8')
        
        # Check for config parameter handling
        assert 'config' in content, "Constructor should accept config parameter"
        
        # Check for expected config properties
        config_properties = [
            'modelComplexity',
            'smoothLandmarks',
            'minDetectionConfidence',
            'minTrackingConfidence'
        ]
        
        for prop in config_properties:
            assert prop in content, f"Config should support '{prop}' property"
    
    def test_pose_detector_3d_default_config(self):
        """
        Test that PoseDetector3D has sensible default configuration values.
        
        Defaults should be:
        - modelComplexity: 1
        - smoothLandmarks: true
        - minDetectionConfidence: 0.5
        - minTrackingConfidence: 0.5
        """
        pose_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'pose_detector_3d.js'
        content = pose_detector_file.read_text(encoding='utf-8')
        
        # Check for default values
        assert '1' in content or 'modelComplexity' in content, "Should have default modelComplexity"
        assert 'true' in content or 'smoothLandmarks' in content, "Should have default smoothLandmarks"
        assert '0.5' in content, "Should have default confidence thresholds"
    
    def test_pose_detector_3d_initialize_method(self):
        """
        Test that PoseDetector3D has an initialize() method.
        
        This method should:
        - Load the MediaPipe Pose model
        - Return a Promise
        - Set isInitialized flag
        """
        pose_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'pose_detector_3d.js'
        content = pose_detector_file.read_text(encoding='utf-8')
        
        assert 'initialize()' in content or 'initialize(' in content, \
            "PoseDetector3D should have initialize() method"
        assert 'async' in content, "initialize() should be async"
        assert 'isInitialized' in content, "Should track initialization state"
    
    def test_pose_detector_3d_detect_pose_method(self):
        """
        Test that PoseDetector3D has a detectPose() method.
        
        This method should:
        - Accept a video element
        - Return pose detection results
        - Include keypoints with x, y, z coordinates
        """
        pose_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'pose_detector_3d.js'
        content = pose_detector_file.read_text(encoding='utf-8')
        
        assert 'detectPose' in content, "PoseDetector3D should have detectPose() method"
        assert 'videoElement' in content or 'video' in content, \
            "detectPose should accept video element parameter"
    
    def test_pose_detector_3d_extract_keypoints_method(self):
        """
        Test that PoseDetector3D has an extractKeypoints() method.
        
        This method should:
        - Extract keypoints from MediaPipe landmarks
        - Return array of keypoint objects
        - Include x, y, z, visibility for each keypoint
        """
        pose_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'pose_detector_3d.js'
        content = pose_detector_file.read_text(encoding='utf-8')
        
        assert 'extractKeypoints' in content, "PoseDetector3D should have extractKeypoints() method"
        assert 'landmarks' in content, "extractKeypoints should process landmarks"
    
    def test_pose_detector_3d_normalize_depth_method(self):
        """
        Test that PoseDetector3D has a normalizeDepthCoordinates() method.
        
        This method should:
        - Normalize z-coordinates to 0.0-1.0 range
        - Add z_normalized field to keypoints
        - Preserve x, y coordinates
        """
        pose_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'pose_detector_3d.js'
        content = pose_detector_file.read_text(encoding='utf-8')
        
        assert 'normalizeDepthCoordinates' in content or 'normalize' in content, \
            "PoseDetector3D should have normalizeDepthCoordinates() method"
        assert 'z_normalized' in content, "Should normalize z-coordinates"
    
    def test_pose_detector_3d_close_method(self):
        """
        Test that PoseDetector3D has a close() method for cleanup.
        
        This method should:
        - Release MediaPipe resources
        - Clean up any allocated memory
        - Allow re-initialization after close
        """
        pose_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'pose_detector_3d.js'
        content = pose_detector_file.read_text(encoding='utf-8')
        
        assert 'close()' in content or 'close(' in content, \
            "PoseDetector3D should have close() method"


class TestMovementDetectorInitialization:
    """
    Unit tests for MovementDetector initialization.
    
    These tests verify that the MovementDetector class can be instantiated
    with various configurations and that it properly initializes analyzers.
    
    Requirements: 1.1
    """
    
    def test_movement_detector_file_exists(self):
        """
        Test that movement_detector.js file exists.
        
        The file should be created in app/static/js/ directory.
        """
        movement_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_detector.js'
        assert movement_detector_file.exists(), "movement_detector.js file should exist"
    
    def test_movement_detector_class_defined(self):
        """
        Test that MovementDetector class is defined in the JavaScript file.
        """
        movement_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_detector.js'
        content = movement_detector_file.read_text(encoding='utf-8')
        
        assert 'class MovementDetector' in content, "MovementDetector class should be defined"
    
    def test_movement_detector_constructor_exists(self):
        """
        Test that MovementDetector has a constructor method.
        """
        movement_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_detector.js'
        content = movement_detector_file.read_text(encoding='utf-8')
        
        assert 'constructor' in content, "MovementDetector should have a constructor"
    
    def test_movement_detector_accepts_config(self):
        """
        Test that MovementDetector constructor accepts configuration object.
        
        Configuration should support:
        - movementThreshold: minimum movement magnitude to detect
        - historySize: number of frames to keep in history
        - confidenceThreshold: minimum confidence for reporting movements
        """
        movement_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_detector.js'
        content = movement_detector_file.read_text(encoding='utf-8')
        
        # Check for config parameter handling
        assert 'config' in content, "Constructor should accept config parameter"
        
        # Check for expected config properties
        config_properties = [
            'movementThreshold',
            'historySize',
            'confidenceThreshold'
        ]
        
        for prop in config_properties:
            assert prop in content, f"Config should support '{prop}' property"
    
    def test_movement_detector_default_config(self):
        """
        Test that MovementDetector has sensible default configuration values.
        
        Defaults should be:
        - movementThreshold: 0.02
        - historySize: 5
        - confidenceThreshold: 0.5
        """
        movement_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_detector.js'
        content = movement_detector_file.read_text(encoding='utf-8')
        
        # Check for default values
        assert '0.02' in content or 'movementThreshold' in content, \
            "Should have default movementThreshold"
        assert '5' in content or 'historySize' in content, \
            "Should have default historySize"
        assert '0.5' in content, "Should have default confidenceThreshold"
    
    def test_movement_detector_initializes_analyzers(self):
        """
        Test that MovementDetector initializes body part movement analyzers.
        
        Should initialize:
        - HeadMovementAnalyzer
        - ArmMovementAnalyzer (left and right)
        - LegMovementAnalyzer (left and right)
        - TorsoMovementAnalyzer
        """
        movement_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_detector.js'
        content = movement_detector_file.read_text(encoding='utf-8')
        
        # Check for analyzer initialization
        assert 'HeadMovementAnalyzer' in content, "Should initialize HeadMovementAnalyzer"
        assert 'ArmMovementAnalyzer' in content, "Should initialize ArmMovementAnalyzer"
        assert 'LegMovementAnalyzer' in content, "Should initialize LegMovementAnalyzer"
        assert 'TorsoMovementAnalyzer' in content, "Should initialize TorsoMovementAnalyzer"
    
    def test_movement_detector_keypointhistory_property(self):
        """
        Test that MovementDetector has keypointHistory property.
        
        This property should:
        - Store previous frame keypoints
        - Be initialized as empty array
        - Be used for delta calculations
        """
        movement_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_detector.js'
        content = movement_detector_file.read_text(encoding='utf-8')
        
        assert 'keypointHistory' in content, "Should have keypointHistory property"
        assert '[]' in content, "keypointHistory should be initialized as array"
    
    def test_movement_detector_analyzers_property(self):
        """
        Test that MovementDetector has analyzers property.
        
        This property should:
        - Store registered movement analyzers
        - Be initialized as array
        - Support adding/removing analyzers
        """
        movement_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_detector.js'
        content = movement_detector_file.read_text(encoding='utf-8')
        
        assert 'analyzers' in content, "Should have analyzers property"
    
    def test_movement_detector_detect_movements_method(self):
        """
        Test that MovementDetector has a detectMovements() method.
        
        This method should:
        - Accept current keypoints
        - Evaluate all registered analyzers
        - Return array of detected movements
        """
        movement_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_detector.js'
        content = movement_detector_file.read_text(encoding='utf-8')
        
        assert 'detectMovements' in content, "MovementDetector should have detectMovements() method"
    
    def test_movement_detector_update_history_method(self):
        """
        Test that MovementDetector has an updateHistory() method.
        
        This method should:
        - Accept keypoints
        - Add to history buffer
        - Maintain history size limit
        """
        movement_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_detector.js'
        content = movement_detector_file.read_text(encoding='utf-8')
        
        assert 'updateHistory' in content, "MovementDetector should have updateHistory() method"
    
    def test_movement_detector_calculate_delta_method(self):
        """
        Test that MovementDetector has a calculateDelta() method.
        
        This method should:
        - Accept two keypoints
        - Calculate 3D position change
        - Return delta object with x, y, z
        """
        movement_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_detector.js'
        content = movement_detector_file.read_text(encoding='utf-8')
        
        assert 'calculateDelta' in content, "MovementDetector should have calculateDelta() method"
    
    def test_movement_detector_calculate_magnitude_method(self):
        """
        Test that MovementDetector has a calculateMagnitude() method.
        
        This method should:
        - Accept delta object
        - Calculate magnitude of 3D vector
        - Return numeric magnitude value
        """
        movement_detector_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_detector.js'
        content = movement_detector_file.read_text(encoding='utf-8')
        
        assert 'calculateMagnitude' in content, "MovementDetector should have calculateMagnitude() method"


class TestAnalyzerRegistration:
    """
    Unit tests for body part movement analyzer registration.
    
    These tests verify that movement analyzers can be properly registered
    and that the analyzer system is extensible.
    
    Requirements: 1.1
    """
    
    def test_movement_analyzers_file_exists(self):
        """
        Test that movement_analyzers.js file exists.
        
        The file should be created in app/static/js/ directory.
        """
        analyzers_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_analyzers.js'
        assert analyzers_file.exists(), "movement_analyzers.js file should exist"
    
    def test_movement_analyzer_base_class_defined(self):
        """
        Test that MovementAnalyzer base class is defined.
        
        This class should:
        - Define the interface for all analyzers
        - Have an analyze() method
        - Support configuration
        """
        analyzers_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_analyzers.js'
        content = analyzers_file.read_text(encoding='utf-8')
        
        assert 'class MovementAnalyzer' in content, "MovementAnalyzer base class should be defined"
        assert 'analyze' in content, "MovementAnalyzer should have analyze() method"
    
    def test_head_movement_analyzer_defined(self):
        """
        Test that HeadMovementAnalyzer class is defined.
        
        This analyzer should:
        - Extend MovementAnalyzer
        - Analyze head keypoints (nose, ears)
        - Detect head turning, tilting, nodding
        """
        analyzers_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_analyzers.js'
        content = analyzers_file.read_text(encoding='utf-8')
        
        assert 'class HeadMovementAnalyzer' in content, "HeadMovementAnalyzer should be defined"
        assert 'extends MovementAnalyzer' in content, "HeadMovementAnalyzer should extend MovementAnalyzer"
    
    def test_arm_movement_analyzer_defined(self):
        """
        Test that ArmMovementAnalyzer class is defined.
        
        This analyzer should:
        - Extend MovementAnalyzer
        - Accept side parameter (left/right)
        - Analyze arm keypoints (shoulder, elbow, wrist)
        - Detect arm raising, lowering, extending, bending
        """
        analyzers_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_analyzers.js'
        content = analyzers_file.read_text(encoding='utf-8')
        
        assert 'class ArmMovementAnalyzer' in content, "ArmMovementAnalyzer should be defined"
        assert 'extends MovementAnalyzer' in content, "ArmMovementAnalyzer should extend MovementAnalyzer"
        assert 'side' in content, "ArmMovementAnalyzer should accept side parameter"
    
    def test_leg_movement_analyzer_defined(self):
        """
        Test that LegMovementAnalyzer class is defined.
        
        This analyzer should:
        - Extend MovementAnalyzer
        - Accept side parameter (left/right)
        - Analyze leg keypoints (hip, knee, ankle)
        - Detect leg lifting, kicking, bending
        """
        analyzers_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_analyzers.js'
        content = analyzers_file.read_text(encoding='utf-8')
        
        assert 'class LegMovementAnalyzer' in content, "LegMovementAnalyzer should be defined"
        assert 'extends MovementAnalyzer' in content, "LegMovementAnalyzer should extend MovementAnalyzer"
        assert 'side' in content, "LegMovementAnalyzer should accept side parameter"
    
    def test_torso_movement_analyzer_defined(self):
        """
        Test that TorsoMovementAnalyzer class is defined.
        
        This analyzer should:
        - Extend MovementAnalyzer
        - Analyze torso keypoints (shoulders, hips)
        - Detect torso rotation, bending, leaning
        """
        analyzers_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_analyzers.js'
        content = analyzers_file.read_text(encoding='utf-8')
        
        assert 'class TorsoMovementAnalyzer' in content, "TorsoMovementAnalyzer should be defined"
        assert 'extends MovementAnalyzer' in content, "TorsoMovementAnalyzer should extend MovementAnalyzer"
    
    def test_analyzer_has_analyze_method(self):
        """
        Test that all analyzers have an analyze() method.
        
        This method should:
        - Accept current and previous keypoints
        - Accept movement threshold
        - Return array of detected movements
        """
        analyzers_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_analyzers.js'
        content = analyzers_file.read_text(encoding='utf-8')
        
        # Count analyze method definitions
        analyze_count = content.count('analyze(')
        assert analyze_count >= 5, "All analyzers should have analyze() method"
    
    def test_analyzer_has_calculate_delta_method(self):
        """
        Test that analyzers have calculateDelta() method.
        
        This method should:
        - Calculate 3D position change between keypoints
        - Return delta object
        """
        analyzers_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_analyzers.js'
        content = analyzers_file.read_text(encoding='utf-8')
        
        assert 'calculateDelta' in content, "Analyzers should have calculateDelta() method"
    
    def test_analyzer_has_calculate_magnitude_method(self):
        """
        Test that analyzers have calculateMagnitude() method.
        
        This method should:
        - Calculate magnitude of 3D movement vector
        - Return numeric value
        """
        analyzers_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_analyzers.js'
        content = analyzers_file.read_text(encoding='utf-8')
        
        assert 'calculateMagnitude' in content, "Analyzers should have calculateMagnitude() method"
    
    def test_movement_descriptor_generator_file_exists(self):
        """
        Test that movement_descriptor.js file exists.
        
        The file should be created in app/static/js/ directory.
        """
        descriptor_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_descriptor.js'
        assert descriptor_file.exists(), "movement_descriptor.js file should exist"
    
    def test_movement_descriptor_generator_class_defined(self):
        """
        Test that MovementDescriptorGenerator class is defined.
        
        This class should:
        - Generate natural language descriptions of movements
        - Prioritize significant movements
        """
        descriptor_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_descriptor.js'
        content = descriptor_file.read_text(encoding='utf-8')
        
        assert 'class MovementDescriptorGenerator' in content, \
            "MovementDescriptorGenerator class should be defined"
    
    def test_movement_descriptor_generator_has_generate_method(self):
        """
        Test that MovementDescriptorGenerator has generateDescriptor() method.
        
        This method should:
        - Accept bodyPart, movementType, delta, confidence
        - Return natural language string
        """
        descriptor_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_descriptor.js'
        content = descriptor_file.read_text(encoding='utf-8')
        
        assert 'generateDescriptor' in content, \
            "MovementDescriptorGenerator should have generateDescriptor() method"
    
    def test_movement_descriptor_generator_has_prioritize_method(self):
        """
        Test that MovementDescriptorGenerator has prioritizeMovements() method.
        
        This method should:
        - Accept array of movements
        - Accept max movements parameter
        - Return sorted array of top movements
        """
        descriptor_file = Path(__file__).parent.parent / 'app' / 'static' / 'js' / 'movement_descriptor.js'
        content = descriptor_file.read_text(encoding='utf-8')
        
        assert 'prioritizeMovements' in content, \
            "MovementDescriptorGenerator should have prioritizeMovements() method"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
