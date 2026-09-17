from datetime import datetime, date, timedelta, timezone
from typing import List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.work_session import WorkSession
from app.models.habit import HabitRecord
from app.models.financial import FinancialRecord
from app.schemas.analytics import (
    ProductivityAnalyticsOut,
    TimeAllocationItem,
    DailyHeatmapItem,
    ActivityHeatmapCell,
    FinancialAnalyticsOut,
)

FOCUS_ACTIVITIES = {"Coding", "Study", "Project", "Reading"}

def _as_utc(value: datetime) -> datetime:
    """Normalize database timestamps so both PostgreSQL and SQLite values compare safely."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)

def calculate_time_windows(now_utc: datetime):
    today_start = datetime(now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc)
    
    # ISO week start (Monday)
    this_week_start = today_start - timedelta(days=today_start.weekday())
    last_week_start = this_week_start - timedelta(days=7)
    last_week_end = this_week_start - timedelta(seconds=1)
    
    # Month start
    this_month_start = datetime(now_utc.year, now_utc.month, 1, tzinfo=timezone.utc)
    if now_utc.month == 1:
        last_month_start = datetime(now_utc.year - 1, 12, 1, tzinfo=timezone.utc)
    else:
        last_month_start = datetime(now_utc.year, now_utc.month - 1, 1, tzinfo=timezone.utc)
    last_month_end = this_month_start - timedelta(seconds=1)

    return {
        "today_start": today_start,
        "this_week_start": this_week_start,
        "last_week_start": last_week_start,
        "last_week_end": last_week_end,
        "this_month_start": this_month_start,
        "last_month_start": last_month_start,
        "last_month_end": last_month_end,
    }

def get_productivity_analytics(db: Session, user_id: int) -> ProductivityAnalyticsOut:
    now_utc = datetime.now(timezone.utc)
    windows = calculate_time_windows(now_utc)

    # Fetch user's completed work sessions
    sessions = (
        db.query(WorkSession)
        .filter(WorkSession.user_id == user_id, WorkSession.status == "completed")
        .order_by(WorkSession.started_at.asc())
        .all()
    )

    total_work_minutes = sum(s.duration_minutes for s in sessions)
    total_focus_minutes = sum(s.duration_minutes for s in sessions if s.activity_type in FOCUS_ACTIVITIES)

    session_count = len(sessions)
    average_session_minutes = round(total_work_minutes / session_count, 1) if session_count > 0 else 0.0
    longest_session_minutes = max((s.duration_minutes for s in sessions), default=0)

    # Window metrics
    today_minutes = sum(s.duration_minutes for s in sessions if _as_utc(s.started_at) >= windows["today_start"])
    this_week_minutes = sum(s.duration_minutes for s in sessions if _as_utc(s.started_at) >= windows["this_week_start"])
    this_month_minutes = sum(s.duration_minutes for s in sessions if _as_utc(s.started_at) >= windows["this_month_start"])

    # Time allocation
    allocation_dict: Dict[str, int] = {}
    for s in sessions:
        allocation_dict[s.activity_type] = allocation_dict.get(s.activity_type, 0) + s.duration_minutes

    time_allocation: List[TimeAllocationItem] = []
    for act_type, mins in allocation_dict.items():
        pct = round((mins / max(1, total_work_minutes)) * 100, 1)
        time_allocation.append(TimeAllocationItem(
            activity_type=act_type,
            minutes=mins,
            hours=round(mins / 60, 1),
            percentage=pct
        ))
    time_allocation.sort(key=lambda x: x.minutes, reverse=True)

    # Daily Heatmap (past 84 days / 12 weeks)
    start_84_days = (now_utc - timedelta(days=84)).date()
    daily_map: Dict[str, Dict[str, int]] = {}
    
    # Initialize 84 days map
    for i in range(85):
        d_str = (start_84_days + timedelta(days=i)).isoformat()
        daily_map[d_str] = {"minutes": 0, "count": 0}

    # Peak hours and day of week accumulators
    hour_buckets = [0] * 24
    day_name_buckets: Dict[str, int] = {"Monday": 0, "Tuesday": 0, "Wednesday": 0, "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0}

    for s in sessions:
        started_at = _as_utc(s.started_at)
        d_str = started_at.date().isoformat()
        if d_str in daily_map:
            daily_map[d_str]["minutes"] += s.duration_minutes
            daily_map[d_str]["count"] += 1

        start_hour = started_at.hour
        hour_buckets[start_hour] += s.duration_minutes
        
        day_name = started_at.strftime("%A")
        if day_name in day_name_buckets:
            day_name_buckets[day_name] += s.duration_minutes

    daily_heatmap = [
        DailyHeatmapItem(date=d, minutes=val["minutes"], session_count=val["count"])
        for d, val in daily_map.items()
    ]

    # Reference-style behavioral heatmap: weekday columns × 3-hour time bands.
    # It aggregates the same 12-week activity window, making patterns easy to scan.
    heatmap_buckets = [
        (6, 9, "6 AM"),
        (9, 12, "9 AM"),
        (12, 15, "12 PM"),
        (15, 18, "3 PM"),
        (18, 21, "6 PM"),
        (21, 24, "9 PM"),
    ]
    activity_grid = {(day, label): {"minutes": 0, "count": 0}
                     for day in day_name_buckets
                     for _, _, label in heatmap_buckets}
    heatmap_start = (now_utc - timedelta(days=83)).date()
    heatmap_end = now_utc.date()
    for s in sessions:
        started_at = _as_utc(s.started_at)
        if not (heatmap_start <= started_at.date() <= heatmap_end):
            continue
        for start_hour, end_hour, label in heatmap_buckets:
            if start_hour <= started_at.hour < end_hour:
                key = (started_at.strftime("%A"), label)
                activity_grid[key]["minutes"] += s.duration_minutes
                activity_grid[key]["count"] += 1
                break

    activity_heatmap = [
        ActivityHeatmapCell(
            day=day,
            time_label=label,
            minutes=activity_grid[(day, label)]["minutes"],
            session_count=activity_grid[(day, label)]["count"],
        )
        for label in [b[2] for b in heatmap_buckets]
        for day in day_name_buckets
    ]

    # Peak Working Hours calculation
    max_hour = max(range(24), key=lambda h: hour_buckets[h])
    peak_working_hours = f"{max_hour:02d}:00 - {(max_hour + 2) % 24:02d}:00" if hour_buckets[max_hour] > 0 else "09:00 AM - 11:00 AM"

    # Productive Days
    active_days = [day for day, mins in day_name_buckets.items() if mins > 0]
    most_productive_day = max(day_name_buckets.keys(), key=lambda d: day_name_buckets[d]) if active_days else "Tuesday"
    least_productive_day = min(day_name_buckets.keys(), key=lambda d: day_name_buckets[d]) if active_days else "Sunday"

    # Consistency % (Active days in past 28 days / 28).
    # Window is today plus the previous 27 days = exactly 28 calendar days
    # inclusive; using timedelta(days=28) here previously produced a 29-day
    # window, which could push consistency above 100%.
    past_28_start = (now_utc - timedelta(days=27)).date()
    active_dates_past_28 = set(
        _as_utc(s.started_at).date()
        for s in sessions
        if _as_utc(s.started_at).date() >= past_28_start
    )
    consistency_pct = round(min(100.0, (len(active_dates_past_28) / 28.0) * 100), 1)

    # Habit Execution component
    habits = db.query(HabitRecord).filter(HabitRecord.user_id == user_id).all()
    completed_habits = sum(1 for h in habits if h.completed)
    habit_pct = (completed_habits / max(1, len(habits))) * 100 if habits else 75.0

    # Productivity Score (Transparent Formula)
    focus_ratio = (total_focus_minutes / max(1, total_work_minutes))
    focus_comp = round(focus_ratio * 35, 1)
    consistency_comp = round((consistency_pct / 100) * 35, 1)
    habit_comp = round((habit_pct / 100) * 30, 1)
    
    productivity_score = min(100, max(0, int(round(focus_comp + consistency_comp + habit_comp))))

    return ProductivityAnalyticsOut(
        productivity_score=productivity_score,
        score_breakdown={
            "focus_component": focus_comp,
            "consistency_component": consistency_comp,
            "habit_component": habit_comp,
        },
        total_work_minutes=total_work_minutes,
        total_work_hours=round(total_work_minutes / 60, 1),
        total_focus_minutes=total_focus_minutes,
        total_focus_hours=round(total_focus_minutes / 60, 1),
        average_session_minutes=average_session_minutes,
        longest_session_minutes=longest_session_minutes,
        total_sessions_count=session_count,
        daily_work_hours=round(today_minutes / 60, 1),
        weekly_work_hours=round(this_week_minutes / 60, 1),
        monthly_work_hours=round(this_month_minutes / 60, 1),
        consistency_pct=consistency_pct,
        peak_working_hours=peak_working_hours,
        most_productive_day=most_productive_day,
        least_productive_day=least_productive_day,
        time_allocation=time_allocation,
        daily_heatmap=daily_heatmap,
        activity_heatmap=activity_heatmap,
    )

def get_financial_analytics(db: Session, user_id: int) -> FinancialAnalyticsOut:
    records = (
        db.query(FinancialRecord)
        .filter(FinancialRecord.user_id == user_id)
        .order_by(FinancialRecord.recorded_at.asc())
        .all()
    )

    total_income = sum(r.income for r in records)
    total_expenses = sum(r.expenses for r in records)
    total_savings = sum(r.savings for r in records)
    total_budget = sum(r.budget for r in records)

    savings_rate_pct = round((total_savings / max(1.0, total_income)) * 100, 1) if total_income > 0 else 0.0
    budget_usage_pct = round((total_expenses / max(1.0, total_budget)) * 100, 1) if total_budget > 0 else 0.0

    # Determine trend by comparing latest vs earlier half
    if len(records) >= 4:
        half = len(records) // 2
        earlier_exp = sum(r.expenses for r in records[:half])
        recent_exp = sum(r.expenses for r in records[half:])
        expense_trend = "increasing" if recent_exp > earlier_exp else "decreasing"
        
        earlier_inc = sum(r.income for r in records[:half])
        recent_inc = sum(r.income for r in records[half:])
        income_trend = "increasing" if recent_inc >= earlier_inc else "decreasing"
        savings_trend = "increasing" if (recent_inc - recent_exp) > (earlier_inc - earlier_exp) else "stable"
    else:
        income_trend = "stable"
        expense_trend = "stable"
        savings_trend = "stable"

    return FinancialAnalyticsOut(
        total_income=total_income,
        total_expenses=total_expenses,
        total_savings=total_savings,
        total_budget=total_budget,
        savings_rate_pct=savings_rate_pct,
        budget_usage_pct=budget_usage_pct,
        income_trend=income_trend,
        expense_trend=expense_trend,
        savings_trend=savings_trend,
    )
