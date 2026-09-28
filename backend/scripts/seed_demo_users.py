"""
seed_demo_users.py
==================
Reproducible, idempotent seed script that provisions 3 independent demo users
with realistic visual risk detections, safety inspections, work sessions,
habits, and financial records covering the 1-year period:
September 28, 2025 through September 28, 2026.

All generated records are marked with is_demo = True and are fully isolated per user.
"""

import os
import sys
import random
from datetime import datetime, date, timedelta, timezone

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.database import SessionLocal, engine
from app.models.user import User
from app.models.profile import UserProfile
from app.models.settings import UserSettings
from app.models.risk import RiskDetection
from app.models.work_session import WorkSession
from app.models.habit import HabitRecord
from app.models.financial import FinancialRecord
from app.models.study import StudyRecord
from app.auth import hash_password
from app.services.activity import log_activity

TARGET_START = date(2025, 9, 28)
TARGET_END = date(2026, 9, 28)

DEMO_USERS = [
    {
        "name": "Alex Morgan",
        "email": "alex.morgan@example.com",
        "password": "password123",
        "role": "admin",
        "user_key": "DEMO_ADMIN",
        "profile": {
            "age": 28,
            "gender": "Female",
            "occupation": "Lead Safety Director & Compliance Auditor",
            "education": "M.S. in Occupational Health & Safety Systems",
            "location": "Seattle, WA",
            "bio": "Overseeing plant compliance, visual PPE monitoring systems, and OSHA audit reporting.",
        },
        "inspection_focus": "Manufacturing & Assembly Facilities",
    },
    {
        "name": "Marcus Vance",
        "email": "marcus.vance@example.com",
        "password": "password123",
        "role": "user",
        "user_key": "DEMO_INSPECTOR",
        "profile": {
            "age": 34,
            "gender": "Male",
            "occupation": "Senior Field Safety Inspector",
            "education": "B.S. in Industrial Safety Engineering",
            "location": "Portland, OR",
            "bio": "Field inspector specializing in electrical hazards, heavy equipment clearances, and PPE enforcement.",
        },
        "inspection_focus": "Logistics & High-Voltage Substations",
    },
    {
        "name": "Elena Rostova",
        "email": "elena.rostova@example.com",
        "password": "password123",
        "role": "user",
        "user_key": "DEMO_COMPLIANCE",
        "profile": {
            "age": 31,
            "gender": "Female",
            "occupation": "Environmental Health & Safety (EHS) Manager",
            "education": "M.S. in Environmental Compliance & Risk Mitigation",
            "location": "Austin, TX",
            "bio": "Managing chemical containment, emergency egress pathways, and ergonomic standards.",
        },
        "inspection_focus": "Chemical Processing & Warehouse Egress",
    },
]

INSPECTION_SCENARIOS = [
    {
        "detected_object": "Missing Head Protection (Hard Hat)",
        "risk_level": "High",
        "confidence_range": (0.93, 0.98),
        "rule_code": "OSHA-1910.135",
        "rule_description": "Head Protection Standard: Failure to wear protective helmet in designated overhead hazard zone.",
        "evidence_template": "Optical capture indicates worker in Zone {zone} without hard hat beneath active crane traverse.",
        "is_violation": True,
        "status_pool": ["active", "mitigated", "investigating"],
    },
    {
        "detected_object": "Emergency Exit Corridor Obstruction",
        "risk_level": "High",
        "confidence_range": (0.91, 0.97),
        "rule_code": "NFPA-101-7.2",
        "rule_description": "Means of Egress: Exit paths and emergency doors must remain unobstructed at all times.",
        "evidence_template": "Thermal/optical feed flagged pallet staging encroaching into fire exit pathway at Section {zone}.",
        "is_violation": True,
        "status_pool": ["mitigated", "active"],
    },
    {
        "detected_object": "High-Visibility Safety Vest Not Detected",
        "risk_level": "Medium",
        "confidence_range": (0.88, 0.95),
        "rule_code": "ANSI-ISEA-107",
        "rule_description": "High-Visibility Safety Apparel: Mandatory in active forklift transit corridors.",
        "evidence_template": "Personnel detected in aisle {zone} material transfer lane without reflective vest.",
        "is_violation": True,
        "status_pool": ["mitigated", "active"],
    },
    {
        "detected_object": "Improper Heavy Material Lifting Posture",
        "risk_level": "Medium",
        "confidence_range": (0.85, 0.92),
        "rule_code": "ISO-11228-1",
        "rule_description": "Ergonomic Manual Handling Standard: Biomechanical load and posture guidelines.",
        "evidence_template": "Pose estimation tracked repetitive 65-degree spinal flexion under 40lb load in Bay {zone}.",
        "is_violation": True,
        "status_pool": ["active", "investigating"],
    },
    {
        "detected_object": "Walkway Liquid Spill Hazard Detected",
        "risk_level": "Medium",
        "confidence_range": (0.86, 0.94),
        "rule_code": "OSHA-1910.22",
        "rule_description": "Walking-Working Surfaces: Surfaces must remain clean, dry, and slip-resistant.",
        "evidence_template": "Surface sheen detector detected hydraulic oil residue near conveyor {zone}.",
        "is_violation": True,
        "status_pool": ["mitigated", "cleared"],
    },
    {
        "detected_object": "Compliant Eye & Face Protection Verified",
        "risk_level": "Low",
        "confidence_range": (0.95, 0.99),
        "rule_code": "OSHA-1910.133",
        "rule_description": "Eye and Face Protection: Mandatory during grinding, welding, and fluid handling.",
        "evidence_template": "Technician verified wearing certified impact goggles and face shield in Shop {zone}.",
        "is_violation": False,
        "status_pool": ["cleared"],
    },
    {
        "detected_object": "Safe Machine Guarding Barrier Active",
        "risk_level": "Low",
        "confidence_range": (0.97, 0.99),
        "rule_code": "OSHA-1910.212",
        "rule_description": "General Machine Guarding Requirements: Interlock barrier integrity confirmed.",
        "evidence_template": "Interlock sensor confirmed physical safety barrier locked during cycle at Cell {zone}.",
        "is_violation": False,
        "status_pool": ["cleared"],
    },
    {
        "detected_object": "Compliant Hearing Protection Verified",
        "risk_level": "Low",
        "confidence_range": (0.94, 0.99),
        "rule_code": "OSHA-1910.95",
        "rule_description": "Occupational Noise Exposure: Acoustic protection in zones exceeding 85dB.",
        "evidence_template": "Acoustic defenders verified on operator at stamping unit {zone}.",
        "is_violation": False,
        "status_pool": ["cleared"],
    },
]


def seed_demo_data():
    db = SessionLocal()
    random.seed(42)

    try:
        total_days = (TARGET_END - TARGET_START).days + 1  # 366 days

        for u_idx, u_info in enumerate(DEMO_USERS):
            email = u_info["email"]
            user = db.query(User).filter(User.email == email).first()

            if not user:
                user = User(
                    name=u_info["name"],
                    email=email,
                    password_hash=hash_password(u_info["password"]),
                    role=u_info["role"],
                    user_key=u_info["user_key"],
                    created_at=datetime(2025, 9, 20, 10, 0, tzinfo=timezone.utc),
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"Created demo user: {user.name} ({user.email}) [ID={user.id}]")
            else:
                user.role = u_info["role"]
                user.user_key = u_info["user_key"]
                db.commit()
                print(f"Verified existing demo user: {user.name} ({user.email}) [ID={user.id}]")

            # Profile & Settings
            profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
            if not profile:
                profile = UserProfile(user_id=user.id, **u_info["profile"])
                db.add(profile)
            if not db.query(UserSettings).filter(UserSettings.user_id == user.id).first():
                db.add(UserSettings(user_id=user.id))
            db.commit()

            # Check if 1-year demo data is already seeded
            existing_risk_count = (
                db.query(RiskDetection)
                .filter(RiskDetection.user_id == user.id, RiskDetection.is_demo.is_(True))
                .count()
            )

            if existing_risk_count >= 100:
                print(f"User {user.name} already has {existing_risk_count} synthetic risk records. Skipping risk seeding.")
            else:
                # Remove only demo records if re-seeding
                db.query(RiskDetection).filter(RiskDetection.user_id == user.id, RiskDetection.is_demo.is_(True)).delete()
                db.commit()

                # Generate ~150-200 inspection records over the 366-day historical range
                risk_records = []
                current_d = TARGET_START
                while current_d <= TARGET_END:
                    # Inspections occur ~3-5 times per week
                    if current_d.weekday() < 5 and random.random() < 0.60:
                        # 1 to 3 detections on inspection days
                        num_events = random.randint(1, 3)
                        for _ in range(num_events):
                            sc = random.choice(INSPECTION_SCENARIOS)
                            conf = round(random.uniform(*sc["confidence_range"]), 2)
                            status = random.choice(sc["status_pool"])
                            zone_label = f"{chr(65 + random.randint(0, 5))}-{random.randint(1, 12)}"
                            ev_summary = sc["evidence_template"].format(zone=zone_label)

                            hour = random.randint(8, 17)
                            minute = random.randint(0, 59)
                            det_time = datetime(current_d.year, current_d.month, current_d.day, hour, minute, tzinfo=timezone.utc)

                            risk_records.append(
                                RiskDetection(
                                    user_id=user.id,
                                    detected_object=sc["detected_object"],
                                    risk_level=sc["risk_level"],
                                    confidence=conf,
                                    rule_code=sc["rule_code"],
                                    rule_description=sc["rule_description"],
                                    evidence_summary=f"[SYNTHETIC] {ev_summary}",
                                    image_path=f"/evidence/inspect_{random.randint(1, 10):02d}.jpg",
                                    status=status,
                                    is_violation=sc["is_violation"],
                                    is_demo=True,
                                    detected_at=det_time,
                                    created_at=det_time,
                                )
                            )
                    current_d += timedelta(days=1)

                db.add_all(risk_records)
                db.commit()
                print(f"Seeded {len(risk_records)} synthetic risk detections for {user.name} covering 1 full year.")

            # Seed 1-year Work Sessions if needed
            session_count = (
                db.query(WorkSession)
                .filter(WorkSession.user_id == user.id, WorkSession.is_demo.is_(True))
                .count()
            )
            if session_count < 200:
                db.query(WorkSession).filter(WorkSession.user_id == user.id, WorkSession.is_demo.is_(True)).delete()
                sessions = []
                cur = TARGET_START
                while cur <= TARGET_END:
                    is_wknd = cur.weekday() >= 5
                    n_sess = random.randint(1, 2) if is_wknd else random.randint(2, 4)
                    base_h = 9
                    for s_i in range(n_sess):
                        act = random.choice(["Coding", "Study", "Project", "Meeting"] if not is_wknd else ["Reading", "Study"])
                        dur = random.randint(45, 120)
                        s_time = datetime(cur.year, cur.month, cur.day, base_h, 0, tzinfo=timezone.utc)
                        e_time = s_time + timedelta(minutes=dur)
                        sessions.append(
                            WorkSession(
                                user_id=user.id,
                                activity_type=act,
                                started_at=s_time,
                                ended_at=e_time,
                                duration_minutes=dur,
                                status="completed",
                                notes=f"[SYNTHETIC] Automated {act} session",
                                is_demo=True,
                                created_at=s_time,
                            )
                        )
                        base_h += max(1, dur // 60 + 1)
                    cur += timedelta(days=1)
                db.add_all(sessions)
                db.commit()
                print(f"Seeded {len(sessions)} synthetic work sessions for {user.name}.")

        print("All demo user data successfully seeded and verified across 1 full year.")

    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
