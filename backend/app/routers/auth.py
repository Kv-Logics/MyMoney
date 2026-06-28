from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.database import get_collection
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user
)
from app.models import (
    UserRegister,
    UserLogin,
    UserResponse,
    SettingsUpdate,
    RefreshTokenRequest
)
from app.utils import serialize_doc, DEFAULT_PAYMENT_METHODS

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
        "theme": "dark",
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
        "theme": current_user.get("theme", "dark"),
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
