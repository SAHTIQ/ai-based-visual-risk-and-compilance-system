"""
expand_datasets.py
==================
Expands the 7 CSV datasets in datasets/ to provide full 1-year historical coverage:
September 28, 2025 through September 28, 2026 (366 days).

Features:
- Preserves all 840 original rows (2026-01-05 to 2026-03-29) completely untouched.
- Deterministic random seed (seed=42) for 100% reproducible synthetic generation.
- Generates 282 new days per user for U001-U010 (total 3,660 rows per dataset).
- Enforces strict inter-dataset correlations (hours, expenses, habits, scores).
- Fully idempotent: will not duplicate if already expanded.
"""

import os
import math
import random
from datetime import date, timedelta
import numpy as np
import pandas as pd

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATASETS_DIR = os.path.join(ROOT_DIR, "datasets")

TARGET_START = date(2025, 9, 28)
TARGET_END = date(2026, 9, 28)
TOTAL_DAYS = (TARGET_END - TARGET_START).days + 1  # 366 days

USERS = [f"U{i:03d}" for i in range(1, 11)]

# User archetypes to maintain realistic user-specific variances
USER_ARCHETYPES = {
    "U001": {"work_base": 6.5, "study_base": 2.8, "spend_base": 2400.0, "sleep_base": 7.6, "focus": 0.88},
    "U002": {"work_base": 7.0, "study_base": 3.5, "spend_base": 2100.0, "sleep_base": 7.3, "focus": 0.92},
    "U003": {"work_base": 5.8, "study_base": 2.2, "spend_base": 2800.0, "sleep_base": 7.8, "focus": 0.82},
    "U004": {"work_base": 6.2, "study_base": 3.0, "spend_base": 2300.0, "sleep_base": 7.5, "focus": 0.85},
    "U005": {"work_base": 7.4, "study_base": 2.0, "spend_base": 2900.0, "sleep_base": 7.1, "focus": 0.90},
    "U006": {"work_base": 6.0, "study_base": 2.5, "spend_base": 2200.0, "sleep_base": 7.7, "focus": 0.84},
    "U007": {"work_base": 6.8, "study_base": 3.2, "spend_base": 2500.0, "sleep_base": 7.4, "focus": 0.87},
    "U008": {"work_base": 5.5, "study_base": 1.8, "spend_base": 1900.0, "sleep_base": 8.0, "focus": 0.80},
    "U009": {"work_base": 7.2, "study_base": 2.6, "spend_base": 2700.0, "sleep_base": 7.2, "focus": 0.89},
    "U010": {"work_base": 6.4, "study_base": 2.4, "spend_base": 2350.0, "sleep_base": 7.6, "focus": 0.86},
}

def generate_synthetic_record_bundle(user_id: str, cur_date: date, day_idx: int, rng: np.random.Generator):
    """Generate aligned, realistic cross-dataset record values for one user and date."""
    arch = USER_ARCHETYPES[user_id]
    day_of_week = cur_date.strftime("%A")
    weekday_num = cur_date.weekday()
    is_weekend = (weekday_num >= 5)

    # Seasonal and cyclical trends
    day_of_year = cur_date.timetuple().tm_yday
    season_factor = 1.0 + 0.08 * math.sin((day_of_year / 365.25) * 2 * math.pi)
    week_idx = (cur_date - TARGET_START).days // 7 + 1

    # 1. Features
    feature_row = {
        "user_id": user_id,
        "week": week_idx,
        "date": cur_date.isoformat(),
        "day_of_week": day_of_week,
        "week_number": week_idx,
    }

    # 2. Work & Productivity
    if is_weekend:
        work_hours = round(max(0.5, float(rng.normal(2.0, 0.8))), 2)
        tasks_planned = int(rng.integers(1, 4))
        deep_work = int(rng.integers(0, 2))
    else:
        work_hours = round(max(2.0, min(11.0, float(rng.normal(arch["work_base"] * season_factor, 1.1)))), 2)
        tasks_planned = int(rng.integers(4, 9))
        deep_work = int(rng.integers(1, 5))

    focus_ratio = max(0.2, min(0.9, arch["focus"] + float(rng.normal(0, 0.05))))
    focus_hours = round(work_hours * focus_ratio, 2)
    distraction_hours = round(max(0.2, work_hours - focus_hours), 2)
    productive_hours = round(focus_hours + distraction_hours * 0.25, 2)
    tasks_completed = int(min(tasks_planned, max(0, int(tasks_planned * (focus_ratio + rng.uniform(-0.1, 0.1))))))
    tasks_pending = max(0, tasks_planned - tasks_completed)
    completion_rate = round((tasks_completed / max(1, tasks_planned)) * 100, 2)
    productivity_score = round(max(15.0, min(98.0, 30.0 + (productive_hours / 8.0) * 45.0 + (completion_rate * 0.25))), 2)

    prod_row = {
        "user_id": user_id,
        "week": week_idx,
        "date": cur_date.isoformat(),
        "day_of_week": day_of_week,
        "week_number": week_idx,
        "tasks_planned": tasks_planned,
        "tasks_completed": tasks_completed,
        "tasks_pending": tasks_pending,
        "productive_hours": productive_hours,
        "work_hours": work_hours,
        "focus_hours": focus_hours,
        "distraction_hours": distraction_hours,
        "task_completion_rate": completion_rate,
        "productivity_score": productivity_score,
        "deep_work_sessions": deep_work,
    }

    # 3. Management
    planned_hours = round(work_hours + float(rng.normal(0.6, 0.4)), 2)
    actual_hours = work_hours
    adherence = round(min(1.0, max(0.4, actual_hours / max(1.0, planned_hours))), 2)
    time_mgmt_score = round(max(40.0, min(98.0, 50.0 + adherence * 35.0 + rng.uniform(-5.0, 10.0))), 2)
    late_tasks = int(rng.integers(0, 3 if not is_weekend else 2))
    deadline_misses = int(1 if rng.uniform(0, 1) < 0.08 else 0)
    planning_sessions = int(rng.integers(1, 3) if not is_weekend else rng.integers(0, 2))
    priority_tasks = int(max(0, min(tasks_completed, int(rng.integers(1, 4)))))

    mgmt_row = {
        "user_id": user_id,
        "week": week_idx,
        "date": cur_date.isoformat(),
        "day_of_week": day_of_week,
        "week_number": week_idx,
        "planned_hours": planned_hours,
        "actual_hours": actual_hours,
        "schedule_adherence": adherence,
        "time_management_score": time_mgmt_score,
        "late_tasks": late_tasks,
        "deadline_misses": deadline_misses,
        "planning_sessions": planning_sessions,
        "priority_tasks_completed": priority_tasks,
    }

    # 4. Habits
    sleep_hours = round(max(5.0, min(10.5, float(rng.normal(arch["sleep_base"], 0.7)))), 2)
    exercise_hours = round(max(0.0, min(2.0, float(rng.normal(0.7, 0.4)))), 2)
    screen_time = round(max(1.5, min(9.0, work_hours * 0.75 + float(rng.normal(1.2, 0.5)))), 2)
    social_media = round(max(0.2, min(4.0, float(rng.normal(1.5, 0.5)))), 2)
    break_hours = round(max(0.5, min(4.5, float(rng.normal(2.2, 0.5)))), 2)
    leisure_hours = round(max(1.0, min(7.0, float(rng.normal(3.2, 0.8)))), 2)
    wake_up = round(max(5.5, min(9.5, 7.5 + float(rng.normal(0, 0.6)))), 2)
    bed_time = round(wake_up + 16.0 + float(rng.normal(0, 0.4)), 2)
    consistency = round(max(0.65, min(0.98, float(rng.normal(0.91, 0.05)))), 3)
    healthy_score = round(max(70.0, min(98.0, 60.0 + (sleep_hours / 8.0) * 20.0 + (exercise_hours * 10.0) + consistency * 10.0)), 2)

    habit_row = {
        "user_id": user_id,
        "week": week_idx,
        "date": cur_date.isoformat(),
        "day_of_week": day_of_week,
        "week_number": week_idx,
        "sleep_hours": sleep_hours,
        "exercise_hours": exercise_hours,
        "screen_time": screen_time,
        "social_media_hours": social_media,
        "break_hours": break_hours,
        "leisure_hours": leisure_hours,
        "wake_up_time": wake_up,
        "bed_time": bed_time,
        "routine_consistency": consistency,
        "healthy_habit_score": healthy_score,
    }

    # 5. Finance
    weekly_income = round(max(300.0, float(rng.normal(1400.0, 200.0))), 2)
    budget = round(max(900.0, float(rng.normal(arch["spend_base"] + 300.0, 300.0))), 2)
    weekly_expenses = round(max(800.0, float(rng.normal(arch["spend_base"], 350.0))), 2)
    essential = round(weekly_expenses * float(rng.uniform(0.55, 0.70)), 2)
    nonessential = round(weekly_expenses - essential, 2)
    savings = round(weekly_income - weekly_expenses + float(rng.normal(0, 50.0)), 2)
    budget_used = weekly_expenses
    budget_remaining = round(budget - budget_used, 2)
    savings_rate = round(max(-80.0, min(60.0, (savings / max(1.0, weekly_income)) * 100.0)), 2)
    expense_count = int(rng.integers(6, 22))
    overspending = 1 if budget_remaining < 0 else 0
    stress_score = int(min(10, max(2, int(7 + (3 if overspending else -1) + rng.integers(-1, 2)))))

    fin_row = {
        "user_id": user_id,
        "week": week_idx,
        "date": cur_date.isoformat(),
        "day_of_week": day_of_week,
        "week_number": week_idx,
        "weekly_income": weekly_income,
        "weekly_expenses": weekly_expenses,
        "essential_expenses": essential,
        "nonessential_expenses": nonessential,
        "savings": savings,
        "budget": budget,
        "budget_used": budget_used,
        "budget_remaining": budget_remaining,
        "savings_rate": savings_rate,
        "expense_count": expense_count,
        "financial_stress_score": stress_score,
        "overspending_flag": overspending,
    }

    # 6. Study
    if is_weekend:
        study_hours = round(max(0.5, float(rng.normal(arch["study_base"] * 0.7, 0.6))), 2)
        study_sessions = int(rng.integers(1, 3))
    else:
        study_hours = round(max(1.0, min(6.0, float(rng.normal(arch["study_base"], 0.8)))), 2)
        study_sessions = int(rng.integers(1, 4))
    avg_session_duration = round(study_hours / max(1, study_sessions), 2)
    assign_comp = int(1 if rng.uniform(0, 1) < 0.35 else 0)
    assign_pend = int(rng.integers(0, 3))
    attendance = round(max(65.0, min(99.0, float(rng.normal(90.0, 5.0)))), 2)
    subjects_studied = int(rng.integers(1, 4))
    revision_hours = round(study_hours * 0.25, 2)
    practice_hours = round(study_hours * 0.30, 2)
    test_score = round(max(60.0, min(99.0, float(rng.normal(84.0, 7.0)))), 2)
    learning_progress = round(max(70.0, min(100.0, float(rng.normal(94.0, 4.0)))), 2)

    study_row = {
        "user_id": user_id,
        "week": week_idx,
        "date": cur_date.isoformat(),
        "day_of_week": day_of_week,
        "week_number": week_idx,
        "study_hours": study_hours,
        "study_sessions": study_sessions,
        "average_session_duration": avg_session_duration,
        "assignments_completed": assign_comp,
        "assignments_pending": assign_pend,
        "attendance_rate": attendance,
        "subjects_studied": subjects_studied,
        "revision_hours": revision_hours,
        "practice_hours": practice_hours,
        "test_score": test_score,
        "learning_progress": learning_progress,
    }

    # 7. Wellbeing
    stress = int(min(10, max(2, int(rng.normal(5.8 + (1 if overspending else 0), 1.4)))))
    energy = int(min(10, max(1, int(rng.normal(5.5 + (exercise_hours * 0.8) - (stress * 0.3), 1.3)))))
    mood = int(min(10, max(1, int(rng.normal(5.0 + (energy * 0.4) - (stress * 0.3), 1.2)))))
    motivation = int(min(10, max(2, int(rng.normal(6.5, 1.2)))))
    health = int(min(10, max(4, int(rng.normal(8.2, 0.9)))))

    wellbeing_row = {
        "user_id": user_id,
        "week": week_idx,
        "date": cur_date.isoformat(),
        "day_of_week": day_of_week,
        "week_number": week_idx,
        "stress_level": stress,
        "energy_level": energy,
        "mood_score": mood,
        "motivation_score": motivation,
        "health_score": health,
    }

    return feature_row, fin_row, habit_row, mgmt_row, prod_row, study_row, wellbeing_row


def expand_all_datasets():
    rng = np.random.default_rng(42)

    # 1. Load all 7 existing CSV files
    file_map = {
        "features": "user_time_features_10users_12weeks.csv",
        "finance": "user_time_finance_10users_12weeks.csv",
        "habit": "user_time_habit_10users_12weeks.csv",
        "management": "user_time_management_10users_12weeks.csv",
        "productivity": "user_time_productivity_10users_12weeks.csv",
        "study": "user_time_study_10users_12weeks.csv",
        "wellbeing": "user_time_wellbeing_10users_12weeks.csv",
    }

    dfs = {k: pd.read_csv(os.path.join(DATASETS_DIR, fname)) for k, fname in file_map.items()}

    # Check existing date coverage
    features_df = dfs["features"]
    existing_dates = set(features_df["date"].unique())
    print(f"Existing date count: {len(existing_dates)} (min={min(existing_dates)}, max={max(existing_dates)})")

    # Generate complete date sequence
    all_target_dates = [TARGET_START + timedelta(days=i) for i in range(TOTAL_DAYS)]
    missing_dates = [d for d in all_target_dates if d.isoformat() not in existing_dates]
    print(f"Target total days: {TOTAL_DAYS}. Missing days to generate: {len(missing_dates)}")

    if not missing_dates:
        print("All target dates already covered. No generation required.")
        return

    new_rows = {k: [] for k in file_map}

    for day_idx, d in enumerate(missing_dates):
        for user_id in USERS:
            f_row, fin_row, h_row, m_row, p_row, s_row, w_row = generate_synthetic_record_bundle(user_id, d, day_idx, rng)
            new_rows["features"].append(f_row)
            new_rows["finance"].append(fin_row)
            new_rows["habit"].append(h_row)
            new_rows["management"].append(m_row)
            new_rows["productivity"].append(p_row)
            new_rows["study"].append(s_row)
            new_rows["wellbeing"].append(w_row)

    for k, fname in file_map.items():
        original_df = dfs[k]
        new_df = pd.DataFrame(new_rows[k])
        # Concatenate and sort deterministically by date and user_id
        combined = pd.concat([original_df, new_df], ignore_index=True)
        combined.sort_values(by=["date", "user_id"], inplace=True)
        combined.drop_duplicates(subset=["user_id", "date"], keep="first", inplace=True)

        target_path = os.path.join(DATASETS_DIR, fname)
        combined.to_csv(target_path, index=False)
        print(f"Saved {fname}: {len(combined)} records (Coverage: {combined['date'].min()} to {combined['date'].max()})")


if __name__ == "__main__":
    expand_all_datasets()
