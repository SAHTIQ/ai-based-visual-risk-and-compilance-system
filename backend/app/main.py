from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, SessionLocal, Base
from app.routers import (
    auth_router,
    users_router,
    profiles_router,
    financial_router,
    study_router,
    habits_router,
    activity_router,
    settings_router,
    behavior_router,
    analytics_router,
    forecast_router,
    simulation_router,
    chat_router,
    risk_router,
)
from app.models.user import User
from app.models.profile import UserProfile
from app.models.financial import FinancialRecord
from app.models.study import StudyRecord
from app.models.work_session import WorkSession
from app.models.habit import HabitRecord
from app.models.settings import UserSettings
from app.models.risk import RiskDetection
from app.models.chat import Conversation, ChatMessage
from app.auth import hash_password
from app.services.activity import log_activity
from app.services.synthetic_data import seed_synthetic_12week_dataset
from datetime import date, datetime, timezone, timedelta
from sqlalchemy import text

app = FastAPI(
    title="AI-Based Visual Risk and Compliance Intelligence System",
    description="Milestone 4 — AI Assistant Integration, Persistent Conversations, and Redesigned Risk & Compliance Dashboard.",
    version="4.0.0"
)

# Configure CORS for credentials & cookies
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.case_insensitive_cors_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(financial_router)
app.include_router(study_router)
app.include_router(habits_router)
app.include_router(activity_router)
app.include_router(settings_router)
app.include_router(behavior_router)
app.include_router(analytics_router)
app.include_router(forecast_router)
app.include_router(simulation_router)
app.include_router(chat_router)
app.include_router(risk_router)

@app.get("/", tags=["Health"])
def root_health_check():
    return {
        "status": "healthy",
        "service": "Data Collection & User Profiling API",
        "milestone": "Milestone 1 — Authenticated",
        "docs": "/docs"
    }

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Add columns introduced after the initial schema without destroying existing data.
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE habit_records ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL DEFAULT 'Routine'"))
        conn.execute(text("ALTER TABLE habit_records ADD COLUMN IF NOT EXISTS frequency VARCHAR(100) NOT NULL DEFAULT 'Daily'"))
        conn.execute(text("ALTER TABLE habit_records ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE financial_records ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE risk_detections ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50)"))
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS location VARCHAR(255)"))
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio VARCHAR(2000)"))
        conn.execute(text("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS theme VARCHAR(20) NOT NULL DEFAULT 'system'"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS user_key VARCHAR(50)"))
        conn.execute(text("ALTER TABLE users ALTER COLUMN user_key TYPE VARCHAR(50)"))
        conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE"))

    # Auto-seed initial test user if database is completely empty
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count > 0:
            # In local development the frontend auto-signs into the seeded account.
            # Always keep that development account's password deterministic so an
            # existing database created by an older build cannot leave the UI
            # permanently stuck behind a 401 during auto-login. This is disabled
            # when DEV_AUTO_LOGIN=False.
            existing_default = db.query(User).filter(User.email == "alex.morgan@example.com").first()
            if existing_default and settings.is_dev_auto_login_allowed:
                existing_default.password_hash = hash_password("password123")
                existing_default.role = "admin"
                db.commit()

        if user_count == 0:
            default_user = User(
                name="Alex Morgan",
                email="alex.morgan@example.com",
                password_hash=hash_password("password123"),
                role="admin"
            )
            db.add(default_user)
            db.commit()
            db.refresh(default_user)

            default_profile = UserProfile(
                user_id=default_user.id,
                age=24,
                gender="Female",
                occupation="Graduate Researcher & Analyst",
                education="M.S. in Information Systems"
            )
            db.add(default_profile)
            db.add(UserSettings(user_id=default_user.id))
            db.commit()

            # Initial sample financial records
            fin1 = FinancialRecord(
                user_id=default_user.id,
                income=4200.0,
                expenses=0.0,
                savings=1400.0,
                budget=4200.0,
                expense_category="Salary",
                financial_goal="Stipend & Savings",
                recorded_at=date(2026, 8, 25)
            )
            fin2 = FinancialRecord(
                user_id=default_user.id,
                income=0.0,
                expenses=1250.0,
                savings=0.0,
                budget=1300.0,
                expense_category="Housing",
                financial_goal="Rent & Utilities",
                recorded_at=date(2026, 8, 24)
            )
            db.add_all([fin1, fin2])

            # Initial sample study records
            std1 = StudyRecord(
                user_id=default_user.id,
                course="CS-501",
                subject="Database Systems & SQL Optimization",
                study_hours=3.5,
                study_goal=4.0,
                academic_performance="Excellent",
                recorded_at=date(2026, 8, 28)
            )
            std2 = StudyRecord(
                user_id=default_user.id,
                course="IS-620",
                subject="Data Structures & Algorithms",
                study_hours=4.0,
                study_goal=4.0,
                academic_performance="Excellent",
                recorded_at=date(2026, 8, 27)
            )
            db.add_all([std1, std2])

            # Initial sample habits
            hab1 = HabitRecord(
                user_id=default_user.id,
                habit_name="Daily Exercise & Cardio",
                category="Fitness",
                completed=True,
                duration="45 mins",
                frequency="Daily",
                recorded_at=date(2026, 8, 29)
            )
            hab2 = HabitRecord(
                user_id=default_user.id,
                habit_name="Sleep Routine (8 Hours Rest)",
                category="Health",
                completed=False,
                duration="8 hours",
                frequency="Daily",
                recorded_at=date(2026, 8, 29)
            )
            db.add_all([hab1, hab2])
            db.commit()

            # Seed activity history
            log_activity(
                db,
                user_id=default_user.id,
                activity_type="REGISTER",
                description="Initialized default user profile and data records"
            )

        # The built-in demo account always starts with the 12-week dataset.
        # Seed only when no demo work sessions exist so application restarts do
        # not regenerate or overwrite existing data. Real user data is untouched.
        default_user = db.query(User).filter(User.email == "alex.morgan@example.com").first()
        if default_user:
            demo_count = (
                db.query(WorkSession)
                .filter(WorkSession.user_id == default_user.id, WorkSession.is_demo.is_(True))
                .count()
            )
            if demo_count == 0:
                seed_synthetic_12week_dataset(db, default_user.id)

            # Seed initial visual risk detections if none exist for default user
            detection_count = db.query(RiskDetection).filter(RiskDetection.user_id == default_user.id).count()
            if detection_count == 0:
                now_utc = datetime.now(timezone.utc)
                initial_detections = [
                    RiskDetection(
                        user_id=default_user.id,
                        detected_object="Missing Head Protection (Hard Hat)",
                        risk_level="High",
                        confidence=0.96,
                        rule_code="OSHA-1910.135",
                        rule_description="Head Protection Standard: Failure to wear protective helmet in designated overhead hazard zone.",
                        evidence_summary="Optical frame capture #0842 indicates worker at Zone B assembly line without hard hat under overhead crane pathway.",
                        image_path="/evidence/ppe_helmet_01.jpg",
                        status="active",
                        is_violation=True,
                        detected_at=now_utc - timedelta(days=1, hours=3),
                    ),
                    RiskDetection(
                        user_id=default_user.id,
                        detected_object="Emergency Exit Corridor Obstruction",
                        risk_level="High",
                        confidence=0.94,
                        rule_code="NFPA-101-7.2",
                        rule_description="Means of Egress: Exit paths and emergency doors must remain unobstructed at all times.",
                        evidence_summary="Visual feed detected palletized storage boxes encroaching 48 inches into primary fire egress corridor.",
                        image_path="/evidence/exit_block_02.jpg",
                        status="mitigated",
                        is_violation=True,
                        detected_at=now_utc - timedelta(days=3, hours=5),
                    ),
                    RiskDetection(
                        user_id=default_user.id,
                        detected_object="High-Visibility Safety Vest Not Detected",
                        risk_level="Medium",
                        confidence=0.91,
                        rule_code="ANSI-ISEA-107",
                        rule_description="High-Visibility Safety Apparel: Mandatory in active forklift and transit zones.",
                        evidence_summary="Worker detected in aisle 3 material transfer zone without reflective vest during forklift active transit.",
                        image_path="/evidence/vest_missing_03.jpg",
                        status="active",
                        is_violation=True,
                        detected_at=now_utc - timedelta(hours=8),
                    ),
                    RiskDetection(
                        user_id=default_user.id,
                        detected_object="Improper Heavy Material Lifting Posture",
                        risk_level="Medium",
                        confidence=0.88,
                        rule_code="ISO-11228-1",
                        rule_description="Ergonomic Manual Handling Standard: Recommended load limits and biomechanical posture.",
                        evidence_summary="Skeletal pose estimation recorded repetitive lumbar flexion exceeding 60 degrees during heavy lifting.",
                        image_path="/evidence/ergonomic_lift_04.jpg",
                        status="active",
                        is_violation=True,
                        detected_at=now_utc - timedelta(hours=2),
                    ),
                    RiskDetection(
                        user_id=default_user.id,
                        detected_object="Compliant Eye & Face Protection Verified",
                        risk_level="Low",
                        confidence=0.98,
                        rule_code="OSHA-1910.133",
                        rule_description="Eye and Face Protection: Mandatory during grinding, welding, and chemical handling.",
                        evidence_summary="Worker equipped with certified polycarbonate impact goggles and face shield during metal processing.",
                        image_path="/evidence/eye_protection_05.jpg",
                        status="cleared",
                        is_violation=False,
                        detected_at=now_utc - timedelta(minutes=45),
                    ),
                    RiskDetection(
                        user_id=default_user.id,
                        detected_object="Safe Machine Guarding Barrier Active",
                        risk_level="Low",
                        confidence=0.99,
                        rule_code="OSHA-1910.212",
                        rule_description="General Machine Guarding Requirements: Point of operation barrier integrity.",
                        evidence_summary="Optical interlock barrier confirmed in locked position prior to hydraulic press cycle initiation.",
                        image_path="/evidence/machine_guard_06.jpg",
                        status="cleared",
                        is_violation=False,
                        detected_at=now_utc - timedelta(hours=5),
                    ),
                    RiskDetection(
                        user_id=default_user.id,
                        detected_object="Unauthorized Personnel in Restricted Zone",
                        risk_level="High",
                        confidence=0.92,
                        rule_code="COMP-SEC-04",
                        rule_description="Restricted High-Voltage Equipment Zone Access Policy.",
                        evidence_summary="Perimeter sensor boundary crossed without biometric badge authorization event.",
                        image_path="/evidence/restricted_zone_07.jpg",
                        status="investigating",
                        is_violation=True,
                        detected_at=now_utc - timedelta(days=5, hours=7),
                    ),
                    RiskDetection(
                        user_id=default_user.id,
                        detected_object="Walkway Liquid Spill Hazard Detected",
                        risk_level="Medium",
                        confidence=0.89,
                        rule_code="OSHA-1910.22",
                        rule_description="Walking-Working Surfaces: Surfaces must remain clean, dry, and slip-resistant.",
                        evidence_summary="Surface sheen detector flagged 3ft hydraulic oil residue near conveyor 2 bearing block.",
                        image_path="/evidence/spill_hazard_08.jpg",
                        status="mitigated",
                        is_violation=True,
                        detected_at=now_utc - timedelta(days=7, hours=2),
                    ),
                    RiskDetection(
                        user_id=default_user.id,
                        detected_object="Compliant Hearing Protection Verified",
                        risk_level="Low",
                        confidence=0.97,
                        rule_code="OSHA-1910.95",
                        rule_description="Occupational Noise Exposure: Mandatory ear protection in acoustic zones exceeding 85dB.",
                        evidence_summary="Over-ear acoustic defenders verified on technician during stamping operation.",
                        image_path="/evidence/hearing_ppe_09.jpg",
                        status="cleared",
                        is_violation=False,
                        detected_at=now_utc - timedelta(minutes=20),
                    ),
                ]
                db.add_all(initial_detections)
                db.commit()
    finally:
        db.close()

