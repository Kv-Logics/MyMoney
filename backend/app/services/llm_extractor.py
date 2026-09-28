import os
import json
import logging
from datetime import datetime
import google.generativeai as genai

# Setup logger
logger = logging.getLogger(__name__)

def init_gemini(custom_key: str = None):
    api_key = custom_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not found in environment variables or user settings.")
        return False
    genai.configure(api_key=api_key)
    return True

async def call_gemini_vision(image_bytes: bytes, prompt: str, custom_key: str = None) -> dict:
    """
    Takes an image as bytes and a prompt, sends them to Gemini 1.5 Flash,
    and returns the parsed JSON dictionary.
    """
    if not init_gemini(custom_key):
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

async def process_voice_narration(
    narration: str,
    existing_drafts: list = None,
    categories: list = None,
    payment_methods: list = None,
    currency: str = "₹",
    custom_gemini_key: str = None
) -> dict:
    """
    Processes natural spoken voice narration or text chat messages from user.
    Extracts multi-item expense details, maps categories and payment methods,
    and returns a structured JSON payload with agent response.
    """
    if existing_drafts is None:
        existing_drafts = []
    if categories is None or not categories:
        categories = ["Food", "Grocery", "Fuel", "Shopping", "Entertainment", "Transport", "Rent", "Medical", "Utilities", "Travel", "Other"]
    if payment_methods is None or not payment_methods:
        payment_methods = ["Cash", "UPI", "Credit Card", "Debit Card", "Bank Transfer", "Wallet"]

    today_str = datetime.now().strftime("%Y-%m-%d")

    # Try Gemini API if key is available in env or passed explicitly
    api_key = custom_gemini_key or os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = f"""
You are an intelligent, friendly AI Voice Expense Agent for the MyMoney personal finance app.
Today's Date: {today_str}
Default Currency: {currency}

Available Categories: {json.dumps(categories)}
Available Payment Methods: {json.dumps(payment_methods)}

Current Existing Expense Drafts (if user is correcting or editing):
{json.dumps(existing_drafts)}

User Narration / Spoken Input:
"{narration}"

INSTRUCTIONS:
1. Analyze the spoken narration carefully. The user may be stating multiple new expenses (e.g. "I spent 400 on lunch using UPI and 50 for auto cash"), OR correcting existing draft expenses.
2. Extract all distinct expense items with title, amount (float), category, payment_method, date (YYYY-MM-DD), time (HH:MM or empty), location (store/place name or empty), and description.
3. Map category to the best match from Available Categories.
4. Map payment_method to the best match from Available Payment Methods.
5. Generate a helpful, concise, conversational reply_message in friendly natural language summarizing what was detected or modified.
6. Return ONLY valid raw JSON with this exact structure:
{{
  "reply_message": "Friendly response string explaining extracted/modified expenses",
  "extracted_expenses": [
    {{
      "title": "Item or Vendor Name",
      "amount": 100.0,
      "category": "Food",
      "payment_method": "UPI",
      "date": "YYYY-MM-DD",
      "time": "",
      "location": "",
      "description": ""
    }}
  ],
  "confidence": 0.95,
  "requires_clarification": false
}}
"""
            response = model.generate_content(prompt)
            text = response.text.strip()

            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].strip()

            result = json.loads(text)
            return result
        except Exception as e:
            logger.error(f"Gemini API error during voice extraction: {str(e)}")

    # Smart Rule-Based NLP Fallback if Gemini API is offline or unconfigured
    import re
    extracted = []
    
    # Split narration by clause conjunctions like 'and', 'then', commas, or periods
    sentences = re.split(r'[,.\n]|(?:\band\b|\bthen\b|\balso\b)', narration, flags=re.IGNORECASE)
    
    for clause in sentences:
        clause = clause.strip()
        if not clause:
            continue
            
        # Find amounts (numbers with optional currency symbols)
        amounts = re.findall(r'(?:rs\.?|₹|\$|eur|inr)?\s*(\d+(?:\.\d{1,2})?)', clause, re.IGNORECASE)
        if not amounts:
            continue
            
        amount_val = float(amounts[0])
        
        # Detect category
        matched_cat = "Other"
        clause_lower = clause.lower()
        if any(w in clause_lower for w in ["eat", "ate", "food", "lunch", "dinner", "breakfast", "restaurant", "hotel", "snack", "biryani", "coffee", "tea", "swiggy", "zomato"]):
            matched_cat = "Food" if "Food" in categories else categories[0]
        elif any(w in clause_lower for w in ["grocery", "supermarket", "mart", "vegetable", "milk", "biscuit", "reliance", "smart", "dmart"]):
            matched_cat = "Grocery" if "Grocery" in categories else categories[0]
        elif any(w in clause_lower for w in ["fuel", "petrol", "diesel", "gas", "bunk"]):
            matched_cat = "Fuel" if "Fuel" in categories else categories[0]
        elif any(w in clause_lower for w in ["auto", "cab", "uber", "ola", "bus", "train", "flight", "taxi", "travel", "ticket"]):
            matched_cat = "Transport" if "Transport" in categories else categories[0]
        elif any(w in clause_lower for w in ["shopping", "dress", "clothes", "shirt", "pant", "amazon", "flipkart"]):
            matched_cat = "Shopping" if "Shopping" in categories else categories[0]
            
        # Detect payment method
        matched_pm = "Cash"
        if any(w in clause_lower for w in ["upi", "gpay", "phonepe", "paytm", "scan", "online"]):
            matched_pm = "UPI" if "UPI" in payment_methods else payment_methods[0]
        elif any(w in clause_lower for w in ["card", "credit", "debit"]):
            matched_pm = "Credit Card" if "Credit Card" in payment_methods else payment_methods[0]
            
        # Extract title cleanly
        clean_title = re.sub(r'(?:rs\.?|₹|\$|eur|inr)?\s*\d+(?:\.\d{1,2})?', '', clause, flags=re.IGNORECASE).strip()
        clean_title = re.sub(r'^(?:i|spent|paid|for|ate|had|bought|bought at)\s+', '', clean_title, flags=re.IGNORECASE).strip()
        if not clean_title or len(clean_title) < 2:
            clean_title = f"{matched_cat} Expense"
        clean_title = clean_title.capitalize()

        extracted.append({
            "title": clean_title,
            "amount": amount_val,
            "category": matched_cat,
            "payment_method": matched_pm,
            "date": today_str,
            "time": "",
            "location": "",
            "description": f"Extracted from voice input: '{clause}'"
        })

    if not extracted and existing_drafts:
        extracted = existing_drafts

    reply = f"I've processed your narration and extracted {len(extracted)} expense item(s). Please review and confirm below!" if extracted else "I couldn't detect clear expense amounts in your narration. Could you try saying something like 'I spent 200 on lunch using UPI'?"

    return {
        "reply_message": reply,
        "extracted_expenses": extracted,
        "confidence": 0.88,
        "requires_clarification": len(extracted) == 0
    }

