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
)
from app.models.user import User
from app.models.profile import UserProfile
from app.models.financial import FinancialRecord
from app.models.study import StudyRecord
from app.models.work_session import WorkSession
from app.models.habit import HabitRecord
from app.models.settings import UserSettings
from app.auth import hash_password
from app.services.activity import log_activity
from app.services.synthetic_data import seed_synthetic_12week_dataset
from datetime import date
from sqlalchemy import text

app = FastAPI(
    title="Data Collection & User Profiling API",
    description="Milestone 1 — Data Collection & User Profiling REST API with Authentication & PostgreSQL integration.",
    version="1.0.0"
)

# Configure CORS for credentials & cookies
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.case_insensitive_cors_list,
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
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50)"))
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS location VARCHAR(255)"))
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio VARCHAR(2000)"))
        conn.execute(text("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS theme VARCHAR(20) NOT NULL DEFAULT 'system'"))

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
            if existing_default and settings.DEV_AUTO_LOGIN:
                existing_default.password_hash = hash_password("password123")
                db.commit()

        if user_count == 0:
            default_user = User(
                name="Alex Morgan",
                email="alex.morgan@example.com",
                password_hash=hash_password("password123")
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
    finally:
        db.close()
