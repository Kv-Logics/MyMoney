import os
import secrets
import hashlib
from datetime import datetime, timedelta
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
from bson import ObjectId
from app.database import get_collection

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretjwtkey123!@#")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
API_KEY_PREFIX = "mm_live_"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def generate_api_key() -> tuple[str, str]:
    """Generates a cryptographically secure API key and its SHA-256 hash.
    Returns: (raw_key, hashed_key)
    """
    raw_key = f"{API_KEY_PREFIX}{secrets.token_hex(32)}"
    hashed_key = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    return raw_key, hashed_key

def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    users_collection = get_collection("users")
    user = None

    # Check if token is an API key (starts with prefix mm_live_ or fails JWT decoding)
    if token.startswith(API_KEY_PREFIX):
        key_hash = hash_api_key(token)
        user = users_collection.find_one({"api_key_hash": key_hash, "api_key_active": True})
        if user:
            expires_at = user.get("api_key_expires_at")
            if expires_at and expires_at < datetime.utcnow():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API key has expired",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"api_key_last_used": datetime.utcnow()}}
            )
        else:
            raise credentials_exception
    else:
        # Try JWT decode first
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("type", "access") != "access":
                raise credentials_exception
            email: str = payload.get("email")
            if email is None:
                raise credentials_exception
            user = users_collection.find_one({"email": email})
        except jwt.PyJWTError:
            # Fallback: check if token matches an API key hash directly
            key_hash = hash_api_key(token)
            user = users_collection.find_one({"api_key_hash": key_hash, "api_key_active": True})
            if user:
                expires_at = user.get("api_key_expires_at")
                if expires_at and expires_at < datetime.utcnow():
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="API key has expired",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                users_collection.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"api_key_last_used": datetime.utcnow()}}
                )
            else:
                raise credentials_exception

    if user is None:
        raise credentials_exception

    user["_id"] = str(user["_id"])
    user["id"] = user["_id"]
    return user
