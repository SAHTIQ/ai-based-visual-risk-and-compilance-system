"""
ml_forecasting.py
==================
Thin glue layer between the FastAPI routers and the simple ML pipeline in
app/services/ml/.

IMPORTANT: this file does NOT train any model. It only:
  1. Reads the user's own recent records from the database (actual data).
  2. Turns those records into the small feature set each model expects
     (see app/services/ml/predict.py for the exact mapping).
  3. Calls the already-trained model's `.predict(...)` (loaded from .joblib).
  4. Packages "actual data" + "ML prediction" into MetricForecastOut, keeping
     the two clearly separated (see ACTUAL vs PREDICTED below).

There is only ONE ML implementation in this project - this file replaces the
old request-time training/model-comparison logic entirely.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, List, Literal

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.models.financial import FinancialRecord
from app.models.habit import HabitRecord
from app.models.work_session import WorkSession
from app.schemas.forecast import ForecastEvaluation, MetricForecastOut, ModelEvaluation
from app.services.ml import predict as ml_predict
from app.services.ml.preprocessing import FINANCIAL_FEATURES, HABIT_FEATURES, PRODUCTIVITY_FEATURES

ForecastPeriod = Literal["daily", "weekly", "monthly"]

# A forecast is only shown once there is at least this many actual periods of
# history for the user - otherwise we say so plainly instead of guessing.
MIN_REQUIRED_OBSERVATIONS = 3


def _period_start(value: datetime | date, period: ForecastPeriod) -> date:
    d = value.date() if isinstance(value, datetime) else value
    if period == "daily":
        return d
    if period == "weekly":
        return d - timedelta(days=d.weekday())
    return date(d.year, d.month, 1)


def _period_label(period: ForecastPeriod, start: date) -> str:
    if period == "daily":
        return start.strftime("%a, %b %d")
    if period == "weekly":
        end = start + timedelta(days=6)
        return f"{start.strftime('%b %d')}\u2013{end.strftime('%d')}"
    return start.strftime("%b %Y")


def _next_period_label(period: ForecastPeriod) -> str:
    return {"daily": "Tomorrow", "weekly": "Next Week", "monthly": "Next Month"}[period]


def _model_evaluation_entry(model_key: str) -> List[ModelEvaluation]:
    """Expose the independently calculated metrics saved by train.py."""
    info = ml_predict.load_model_info().get(model_key)
    if not info:
        return []
    if info["task"] == "regression":
        return [
            ModelEvaluation(
                model=info["algorithm"],
                train_mae=info["train_mae"],
                test_mae=info["test_mae"],
                train_rmse=info["train_rmse"],
                test_rmse=info["test_rmse"],
                train_r2=info.get("train_r2"),
                test_r2=info.get("test_r2"),
                explained_variance=info.get("test_explained_variance"),
                train_observations=info["training_rows"],
                test_observations=info["test_rows"],
            )
        ]
    # Classification models have classification metrics, not regression metrics.
    return [
        ModelEvaluation(
            model=info["algorithm"],
            train_accuracy=info["train_accuracy"],
            test_accuracy=info["test_accuracy"],
            train_precision=info["train_precision"],
            test_precision=info["test_precision"],
            train_recall=info["train_recall"],
            test_recall=info["test_recall"],
            train_f1=info["train_f1"],
            test_f1=info["test_f1"],
            train_observations=info["training_rows"],
            test_observations=info["test_rows"],
        )
    ]


def _insufficient(metric: str, period: ForecastPeriod, unit: str, observations: int, history: List[dict]) -> MetricForecastOut:
    values = [h["value"] for h in history]
    return MetricForecastOut(
        metric=metric,
        period=period,
        unit=unit,
        current_value=values[-1] if values else 0.0,
        predicted_value=None,
        trend="stable",
        confidence=None,
        model="insufficient_evidence",
        baseline_moving_average=round(float(np.mean(values[-3:])), 1) if values else 0.0,
        historical_observations=observations,
        required_observations=MIN_REQUIRED_OBSERVATIONS,
        status="insufficient_evidence",
        reason=(
            f"At least {MIN_REQUIRED_OBSERVATIONS} periods of your own data are needed "
            f"before showing a prediction; {observations} are available so far."
        ),
        evaluation=None,
        model_evaluations=[],
        evidence=[f"Available observations: {observations}."],
        historical_series=history,
        regression_series=[],
        forecast_series=[],
    )


# ---------------------------------------------------------------------------
# Productivity
# ---------------------------------------------------------------------------
def _actual_productivity(sessions: list) -> float:
    """Simple, explainable statistic: % of logged work time that was focused work."""
    features = ml_predict.build_productivity_features_from_sessions(sessions)
    if features["work_hours"] <= 0:
        return 0.0
    return min(100.0, features["focus_hours"] / features["work_hours"] * 100.0)


def get_productivity_forecast(db: Session, user_id: int, period: ForecastPeriod = "weekly") -> MetricForecastOut:
    sessions = (
        db.query(WorkSession)
        .filter(WorkSession.user_id == user_id, WorkSession.status == "completed")
        .order_by(WorkSession.started_at.asc())
        .all()
    )
    if not sessions:
        return _insufficient("productivity_score", period, "score", 0, [])

    buckets: Dict[date, list] = {}
    for s in sessions:
        buckets.setdefault(_period_start(s.started_at, period), []).append(s)

    periods = sorted(buckets)
    if len(periods) < MIN_REQUIRED_OBSERVATIONS:
        history = [
            {"label": _period_label(period, p), "value": _actual_productivity(buckets[p])}
            for p in periods
        ]
        return _insufficient("productivity_score", period, "score", len(periods), history)

    # Actual data: a simple, transparent statistic (% of work time that was focused work).
    history_periods = periods[-12:]
    labels = [_period_label(period, p) for p in history_periods]
    actual_values = [_actual_productivity(buckets[p]) for p in history_periods]

    # ML prediction: feed each period's aggregated features to the trained model.
    feature_rows = pd.DataFrame(
        [ml_predict.build_productivity_features_from_sessions(buckets[p]) for p in history_periods]
    )[PRODUCTIVITY_FEATURES]
    predicted_series = np.clip(ml_predict.predict_productivity(feature_rows), 0, 100)

    current = actual_values[-1]
    predicted_next = float(predicted_series[-1])
    diff = predicted_next - current
    trend = "stable" if abs(diff) <= max(1.0, abs(current) * 0.02) else ("increasing" if diff > 0 else "decreasing")

    info = ml_predict.load_model_info().get("productivity", {})
    evidence = [
        "Actual values are computed directly from your WorkSession history (focused hours / total work hours).",
        f"The prediction comes from a {info.get('algorithm', 'Linear Regression')} model trained on the "
        "productivity dataset (work_hours, focus_hours, distraction_hours, deep_work_sessions -> productivity_score).",
        f"Model evaluation on chronological held-out data: MAE={info.get('test_mae')}, RMSE={info.get('test_rmse')}, "
        f"R\u00b2={info.get('test_r2')}, Explained Variance={info.get('test_explained_variance')}.",
        f"Predicted {_next_period_label(period).lower()} productivity: {predicted_next:.1f}/100.",
    ]

    return MetricForecastOut(
        metric="productivity_score",
        period=period,
        unit="score",
        current_value=round(current, 1),
        predicted_value=round(predicted_next, 1),
        trend=trend,
        confidence=info.get("test_r2"),
        model=str(info.get("algorithm", "linear_regression")).lower().replace(" ", "_"),
        baseline_moving_average=round(float(np.mean(actual_values[-3:])), 1),
        historical_observations=len(periods),
        required_observations=MIN_REQUIRED_OBSERVATIONS,
        status="valid",
        reason=None,
        evaluation=ForecastEvaluation(
            mae=info.get("test_mae", 0.0),
            rmse=info.get("test_rmse", 0.0),
            r2=info.get("test_r2"),
        ),
        model_evaluations=_model_evaluation_entry("productivity"),
        evidence=evidence,
        historical_series=[{"label": labels[i], "value": round(actual_values[i], 1)} for i in range(len(labels))],
        regression_series=[{"label": labels[i], "value": round(float(predicted_series[i]), 1)} for i in range(len(labels))],
        forecast_series=[
            {"label": labels[-1], "value": round(current, 1)},
            {"label": _next_period_label(period), "value": round(predicted_next, 1)},
        ],
    )


# ---------------------------------------------------------------------------
# Financial
# ---------------------------------------------------------------------------
def get_financial_forecast(db: Session, user_id: int, period: ForecastPeriod = "monthly") -> MetricForecastOut:
    records = (
        db.query(FinancialRecord)
        .filter(FinancialRecord.user_id == user_id)
        .order_by(FinancialRecord.recorded_at.asc())
        .all()
    )
    if not records:
        return _insufficient("expenses", period, "currency", 0, [])

    buckets: Dict[date, list] = {}
    for r in records:
        buckets.setdefault(_period_start(r.recorded_at, period), []).append(r)

    periods = sorted(buckets)
    if len(periods) < MIN_REQUIRED_OBSERVATIONS:
        history = [
            {"label": _period_label(period, p), "value": round(sum(r.expenses for r in buckets[p]), 1)}
            for p in periods
        ]
        return _insufficient("expenses", period, "currency", len(periods), history)

    history_periods = periods[-12:]
    labels = [_period_label(period, p) for p in history_periods]
    actual_values = [round(sum(r.expenses for r in buckets[p]), 1) for p in history_periods]

    feature_rows = pd.DataFrame(
        [ml_predict.build_financial_features_from_records(buckets[p]) for p in history_periods]
    )[FINANCIAL_FEATURES]
    predicted_series = np.clip(ml_predict.predict_financial(feature_rows), 0, None)

    current = actual_values[-1]
    predicted_next = float(predicted_series[-1])
    diff = predicted_next - current
    trend = "stable" if abs(diff) <= max(1.0, abs(current) * 0.02) else ("increasing" if diff > 0 else "decreasing")

    info = ml_predict.load_model_info().get("financial", {})
    evidence = [
        "Actual values are your own recorded expenses, summed per period.",
        f"The prediction comes from a {info.get('algorithm', 'Linear Regression')} model trained on the "
        "finance dataset (weekly_income, savings, budget -> weekly_expenses).",
        f"Model evaluation on chronological held-out data: MAE={info.get('test_mae')}, RMSE={info.get('test_rmse')}, "
        f"R\u00b2={info.get('test_r2')}, Explained Variance={info.get('test_explained_variance')}.",
        f"Predicted {_next_period_label(period).lower()} expenses: {predicted_next:.1f}.",
    ]

    return MetricForecastOut(
        metric="expenses",
        period=period,
        unit="currency",
        current_value=current,
        predicted_value=round(predicted_next, 1),
        trend=trend,
        confidence=info.get("test_r2"),
        model=str(info.get("algorithm", "linear_regression")).lower().replace(" ", "_"),
        baseline_moving_average=round(float(np.mean(actual_values[-3:])), 1),
        historical_observations=len(periods),
        required_observations=MIN_REQUIRED_OBSERVATIONS,
        status="valid",
        reason=None,
        evaluation=ForecastEvaluation(
            mae=info.get("test_mae", 0.0),
            rmse=info.get("test_rmse", 0.0),
            r2=info.get("test_r2"),
        ),
        model_evaluations=_model_evaluation_entry("financial"),
        evidence=evidence,
        historical_series=[{"label": labels[i], "value": actual_values[i]} for i in range(len(labels))],
        regression_series=[{"label": labels[i], "value": round(float(predicted_series[i]), 1)} for i in range(len(labels))],
        forecast_series=[
            {"label": labels[-1], "value": current},
            {"label": _next_period_label(period), "value": round(predicted_next, 1)},
        ],
    )


# ---------------------------------------------------------------------------
# Habit
# ---------------------------------------------------------------------------
def _completion_pct(records: list) -> float:
    if not records:
        return 0.0
    completed = sum(1 for r in records if r.completed)
    return round(completed / len(records) * 100.0, 1)


def get_habit_forecast(db: Session, user_id: int, period: ForecastPeriod = "weekly") -> MetricForecastOut:
    records = (
        db.query(HabitRecord)
        .filter(HabitRecord.user_id == user_id)
        .order_by(HabitRecord.recorded_at.asc())
        .all()
    )
    if not records:
        return _insufficient("habit_consistency", period, "%", 0, [])

    buckets: Dict[date, list] = {}
    for r in records:
        buckets.setdefault(_period_start(r.recorded_at, period), []).append(r)

    periods = sorted(buckets)
    if len(periods) < MIN_REQUIRED_OBSERVATIONS:
        history = [
            {"label": _period_label(period, p), "value": _completion_pct(buckets[p])}
            for p in periods
        ]
        return _insufficient("habit_consistency", period, "%", len(periods), history)

    history_periods = periods[-12:]
    labels = [_period_label(period, p) for p in history_periods]
    actual_values = [_completion_pct(buckets[p]) for p in history_periods]

    feature_rows = pd.DataFrame(
        [ml_predict.build_habit_features_from_records(buckets[p]) for p in history_periods]
    )[HABIT_FEATURES]
    # Use the predicted probability of a "good habit day" as a 0-100 consistency score.
    predicted_series = np.clip(ml_predict.predict_habit_proba(feature_rows) * 100.0, 0, 100)

    current = actual_values[-1]
    predicted_next = float(predicted_series[-1])
    diff = predicted_next - current
    trend = "stable" if abs(diff) <= max(1.0, abs(current) * 0.02) else ("increasing" if diff > 0 else "decreasing")

    info = ml_predict.load_model_info().get("habit", {})
    evidence = [
        "Actual values are your own habit completion rate per period (completed / total habits).",
        f"The prediction comes from a {info.get('algorithm', 'Logistic Regression')} classifier trained on the "
        "habit dataset (routine_consistency -> good habit day, healthy_habit_score \u2265 95).",
        f"Model evaluation on chronological held-out data: accuracy={info.get('test_accuracy')}, "
        f"precision={info.get('test_precision')}, recall={info.get('test_recall')}, F1={info.get('test_f1')}.",
        f"Predicted {_next_period_label(period).lower()} habit consistency: {predicted_next:.1f}%.",
    ]

    return MetricForecastOut(
        metric="habit_consistency",
        period=period,
        unit="%",
        current_value=current,
        predicted_value=round(predicted_next, 1),
        trend=trend,
        confidence=info.get("test_accuracy"),
        model=str(info.get("algorithm", "logistic_regression")).lower().replace(" ", "_"),
        baseline_moving_average=round(float(np.mean(actual_values[-3:])), 1),
        historical_observations=len(periods),
        required_observations=MIN_REQUIRED_OBSERVATIONS,
        status="valid",
        reason=None,
        evaluation=ForecastEvaluation(
            accuracy=info.get("test_accuracy"),
            precision=info.get("test_precision"),
            recall=info.get("test_recall"),
            f1=info.get("test_f1"),
        ),
        model_evaluations=_model_evaluation_entry("habit"),
        evidence=evidence,
        historical_series=[{"label": labels[i], "value": actual_values[i]} for i in range(len(labels))],
        regression_series=[{"label": labels[i], "value": round(float(predicted_series[i]), 1)} for i in range(len(labels))],
        forecast_series=[
            {"label": labels[-1], "value": current},
            {"label": _next_period_label(period), "value": round(predicted_next, 1)},
        ],
    )
