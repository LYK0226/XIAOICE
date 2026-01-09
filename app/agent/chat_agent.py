"""
ADK Agent module for XIAOICE chatbot.
This module provides a multi-agent chat system using Google Agent Development Kit (ADK).

Multi-Agent Architecture:
- Coordinator Agent: Manages conversations, delegates tasks, receives analysis results, and interacts directly with users
- PDF Agent: Analyzes PDF documents and returns structured results to coordinator (does not interact with users)
- Media Agent: Analyzes images and videos and returns structured results to coordinator (does not interact with users)

Key Features:
- Full ADK integration for text, PDF, and multimodal content
- Intelligent task distribution via coordinator agent
- Specialized agents for PDF and media analysis
- Coordinator receives analysis results and presents them conversationally to users
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

from app import gcp_bucket


# Configure logging
logger = logging.getLogger(__name__)

# System instructions for different agents

# Coordinator agent - distributes tasks, receives analysis results, and interacts with users
COORDINATOR_AGENT_INSTRUCTION = """You are XIAOICE, a friendly and helpful AI assistant who loves chatting with users.

Your abilities:
- When users upload PDFs, you can ask pdf_agent to analyze them for you
- When users upload images or videos, you can ask media_agent to analyze them for you
- For regular text conversations, you handle them directly with your knowledge and personality

How you work:
- Be warm, friendly, and conversational - like talking to a friend
- When a user uploads a file (PDF, image, or video), quickly delegate to the appropriate specialist agent
- Take the analysis from your specialist agents and present it naturally in your own words
- Don't just repeat what the specialist says - add your own friendly commentary and insights
- Keep the conversation flowing and engaging

Language matching (CRITICAL):
- ALWAYS detect what language the user is using in their message
- ALWAYS respond in the SAME language the user used
- If the user writes in Chinese (Traditional or Simplified), respond in Chinese
- If the user writes in English, respond in English
- If the user writes in Japanese, respond in Japanese
- Match the user's language choice exactly - this is essential for a natural conversation
- When presenting specialist analysis results, translate them if needed to match the user's language

Remember: You're the face of XIAOICE. Users talk to YOU, not the specialists. Make every interaction feel personal and helpful."""

# PDF analysis agent instruction
PDF_AGENT_INSTRUCTION = """You are a PDF analysis specialist working behind the scenes for XIAOICE.

Your job:
- Carefully read and analyze PDF documents
- Extract the main ideas, important information, and key details
- Understand content in multiple languages (especially Chinese, English, Japanese)
- Provide a clear, natural summary of what you found

How to respond:
- Write in a clear, natural way - like explaining to a colleague
- Start with the main point or summary of the document
- Then mention the important details, data, or conclusions you found
- Don't use formal section headers like "Summary:" or "Key Points:" - just flow naturally
- Be thorough but concise - focus on what's actually useful
- If you can't analyze the PDF, explain why simply and clearly

Language handling:
- Analyze the PDF content in whatever language it's written
- Respond in the same language as the user's question/request
- If the PDF is in one language but the user asks in another, provide your analysis in the user's language
- Preserve important terms, names, and technical vocabulary in their original language when appropriate

Remember: Your analysis goes to the coordinator, who will present it to the user conversationally."""

# Media analysis agent instruction
MEDIA_AGENT_INSTRUCTION = """You are a media analysis specialist working behind the scenes for XIAOICE.

Your job:
- Carefully examine images and videos
- Identify what you see: objects, people, scenes, actions, emotions, and context
- Notice visual details like colors, composition, lighting, and atmosphere
- For videos: describe movements, sequences, and how things change over time
- Read any text visible in the images (OCR) - recognize text in multiple languages

How to respond:
- Describe what you see in a natural, flowing way - like telling someone about a photo
- Start with the most important or striking elements
- Then add relevant details and observations
- Don't use formal headers like "Visual Overview:" or "Key Elements:" - just describe naturally
- Be descriptive and thorough, but conversational
- If there's text in the image, mention it naturally: "I can see text that says..."
- If you can't analyze the media, explain why simply and clearly

Language handling:
- Analyze visual content regardless of what language appears in it
- Respond in the same language as the user's question/request
- If you see text in the image (Chinese, English, Japanese, etc.), report it in its original language
- Then provide your description in the user's language
- For example: if user asks in Chinese about an English sign, describe it in Chinese but quote the English text

Remember: Your description goes to the coordinator, who will present it to the user in a friendly way."""

# Supported MIME types for file uploads
SUPPORTED_MIME_TYPES = [
    # PDF documents
    'application/pdf',
    # Images
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    # Videos
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
    
    # App name constant for ADK Runner (must match agent package structure)
    APP_NAME = "agents"
    
    def __init__(self):
        self._agents: Dict[str, Agent] = {}
        self._session_service = InMemorySessionService()
        self._runners: Dict[str, Runner] = {}
        self._api_keys: Dict[str, str] = {}  # Cache API keys per user to avoid global env pollution
        self._created_sessions: set = set()  # Track created sessions
    
    def _create_agent(self, api_key: str, model_name: str = "gemini-2.5-flash") -> Agent:
        """
        Create a new ADK Agent with the specified configuration.
        This creates a multi-agent system with:
        - A coordinator agent that manages conversations and interacts with users
        - A PDF agent for analyzing PDF documents
        - A media agent for analyzing images and videos
        
        Args:
            api_key: Google AI API key
            model_name: The Gemini model to use
            
        Returns:
            Configured Agent instance (coordinator with sub-agents)
        """
        # Store API key for later use (avoid setting in os.environ for thread safety)
        os.environ['GOOGLE_API_KEY'] = api_key
        
        # Configure generation settings
        generation_config = types.GenerateContentConfig(
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
        )
        
        # Create the PDF analysis agent (analyzes PDFs, returns results to coordinator)
        pdf_agent = Agent(
            name="pdf_agent",
            model=model_name,
            description="Specialist for analyzing PDF documents and returning structured analysis results to the coordinator",
            instruction=PDF_AGENT_INSTRUCTION,
            generate_content_config=generation_config,
        )
        
        # Create the media analysis agent (analyzes images/videos, returns results to coordinator)
        media_agent = Agent(
            name="media_agent",
            model=model_name,
            description="Specialist for analyzing images and videos and returning structured analysis results to the coordinator",
            instruction=MEDIA_AGENT_INSTRUCTION,
            generate_content_config=generation_config,
        )
        
        # Create the coordinator agent (routes tasks, receives results, interacts with users)
        coordinator_agent = Agent(
            name="xiaoice_coordinator",
            model=model_name,
            description="XIAOICE coordinator that manages conversations, delegates analysis tasks, receives results from specialists, and interacts directly with users",
            instruction=COORDINATOR_AGENT_INSTRUCTION,
            generate_content_config=generation_config,
            sub_agents=[pdf_agent, media_agent],  # Register sub-agents
        )
        
        return coordinator_agent
    
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
            # Create the session using async method in sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(
                    self._session_service.create_session(
                        app_name=self.APP_NAME,
                        user_id=user_id,
                        session_id=session_id,
                        state={}
                    )
                )
                self._created_sessions.add(session_key)
                logger.info(f"Created new session: {session_id} for user: {user_id}")
            finally:
                loop.close()
    
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
        
        # Try to delete from session service using async method
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(
                    self._session_service.delete_session(
                        app_name=self.APP_NAME,
                        user_id=user_id,
                        session_id=session_id
                    )
                )
                logger.info(f"Deleted session: {session_id} for user: {user_id}")
            finally:
                loop.close()
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
                f"Supported formats: PDF documents, Images (JPEG, PNG, WebP, HEIC, HEIF), and "
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
        file_data = gcp_bucket.download_file_from_gcs(image_path)
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
    history: Optional[List[Dict[str, Any]]] = None,
    username: Optional[str] = None
) -> str:
    """
    Build the message content string with optional history context.
    
    This function creates context for the multi-agent system, helping the
    coordinator understand what type of request it is handling and route to
    the appropriate specialist agent (PDF or media).
    
    Args:
        message: The user's message
        image_path: Optional path to a file in GCS (PDF, image, or video)
        image_mime_type: MIME type of the file
        history: Optional conversation history
        username: Optional username for personalization
        
    Returns:
        Formatted message string with context
    """
    content_parts = []
    
    # Add user info for personalization
    if username:
        content_parts.append(f"[User's name is: {username}]")
    
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
    
    # Add file type information to help coordinator route correctly
    # Note: The actual file will be passed as a separate Part in the content
    if image_path and image_mime_type:
        if image_mime_type == 'application/pdf':
            content_parts.append("\n[Note: This request includes a PDF document for analysis]")
        elif image_mime_type.startswith('image/'):
            content_parts.append("\n[Note: This request includes an image for analysis]")
        elif image_mime_type.startswith('video/'):
            content_parts.append("\n[Note: This request includes a video for analysis]")
    
    return "\n".join(content_parts) if content_parts else ""


async def generate_streaming_response_async(
    message: str,
    image_path: Optional[str] = None,
    image_mime_type: Optional[str] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None,
    user_id: str = "default",
    conversation_id: Optional[int] = None,
    username: Optional[str] = None
) -> AsyncIterator[str]:
    """
    Generates a streaming response from the multi-agent ADK system asynchronously.
    
    This function uses a multi-agent architecture:
    - Coordinator agent manages conversations and interacts directly with users
    - PDF agent analyzes PDF documents and returns results to coordinator
    - Media agent analyzes images/videos and returns results to coordinator
    
    The coordinator delegates analysis tasks to specialists, receives their structured
    results, and presents the information conversationally to the user.
    
    Args:
        message: The user's message
        image_path: Optional GCS path to a PDF, image, or video
        image_mime_type: MIME type of the file (PDF, image, or video)
        history: Optional conversation history
        api_key: Google AI API key
        model_name: The Gemini model to use for all agents
        user_id: User identifier for session management
        conversation_id: Database conversation ID for persistent sessions
        username: User's display name for personalization
        
    Yields:
        Text chunks as they are generated by the coordinator agent
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
    
    # Build text content with history context and username
    text_content = build_message_content(message, image_path, image_mime_type, history, username)
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
        has_yielded = False
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=user_content
        ):
            # Handle different event types from ADK
            if hasattr(event, 'content') and event.content:
                if hasattr(event.content, 'parts') and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, 'text') and part.text:
                            has_yielded = True
                            yield part.text
            elif hasattr(event, 'text') and getattr(event, 'text', None):
                has_yielded = True
                yield getattr(event, 'text')
        
        # Ensure we always yield something
        if not has_yielded:
            yield "I apologize, but I couldn't generate a response. Please try again."
                    
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
    conversation_id: Optional[int] = None,
    username: Optional[str] = None
) -> Generator[str, None, None]:
    """
    Synchronous wrapper for multi-agent streaming response generation.
    
    This function wraps the async multi-agent generator to provide a synchronous 
    interface for Flask routes. The multi-agent system includes:
    - Coordinator agent that manages conversations and interacts with users
    - PDF agent for analyzing PDF documents (returns results to coordinator)
    - Media agent for analyzing images/videos (returns results to coordinator)
    
    Args:
        message: The user's message
        image_path: Optional GCS path to a PDF, image, or video
        image_mime_type: MIME type of the file (PDF, image, or video)
        history: Optional conversation history
        api_key: Google AI API key
        model_name: The Gemini model to use for all agents
        user_id: User identifier for session management
        conversation_id: Database conversation ID for persistent sessions
        username: User's display name for personalization
        
    Yields:
        Text chunks as they are generated by the coordinator agent
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
    
    # Build text content with history context and username
    text_content = build_message_content(message, None, None, history, username)
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
        
        # For synchronous usage with streaming, we need to use a thread-safe approach
        # that yields chunks as they arrive rather than collecting them all first
        import queue
        import threading
        
        # Create a queue to pass chunks from async to sync context
        chunk_queue = queue.Queue()
        exception_holder = [None]  # Use list to allow modification in nested function
        
        def run_in_thread():
            """Run the async generator in a separate thread with its own event loop."""
            try:
                # Create a new event loop for this thread
                thread_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(thread_loop)
                
                async def stream_chunks():
                    """Async function to stream chunks into the queue."""
                    try:
                        has_content = False
                        async for event in runner.run_async(
                            user_id=user_id,
                            session_id=session_id,
                            new_message=user_content
                        ):
                            # Handle different event types from ADK
                            if hasattr(event, 'content') and event.content:
                                if hasattr(event.content, 'parts') and event.content.parts:
                                    for part in event.content.parts:
                                        if hasattr(part, 'text') and part.text:
                                            chunk_queue.put(part.text)
                                            has_content = True
                            elif hasattr(event, 'text') and getattr(event, 'text', None):
                                chunk_queue.put(getattr(event, 'text'))
                                has_content = True
                        
                        if not has_content:
                            chunk_queue.put("I apologize, but I couldn't generate a response. Please try again.")
                    except Exception as e:
                        exception_holder[0] = e
                    finally:
                        # Signal completion
                        chunk_queue.put(None)
                
                # Run the async streaming function
                thread_loop.run_until_complete(stream_chunks())
                thread_loop.close()
                
            except Exception as e:
                exception_holder[0] = e
                chunk_queue.put(None)
        
        # Start the async processing in a separate thread
        thread = threading.Thread(target=run_in_thread, daemon=True)
        thread.start()
        
        # Yield chunks as they arrive from the queue
        while True:
            chunk = chunk_queue.get()
            
            # Check if we're done (None signals completion)
            if chunk is None:
                break
            
            # Check for exceptions
            if exception_holder[0]:
                raise exception_holder[0]
            
            yield chunk
        
        # Wait for thread to complete
        thread.join(timeout=1.0)
        
        # Check for any exceptions that occurred
        if exception_holder[0]:
            raise exception_holder[0]
                
    except Exception as e:
        logger.error(f"Error generating streaming response: {e}")
        traceback.print_exc()
        yield _format_error_message(e)


# Export the agent manager for external access if needed
def get_agent_manager() -> ChatAgentManager:
    """Get the global agent manager instance."""
    return _agent_manager
