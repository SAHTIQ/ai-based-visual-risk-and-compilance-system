"""
predict.py
==========
Inference only. FastAPI imports these functions and never calls `.fit()`.

Each `predict_*` function does exactly two things:
    1. model = joblib.load(...)
    2. return model.predict(input_data)

The `build_*_features_from_*` helpers turn the application's own database
rows (WorkSession, FinancialRecord, HabitRecord) into the same feature
columns the model was trained on (see preprocessing.py for the mapping).
"""

import json
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Iterable

import joblib
import pandas as pd

from app.models.financial import FinancialRecord
from app.models.habit import HabitRecord
from app.models.work_session import WorkSession
from app.services.ml.preprocessing import (
    FINANCIAL_FEATURES,
    HABIT_FEATURES,
    PRODUCTIVITY_FEATURES,
)

MODELS_DIR = Path(__file__).resolve().parent / "models"

# Activities counted as "focused" work, matching how the app already
# categorizes sessions elsewhere (e.g. deep-work / coding / study time).
FOCUS_ACTIVITIES = {"Coding", "Study", "Project", "Reading"}
DEEP_WORK_ACTIVITIES = {"Coding", "Project"}


@lru_cache(maxsize=1)
def _load_model(filename: str):
    path = MODELS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(
            f"{filename} not found in {MODELS_DIR}. "
            "Run `python -m app.services.ml.train` from the backend/ folder first."
        )
    return joblib.load(path)


def load_model_info() -> dict:
    """Read the metrics saved by train.py, for the UI's 'model information' section."""
    info_path = MODELS_DIR / "model_info.json"
    if not info_path.exists():
        return {}
    with open(info_path) as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Productivity
# ---------------------------------------------------------------------------
def predict_productivity(input_data: pd.DataFrame) -> "pd.Series[float]":
    """input_data must have columns PRODUCTIVITY_FEATURES."""
    model = _load_model("productivity_model.joblib")
    return model.predict(input_data[PRODUCTIVITY_FEATURES])


def build_productivity_features_from_sessions(sessions: Iterable[WorkSession]) -> dict:
    """Aggregate a user's WorkSession rows into the productivity model's features."""
    work_hours = 0.0
    focus_hours = 0.0
    deep_work_sessions = 0
    for s in sessions:
        hours = max(0.0, float(s.duration_minutes) / 60.0)
        work_hours += hours
        if s.activity_type in FOCUS_ACTIVITIES:
            focus_hours += hours
        if s.activity_type in DEEP_WORK_ACTIVITIES:
            deep_work_sessions += 1

    return {
        "work_hours": work_hours,
        "focus_hours": focus_hours,
        "distraction_hours": max(0.0, work_hours - focus_hours),
        "deep_work_sessions": deep_work_sessions,
    }


# ---------------------------------------------------------------------------
# Financial
# ---------------------------------------------------------------------------
def predict_financial(input_data: pd.DataFrame) -> "pd.Series[float]":
    """input_data must have columns FINANCIAL_FEATURES."""
    model = _load_model("financial_model.joblib")
    return model.predict(input_data[FINANCIAL_FEATURES])


def build_financial_features_from_records(records: Iterable[FinancialRecord]) -> dict:
    """Use the most recent financial record as the model's input row."""
    records = list(records)
    if not records:
        return {"weekly_income": 0.0, "savings": 0.0, "budget": 0.0}
    latest = records[-1]
    return {
        "weekly_income": float(latest.income),
        "savings": float(latest.savings),
        "budget": float(latest.budget),
    }


# ---------------------------------------------------------------------------
# Habit
# ---------------------------------------------------------------------------
def predict_habit(input_data: pd.DataFrame) -> "pd.Series[int]":
    """input_data must have columns HABIT_FEATURES. Returns 0/1 class labels."""
    model = _load_model("habit_model.joblib")
    return model.predict(input_data[HABIT_FEATURES])


def predict_habit_proba(input_data: pd.DataFrame) -> "pd.Series[float]":
    """Probability of class 1 ('good habit day'), for a friendlier UI number."""
    model = _load_model("habit_model.joblib")
    return model.predict_proba(input_data[HABIT_FEATURES])[:, 1]


def build_habit_features_from_records(records: Iterable[HabitRecord]) -> dict:
    """Map the app's habit completion rate onto the model's routine_consistency feature."""
    records = list(records)
    if not records:
        return {"routine_consistency": 0.0}
    completed = sum(1 for r in records if r.completed)
    completion_rate = completed / len(records)
    return {"routine_consistency": completion_rate}
