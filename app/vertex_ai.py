import vertexai
from vertexai.generative_models import GenerativeModel, Part, FinishReason
import vertexai.preview.generative_models as generative_models
from flask import current_app

def init_vertex_ai():
    """Initializes the Vertex AI client."""
    project_id = current_app.config['GCP_PROJECT_ID']
    location = current_app.config['GCP_LOCATION']
    vertexai.init(project=project_id, location=location)

def generate_response(message, image_path=None, image_mime_type=None):
    """
    Generates a response from the Vertex AI model.
    Can handle both text and image inputs.
    """
    init_vertex_ai()
    
    model_name = current_app.config['VERTEX_AI_MODEL']
    model = GenerativeModel(model_name)

    parts = []
    if image_path and image_mime_type:
        image_part = Part.from_uri(
            mime_type=image_mime_type,
            uri=image_path
        )
        parts.append(image_part)

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
        generative_models.HarmCategory.HARM_CATEGORY_HATE_SPEECH: generative_models.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        generative_models.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: generative_models.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        generative_models.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: generative_models.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        generative_models.HarmCategory.HARM_CATEGORY_HARASSMENT: generative_models.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    }

    responses = model.generate_content(
        parts,
        generation_config=generation_config,
        safety_settings=safety_settings,
        stream=False,
    )

    if responses.candidates and responses.candidates[0].content.parts:
        return responses.candidates[0].content.parts[0].text
    else:
        # Handle cases where the response might be blocked or empty
        return "I'm sorry, I couldn't generate a response. This might be due to safety settings or other issues."

