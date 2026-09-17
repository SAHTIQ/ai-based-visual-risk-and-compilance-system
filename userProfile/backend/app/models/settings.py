from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    weekly_summary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    activity_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    theme_density: Mapped[str] = mapped_column(String(30), default="comfortable", nullable=False)
    theme: Mapped[str] = mapped_column(String(20), default="system", nullable=False)
    language: Mapped[str] = mapped_column(String(100), default="English (US)", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user: Mapped["User"] = relationship("User", back_populates="settings")
