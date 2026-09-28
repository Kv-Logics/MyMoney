import os
from datetime import datetime
from bson import ObjectId
from app.database import get_collection

ADMIN_EMAILS = [
    "keerthivasan.220722@gmail.com",
    "a.keerthivasan7676@gmail.com"
]

def is_admin_user(email: str) -> bool:
    if not email:
        return False
    return email.strip().lower() in [e.lower() for e in ADMIN_EMAILS]

def get_user_ai_status(user_id: str, email: str) -> dict:
    is_admin = is_admin_user(email)
    if is_admin:
        return {
            "status": "approved",
            "is_admin": True,
            "can_use_ai": True,
            "total_requests": 0,
            "total_tokens": 0
        }

    ai_access_col = get_collection("ai_access")
    record = ai_access_col.find_one({"user_id": user_id})

    if not record:
        return {
            "status": "none",
            "is_admin": False,
            "can_use_ai": False,
            "total_requests": 0,
            "total_tokens": 0
        }

    status_val = record.get("status", "none")
    return {
        "status": status_val,
        "is_admin": False,
        "can_use_ai": status_val == "approved",
        "total_requests": record.get("total_requests", 0),
        "total_tokens": record.get("total_tokens", 0),
        "requested_at": record.get("requested_at"),
        "approved_at": record.get("approved_at")
    }

def request_ai_access(user_id: str, email: str, name: str = "") -> dict:
    if is_admin_user(email):
        return {"status": "approved", "message": "Admin users automatically have full AI access."}

    ai_access_col = get_collection("ai_access")
    existing = ai_access_col.find_one({"user_id": user_id})

    if existing and existing.get("status") == "approved":
        return {"status": "approved", "message": "You already have active AI access!"}

    doc = {
        "user_id": user_id,
        "email": email,
        "name": name or email.split("@")[0],
        "status": "pending",
        "total_requests": existing.get("total_requests", 0) if existing else 0,
        "total_tokens": existing.get("total_tokens", 0) if existing else 0,
        "requested_at": datetime.utcnow()
    }

    ai_access_col.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
    return {"status": "pending", "message": "AI access requested successfully. Waiting for admin approval."}

def set_user_ai_status(admin_user: dict, target_user_id: str, new_status: str) -> dict:
    if not is_admin_user(admin_user.get("email")):
        raise PermissionError("Only administrators can approve or revoke AI access.")

    if new_status not in ["approved", "revoked", "pending"]:
        raise ValueError("Invalid status. Must be 'approved', 'revoked', or 'pending'.")

    ai_access_col = get_collection("ai_access")
    users_col = get_collection("users")

    user_doc = users_col.find_one({"_id": ObjectId(target_user_id)})
    if not user_doc:
        raise ValueError("User not found.")

    update_fields = {
        "status": new_status,
        "updated_at": datetime.utcnow()
    }
    if new_status == "approved":
        update_fields["approved_at"] = datetime.utcnow()
        update_fields["approved_by"] = admin_user.get("email")

    ai_access_col.update_one(
        {"user_id": target_user_id},
        {"$set": update_fields, "$setOnInsert": {
            "email": user_doc.get("email"),
            "name": user_doc.get("name", user_doc.get("email", "").split("@")[0]),
            "total_requests": 0,
            "total_tokens": 0,
            "created_at": datetime.utcnow()
        }},
        upsert=True
    )
    return {"status": new_status, "message": f"User AI access status updated to '{new_status}'."}

def check_can_use_ai(user_id: str, email: str) -> bool:
    if is_admin_user(email):
        return True
    ai_access_col = get_collection("ai_access")
    record = ai_access_col.find_one({"user_id": user_id})
    return bool(record and record.get("status") == "approved")

def record_ai_usage(user_id: str, email: str, action: str = "voice_narration", estimated_tokens: int = 350):
    ai_access_col = get_collection("ai_access")
    ai_logs_col = get_collection("ai_usage_logs")

    now = datetime.utcnow()

    # Insert usage log
    ai_logs_col.insert_one({
        "user_id": user_id,
        "email": email,
        "action": action,
        "tokens": estimated_tokens,
        "created_at": now
    })

    # Increment user totals
    ai_access_col.update_one(
        {"user_id": user_id},
        {
            "$inc": {"total_requests": 1, "total_tokens": estimated_tokens},
            "$set": {"last_used_at": now, "email": email}
        },
        upsert=True
    )

def get_admin_ai_dashboard() -> dict:
    ai_access_col = get_collection("ai_access")
    ai_logs_col = get_collection("ai_usage_logs")
    users_col = get_collection("users")

    # Fetch all registered users
    all_users = list(users_col.find({}, {"password": 0}))
    access_records = {r["user_id"]: r for r in ai_access_col.find({})}

    user_list = []
    total_tokens_all = 0
    total_requests_all = 0
    pending_count = 0
    approved_count = 0

    for u in all_users:
        u_id = str(u["_id"])
        email = u.get("email", "")
        is_adm = is_admin_user(email)

        rec = access_records.get(u_id, {})
        status = "approved" if is_adm else rec.get("status", "none")
        requests = rec.get("total_requests", 0)
        tokens = rec.get("total_tokens", 0)

        total_tokens_all += tokens
        total_requests_all += requests

        if status == "pending":
            pending_count += 1
        elif status == "approved":
            approved_count += 1

        user_list.append({
            "user_id": u_id,
            "name": u.get("name", email.split("@")[0]),
            "email": email,
            "is_admin": is_adm,
            "status": status,
            "total_requests": requests,
            "total_tokens": tokens,
            "requested_at": rec.get("requested_at").isoformat() if rec.get("requested_at") else None,
            "last_used_at": rec.get("last_used_at").isoformat() if rec.get("last_used_at") else None
        })

    # Get recent 20 AI invocations
    recent_logs = list(ai_logs_col.find({}).sort("created_at", -1).limit(20))
    for l in recent_logs:
        l["_id"] = str(l["_id"])
        if "created_at" in l and l["created_at"]:
            l["created_at"] = l["created_at"].isoformat()

    return {
        "summary": {
            "total_ai_requests": total_requests_all,
            "total_tokens_consumed": total_tokens_all,
            "pending_approvals": pending_count,
            "approved_users": approved_count,
            "total_users": len(all_users)
        },
        "users": user_list,
        "recent_logs": recent_logs
    }
