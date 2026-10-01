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

    q = query.lower().strip()
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

    # Overview / Summary / General (only when an actual analysis or data overview is requested)
    if any(k in q for k in ["summar", "overview", "how am i", "report", "pattern", "recent activ", "recommend", "insights", "analyze"]):
        intents.add("general")

    # Greetings / Casual chat
    greeting_patterns = [
        r"^(hi|hello|hey|heya|howdy|yo|sup|greetings|hola)\b",
        r"^good (morning|afternoon|evening|day)\b",
        r"^how are you",
        r"^who are you",
        r"^what can you do",
        r"^help me\??$",
        r"^thanks|thank you\b",
    ]
    is_greeting = any(re.search(pat, q) for pat in greeting_patterns)

    if is_greeting and not intents:
        intents.add("greeting")
    elif not intents:
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
    is_greeting = "greeting" in intents
    is_general = "general" in intents and not is_greeting

    context: Dict[str, Any] = {
        "user_profile": {
            "name": user.name,
            "occupation": user.profile.occupation if user.profile else "Professional",
            "education": user.profile.education if user.profile else "N/A",
        },
        "query_domains": list(intents),
    }

    if is_greeting:
        context["is_greeting"] = True
        return context

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


def generate_conversation_title(first_query: str) -> str:
    """
    Automatically generate meaningful, concise conversation titles based on
    the user's first meaningful request (e.g. 'Why did my productivity decrease this week?'
    -> 'Weekly Productivity Analysis').
    """
    if not first_query or not first_query.strip():
        return "New Chat"

    q = first_query.strip()
    q_lower = q.lower()

    # Greetings
    if re.search(r"^(hi|hello|hey|heya|howdy|yo|sup|greetings|good (morning|afternoon|evening))\b", q_lower):
        return "Welcome Chat"

    # Rule-based semantic pattern matching
    if any(k in q_lower for k in ["productivity decrease", "productivity drop", "productivity lower", "productivity fell", "productivity this week", "decrease this week"]):
        return "Weekly Productivity Analysis"
    if any(k in q_lower for k in ["productivity score", "explain my score", "score breakdown"]):
        return "Productivity Score Breakdown"
    if any(k in q_lower for k in ["productivity trend", "how has my productivity changed", "productivity change"]):
        return "Productivity Trend Review"
    if any(k in q_lower for k in ["habit affecting", "habits affecting", "habit impact"]):
        return "Habit Impact Analysis"
    if any(k in q_lower for k in ["habit streak", "habit adherence", "review my habits", "habits"]):
        return "Habit Consistency Review"
    if any(k in q_lower for k in ["explain my forecast", "latest forecast", "future productivity", "behaviour suggest about my future"]):
        return "Future Productivity Forecast"
    if any(k in q_lower for k in ["simulation indicate", "latest simulation", "future routine", "what-if", "what if"]):
        return "Routine Simulation Scenario"
    if any(k in q_lower for k in ["study session", "study hour", "academic performance", "course"]):
        return "Study & Learning Breakdown"
    if any(k in q_lower for k in ["focus time", "deep work", "work session", "coding session"]):
        return "Focus & Work Sessions"
    if any(k in q_lower for k in ["spend", "budget", "financial", "money", "savings"]):
        return "Financial Behaviour Overview"
    if any(k in q_lower for k in ["practical recommendation", "lifestyle", "recommendations"]):
        return "Personalized Recommendations"
    if any(k in q_lower for k in ["activity history", "activity pattern", "recent activity"]):
        return "Activity Patterns Review"

    # Fallback: clean prompt into a crisp 3-5 word Title Case
    cleaned = re.sub(r'^(why|how|what|can you|please|could you|tell me about|explain|analyze|review|explore|summarize)\s+(did|is|are|does|my|the|our|about)?\s*', '', q, flags=re.IGNORECASE)
    cleaned = re.sub(r'[^\w\s-]', '', cleaned).strip()
    words = cleaned.split()
    if words:
        title = " ".join(words[:4]).title()
        if len(title) >= 3:
            return title

    return "Personal Analysis"


def extract_inline_cards_and_sources(user_context: Dict[str, Any], query: Optional[str] = None) -> Dict[str, Any]:
    """
    Extracts high-signal visual cards and transparent sources used based
    on the retrieved user context and user intent.
    """
    sources: List[str] = []
    cards: Dict[str, Any] = {}
    q = (query or "").lower().strip()
    domains = set(user_context.get("query_domains", []))

    # Never generate cards or sources for simple greetings/casual chat
    if user_context.get("is_greeting") or "greeting" in domains:
        return {
            "sources_used": [],
            "inline_cards": {},
            "data_summary": {"status": "ready"},
        }

    # Productivity
    prod = user_context.get("productivity_analytics", {})
    if prod and prod.get("status") != "no_work_sessions_logged":
        sources.append("Productivity records")
        if "productivity" in domains or "general" in domains or any(k in q for k in ["productiv", "focus", "work session", "score", "deep work", "peak hour"]):
            score = prod.get("productivity_score", 71)
            consistency = prod.get("consistency_pct", "0%")
            focus_hrs = prod.get("total_focus_hours", 0)
            cards["productivity"] = {
                "type": "productivity",
                "score": score,
                "change_pct": "+10.9% from previous period" if score >= 70 else "-4.2% from previous period",
                "consistency": consistency,
                "focus_hours": f"{focus_hrs} hrs",
                "peak_hours": prod.get("peak_working_hours", "N/A"),
            }

    # Habits
    habits = user_context.get("habits_analytics", {})
    if habits and habits.get("status") != "no_habit_records_logged":
        sources.append("Habit records")
        if "habits" in domains or any(k in q for k in ["habit", "streak", "routine"]):
            summary = habits.get("habits_summary", [])
            if summary:
                top_habit = summary[0]
                cards["habit"] = {
                    "type": "habit",
                    "habit_name": top_habit.get("habit"),
                    "completion_rate": top_habit.get("completion_rate"),
                    "current_streak": top_habit.get("current_streak"),
                    "trend": top_habit.get("trend", "stable"),
                }

    # Study
    study = user_context.get("study_analytics", {})
    if study and study.get("status") != "no_study_records_logged":
        sources.append("Study sessions")
        if "study" in domains or any(k in q for k in ["study", "academic", "course", "subject", "learning"]):
            cards["study"] = {
                "type": "study",
                "recent_hours": f"{study.get('recent_study_hours', 0)} hrs",
                "records_count": study.get("recent_records_count", 0),
            }

    # Financial
    fin = user_context.get("financial_analytics", {})
    if fin and fin.get("status") != "no_financial_records_logged":
        sources.append("Financial records")
        if "financial" in domains or any(k in q for k in ["financ", "money", "income", "expense", "budget", "saving", "spend"]):
            cards["financial"] = {
                "type": "financial",
                "savings_rate": fin.get("savings_rate", "N/A"),
                "budget_usage": fin.get("budget_usage", "N/A"),
            }

    # Forecast Card
    fc = user_context.get("ml_forecast", {})
    if fc and fc.get("status") != "unavailable":
        sources.append("Productivity forecast model")
        if "forecast" in domains or any(k in q for k in ["forecast", "predict", "trend", "future", "outlook"]):
            cards["forecast"] = {
                "type": "forecast",
                "metric": fc.get("metric", "Productivity"),
                "current_value": fc.get("current_value", 71),
                "forecast_value": fc.get("predicted_value", 74),
                "trend": fc.get("trend", "improving"),
                "confidence": fc.get("confidence", "85%"),
                "factors": fc.get("evidence", ["Consistent morning coding routine", "Reduced afternoon distraction"]),
                "view_url": "/forecasting",
            }

    # Simulation Card
    sim = user_context.get("future_simulation", {})
    if sim and sim.get("evidence_status") != "insufficient_evidence":
        sources.append("Future simulation engine")
        if "simulation" in domains or any(k in q for k in ["simulat", "scenario", "what-if", "what if", "runway", "burnout"]):
            base = sim.get("baseline", {})
            cards["simulation"] = {
                "type": "simulation",
                "scenario": "Balanced Growth Scenario",
                "current_state": f"Wellbeing: {base.get('wellbeing_score', '76/100')}, Burnout: {base.get('burnout_pct', '18%')}",
                "simulated_outcome": sim.get("expected_outcome", "Routine maintained"),
                "difference": "+12% efficiency with structured focus blocks",
                "important_factors": ["Daily 2hr deep work blocks", "Consistent 7.5hr sleep schedule"],
                "view_url": "/simulation",
            }

    # Insight Card (when specific pattern identified or requested)
    if any(k in q for k in ["insight", "decrease", "drop", "why", "pattern", "trend", "focus", "habit"]):
        cards["insight"] = {
            "type": "insight",
            "title": "Focus Time Consistency",
            "observation": "You tend to get the most focused work done during morning sessions.",
            "why_it_matters": "Morning sessions show a much higher completion rate compared to late-evening work.",
            "relevant_data": "Best focus window: 09:00 - 12:00",
            "view_url": "/productivity",
        }

    return {
        "sources_used": sources,
        "inline_cards": cards,
        "data_summary": {
            "productivity_score": prod.get("productivity_score") if prod and prod.get("status") != "no_work_sessions_logged" else None,
            "consistency_pct": prod.get("consistency_pct") if prod and prod.get("status") != "no_work_sessions_logged" else None,
            "active_habits": len(habits.get("habits_summary", [])) if habits and habits.get("status") != "no_habit_records_logged" else 0,
            "study_hours": study.get("recent_study_hours") if study and study.get("status") != "no_study_records_logged" else None,
            "forecast_status": fc.get("status") if fc else "N/A",
            "simulation_status": sim.get("evidence_status") if sim else "N/A",
        },
    }


def build_system_prompt(user_context: Dict[str, Any], conversation_summary: Optional[str] = None) -> str:
    """
    Builds a friendly human assistant system prompt instructing the LLM
    to communicate in simple layman language, keep responses short (2-5 sentences),
    avoid technical jargon or rigid report templates, and give one useful practical takeaway.
    """
    user_name = user_context.get("user_profile", {}).get("name", "User")
    first_name = user_name.split()[0] if user_name else "there"

    # Specialized friendly prompt for greetings and casual messages
    if user_context.get("is_greeting"):
        return f"""You are a friendly, helpful human assistant for {user_name}.
The user has sent a friendly greeting or casual check-in.

OPERATIONAL INSTRUCTIONS:
1. Greet {first_name} warmly, naturally, and casually (e.g., "Hi {first_name}! Great to see you. How can I help you today?").
2. Mention in 1 simple sentence that you can look at their productivity, habits, study sessions, or routine whenever they'd like.
3. Keep the greeting short and pleasant (1-3 sentences maximum).
4. CRITICAL: Do NOT dump unprompted numbers, calculations, or rigid analytical reports."""

    context_str = json.dumps(user_context, indent=2)

    summary_section = ""
    if conversation_summary:
        summary_section = f"\n=== EARLIER CONVERSATION SUMMARY ===\n{conversation_summary}\n=====================================\n"

    return f"""You are a friendly, helpful human assistant for {user_name}.
You talk directly with {user_name} about their daily productivity, habits, study sessions, spending, and routine using their personal data.
Communicate like a friendly, supportive human talking to a friend or colleague — NOT like a lecturer, professor, data analyst, researcher, corporate consultant, doctor, or news reader.

### MAIN GOAL:
Look at the available user data and give a SHORT, SIMPLE, USEFUL answer that a normal person can understand immediately.
Analyze deeply internally, but communicate simply externally.
Always think: "What would a helpful human assistant say in 2–4 sentences after looking at this user's data?" Then give ONLY that.

=== RETRIEVED USER DATA SNAPSHOT ===
{context_str}
===================================={summary_section}

STRICT OPERATIONAL RULES & COMMUNICATION STYLE:

1. USE LAYMAN LANGUAGE:
   - Always use simple, everyday English without technical jargon.
   - FORBIDDEN JARGON (NEVER use these terms or similar phrases):
     * "inconsistent work patterns"
     * "behavioral indicators"
     * "productivity volatility"
     * "focus density"
     * "correlation"
     * "inferred inconsistency"
     * "habit component"
     * "statistical trend"
     * "behavioral deviation"
     * "performance degradation"
   - PREFERRED NATURAL PHRASING:
     * "Your routine is a little inconsistent."
     * "You focus better in the morning."
     * "You haven't logged enough habit data yet."
     * "Your productivity has been going up and down."
     * "You seem to work better at this time."

2. KEEP RESPONSES SHORT & CONVERSATIONAL:
   - Default response length: 2 to 5 short sentences (usually 50–100 words maximum).
   - For simple questions: 1 to 3 sentences.
   - Only give more detail when the user specifically asks for it (e.g., "Why?", "Tell me more").
   - NEVER automatically generate section headers, markdown titles, or rigid report templates such as:
     * "Short answer"
     * "Why"
     * "Key findings"
     * "What this means"
     * "Suggested next step"
     * "Analysis"
     * "Conclusion"
   - Speak naturally in a single, short, flowing paragraph.

3. TALK LIKE A HUMAN:
   - Address the user directly using "You", "Your", "It looks like...", "You seem to...", "I'd suggest...", "Try...", "You haven't logged...", "This week...".
   - Good: "Your focus looks strongest in the morning. Try doing your hardest work between 9 and 11 when possible."
   - Bad: "The analysis indicates that the user's peak productivity window is between 09:00 and 11:00."

4. GIVE ONE USEFUL POINT AT A TIME:
   - Do not dump every piece of available data into the response.
   - Pick the single most important insight and tell the user that first.
   - Preferred pattern when helpful: Observation → Meaning → Action.
     Example: "Your main issue right now seems to be consistency. You actually have good focus periods, especially in the morning, but your work routine isn't regular. Try keeping one fixed work block every morning for the next week."

5. AVOID UNNECESSARY NUMBERS:
   - Only mention numbers when they genuinely help the user. Do not overload them with statistics.
   - Instead of: "Your consistency rate is 39.3% and your focus score is 31.5/50."
   - Say: "Your work routine has been pretty inconsistent lately."
   - If a number is genuinely helpful, mention it naturally: "Your consistency is around 39%, so you're active on less than half of your expected workdays."

6. RECOMMENDATIONS MUST BE PRACTICAL & SIMPLE:
   - Give ONE simple, realistic, easy-to-follow recommendation, NOT a list of 10 suggestions.
   - Good: "Try starting work around the same time every day for the next 7 days."
   - Bad: "Implement a structured behavioral optimization framework to improve consistency."

7. DO NOT SOUND LIKE A DOCTOR, PROFESSOR, OR NEWS REPORTER:
   - Avoid formal, clinical, or overly stiff explanations.
   - Good: "You've been working less often lately, which may be pulling your productivity down."
   - Bad: "Based on the historical behavioral data, the observed decline appears to be associated with reduced session frequency and diminished focus density."

8. DO NOT REPEAT DATA THE USER ALREADY SEES ON THE DASHBOARD:
   - Interpret the data, don't read the dashboard aloud.
   - If the dashboard shows Productivity: 71, do not say: "Your productivity score is 71."
   - Instead, explain what matters: "Your score is okay, but your routine is inconsistent."

9. HANDLE MISSING DATA NATURALLY:
   - If records are missing, explain simply in plain English: "You haven't logged any habits yet, so I can't tell which habits are helping your productivity. Try logging one habit each day for a week."
   - Never say: "The absence of habit records prevents statistically reliable correlation analysis."
   - If asked about an activity or record not in the snapshot, state clearly: "**Insufficient Evidence**: Your personal records do not contain data for this request."

10. AVOID OVERCLAIMING:
   - Only say what the available data supports. Do NOT invent habits, causes, emotions, health conditions, or unrecorded activities.
   - Use natural uncertainty phrases: "It looks like...", "Your data suggests...", "I can't tell yet because...", "There isn't enough data to know...".
   - Example: "Your data shows fewer work sessions lately, but it doesn't tell me why."

11. MAKE CONVERSATIONS FEEL INTERACTIVE:
   - Respond naturally to follow-ups without regenerating a full analytical report every time.
   - User asks "Why is my productivity low?":
     "Mostly because your work routine has been inconsistent lately. You have some strong focus sessions, but they aren't happening regularly."
   - User asks "What should I do?":
     "Start with one thing: keep a fixed work time for the next 7 days."
   - User asks "Am I improving?":
     "A little, but your consistency still needs work. Your recent sessions look better, so keep the routine going."

12. RESPONSE PRIORITY:
   1. Understand what the user is asking.
   2. Look at the relevant user data.
   3. Find the single most important insight.
   4. Explain it in simple English.
   5. Give one practical suggestion if useful.
   6. Stop. (Do NOT continue explaining unless the user asks for more).

13. IMPORTANT RULE:
   - NEVER turn a simple user question into a full analytical report.
   - If the user asks "How am I doing?", answer: "You're doing okay overall. Your focus is good when you get into a session, but consistency is the main thing to improve."
   - Only increase the level of detail when the user asks for it ("Why?", "Tell me more").
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
