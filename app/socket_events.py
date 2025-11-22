"""
WebSocket event handlers for real-time chat functionality.
"""
from flask import request
from flask_socketio import emit, join_room, leave_room, ConnectionRefusedError
from flask_jwt_extended import decode_token, verify_jwt_in_request
from app import socketio
from .models import db, User, Conversation, Message, UserProfile, UserApiKey
from datetime import datetime
import os
from . import vertex_ai


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
            role='user',
            content=message_text,
            timestamp=datetime.utcnow()
        )
        db.session.add(user_message)
        db.session.commit()
        
        # Broadcast user message to room
        room = f"conversation_{conversation_id}"
        emit('new_message', {
            'message_id': user_message.id,
            'role': 'user',
            'content': message_text,
            'timestamp': user_message.timestamp.isoformat(),
            'conversation_id': conversation_id
        }, room=room)
        
        # Get conversation history for context
        history = []
        previous_messages = Message.query.filter_by(
            conversation_id=conversation_id
        ).order_by(Message.timestamp.desc()).limit(10).all()
        
        for msg in reversed(previous_messages[:-1]):  # Exclude the message we just added
            history.append({
                'role': msg.role,
                'content': msg.content
            })
        
        # Get user's API key and model settings
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        api_key = None
        ai_model = 'gemini-2.5-flash'
        
        if user_profile:
            if user_profile.selected_api_key:
                api_key = user_profile.selected_api_key.get_decrypted_key()
            if user_profile.ai_model:
                ai_model = user_profile.ai_model
        
        # Set environment variables for AI processing
        credentials_path = os.environ.get('GCS_CREDENTIALS_PATH')
        if credentials_path:
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
        
        # Generate AI response
        emit('ai_thinking', {'conversation_id': conversation_id}, room=room)
        
        ai_response_text = ""
        
        try:
            # Stream AI response
            for chunk in vertex_ai.generate_streaming_response(
                message_text,
                history=history,
                api_key=api_key,
                model_name=ai_model
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
                role='assistant',
                content=ai_response_text,
                timestamp=datetime.utcnow()
            )
            db.session.add(ai_message)
            db.session.commit()
            
            # Notify clients that AI response is complete
            emit('ai_response_complete', {
                'message_id': ai_message.id,
                'role': 'assistant',
                'content': ai_response_text,
                'timestamp': ai_message.timestamp.isoformat(),
                'conversation_id': conversation_id
            }, room=room)
            
        except Exception as e:
            print(f"Error generating AI response: {e}")
            error_msg = f"Sorry, I encountered an error: {str(e)}"
            
            # Save error message
            error_message = Message(
                conversation_id=conversation_id,
                role='assistant',
                content=error_msg,
                timestamp=datetime.utcnow()
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
