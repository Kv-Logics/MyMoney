from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from app.database import get_collection
from app.auth import get_current_user
from app.models import TaskCreate, TaskUpdate
from app.utils import serialize_doc, serialize_docs, log_audit_action, verify_sharing_access

router = APIRouter(prefix="/api/tasks", tags=["Task Manager"])

@router.get("")
def get_tasks(owner_email: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    target_user_id = current_user["id"]
    if owner_email:
        if not verify_sharing_access(owner_email, current_user["email"]):
            raise HTTPException(status_code=403, detail="No viewing permission for this user")
        users_col = get_collection("users")
        owner_user = users_col.find_one({"email": owner_email})
        if owner_user:
            target_user_id = str(owner_user["_id"])
            
    tasks_col = get_collection("tasks")
    tasks = list(tasks_col.find({"user_id": target_user_id}))
    
    # Auto-update overdue tasks
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    updated_tasks = []
    
    for task in tasks:
        # If past due date and not completed/archived, mark as Overdue
        if (task.get("status") not in ["Completed", "Archived", "Overdue"]) and (task.get("due_date") < today_str):
            tasks_col.update_one({"_id": task["_id"]}, {"$set": {"status": "Overdue"}})
            task["status"] = "Overdue"
        updated_tasks.append(task)
        
    return serialize_docs(updated_tasks)

@router.post("")
def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    tasks_col = get_collection("tasks")
    new_task = task.model_dump()
    new_task["user_id"] = current_user["id"]
    new_task["created_at"] = datetime.utcnow()
    
    # Calculate progress based on checklist
    checklist = new_task.get("checklist", [])
    if checklist:
        completed = sum(1 for item in checklist if item.get("completed", False))
        new_task["progress"] = (completed / len(checklist)) * 100.0
        if new_task["progress"] == 100.0:
            new_task["status"] = "Completed"
            
        # Calculate start_date and due_date based on checklist
        due_dates = [item["due_date"] for item in checklist if item.get("due_date")]
        if due_dates:
            due_dates.sort()
            new_task["start_date"] = due_dates[0]
            new_task["due_date"] = due_dates[-1]
    else:
        new_task["progress"] = 100.0 if new_task["status"] == "Completed" else 0.0
        
    res = tasks_col.insert_one(new_task)
    new_task["_id"] = res.inserted_id
    
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="task_created",
        details=f"Created task '{task.title}' under category '{task.category}'."
    )
    
    return serialize_doc(new_task)

@router.put("/{id}")
def update_task(id: str, task_update: TaskUpdate, current_user: dict = Depends(get_current_user)):
    tasks_col = get_collection("tasks")
    existing = tasks_col.find_one({"_id": ObjectId(id), "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
        
    update_data = {k: v for k, v in task_update.model_dump().items() if v is not None}
    
    # If checklist is provided, recalculate progress, status, and dates
    if "checklist" in update_data:
        checklist = update_data["checklist"]
        if checklist:
            completed = sum(1 for item in checklist if item.get("completed", False))
            progress = (completed / len(checklist)) * 100.0
            update_data["progress"] = progress
            if progress == 100.0:
                update_data["status"] = "Completed"
            elif progress < 100.0 and existing.get("status") == "Completed":
                update_data["status"] = "In Progress"
                
            # Recalculate start_date and due_date based on checklist items
            due_dates = [item.get("due_date") for item in checklist if item.get("due_date")]
            if due_dates:
                due_dates.sort()
                update_data["start_date"] = due_dates[0]
                update_data["due_date"] = due_dates[-1]
        else:
            update_data["progress"] = 0.0
            if existing.get("status") == "Completed":
                update_data["status"] = "Pending"
    elif "status" in update_data and update_data["status"] == "Completed":
        # If completed directly, set progress to 100% and complete checklist items
        update_data["progress"] = 100.0
        if "checklist" in existing and existing["checklist"]:
            updated_checklist = [{**item, "completed": True} for item in existing["checklist"]]
            update_data["checklist"] = updated_checklist
            
    tasks_col.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="task_updated",
        details=f"Updated task '{existing['title']}'."
    )
    
    updated = tasks_col.find_one({"_id": ObjectId(id)})
    return serialize_doc(updated)

@router.delete("/{id}")
def delete_task(id: str, current_user: dict = Depends(get_current_user)):
    tasks_col = get_collection("tasks")
    existing = tasks_col.find_one({"_id": ObjectId(id), "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
        
    tasks_col.delete_one({"_id": ObjectId(id)})
    
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="task_deleted",
        details=f"Deleted task '{existing['title']}'."
    )
    
    return {"message": "Task deleted successfully"}
