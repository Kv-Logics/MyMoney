from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# User schemas
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    currency: str = "INR"
    theme: str = "dark"
    language: str = "en"
    timezone: str = "UTC"

# Expense schemas
class ExpenseCreate(BaseModel):
    amount: float = Field(..., gt=0)
    title: str = Field(..., min_length=1)
    description: Optional[str] = ""
    category: str
    payment_method: str
    date: str # YYYY-MM-DD
    time: Optional[str] = ""
    location: Optional[str] = ""
    receipt_image: Optional[str] = ""
    notes: Optional[str] = ""

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    payment_method: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    receipt_image: Optional[str] = None
    notes: Optional[str] = None

# Category schemas
class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1)
    color: Optional[str] = "#3B82F6"
    icon: Optional[str] = "Folder"

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

# Budget schemas
class BudgetCreate(BaseModel):
    category: str # "Overall" or specific category name
    amount: float = Field(..., gt=0)

# Invitation schemas
class InvitationCreate(BaseModel):
    email: EmailStr
    permission: str = "view" # "view" only (MVPs requirement)

# Savings Goal schemas
class SavingsGoalCreate(BaseModel):
    title: str = Field(..., min_length=1)
    target_amount: float = Field(..., gt=0)
    saved_amount: float = Field(0.0, ge=0)

class SavingsGoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount: Optional[float] = None
    saved_amount: Optional[float] = None

# Settings schemas
class SettingsUpdate(BaseModel):
    currency: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
