from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import get_collection
from app.auth import get_current_user
from app.models import InvitationCreate
from app.utils import serialize_docs, log_audit_action

router = APIRouter(prefix="/api/sharing", tags=["Sharing"])

@router.post("/invite")
def invite_user(inv: InvitationCreate, current_user: dict = Depends(get_current_user)):
    if inv.email == current_user["email"]:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")
    
    invitations_col = get_collection("invitations")
    sharing_col = get_collection("sharing")
    
    if sharing_col.find_one({"owner_email": current_user["email"], "shared_with_email": inv.email}):
        raise HTTPException(status_code=400, detail="Access already shared with this user")
    
    invite = {
        "owner_email": current_user["email"],
        "owner_name": current_user["name"],
        "shared_with_email": inv.email,
        "permission": inv.permission,
        "status": "accepted",
        "created_at": datetime.utcnow()
    }
    invitations_col.update_one(
        {"owner_email": current_user["email"], "shared_with_email": inv.email},
        {"$set": invite},
        upsert=True
    )
    
    sharing_col.update_one(
        {"owner_email": current_user["email"], "shared_with_email": inv.email},
        {"$set": {
            "owner_email": current_user["email"],
            "owner_name": current_user["name"],
            "shared_with_email": inv.email,
            "permission": inv.permission,
            "shared_at": datetime.utcnow()
        }},
        upsert=True
    )
    
    notify_col = get_collection("notifications")
    notify_col.insert_one({
        "user_email": inv.email,
        "title": "New Shared Access",
        "message": f"{current_user['name']} has shared their expense tracker with you.",
        "type": "sharing",
        "read": False,
        "created_at": datetime.utcnow()
    })
    
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="invite_sent",
        details=f"Invited {inv.email} with {inv.permission} permission."
    )
    
    return {"message": f"Successfully shared access with {inv.email}"}

@router.get("/shared-with")
def get_shared_with(current_user: dict = Depends(get_current_user)):
    sharing_col = get_collection("sharing")
    shared_list = list(sharing_col.find({"owner_email": current_user["email"]}))
    return serialize_docs(shared_list)

@router.get("/shared-by")
def get_shared_by(current_user: dict = Depends(get_current_user)):
    sharing_col = get_collection("sharing")
    shared_list = list(sharing_col.find({"shared_with_email": current_user["email"]}))
    return serialize_docs(shared_list)

@router.delete("/revoke/{id}")
def revoke_sharing(id: str, current_user: dict = Depends(get_current_user)):
    sharing_col = get_collection("sharing")
    access = sharing_col.find_one({"_id": ObjectId(id), "owner_email": current_user["email"]})
    if not access:
        raise HTTPException(status_code=404, detail="Shared access not found")
        
    sharing_col.delete_one({"_id": ObjectId(id)})
    
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="invite_revoked",
        details=f"Revoked sharing access for {access['shared_with_email']}."
    )
    
    return {"message": "Access revoked"}
