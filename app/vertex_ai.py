from google import genai
from flask import current_app
import os

def init_gemini(api_key=None):
    """Initializes the Google Generative AI client."""
    if api_key is None:
        # Fallback to config for backward compatibility
        api_key = current_app.config.get('GOOGLE_API_KEY')

    if not api_key:
        raise ValueError("API key is required but not provided")
    return genai.Client(api_key=api_key)

def generate_response(message, image_path=None, image_mime_type=None, history=None, api_key=None):
    """
    Generates a response from the Gemini model.
    Can handle both text and image inputs.
    """
    client = init_gemini(api_key)
    
    model_name = current_app.config['GEMINI_MODEL']

    contents = []

    # If history provided, convert to a context string and prepend
    if history:
        try:
            # history can be a list of message objects
            convo_lines = ["Previous conversation:"]
            # Support two formats: list of {role, content} or list of {user, bot} pairs
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
                        convo_lines.append(f"Human: {item.get('user','')}")
                        convo_lines.append(f"AI: {item.get('bot','')}")
                    else:
                        # unknown item, stringify
                        convo_lines.append(str(item))
            else:
                convo_lines.append(str(history))

            context_text = "\n".join(convo_lines)
            contents.append(context_text)
        except Exception as e:
            current_app.logger.warning(f"Failed to process history for context: {e}")

    if message:
        contents.append(message)
    
    if image_path and image_mime_type:
        try:
            # Read the local image file and convert to bytes
            with open(image_path, 'rb') as f:
                image_data = f.read()
            
            # Create a part from bytes
            image_part = genai.types.Part.from_bytes(data=image_data, mime_type=image_mime_type)
            contents.append(image_part)
            
        except FileNotFoundError:
            current_app.logger.error(f"Image file not found: {image_path}")
            return "Error: Could not read the uploaded image file."
        except Exception as e:
            current_app.logger.error(f"Error reading image file: {e}")
            return "Error: Failed to process the image."

    if not contents:
        return "Please provide a message or an image."

    generation_config = genai.types.GenerateContentConfig(
        max_output_tokens=8192,
        temperature=1,
        top_p=0.95,
    )

    safety_settings = [
        genai.types.SafetySetting(
            category=genai.types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold=genai.types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        ),
        genai.types.SafetySetting(
            category=genai.types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold=genai.types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        ),
        genai.types.SafetySetting(
            category=genai.types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold=genai.types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        ),
        genai.types.SafetySetting(
            category=genai.types.HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold=genai.types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        ),
    ]

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=generation_config,
        )
        
        if response.candidates and response.candidates[0].content.parts:
            response_text = response.candidates[0].content.parts[0].text
            
            # Clean up common AI prefixes that might appear in responses
            response_text = response_text.strip()
            # Remove common prefixes that AI models might add
            prefixes_to_remove = ['Assistant:', 'AI:', 'Bot:', 'System:', 'Human:']
            for prefix in prefixes_to_remove:
                if response_text.startswith(prefix):
                    response_text = response_text[len(prefix):].strip()
                    break
            
            return response_text
        else:
            # Handle cases where the response might be blocked or empty
            return "I'm sorry, I couldn't generate a response. This might be due to safety settings or other issues."
    except Exception as e:
        current_app.logger.error(f"Error generating response: {e}")

        # Handle specific Google API errors with user-friendly messages
        error_str = str(e).lower()
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
            return f"Error: Failed to generate response. {str(e)}"

