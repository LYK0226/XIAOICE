"""
WebSocket event handlers for real-time chat functionality.
Uses Google ADK (Agent Development Kit) for AI responses.
"""
from flask import request
from flask_socketio import emit, join_room, leave_room
from socketio.exceptions import ConnectionRefusedError
from flask_jwt_extended import decode_token, verify_jwt_in_request
from app import socketio
from .models import db, User, Conversation, Message, UserProfile, UserApiKey
from datetime import datetime
import os
import logging
from .agent import chat_agent

logger = logging.getLogger(__name__)


@socketio.on('connect')
def handle_connect(auth):
    """
    Handle new WebSocket connections with JWT authentication.
    
    Args:
        auth: Dictionary containing authentication token
    
    Raises:
        ConnectionRefusedError: If JWT token is invalid or missing
    """
    try:
        # Extract token from auth parameter
        if not auth or 'token' not in auth:
            raise ConnectionRefusedError('Authentication token required')
        
        token = auth['token']
        
        # Decode and verify JWT token
        try:
            decoded_token = decode_token(token)
            user_id = decoded_token['sub']
            
            # Verify user exists
            user = User.query.get(user_id)
            if not user:
                raise ConnectionRefusedError('Invalid user')
            
            # Store user info in session
            request.sid_to_user_id = {request.sid: user_id}
            
            print(f"User {user.username} (ID: {user_id}) connected with SID: {request.sid}")
            
            emit('connected', {
                'status': 'success',
                'message': 'Connected to chat server',
                'user_id': user_id
            })
            
        except Exception as e:
            print(f"JWT verification failed: {e}")
            raise ConnectionRefusedError('Invalid token')
            
    except ConnectionRefusedError as e:
        print(f"Connection refused: {e}")
        raise
    except Exception as e:
        print(f"Connection error: {e}")
        raise ConnectionRefusedError('Authentication failed')


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    print(f"Client disconnected: {request.sid}")


@socketio.on('join_room')
def handle_join_room(data):
    """
    Handle user joining a conversation room.
    
    Args:
        data: Dictionary containing 'conversation_id'
    """
    try:
        conversation_id = data.get('conversation_id')
        
        if not conversation_id:
            emit('error', {'message': 'conversation_id is required'})
            return
        
        # Verify conversation exists
        conversation = Conversation.query.get(conversation_id)
        if not conversation:
            emit('error', {'message': 'Conversation not found'})
            return
        
        # Join the room
        room = f"conversation_{conversation_id}"
        join_room(room)
        
        print(f"User joined room: {room}")
        
        emit('joined_room', {
            'conversation_id': conversation_id,
            'room': room,
            'message': f'Joined conversation: {conversation.title}'
        })
        
    except Exception as e:
        print(f"Error joining room: {e}")
        emit('error', {'message': 'Failed to join room'})


@socketio.on('leave_room')
def handle_leave_room(data):
    """
    Handle user leaving a conversation room.
    
    Args:
        data: Dictionary containing 'conversation_id'
    """
    try:
        conversation_id = data.get('conversation_id')
        
        if not conversation_id:
            emit('error', {'message': 'conversation_id is required'})
            return
        
        room = f"conversation_{conversation_id}"
        leave_room(room)
        
        print(f"User left room: {room}")
        
        emit('left_room', {
            'conversation_id': conversation_id,
            'message': 'Left conversation'
        })
        
    except Exception as e:
        print(f"Error leaving room: {e}")
        emit('error', {'message': 'Failed to leave room'})


@socketio.on('send_message')
def handle_send_message(data):
    """
    Handle sending a text message via WebSocket.
    
    Args:
        data: Dictionary containing:
            - message: Text message content
            - conversation_id: ID of the conversation
            - user_id: ID of the user sending the message
    """
    try:
        message_text = data.get('message', '').strip()
        conversation_id = data.get('conversation_id')
        user_id = data.get('user_id')
        
        if not message_text:
            emit('error', {'message': 'Message text is required'})
            return
        
        if not conversation_id or not user_id:
            emit('error', {'message': 'conversation_id and user_id are required'})
            return
        
        # Verify conversation exists
        conversation = Conversation.query.get(conversation_id)
        if not conversation:
            emit('error', {'message': 'Conversation not found'})
            return
        
        # Save user message to database
        user_message = Message(
            conversation_id=conversation_id,
            sender='user',
            content=message_text,
            created_at=datetime.utcnow()
        )
        db.session.add(user_message)
        db.session.commit()
        
        # Broadcast user message to room
        room = f"conversation_{conversation_id}"
        emit('new_message', {
            'message_id': user_message.id,
            'sender': 'user',
            'content': message_text,
            'created_at': user_message.created_at.isoformat(),
            'conversation_id': conversation_id
        }, room=room)
        
        # Get conversation history for context
        history = []
        previous_messages = Message.query.filter_by(
            conversation_id=conversation_id
        ).order_by(Message.created_at.desc()).limit(10).all()
        
        for msg in reversed(previous_messages[:-1]):  # Exclude the message we just added
            history.append({
                'sender': msg.sender,
                'content': msg.content
            })
        
        # Get user's API key and model settings
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        api_key = None
        ai_model = 'gemini-3-flash'
        ai_provider = 'ai_studio'
        vertex_config = None
        provider_for_request = 'ai_studio'
        
        if user_profile:
            if user_profile.selected_api_key:
                api_key = user_profile.selected_api_key.get_decrypted_key()
            if user_profile.ai_model:
                ai_model = user_profile.ai_model
            if user_profile.ai_provider:
                ai_provider = user_profile.ai_provider
            if ai_provider == 'vertex_ai':
                vertex_config = {
                    'service_account': user_profile.get_decrypted_vertex_service_account(),
                    'project_id': user_profile.vertex_project_id,
                    'location': user_profile.vertex_location or 'us-central1'
                }
                provider_for_request = 'vertex_ai'
            else:
                provider_for_request = 'ai_studio'
        
        # Set environment variables for AI processing
        credentials_path = os.environ.get('GCS_CREDENTIALS_PATH')
        if credentials_path:
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
        
        # Generate AI response using ADK agent
        emit('ai_thinking', {'conversation_id': conversation_id}, room=room)
        
        ai_response_text = ""
        
        try:
            # Get user's name for personalization
            user = User.query.get(user_id)
            username = user.username if user else None
            
            # Stream AI response using ADK agent
            for chunk in chat_agent.generate_streaming_response(
                message_text,
                history=history,
                api_key=api_key,
                model_name=ai_model,
                user_id=str(user_id),
                conversation_id=conversation_id,
                username=username,
                provider=provider_for_request,
                vertex_config=vertex_config
            ):
                chunk = chunk.strip()
                
                # Remove common AI prefixes
                prefixes_to_remove = ['Assistant:', 'AI:', 'Bot:', 'System:', 'Human:']
                for prefix in prefixes_to_remove:
                    if chunk.startswith(prefix):
                        chunk = chunk[len(prefix):].strip()
                        break
                
                ai_response_text += chunk
                
                # Stream chunk to client
                emit('ai_response_chunk', {
                    'chunk': chunk,
                    'conversation_id': conversation_id
                }, room=room)
            
            # Save AI response to database
            ai_message = Message(
                conversation_id=conversation_id,
                sender='assistant',
                content=ai_response_text,
                created_at=datetime.utcnow()
            )
            db.session.add(ai_message)
            db.session.commit()
            
            # Notify clients that AI response is complete
            emit('ai_response_complete', {
                'message_id': ai_message.id,
                'sender': 'assistant',
                'content': ai_response_text,
                'created_at': ai_message.created_at.isoformat(),
                'conversation_id': conversation_id
            }, room=room)
            
        except Exception as e:
            print(f"Error generating AI response: {e}")
            error_msg = f"Sorry, I encountered an error: {str(e)}"
            
            # Save error message
            error_message = Message(
                conversation_id=conversation_id,
                sender='assistant',
                content=error_msg,
                created_at=datetime.utcnow()
            )
            db.session.add(error_message)
            db.session.commit()
            
            emit('ai_response_error', {
                'error': error_msg,
                'conversation_id': conversation_id
            }, room=room)
        
    except Exception as e:
        print(f"Error handling message: {e}")
        emit('error', {'message': f'Failed to send message: {str(e)}'})


@socketio.on('typing')
def handle_typing(data):
    """
    Handle typing indicators.
    
    Args:
        data: Dictionary containing:
            - conversation_id: ID of the conversation
            - user_id: ID of the user typing
            - is_typing: Boolean indicating typing status
    """
    try:
        conversation_id = data.get('conversation_id')
        user_id = data.get('user_id')
        is_typing = data.get('is_typing', False)
        
        if not conversation_id or not user_id:
            return
        
        # Get user info
        user = User.query.get(user_id)
        if not user:
            return
        
        room = f"conversation_{conversation_id}"
        
        # Broadcast typing status to room (exclude sender)
        emit('user_typing', {
            'user_id': user_id,
            'username': user.username,
            'is_typing': is_typing,
            'conversation_id': conversation_id
        }, room=room, include_self=False)
        
    except Exception as e:
        print(f"Error handling typing indicator: {e}")


# Pose Detection Event Handlers (2D backend removed - now using 3D frontend detection)
    """
    Initialize pose detection session for user.
    
    Args:
        data: Dictionary containing:
            - user_id: ID of the user starting pose detection
    """
    try:
        print(f"🔔 POSE_START EVENT RECEIVED: {data}")  # Console output for immediate visibility
        logger.info(f"Received pose_start event with data: {data}")
        
        # Immediate acknowledgment for debugging
        emit('pose_debug', {'message': 'pose_start received', 'data': data})
        
        user_id = data.get('user_id')
        
        if not user_id:
            logger.error("Pose detection start failed: user_id is missing from request")
            emit('pose_error', {
                'error': 'User ID is required',
                'details': 'user_id field is missing from request',
                'timestamp': datetime.utcnow().isoformat()
            })
            return
        
        # Verify user exists
        user = User.query.get(user_id)
        if not user:
            logger.error(f"Pose detection start failed: User {user_id} not found")
            emit('pose_error', {
                'error': 'Invalid user',
                'details': 'User not found',
                'timestamp': datetime.utcnow().isoformat()
            })
            return
        
        logger.info(f"User {user_id} verified, initializing pose detection modules...")
        
        # Initialize pose detector and action recognizer for this session
        try:
            from .pose_detection import PoseDetector, ActionRecognizer
            logger.info("Pose detection modules imported successfully")
        except ImportError as ie:
            logger.error(f"Failed to import pose detection modules: {ie}", exc_info=True)
            emit('pose_error', {
                'error': 'Pose detection modules not available',
                'details': f'Import error: {str(ie)}',
                'timestamp': datetime.utcnow().isoformat()
            })
            return
        
        from flask import current_app
        
        # Get configuration values
        config = current_app.config
        model_complexity = config.get('POSE_MODEL_COMPLEXITY', 1)
        min_detection_confidence = config.get('POSE_MIN_DETECTION_CONFIDENCE', 0.5)
        min_tracking_confidence = config.get('POSE_MIN_TRACKING_CONFIDENCE', 0.5)
        
        logger.info(f"Creating pose detector with complexity={model_complexity}, "
                   f"detection_conf={min_detection_confidence}, tracking_conf={min_tracking_confidence}")
        
        session_key = f"user_{user_id}_{request.sid}"
        
        # Clean up any existing session for this user (handle rapid stop/start cycles)
        if session_key in _pose_sessions:
            logger.warning(f"Found existing session for user {user_id}, cleaning up before starting new one")
            try:
                old_session = _pose_sessions[session_key]
                if 'pose_detector' in old_session:
                    old_session['pose_detector'].close()
                del _pose_sessions[session_key]
                logger.info("Old session cleaned up successfully")
            except Exception as cleanup_error:
                logger.warning(f"Error cleaning up old session: {cleanup_error}")
        
        # Initialize pose detector
        try:
            pose_detector = PoseDetector(
                min_detection_confidence=min_detection_confidence,
                min_tracking_confidence=min_tracking_confidence,
                model_complexity=model_complexity
            )
            logger.info("PoseDetector initialized successfully")
        except Exception as pe:
            logger.error(f"Failed to initialize PoseDetector: {pe}", exc_info=True)
            emit('pose_error', {
                'error': 'Failed to initialize pose detector',
                'details': str(pe),
                'timestamp': datetime.utcnow().isoformat()
            })
            return
        
        # Initialize action recognizer
        try:
            action_recognizer = ActionRecognizer()
            logger.info("ActionRecognizer initialized successfully")
        except Exception as ae:
            logger.error(f"Failed to initialize ActionRecognizer: {ae}", exc_info=True)
            emit('pose_error', {
                'error': 'Failed to initialize action recognizer',
                'details': str(ae),
                'timestamp': datetime.utcnow().isoformat()
            })
            return
        
        _pose_sessions[session_key] = {
            'user_id': user_id,
            'sid': request.sid,
            'pose_detector': pose_detector,
            'action_recognizer': action_recognizer,
            'started_at': datetime.utcnow()
        }
        
        logger.info(f"✅ Pose detection session started for user {user_id} (SID: {request.sid})")
        
        emit('pose_started', {
            'status': 'success',
            'message': 'Pose detection session initialized',
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        logger.info(f"✅ Emitted pose_started event for user {user_id}")
        
    except Exception as e:
        error_msg = f"Failed to start pose detection: {str(e)}"
        logger.error(error_msg, exc_info=True)
        emit('pose_error', {
            'error': 'Failed to initialize pose detection',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })


@socketio.on('pose_stop')
def handle_pose_stop(data):
    """
    Clean up pose detection session.
    
    Args:
        data: Dictionary containing:
            - user_id: ID of the user stopping pose detection
    """
    try:
        logger.info(f"Received pose_stop event with data: {data}")
        user_id = data.get('user_id')
        
        if not user_id:
            logger.error("Pose detection stop failed: user_id is missing from request")
            emit('pose_error', {
                'error': 'User ID is required',
                'details': 'user_id field is missing from request',
                'timestamp': datetime.utcnow().isoformat()
            })
            return
        
        session_key = f"user_{user_id}_{request.sid}"
        
        # Clean up session if it exists
        if session_key in _pose_sessions:
            session = _pose_sessions[session_key]
            
            # Release pose detector resources
            try:
                if 'pose_detector' in session:
                    session['pose_detector'].close()
                    logger.info(f"Released pose detector resources for user {user_id}")
            except Exception as e:
                logger.warning(f"Error releasing pose detector: {e}")
            
            del _pose_sessions[session_key]
            
            logger.info(f"✅ Pose detection session stopped for user {user_id} (SID: {request.sid})")
            
            emit('pose_stopped', {
                'status': 'success',
                'message': 'Pose detection session ended',
                'user_id': user_id,
                'timestamp': datetime.utcnow().isoformat()
            })
        else:
            logger.info(f"No active session found for user {user_id} (SID: {request.sid})")
            emit('pose_stopped', {
                'status': 'success',
                'message': 'No active session found',
                'user_id': user_id,
                'timestamp': datetime.utcnow().isoformat()
            })
        
    except Exception as e:
        error_msg = f"Failed to stop pose detection: {str(e)}"
        logger.error(error_msg, exc_info=True)
        emit('pose_error', {
            'error': 'Failed to stop pose detection',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })


@socketio.on('pose_frame')
def handle_pose_frame(data):
    """
    Process incoming video frame for pose detection.
    
    Args:
        data: Dictionary containing:
            - frame: Base64-encoded JPEG image
            - user_id: ID of the user
            - timestamp: Frame timestamp (optional)
    
    Emits:
        - pose_results: Detection results with keypoints and action
        - pose_error: Error message if processing fails
    """
    import time
    
    try:
        frame_data = data.get('frame')
        user_id = data.get('user_id')
        frame_timestamp = data.get('timestamp', time.time())
        
        if not frame_data:
            logger.error("Pose frame processing failed: frame data is missing from request")
            emit('pose_error', {
                'error': 'Frame data is required',
                'details': 'frame field is missing from request',
                'timestamp': datetime.utcnow().isoformat()
            })
            return
        
        if not user_id:
            logger.error("Pose frame processing failed: user_id is missing from request")
            emit('pose_error', {
                'error': 'User ID is required',
                'details': 'user_id field is missing from request',
                'timestamp': datetime.utcnow().isoformat()
            })
            return
        
        session_key = f"user_{user_id}_{request.sid}"
        
        # Check if session exists
        if session_key not in _pose_sessions:
            logger.error(f"Pose frame processing failed: No active session for user {user_id} (SID: {request.sid})")
            emit('pose_error', {
                'error': 'No active pose detection session',
                'details': 'Please start a pose detection session first',
                'timestamp': datetime.utcnow().isoformat()
            })
            return
        
        session = _pose_sessions[session_key]
        pose_detector = session['pose_detector']
        action_recognizer = session['action_recognizer']
        
        # Start timing
        start_time = time.time()
        
        try:
            # Detect pose from base64 frame
            pose_result = pose_detector.detect_pose_from_base64(frame_data)
            
            # If no pose detected, return empty result
            if not pose_result['detected']:
                emit('pose_results', {
                    # 2D compatibility fields
                    'keypoints': [],
                    'detected': False,
                    'action': 'No Person Detected',
                    'action_confidence': 0.0,
                    'processing_time_ms': (time.time() - start_time) * 1000,
                    'timestamp': frame_timestamp,
                    
                    # 3D data extensions
                    'keypoints_3d': [],
                    'movements': [],
                    'primary_movement': None
                })
                return
            
            # Recognize action from keypoints
            action_result = action_recognizer.recognize_action(pose_result['keypoints'])
            
            # Calculate processing time
            processing_time_ms = (time.time() - start_time) * 1000
            
            # Prepare 3D keypoints with z and z_normalized fields
            keypoints_3d = []
            for kp in pose_result['keypoints']:
                kp_3d = kp.copy()
                # Ensure z_normalized is present (normalize z to 0.0-1.0 range if not already)
                if 'z_normalized' not in kp_3d and 'z' in kp_3d:
                    # Simple normalization: map z values to 0-1 range
                    # MediaPipe z is relative to hips, typically in range [-1, 1]
                    kp_3d['z_normalized'] = (kp_3d['z'] + 1.0) / 2.0
                keypoints_3d.append(kp_3d)
            
            # Detect movements using movement detector if available
            movements = []
            primary_movement = None
            try:
                # Import movement detector (will be implemented in frontend)
                # For now, provide empty movements array for backward compatibility
                movements = []
                primary_movement = None
            except Exception as e:
                logger.debug(f"Movement detection not available: {e}")
            
            # Emit results with 3D data and movement information
            emit('pose_results', {
                # 2D compatibility fields (existing format)
                'keypoints': pose_result['keypoints'],
                'detected': True,
                'action': action_result['action'],
                'action_confidence': action_result['confidence'],
                'processing_time_ms': processing_time_ms,
                'timestamp': frame_timestamp,
                
                # 3D data extensions (new format)
                'keypoints_3d': keypoints_3d,
                'movements': movements,
                'primary_movement': primary_movement
            })
            
            logger.debug(f"Processed frame for user {user_id}: {action_result['action']} "
                        f"(confidence={action_result['confidence']:.2f}, "
                        f"time={processing_time_ms:.1f}ms)")
            
        except ValueError as ve:
            # Invalid frame data - skip and continue
            error_msg = f"Invalid frame data: {str(ve)}"
            logger.warning(error_msg)
            emit('pose_error', {
                'error': 'Invalid frame data',
                'details': str(ve),
                'timestamp': datetime.utcnow().isoformat()
            })
            # Don't raise - continue processing subsequent frames
            
        except Exception as e:
            # Unexpected error during processing
            error_msg = f"Error processing frame: {str(e)}"
            logger.error(error_msg, exc_info=True)
            emit('pose_error', {
                'error': 'Failed to process frame',
                'details': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
            # Don't raise - continue processing subsequent frames
        
    except Exception as e:
        # Top-level error handling
        error_msg = f"Error handling pose frame: {str(e)}"
        logger.error(error_msg, exc_info=True)
        emit('pose_error', {
            'error': 'Failed to handle frame',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })
