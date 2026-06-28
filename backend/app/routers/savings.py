from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import get_collection
from app.auth import get_current_user
from app.models import SavingsGoalCreate
from app.utils import serialize_doc, serialize_docs, log_audit_action, verify_sharing_access

router = APIRouter(prefix="/api/savings", tags=["Savings Goals"])

@router.get("")
def get_savings_goals(owner_email: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    target_user_id = current_user["id"]
    if owner_email:
        if not verify_sharing_access(owner_email, current_user["email"]):
            raise HTTPException(status_code=403, detail="No viewing permission for this user")
        users_col = get_collection("users")
        owner_user = users_col.find_one({"email": owner_email})
        if owner_user:
            target_user_id = str(owner_user["_id"])
            
    goals_col = get_collection("savings_goals")
    goals = list(goals_col.find({"user_id": target_user_id}))
    return serialize_docs(goals)

@router.post("")
def create_savings_goal(goal: SavingsGoalCreate, current_user: dict = Depends(get_current_user)):
    goals_col = get_collection("savings_goals")
    new_goal = goal.model_dump()
    new_goal["user_id"] = current_user["id"]
    new_goal["created_at"] = datetime.utcnow()
    
    res = goals_col.insert_one(new_goal)
    new_goal["_id"] = res.inserted_id
    
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="goal_created",
        details=f"Created savings goal '{goal.title}' of target amount {goal.target_amount}."
    )
    
    return serialize_doc(new_goal)

@router.put("/{id}")
def update_savings_goal(id: str, goal_update: SavingsGoalCreate, current_user: dict = Depends(get_current_user)):
    goals_col = get_collection("savings_goals")
    existing = goals_col.find_one({"_id": ObjectId(id), "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Savings goal not found")
        
    update_data = goal_update.model_dump()
    update_data["updated_at"] = datetime.utcnow()
    goals_col.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="goal_updated",
        details=f"Updated savings goal '{existing['title']}' (New values: {update_data})."
    )
    
    updated = goals_col.find_one({"_id": ObjectId(id)})
    return serialize_doc(updated)

@router.delete("/{id}")
def delete_savings_goal(id: str, current_user: dict = Depends(get_current_user)):
    goals_col = get_collection("savings_goals")
    existing = goals_col.find_one({"_id": ObjectId(id), "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Savings goal not found")
        
    goals_col.delete_one({"_id": ObjectId(id)})
    
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="goal_deleted",
        details=f"Deleted savings goal '{existing['title']}'."
    )
    
    return {"message": "Savings goal deleted"}
