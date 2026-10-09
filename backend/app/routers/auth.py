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
    UserResponse,
    SettingsUpdate,
    RefreshTokenRequest,
    APIKeyGenerateRequest,
    APIKeyResponse
)
from app.utils import serialize_doc, DEFAULT_PAYMENT_METHODS, log_audit_action

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register")
def register(user_data: UserRegister):
    users_col = get_collection("users")
    if users_col.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user_data.password)
    new_user = {
        "name": user_data.name,
        "email": user_data.email,
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
    
    access_token = create_access_token({"email": user_data.email})
    refresh_token = create_refresh_token({"email": user_data.email})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": serialize_doc(new_user)
    }

@router.post("/login")
def login(credentials: UserLogin):
    users_col = get_collection("users")
    user = users_col.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
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
    user = users_col.find_one({"email": email})
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

@router.post("/admin/set-password")
def admin_set_password(payload: AdminSetPasswordRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("email") != "a.keerthivasan7676@gmail.com":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the system administrator can perform this action."
        )
    
    users_col = get_collection("users")
    target_email = payload.email.strip().lower()
    hashed = hash_password(payload.password)
    
    existing_user = users_col.find_one({"email": target_email})
    if existing_user:
        users_col.update_one({"_id": existing_user["_id"]}, {"$set": {"password": hashed}})
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

ADMIN_EMAIL = "a.keerthivasan7676@gmail.com"

def _assert_admin(current_user):
    if current_user.get("email") != ADMIN_EMAIL:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only.")

@router.get("/admin/users")
def admin_list_users(current_user: dict = Depends(get_current_user)):
    _assert_admin(current_user)
    users_col = get_collection("users")
    users = list(users_col.find({}, {"password": 0}))
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
