import os
import logging
from fastapi import FastAPI, Depends, HTTPException, status, Query, UploadFile, File, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import json

from app.database import get_collection
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)
from app.models import (
    UserRegister,
    UserLogin,
    UserResponse,
    ExpenseCreate,
    ExpenseUpdate,
    CategoryCreate,
    CategoryUpdate,
    BudgetCreate,
    InvitationCreate,
    SavingsGoalCreate,
    SavingsGoalUpdate,
    SettingsUpdate
)

app = FastAPI(title="MyMoney - Expense Tracker API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper to serialize MongoDB docs
def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    if "_id" in doc:
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc

def serialize_docs(docs):
    return [serialize_doc(doc) for doc in docs]

# Default Categories
DEFAULT_CATEGORIES = [
    {"name": "Food", "color": "#EF4444", "icon": "Utensils", "is_default": True},
    {"name": "Rent", "color": "#3B82F6", "icon": "Home", "is_default": True},
    {"name": "Grocery", "color": "#10B981", "icon": "ShoppingBag", "is_default": True},
    {"name": "Electricity", "color": "#F59E0B", "icon": "Zap", "is_default": True},
    {"name": "Water", "color": "#06B6D4", "icon": "Droplet", "is_default": True},
    {"name": "Fuel", "color": "#6366F1", "icon": "Gauge", "is_default": True},
    {"name": "Shopping", "color": "#EC4899", "icon": "ShoppingCart", "is_default": True},
    {"name": "Entertainment", "color": "#8B5CF6", "icon": "Film", "is_default": True},
    {"name": "Medical", "color": "#14B8A6", "icon": "Activity", "is_default": True},
    {"name": "Education", "color": "#F43F5E", "icon": "GraduationCap", "is_default": True},
    {"name": "Travel", "color": "#059669", "icon": "Compass", "is_default": True},
    {"name": "Subscription", "color": "#7C3AED", "icon": "Tv", "is_default": True},
    {"name": "Miscellaneous", "color": "#6B7280", "icon": "FolderPlus", "is_default": True}
]

# Default Payment Methods
DEFAULT_PAYMENT_METHODS = ["Cash", "UPI", "Credit Card", "Debit Card", "Bank Transfer", "Wallet"]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."}
    )

@app.get("/")
def read_root():
    return {"status": "ok", "message": "MyMoney - Expense Tracker API is running"}

# --- AUTH ENDPOINTS ---

@app.post("/api/auth/register")
def register(user_data: UserRegister):
    users_col = get_collection("users")
    if users_col.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user_data.password)
    new_user = {
        "name": user_data.name,
        "email": user_data.email,
        "password": hashed,
        "currency": "INR",
        "theme": "dark",
        "language": "en",
        "timezone": "UTC",
        "created_at": datetime.utcnow()
    }
    
    result = users_col.insert_one(new_user)
    
    # Initialize settings/default payment methods
    settings_col = get_collection("settings")
    settings_col.insert_one({
        "user_id": str(result.inserted_id),
        "payment_methods": DEFAULT_PAYMENT_METHODS
    })
    
    token = create_access_token({"email": user_data.email})
    return {"token": token, "user": serialize_doc(new_user)}

@app.post("/api/auth/login")
def login(credentials: UserLogin):
    users_col = get_collection("users")
    user = users_col.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    token = create_access_token({"email": user["email"]})
    return {"token": token, "user": serialize_doc(user)}

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["_id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "currency": current_user.get("currency", "INR"),
        "theme": current_user.get("theme", "dark"),
        "language": current_user.get("language", "en"),
        "timezone": current_user.get("timezone", "UTC")
    }

@app.put("/api/auth/settings")
def update_settings(settings: SettingsUpdate, current_user: dict = Depends(get_current_user)):
    users_col = get_collection("users")
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    if not update_data:
        return serialize_doc(current_user)
    
    users_col.update_one({"_id": ObjectId(current_user["id"])}, {"$set": update_data})
    updated_user = users_col.find_one({"_id": ObjectId(current_user["id"])})
    return serialize_doc(updated_user)


# --- CATEGORY ENDPOINTS ---

@app.get("/api/categories")
def get_categories(current_user: dict = Depends(get_current_user)):
    # Returns default + custom categories for this user
    categories_col = get_collection("categories")
    custom = list(categories_col.find({"user_id": current_user["id"]}))
    
    # Merge defaults and customs
    return DEFAULT_CATEGORIES + serialize_docs(custom)

@app.post("/api/categories")
def create_category(cat: CategoryCreate, current_user: dict = Depends(get_current_user)):
    categories_col = get_collection("categories")
    # Avoid duplicate name (check both defaults and custom)
    name_lower = cat.name.strip().lower()
    for dc in DEFAULT_CATEGORIES:
        if dc["name"].lower() == name_lower:
            raise HTTPException(status_code=400, detail="Category already exists")
    
    if categories_col.find_one({"user_id": current_user["id"], "name": {"$regex": f"^{cat.name}$", "$options": "i"}}):
        raise HTTPException(status_code=400, detail="Category already exists")
    
    new_cat = {
        "user_id": current_user["id"],
        "name": cat.name.strip(),
        "color": cat.color,
        "icon": cat.icon,
        "is_default": False,
        "created_at": datetime.utcnow()
    }
    result = categories_col.insert_one(new_cat)
    new_cat["_id"] = result.inserted_id
    return serialize_doc(new_cat)

@app.delete("/api/categories/{cat_id}")
def delete_category(cat_id: str, current_user: dict = Depends(get_current_user)):
    categories_col = get_collection("categories")
    res = categories_col.delete_one({"_id": ObjectId(cat_id), "user_id": current_user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found or default")
    return {"message": "Category deleted"}


# --- PAYMENT METHODS ---

@app.get("/api/payment-methods")
def get_payment_methods(current_user: dict = Depends(get_current_user)):
    settings_col = get_collection("settings")
    settings = settings_col.find_one({"user_id": current_user["id"]})
    if not settings:
        return DEFAULT_PAYMENT_METHODS
    return settings.get("payment_methods", DEFAULT_PAYMENT_METHODS)

@app.post("/api/payment-methods")
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


# --- SHARING/COLLABORATION ---

# Real-time sharing helper: checks if shared_user has access to target_user's data
def verify_sharing_access(target_user_email: str, current_user_email: str):
    if target_user_email == current_user_email:
        return True
    
    sharing_col = get_collection("sharing")
    # Check if there is an active sharing access entry
    access = sharing_col.find_one({
        "owner_email": target_user_email,
        "shared_with_email": current_user_email
    })
    return access is not None

@app.post("/api/sharing/invite")
def invite_user(inv: InvitationCreate, current_user: dict = Depends(get_current_user)):
    if inv.email == current_user["email"]:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")
    
    # Save invite
    invitations_col = get_collection("invitations")
    sharing_col = get_collection("sharing")
    
    # Check if sharing already exists
    if sharing_col.find_one({"owner_email": current_user["email"], "shared_with_email": inv.email}):
        raise HTTPException(status_code=400, detail="Access already shared with this user")
    
    # Create or update invitation
    invite = {
        "owner_email": current_user["email"],
        "owner_name": current_user["name"],
        "shared_with_email": inv.email,
        "permission": inv.permission,
        "status": "accepted", # auto-accepted for this dashboard ease, or pending
        "created_at": datetime.utcnow()
    }
    invitations_col.update_one(
        {"owner_email": current_user["email"], "shared_with_email": inv.email},
        {"$set": invite},
        upsert=True
    )
    
    # Add to active sharing
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
    
    # Add notification for the shared user
    notify_col = get_collection("notifications")
    notify_col.insert_one({
        "user_email": inv.email,
        "title": "New Shared Access",
        "message": f"{current_user['name']} has shared their expense tracker with you.",
        "type": "sharing",
        "read": False,
        "created_at": datetime.utcnow()
    })
    
    # Log Audit
    audit_col = get_collection("audit_logs")
    audit_col.insert_one({
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "action": "invite_sent",
        "details": f"Invited {inv.email} with {inv.permission} permission.",
        "created_at": datetime.utcnow()
    })
    
    return {"message": f"Successfully shared access with {inv.email}"}

@app.get("/api/sharing/shared-with")
def get_shared_with(current_user: dict = Depends(get_current_user)):
    sharing_col = get_collection("sharing")
    shared_list = list(sharing_col.find({"owner_email": current_user["email"]}))
    return serialize_docs(shared_list)

@app.get("/api/sharing/shared-by")
def get_shared_by(current_user: dict = Depends(get_current_user)):
    sharing_col = get_collection("sharing")
    shared_list = list(sharing_col.find({"shared_with_email": current_user["email"]}))
    return serialize_docs(shared_list)

@app.delete("/api/sharing/revoke/{id}")
def revoke_sharing(id: str, current_user: dict = Depends(get_current_user)):
    sharing_col = get_collection("sharing")
    access = sharing_col.find_one({"_id": ObjectId(id), "owner_email": current_user["email"]})
    if not access:
        raise HTTPException(status_code=404, detail="Shared access not found")
        
    sharing_col.delete_one({"_id": ObjectId(id)})
    
    # Log Audit
    audit_col = get_collection("audit_logs")
    audit_col.insert_one({
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "action": "invite_revoked",
        "details": f"Revoked sharing access for {access['shared_with_email']}.",
        "created_at": datetime.utcnow()
    })
    
    return {"message": "Access revoked"}


# --- BUDGET ENDPOINTS ---

@app.get("/api/budgets")
def get_budgets(owner_email: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    # Verify access if checking another user's budget
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

@app.post("/api/budgets")
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


# --- EXPENSE ENDPOINTS ---

# Helper function to check budgets and generate notifications
def check_budget_thresholds(user_id: str, email: str, category: str, added_amount: float):
    # Fetch overall and specific category budgets
    budgets_col = get_collection("budgets")
    expenses_col = get_collection("expenses")
    notify_col = get_collection("notifications")
    
    now = datetime.now()
    start_of_month = datetime(now.year, now.month, 1).strftime("%Y-%m-%d")
    
    # Helper to calculate total spent this month for a query
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
        # Calculate thresholds
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

@app.post("/api/expenses")
def create_expense(expense: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    expenses_col = get_collection("expenses")
    
    new_expense = expense.model_dump()
    new_expense["user_id"] = current_user["id"]
    new_expense["user_email"] = current_user["email"]
    new_expense["created_at"] = datetime.utcnow()
    
    res = expenses_col.insert_one(new_expense)
    new_expense["_id"] = res.inserted_id
    
    # Audit log
    audit_col = get_collection("audit_logs")
    audit_col.insert_one({
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "action": "expense_created",
        "details": f"Added expense '{expense.title}' of amount {expense.amount} in {expense.category}.",
        "created_at": datetime.utcnow()
    })
    
    # Check budget thresholds
    check_budget_thresholds(current_user["id"], current_user["email"], expense.category, expense.amount)
    
    return serialize_doc(new_expense)

@app.get("/api/expenses")
def get_expenses(
    owner_email: Optional[str] = None,
    category: Optional[str] = None,
    payment_method: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "date_desc", # date_desc, date_asc, amount_desc, amount_asc
    current_user: dict = Depends(get_current_user)
):
    target_user_id = current_user["id"]
    if owner_email:
        if not verify_sharing_access(owner_email, current_user["email"]):
            raise HTTPException(status_code=403, detail="No viewing permission for this user")
        # Fetch the owner's user id
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
        
    # Sort map
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

@app.put("/api/expenses/{id}")
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
    
    # Audit log
    audit_col = get_collection("audit_logs")
    audit_col.insert_one({
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "action": "expense_edited",
        "details": f"Updated expense '{existing['title']}' (New values: {update_data}).",
        "created_at": datetime.utcnow()
    })
    
    # Check budget if amount or category changed
    new_amount = update_data.get("amount", existing["amount"])
    new_cat = update_data.get("category", existing["category"])
    if new_amount != existing["amount"] or new_cat != existing["category"]:
        # check budget
        diff = new_amount if new_cat != existing["category"] else (new_amount - existing["amount"])
        check_budget_thresholds(current_user["id"], current_user["email"], new_cat, diff)
        
    updated = expenses_col.find_one({"_id": ObjectId(id)})
    return serialize_doc(updated)

@app.delete("/api/expenses/{id}")
def delete_expense(id: str, current_user: dict = Depends(get_current_user)):
    expenses_col = get_collection("expenses")
    existing = expenses_col.find_one({"_id": ObjectId(id), "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found or unauthorized")
        
    expenses_col.delete_one({"_id": ObjectId(id)})
    
    # Audit log
    audit_col = get_collection("audit_logs")
    audit_col.insert_one({
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "action": "expense_deleted",
        "details": f"Deleted expense '{existing['title']}' of amount {existing['amount']}.",
        "created_at": datetime.utcnow()
    })
    
    return {"message": "Expense deleted successfully"}


# --- ANALYTICS ENDPOINTS ---

@app.get("/api/analytics")
def get_analytics(owner_email: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    target_user_id = current_user["id"]
    if owner_email:
        if not verify_sharing_access(owner_email, current_user["email"]):
            raise HTTPException(status_code=403, detail="No viewing permission for this user")
        users_col = get_collection("users")
        owner_user = users_col.find_one({"email": owner_email})
        if owner_user:
            target_user_id = str(owner_user["_id"])
            
    expenses_col = get_collection("expenses")
    
    # 1. Total spent current month, today, remaining budget
    now = datetime.now()
    start_of_month = datetime(now.year, now.month, 1).strftime("%Y-%m-%d")
    today_str = now.strftime("%Y-%m-%d")
    
    pipeline_total_month = [
        {"$match": {"user_id": target_user_id, "date": {"$gte": start_of_month}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    res_month = list(expenses_col.aggregate(pipeline_total_month))
    month_total = res_month[0]["total"] if res_month else 0.0
    
    pipeline_today = [
        {"$match": {"user_id": target_user_id, "date": today_str}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    res_today = list(expenses_col.aggregate(pipeline_today))
    today_total = res_today[0]["total"] if res_today else 0.0
    
    # 2. Category distribution
    pipeline_cat = [
        {"$match": {"user_id": target_user_id}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    cat_distribution = list(expenses_col.aggregate(pipeline_cat))
    categories_data = [{"category": item["_id"], "amount": item["total"], "count": item["count"]} for item in cat_distribution]
    
    # 3. Payment Method usage
    pipeline_pay = [
        {"$match": {"user_id": target_user_id}},
        {"$group": {"_id": "$payment_method", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    pay_distribution = list(expenses_col.aggregate(pipeline_pay))
    payment_data = [{"method": item["_id"], "amount": item["total"], "count": item["count"]} for item in pay_distribution]
    
    # 4. Daily Spending Trend (Last 30 days)
    # We can match date >= 30 days ago
    import datetime as dt
    thirty_days_ago = (now - dt.timedelta(days=30)).strftime("%Y-%m-%d")
    pipeline_trend = [
        {"$match": {"user_id": target_user_id, "date": {"$gte": thirty_days_ago}}},
        {"$group": {"_id": "$date", "total": {"$sum": "$amount"}}},
        {"$sort": {"_id": 1}}
    ]
    trend_res = list(expenses_col.aggregate(pipeline_trend))
    trend_data = [{"date": item["_id"], "amount": item["total"]} for item in trend_res]
    
    # 5. Statistics
    pipeline_stats = [
        {"$match": {"user_id": target_user_id}},
        {"$group": {
            "_id": None,
            "max_expense": {"$max": "$amount"},
            "min_expense": {"$min": "$amount"},
            "avg_expense": {"$avg": "$amount"},
            "total_count": {"$sum": 1}
        }}
    ]
    stats_res = list(expenses_col.aggregate(pipeline_stats))
    stats = stats_res[0] if stats_res else {"max_expense": 0.0, "min_expense": 0.0, "avg_expense": 0.0, "total_count": 0}
    if "_id" in stats:
        del stats["_id"]
        
    return {
        "summary": {
            "current_month_spending": month_total,
            "today_spending": today_total
        },
        "category_distribution": categories_data,
        "payment_method_distribution": payment_data,
        "daily_trend": trend_data,
        "statistics": stats
    }


# --- REPORT ENDPOINTS ---

@app.get("/api/reports")
def get_report(
    start_date: str = Query(...),
    end_date: str = Query(...),
    owner_email: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    target_user_id = current_user["id"]
    if owner_email:
        if not verify_sharing_access(owner_email, current_user["email"]):
            raise HTTPException(status_code=403, detail="No viewing permission for this user")
        users_col = get_collection("users")
        owner_user = users_col.find_one({"email": owner_email})
        if owner_user:
            target_user_id = str(owner_user["_id"])
            
    expenses_col = get_collection("expenses")
    query = {
        "user_id": target_user_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }
    
    expenses = list(expenses_col.find(query).sort("date", -1))
    
    total_expense = sum(e["amount"] for e in expenses)
    count = len(expenses)
    avg_expense = total_expense / count if count > 0 else 0.0
    
    # Calculate category stats
    cat_totals = {}
    for e in expenses:
        cat = e["category"]
        cat_totals[cat] = cat_totals.get(cat, 0.0) + e["amount"]
        
    highest_cat = max(cat_totals, key=cat_totals.get) if cat_totals else "None"
    lowest_cat = min(cat_totals, key=cat_totals.get) if cat_totals else "None"
    
    report_data = {
        "start_date": start_date,
        "end_date": end_date,
        "total_expense": total_expense,
        "average_expense": avg_expense,
        "transaction_count": count,
        "highest_spending_category": highest_cat,
        "highest_spending_category_amount": cat_totals.get(highest_cat, 0.0),
        "lowest_spending_category": lowest_cat,
        "lowest_spending_category_amount": cat_totals.get(lowest_cat, 0.0),
        "expenses": serialize_docs(expenses)
    }
    
    return report_data

@app.get("/api/reports/export")
def export_report(
    format: str = Query("csv"), # csv, excel, pdf
    start_date: str = Query(...),
    end_date: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    # This endpoint formats reports for download. In client-side, we'll implement direct download or return structured lines.
    expenses_col = get_collection("expenses")
    query = {
        "user_id": current_user["id"],
        "date": {"$gte": start_date, "$lte": end_date}
    }
    expenses = list(expenses_col.find(query).sort("date", -1))
    
    if format == "csv":
        csv_content = "Date,Title,Category,Payment Method,Amount,Description\n"
        for e in expenses:
            desc = e.get('description', '').replace('"', '""')
            csv_content += f"{e['date']},{e['title']},{e['category']},{e['payment_method']},{e['amount']},\"{desc}\"\n"
        return {"content": csv_content, "filename": f"expenses_{start_date}_to_{end_date}.csv"}
    else:
        # Simplification for non-csv downloads: return data and format structure
        return {"expenses": serialize_docs(expenses), "format": format}


# --- SAVINGS GOALS ENDPOINTS ---

@app.get("/api/savings")
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

@app.post("/api/savings")
def create_savings_goal(goal: SavingsGoalCreate, current_user: dict = Depends(get_current_user)):
    goals_col = get_collection("savings_goals")
    new_goal = goal.model_dump()
    new_goal["user_id"] = current_user["id"]
    new_goal["created_at"] = datetime.utcnow()
    
    res = goals_col.insert_one(new_goal)
    new_goal["_id"] = res.inserted_id
    
    # Audit log
    audit_col = get_collection("audit_logs")
    audit_col.insert_one({
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "action": "goal_created",
        "details": f"Created savings goal '{goal.title}' of target amount {goal.target_amount}.",
        "created_at": datetime.utcnow()
    })
    
    return serialize_doc(new_goal)

@app.put("/api/savings/{id}")
def update_savings_goal(id: str, goal_update: SavingsGoalCreate, current_user: dict = Depends(get_current_user)):
    goals_col = get_collection("savings_goals")
    existing = goals_col.find_one({"_id": ObjectId(id), "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Savings goal not found")
        
    update_data = goal_update.model_dump()
    update_data["updated_at"] = datetime.utcnow()
    goals_col.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    
    # Audit log
    audit_col = get_collection("audit_logs")
    audit_col.insert_one({
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "action": "goal_updated",
        "details": f"Updated savings goal '{existing['title']}' (New values: {update_data}).",
        "created_at": datetime.utcnow()
    })
    
    updated = goals_col.find_one({"_id": ObjectId(id)})
    return serialize_doc(updated)

@app.delete("/api/savings/{id}")
def delete_savings_goal(id: str, current_user: dict = Depends(get_current_user)):
    goals_col = get_collection("savings_goals")
    existing = goals_col.find_one({"_id": ObjectId(id), "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Savings goal not found")
        
    goals_col.delete_one({"_id": ObjectId(id)})
    
    # Audit log
    audit_col = get_collection("audit_logs")
    audit_col.insert_one({
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "action": "goal_deleted",
        "details": f"Deleted savings goal '{existing['title']}'.",
        "created_at": datetime.utcnow()
    })
    
    return {"message": "Goal deleted successfully"}


# --- NOTIFICATIONS ENDPOINTS ---

@app.get("/api/notifications")
def get_notifications(current_user: dict = Depends(get_current_user)):
    notify_col = get_collection("notifications")
    notifications = list(notify_col.find({"user_email": current_user["email"]}).sort("created_at", -1).limit(50))
    return serialize_docs(notifications)

@app.post("/api/notifications/read")
def mark_notifications_read(current_user: dict = Depends(get_current_user)):
    notify_col = get_collection("notifications")
    notify_col.update_many({"user_email": current_user["email"], "read": False}, {"$set": {"read": True}})
    return {"message": "All notifications marked as read"}


# --- AUDIT LOGS ENDPOINTS ---

@app.get("/api/audit-logs")
def get_audit_logs(owner_email: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    target_user_id = current_user["id"]
    if owner_email:
        if not verify_sharing_access(owner_email, current_user["email"]):
            raise HTTPException(status_code=403, detail="No viewing permission for this user")
        users_col = get_collection("users")
        owner_user = users_col.find_one({"email": owner_email})
        if owner_user:
            target_user_id = str(owner_user["_id"])
            
    audit_col = get_collection("audit_logs")
    logs = list(audit_col.find({"user_id": target_user_id}).sort("created_at", -1).limit(100))
    return serialize_docs(logs)


# --- RECEIPT UPLOAD (Mock / Local File Storage) ---

@app.post("/api/receipts/upload")
async def upload_receipt(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Local files upload for mock S3 compatible storage, keeping it self-contained
    upload_dir = "/home/kv/Projects/MyMoney/backend/uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    filename = f"{current_user['id']}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
        
    # Return path relative to server URL or local path
    return {"url": f"/uploads/{filename}", "filename": file.filename}

# Run app if script executed directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
