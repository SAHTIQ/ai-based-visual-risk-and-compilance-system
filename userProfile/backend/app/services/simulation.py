from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from statistics import mean

from sqlalchemy.orm import Session

from app.models.work_session import WorkSession
from app.schemas.simulation import (
    SimulationDay,
    SimulationResponse,
    SimulationScenario,
    SimulationSummary,
)
from app.services.ml import predict as ml_predict
from app.services.ml_forecasting import get_productivity_forecast


SIMULATION_DAYS = 30
MIN_HISTORY_DAYS = 3


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _round(value: float) -> float:
    return round(float(value), 2)


def _insufficient_response(observations: int) -> SimulationResponse:
    scenarios = {}
    for name in ("Best Scenario", "Expected Scenario", "Risk Scenario"):
        scenarios[name.lower().replace(" ", "_")] = SimulationScenario(
            name=name,
            summary=SimulationSummary(outcome="Insufficient Evidence"),
            evidence=[
                f"Only {observations} distinct completed-work day(s) are available.",
                f"At least {MIN_HISTORY_DAYS} distinct completed-work days are required.",
            ],
            rules=["Do not simulate a trajectory when the minimum personal history is unavailable."],
            recommendation="Human review is required before using a 30-day scenario.",
        )
    return SimulationResponse(
        evidence_status="insufficient_evidence",
        historical_observations=observations,
        scenarios=scenarios,
        note="Insufficient Evidence: record more completed work sessions before running a reliable simulation.",
    )


def _scenario(
    name: str,
    key: str,
    start_date: date,
    baseline: dict,
    forecast_value: float,
    confidence: float,
    model_evidence: list[str],
) -> SimulationScenario:
    adjustments = {
        "best": {"work": 1.10, "focus": 0.05, "score": 0.10},
        "expected": {"work": 1.00, "focus": 0.00, "score": 0.00},
        "risk": {"work": 0.90, "focus": -0.05, "score": -0.10},
    }
    adjustment = adjustments[key]
    target_score = _clamp(forecast_value * (1 + adjustment["score"]), 0, 100)
    target_work = max(0.0, baseline["work_hours"] * adjustment["work"])
    target_focus = _clamp(baseline["focus_ratio"] + adjustment["focus"], 0, 1)

    daily_values = []
    for day_number in range(1, SIMULATION_DAYS + 1):
        progress = day_number / SIMULATION_DAYS
        work_hours = baseline["work_hours"] + (target_work - baseline["work_hours"]) * progress
        focus_ratio = baseline["focus_ratio"] + (target_focus - baseline["focus_ratio"]) * progress
        productivity = baseline["score"] + (target_score - baseline["score"]) * progress
        focus_hours = work_hours * focus_ratio
        daily_values.append(
            SimulationDay(
                date=(start_date + timedelta(days=day_number)).isoformat(),
                work_hours=_round(work_hours),
                focus_hours=_round(focus_hours),
                distraction_hours=_round(max(0.0, work_hours - focus_hours)),
                focus_ratio=_round(focus_ratio),
                productivity_score=_round(productivity),
            )
        )

    average_score = mean(day.productivity_score for day in daily_values)
    total_work = sum(day.work_hours for day in daily_values)
    change = average_score - baseline["score"]
    direction = "improves" if change > 0.05 else "declines" if change < -0.05 else "stays close to"
    outcome = f"Projected productivity {direction} the current baseline over 30 days."
    rule = (
        "Compare the simulated average productivity with the user's recent baseline; "
        "a positive change supports continuation, while a negative change warrants intervention."
    )
    recommendation = {
        "best": "Protect the focused-work pattern and review progress weekly.",
        "expected": "Continue the current routine and compare actual progress with this baseline.",
        "risk": "Review workload and distractions early; consider a human check-in if the decline appears in real data.",
    }[key]
    factors = {
        "best": ["Higher focused-work share than the recent personal baseline.", "Slightly higher work capacity than the recent personal baseline."],
        "expected": ["Recent personal work-hour baseline is carried forward.", "Existing ML forecast is used without a scenario adjustment."],
        "risk": ["Lower focused-work share than the recent personal baseline.", "Slightly lower work capacity than the recent personal baseline."],
    }[key]
    return SimulationScenario(
        name=name,
        daily_values=daily_values,
        summary=SimulationSummary(
            outcome=outcome,
            projected_average_productivity=_round(average_score),
            projected_total_work_hours=_round(total_work),
            change_from_current=_round(change),
        ),
        supporting_factors=factors,
        evidence=[
            f"Recent baseline: {_round(baseline['work_hours'])} work hours per active day and {_round(baseline['focus_ratio'] * 100)}% focused time.",
            f"Current personal productivity score: {_round(baseline['score'])}/100.",
            *model_evidence,
        ],
        rules=[rule],
        confidence=_round(confidence),
        recommendation=recommendation,
    )


def run_simulation(db: Session, user_id: int) -> SimulationResponse:
    sessions = (
        db.query(WorkSession)
        .filter(WorkSession.user_id == user_id, WorkSession.status == "completed")
        .order_by(WorkSession.started_at.asc())
        .all()
    )
    by_day = defaultdict(list)
    for session in sessions:
        by_day[session.started_at.date()].append(session)

    observations = len(by_day)
    if observations < MIN_HISTORY_DAYS:
        return _insufficient_response(observations)

    recent_days = sorted(by_day)[-14:]
    daily_features = [ml_predict.build_productivity_features_from_sessions(by_day[day]) for day in recent_days]
    work_hours = mean(feature["work_hours"] for feature in daily_features)
    focus_hours = mean(feature["focus_hours"] for feature in daily_features)
    focus_ratio = focus_hours / work_hours if work_hours else 0.0
    baseline_score = _clamp(focus_ratio * 100, 0, 100)

    forecast = get_productivity_forecast(db, user_id, "weekly")
    forecast_value = forecast.predicted_value if forecast.status == "valid" and forecast.predicted_value is not None else baseline_score
    model_confidence = forecast.confidence if forecast.confidence is not None else 0.0
    confidence = _clamp((min(1.0, observations / 12) + _clamp(float(model_confidence), 0, 1)) / 2, 0, 1)
    model_evidence = [
        f"Existing productivity forecast: {_round(forecast_value)}/100 ({forecast.model}).",
        f"Existing user trend signal: {forecast.trend}.",
        f"Forecast evidence status: {forecast.status}; historical periods used: {forecast.historical_observations}.",
    ]
    baseline = {"work_hours": work_hours, "focus_ratio": focus_ratio, "score": baseline_score}
    start_date = date.today()
    scenarios = {
        "best": _scenario("Best Scenario", "best", start_date, baseline, float(forecast_value), confidence, model_evidence),
        "expected": _scenario("Expected Scenario", "expected", start_date, baseline, float(forecast_value), confidence, model_evidence),
        "risk": _scenario("Risk Scenario", "risk", start_date, baseline, float(forecast_value), confidence, model_evidence),
    }
    return SimulationResponse(
        evidence_status="valid",
        historical_observations=observations,
        scenarios=scenarios,
        note="Simulated trajectories are evidence-based scenarios, not guaranteed predictions.",
    )