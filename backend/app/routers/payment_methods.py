from fastapi import APIRouter, Depends, HTTPException, Query
from app.database import get_collection
from app.auth import get_current_user
from app.utils import DEFAULT_PAYMENT_METHODS

router = APIRouter(prefix="/api/payment-methods", tags=["Payment Methods"])

@router.get("")
def get_payment_methods(current_user: dict = Depends(get_current_user)):
    settings_col = get_collection("settings")
    settings = settings_col.find_one({"user_id": current_user["id"]})
    if not settings:
        return DEFAULT_PAYMENT_METHODS
    return settings.get("payment_methods", DEFAULT_PAYMENT_METHODS)

@router.post("")
def add_payment_method(name: str = Query(...), current_user: dict = Depends(get_current_user)):
    settings_col = get_collection("settings")
    settings = settings_col.find_one({"user_id": current_user["id"]})
    
    methods = DEFAULT_PAYMENT_METHODS.copy()
    if settings:
        methods = settings.get("payment_methods", DEFAULT_PAYMENT_METHODS)
    
    if name in methods:
        raise HTTPException(status_code=400, detail="Payment method already exists")
    
    methods.append(name)
    settings_col.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"payment_methods": methods}},
        upsert=True
    )
    return methods
