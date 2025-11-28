"""
ADK Agent module for XIAOICE chatbot.
This module provides a chat agent using Google Agent Development Kit (ADK)
to replace direct genai SDK usage.
"""
import os
import traceback
import asyncio
from typing import AsyncIterator, Optional, List, Dict, Any

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app import gcs_upload


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


class ChatAgentManager:
    """
    Manages ADK chat agents for user sessions.
    Each user can have their own agent instance with their API key and model preferences.
    """
    
    def __init__(self):
        self._agents: Dict[str, Agent] = {}
        self._session_service = InMemorySessionService()
        self._runners: Dict[str, Runner] = {}
    
    def _create_agent(self, api_key: str, model_name: str = "gemini-2.5-flash") -> Agent:
        """
        Create a new ADK Agent with the specified configuration.
        
        Args:
            api_key: Google AI API key
            model_name: The Gemini model to use
            
        Returns:
            Configured Agent instance
        """
        # Set the API key in environment for the agent
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
                app_name="xiaoice_chat",
                session_service=self._session_service
            )
        
        return self._runners[runner_key]
    
    def clear_user_agents(self, user_id: str):
        """Clear all agents for a specific user."""
        keys_to_remove = [key for key in self._agents.keys() if key.startswith(f"{user_id}_")]
        for key in keys_to_remove:
            del self._agents[key]
        
        runner_keys_to_remove = [key for key in self._runners.keys() if key.startswith(f"{user_id}_")]
        for key in runner_keys_to_remove:
            del self._runners[key]


# Global agent manager instance
_agent_manager = ChatAgentManager()


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
    user_id: str = "default"
) -> AsyncIterator[str]:
    """
    Generates a streaming response from the ADK agent asynchronously.
    
    Args:
        message: The user's message
        image_path: Optional GCS path to an image
        image_mime_type: MIME type of the image
        history: Optional conversation history
        api_key: Google AI API key
        model_name: The Gemini model to use
        user_id: User identifier for session management
        
    Yields:
        Text chunks as they are generated
    """
    if api_key is None:
        api_key = os.environ.get('GOOGLE_API_KEY')
    
    if not api_key:
        yield "Error: API key is required but not provided. Please set your API key in the settings."
        return
    
    if model_name is None:
        model_name = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
    
    # For file/image handling, we still need to use the genai types for Parts
    # ADK uses genai under the hood, so we can construct multimodal content
    from google import genai
    
    contents = []
    
    # Build text content with history context
    text_content = build_message_content(message, image_path, image_mime_type, history)
    if text_content:
        contents.append(text_content)
    
    # Handle image/video uploads
    if image_path and image_mime_type:
        print(f"Processing file: path={image_path}, mime_type={image_mime_type}")
        
        supported_mime_types = [
            'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
            'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 
            'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'
        ]
        
        if image_mime_type not in supported_mime_types:
            yield f"Error: Unsupported file format '{image_mime_type}'. Supported formats: Images (JPEG, PNG, WebP, HEIC, HEIF) and Videos (MP4, MPEG, MOV, AVI, FLV, MPG, WEBM, WMV, 3GPP)."
            return
        
        try:
            file_data = gcs_upload.download_file_from_gcs(image_path)
            print(f"Downloaded file: size={len(file_data)} bytes")
            
            max_size = 500 * 1024 * 1024  # 500MB
            if len(file_data) > max_size:
                yield f"Error: File is too large ({len(file_data)} bytes). Maximum size is 500MB."
                return
            
            # Create a part from bytes for multimodal content
            file_part = types.Part.from_bytes(data=file_data, mime_type=image_mime_type)
            contents.append(file_part)
            print("File part added to contents")
            
        except Exception as e:
            print(f"Error downloading file from GCS: {e}")
            traceback.print_exc()
            yield f"Error: Failed to download file from storage: {str(e)}"
            return
    
    if not contents:
        yield "Please provide a message or an image."
        return
    
    try:
        # Set the API key in environment
        os.environ['GOOGLE_API_KEY'] = api_key
        
        # Use the Runner for streaming responses
        runner = _agent_manager.get_or_create_runner(user_id, api_key, model_name)
        
        # Create a session for this conversation
        session_id = f"session_{user_id}_{id(contents)}"
        
        # For multimodal content, we need to handle it differently
        # ADK's run_async expects text input, so for files we use direct genai
        if len(contents) > 1 or (contents and not isinstance(contents[0], str)):
            # Use direct genai client for multimodal content
            client = genai.Client(api_key=api_key)
            
            generation_config = types.GenerateContentConfig(
                max_output_tokens=8192,
                temperature=1,
                top_p=0.95,
            )
            
            response_stream = client.models.generate_content_stream(
                model=model_name,
                contents=contents,
                config=generation_config,
            )
            
            for chunk in response_stream:
                if chunk.candidates and chunk.candidates[0].content.parts:
                    text_chunk = chunk.candidates[0].content.parts[0].text
                    yield text_chunk
        else:
            # For text-only messages, use ADK Runner with streaming
            # The ADK agent provides a more structured response with potential tool usage
            async for event in runner.run_async(
                user_id=user_id,
                session_id=session_id,
                new_message=types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=contents[0] if contents else message)]
                )
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
        print(f"Error generating streaming response: {e}")
        traceback.print_exc()
        
        error_str = str(e).lower()
        if "user location is not supported" in error_str or "failed_precondition" in error_str:
            yield ("I'm sorry, but the Google AI service is currently not available in your location. "
                   "This is a regional restriction imposed by Google. "
                   "Please try using a VPN service to connect from a supported region (like the US), "
                   "or consider using a different AI service.")
        elif "api key" in error_str and ("invalid" in error_str or "unauthorized" in error_str):
            yield ("API key error: Please check that your Google AI API key is valid and has the necessary permissions. "
                   "You can verify your API key in the settings page.")
        elif "quota" in error_str or "rate limit" in error_str:
            yield ("API quota exceeded: You've reached the usage limit for your Google AI API key. "
                   "Please wait a few minutes before trying again, or check your API usage limits.")
        else:
            yield f"Error: Failed to generate response. {str(e)}"


def generate_streaming_response(
    message: str,
    image_path: Optional[str] = None,
    image_mime_type: Optional[str] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None,
    user_id: str = "default"
):
    """
    Synchronous wrapper for streaming response generation.
    
    This function wraps the async generator to provide a synchronous interface
    for Flask routes that don't use async.
    
    Args:
        message: The user's message
        image_path: Optional GCS path to an image
        image_mime_type: MIME type of the image
        history: Optional conversation history
        api_key: Google AI API key
        model_name: The Gemini model to use
        user_id: User identifier for session management
        
    Yields:
        Text chunks as they are generated
    """
    # Create a new event loop for the async generator
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    async def collect_chunks():
        chunks = []
        async for chunk in generate_streaming_response_async(
            message=message,
            image_path=image_path,
            image_mime_type=image_mime_type,
            history=history,
            api_key=api_key,
            model_name=model_name,
            user_id=user_id
        ):
            chunks.append(chunk)
        return chunks
    
    # For synchronous usage, we need to handle it differently
    # Use the direct genai approach for compatibility with Flask's synchronous nature
    if api_key is None:
        api_key = os.environ.get('GOOGLE_API_KEY')
    
    if not api_key:
        yield "Error: API key is required but not provided. Please set your API key in the settings."
        return
    
    if model_name is None:
        model_name = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
    
    from google import genai
    
    # Set the API key
    os.environ['GOOGLE_API_KEY'] = api_key
    
    contents = []
    
    # Build text content with history context
    text_content = build_message_content(message, None, None, history)
    if text_content:
        contents.append(text_content)
    elif message:
        contents.append(message)
    
    # Handle image/video uploads
    if image_path and image_mime_type:
        print(f"Processing file: path={image_path}, mime_type={image_mime_type}")
        
        supported_mime_types = [
            'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
            'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 
            'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'
        ]
        
        if image_mime_type not in supported_mime_types:
            yield f"Error: Unsupported file format '{image_mime_type}'. Supported formats: Images (JPEG, PNG, WebP, HEIC, HEIF) and Videos (MP4, MPEG, MOV, AVI, FLV, MPG, WEBM, WMV, 3GPP)."
            return
        
        try:
            file_data = gcs_upload.download_file_from_gcs(image_path)
            print(f"Downloaded file: size={len(file_data)} bytes")
            
            max_size = 500 * 1024 * 1024  # 500MB
            if len(file_data) > max_size:
                yield f"Error: File is too large ({len(file_data)} bytes). Maximum size is 500MB."
                return
            
            file_part = types.Part.from_bytes(data=file_data, mime_type=image_mime_type)
            contents.append(file_part)
            print("File part added to contents")
            
        except Exception as e:
            print(f"Error downloading file from GCS: {e}")
            traceback.print_exc()
            yield f"Error: Failed to download file from storage: {str(e)}"
            return
    
    if not contents:
        yield "Please provide a message or an image."
        return
    
    try:
        client = genai.Client(api_key=api_key)
        
        generation_config = types.GenerateContentConfig(
            max_output_tokens=8192,
            temperature=1,
            top_p=0.95,
        )
        
        response_stream = client.models.generate_content_stream(
            model=model_name,
            contents=contents,
            config=generation_config,
        )
        
        for chunk in response_stream:
            if chunk.candidates and chunk.candidates[0].content.parts:
                text_chunk = chunk.candidates[0].content.parts[0].text
                yield text_chunk
                
    except Exception as e:
        print(f"Error generating streaming response: {e}")
        traceback.print_exc()
        
        error_str = str(e).lower()
        if "user location is not supported" in error_str or "failed_precondition" in error_str:
            yield ("I'm sorry, but the Google AI service is currently not available in your location. "
                   "This is a regional restriction imposed by Google. "
                   "Please try using a VPN service to connect from a supported region (like the US), "
                   "or consider using a different AI service.")
        elif "api key" in error_str and ("invalid" in error_str or "unauthorized" in error_str):
            yield ("API key error: Please check that your Google AI API key is valid and has the necessary permissions. "
                   "You can verify your API key in the settings page.")
        elif "quota" in error_str or "rate limit" in error_str:
            yield ("API quota exceeded: You've reached the usage limit for your Google AI API key. "
                   "Please wait a few minutes before trying again, or check your API usage limits.")
        else:
            yield f"Error: Failed to generate response. {str(e)}"


# Export the agent manager for external access if needed
def get_agent_manager() -> ChatAgentManager:
    """Get the global agent manager instance."""
    return _agent_manager
