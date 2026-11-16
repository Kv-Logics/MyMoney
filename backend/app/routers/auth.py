import re
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.database import get_collection
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
    generate_api_key,
    hash_api_key
)
from app.models import (
    UserRegister,
    UserLogin,
    AdminSetPasswordRequest,
    ChangePasswordRequest,
    DeleteAccountRequest,
    UserResponse,
    SettingsUpdate,
    RefreshTokenRequest,
    APIKeyGenerateRequest,
    APIKeyResponse
)
from app.utils import serialize_doc, serialize_docs, DEFAULT_PAYMENT_METHODS, log_audit_action

ADMIN_EMAILS = {"keerthivasan.220722@gmail.com", "a.keerthivasan7676@gmail.com"}

def _assert_admin(current_user):
    user_email = (current_user.get("email") or "").strip().lower()
    if user_email not in ADMIN_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the system administrator can perform this action."
        )

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register")
def register(user_data: UserRegister):
    users_col = get_collection("users")
    clean_email = str(user_data.email).strip().lower()
    clean_name = str(user_data.name).strip()
    if users_col.find_one({"email": {"$regex": f"^{re.escape(clean_email)}$", "$options": "i"}}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user_data.password)
    new_user = {
        "name": clean_name or clean_email.split("@")[0],
        "email": clean_email,
        "password": hashed,
        "currency": "INR",
        "theme": "light",
        "language": "en",
        "timezone": "UTC",
        "created_at": datetime.utcnow()
    }
    
    result = users_col.insert_one(new_user)
    
    # Initialize settings/default payment methods
    settings_col = get_collection("settings")
    settings_col.insert_one({
        "user_id": str(result.inserted_id),
        "payment_methods": DEFAULT_PAYMENT_METHODS
    })
    
    access_token = create_access_token({"email": clean_email})
    refresh_token = create_refresh_token({"email": clean_email})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": serialize_doc(new_user)
    }

@router.post("/login")
def login(credentials: UserLogin):
    users_col = get_collection("users")
    clean_email = str(credentials.email).strip().lower()
    user = users_col.find_one({"email": {"$regex": f"^{re.escape(clean_email)}$", "$options": "i"}})
    if not user or not verify_password(credentials.password, user.get("password", "")):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    access_token = create_access_token({"email": user["email"]})
    refresh_token = create_refresh_token({"email": user["email"]})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": serialize_doc(user)
    }

@router.post("/refresh")
def refresh(payload: RefreshTokenRequest):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        from app.auth import JWT_SECRET, JWT_ALGORITHM
        import jwt
        decoded = jwt.decode(payload.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if decoded.get("type") != "refresh":
            raise credentials_exception
        email: str = decoded.get("email")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    users_col = get_collection("users")
    clean_email = email.strip().lower()
    user = users_col.find_one({"email": {"$regex": f"^{re.escape(clean_email)}$", "$options": "i"}})
    if not user:
        raise credentials_exception
        
    access_token = create_access_token({"email": email})
    refresh_token = create_refresh_token({"email": email})
    return {"access_token": access_token, "refresh_token": refresh_token}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["_id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "currency": current_user.get("currency", "INR"),
        "theme": current_user.get("theme", "light"),
        "language": current_user.get("language", "en"),
        "timezone": current_user.get("timezone", "UTC")
    }

@router.put("/settings")
def update_settings(settings: SettingsUpdate, current_user: dict = Depends(get_current_user)):
    users_col = get_collection("users")
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    if not update_data:
        return serialize_doc(current_user)
    
    users_col.update_one({"_id": ObjectId(current_user["id"])}, {"$set": update_data})
    updated_user = users_col.find_one({"_id": ObjectId(current_user["id"])})
    return serialize_doc(updated_user)
@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    users_col = get_collection("users")
    user = users_col.find_one({"_id": ObjectId(current_user["id"])})
    if not user or not verify_password(payload.old_password, user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect old password")
        
    hashed = hash_password(payload.new_password)
    users_col.update_one({"_id": ObjectId(current_user["id"])}, {"$set": {"password": hashed}})
    
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="change_password",
        details="User changed their own password."
    )
    return {"message": "Password changed successfully."}

def _purge_user_data(user_id: str, user_email: str):
    """
    Permanently purges all data associated with a user across all collections.
    """
    user_id_str = str(user_id)
    clean_email = str(user_email).strip().lower()
    
    # 1. Expenses
    get_collection("expenses").delete_many({
        "$or": [
            {"user_id": user_id_str},
            {"userId": user_id_str},
            {"user_email": clean_email}
        ]
    })
    
    # 2. Budgets
    get_collection("budgets").delete_many({"user_id": user_id_str})
    
    # 3. Custom Categories
    get_collection("categories").delete_many({"user_id": user_id_str})
    
    # 4. Savings Goals
    get_collection("savings_goals").delete_many({"user_id": user_id_str})
    
    # 5. Pocket Money / Allowances
    get_collection("pocket_money").delete_many({"user_id": user_id_str})
    
    # 6. Daily Profits
    get_collection("daily_profits").delete_many({"user_id": user_id_str})
    
    # 7. Tasks
    get_collection("tasks").delete_many({"user_id": user_id_str})
    
    # 8. User Settings & Payment methods
    get_collection("settings").delete_many({"user_id": user_id_str})
    
    # 9. Sharing and Invitations
    get_collection("sharing").delete_many({
        "$or": [
            {"owner_email": clean_email},
            {"shared_with_email": clean_email}
        ]
    })
    get_collection("invitations").delete_many({
        "$or": [
            {"owner_email": clean_email},
            {"shared_with_email": clean_email}
        ]
    })
    
    # 10. Notifications
    get_collection("notifications").delete_many({
        "$or": [
            {"user_email": clean_email},
            {"user_id": user_id_str}
        ]
    })
    
    # 11. AI Access and AI Usage Logs
    get_collection("ai_access").delete_many({
        "$or": [
            {"user_id": user_id_str},
            {"user_email": clean_email}
        ]
    })
    get_collection("ai_usage_logs").delete_many({
        "$or": [
            {"user_id": user_id_str},
            {"user_email": clean_email}
        ]
    })
    
    # 12. OAuth Auth Codes
    get_collection("auth_codes").delete_many({
        "$or": [
            {"user_id": user_id_str},
            {"email": clean_email}
        ]
    })
    
    # 13. Wakeup Logs
    get_collection("wakeup_logs").delete_many({
        "$or": [
            {"user_id": user_id_str},
            {"user_email": clean_email}
        ]
    })
    
    # 14. Finally delete user record
    get_collection("users").delete_one({"_id": ObjectId(user_id_str)})

@router.delete("/delete-account")
@router.post("/delete-account")
def delete_own_account(payload: DeleteAccountRequest, current_user: dict = Depends(get_current_user)):
    user_email = (current_user.get("email") or "").strip().lower()
    user_id = str(current_user["id"])
    
    if user_email in ADMIN_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System administrator accounts cannot be deleted."
        )
    
    users_col = get_collection("users")
    user = users_col.find_one({"_id": ObjectId(user_id)})
    if not user or not verify_password(payload.password, user.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password. Account deletion aborted."
        )
    
    log_audit_action(
        user_id=user_id,
        user_name=current_user.get("name", "User"),
        action="delete_account",
        details=f"User {user_email} requested and confirmed permanent account deletion."
    )
    
    _purge_user_data(user_id, user_email)
    
    return {
        "status": "success",
        "message": "Your account and all associated data have been permanently deleted."
    }

@router.post("/admin/set-password")
def admin_set_password(payload: AdminSetPasswordRequest, current_user: dict = Depends(get_current_user)):
    _assert_admin(current_user)
    
    users_col = get_collection("users")
    target_email = payload.email.strip().lower()
    hashed = hash_password(payload.password)
    
    existing_user = users_col.find_one({"email": {"$regex": f"^{re.escape(target_email)}$", "$options": "i"}})
    if existing_user:
        users_col.update_one({"_id": existing_user["_id"]}, {"$set": {"password": hashed, "email": target_email}})
        log_audit_action(
            user_id=current_user["id"],
            user_name=current_user["name"],
            action="admin_set_password",
            details=f"Admin {current_user['email']} updated password for user {target_email}."
        )
        return {"message": f"Password updated successfully for existing user {target_email}."}
    else:
        new_user = {
            "name": target_email.split('@')[0],
            "email": target_email,
            "password": hashed,
            "currency": "INR",
            "theme": "light",
            "language": "en",
            "timezone": "UTC",
            "created_at": datetime.utcnow()
        }
        result = users_col.insert_one(new_user)
        
        # Initialize default settings
        settings_col = get_collection("settings")
        settings_col.insert_one({
            "user_id": str(result.inserted_id),
            "payment_methods": DEFAULT_PAYMENT_METHODS
        })
        log_audit_action(
            user_id=current_user["id"],
            user_name=current_user["name"],
            action="admin_register_user",
            details=f"Admin {current_user['email']} registered and set password for new user {target_email}."
        )
        return {"message": f"New user {target_email} registered and password set successfully."}

@router.get("/admin/users")
def admin_list_users(current_user: dict = Depends(get_current_user)):
    _assert_admin(current_user)
    users_col = get_collection("users")
    expenses_col = get_collection("expenses")
    users = list(users_col.find({}, {"password": 0, "api_key_hash": 0}).sort("created_at", -1))
    
    for u in users:
        u_id = str(u["_id"])
        u["expense_count"] = expenses_col.count_documents({"$or": [{"user_id": u_id}, {"userId": u_id}]})
        u["is_admin"] = (u.get("email") or "").strip().lower() in ADMIN_EMAILS

    return serialize_docs(users)

@router.get("/admin/stats")
def admin_stats(current_user: dict = Depends(get_current_user)):
    _assert_admin(current_user)
    users_col = get_collection("users")
    expenses_col = get_collection("expenses")

    total_users = users_col.count_documents({})
    total_expenses = expenses_col.count_documents({})

    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    agg = list(expenses_col.aggregate(pipeline))
    total_amount = agg[0]["total"] if agg else 0

    return {
        "total_users": total_users,
        "total_expenses": total_expenses,
        "total_amount": total_amount
    }

@router.delete("/admin/users/{user_id}")
def admin_delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    _assert_admin(current_user)
    
    users_col = get_collection("users")
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format.")
        
    target_user = users_col.find_one({"_id": obj_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    target_email = (target_user.get("email") or "").strip().lower()
    if target_email in ADMIN_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a system administrator account."
        )
        
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="admin_delete_user",
        details=f"Admin {current_user['email']} permanently deleted user {target_email} ({user_id})."
    )
    
    _purge_user_data(str(target_user["_id"]), target_email)
    
    return {
        "status": "success",
        "message": f"User {target_email} and all associated data have been permanently deleted."
    }

# --- ChatGPT API Key Management ---
@router.post("/api-key", response_model=APIKeyResponse)
def generate_user_api_key(
    request: Optional[APIKeyGenerateRequest] = None,
    current_user: dict = Depends(get_current_user)
):
    users_col = get_collection("users")
    raw_key, hashed_key = generate_api_key()
    
    days_valid = request.days_valid if request and request.days_valid else 365
    created_at = datetime.utcnow()
    expires_at = created_at + timedelta(days=days_valid)
    prefix = f"{raw_key[:12]}...{raw_key[-4:]}"

    users_col.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {
            "api_key_hash": hashed_key,
            "api_key_prefix": prefix,
            "api_key_active": True,
            "api_key_created_at": created_at,
            "api_key_expires_at": expires_at,
            "api_key_last_used": None
        }}
    )
    
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="generate_api_key",
        details="Generated new ChatGPT API key."
    )

    return APIKeyResponse(
        api_key=raw_key,
        prefix=prefix,
        created_at=created_at,
        expires_at=expires_at,
        is_active=True,
        message="Save this API key securely. It will not be shown again."
    )

@router.delete("/api-key")
def revoke_user_api_key(current_user: dict = Depends(get_current_user)):
    users_col = get_collection("users")
    users_col.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {
            "api_key_active": False,
            "api_key_revoked_at": datetime.utcnow()
        }}
    )
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="revoke_api_key",
        details="Revoked ChatGPT API key."
    )
    return {"status": "success", "message": "API key revoked successfully"}

@router.get("/api-key", response_model=APIKeyResponse)
def get_user_api_key_info(current_user: dict = Depends(get_current_user)):
    users_col = get_collection("users")
    user = users_col.find_one({"_id": ObjectId(current_user["id"])})
    if not user or not user.get("api_key_hash"):
        return APIKeyResponse(
            is_active=False,
            message="No API key created yet"
        )
    
    return APIKeyResponse(
        prefix=user.get("api_key_prefix"),
        created_at=user.get("api_key_created_at"),
        expires_at=user.get("api_key_expires_at"),
        last_used=user.get("api_key_last_used"),
        is_active=user.get("api_key_active", False)
    )
