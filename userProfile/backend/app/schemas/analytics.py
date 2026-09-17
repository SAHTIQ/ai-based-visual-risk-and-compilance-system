from pydantic import BaseModel
from typing import List, Dict, Optional

class TimeAllocationItem(BaseModel):
    activity_type: str
    minutes: int
    hours: float
    percentage: float

class DailyHeatmapItem(BaseModel):
    date: str
    minutes: int
    session_count: int

class ActivityHeatmapCell(BaseModel):
    day: str
    time_label: str
    minutes: int
    session_count: int

class HabitMetricItem(BaseModel):
    id: str
    title: str
    category: str
    status: str
    duration: str
    date: str
    completion_rate_pct: float
    current_streak_days: int
    longest_streak_days: int
    weekly_frequency: str  # e.g., "5/7"
    monthly_frequency: str # e.g., "22/30"
    trend: str             # "increasing", "stable", "declining"

class FinancialAnalyticsOut(BaseModel):
    total_income: float
    total_expenses: float
    total_savings: float
    total_budget: float
    savings_rate_pct: float
    budget_usage_pct: float
    income_trend: str
    expense_trend: str
    savings_trend: str

class ProductivityAnalyticsOut(BaseModel):
    productivity_score: int
    score_breakdown: Dict[str, float]  # focus, consistency, habits
    total_work_minutes: int
    total_work_hours: float
    total_focus_minutes: int
    total_focus_hours: float
    average_session_minutes: float
    longest_session_minutes: int
    total_sessions_count: int
    daily_work_hours: float
    weekly_work_hours: float
    monthly_work_hours: float
    consistency_pct: float
    peak_working_hours: str           # e.g., "09:00 AM - 11:00 AM"
    most_productive_day: str          # e.g., "Tuesday"
    least_productive_day: str         # e.g., "Sunday"
    time_allocation: List[TimeAllocationItem]
    daily_heatmap: List[DailyHeatmapItem]
    activity_heatmap: List[ActivityHeatmapCell]
