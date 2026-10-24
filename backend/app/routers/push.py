import os
import json
import logging
import datetime
from typing import Dict, Any, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from pywebpush import webpush, WebPushException

from app.database import get_collection
from app.auth import get_current_user
from app.routers.auth import _assert_admin

router = APIRouter(prefix="/api/push", tags=["Web Push"])
logger = logging.getLogger(__name__)

VAPID_CLAIMS = {"sub": "mailto:admin@mymoney.local"}

def get_vapid_private_key() -> str:
    env_key = os.environ.get("VAPID_PRIVATE_KEY")
    if env_key:
        return env_key
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    candidate = os.path.join(base_dir, "private_key.pem")
    if os.path.exists(candidate):
        return candidate
    return "private_key.pem"

class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]
    reminder_time: Optional[str] = "21:00"
    timezone: Optional[str] = "Asia/Kolkata"

@router.post("/subscribe")
def subscribe_to_push(subscription: PushSubscription, current_user: dict = Depends(get_current_user)):
    users_col = get_collection("users")
    
    users_col.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"push_subscription": subscription.model_dump()}}
    )
    
    return {"message": "Push subscription saved successfully."}

def send_notification_to_user(user: dict, today_str: str) -> bool:
    sub = user.get("push_subscription")
    if not sub or "endpoint" not in sub:
        return False
        
    user_id = str(user["_id"])
    name = user.get("name", "User")
    
    expenses_col = get_collection("expenses")
    profit_col = get_collection("daily_profits")
    
    todays_expenses = list(expenses_col.find({"user_id": user_id, "date": today_str}))
    total_spent = sum(float(e.get("amount", 0)) for e in todays_expenses)
    
    profit_doc = profit_col.find_one({"user_id": user_id, "date": today_str})
    profit_amount = float(profit_doc.get("amount", 0)) if profit_doc else 0.0
    
    message = None
    if os.environ.get("GROQ_API_KEY"):
        try:
            from groq import Groq
            client = Groq()
            context = (
                f"User '{name}' spent {total_spent} today across {len(todays_expenses)} expenses. "
                f"Their daily profit record for today is {profit_amount}. "
                "Write a very short, friendly 1-sentence push notification reminding them to log any missing transactions. "
                "Keep it under 100 characters. DO NOT include quotes around the message."
            )
            chat_completion = client.chat.completions.create(
                messages=[{"role": "user", "content": context}],
                model="llama-3.3-70b-versatile",
            )
            message = chat_completion.choices[0].message.content.strip().strip('"')
        except Exception as e:
            logger.warning(f"Groq push generation failed: {e}")

    if not message:
        if total_spent > 0:
            message = f"Hey {name}, you logged ₹{int(total_spent)} today. Don't forget to track any remaining expenses!"
        else:
            message = f"Hey {name}, take a quick moment to log your expenses and daily profit for today!"

    payload = json.dumps({
        "title": "MyMoney Daily Summary 💰",
        "body": message,
        "icon": "/assets/favicon.svg"
    })
    
    try:
        webpush(
            subscription_info=sub,
            data=payload,
            vapid_private_key=get_vapid_private_key(),
            vapid_claims=VAPID_CLAIMS
        )
        logger.info(f"Successfully dispatched daily reminder to {name}")
        return True
    except WebPushException as ex:
        logger.error(f"Failed to send Web Push to {name}: {repr(ex)}")
        return False
    except Exception as e:
        logger.error(f"Error sending push for {name}: {str(e)}")
        return False

def check_and_dispatch_due_reminders() -> int:
    """
    Plan A: Opportunistic queue processor and 24-hour gap check.
    Wakes up when server is touched by any user/MCP/ping request.
    Checks push subscribers:
    - If never sent before and local time >= reminder_time
    - Or if >= 18-20 hours passed since last notification AND (current local time >= reminder_time OR last_sent_date != today_str)
    - Or if >= 24 hours passed since last notification
    """
    dispatched_count = 0
    try:
        users_col = get_collection("users")
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        
        for user in users_col.find({"push_subscription": {"$exists": True}}):
            sub = user.get("push_subscription")
            if not sub or "endpoint" not in sub:
                continue
                
            user_tz_name = sub.get("timezone") or "Asia/Kolkata"
            try:
                import zoneinfo
                user_tz = zoneinfo.ZoneInfo(user_tz_name)
            except Exception:
                user_tz = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
                
            user_now = now_utc.astimezone(user_tz)
            today_str = user_now.strftime("%Y-%m-%d")
            current_hm = user_now.strftime("%H:%M")
            reminder_time = sub.get("reminder_time") or "21:00"
            
            last_sent_date = sub.get("last_sent_date")
            last_sent_at_str = sub.get("last_sent_at")
            
            is_due = False
            if not last_sent_at_str:
                if current_hm >= reminder_time:
                    is_due = True
            else:
                try:
                    last_sent_at = datetime.datetime.fromisoformat(last_sent_at_str)
                    if last_sent_at.tzinfo is None:
                        last_sent_at = last_sent_at.replace(tzinfo=datetime.timezone.utc)
                    hours_since = (now_utc - last_sent_at).total_seconds() / 3600.0
                    
                    if hours_since >= 24.0:
                        is_due = True
                    elif hours_since >= 18.0 and last_sent_date != today_str and current_hm >= reminder_time:
                        is_due = True
                except Exception as parse_err:
                    logger.warning(f"Error parsing last_sent_at: {parse_err}")
                    if last_sent_date != today_str and current_hm >= reminder_time:
                        is_due = True
                        
            if is_due:
                logger.info(f"Dispatching due reminder for {user.get('name')} (reminder_time={reminder_time}, current_hm={current_hm})")
                sent = send_notification_to_user(user, today_str)
                if sent:
                    dispatched_count += 1
                    users_col.update_one(
                        {"_id": user["_id"]},
                        {"$set": {
                            "push_subscription.last_sent_at": now_utc.isoformat(),
                            "push_subscription.last_sent_date": today_str
                        }}
                    )
    except Exception as e:
        logger.error(f"Error in check_and_dispatch_due_reminders: {e}", exc_info=True)
    return dispatched_count

@router.post("/send-daily-reminders")
def send_daily_reminders(current_user: dict = Depends(get_current_user)):
    _assert_admin(current_user)
    
    users_col = get_collection("users")
    import datetime
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    
    success_count = 0
    failure_count = 0
    
    for user in users_col.find({"push_subscription": {"$exists": True}}):
        sent = send_notification_to_user(user, today_str)
        if sent:
            success_count += 1
            users_col.update_one(
                {"_id": user["_id"]},
                {"$set": {
                    "push_subscription.last_sent_at": now_utc.isoformat(),
                    "push_subscription.last_sent_date": today_str
                }}
            )
        else:
            failure_count += 1
            
    return {
        "message": "Daily reminders process completed.",
        "success": success_count,
        "failures": failure_count
    }

@router.post("/test")
def test_push_notification(current_user: dict = Depends(get_current_user)):
    _assert_admin(current_user)
    users_col = get_collection("users")
    user = users_col.find_one({"_id": ObjectId(current_user["id"])})
    sub = user.get("push_subscription") if user else None

    if not sub:
        raise HTTPException(
            status_code=400,
            detail="No push subscription found on this account. Please click 'Enable Reminders' first to register this browser."
        )

    now_str = datetime.datetime.now().strftime("%H:%M:%S")
    payload = json.dumps({
        "title": "MyMoney Admin Test 🔔",
        "body": f"Push notification delivered successfully from server at {now_str}!",
        "icon": "/assets/favicon.svg"
    })

    try:
        webpush(
            subscription_info=sub,
            data=payload,
            vapid_private_key=get_vapid_private_key(),
            vapid_claims=VAPID_CLAIMS
        )
        return {"status": "success", "message": "Test push notification dispatched successfully!"}
    except Exception as e:
        logger.error(f"Test push notification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Push dispatch error: {str(e)}")
