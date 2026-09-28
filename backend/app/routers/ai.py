from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Literal
from app.auth import get_current_user
from app.services.ai_access import (
    get_user_ai_status,
    request_ai_access,
    set_user_ai_status,
    get_admin_ai_dashboard,
    is_admin_user
)

router = APIRouter(prefix="/api/ai", tags=["AI Access & Tokens"])

class SetStatusRequest(BaseModel):
    status: Literal["approved", "revoked", "pending"]

@router.get("/access/status")
def check_status(current_user: dict = Depends(get_current_user)):
    """
    Returns AI access permission and token usage for the authenticated user.
    """
    return get_user_ai_status(current_user["id"], current_user["email"])

@router.post("/access/request")
def request_access(current_user: dict = Depends(get_current_user)):
    """
    Allows a standard user to submit an approval request to the admin for AI features.
    """
    return request_ai_access(
        user_id=current_user["id"],
        email=current_user["email"],
        name=current_user.get("name", "")
    )

@router.get("/admin/dashboard")
def admin_ai_dashboard(current_user: dict = Depends(get_current_user)):
    """
    Admin-only endpoint to view token analytics, quota, and pending user requests.
    """
    if not is_admin_user(current_user.get("email")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Administrator access required."
        )
    return get_admin_ai_dashboard()

@router.post("/admin/users/{user_id}/status")
def admin_set_user_status(
    user_id: str,
    payload: SetStatusRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Admin-only endpoint to approve or revoke AI access for a specific user.
    """
    if not is_admin_user(current_user.get("email")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Administrator access required."
        )
    try:
        return set_user_ai_status(current_user, user_id, payload.status)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
