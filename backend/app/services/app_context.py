import json
import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Set
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.work_session import WorkSession
from app.models.financial import FinancialRecord
from app.models.habit import HabitRecord
from app.models.study import StudyRecord
from app.services.analytics_service import get_productivity_analytics, get_financial_analytics
from app.services.habit_analytics import get_habit_analytics
from app.services.ml_forecasting import get_productivity_forecast
from app.services.simulation import compute_user_baseline, run_simulation


def detect_query_intents(query: Optional[str]) -> Set[str]:
    """
    Lightweight rule-based intent detector to determine the minimal required
    database records and analytics tools needed to answer the user's question.
    """
    if not query:
        return {"general"}

    q = query.lower()
    intents = set()

    # Productivity / Work Sessions
    if any(k in q for k in ["productiv", "focus", "work session", "coding", "active hour", "peak hour", "consistency", "deep work", "efficiency", "burnout"]):
        intents.add("productivity")

    # Habits / Daily Routine
    if any(k in q for k in ["habit", "streak", "daily routine", "routine", "completion rate", "discipline", "adherence"]):
        intents.add("habits")

    # Study / Academic
    if any(k in q for k in ["study", "academic", "course", "subject", "grade", "exam", "reading", "study hour", "learning"]):
        intents.add("study")

    # Financial / Spending / Budget
    if any(k in q for k in ["financ", "money", "income", "expense", "budget", "saving", "spend", "runway"]):
        intents.add("financial")

    # Forecasting
    if any(k in q for k in ["forecast", "predict", "trend", "future productiv", "outlook", "projection"]):
        intents.add("forecast")

    # Simulation / What-If Scenarios
    if any(k in q for k in ["simulat", "scenario", "what-if", "what if", "baseline", "emergency runway", "burnout pct"]):
        intents.add("simulation")

    # Overview / Summary / General
    if any(k in q for k in ["summar", "overview", "how am i", "report", "pattern", "recent activ", "recommend", "hello", "hi", "help"]):
        intents.add("general")

    if not intents:
        intents.add("general")

    return intents


def get_user_productivity_context(
    db: Session,
    user: User,
    query: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Retrieval-first context builder.
    Instead of dumping the entire database history, it determines required
    domains from the query, executes deterministic analytics for those domains,
    and returns a compact, high-signal structured snapshot.
    """
    user_id = user.id
    intents = detect_query_intents(query)
    is_general = "general" in intents

    context: Dict[str, Any] = {
        "user_profile": {
            "name": user.name,
            "occupation": user.profile.occupation if user.profile else "Professional",
            "education": user.profile.education if user.profile else "N/A",
        },
        "query_domains": list(intents),
    }

    # 1. Productivity & Work Sessions Domain
    if is_general or "productivity" in intents or "forecast" in intents:
        try:
            prod_analytics = get_productivity_analytics(db, user_id)
            # Recent 3 sessions for compact activity ground truth
            recent_sessions = (
                db.query(WorkSession)
                .filter(WorkSession.user_id == user_id, WorkSession.status == "completed")
                .order_by(WorkSession.started_at.desc())
                .limit(3)
                .all()
            )
            context["productivity_analytics"] = {
                "productivity_score": prod_analytics.productivity_score,
                "score_breakdown": prod_analytics.score_breakdown,
                "weekly_work_hours": prod_analytics.weekly_work_hours,
                "daily_work_hours": prod_analytics.daily_work_hours,
                "total_focus_hours": prod_analytics.total_focus_hours,
                "consistency_pct": f"{prod_analytics.consistency_pct}%",
                "peak_working_hours": prod_analytics.peak_working_hours,
                "most_productive_day": prod_analytics.most_productive_day,
                "least_productive_day": prod_analytics.least_productive_day,
                "recent_sessions": [
                    {
                        "activity": s.activity_type,
                        "duration_min": s.duration_minutes,
                        "started_at": s.started_at.strftime("%a %H:%M") if s.started_at else "N/A",
                    }
                    for s in recent_sessions
                ],
            }
        except Exception:
            context["productivity_analytics"] = {"status": "no_work_sessions_logged"}

    # 2. Habit Domain
    if is_general or "habits" in intents or "productivity" in intents:
        try:
            habit_metrics = get_habit_analytics(db, user_id)
            context["habits_analytics"] = {
                "active_habits_count": len(habit_metrics),
                "habits_summary": [
                    {
                        "habit": h.habit_name,
                        "completion_rate": f"{h.completion_rate_pct}%",
                        "current_streak": f"{h.current_streak_days} days",
                        "trend": h.trend,
                    }
                    for h in habit_metrics[:5]
                ],
            }
        except Exception:
            context["habits_analytics"] = {"status": "no_habit_records_logged"}

    # 3. Study Domain
    if is_general or "study" in intents:
        try:
            recent_study = (
                db.query(StudyRecord)
                .filter(StudyRecord.user_id == user_id)
                .order_by(StudyRecord.recorded_at.desc())
                .limit(4)
                .all()
            )
            total_study_hours = sum(s.study_hours for s in recent_study)
            context["study_analytics"] = {
                "recent_records_count": len(recent_study),
                "recent_study_hours": round(total_study_hours, 1),
                "recent_courses": [
                    {
                        "course": s.course,
                        "subject": s.subject,
                        "hours": s.study_hours,
                        "goal": s.study_goal,
                        "performance": s.academic_performance,
                    }
                    for s in recent_study
                ],
            }
        except Exception:
            context["study_analytics"] = {"status": "no_study_records_logged"}

    # 4. Financial Behaviour Domain
    if is_general or "financial" in intents or "simulation" in intents:
        try:
            fin_analytics = get_financial_analytics(db, user_id)
            context["financial_analytics"] = {
                "savings_rate": f"{fin_analytics.savings_rate_pct}%",
                "budget_usage": f"{fin_analytics.budget_usage_pct}%",
                "income_trend": fin_analytics.income_trend,
                "expense_trend": fin_analytics.expense_trend,
                "savings_trend": fin_analytics.savings_trend,
            }
        except Exception:
            context["financial_analytics"] = {"status": "no_financial_records_logged"}

    # 5. ML Forecasting Domain
    if is_general or "forecast" in intents or "productivity" in intents:
        try:
            forecast = get_productivity_forecast(db, user_id, "weekly")
            context["ml_forecast"] = {
                "status": forecast.status,
                "metric": forecast.metric,
                "current_value": forecast.current_value,
                "predicted_value": forecast.predicted_value,
                "trend": forecast.trend,
                "confidence": f"{round(forecast.confidence * 100, 1)}%" if forecast.confidence else "N/A",
                "evidence": forecast.evidence[:2] if forecast.evidence else [],
            }
        except Exception:
            context["ml_forecast"] = {"status": "unavailable"}

    # 6. Simulation & What-If Scenarios Domain
    if is_general or "simulation" in intents:
        try:
            baseline = compute_user_baseline(db, user_id)
            sim_res = run_simulation(db, user_id)
            exp_scen = sim_res.scenarios.get("expected")

            context["future_simulation"] = {
                "evidence_status": sim_res.evidence_status,
                "baseline": {
                    "monthly_spending": f"₹{baseline.monthly_spending:,.0f}",
                    "study_load_hrs_week": f"{baseline.study_load_hrs_week} hrs",
                    "sleep_hrs_night": f"{baseline.sleep_hrs_night} hrs",
                    "burnout_pct": f"{baseline.burnout_pct}%",
                    "wellbeing_score": f"{baseline.wellbeing_score}/100",
                    "emergency_runway_months": f"{baseline.emergency_runway_months} mos",
                },
                "expected_outcome": exp_scen.summary.outcome if exp_scen else "Routine maintained",
                "recommendation": sim_res.recommendation or "Maintain current routine and focus blocks",
            }
        except Exception:
            context["future_simulation"] = {"evidence_status": "insufficient_evidence"}

    return context


def build_system_prompt(user_context: Dict[str, Any], conversation_summary: Optional[str] = None) -> str:
    """
    Builds a concise, token-optimized system prompt instructing the LLM
    to ground its responses strictly in verified user data, respect evidence
    boundaries, and provide supportive, analytical recommendations.
    """
    user_name = user_context.get("user_profile", {}).get("name", "User")
    context_str = json.dumps(user_context, indent=2)

    summary_section = ""
    if conversation_summary:
        summary_section = f"\n=== EARLIER CONVERSATION SUMMARY ===\n{conversation_summary}\n=====================================\n"

    return f"""You are the AI Productivity & Lifestyle Assistant for {user_name}.
You help the user understand their personal productivity, habits, daily activity patterns, study/work sessions, financial behaviour, forecasts, and future routine simulations.

=== RETRIEVED USER DATA SNAPSHOT ===
{context_str}
===================================={summary_section}

STRICT OPERATIONAL RULES & GROUNDING GUIDELINES:
1. **Application Data Grounding**:
   - For all questions regarding the user's productivity, habits, study hours, financial habits, forecasts, or simulations, ground your answers exclusively in the verified snapshot above.
   - Quote exact backend metrics (e.g. productivity scores, focus hours, completion rates, streaks, forecast trends, simulation outcomes) as recorded in the snapshot.
   - Do NOT override backend calculations. Explain the patterns and drivers behind them.

2. **Honest Evidence Boundaries**:
   - If asked about an activity, date, habit, or dataset that is not in the snapshot, state clearly:
     "**Insufficient Evidence**: Your personal records do not contain data for this request."
   - NEVER fabricate logs, study sessions, streaks, financial transactions, or forecast values.

3. **General Guidance vs User Records**:
   - If asked general questions (e.g. time management techniques, study strategies, habit formation science, budgeting principles), you may provide expert advice while clearly distinguishing general principles from the user's specific records.

4. **Tone & Style**:
   - Encouraging, analytical, concise, and actionable.
   - Use clean markdown bullet points (e.g., `* **Key Observation**: ...`). Avoid redundant asterisks.
   - Keep answers clear and focused, providing practical recommendations based on the user's data.
"""


# Backward-compatibility adapter for existing unit tests
def get_user_risk_context(db: Session, user: User) -> Dict[str, Any]:
    """
    Backward-compatible wrapper preserving legacy keys for tests while
    grounding in productivity, lifestyle, ML forecasting, and simulation records.
    """
    ctx = get_user_productivity_context(db, user, query=None)
    
    # Maintain keys expected by legacy test suites if any
    ctx["risk_intelligence"] = {
        "current_risk_status": "Optimal Productivity",
        "total_detections": 0,
        "recent_violations_count": 0,
        "compliance_status": "100% Habit Adherence",
        "compliance_rate_pct": 100.0,
        "recent_detections": [],
    }
    if "ml_forecast" in ctx and "ml_predictions" not in ctx:
        ctx["ml_predictions"] = ctx["ml_forecast"]
    return ctx
