"""
ADK Agent module for XIAOICE chatbot.
This module provides a chat agent using Google Agent Development Kit (ADK)
to replace direct genai SDK usage.

Key Features:
- Full ADK integration for both text and multimodal content
- Persistent session management tied to database conversation IDs
- Per-user agent/runner isolation with API key and model preferences
"""
import os
import traceback
import asyncio
import logging
from typing import AsyncIterator, Optional, List, Dict, Any, Generator

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app import gcs_upload


# Configure logging
logger = logging.getLogger(__name__)

# System instruction for the chat agent
CHAT_AGENT_INSTRUCTION = """You are XIAOICE, a friendly and helpful AI assistant. 
You should:
- Be conversational and engaging
- Provide helpful, accurate, and thoughtful responses
- Be respectful and considerate
- If you don't know something, admit it honestly
- Support both English and Chinese conversations naturally
- When analyzing images or videos, describe what you see in detail

Always maintain a warm and professional tone in your responses."""

# Supported MIME types for file uploads
SUPPORTED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 
    'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'
]

# Maximum file size (500MB)
MAX_FILE_SIZE = 500 * 1024 * 1024


class ChatAgentManager:
    """
    Manages ADK chat agents for user sessions.
    Each user can have their own agent instance with their API key and model preferences.
    
    Session Management:
    - Sessions are tied to database conversation IDs for persistence
    - Each conversation has a unique session that maintains context
    - Agent/Runner instances are cached per user/model combination
    """
    
    # App name constant for ADK Runner
    APP_NAME = "xiaoice_chat"
    
    def __init__(self):
        self._agents: Dict[str, Agent] = {}
        self._session_service = InMemorySessionService()
        self._runners: Dict[str, Runner] = {}
        self._api_keys: Dict[str, str] = {}  # Cache API keys per user to avoid global env pollution
        self._created_sessions: set = set()  # Track created sessions
    
    def _create_agent(self, api_key: str, model_name: str = "gemini-2.5-flash") -> Agent:
        """
        Create a new ADK Agent with the specified configuration.
        
        Args:
            api_key: Google AI API key
            model_name: The Gemini model to use
            
        Returns:
            Configured Agent instance
        """
        # Store API key for later use (avoid setting in os.environ for thread safety)
        os.environ['GOOGLE_API_KEY'] = api_key
        
        agent = Agent(
            name="xiaoice_chat_agent",
            model=model_name,
            description="Your name is xiaoice, a friendly AI chat assistant that can understand and respond to user messages, analyze images and videos.",
            instruction=CHAT_AGENT_INSTRUCTION,
            generate_content_config=types.GenerateContentConfig(
                temperature=1.0,
                top_p=0.95,
                max_output_tokens=8192,
                safety_settings=[
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    ),
                    types.SafetySetting(
                        category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    ),
                ],
            ),
        )
        
        return agent
    
    def get_or_create_agent(self, user_id: str, api_key: str, model_name: str = "gemini-2.5-flash") -> Agent:
        """
        Get an existing agent for a user or create a new one.
        
        Args:
            user_id: Unique user identifier
            api_key: Google AI API key
            model_name: The Gemini model to use
            
        Returns:
            Agent instance for the user
        """
        agent_key = f"{user_id}_{model_name}"
        
        # Store API key per user for later retrieval
        self._api_keys[user_id] = api_key
        
        # Check if we need to create a new agent (different model or new user)
        if agent_key not in self._agents:
            self._agents[agent_key] = self._create_agent(api_key, model_name)
        
        return self._agents[agent_key]
    
    def get_or_create_runner(self, user_id: str, api_key: str, model_name: str = "gemini-2.5-flash") -> Runner:
        """
        Get or create a Runner for the user's agent.
        
        Args:
            user_id: Unique user identifier
            api_key: Google AI API key
            model_name: The Gemini model to use
            
        Returns:
            Runner instance for the agent
        """
        runner_key = f"{user_id}_{model_name}"
        
        if runner_key not in self._runners:
            agent = self.get_or_create_agent(user_id, api_key, model_name)
            self._runners[runner_key] = Runner(
                agent=agent,
                app_name=self.APP_NAME,
                session_service=self._session_service
            )
        
        return self._runners[runner_key]
    
    def get_session_id(self, user_id: str, conversation_id: Optional[int] = None) -> str:
        """
        Generate a persistent session ID based on user and conversation.
        
        Args:
            user_id: Unique user identifier
            conversation_id: Database conversation ID (from Conversation model)
            
        Returns:
            Persistent session ID string
        """
        if conversation_id is not None:
            # Use conversation ID for persistent sessions tied to database
            return f"conv_{user_id}_{conversation_id}"
        else:
            # Fallback for cases without a conversation (e.g., quick queries)
            return f"temp_{user_id}"
    
    def ensure_session_exists(self, user_id: str, session_id: str) -> None:
        """
        Ensure a session exists in the session service, creating it if necessary.
        
        Args:
            user_id: Unique user identifier
            session_id: The session ID to ensure exists
        """
        session_key = f"{self.APP_NAME}_{user_id}_{session_id}"
        
        if session_key not in self._created_sessions:
            # Create the session synchronously
            self._session_service.create_session_sync(
                app_name=self.APP_NAME,
                user_id=user_id,
                session_id=session_id,
                state={}
            )
            self._created_sessions.add(session_key)
            logger.info(f"Created new session: {session_id} for user: {user_id}")
    
    async def ensure_session_exists_async(self, user_id: str, session_id: str) -> None:
        """
        Ensure a session exists in the session service asynchronously.
        
        Args:
            user_id: Unique user identifier
            session_id: The session ID to ensure exists
        """
        session_key = f"{self.APP_NAME}_{user_id}_{session_id}"
        
        if session_key not in self._created_sessions:
            # Create the session asynchronously
            await self._session_service.create_session(
                app_name=self.APP_NAME,
                user_id=user_id,
                session_id=session_id,
                state={}
            )
            self._created_sessions.add(session_key)
            logger.info(f"Created new session: {session_id} for user: {user_id}")
    
    def get_api_key(self, user_id: str) -> Optional[str]:
        """Get cached API key for a user."""
        return self._api_keys.get(user_id)
    
    def clear_user_agents(self, user_id: str):
        """Clear all agents and cached data for a specific user."""
        keys_to_remove = [key for key in self._agents.keys() if key.startswith(f"{user_id}_")]
        for key in keys_to_remove:
            del self._agents[key]
        
        runner_keys_to_remove = [key for key in self._runners.keys() if key.startswith(f"{user_id}_")]
        for key in runner_keys_to_remove:
            del self._runners[key]
        
        # Clear API key cache
        if user_id in self._api_keys:
            del self._api_keys[user_id]
        
        # Clear tracked sessions for this user
        sessions_to_remove = [s for s in self._created_sessions if f"_{user_id}_" in s]
        for session_key in sessions_to_remove:
            self._created_sessions.discard(session_key)
    
    def clear_conversation_session(self, user_id: str, conversation_id: int):
        """
        Clear session data for a specific conversation.
        Useful when a conversation is deleted from the database.
        
        Args:
            user_id: Unique user identifier
            conversation_id: Database conversation ID
        """
        session_id = self.get_session_id(user_id, conversation_id)
        session_key = f"{self.APP_NAME}_{user_id}_{session_id}"
        
        # Remove from tracked sessions
        self._created_sessions.discard(session_key)
        
        # Try to delete from session service
        try:
            self._session_service.delete_session_sync(
                app_name=self.APP_NAME,
                user_id=user_id,
                session_id=session_id
            )
            logger.info(f"Deleted session: {session_id} for user: {user_id}")
        except Exception as e:
            logger.warning(f"Failed to delete session {session_id}: {e}")


# Global agent manager instance
_agent_manager = ChatAgentManager()


def _validate_file(image_mime_type: str, file_size: int) -> Optional[str]:
    """
    Validate file type and size.
    
    Args:
        image_mime_type: MIME type of the file
        file_size: Size of the file in bytes
        
    Returns:
        Error message if validation fails, None otherwise
    """
    if image_mime_type not in SUPPORTED_MIME_TYPES:
        return (f"Error: Unsupported file format '{image_mime_type}'. "
                f"Supported formats: Images (JPEG, PNG, WebP, HEIC, HEIF) and "
                f"Videos (MP4, MPEG, MOV, AVI, FLV, MPG, WEBM, WMV, 3GPP).")
    
    if file_size > MAX_FILE_SIZE:
        return f"Error: File is too large ({file_size} bytes). Maximum size is 500MB."
    
    return None


def _download_file_from_gcs(image_path: str) -> Optional[tuple]:
    """
    Download file from GCS and return data with size.
    
    Args:
        image_path: GCS path to the file
        
    Returns:
        Tuple of (file_data, file_size) or None on error
    """
    try:
        file_data = gcs_upload.download_file_from_gcs(image_path)
        logger.info(f"Downloaded file: size={len(file_data)} bytes")
        return file_data, len(file_data)
    except Exception as e:
        logger.error(f"Error downloading file from GCS: {e}")
        traceback.print_exc()
        return None


def _format_error_message(error: Exception) -> str:
    """
    Format user-friendly error messages based on exception type.
    
    Args:
        error: The exception that occurred
        
    Returns:
        User-friendly error message string
    """
    error_str = str(error).lower()
    
    if "user location is not supported" in error_str or "failed_precondition" in error_str:
        return ("I'm sorry, but the Google AI service is currently not available in your location. "
                "This is a regional restriction imposed by Google. "
                "Please try using a VPN service to connect from a supported region (like the US), "
                "or consider using a different AI service.")
    elif "api key" in error_str and ("invalid" in error_str or "unauthorized" in error_str):
        return ("API key error: Please check that your Google AI API key is valid and has the necessary permissions. "
                "You can verify your API key in the settings page.")
    elif "quota" in error_str or "rate limit" in error_str:
        return ("API quota exceeded: You've reached the usage limit for your Google AI API key. "
                "Please wait a few minutes before trying again, or check your API usage limits.")
    else:
        return f"Error: Failed to generate response. {str(error)}"


def build_message_content(
    message: str,
    image_path: Optional[str] = None,
    image_mime_type: Optional[str] = None,
    history: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Build the message content string with optional history context.
    
    For ADK, we pass text content directly. Image handling is done separately
    through the Parts API when needed.
    
    Args:
        message: The user's message
        image_path: Optional path to an image in GCS
        image_mime_type: MIME type of the image
        history: Optional conversation history
        
    Returns:
        Formatted message string with context
    """
    content_parts = []
    
    # Add conversation history as context if provided
    if history:
        try:
            convo_lines = ["Previous conversation context:"]
            if isinstance(history, list):
                for item in history:
                    if isinstance(item, dict) and 'role' in item and 'content' in item:
                        role = item.get('role')
                        content = item.get('content', '')
                        if role == 'user':
                            convo_lines.append(f"Human: {content}")
                        else:
                            convo_lines.append(f"AI: {content}")
                    elif isinstance(item, dict) and 'user' in item and 'bot' in item:
                        convo_lines.append(f"Human: {item.get('user', '')}")
                        convo_lines.append(f"AI: {item.get('bot', '')}")
            
            if len(convo_lines) > 1:
                content_parts.append("\n".join(convo_lines))
                content_parts.append("\nCurrent message:")
        except Exception as e:
            print(f"Failed to process history for context: {e}")
    
    # Add the main message
    if message:
        content_parts.append(message)
    
    # Add image reference note if present
    if image_path:
        content_parts.append(f"\n[Image attached: {image_mime_type or 'unknown type'}]")
    
    return "\n".join(content_parts) if content_parts else ""


async def generate_streaming_response_async(
    message: str,
    image_path: Optional[str] = None,
    image_mime_type: Optional[str] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None,
    user_id: str = "default",
    conversation_id: Optional[int] = None
) -> AsyncIterator[str]:
    """
    Generates a streaming response from the ADK agent asynchronously.
    
    This function fully uses ADK for both text and multimodal content,
    with persistent sessions tied to database conversation IDs.
    
    Args:
        message: The user's message
        image_path: Optional GCS path to an image
        image_mime_type: MIME type of the image
        history: Optional conversation history
        api_key: Google AI API key
        model_name: The Gemini model to use
        user_id: User identifier for session management
        conversation_id: Database conversation ID for persistent sessions
        
    Yields:
        Text chunks as they are generated
    """
    # Validate and set defaults for API key and model
    if api_key is None:
        api_key = os.environ.get('GOOGLE_API_KEY')
    
    if not api_key:
        yield "Error: API key is required but not provided. Please set your API key in the settings."
        return
    
    if model_name is None:
        model_name = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
    
    # Build content parts for the message
    content_parts = []
    
    # Build text content with history context
    text_content = build_message_content(message, image_path, image_mime_type, history)
    if text_content:
        content_parts.append(types.Part.from_text(text=text_content))
    
    # Handle image/video uploads
    if image_path and image_mime_type:
        logger.info(f"Processing file: path={image_path}, mime_type={image_mime_type}")
        
        # Download and validate file
        result = _download_file_from_gcs(image_path)
        if result is None:
            yield "Error: Failed to download file from storage."
            return
        
        file_data, file_size = result
        
        # Validate file
        validation_error = _validate_file(image_mime_type, file_size)
        if validation_error:
            yield validation_error
            return
        
        # Create a part from bytes for multimodal content
        file_part = types.Part.from_bytes(data=file_data, mime_type=image_mime_type)
        content_parts.append(file_part)
        logger.info("File part added to contents")
    
    if not content_parts:
        yield "Please provide a message or an image."
        return
    
    try:
        # Set the API key in environment for ADK
        os.environ['GOOGLE_API_KEY'] = api_key
        
        # Get the Runner for this user
        runner = _agent_manager.get_or_create_runner(user_id, api_key, model_name)
        
        # Use persistent session ID tied to conversation
        session_id = _agent_manager.get_session_id(user_id, conversation_id)
        
        # Ensure the session exists before using it
        await _agent_manager.ensure_session_exists_async(user_id, session_id)
        logger.info(f"Using session: {session_id} for user: {user_id}, conversation: {conversation_id}")
        
        # Create the content message for ADK
        user_content = types.Content(
            role="user",
            parts=content_parts
        )
        
        # Run the agent with streaming using ADK
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=user_content
        ):
            # Handle different event types from ADK
            if hasattr(event, 'content') and event.content:
                if hasattr(event.content, 'parts'):
                    for part in event.content.parts:
                        if hasattr(part, 'text') and part.text:
                            yield part.text
            elif hasattr(event, 'text'):
                yield event.text
                    
    except Exception as e:
        logger.error(f"Error generating streaming response: {e}")
        traceback.print_exc()
        yield _format_error_message(e)


def generate_streaming_response(
    message: str,
    image_path: Optional[str] = None,
    image_mime_type: Optional[str] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None,
    user_id: str = "default",
    conversation_id: Optional[int] = None
) -> Generator[str, None, None]:
    """
    Synchronous wrapper for streaming response generation using ADK.
    
    This function wraps the async generator to provide a synchronous interface
    for Flask routes while maintaining full ADK integration.
    
    Args:
        message: The user's message
        image_path: Optional GCS path to an image
        image_mime_type: MIME type of the image
        history: Optional conversation history
        api_key: Google AI API key
        model_name: The Gemini model to use
        user_id: User identifier for session management
        conversation_id: Database conversation ID for persistent sessions
        
    Yields:
        Text chunks as they are generated
    """
    # Validate and set defaults
    if api_key is None:
        api_key = os.environ.get('GOOGLE_API_KEY')
    
    if not api_key:
        yield "Error: API key is required but not provided. Please set your API key in the settings."
        return
    
    if model_name is None:
        model_name = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
    
    # Build content parts for the message
    content_parts = []
    
    # Build text content with history context
    text_content = build_message_content(message, None, None, history)
    if text_content:
        content_parts.append(types.Part.from_text(text=text_content))
    elif message:
        content_parts.append(types.Part.from_text(text=message))
    
    # Handle image/video uploads
    if image_path and image_mime_type:
        logger.info(f"Processing file: path={image_path}, mime_type={image_mime_type}")
        
        # Download and validate file
        result = _download_file_from_gcs(image_path)
        if result is None:
            yield "Error: Failed to download file from storage."
            return
        
        file_data, file_size = result
        
        # Validate file
        validation_error = _validate_file(image_mime_type, file_size)
        if validation_error:
            yield validation_error
            return
        
        file_part = types.Part.from_bytes(data=file_data, mime_type=image_mime_type)
        content_parts.append(file_part)
        logger.info("File part added to contents")
    
    if not content_parts:
        yield "Please provide a message or an image."
        return
    
    try:
        # Set the API key in environment for ADK
        os.environ['GOOGLE_API_KEY'] = api_key
        
        # Get the Runner for this user
        runner = _agent_manager.get_or_create_runner(user_id, api_key, model_name)
        
        # Use persistent session ID tied to conversation
        session_id = _agent_manager.get_session_id(user_id, conversation_id)
        
        # Ensure the session exists before using it (sync version)
        _agent_manager.ensure_session_exists(user_id, session_id)
        logger.info(f"Using session: {session_id} for user: {user_id}, conversation: {conversation_id}")
        
        # Create the content message for ADK
        user_content = types.Content(
            role="user",
            parts=content_parts
        )
        
        # For synchronous usage, we need to run the async generator in an event loop
        # Create or get the event loop
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is already running (e.g., in some Flask contexts),
                # we need to use a different approach
                raise RuntimeError("Event loop is already running")
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Define an async function to collect and yield chunks
        async def run_agent_async():
            chunks = []
            async for event in runner.run_async(
                user_id=user_id,
                session_id=session_id,
                new_message=user_content
            ):
                # Handle different event types from ADK
                if hasattr(event, 'content') and event.content:
                    if hasattr(event.content, 'parts'):
                        for part in event.content.parts:
                            if hasattr(part, 'text') and part.text:
                                chunks.append(part.text)
                elif hasattr(event, 'text'):
                    chunks.append(event.text)
            return chunks
        
        # Run the async function and yield results
        try:
            chunks = loop.run_until_complete(run_agent_async())
            for chunk in chunks:
                yield chunk
        except RuntimeError as e:
            # Fallback: If we can't use the event loop directly, 
            # use concurrent.futures for thread-safe execution
            if "cannot be called from a running event loop" in str(e):
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(
                        lambda: asyncio.run(run_agent_async())
                    )
                    chunks = future.result()
                    for chunk in chunks:
                        yield chunk
            else:
                raise
                
    except Exception as e:
        logger.error(f"Error generating streaming response: {e}")
        traceback.print_exc()
        yield _format_error_message(e)


# Export the agent manager for external access if needed
def get_agent_manager() -> ChatAgentManager:
    """Get the global agent manager instance."""
    return _agent_manager
