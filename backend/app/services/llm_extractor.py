import os
import json
import logging
import google.generativeai as genai

# Setup logger
logger = logging.getLogger(__name__)

def init_gemini():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not found in environment variables.")
        return False
    genai.configure(api_key=api_key)
    return True

async def call_gemini_vision(image_bytes: bytes, prompt: str) -> dict:
    """
    Takes an image as bytes and a prompt, sends them to Gemini 1.5 Flash,
    and returns the parsed JSON dictionary.
    """
    if not init_gemini():
        raise Exception("Gemini API is not configured. Missing GEMINI_API_KEY.")

    # Use Gemini 1.5 Flash as it is fast and excellent for this use case
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    # Prepare the image parts for Gemini API
    image_parts = [
        {
            "mime_type": "image/jpeg",  # Assuming JPEG for simplicity, can handle PNG too
            "data": image_bytes
        }
    ]

    try:
        response = model.generate_content([prompt, image_parts[0]])
        text = response.text
        
        # Strip out markdown formatting if the model returns it (e.g., ```json ... ```)
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].strip()
            
        return json.loads(text)
    except Exception as e:
        logger.error(f"Failed to process image with Gemini: {str(e)}")
        raise Exception("Failed to extract data from image. Please try again.")
