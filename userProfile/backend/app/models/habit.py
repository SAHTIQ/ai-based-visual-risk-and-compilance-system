from datetime import datetime, date, timezone
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class HabitRecord(Base):
    __tablename__ = "habit_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    habit_name: Mapped[str] = mapped_column(String(255), nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="Routine", nullable=False)
    duration: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency: Mapped[str] = mapped_column(String(100), default="Daily", nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    recorded_at: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="habit_records")
