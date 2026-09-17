from datetime import datetime, date, timezone
from sqlalchemy import String, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class StudyRecord(Base):
    __tablename__ = "study_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    study_hours: Mapped[float] = mapped_column(Float, nullable=False)
    study_goal: Mapped[float] = mapped_column(Float, nullable=False)
    academic_performance: Mapped[str] = mapped_column(String(100), nullable=False)
    recorded_at: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="study_records")
