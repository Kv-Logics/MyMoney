from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_collection
from app.auth import get_current_user
from app.models import BudgetCreate
from app.utils import serialize_doc, serialize_docs, verify_sharing_access

router = APIRouter(prefix="/api/budgets", tags=["Budgets"])

@router.get("")
def get_budgets(owner_email: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    target_email = current_user["email"]
    user_id = current_user["id"]
    
    if owner_email:
        if not verify_sharing_access(owner_email, current_user["email"]):
            raise HTTPException(status_code=403, detail="No viewing permission for this user")
        target_email = owner_email
        users_col = get_collection("users")
        owner_user = users_col.find_one({"email": owner_email})
        if owner_user:
            user_id = str(owner_user["_id"])
            
    budgets_col = get_collection("budgets")
    budgets = list(budgets_col.find({"user_id": user_id}))
    return serialize_docs(budgets)

@router.post("")
def create_or_update_budget(budget: BudgetCreate, current_user: dict = Depends(get_current_user)):
    budgets_col = get_collection("budgets")
    
    existing = budgets_col.find_one({"user_id": current_user["id"], "category": budget.category})
    if existing:
        budgets_col.update_one(
            {"_id": existing["_id"]},
            {"$set": {"amount": budget.amount, "updated_at": datetime.utcnow()}}
        )
        updated = budgets_col.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)
    else:
        new_budget = {
            "user_id": current_user["id"],
            "category": budget.category,
            "amount": budget.amount,
            "created_at": datetime.utcnow()
        }
        res = budgets_col.insert_one(new_budget)
        new_budget["_id"] = res.inserted_id
        return serialize_doc(new_budget)
