from datetime import datetime
from app.database import get_collection

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

def log_audit_action(user_id: str, user_name: str, action: str, details: str):
    try:
        audit_col = get_collection("audit_logs")
        audit_col.insert_one({
            "user_id": user_id,
            "user_name": user_name,
            "action": action,
            "details": details,
            "created_at": datetime.utcnow()
        })
    except Exception as e:
        print(f"Error logging audit action: {e}")

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

def verify_sharing_access(target_user_email: str, current_user_email: str) -> bool:
    if target_user_email == current_user_email:
        return True
    
    sharing_col = get_collection("sharing")
    # Check if there is an active sharing access entry
    access = sharing_col.find_one({
        "owner_email": target_user_email,
        "shared_with_email": current_user_email
    })
    return access is not None
