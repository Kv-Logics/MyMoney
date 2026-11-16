import os
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Literal, List, Any
from app.auth import get_current_user
from app.services.ai_access import (
    get_user_ai_status,
    request_ai_access,
    set_user_ai_status,
    get_admin_ai_dashboard,
    is_admin_user,
    check_can_use_ai,
    record_ai_usage
)
from app.services.llm_extractor import process_voice_narration

router = APIRouter(prefix="/api/ai", tags=["AI Access & Tokens"])

class SetStatusRequest(BaseModel):
    status: Literal["approved", "revoked", "pending"]

class ParseVoiceChatRequest(BaseModel):
    narration: str
    conversation_history: Optional[List[Any]] = []
    gemini_api_key: Optional[str] = None
    existing_drafts: Optional[List[Any]] = []
    categories: Optional[List[Any]] = None
    payment_methods: Optional[List[Any]] = None
    currency: Optional[str] = "₹"

@router.post("/parse-voice-chat")
@router.post("/parse-voice")
async def parse_voice_chat(
    req: ParseVoiceChatRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Parses natural spoken voice narration or text chat messages from user.
    Uses custom Gemini API Key if provided, or Gemini 2.0 Flash if approved,
    or smart NLP rule-based extraction fallback so requests never fail.
    """
    custom_key = req.gemini_api_key.strip() if req.gemini_api_key and req.gemini_api_key.strip() else None
    can_use_server_gemini = check_can_use_ai(current_user["id"], current_user.get("email", ""))
    
    key_to_use = custom_key if custom_key else (os.environ.get("GEMINI_API_KEY") if can_use_server_gemini else None)
    
    try:
        drafts_dict = [d.model_dump() if hasattr(d, "model_dump") else d for d in (req.existing_drafts or [])]
        result = await process_voice_narration(
            narration=req.narration,
            conversation_history=req.conversation_history or [],
            existing_drafts=drafts_dict,
            categories=req.categories,
            payment_methods=req.payment_methods,
            currency=req.currency or "₹",
            custom_gemini_key=key_to_use
        )
        
        if can_use_server_gemini and not custom_key:
            background_tasks.add_task(
                record_ai_usage,
                current_user["id"],
                current_user.get("email", ""),
                action="voice_chat",
                estimated_tokens=350
            )

        reply = result.get("reply_message", "Extracted expenses successfully.")
        extracted = result.get("extracted_expenses", [])

        return {
            "message": reply,
            "reply_message": reply,
            "parsed": extracted,
            "extracted_expenses": extracted,
            "confidence": result.get("confidence", 0.95),
            "requires_clarification": result.get("requires_clarification", False)
        }
    except Exception as e:
        # Fallback to local rule-based parsing so user prompt never hard-fails
        try:
            result = await process_voice_narration(
                narration=req.narration,
                conversation_history=req.conversation_history or [],
                existing_drafts=[],
                categories=req.categories,
                payment_methods=req.payment_methods,
                currency=req.currency or "₹",
                custom_gemini_key=None
            )
            reply = result.get("reply_message", "Extracted expenses successfully.")
            extracted = result.get("extracted_expenses", [])
            return {
                "message": reply,
                "reply_message": reply,
                "parsed": extracted,
                "extracted_expenses": extracted,
                "confidence": 0.85,
                "requires_clarification": len(extracted) == 0
            }
        except Exception as inner_err:
            raise HTTPException(status_code=500, detail=f"Failed to parse narration: {str(inner_err)}")

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
