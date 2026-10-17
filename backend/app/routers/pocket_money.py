from datetime import datetime, date
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_collection
from app.auth import get_current_user
from app.models import PocketMoneyCreate, PocketMoneyUpdate
from app.utils import serialize_doc, serialize_docs

router = APIRouter(prefix="/api/pocket-money", tags=["Pocket Money Box"])

def compute_pocket_money_summary(user_id: str):
    pm_col = get_collection("pocket_money")
    expenses_col = get_collection("expenses")
    
    today_str = date.today().strftime("%Y-%m-%d")
    
    # All deposits for this user, sorted by start_date ascending
    deposits = list(pm_col.find({"user_id": user_id}).sort([("start_date", 1), ("created_at", 1)]))
    
    active_deposits = []
    waiting_deposits = []
    
    for dep in deposits:
        dep_start = dep.get("start_date") or today_str
        if dep_start <= today_str:
            dep["status"] = "active"
            active_deposits.append(dep)
        else:
            dep["status"] = "waiting"
            waiting_deposits.append(dep)
            
    total_active_deposited = sum(float(d.get("amount", 0)) for d in active_deposits)
    total_waiting_deposited = sum(float(d.get("amount", 0)) for d in waiting_deposits)
    
    # Calculate expenses that deduct from the active pocket money box
    total_spent = 0.0
    if active_deposits:
        # Earliest start date among active deposits
        earliest_start = min(d.get("start_date") or today_str for d in active_deposits)
        
        # Match expenses from earliest start date to today (excluding Rent)
        pipeline = [
            {"$match": {
                "user_id": user_id,
                "date": {"$gte": earliest_start, "$lte": today_str},
                "category": {"$ne": "Rent"}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        res = list(expenses_col.aggregate(pipeline))
        if res:
            total_spent = float(res[0]["total"])
            
    available_balance = total_active_deposited - total_spent
    
    summary = {
        "available_balance": available_balance,
        "total_active_deposited": total_active_deposited,
        "total_waiting_deposited": total_waiting_deposited,
        "total_spent": total_spent,
        "is_over_budget": available_balance < 0,
        "active_count": len(active_deposits),
        "waiting_count": len(waiting_deposits),
        "total_deposits_count": len(deposits)
    }
    
    # Sort deposits in descending order for display
    deposits_display = sorted(deposits, key=lambda x: (x.get("start_date", ""), str(x.get("created_at", ""))), reverse=True)
    
    return summary, deposits_display

@router.get("")
def get_pocket_money_box(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    summary, deposits = compute_pocket_money_summary(user_id)
    return {
        "summary": summary,
        "deposits": serialize_docs(deposits)
    }

@router.post("")
def add_pocket_money(item: PocketMoneyCreate, current_user: dict = Depends(get_current_user)):
    pm_col = get_collection("pocket_money")
    budgets_col = get_collection("budgets")
    
    today_str = date.today().strftime("%Y-%m-%d")
    start_date = item.start_date.strip() if item.start_date and item.start_date.strip() else today_str
    
    doc = {
        "user_id": current_user["id"],
        "user_email": current_user["email"],
        "amount": float(item.amount),
        "start_date": start_date,
        "note": item.note or "From Parent",
        "created_at": datetime.utcnow()
    }
    
    res = pm_col.insert_one(doc)
    doc["_id"] = res.inserted_id
    
    # Also sync with Weekly Allowance in budgets collection for backward compatibility
    existing_budget = budgets_col.find_one({"user_id": current_user["id"], "category": "Weekly Allowance"})
    if existing_budget:
        budgets_col.update_one(
            {"_id": existing_budget["_id"]},
            {"$set": {"amount": float(item.amount), "updated_at": datetime.utcnow()}}
        )
    else:
        budgets_col.insert_one({
            "user_id": current_user["id"],
            "category": "Weekly Allowance",
            "amount": float(item.amount),
            "period": "weekly",
            "reset_day": "Monday",
            "created_at": datetime.utcnow()
        })
        
    return serialize_doc(doc)

@router.put("/{item_id}")
def update_pocket_money(item_id: str, item: PocketMoneyUpdate, current_user: dict = Depends(get_current_user)):
    pm_col = get_collection("pocket_money")
    try:
        obj_id = ObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid deposit ID format")
        
    existing = pm_col.find_one({"_id": obj_id, "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Pocket money deposit not found")
        
    updates = {}
    if item.amount is not None:
        updates["amount"] = float(item.amount)
    if item.start_date is not None:
        updates["start_date"] = item.start_date.strip()
    if item.note is not None:
        updates["note"] = item.note.strip()
        
    if updates:
        updates["updated_at"] = datetime.utcnow()
        pm_col.update_one({"_id": obj_id}, {"$set": updates})
        
    updated_doc = pm_col.find_one({"_id": obj_id})
    return serialize_doc(updated_doc)

@router.delete("/{item_id}")
def delete_pocket_money(item_id: str, current_user: dict = Depends(get_current_user)):
    pm_col = get_collection("pocket_money")
    try:
        obj_id = ObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid deposit ID format")
        
    result = pm_col.delete_one({"_id": obj_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pocket money deposit not found")
        
    return {"status": "success", "message": "Pocket money deposit deleted successfully"}
