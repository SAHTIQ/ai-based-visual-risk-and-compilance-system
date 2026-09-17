from datetime import date, timedelta
from typing import Dict, List, Tuple
from sqlalchemy.orm import Session
from app.models.habit import HabitRecord
from app.schemas.analytics import HabitMetricItem


def _collapse_by_date(records: List[HabitRecord]) -> Dict[date, bool]:
    """Collapse multiple records on the same calendar date into a single
    completed flag (True if any record on that date was completed)."""
    by_date: Dict[date, bool] = {}
    for r in records:
        by_date[r.recorded_at] = by_date.get(r.recorded_at, False) or r.completed
    return by_date


def compute_habit_streaks_for_name(db: Session, user_id: int, habit_name: str) -> Tuple[int, int]:
    """Convenience wrapper: loads a habit's full history for the user and
    computes (current_streak_days, longest_streak_days) from real records.
    Used by both the /api/habits and /api/analytics/habits endpoints so the
    two pages never disagree on a habit's streak."""
    history = (
        db.query(HabitRecord)
        .filter(HabitRecord.user_id == user_id, HabitRecord.habit_name == habit_name)
        .all()
    )
    return compute_habit_streaks(history)


def compute_habit_streaks(records: List[HabitRecord]) -> Tuple[int, int]:
    """Compute (current_streak_days, longest_streak_days) for one habit's
    full history using a simple, explainable rule: a streak is an unbroken
    run of consecutive calendar days that each have a completed=True record.
    A missing day or a completed=False day breaks the streak.
    """
    if not records:
        return 0, 0

    by_date = _collapse_by_date(records)
    sorted_dates = sorted(by_date.keys())

    # Longest streak anywhere in history
    longest = 0
    run = 0
    prev_date = None
    for d in sorted_dates:
        if by_date[d]:
            if prev_date is not None and (d - prev_date).days == 1:
                run += 1
            else:
                run = 1
            longest = max(longest, run)
        else:
            run = 0
        prev_date = d

    # Current streak, walking backward from the most recent record
    current = 0
    for i in range(len(sorted_dates) - 1, -1, -1):
        d = sorted_dates[i]
        if not by_date[d]:
            break
        if current == 0:
            current = 1
        else:
            next_d = sorted_dates[i + 1]
            if (next_d - d).days == 1:
                current += 1
            else:
                break

    return current, longest


def compute_windowed_frequency(records: List[HabitRecord], today: date, window_days: int) -> Tuple[int, int]:
    """Returns (completed_count, applicable_days) within the trailing window.
    applicable_days is capped by how long the habit has actually been tracked,
    so a newly created habit is not penalized for days before it existed.
    """
    if not records:
        return 0, 0

    by_date = _collapse_by_date(records)
    first_tracked = min(by_date.keys())
    window_start = today - timedelta(days=window_days - 1)
    effective_start = max(window_start, first_tracked)
    applicable_days = (today - effective_start).days + 1
    if applicable_days <= 0:
        return 0, 0

    completed_count = sum(
        1 for d, done in by_date.items() if done and effective_start <= d <= today
    )
    return completed_count, applicable_days


def compute_trend(records: List[HabitRecord]) -> str:
    """Rule-based trend: compares completion rate of the earlier half of the
    habit's recorded history against the more recent half (chronological
    split, no shuffling). Requires at least 4 records to be meaningful."""
    if len(records) < 4:
        return "stable"

    ordered = sorted(records, key=lambda r: r.recorded_at)
    half = len(ordered) // 2
    earlier = ordered[:half]
    recent = ordered[half:]

    earlier_rate = sum(1 for r in earlier if r.completed) / len(earlier)
    recent_rate = sum(1 for r in recent if r.completed) / len(recent)

    if recent_rate > earlier_rate:
        return "increasing"
    elif recent_rate < earlier_rate:
        return "declining"
    return "stable"


def get_habit_analytics(db: Session, user_id: int) -> List[HabitMetricItem]:
    habits = (
        db.query(HabitRecord)
        .filter(HabitRecord.user_id == user_id)
        .order_by(HabitRecord.recorded_at.desc(), HabitRecord.id.desc())
        .all()
    )

    if not habits:
        return []

    # Group all historical records by habit_name so streaks/frequency reflect
    # the habit's full history, not just a single row.
    by_name: Dict[str, List[HabitRecord]] = {}
    for h in habits:
        by_name.setdefault(h.habit_name, []).append(h)

    today = max(h.recorded_at for h in habits)  # anchor "today" to latest recorded data

    items: List[HabitMetricItem] = []
    seen_names = set()
    for h in habits:
        # Emit one metric row per distinct habit name, using the full
        # history of that habit for the calculations.
        if h.habit_name in seen_names:
            continue
        seen_names.add(h.habit_name)

        history = by_name[h.habit_name]
        total = len(history)
        completed_count = sum(1 for r in history if r.completed)
        completion_rate = round((completed_count / total) * 100, 1) if total else 0.0

        current_streak, longest_streak = compute_habit_streaks(history)

        week_completed, week_days = compute_windowed_frequency(history, today, 7)
        month_completed, month_days = compute_windowed_frequency(history, today, 30)

        trend = compute_trend(history)
        latest = max(history, key=lambda r: (r.recorded_at, r.id))

        items.append(HabitMetricItem(
            id=str(latest.id),
            title=latest.habit_name,
            category=latest.category,
            status="Completed" if latest.completed else "Pending",
            duration=latest.duration,
            date=latest.recorded_at.isoformat() if hasattr(latest.recorded_at, 'isoformat') else str(latest.recorded_at),
            completion_rate_pct=completion_rate,
            current_streak_days=current_streak,
            longest_streak_days=longest_streak,
            weekly_frequency=f"{week_completed}/{week_days}",
            monthly_frequency=f"{month_completed}/{month_days}",
            trend=trend,
        ))

    return items
