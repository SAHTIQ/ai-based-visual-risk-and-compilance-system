import json
import re
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from statistics import mean
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.financial import FinancialRecord
from app.models.habit import HabitRecord
from app.models.simulation import SimulationHistory
from app.models.study import StudyRecord
from app.models.work_session import WorkSession
from app.schemas.simulation import (
    BaselineMetrics,
    MetricImpact,
    RuleTraceItem,
    SensitivityItem,
    SimulationDay,
    SimulationEvidenceMeta,
    SimulationHistoryItem,
    SimulationResponse,
    SimulationScenario,
    SimulationSummary,
    WhatIfParameters,
    WhyRecommendationDetail,
)
from app.services.ml import predict as ml_predict
from app.services.ml_forecasting import get_productivity_forecast
from app.services.llm import get_llm_service

MIN_HISTORY_DAYS = 3


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _round(value: float, decimals: int = 2) -> float:
    return round(float(value), decimals)


# ---------------------------------------------------------------------------
# Baseline Extraction from Real Authenticated User Records
# ---------------------------------------------------------------------------
def compute_user_baseline(db: Session, user_id: int) -> BaselineMetrics:
    """Extract actual latest user records across Financial, Work, Study, Habit modules."""
    now_utc = datetime.now(timezone.utc)
    
    # 1. Financial
    financial_records = (
        db.query(FinancialRecord)
        .filter(FinancialRecord.user_id == user_id)
        .order_by(FinancialRecord.recorded_at.desc(), FinancialRecord.id.desc())
        .all()
    )
    has_financial = len(financial_records) > 0
    latest_savings = 0.0
    monthly_spending = 0.0
    if has_financial:
        latest_savings = max(0.0, float(financial_records[0].savings))
        past_30_start = (now_utc - timedelta(days=30)).date()
        recent_expenses = [r.expenses for r in financial_records if r.recorded_at >= past_30_start]
        if recent_expenses and sum(recent_expenses) > 0:
            monthly_spending = float(sum(recent_expenses))
        else:
            avg_expense = mean(r.expenses for r in financial_records)
            monthly_spending = float(avg_expense * 4 if avg_expense > 0 else 8500.0)
    else:
        monthly_spending = 8500.0
        latest_savings = 15000.0

    emergency_runway_months = _round(latest_savings / max(1.0, monthly_spending), 1)

    # 2. Work sessions
    sessions = (
        db.query(WorkSession)
        .filter(WorkSession.user_id == user_id, WorkSession.status == "completed")
        .order_by(WorkSession.started_at.asc())
        .all()
    )

    # 3. Study records
    study_records = (
        db.query(StudyRecord)
        .filter(StudyRecord.user_id == user_id)
        .order_by(StudyRecord.recorded_at.asc())
        .all()
    )
    has_study = len(study_records) > 0
    weekly_study_load = 0.0
    if has_study:
        past_14_start = (now_utc - timedelta(days=14)).date()
        recent_study = [r.study_hours for r in study_records if r.recorded_at >= past_14_start]
        if recent_study:
            weekly_study_load = float(sum(recent_study) / 2.0)
        else:
            weekly_study_load = float(mean(r.study_hours for r in study_records) * 5)
    elif sessions:
        study_sessions = [s for s in sessions if s.activity_type.lower() == "study"]
        if study_sessions:
            weekly_study_load = float((sum(s.duration_minutes for s in study_sessions) / 60.0) / max(1, len(study_sessions) / 5))
        else:
            weekly_study_load = 20.0
    else:
        weekly_study_load = 20.0

    # 4. Habits (Sleep and Exercise)
    habit_records = (
        db.query(HabitRecord)
        .filter(HabitRecord.user_id == user_id)
        .order_by(HabitRecord.recorded_at.desc())
        .all()
    )
    has_sleep_data = False
    has_exercise_data = False
    sleep_hrs_night = 7.5
    exercise_days_week = 3.0

    sleep_values = []
    exercise_records = []
    for h in habit_records:
        name = h.habit_name.lower()
        if "sleep" in name or "rest" in name:
            has_sleep_data = True
            match = re.search(r"(\d+(\.\d+)?)", h.duration)
            if match:
                val = float(match.group(1))
                if 4.0 <= val <= 12.0:
                    sleep_values.append(val)
        elif "exercise" in name or "workout" in name or "gym" in name or "cardio" in name:
            has_exercise_data = True
            if h.completed:
                exercise_records.append(h)

    if sleep_values:
        sleep_hrs_night = _round(mean(sleep_values), 1)
    if exercise_records:
        past_28_start = (now_utc - timedelta(days=28)).date()
        recent_ex = [h for h in exercise_records if h.recorded_at >= past_28_start]
        exercise_days_week = _round(min(7.0, (len(recent_ex) / 28.0) * 7.0), 1)

    # 5. Burnout and Well-being Composite
    load_penalty = _clamp((weekly_study_load - 25.0) * 1.8, 0, 40)
    sleep_penalty = _clamp((7.5 - sleep_hrs_night) * 15.0, 0, 35)
    exercise_relief = _clamp(exercise_days_week * 4.0, 0, 20)
    burnout_pct = _clamp(round(25.0 + load_penalty + sleep_penalty - exercise_relief, 1), 5.0, 95.0)

    sleep_score = _clamp((sleep_hrs_night / 8.0) * 35.0, 0, 35)
    runway_score = _clamp((emergency_runway_months / 6.0) * 25.0, 0, 25)
    exercise_score = _clamp((exercise_days_week / 4.0) * 20.0, 0, 20)
    stress_deduction = (burnout_pct / 100.0) * 30.0
    wellbeing_score = _clamp(round(30.0 + sleep_score + runway_score + exercise_score - stress_deduction, 1), 10.0, 98.0)

    all_dates: List[date] = []
    if financial_records:
        all_dates.extend(r.recorded_at for r in financial_records)
    if sessions:
        all_dates.extend(s.started_at.date() for s in sessions)
    if study_records:
        all_dates.extend(r.recorded_at for r in study_records)
    if habit_records:
        all_dates.extend(r.recorded_at for r in habit_records)

    total_records = len(financial_records) + len(sessions) + len(study_records) + len(habit_records)
    min_date = min(all_dates).isoformat() if all_dates else None
    max_date = max(all_dates).isoformat() if all_dates else None
    latest_baseline_date = max_date or now_utc.date().isoformat()

    status = "valid" if total_records >= MIN_HISTORY_DAYS else "insufficient_evidence"

    return BaselineMetrics(
        savings=_round(latest_savings),
        monthly_spending=_round(monthly_spending),
        study_load_hrs_week=_round(weekly_study_load, 1),
        sleep_hrs_night=_round(sleep_hrs_night, 1),
        exercise_days_week=_round(exercise_days_week, 1),
        burnout_pct=_round(burnout_pct, 1),
        wellbeing_score=_round(wellbeing_score, 1),
        emergency_runway_months=_round(emergency_runway_months, 1),
        records_used=total_records,
        data_range_start=min_date,
        data_range_end=max_date,
        baseline_date=latest_baseline_date,
        data_status=status,
        has_savings=has_financial,
        has_spending=has_financial,
        has_study=has_study or len(sessions) > 0,
        has_sleep=has_sleep_data,
        has_exercise=has_exercise_data,
    )


# ---------------------------------------------------------------------------
# Deterministic Rule Engine & Rule Trace
# ---------------------------------------------------------------------------
def evaluate_rules(
    baseline: BaselineMetrics,
    params: WhatIfParameters,
    simulated: Dict[str, float],
    impacts: List[MetricImpact],
) -> Tuple[List[RuleTraceItem], List[str], str, str]:
    delta_spending = simulated["monthly_spending"] - baseline.monthly_spending
    delta_savings = simulated["savings"] - baseline.savings
    delta_runway = simulated["emergency_runway_months"] - baseline.emergency_runway_months
    delta_burnout = simulated["burnout_pct"] - baseline.burnout_pct
    delta_wellbeing = simulated["wellbeing_score"] - baseline.wellbeing_score

    trace: List[RuleTraceItem] = []
    triggered: List[str] = []

    # Condition 1: Spending Increase
    cond1 = delta_spending > 50.0
    trace.append(RuleTraceItem(
        condition_id="COND_SPENDING_INCREASE",
        condition_name="Monthly Spending Level",
        condition_text="Checks if your planned monthly spending is higher than baseline",
        input_values={"baseline_spending": baseline.monthly_spending, "simulated_spending": simulated["monthly_spending"], "delta": _round(delta_spending)},
        is_satisfied=cond1,
        status_label="Higher" if cond1 else "Controlled",
        impact_explanation=f"Your monthly spending changes by {'+' if delta_spending >= 0 else ''}₹{delta_spending:,.0f} per month.",
    ))

    # Condition 2: Projected Savings Decreased
    cond2 = delta_savings < -100.0
    trace.append(RuleTraceItem(
        condition_id="COND_SAVINGS_DECLINE",
        condition_name="Future Savings Growth",
        condition_text="Checks whether your total savings buffer will grow or shrink",
        input_values={"baseline_savings": baseline.savings, "simulated_savings": simulated["savings"], "delta": _round(delta_savings)},
        is_satisfied=cond2,
        status_label="Shrinking" if cond2 else "Growing",
        impact_explanation=f"Your savings buffer changes by {'+' if delta_savings >= 0 else ''}₹{delta_savings:,.0f} over {params.horizon_days} days.",
    ))

    # Condition 3: Emergency Runway Depletion
    cond3 = (simulated["emergency_runway_months"] < 3.0) or (delta_runway < -0.3)
    trace.append(RuleTraceItem(
        condition_id="COND_RUNWAY_RISK",
        condition_name="Emergency Safety Net",
        condition_text="Checks if your savings can cover at least 3 full months of living expenses",
        input_values={"baseline_runway": baseline.emergency_runway_months, "simulated_runway": simulated["emergency_runway_months"], "delta": _round(delta_runway, 1)},
        is_satisfied=cond3,
        status_label="Low Cushion" if cond3 else "Safe Buffer",
        impact_explanation=f"Your savings provide {simulated['emergency_runway_months']} months of living expenses buffer ({delta_runway:+.1f} months).",
    ))

    # Condition 4: Study Overload / Burnout Escalation
    cond4 = (simulated["study_load_hrs_week"] > 38.0) or (delta_burnout > 5.0)
    trace.append(RuleTraceItem(
        condition_id="COND_BURNOUT_ESCALATION",
        condition_name="Workload & Stress Balance",
        condition_text="Checks if your weekly study hours are becoming too intense",
        input_values={"study_load": simulated["study_load_hrs_week"], "burnout_pct": simulated["burnout_pct"], "delta_burnout": _round(delta_burnout, 1)},
        is_satisfied=cond4,
        status_label="High Workload" if cond4 else "Balanced",
        impact_explanation=f"Projected stress level is {simulated['burnout_pct']:.0f}% ({delta_burnout:+.1f}%).",
    ))

    # Condition 5: Sleep Deprivation Alert
    cond5 = (simulated["sleep_hrs_night"] < 6.8) or (delta_wellbeing < -4.0)
    trace.append(RuleTraceItem(
        condition_id="COND_SLEEP_DEPRIVATION",
        condition_name="Nightly Sleep & Rest",
        condition_text="Checks if you are getting at least 7 hours of sleep each night to recover",
        input_values={"sleep_hours": simulated["sleep_hrs_night"], "wellbeing_score": simulated["wellbeing_score"], "delta_wellbeing": _round(delta_wellbeing, 1)},
        is_satisfied=cond5,
        status_label="Need More Rest" if cond5 else "Well Rested",
        impact_explanation=f"You get {simulated['sleep_hrs_night']:.1f} hrs/night; your overall wellbeing score is {simulated['wellbeing_score']:.0f}/100.",
    ))

    # Condition 6: Positive Habit Compounding
    cond6 = (delta_spending <= 0) and (delta_burnout <= 0) and (delta_wellbeing > 2.0)
    trace.append(RuleTraceItem(
        condition_id="COND_POSITIVE_COMPOUNDING",
        condition_name="Healthy Daily Lifestyle",
        condition_text="Checks if your daily habits keep expenses in check while boosting energy",
        input_values={"delta_spending": _round(delta_spending), "delta_burnout": _round(delta_burnout, 1), "delta_wellbeing": _round(delta_wellbeing, 1)},
        is_satisfied=cond6,
        status_label="Optimal" if cond6 else "Steady",
        impact_explanation="Your habits work together nicely to grow your savings while keeping you energized!",
    ))

    if cond1 and cond2:
        triggered.append("Higher spending is slowing down your savings growth")
    if cond3:
        triggered.append("Emergency fund falls below 3 months of expenses")
    if cond4:
        triggered.append("Weekly workload is high; remember to take refreshing breaks")
    if cond5:
        triggered.append("Sleep is below 7 hours; prioritize restful nights")
    if cond6:
        triggered.append("Positive habit synergy: savings and energy are growing together!")

    contributions = {
        "Monthly Spending": abs(delta_spending) / max(1.0, baseline.monthly_spending),
        "Sleep": abs(simulated["sleep_hrs_night"] - baseline.sleep_hrs_night) / max(1.0, baseline.sleep_hrs_night),
        "Study Load": abs(simulated["study_load_hrs_week"] - baseline.study_load_hrs_week) / max(1.0, baseline.study_load_hrs_week),
        "Exercise": abs(simulated["exercise_days_week"] - baseline.exercise_days_week) / max(1.0, max(1.0, baseline.exercise_days_week)),
    }
    primary_factor = max(contributions.keys(), key=lambda k: contributions[k])

    if cond1 and (cond2 or cond3):
        recommendation = (
            f"Try trimming monthly spending by ₹{abs(delta_spending):,.0f} so your emergency fund stays safe "
            f"({simulated['emergency_runway_months']} months cushion) and your savings keep growing."
        )
    elif cond4 and cond5:
        recommendation = (
            f"Aim for {baseline.study_load_hrs_week:.0f} study hours per week and get at least 7.5 hours of sleep "
            "to stay sharp and keep daily fatigue away."
        )
    elif cond4:
        recommendation = (
            "Take short relaxing breaks between study sessions to keep your mind fresh and avoid study fatigue."
        )
    elif cond5:
        recommendation = (
            f"Try adding {abs(simulated['sleep_hrs_night'] - 7.5):.1f} more hours of sleep each night to feel more energized every morning."
        )
    elif cond6:
        recommendation = (
            f"Keep up this balanced routine! It grows your savings by ₹{delta_savings:+,.0f} while keeping your wellbeing high ({simulated['wellbeing_score']:.0f}/100)."
        )
    else:
        recommendation = (
            f"Your current plan is steady for the next {params.horizon_days} days. Keep tracking your habits weekly to stay on track."
        )

    return trace, triggered, primary_factor, recommendation


# ---------------------------------------------------------------------------
# One-At-A-Time (OAT) Sensitivity Analysis (Layman Terms)
# ---------------------------------------------------------------------------
def compute_sensitivity_analysis(baseline: BaselineMetrics, horizon_days: int) -> List[SensitivityItem]:
    items: List[SensitivityItem] = []
    
    # 1. Monthly Spending perturbation (+20%)
    spending_perturbed = baseline.monthly_spending * 1.20
    savings_delta = (spending_perturbed - baseline.monthly_spending) * (horizon_days / 30.0)
    runway_perturbed = baseline.savings / max(1.0, spending_perturbed)
    spending_impact = abs(baseline.emergency_runway_months - runway_perturbed) + (savings_delta / max(1.0, baseline.savings)) * 50.0

    # 2. Sleep perturbation (-20%)
    sleep_perturbed = max(4.0, baseline.sleep_hrs_night * 0.80)
    burnout_perturbed = _clamp(baseline.burnout_pct + (7.5 - sleep_perturbed) * 12.0, 5.0, 95.0)
    sleep_impact = abs(burnout_perturbed - baseline.burnout_pct)

    # 3. Study Load perturbation (+20%)
    study_perturbed = baseline.study_load_hrs_week * 1.20
    study_burnout = _clamp(baseline.burnout_pct + (study_perturbed - 25.0) * 1.5, 5.0, 95.0)
    study_impact = abs(study_burnout - baseline.burnout_pct)

    # 4. Exercise perturbation (-20%)
    ex_perturbed = max(0.0, baseline.exercise_days_week * 0.80)
    ex_wellbeing = _clamp(baseline.wellbeing_score - (baseline.exercise_days_week - ex_perturbed) * 3.0, 10.0, 98.0)
    ex_impact = abs(baseline.wellbeing_score - ex_wellbeing)

    raw_scores = {
        "Monthly Spending": (spending_impact, "Savings & Safety Cushion", "How much you spend each month is the #1 driver for how quickly your savings grow and how long your safety cushion lasts."),
        "Sleep": (sleep_impact, "Energy & Recovery", "Getting 7+ hours of restful sleep protects your daily focus, prevents fatigue, and keeps your stress low."),
        "Study Load": (study_impact, "Productivity Balance", "Balancing study sessions with adequate downtime keeps you learning effectively without feeling overwhelmed."),
        "Exercise": (ex_impact, "Stamina & Wellbeing", "Regular physical activity boosts your daily stamina, lifts your mood, and protects your long-term wellbeing."),
    }

    max_val = max(v[0] for v in raw_scores.values()) or 1.0

    for name, (val, outcome_metric, desc) in raw_scores.items():
        norm_score = _round((val / max_val) * 100.0, 1)
        if norm_score >= 80:
            level = "High"
        elif norm_score >= 55:
            level = "Medium-High"
        elif norm_score >= 35:
            level = "Medium"
        else:
            level = "Low"

        items.append(SensitivityItem(
            feature_name=name.lower().replace(" ", "_"),
            label=name,
            impact_level=level,
            impact_score=norm_score,
            outcome_metric=outcome_metric,
            description=desc,
        ))

    items.sort(key=lambda x: x.impact_score, reverse=True)
    return items


# ---------------------------------------------------------------------------
# AI Explanation Layer (Grounded in Structured Validated Data)
# ---------------------------------------------------------------------------
def generate_ai_explanation(
    scenario_name: str,
    baseline: BaselineMetrics,
    simulated: Dict[str, float],
    impacts: List[MetricImpact],
    rules_triggered: List[str],
    primary_factor: str,
    confidence_pct: int,
    fallback_recommendation: str,
    horizon_days: int = 30,
) -> Tuple[str, str]:
    """
    Generate user-friendly, layman-terms explanation and guidance using modern hosted LLM API.
    """
    try:
        llm = get_llm_service()
        if llm.is_available():
            prompt = (
                f"You are a friendly personal AI life and finance coach for a digital twin application.\n"
                f"Explain this future simulation outcome to the user in simple, conversational layman terms.\n"
                f"Avoid academic, mathematical, or statistical jargon like 'deterministic', 'heuristics', 'elasticity', 'perturbation', or 'rule triggers'.\n\n"
                f"Simulation Horizon: {horizon_days} days\n"
                f"- User Starting Point (Baseline): Savings ₹{baseline.savings:,.0f}, Monthly Spending ₹{baseline.monthly_spending:,.0f}, "
                f"Study {baseline.study_load_hrs_week:.1f}h/wk, Sleep {baseline.sleep_hrs_night:.1f}h/night, Burnout {baseline.burnout_pct:.0f}%, Wellbeing {baseline.wellbeing_score:.0f}/100.\n"
                f"- User Adjusted Plan: Monthly Spending ₹{simulated['monthly_spending']:,.0f}, "
                f"Study {simulated['study_load_hrs_week']:.1f}h/wk, Sleep {simulated['sleep_hrs_night']:.1f}h/night, Exercise {simulated['exercise_days_week']:.1f} days/wk.\n"
                f"- Calculated Outcome in {horizon_days} days: Projected Savings ₹{simulated['savings']:,.0f} ({simulated['savings'] - baseline.savings:+,.0f} change), "
                f"Emergency Safety Cushion: {simulated['emergency_runway_months']:.1f} months, "
                f"Stress Level: {simulated['burnout_pct']:.0f}%, Wellbeing: {simulated['wellbeing_score']:.0f}/100.\n\n"
                f"Respond strictly in this format:\n"
                f"RECOMMENDATION: <One clear, encouraging, friendly actionable sentence for the user>\n"
                f"EXPLANATION: <Two to three simple sentences explaining how these adjustments help them in plain English>"
            )
            resp = llm.generate(
                messages=[{"role": "user", "content": prompt}],
                system_prompt="You are a warm, supportive personal life & wealth coach who explains future outcomes simply.",
                max_tokens=300,
                temperature=0.4,
            )
            if resp.is_success and resp.content:
                rec_match = re.search(r"RECOMMENDATION:\s*(.+?)(?=\nEXPLANATION:|$)", resp.content, re.DOTALL)
                exp_match = re.search(r"EXPLANATION:\s*(.+)", resp.content, re.DOTALL)
                if rec_match and exp_match:
                    return rec_match.group(1).strip().replace("**", ""), exp_match.group(1).strip().replace("**", "")
    except Exception as e:
        pass

    # Friendly layman fallback if LLM is offline or busy
    delta_s = simulated['savings'] - baseline.savings
    delta_sign = "+" if delta_s >= 0 else ""
    friendly_rec = f"Adjusting your spending to ₹{simulated['monthly_spending']:,.0f}/mo while keeping {simulated['sleep_hrs_night']:.1f} hours of sleep will help your savings grow safely without daily fatigue."
    friendly_exp = (
        f"Over the next {horizon_days} days, this plan gives you {simulated['emergency_runway_months']:.1f} months of financial safety cushion "
        f"and keeps your overall wellbeing at a solid {simulated['wellbeing_score']:.0f}/100. "
        f"Your savings are projected to reach ₹{simulated['savings']:,.0f} ({delta_sign}₹{delta_s:,.0f}). "
        f"Maintaining steady sleep and study habits protects your focus without burning you out."
    )
    return friendly_rec, friendly_exp


# ---------------------------------------------------------------------------
# Core Simulation Engine: Horizon & What-If Execution
# ---------------------------------------------------------------------------
def run_simulation(
    db: Session,
    user_id: int,
    params: Optional[WhatIfParameters] = None,
    save_to_history: bool = False,
) -> SimulationResponse:
    if params is None:
        params = WhatIfParameters(horizon_days=30)

    horizon_days = params.horizon_days if params.horizon_days in (30, 90, 180, 365) else 30
    baseline = compute_user_baseline(db, user_id)

    observations = baseline.records_used
    if baseline.data_status == "insufficient_evidence" or observations < MIN_HISTORY_DAYS:
        scenarios = {}
        for name in ("Best Scenario", "Expected Scenario", "Risk Scenario"):
            scenarios[name.lower().replace(" ", "_")] = SimulationScenario(
                name=name,
                summary=SimulationSummary(outcome="Insufficient Evidence"),
                evidence=[
                    f"Only {observations} historical record(s) are available.",
                    f"At least {MIN_HISTORY_DAYS} historical records are required for multi-factor modeling.",
                ],
                rules=["Do not simulate a trajectory when the minimum personal history is unavailable."],
                recommendation="Human review is required before relying on this simulation.",
            )
        evidence_meta = SimulationEvidenceMeta(
            records_used=observations,
            historical_range="N/A",
            features_used=[],
            insufficient_features=["Work", "Financial", "Habit", "Study"],
            confidence_pct=0,
            method="Historical trend + deterministic scenario adjustments",
            is_sufficient=False,
            note="Insufficient Evidence: record more activity before running a reliable simulation.",
        )
        return SimulationResponse(
            simulation_period=horizon_days,
            evidence_status="insufficient_evidence",
            historical_observations=observations,
            scenarios=scenarios,
            note="Insufficient Evidence: record more completed work sessions and financial logs before running a reliable simulation.",
            baseline=baseline,
            evidence_meta=evidence_meta,
        )

    sim_study = float(params.study_load_hrs_week if params.study_load_hrs_week is not None else baseline.study_load_hrs_week)
    sim_sleep = float(params.sleep_hrs_night if params.sleep_hrs_night is not None else baseline.sleep_hrs_night)
    sim_spending = float(params.monthly_spending if params.monthly_spending is not None else baseline.monthly_spending)
    sim_exercise = float(params.exercise_days_week if params.exercise_days_week is not None else baseline.exercise_days_week)
    initial_savings = float(params.savings if params.savings is not None else baseline.savings)

    monthly_delta_spend = sim_spending - baseline.monthly_spending
    months_horizon = horizon_days / 30.0
    terminal_savings = max(0.0, initial_savings - (monthly_delta_spend * months_horizon))
    terminal_runway = _round(terminal_savings / max(1.0, sim_spending), 1)

    load_penalty = _clamp((sim_study - 25.0) * 1.8, 0, 40)
    sleep_penalty = _clamp((7.5 - sim_sleep) * 15.0, 0, 35)
    exercise_relief = _clamp(sim_exercise * 4.0, 0, 20)
    terminal_burnout = _clamp(round(25.0 + load_penalty + sleep_penalty - exercise_relief, 1), 5.0, 95.0)

    sleep_score = _clamp((sim_sleep / 8.0) * 35.0, 0, 35)
    runway_score = _clamp((terminal_runway / 6.0) * 25.0, 0, 25)
    exercise_score = _clamp((sim_exercise / 4.0) * 20.0, 0, 20)
    stress_deduction = (terminal_burnout / 100.0) * 30.0
    terminal_wellbeing = _clamp(round(30.0 + sleep_score + runway_score + exercise_score - stress_deduction, 1), 10.0, 98.0)

    simulated_dict = {
        "savings": _round(terminal_savings),
        "monthly_spending": _round(sim_spending),
        "study_load_hrs_week": _round(sim_study, 1),
        "sleep_hrs_night": _round(sim_sleep, 1),
        "exercise_days_week": _round(sim_exercise, 1),
        "burnout_pct": _round(terminal_burnout, 1),
        "wellbeing_score": _round(terminal_wellbeing, 1),
        "emergency_runway_months": _round(terminal_runway, 1),
    }

    def calc_pct(base: float, sim: float) -> Optional[float]:
        if abs(base) < 0.001:
            return None
        return _round(((sim - base) / abs(base)) * 100.0, 1)

    impacts: List[MetricImpact] = [
        MetricImpact(
            metric="savings",
            label="Savings",
            baseline=baseline.savings,
            simulated=simulated_dict["savings"],
            change=_round(simulated_dict["savings"] - baseline.savings),
            pct_change=calc_pct(baseline.savings, simulated_dict["savings"]),
            unit="₹",
            direction_is_favorable=simulated_dict["savings"] >= baseline.savings,
        ),
        MetricImpact(
            metric="monthly_spending",
            label="Monthly Spending",
            baseline=baseline.monthly_spending,
            simulated=simulated_dict["monthly_spending"],
            change=_round(simulated_dict["monthly_spending"] - baseline.monthly_spending),
            pct_change=calc_pct(baseline.monthly_spending, simulated_dict["monthly_spending"]),
            unit="₹",
            direction_is_favorable=simulated_dict["monthly_spending"] <= baseline.monthly_spending,
        ),
        MetricImpact(
            metric="burnout_pct",
            label="Burnout Index",
            baseline=baseline.burnout_pct,
            simulated=simulated_dict["burnout_pct"],
            change=_round(simulated_dict["burnout_pct"] - baseline.burnout_pct, 1),
            pct_change=calc_pct(baseline.burnout_pct, simulated_dict["burnout_pct"]),
            unit="%",
            direction_is_favorable=simulated_dict["burnout_pct"] <= baseline.burnout_pct,
        ),
        MetricImpact(
            metric="wellbeing_score",
            label="Well-being Score",
            baseline=baseline.wellbeing_score,
            simulated=simulated_dict["wellbeing_score"],
            change=_round(simulated_dict["wellbeing_score"] - baseline.wellbeing_score, 1),
            pct_change=calc_pct(baseline.wellbeing_score, simulated_dict["wellbeing_score"]),
            unit="/100",
            direction_is_favorable=simulated_dict["wellbeing_score"] >= baseline.wellbeing_score,
        ),
        MetricImpact(
            metric="emergency_runway_months",
            label="Emergency Runway",
            baseline=baseline.emergency_runway_months,
            simulated=simulated_dict["emergency_runway_months"],
            change=_round(simulated_dict["emergency_runway_months"] - baseline.emergency_runway_months, 1),
            pct_change=calc_pct(baseline.emergency_runway_months, simulated_dict["emergency_runway_months"]),
            unit="months",
            direction_is_favorable=simulated_dict["emergency_runway_months"] >= baseline.emergency_runway_months,
        ),
        MetricImpact(
            metric="study_load_hrs_week",
            label="Study Load",
            baseline=baseline.study_load_hrs_week,
            simulated=simulated_dict["study_load_hrs_week"],
            change=_round(simulated_dict["study_load_hrs_week"] - baseline.study_load_hrs_week, 1),
            pct_change=calc_pct(baseline.study_load_hrs_week, simulated_dict["study_load_hrs_week"]),
            unit="hrs/wk",
            direction_is_favorable=simulated_dict["study_load_hrs_week"] <= 35.0,
        ),
        MetricImpact(
            metric="sleep_hrs_night",
            label="Sleep",
            baseline=baseline.sleep_hrs_night,
            simulated=simulated_dict["sleep_hrs_night"],
            change=_round(simulated_dict["sleep_hrs_night"] - baseline.sleep_hrs_night, 1),
            pct_change=calc_pct(baseline.sleep_hrs_night, simulated_dict["sleep_hrs_night"]),
            unit="hrs/night",
            direction_is_favorable=simulated_dict["sleep_hrs_night"] >= 7.0,
        ),
    ]

    forecast = get_productivity_forecast(db, user_id, "weekly")
    forecast_value = forecast.predicted_value if forecast.status == "valid" and forecast.predicted_value is not None else 65.0
    model_confidence = forecast.confidence if forecast.confidence is not None else 0.80

    features_present = sum([baseline.has_savings, baseline.has_spending, baseline.has_study, baseline.has_sleep, baseline.has_exercise])
    completeness_ratio = features_present / 5.0
    sample_ratio = min(1.0, observations / 28.0)
    calculated_confidence = _clamp(((sample_ratio * 0.45) + (completeness_ratio * 0.35) + (model_confidence * 0.20)), 0.1, 0.98)
    confidence_pct = int(round(calculated_confidence * 100))

    rule_trace, rules_triggered, primary_factor, recommendation = evaluate_rules(
        baseline, params, simulated_dict, impacts
    )

    sensitivity = compute_sensitivity_analysis(baseline, horizon_days)

    start_date = date.today()
    step_count = min(30, horizon_days) if horizon_days <= 30 else 30

    def make_scenario(name: str, key: str, mult_work: float, mult_spend: float, mult_burnout: float) -> SimulationScenario:
        target_score = _clamp(forecast_value * (1.10 if key == "best" else 0.90 if key == "risk" else 1.0), 0, 100)
        target_savings = terminal_savings * (1.05 if key == "best" else 0.92 if key == "risk" else 1.0)
        target_burnout = _clamp(terminal_burnout * mult_burnout, 5, 95)
        target_wellbeing = _clamp(terminal_wellbeing * (1.08 if key == "best" else 0.92 if key == "risk" else 1.0), 10, 98)
        target_runway = _round(target_savings / max(1.0, sim_spending * mult_spend), 1)

        daily_values = []
        for step in range(1, step_count + 1):
            progress = step / step_count
            step_days = int(round(progress * horizon_days))
            current_date = start_date + timedelta(days=step_days)
            
            p_score = 65.0 + (target_score - 65.0) * progress
            s_val = initial_savings + (target_savings - initial_savings) * progress
            b_val = baseline.burnout_pct + (target_burnout - baseline.burnout_pct) * progress
            w_val = baseline.wellbeing_score + (target_wellbeing - baseline.wellbeing_score) * progress
            r_val = baseline.emergency_runway_months + (target_runway - baseline.emergency_runway_months) * progress

            daily_values.append(SimulationDay(
                date=current_date.isoformat(),
                work_hours=_round(6.0 * mult_work),
                focus_hours=_round(4.5 * mult_work),
                distraction_hours=_round(1.5),
                focus_ratio=_round(0.75),
                productivity_score=_round(p_score),
                savings=_round(s_val),
                monthly_spending=_round(sim_spending * mult_spend),
                burnout_pct=_round(b_val, 1),
                wellbeing_score=_round(w_val, 1),
                emergency_runway_months=_round(r_val, 1),
            ))

        avg_score = mean(d.productivity_score for d in daily_values)
        tot_work = sum(d.work_hours for d in daily_values)
        chg_score = avg_score - 65.0

        rec_text = {
            "best": "Protect this high-efficiency rhythm; savings and cognitive recovery are optimally aligned.",
            "expected": recommendation,
            "risk": "Exercise defensive budgeting and workload throttling to avoid compounding liquidity and burnout stress.",
        }[key]

        return SimulationScenario(
            name=name,
            daily_values=daily_values,
            summary=SimulationSummary(
                outcome=f"Projected {name} over {horizon_days} days.",
                projected_average_productivity=_round(avg_score),
                projected_total_work_hours=_round(tot_work),
                change_from_current=_round(chg_score),
                projected_savings=_round(target_savings),
                savings_change=_round(target_savings - baseline.savings),
                projected_burnout=_round(target_burnout, 1),
                burnout_change=_round(target_burnout - baseline.burnout_pct, 1),
                projected_wellbeing=_round(target_wellbeing, 1),
                wellbeing_change=_round(target_wellbeing - baseline.wellbeing_score, 1),
                projected_runway=_round(target_runway, 1),
                runway_change=_round(target_runway - baseline.emergency_runway_months, 1),
            ),
            supporting_factors=[
                f"Horizon: {horizon_days} days.",
                f"Projected terminal savings: ₹{target_savings:,.0f} ({target_runway} mo runway).",
                f"Burnout ceiling: {target_burnout:.1f}%.",
            ],
            evidence=[
                f"Historical baseline from {baseline.records_used} records ({baseline.data_range_start} to {baseline.data_range_end}).",
                f"Active features evaluated: Spending, Sleep, Study Load, Exercise, Savings.",
                f"Underlying forecast confidence: {confidence_pct}%.",
            ],
            rules=[r.condition_name for r in rule_trace if r.is_satisfied],
            confidence=_round(calculated_confidence),
            recommendation=rec_text,
        )

    scenarios = {
        "best": make_scenario("Optimistic Scenario", "best", 1.08, 0.95, 0.85),
        "expected": make_scenario("Expected Scenario", "expected", 1.00, 1.00, 1.00),
        "risk": make_scenario("Risk Scenario", "risk", 0.90, 1.10, 1.20),
    }

    features_used = []
    insufficient_features = []
    if baseline.has_spending: features_used.append("Monthly Spending")
    else: insufficient_features.append("Monthly Spending")
    if baseline.has_savings: features_used.append("Savings")
    else: insufficient_features.append("Savings")
    if baseline.has_study: features_used.append("Study Load")
    else: insufficient_features.append("Study Load")
    if baseline.has_sleep: features_used.append("Sleep Routine")
    else: insufficient_features.append("Sleep Routine")
    if baseline.has_exercise: features_used.append("Exercise Frequency")
    else: insufficient_features.append("Exercise Frequency")

    evidence_meta = SimulationEvidenceMeta(
        records_used=baseline.records_used,
        historical_range=f"{baseline.data_range_start or 'N/A'} → {baseline.data_range_end or 'N/A'}",
        features_used=features_used,
        insufficient_features=insufficient_features,
        confidence_pct=confidence_pct,
        method="Historical trend + deterministic scenario adjustments + ML held-out validation",
        is_sufficient=True,
        note="Evidence derived directly from PostgreSQL user logs; scenarios are evidence-based projections.",
    )

    why_rec = WhyRecommendationDetail(
        selected_scenario=f"Custom What-If ({horizon_days}-Day Horizon)",
        selected_features={
            "monthly_spending": sim_spending,
            "study_load_hrs_week": sim_study,
            "sleep_hrs_night": sim_sleep,
            "exercise_days_week": sim_exercise,
        },
        baseline_values={
            "monthly_spending": baseline.monthly_spending,
            "study_load_hrs_week": baseline.study_load_hrs_week,
            "sleep_hrs_night": baseline.sleep_hrs_night,
            "exercise_days_week": baseline.exercise_days_week,
            "savings": baseline.savings,
            "emergency_runway_months": baseline.emergency_runway_months,
        },
        scenario_changes={
            "delta_spending": _round(sim_spending - baseline.monthly_spending),
            "delta_study": _round(sim_study - baseline.study_load_hrs_week, 1),
            "delta_sleep": _round(sim_sleep - baseline.sleep_hrs_night, 1),
            "delta_exercise": _round(sim_exercise - baseline.exercise_days_week, 1),
        },
        simulated_impact=impacts,
        rules_evaluated=len(rule_trace),
        rules_triggered=rules_triggered,
        primary_contributing_factor=primary_factor,
        evidence_used=f"{baseline.records_used} historical user records spanning {baseline.data_range_start} to {baseline.data_range_end}",
        confidence_pct=confidence_pct,
        final_recommendation=recommendation,
    )

    llm_rec, ai_explanation = generate_ai_explanation(
        "Custom What-If",
        baseline,
        simulated_dict,
        impacts,
        rules_triggered,
        primary_factor,
        confidence_pct,
        recommendation,
        horizon_days=horizon_days,
    )
    recommendation = llm_rec
    why_rec.final_recommendation = llm_rec

    history_id = None
    if save_to_history:
        history_entry = SimulationHistory(
            user_id=user_id,
            scenario_name=f"What-If ({horizon_days}D)",
            horizon_days=horizon_days,
            baseline_json=baseline.model_dump_json(),
            inputs_json=params.model_dump_json(),
            results_json=json.dumps(simulated_dict),
            impact_json=json.dumps([i.model_dump() for i in impacts]),
            rules_triggered_json=json.dumps(rules_triggered),
            evidence_json=evidence_meta.model_dump_json(),
            confidence=calculated_confidence,
            recommendation=recommendation,
            ai_explanation=ai_explanation,
        )
        db.add(history_entry)
        db.commit()
        db.refresh(history_entry)
        history_id = history_entry.id

    return SimulationResponse(
        simulation_period=horizon_days,
        evidence_status="valid",
        historical_observations=observations,
        scenarios=scenarios,
        note="Simulated trajectories are evidence-based scenarios, not guaranteed predictions.",
        baseline=baseline,
        impact=impacts,
        sensitivity=sensitivity,
        evidence_meta=evidence_meta,
        rule_trace=rule_trace,
        why_recommendation=why_rec,
        ai_explanation=ai_explanation,
        recommendation=recommendation,
        history_id=history_id,
    )


# ---------------------------------------------------------------------------
# Multi-User Isolated History Handlers
# ---------------------------------------------------------------------------
def get_user_simulation_history(db: Session, user_id: int) -> List[SimulationHistoryItem]:
    entries = (
        db.query(SimulationHistory)
        .filter(SimulationHistory.user_id == user_id)
        .order_by(SimulationHistory.created_at.desc())
        .all()
    )
    items = []
    for e in entries:
        try:
            baseline_data = BaselineMetrics.model_validate_json(e.baseline_json)
            impact_data = [MetricImpact.model_validate(x) for x in json.loads(e.impact_json)]
            items.append(SimulationHistoryItem(
                id=e.id,
                scenario_name=e.scenario_name,
                horizon_days=e.horizon_days,
                created_at=e.created_at.isoformat(),
                confidence=e.confidence,
                recommendation=e.recommendation,
                baseline=baseline_data,
                impact=impact_data,
                ai_explanation=e.ai_explanation,
                why_recommendation=None,
            ))
        except Exception:
            continue
    return items


def delete_user_simulation_history(db: Session, user_id: int, history_id: int) -> bool:
    entry = (
        db.query(SimulationHistory)
        .filter(SimulationHistory.id == history_id, SimulationHistory.user_id == user_id)
        .first()
    )
    if not entry:
        return False
    db.delete(entry)
    db.commit()
    return True
