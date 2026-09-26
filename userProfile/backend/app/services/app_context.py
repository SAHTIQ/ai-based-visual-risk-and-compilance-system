import json
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.risk import RiskDetection
from app.models.work_session import WorkSession
from app.models.financial import FinancialRecord
from app.models.habit import HabitRecord
from app.services.ml_forecasting import get_productivity_forecast
from app.services.simulation import compute_user_baseline, run_simulation


def get_user_risk_context(db: Session, user: User) -> Dict[str, Any]:
    """
    Extracts all verified risk, compliance, detection, ML, and simulation records
    belonging strictly to the authenticated user.
    """
    now_utc = datetime.now(timezone.utc)
    user_id = user.id

    # 1. Visual Risk & Compliance Detections
    detections = (
        db.query(RiskDetection)
        .filter(RiskDetection.user_id == user_id)
        .order_by(RiskDetection.detected_at.desc())
        .all()
    )
    total_detections = len(detections)
    
    # Recent 30 days
    past_30d = now_utc - timedelta(days=30)
    recent_detections = [d for d in detections if d.detected_at >= past_30d]
    recent_violations = [d for d in recent_detections if d.is_violation]
    total_violations = [d for d in detections if d.is_violation]

    # Current risk status determination
    high_count = sum(1 for d in recent_detections if d.risk_level == "High")
    med_count = sum(1 for d in recent_detections if d.risk_level == "Medium")
    if high_count > 0:
        current_risk_status = "Elevated Risk"
    elif med_count > 0:
        current_risk_status = "Moderate Risk"
    elif total_detections > 0:
        current_risk_status = "Low Risk"
    else:
        current_risk_status = "No Detections Recorded"

    # Compliance status
    if total_detections > 0:
        compliant_count = total_detections - len(total_violations)
        compliance_pct = round((compliant_count / total_detections) * 100, 1)
        compliance_status = f"{compliance_pct}% Compliant" if compliance_pct >= 85 else f"{compliance_pct}% (Attention Needed)"
    else:
        compliance_pct = 100.0
        compliance_status = "Compliant (No Violations Recorded)"

    recent_detections_summary = [
        {
            "id": d.id,
            "detected_object": d.detected_object,
            "risk_level": d.risk_level,
            "confidence": f"{round(d.confidence * 100, 1)}%",
            "rule_code": d.rule_code,
            "rule_description": d.rule_description,
            "evidence_summary": d.evidence_summary,
            "status": d.status,
            "is_violation": d.is_violation,
            "detected_at": d.detected_at.strftime("%Y-%m-%d %H:%M UTC"),
        }
        for d in detections[:8]
    ]

    # 2. Existing ML Productivity Forecast
    try:
        forecast = get_productivity_forecast(db, user_id, "weekly")
        forecast_info = {
            "status": forecast.status,
            "metric": forecast.metric,
            "current_value": forecast.current_value,
            "predicted_value": forecast.predicted_value,
            "trend": forecast.trend,
            "confidence": f"{round(forecast.confidence * 100, 1)}%" if forecast.confidence else "N/A",
            "model": forecast.model,
            "evidence": forecast.evidence[:3] if forecast.evidence else [],
        }
    except Exception:
        forecast_info = {"status": "unavailable", "note": "ML forecast service temporarily unavailable"}

    # 3. Milestone 3 Simulation Scenarios & Recommendations
    try:
        baseline = compute_user_baseline(db, user_id)
        sim_res = run_simulation(db, user_id)
        
        best_scen = sim_res.scenarios.get("best")
        exp_scen = sim_res.scenarios.get("expected")
        risk_scen = sim_res.scenarios.get("risk")

        sim_info = {
            "evidence_status": sim_res.evidence_status,
            "observations": sim_res.historical_observations,
            "baseline": {
                "savings": f"₹{baseline.savings:,.0f}",
                "monthly_spending": f"₹{baseline.monthly_spending:,.0f}",
                "study_load_hrs_week": f"{baseline.study_load_hrs_week} hrs",
                "sleep_hrs_night": f"{baseline.sleep_hrs_night} hrs",
                "burnout_pct": f"{baseline.burnout_pct}%",
                "wellbeing_score": f"{baseline.wellbeing_score}/100",
                "emergency_runway_months": f"{baseline.emergency_runway_months} months",
            },
            "scenarios": {
                "best_case": {
                    "outcome": best_scen.summary.outcome if best_scen else "N/A",
                    "recommendation": best_scen.recommendation if best_scen else "N/A",
                },
                "expected": {
                    "outcome": exp_scen.summary.outcome if exp_scen else "N/A",
                    "recommendation": exp_scen.recommendation if exp_scen else "N/A",
                },
                "risk_scenario": {
                    "outcome": risk_scen.summary.outcome if risk_scen else "N/A",
                    "recommendation": risk_scen.recommendation if risk_scen else "N/A",
                },
            },
            "primary_recommendation": sim_res.recommendation or (exp_scen.recommendation if exp_scen else "Maintain current schedule"),
            "ai_explanation": sim_res.ai_explanation or "Grounded in multi-factor historical baseline.",
            "rules_triggered": [r.condition_name for r in (sim_res.rule_trace or []) if r.is_satisfied],
        }
    except Exception:
        sim_info = {"evidence_status": "insufficient_evidence", "note": "Simulation requires more activity records"}

    return {
        "user_profile": {
            "name": user.name,
            "email": user.email,
            "occupation": user.profile.occupation if user.profile else "Analyst",
            "education": user.profile.education if user.profile else "N/A",
        },
        "risk_intelligence": {
            "current_risk_status": current_risk_status,
            "total_detections": total_detections,
            "recent_violations_count": len(recent_violations),
            "compliance_status": compliance_status,
            "compliance_rate_pct": compliance_pct,
            "recent_detections": recent_detections_summary,
        },
        "ml_predictions": forecast_info,
        "future_simulation": sim_info,
    }


def build_system_prompt(user_context: Dict[str, Any]) -> str:
    """
    Builds a rigorous, evidence-grounded system prompt enforcing accuracy,
    data isolation, and honest evidence boundaries.
    """
    user_name = user_context["user_profile"]["name"]
    context_str = json.dumps(user_context, indent=2)

    return f"""You are the intelligent AI Assistant embedded within the AI-Based Visual Risk and Compliance Intelligence System.
You are interacting with authenticated user: {user_name}.

=== AUTHENTICATED USER RECORDS & EVIDENCE SNAPSHOT ===
{context_str}
======================================================

STRICT OPERATIONAL RULES & GROUNDING GUIDELINES:
1. **Application Data Grounding**:
   - For all questions regarding risk status, compliance, detections, violations, ML forecasts, simulation scenarios, or recommendations, you MUST ground your answer exclusively in the verified snapshot above.
   - Explain existing model outputs and simulation results rather than recalculating, overriding, or replacing them.
   - Quote exact numbers (e.g., risk levels, violation counts, compliance percentages, simulation metrics, confidence scores) as recorded in the snapshot.

2. **No Hallucination / No Fabrication**:
   - NEVER fabricate risk scores, evidence files, inspection logs, rule codes, or simulation runs that are not present in the user records.
   - If asked about a record, detection, or date that does not exist in the snapshot, explicitly respond:
     "**Insufficient Evidence**: The application records do not contain evidence for this request."
   - Never claim an inspection was performed, an image was captured, or an alert was triggered when it was not.

3. **Distinguish Application Data from General Knowledge**:
   - When asked general questions (e.g., OSHA regulatory standards, safety best practices, machine learning concepts, general knowledge, study strategies, or brainstorming), you may freely answer using broad technical knowledge.
   - Clearly delineate what is verified from the user's actual database vs. general industry principles.

4. **Tone and Format**:
   - Professional, analytical, concise, and clean.
   - Use clean markdown bullet points with a single bold label (e.g., `* **Your main priority**: Details...`).
   - Never nest redundant asterisks back-to-back (avoid `**Label**: **Value**`; write `* **Label**: Value`).
   - Structure responses into clear, concise paragraphs with clean bullet points for readability.
"""
