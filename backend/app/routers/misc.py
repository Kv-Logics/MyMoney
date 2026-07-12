import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from bson import ObjectId
from app.database import get_collection
from app.auth import get_current_user
from app.utils import serialize_docs, verify_sharing_access

router = APIRouter(tags=["Misc"])

# --- ANALYTICS ---
@router.get("/api/analytics")
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
    
    pipeline_cat = [
        {"$match": {"user_id": target_user_id}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    cat_distribution = list(expenses_col.aggregate(pipeline_cat))
    categories_data = [{"category": item["_id"], "amount": item["total"], "count": item["count"]} for item in cat_distribution]
    
    pipeline_pay = [
        {"$match": {"user_id": target_user_id}},
        {"$group": {"_id": "$payment_method", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    pay_distribution = list(expenses_col.aggregate(pipeline_pay))
    payment_data = [{"method": item["_id"], "amount": item["total"], "count": item["count"]} for item in pay_distribution]
    
    thirty_days_ago = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    pipeline_trend = [
        {"$match": {"user_id": target_user_id, "date": {"$gte": thirty_days_ago}}},
        {"$group": {"_id": "$date", "total": {"$sum": "$amount"}}},
        {"$sort": {"_id": 1}}
    ]
    trend_res = list(expenses_col.aggregate(pipeline_trend))
    trend_data = [{"date": item["_id"], "amount": item["total"]} for item in trend_res]
    
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

# --- REPORTS ---
@router.get("/api/reports")
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
        "date": {"$gte": start_date, "$lte": end_date},
        "category": {"$nin": ["Rent", "rent"]}
    }
    
    expenses = list(expenses_col.find(query).sort("date", -1))
    
    total_expense = sum(e["amount"] for e in expenses)
    count = len(expenses)
    avg_expense = total_expense / count if count > 0 else 0.0
    
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

@router.get("/api/reports/export")
def export_report(
    format: str = Query("csv"),
    start_date: str = Query(...),
    end_date: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    expenses_col = get_collection("expenses")
    query = {
        "user_id": current_user["id"],
        "date": {"$gte": start_date, "$lte": end_date},
        "category": {"$nin": ["Rent", "rent"]}
    }
    expenses = list(expenses_col.find(query).sort("date", -1))
    
    if format == "csv":
        csv_content = "Date,Title,Category,Payment Method,Amount,Description\n"
        for e in expenses:
            desc = e.get('description', '').replace('"', '""')
            csv_content += f"{e['date']},{e['title']},{e['category']},{e['payment_method']},{e['amount']},\"{desc}\"\n"
        return {"content": csv_content, "filename": f"expenses_{start_date}_to_{end_date}.csv"}
    else:
        return {"expenses": serialize_docs(expenses), "format": format}

# --- NOTIFICATIONS ---
@router.get("/api/notifications")
def get_notifications(current_user: dict = Depends(get_current_user)):
    notify_col = get_collection("notifications")
    notifications = list(notify_col.find({"user_email": current_user["email"]}).sort("created_at", -1).limit(50))
    return serialize_docs(notifications)

@router.post("/api/notifications/read")
def mark_notifications_read(current_user: dict = Depends(get_current_user)):
    notify_col = get_collection("notifications")
    notify_col.update_many({"user_email": current_user["email"], "read": False}, {"$set": {"read": True}})
    return {"message": "All notifications marked as read"}

# --- AUDIT LOGS ---
@router.get("/api/audit-logs")
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

# --- RECEIPTS UPLOAD ---
@router.post("/api/receipts/upload")
async def upload_receipt(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    upload_dir = "/home/kv/Projects/MyMoney/backend/uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    filename = f"{current_user['id']}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
        
    return {"url": f"/uploads/{filename}", "filename": file.filename}

from pydantic import BaseModel

class WakeUpLog(BaseModel):
    elapsed_seconds: float
    user_agent: Optional[str] = None

@router.post("/api/telemetry/wakeup")
def log_wakeup(log: WakeUpLog):
    logs_col = get_collection("wakeup_logs")
    log_data = log.model_dump()
    log_data["created_at"] = datetime.utcnow()
    logs_col.insert_one(log_data)
    return {"message": "Telemetry logged successfully"}

