from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional
import os
import json
import logging
from bson import ObjectId
from pywebpush import webpush, WebPushException

from app.database import get_collection
from app.auth import get_current_user
from app.routers.auth import _assert_admin

router = APIRouter(prefix="/api/push", tags=["Web Push"])
logger = logging.getLogger(__name__)

# The VAPID private key should be kept secure. For this stable approach, we load it from the pem file generated or environment variable.
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "private_key.pem")
VAPID_CLAIMS = {"sub": "mailto:admin@mymoney.local"}

class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]

@router.post("/subscribe")
def subscribe_to_push(subscription: PushSubscription, current_user: dict = Depends(get_current_user)):
    users_col = get_collection("users")
    
    users_col.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"push_subscription": subscription.model_dump()}}
    )
    
    return {"message": "Push subscription saved successfully."}

@router.post("/send-daily-reminders")
def send_daily_reminders(current_user: dict = Depends(get_current_user)):
    # Only allow admin to trigger this manually or via a secure cron job
    _assert_admin(current_user)
    
    users_col = get_collection("users")
    expenses_col = get_collection("expenses")
    profit_col = get_collection("daily_profits")
    
    import datetime
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    
    success_count = 0
    failure_count = 0
    
    for user in users_col.find({"push_subscription": {"$exists": True}}):
        sub = user["push_subscription"]
        user_id = str(user["_id"])
        name = user.get("name", "User")
        
        # Get today's expenses
        todays_expenses = list(expenses_col.find({"user_id": user_id, "date": today_str}))
        total_spent = sum(float(e["amount"]) for e in todays_expenses)
        
        # Get today's profit
        profit_doc = profit_col.find_one({"user_id": user_id, "date": today_str})
        profit_amount = float(profit_doc["amount"]) if profit_doc else 0.0
        
        # Construct context for the AI
        context = (
            f"User '{name}' spent {total_spent} today across {len(todays_expenses)} expenses. "
            f"Their daily profit record for today is {profit_amount}. "
            "Write a very short, friendly 1-sentence push notification reminding them to log any missing transactions. "
            "Keep it under 100 characters. DO NOT include quotes around the message."
        )
        
        try:
            from groq import Groq
            client = Groq()
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": context,
                    }
                ],
                model="llama-3.3-70b-versatile",
            )
            message = chat_completion.choices[0].message.content.strip().strip('"')
            
            payload = json.dumps({
                "title": "MyMoney Daily Summary",
                "body": message,
                "icon": "/assets/favicon.svg"
            })
            
            webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS
            )
            success_count += 1
            logger.info(f"Sent push notification to {name}")
        except WebPushException as ex:
            logger.error(f"Failed to send Web Push to {name}: {repr(ex)}")
            if ex.response and ex.response.json():
                logger.error(ex.response.json())
            failure_count += 1
        except Exception as e:
            logger.error(f"Error generating or sending push for {name}: {str(e)}")
            failure_count += 1
            
    return {
        "message": "Daily reminders process completed.",
        "success": success_count,
        "failures": failure_count
    }
