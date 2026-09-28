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

    # Try modern vision models
    image_parts = [
        {
            "mime_type": "image/jpeg",
            "data": image_bytes
        }
    ]

    for model_name in ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash']:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content([prompt, image_parts[0]])
            text = response.text
            
            # Strip out markdown formatting if the model returns it (e.g., ```json ... ```)
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].strip()
                
            return json.loads(text)
        except Exception as e:
            logger.warning(f"Vision model {model_name} failed: {e}. Trying next.")
            
    logger.error("All Gemini vision models failed.")
    raise Exception("Failed to extract data from image. Please try again.")

async def process_voice_narration(
    narration: str,
    conversation_history: list = None,
    existing_drafts: list = None,
    categories: list = None,
    payment_methods: list = None,
    currency: str = "₹",
    custom_gemini_key: str = None
) -> dict:
    """
    Processes natural spoken voice narration or text chat messages from user.
    Extracts multi-item expense details, maps categories and payment methods,
    analyzes meal/day timeframes (morning, afternoon, evening, night),
    and returns a structured JSON payload with agent response.
    """
    # Clean and normalize categories and payment methods
    clean_cats = []
    for c in (categories or []):
        if isinstance(c, str) and c.strip():
            clean_cats.append(c.strip())
        elif isinstance(c, dict) and c.get("name"):
            clean_cats.append(c["name"].strip())
    categories = clean_cats if clean_cats else ["Food", "Grocery", "Fuel", "Shopping", "Entertainment", "Transport", "Rent", "Medical", "Utilities", "Travel", "Other"]

    clean_pms = []
    for p in (payment_methods or []):
        if isinstance(p, str) and p.strip():
            clean_pms.append(p.strip())
        elif isinstance(p, dict) and p.get("name"):
            clean_pms.append(p["name"].strip())
    payment_methods = clean_pms if clean_pms else ["Cash", "UPI", "Credit Card", "Debit Card", "Bank Transfer", "Wallet"]

    today_str = datetime.now().strftime("%Y-%m-%d")

    # Format previous conversation turns if provided
    formatted_chat = ""
    if conversation_history:
        formatted_chat = "Previous Conversation History (maintain context and memory):\n"
        for msg in conversation_history[-6:]:  # Keep recent context
            role = "User" if msg.get("role") == "user" else "Assistant"
            formatted_chat += f"{role}: {msg.get('content', '')}\n"

    # Try Gemini API if key is available in env or passed explicitly
    api_key = custom_gemini_key or os.environ.get("GEMINI_API_KEY")
    if api_key:
        for model_name in ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash']:
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel(model_name)
                
                prompt = f"""
You are an intelligent, friendly AI Voice Expense Agent for the MyMoney personal finance app.
Today's Date: {today_str}
Default Currency: {currency}

Available Categories: {json.dumps(categories)}
Available Payment Methods: {json.dumps(payment_methods)}

{formatted_chat}
Current Existing Expense Drafts:
{json.dumps(existing_drafts or [])}

Latest User Narration / Message:
"{narration}"

INSTRUCTIONS:
1. Analyze the spoken narration carefully in relation to the conversation history and existing drafts:
   - IF THE USER IS EDITING OR CORRECTING PREVIOUS DRAFTS (e.g. "Change amount to 800", "Actually it was 500", "Make payment method Cash", "Change category to Dinner", "Change store to DMart"):
     Apply those requested modifications directly to the corresponding item in Current Existing Expense Drafts and return the updated draft list.
   - IF THE USER EDITED OR REVISED THE PROMPT TEXT (e.g. changed "1000" to "800" or changed a store name):
     Parse the revised narration and return the accurate updated expense list.
   - IF THE USER IS ADDING NEW EXPENSES (e.g. "Also 50 for chai"):
     Keep the existing drafts and append the new expense item.
   - IF THE USER SAYS TO DELETE/REMOVE AN ITEM (e.g. "Remove the first item" or "Delete biryani"):
     Remove that item from the draft list.
2. TIMING & DURATION ANALYSIS (Extract time and context whenever stated):
   - If user mentions "in the morning" / "morning" / "breakfast" -> set "time": "09:00", description: "Morning breakfast/expense"
   - If user mentions "in the afternoon" / "afternoon" / "lunch" -> set "time": "13:00", description: "Afternoon lunch"
   - If user mentions "in the evening" / "evening" / "snacks" -> set "time": "17:30", description: "Evening snack"
   - If user mentions "at night" / "in the night" / "dinner" -> set "time": "20:30", description: "Night dinner"
   - If user mentions a specific time (e.g. "at 8 PM", "10:30 am") -> convert to 24-hr format (e.g. "20:00", "10:30")
   - If user mentions "yesterday" -> compute yesterday's date (YYYY-MM-DD)
3. Extract all distinct expense items with:
   - "title": Clean concise name of item/service (e.g. "Biryani", "Dosa")
   - "amount": float (e.g. 800.0)
   - "category": mapped to best match from Available Categories
   - "payment_method": mapped to best match from Available Payment Methods
   - "date": YYYY-MM-DD
   - "time": HH:MM or ""
   - "location": store/merchant/platform name or ""
   - "description": brief summary with any timeframe mentioned
4. Generate a friendly, conversational reply_message in natural language explaining what was extracted, updated, or corrected.
5. Return ONLY valid raw JSON with this exact structure:
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
                if isinstance(result, dict) and "extracted_expenses" in result:
                    return result
            except Exception as e:
                logger.warning(f"Model {model_name} failed: {e}. Trying next or fallback.")

    # Smart Rule-Based NLP Fallback if Gemini API is offline or unconfigured
    import re
    import copy
    working_drafts = [copy.deepcopy(d) for d in existing_drafts] if existing_drafts else []
    new_extracted = []
    
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
        clause_lower = clause.lower()

        # Check if user is asking to modify an existing draft
        if working_drafts and any(w in clause_lower for w in ["change", "make it", "actually", "correct", "update", "instead"]):
            working_drafts[-1]["amount"] = amount_val
            if any(w in clause_lower for w in ["cash", "upi", "card"]):
                if "upi" in clause_lower:
                    working_drafts[-1]["payment_method"] = "UPI"
                elif "cash" in clause_lower:
                    working_drafts[-1]["payment_method"] = "Cash"
            continue
        
        # Detect category
        matched_cat = "Other"
        if any(w in clause_lower for w in ["dosa", "idli", "vada", "biryani", "meals", "coffee", "tea", "roti", "paratha", "paneer", "pizza", "burger", "sandwich", "thali", "curry", "rice", "eat", "ate", "food", "lunch", "dinner", "breakfast", "restaurant", "hotel", "snack", "swiggy", "zomato"]):
            matched_cat = "Food" if "Food" in categories else categories[0]
        elif any(w in clause_lower for w in ["grocery", "supermarket", "mart", "vegetable", "milk", "biscuit", "reliance", "smart", "dmart", "provisions"]):
            matched_cat = "Grocery" if "Grocery" in categories else categories[0]
        elif any(w in clause_lower for w in ["fuel", "petrol", "diesel", "gas", "bunk"]):
            matched_cat = "Fuel" if "Fuel" in categories else categories[0]
        elif any(w in clause_lower for w in ["auto", "cab", "uber", "ola", "bus", "train", "flight", "taxi", "travel", "ticket"]):
            matched_cat = "Transport" if "Transport" in categories else categories[0]
        elif any(w in clause_lower for w in ["shopping", "dress", "clothes", "shirt", "pant", "amazon", "flipkart", "myntra"]):
            matched_cat = "Shopping" if "Shopping" in categories else categories[0]
            
        # Detect payment method
        matched_pm = "Cash"
        if any(w in clause_lower for w in ["upi", "gpay", "phonepe", "paytm", "scan", "online"]):
            matched_pm = "UPI" if "UPI" in payment_methods else payment_methods[0]
        elif any(w in clause_lower for w in ["card", "credit", "debit"]):
            matched_pm = "Credit Card" if "Credit Card" in payment_methods else payment_methods[0]
            
        # Detect time / meal duration
        matched_time = ""
        matched_desc = f"Extracted from voice input: '{clause}'"
        if any(w in clause_lower for w in ["in the morning", "this morning", "morning", "breakfast"]):
            matched_time = "09:00"
            matched_desc = "Morning meal / expense"
        elif any(w in clause_lower for w in ["in the afternoon", "afternoon", "lunch", "midday"]):
            matched_time = "13:00"
            matched_desc = "Afternoon lunch"
        elif any(w in clause_lower for w in ["in the evening", "evening", "snacks", "tea time", "chai time"]):
            matched_time = "17:30"
            matched_desc = "Evening snack"
        elif any(w in clause_lower for w in ["at night", "in the night", "tonight", "last night", "dinner", "supper"]):
            matched_time = "20:30"
            matched_desc = "Night dinner"

        # Extract title cleanly
        clean_title = re.sub(r'(?:rs\.?|₹|\$|eur|inr)?\s*\d+(?:\.\d{1,2})?', '', clause, flags=re.IGNORECASE).strip()
        prev_t = ""
        while prev_t != clean_title:
            prev_t = clean_title
            clean_title = re.sub(r'^(?:i|we|my|have|spent|paid|for|ate|had|bought|bought at|gave|transferred|on|at|got)\s+', '', clean_title, flags=re.IGNORECASE).strip()
            clean_title = re.sub(r'\s+(?:using|by|via|through|with|cash|upi|card)\b.*$', '', clean_title, flags=re.IGNORECASE).strip()
            clean_title = re.sub(r'\s+(?:in the morning|in the night|at night|in the afternoon|in the evening|today|yesterday|online smart|smart)\b.*$', '', clean_title, flags=re.IGNORECASE).strip()
            
        if not clean_title or len(clean_title) < 2:
            clean_title = f"{matched_cat} Expense"
        clean_title = clean_title.title()

        new_extracted.append({
            "title": clean_title,
            "amount": amount_val,
            "category": matched_cat,
            "payment_method": matched_pm,
            "date": today_str,
            "time": matched_time,
            "location": "",
            "description": matched_desc
        })

    final_drafts = working_drafts + new_extracted
    if not final_drafts and existing_drafts:
        final_drafts = existing_drafts

    reply = f"I've processed your narration and updated your draft expenses ({len(final_drafts)} item(s)). Please review and confirm below!" if final_drafts else "I couldn't detect clear expense amounts in your narration. Could you try saying something like 'I spent 200 on lunch using UPI'?"

    return {
        "reply_message": reply,
        "extracted_expenses": final_drafts,
        "confidence": 0.88,
        "requires_clarification": len(final_drafts) == 0
    }

