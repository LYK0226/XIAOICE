from google import genai
from flask import current_app
import os
import logging
from app.adk import get_current_time, read_pdf, get_pdf_info

# Get logger for this module
logger = logging.getLogger(__name__)

def init_gemini(api_key=None):
    """Initializes the Google Generative AI client."""
    if api_key is None:
        # Fallback to config for backward compatibility
        try:
            api_key = current_app.config.get('GOOGLE_API_KEY')
        except RuntimeError:
            # If we're outside app context, api_key must be provided
            pass

    if not api_key:
        raise ValueError("API key is required but not provided")
    return genai.Client(api_key=api_key)

def generate_streaming_response(message, image_path=None, image_mime_type=None, pdf_path=None, history=None, api_key=None, model_name=None):
    """
    Generates a streaming response from the Gemini model.
    Yields chunks of text as they are generated.
    
    Args:
        message: User's text message
        image_path: Path to image file (optional)
        image_mime_type: MIME type of image (optional)
        pdf_path: Path to PDF file (optional)
        history: Conversation history (optional)
        api_key: Google AI API key
        model_name: Model name to use
    """
    # Get model_name from config if not provided (before entering generator context)
    if model_name is None:
        try:
            model_name = current_app.config.get('GEMINI_MODEL', 'gemini-2.5-flash')
        except RuntimeError:
            # If we're outside app context, use default
            model_name = 'gemini-2.5-flash'
    
    client = init_gemini(api_key)

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
            logger.warning(f"Failed to process history for context: {e}")

    if message:
        # Add current time context to the message
        current_time = get_current_time()
        system_context = f"[系统信息: 当前时间是 {current_time}]\n\n"
        
        # Check if there's a PDF to process
        pdf_content = ""
        if pdf_path:
            logger.info(f"Processing PDF file: {pdf_path}")
            pdf_result = read_pdf(pdf_path, max_pages=50)  # Limit to 50 pages
            
            if pdf_result['success']:
                logger.info(f"PDF read successfully: {pdf_result['pages_read']} pages")
                pdf_content = f"\n\n[PDF文件内容 - {pdf_result['file_path']}]\n"
                pdf_content += f"共 {pdf_result['num_pages']} 页，已读取 {pdf_result['pages_read']} 页\n"
                pdf_content += "=" * 50 + "\n"
                pdf_content += pdf_result['text']
                pdf_content += "\n" + "=" * 50 + "\n\n"
            else:
                logger.error(f"PDF read failed: {pdf_result.get('error')}")
                pdf_content = f"\n\n[PDF读取失败: {pdf_result.get('error')}]\n\n"
        
        contents.append(system_context + pdf_content + message)
    
    if image_path and image_mime_type:
        try:
            # Read the local image file and convert to bytes
            with open(image_path, 'rb') as f:
                image_data = f.read()
            
            # Create a part from bytes
            image_part = genai.types.Part.from_bytes(data=image_data, mime_type=image_mime_type)
            contents.append(image_part)
            
        except FileNotFoundError:
            logger.error(f"Image file not found: {image_path}")
            yield "Error: Could not read the uploaded image file."
            return
        except Exception as e:
            logger.error(f"Error reading image file: {e}")
            yield "Error: Failed to process the image."
            return

    if not contents:
        yield "Please provide a message or an image."
        return

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
        # Use streaming response
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
        logger.error(f"Error generating streaming response: {e}")

        # Handle specific Google API errors with user-friendly messages
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

