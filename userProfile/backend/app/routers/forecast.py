from typing import Literal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.auth import get_current_user
from app.schemas.forecast import MetricForecastOut
from app.services.ml_forecasting import (
    get_productivity_forecast,
    get_financial_forecast,
    get_habit_forecast,
)

router = APIRouter(prefix="/api/forecast", tags=["Predictive Analytics"])

ForecastPeriod = Literal["daily", "weekly", "monthly"]

@router.get("/productivity", response_model=MetricForecastOut)
def forecast_productivity(
    period: ForecastPeriod = Query("weekly"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_productivity_forecast(db, current_user.id, period)

@router.get("/financial", response_model=MetricForecastOut)
def forecast_financial(
    period: ForecastPeriod = Query("monthly"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_financial_forecast(db, current_user.id, period)

@router.get("/habits", response_model=MetricForecastOut)
def forecast_habits(
    period: ForecastPeriod = Query("weekly"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_habit_forecast(db, current_user.id, period)

