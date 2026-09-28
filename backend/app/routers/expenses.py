from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from bson import ObjectId
from app.database import get_collection
from app.auth import get_current_user
from app.models import ExpenseCreate, ExpenseUpdate, ExtractionResponse, VoiceAgentRequest, VoiceAgentResponse
from app.utils import serialize_doc, serialize_docs, log_audit_action, verify_sharing_access
from app.services.llm_extractor import call_gemini_vision, process_voice_narration

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])

def check_budget_thresholds(user_id: str, email: str, category: str, added_amount: float):
    budgets_col = get_collection("budgets")
    expenses_col = get_collection("expenses")
    notify_col = get_collection("notifications")
    
    now = datetime.now()
    start_of_month = datetime(now.year, now.month, 1).strftime("%Y-%m-%d")
    
    def get_monthly_spent(filter_query):
        pipeline = [
            {"$match": filter_query},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        res = list(expenses_col.aggregate(pipeline))
        return res[0]["total"] if res else 0.0

    # 1. Check Category Budget
    cat_budget = budgets_col.find_one({"user_id": user_id, "category": category})
    if cat_budget:
        spent = get_monthly_spent({
            "user_id": user_id,
            "category": category,
            "date": {"$gte": start_of_month}
        })
        limit = cat_budget["amount"]
        prev_spent = spent - added_amount
        
        for pct in [1.0, 0.9, 0.75, 0.5]:
            threshold = limit * pct
            if spent >= threshold and prev_spent < threshold:
                msg = f"You have reached {int(pct*100)}% of your monthly budget for {category} (Limit: {limit})."
                notify_col.insert_one({
                    "user_email": email,
                    "title": f"Budget Alert - {category}",
                    "message": msg,
                    "type": "budget",
                    "read": False,
                    "created_at": datetime.utcnow()
                })
                break
                
    # 2. Check Overall Budget
    overall_budget = budgets_col.find_one({"user_id": user_id, "category": "Overall"})
    if overall_budget:
        spent = get_monthly_spent({
            "user_id": user_id,
            "date": {"$gte": start_of_month}
        })
        limit = overall_budget["amount"]
        prev_spent = spent - added_amount
        
        for pct in [1.0, 0.9, 0.75, 0.5]:
            threshold = limit * pct
            if spent >= threshold and prev_spent < threshold:
                msg = f"You have reached {int(pct*100)}% of your overall monthly budget (Limit: {limit})."
                notify_col.insert_one({
                    "user_email": email,
                    "title": "Overall Budget Alert",
                    "message": msg,
                    "type": "budget",
                    "read": False,
                    "created_at": datetime.utcnow()
                })
                break

@router.post("/extract", response_model=ExtractionResponse)
async def extract_from_bill(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts an image file, sends it to Gemini API,
    and returns structured JSON for the expense.
    """
    try:
        image_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to read uploaded file")
        
    prompt = """
    Analyze this receipt/bill and extract the following information in JSON format. Do not include markdown code blocks, just the raw JSON.
    {
      "title": "Vendor or store name",
      "amount": numeric total amount,
      "date": "YYYY-MM-DD format",
      "category": "One of: Food, Grocery, Fuel, Shopping, Electricity, Entertainment, Transport, Rent, Medical, Education, Utilities, Travel, Other",
      "payment_method": "One of: Cash, UPI, Credit Card, Debit Card, Bank Transfer, Wallet"
    }
    If a field cannot be found, use null.
    """
    
    try:
        extracted_json = await call_gemini_vision(image_bytes, prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return ExtractionResponse(
        extracted=extracted_json,
        confidence=0.95
    )

@router.post("/voice-agent", response_model=VoiceAgentResponse)
async def voice_agent_narration(
    req: VoiceAgentRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts natural spoken narration or text chat messages from user,
    parses items, maps categories/methods, and returns structured drafts & AI reply.
    """
    from app.services.ai_access import check_can_use_ai, record_ai_usage
    if not check_can_use_ai(current_user["id"], current_user["email"]):
        raise HTTPException(
            status_code=403,
            detail="AI Voice Agent access requires approval from admin (keerthivasan.220722@gmail.com). Please request access from the Voice Agent screen."
        )

    try:
        drafts_dict = [d.model_dump() for d in req.existing_drafts] if req.existing_drafts else []
        result = await process_voice_narration(
            narration=req.narration,
            existing_drafts=drafts_dict,
            categories=req.categories,
            payment_methods=req.payment_methods,
            currency=req.currency,
            custom_gemini_key=req.gemini_api_key
        )
        record_ai_usage(current_user["id"], current_user["email"], action="voice_narration", estimated_tokens=350)
        return VoiceAgentResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice AI Agent Error: {str(e)}")

@router.post("")
def create_expense(expense: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    expenses_col = get_collection("expenses")
    
    new_expense = expense.model_dump()
    new_expense["user_id"] = current_user["id"]
    new_expense["user_email"] = current_user["email"]
    new_expense["created_at"] = datetime.utcnow()
    
    res = expenses_col.insert_one(new_expense)
    new_expense["_id"] = res.inserted_id
    
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="expense_created",
        details=f"Added expense '{expense.title}' of amount {expense.amount} in {expense.category}."
    )
    
    check_budget_thresholds(current_user["id"], current_user["email"], expense.category, expense.amount)
    
    return serialize_doc(new_expense)

@router.get("")
def get_expenses(
    owner_email: Optional[str] = None,
    category: Optional[str] = None,
    payment_method: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "date_desc",
    current_user: dict = Depends(get_current_user)
):
    target_user_id = current_user["id"]
    if owner_email:
        if not verify_sharing_access(owner_email, current_user["email"]):
            raise HTTPException(status_code=403, detail="No viewing permission for this user")
        users_col = get_collection("users")
        owner_user = users_col.find_one({"email": owner_email})
        if not owner_user:
            raise HTTPException(status_code=404, detail="Shared user not found")
        target_user_id = str(owner_user["_id"])
        
    expenses_col = get_collection("expenses")
    query = {"user_id": target_user_id}
    
    if category:
        query["category"] = category
    if payment_method:
        query["payment_method"] = payment_method
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date
    if min_amount or max_amount:
        query["amount"] = {}
        if min_amount is not None:
            query["amount"]["$gte"] = min_amount
        if max_amount is not None:
            query["amount"]["$lte"] = max_amount
            
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}}
        ]
        
    sort_opts = [("date", -1)]
    if sort_by == "date_desc":
        sort_opts = [("date", -1), ("created_at", -1)]
    elif sort_by == "date_asc":
        sort_opts = [("date", 1), ("created_at", 1)]
    elif sort_by == "amount_desc":
        sort_opts = [("amount", -1)]
    elif sort_by == "amount_asc":
        sort_opts = [("amount", 1)]
        
    expenses = list(expenses_col.find(query).sort(sort_opts))
    return serialize_docs(expenses)

@router.put("/{id}")
def update_expense(id: str, expense_update: ExpenseUpdate, current_user: dict = Depends(get_current_user)):
    expenses_col = get_collection("expenses")
    existing = expenses_col.find_one({"_id": ObjectId(id), "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found or unauthorized")
        
    update_data = {k: v for k, v in expense_update.model_dump().items() if v is not None}
    if not update_data:
        return serialize_doc(existing)
        
    update_data["updated_at"] = datetime.utcnow()
    expenses_col.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="expense_edited",
        details=f"Updated expense '{existing['title']}' (New values: {update_data})."
    )
    
    new_amount = update_data.get("amount", existing["amount"])
    new_cat = update_data.get("category", existing["category"])
    if new_amount != existing["amount"] or new_cat != existing["category"]:
        diff = new_amount if new_cat != existing["category"] else (new_amount - existing["amount"])
        check_budget_thresholds(current_user["id"], current_user["email"], new_cat, diff)
        
    updated = expenses_col.find_one({"_id": ObjectId(id)})
    return serialize_doc(updated)

@router.delete("/{id}")
def delete_expense(id: str, current_user: dict = Depends(get_current_user)):
    expenses_col = get_collection("expenses")
    existing = expenses_col.find_one({"_id": ObjectId(id), "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found or unauthorized")
        
    expenses_col.delete_one({"_id": ObjectId(id)})
    
    log_audit_action(
        user_id=current_user["id"],
        user_name=current_user["name"],
        action="expense_deleted",
        details=f"Deleted expense '{existing['title']}' of amount {existing['amount']}."
    )
    
    return {"message": "Expense deleted"}
