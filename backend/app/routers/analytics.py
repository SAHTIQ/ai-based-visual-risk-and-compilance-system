from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.auth import get_current_user
from app.schemas.analytics import ProductivityAnalyticsOut, FinancialAnalyticsOut, HabitMetricItem
from app.services.analytics_service import get_productivity_analytics, get_financial_analytics
from app.services.habit_analytics import get_habit_analytics

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/productivity", response_model=ProductivityAnalyticsOut)
def get_productivity_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_productivity_analytics(db, current_user.id)

@router.get("/financial", response_model=FinancialAnalyticsOut)
def get_financial_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_financial_analytics(db, current_user.id)

@router.get("/habits", response_model=List[HabitMetricItem])
def get_habit_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_habit_analytics(db, current_user.id)
