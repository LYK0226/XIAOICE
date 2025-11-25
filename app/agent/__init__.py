"""
Vertex AI / Gemini integration module.
This module provides backward compatibility by wrapping the ADK agent module.
The actual AI logic is now handled by the ADK-based chat agent.
"""
import os

# Import from the new ADK agent module
from .chat_agent import (
    generate_streaming_response,
    generate_streaming_response_async,
    get_agent_manager,
    ChatAgentManager
)


def init_gemini(api_key=None):
    """
    Legacy function for backward compatibility.
    Now simply sets the API key in the environment.
    
    The API key can be passed explicitly; if not provided, the function checks
    the `GOOGLE_API_KEY` environment variable.
    """
    if api_key is None:
        api_key = os.environ.get('GOOGLE_API_KEY')

    if not api_key:
        raise ValueError("API key is required but not provided")
    
    os.environ['GOOGLE_API_KEY'] = api_key
    return api_key


# The generate_streaming_response function is now imported from chat_agent
# This maintains backward compatibility with existing code that imports from agent module

