import google.generativeai as genai
from flask import current_app
import os

def init_gemini():
    """Initializes the Google Generative AI client."""
    api_key = current_app.config['GOOGLE_API_KEY']
    if not api_key:
        raise ValueError("GOOGLE_API_KEY is not set in environment variables")
    genai.configure(api_key=api_key)

def generate_response(message, image_path=None, image_mime_type=None):
    """
    Generates a response from the Gemini model.
    Can handle both text and image inputs.
    """
    init_gemini()
    
    model_name = current_app.config['GEMINI_MODEL']
    model = genai.GenerativeModel(model_name)

    parts = []
    if image_path and image_mime_type:
        try:
            # Read the local image file and convert to bytes
            with open(image_path, 'rb') as f:
                image_data = f.read()
            
            # Upload the image using Google AI
            uploaded_file = genai.upload_file(image_path)
            parts.append(uploaded_file)
            
        except FileNotFoundError:
            current_app.logger.error(f"Image file not found: {image_path}")
            return "Error: Could not read the uploaded image file."
        except Exception as e:
            current_app.logger.error(f"Error reading image file: {e}")
            return "Error: Failed to process the image."

    if message:
        parts.append(message)

    if not parts:
        return "Please provide a message or an image."

    generation_config = {
        "max_output_tokens": 8192,
        "temperature": 1,
        "top_p": 0.95,
    }

    safety_settings = {
        genai.types.HarmCategory.HARM_CATEGORY_HATE_SPEECH: genai.types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        genai.types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: genai.types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        genai.types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: genai.types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        genai.types.HarmCategory.HARM_CATEGORY_HARASSMENT: genai.types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    }

    try:
        response = model.generate_content(
            parts,
            generation_config=generation_config,
            safety_settings=safety_settings,
        )
        
        if response.text:
            return response.text
        else:
            # Handle cases where the response might be blocked or empty
            return "I'm sorry, I couldn't generate a response. This might be due to safety settings or other issues."
    except Exception as e:
        current_app.logger.error(f"Error generating response: {e}")
        return f"Error: Failed to generate response. {str(e)}"

