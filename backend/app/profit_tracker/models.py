from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class DailyProfitRecord(BaseModel):
    id: Optional[str] = None
    user_id: str
    date: str  # YYYY-MM-DD
    amount: float
    note: Optional[str] = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class RecordProfitRequest(BaseModel):
    date: str  # YYYY-MM-DD
    amount: float
    note: Optional[str] = ""

class UpdateProfitRequest(BaseModel):
    id: Optional[str] = None
    date: Optional[str] = None
    amount: Optional[float] = None
    note: Optional[str] = None

class ProfitSummaryResponse(BaseModel):
    total_profit: float
    profitable_days: int
    no_profit_days: int
    loss_days: int
    average_profit_on_profitable_days: float
    highest_profit: float
    lowest_profit: float
    daily_records: List[Dict[str, Any]] = []
