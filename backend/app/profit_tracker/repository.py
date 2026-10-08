from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
from pymongo import ASCENDING
from app.database import get_collection
from app.utils import serialize_doc, serialize_docs

class DailyProfitRepository:
    def __init__(self):
        self._indexes_created = False

    def _get_col(self):
        col = get_collection("daily_profits")
        if not self._indexes_created:
            try:
                col.create_index([("user_id", ASCENDING), ("date", ASCENDING)], unique=True)
                self._indexes_created = True
            except Exception as e:
                # Log or ignore if index already exists
                pass
        return col

    def upsert_profit(self, user_id: str, date: str, amount: float, note: str = "") -> Dict[str, Any]:
        col = self._get_col()
        now = datetime.utcnow()
        existing = col.find_one({"user_id": user_id, "date": date})

        if existing:
            col.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "amount": float(amount),
                    "note": note if note is not None else existing.get("note", ""),
                    "updated_at": now
                }}
            )
            updated = col.find_one({"_id": existing["_id"]})
            result = serialize_doc(updated)
            result["action"] = "updated"
            return result
        else:
            new_doc = {
                "user_id": user_id,
                "date": date,
                "amount": float(amount),
                "note": note or "",
                "created_at": now,
                "updated_at": now
            }
            res = col.insert_one(new_doc)
            new_doc["_id"] = res.inserted_id
            result = serialize_doc(new_doc)
            result["action"] = "created"
            return result

    def get_by_date(self, user_id: str, date: str) -> Optional[Dict[str, Any]]:
        col = self._get_col()
        doc = col.find_one({"user_id": user_id, "date": date})
        return serialize_doc(doc) if doc else None

    def get_by_id(self, user_id: str, profit_id: str) -> Optional[Dict[str, Any]]:
        col = self._get_col()
        try:
            doc = col.find_one({"_id": ObjectId(profit_id), "user_id": user_id})
            return serialize_doc(doc) if doc else None
        except Exception:
            return None

    def list_range(self, user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
        col = self._get_col()
        query: Dict[str, Any] = {"user_id": user_id}

        if start_date or end_date:
            query["date"] = {}
            if start_date:
                query["date"]["$gte"] = start_date
            if end_date:
                query["date"]["$lte"] = end_date

        docs = list(col.find(query).sort([("date", 1)]))
        return serialize_docs(docs)

    def update_record(self, user_id: str, key: str, amount: Optional[float] = None, note: Optional[str] = None) -> Dict[str, Any]:
        col = self._get_col()
        doc = None

        # Try finding by ObjectId first, fallback to date
        try:
            doc = col.find_one({"_id": ObjectId(key), "user_id": user_id})
        except Exception:
            doc = col.find_one({"date": key, "user_id": user_id})

        if not doc:
            raise ValueError("Profit record not found or unauthorized")

        updates: Dict[str, Any] = {"updated_at": datetime.utcnow()}
        if amount is not None:
            updates["amount"] = float(amount)
        if note is not None:
            updates["note"] = note

        col.update_one({"_id": doc["_id"]}, {"$set": updates})
        updated = col.find_one({"_id": doc["_id"]})
        return serialize_doc(updated)

    def delete_record(self, user_id: str, key: str) -> bool:
        col = self._get_col()
        # Try finding by ObjectId first, fallback to date
        try:
            res = col.delete_one({"_id": ObjectId(key), "user_id": user_id})
            if res.deleted_count > 0:
                return True
        except Exception:
            pass

        res = col.delete_one({"date": key, "user_id": user_id})
        return res.deleted_count > 0

profit_repo = DailyProfitRepository()
