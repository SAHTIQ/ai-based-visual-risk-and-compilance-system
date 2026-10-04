from datetime import datetime, timezone
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="user", nullable=False, index=True)
    user_key: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)
    auth_provider: Mapped[str] = mapped_column(String(50), default="local", nullable=False, index=True)
    google_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    profile: Mapped["UserProfile"] = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    financial_records: Mapped[list["FinancialRecord"]] = relationship("FinancialRecord", back_populates="user", cascade="all, delete-orphan")
    study_records: Mapped[list["StudyRecord"]] = relationship("StudyRecord", back_populates="user", cascade="all, delete-orphan")
    habit_records: Mapped[list["HabitRecord"]] = relationship("HabitRecord", back_populates="user", cascade="all, delete-orphan")
    activity_history: Mapped[list["ActivityHistory"]] = relationship("ActivityHistory", back_populates="user", cascade="all, delete-orphan")
    settings: Mapped["UserSettings"] = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    work_sessions: Mapped[list["WorkSession"]] = relationship("WorkSession", back_populates="user", cascade="all, delete-orphan")
    simulation_history: Mapped[list["SimulationHistory"]] = relationship("SimulationHistory", back_populates="user", cascade="all, delete-orphan")
    conversations: Mapped[list["Conversation"]] = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    risk_detections: Mapped[list["RiskDetection"]] = relationship("RiskDetection", back_populates="user", cascade="all, delete-orphan")
