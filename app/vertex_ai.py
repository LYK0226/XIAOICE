from google import genai
import os
import traceback
from . import gcs_upload

def init_gemini(api_key=None):
    """Initializes the Google Generative AI client without depending on Flask app context.

    The API key can be passed explicitly; if not provided, the function checks
    the `GOOGLE_API_KEY` environment variable.
    """
    if api_key is None:
        api_key = os.environ.get('GOOGLE_API_KEY')

    if not api_key:
        raise ValueError("API key is required but not provided")
    return genai.Client(api_key=api_key)

def generate_streaming_response(message, image_path=None, image_mime_type=None, history=None, api_key=None, model_name=None):
    """
    Generates a streaming response from the Gemini model.
    Yields chunks of text as they are generated.
    """
    client = init_gemini(api_key)
    
    # Use provided model_name or fall back to environment variable default
    if model_name is None:
        model_name = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')

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
            print(f"Failed to process history for context: {e}")

    if message:
        contents.append(message)
    
    if image_path and image_mime_type:
        print(f"Processing image: path={image_path}, mime_type={image_mime_type}")
        # Check if the image format is supported
        supported_mime_types = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
        if image_mime_type not in supported_mime_types:
            print(f"Unsupported image format: {image_mime_type}")
            yield f"Error: Unsupported image format '{image_mime_type}'. Supported formats: JPEG, PNG, WebP, HEIC, HEIF."
            return
        
        try:
            # Download the image from GCS
            image_data = gcs_upload.download_file_from_gcs(image_path)
            print(f"Downloaded image: size={len(image_data)} bytes")
            
            # Check image size (4MB limit for Gemini)
            max_size = 4 * 1024 * 1024  # 4MB
            if len(image_data) > max_size:
                print(f"Image too large: {len(image_data)} bytes")
                yield f"Error: Image is too large ({len(image_data)} bytes). Maximum size is 4MB."
                return
            
            # Create a part from bytes
            image_part = genai.types.Part.from_bytes(data=image_data, mime_type=image_mime_type)
            contents.append(image_part)
            print("Image part added to contents")
            
        except Exception as e:
            print(f"Error downloading image from GCS: {e}")
            traceback.print_exc()
            yield f"Error: Failed to download image from storage: {str(e)}"
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
        print(f"Error generating streaming response: {e}")
        traceback.print_exc()

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

