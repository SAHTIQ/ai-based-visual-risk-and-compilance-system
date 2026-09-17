from datetime import datetime
from pydantic import BaseModel, Field

class UserSettingsUpdate(BaseModel):
    email_notifications: bool | None = None
    weekly_summary: bool | None = None
    activity_alerts: bool | None = None
    theme_density: str | None = Field(None, pattern="^(compact|comfortable)$")
    theme: str | None = Field(None, pattern="^(light|dark|system)$")
    language: str | None = None

class UserSettingsOut(BaseModel):
    emailNotifications: bool
    weeklySummary: bool
    activityAlerts: bool
    themeDensity: str
    theme: str
    language: str
    updatedAt: datetime

    @classmethod
    def from_model(cls, obj):
        return cls(
            emailNotifications=obj.email_notifications,
            weeklySummary=obj.weekly_summary,
            activityAlerts=obj.activity_alerts,
            themeDensity=obj.theme_density,
            theme=obj.theme,
            language=obj.language,
            updatedAt=obj.updated_at,
        )
