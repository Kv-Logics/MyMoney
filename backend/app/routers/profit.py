from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import get_current_user
from app.profit_tracker.service import profit_service

router = APIRouter(prefix="/api/profit", tags=["Daily Profit Tracker"])

@router.get("")
def list_daily_profits(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    now = datetime.utcnow()
    if not start_date:
        start_date = datetime(now.year, now.month, 1).strftime("%Y-%m-%d")
    if not end_date:
        end_date = now.strftime("%Y-%m-%d")

    records = profit_service.list_profits(user_id=user_id, start_date=start_date, end_date=end_date)
    return {"records": records, "count": len(records), "start_date": start_date, "end_date": end_date}

@router.get("/summary")
def get_profit_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    now = datetime.utcnow()
    if not start_date:
        start_date = datetime(now.year, now.month, 1).strftime("%Y-%m-%d")
    if not end_date:
        end_date = now.strftime("%Y-%m-%d")

    return profit_service.get_summary(user_id=user_id, start_date=start_date, end_date=end_date)

@router.get("/{key}")
def get_daily_profit_by_key(
    key: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    res = profit_service.get_profit_by_date(user_id=user_id, date=key)
    if not res:
        res = profit_service.get_profit_by_id(user_id=user_id, record_id=key)
    if not res:
        raise HTTPException(status_code=404, detail=f"Profit record '{key}' not found")
    return res

@router.post("")
def record_daily_profit(
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    date = payload.get("date") or datetime.utcnow().strftime("%Y-%m-%d")
    if "amount" not in payload or payload["amount"] is None:
        raise HTTPException(status_code=400, detail="'amount' is required")
    
    amount = float(payload["amount"])
    note = payload.get("note", "")
    
    return profit_service.record_profit(user_id=user_id, date=date, amount=amount, note=note)

@router.put("/{key}")
def update_daily_profit(
    key: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    amount = float(payload["amount"]) if "amount" in payload and payload["amount"] is not None else None
    note = payload.get("note")
    return profit_service.update_profit(user_id=user_id, key=key, amount=amount, note=note)

@router.delete("/{key}")
def delete_daily_profit(
    key: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    deleted = profit_service.delete_profit(user_id=user_id, key=key)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Profit record '{key}' not found")
    return {"status": "success", "message": f"Profit record '{key}' deleted"}
