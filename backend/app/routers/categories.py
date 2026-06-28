from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import get_collection
from app.auth import get_current_user
from app.models import CategoryCreate
from app.utils import serialize_doc, serialize_docs, DEFAULT_CATEGORIES

router = APIRouter(prefix="/api/categories", tags=["Categories"])

@router.get("")
def get_categories(current_user: dict = Depends(get_current_user)):
    categories_col = get_collection("categories")
    custom = list(categories_col.find({"user_id": current_user["id"]}))
    return DEFAULT_CATEGORIES + serialize_docs(custom)

@router.post("")
def create_category(cat: CategoryCreate, current_user: dict = Depends(get_current_user)):
    categories_col = get_collection("categories")
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

@router.delete("/{cat_id}")
def delete_category(cat_id: str, current_user: dict = Depends(get_current_user)):
    categories_col = get_collection("categories")
    res = categories_col.delete_one({"_id": ObjectId(cat_id), "user_id": current_user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found or default")
    return {"message": "Category deleted"}
