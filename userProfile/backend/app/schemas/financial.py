from datetime import datetime, date
from pydantic import BaseModel, Field
from typing import Optional

class FinancialRecordBase(BaseModel):
    income: float = Field(0.0, ge=0.0, description="Income must be non-negative")
    expenses: float = Field(0.0, ge=0.0, description="Expenses must be non-negative")
    savings: float = Field(0.0, ge=0.0, description="Savings must be non-negative")
    budget: float = Field(0.0, ge=0.0, description="Budget must be non-negative")
    expense_category: str = Field(..., min_length=1, max_length=100)
    financial_goal: Optional[str] = None
    recorded_at: date

class FinancialRecordCreate(FinancialRecordBase):
    pass

class FinancialRecordUpdate(BaseModel):
    income: Optional[float] = Field(None, ge=0.0)
    expenses: Optional[float] = Field(None, ge=0.0)
    savings: Optional[float] = Field(None, ge=0.0)
    budget: Optional[float] = Field(None, ge=0.0)
    expense_category: Optional[str] = Field(None, min_length=1, max_length=100)
    financial_goal: Optional[str] = None
    recorded_at: Optional[date] = None

class FinancialRecordOut(FinancialRecordBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
