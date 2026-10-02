from typing import Optional, Dict, Any, List
from app.profit_tracker.repository import profit_repo

class DailyProfitService:
    @staticmethod
    def record_profit(user_id: str, date: str, amount: float, note: Optional[str] = "") -> Dict[str, Any]:
        return profit_repo.upsert_profit(user_id=user_id, date=date, amount=amount, note=note)

    @staticmethod
    def get_profit_by_date(user_id: str, date: str) -> Optional[Dict[str, Any]]:
        return profit_repo.get_by_date(user_id=user_id, date=date)

    @staticmethod
    def list_profits(user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
        return profit_repo.list_range(user_id=user_id, start_date=start_date, end_date=end_date)

    @staticmethod
    def update_profit(user_id: str, key: str, amount: Optional[float] = None, note: Optional[str] = None) -> Dict[str, Any]:
        return profit_repo.update_record(user_id=user_id, key=key, amount=amount, note=note)

    @staticmethod
    def delete_profit(user_id: str, key: str) -> bool:
        return profit_repo.delete_record(user_id=user_id, key=key)

    @staticmethod
    def get_summary(user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
        records = profit_repo.list_range(user_id=user_id, start_date=start_date, end_date=end_date)

        if not records:
            return {
                "total_profit": 0.0,
                "profitable_days": 0,
                "no_profit_days": 0,
                "loss_days": 0,
                "average_profit_on_profitable_days": 0.0,
                "highest_profit": 0.0,
                "lowest_profit": 0.0,
                "daily_records": []
            }

        amounts = [r["amount"] for r in records]
        total_profit = sum(amounts)

        profitable_amounts = [a for a in amounts if a > 0]
        no_profit_count = sum(1 for a in amounts if a == 0)
        loss_count = sum(1 for a in amounts if a < 0)

        profitable_days = len(profitable_amounts)
        avg_profitable = (sum(profitable_amounts) / profitable_days) if profitable_days > 0 else 0.0

        highest_profit = max(amounts)
        lowest_profit = min(amounts)

        return {
            "total_profit": round(total_profit, 2),
            "profitable_days": profitable_days,
            "no_profit_days": no_profit_count,
            "loss_days": loss_count,
            "average_profit_on_profitable_days": round(avg_profitable, 2),
            "highest_profit": round(highest_profit, 2),
            "lowest_profit": round(lowest_profit, 2),
            "daily_records": records
        }

profit_service = DailyProfitService()
