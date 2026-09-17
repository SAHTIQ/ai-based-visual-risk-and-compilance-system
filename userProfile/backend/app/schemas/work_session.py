from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Literal

ActivityTypeEnum = Literal["Coding", "Study", "Project", "Reading", "Meeting", "Other"]
SessionStatusEnum = Literal["in_progress", "completed", "cancelled"]

class WorkSessionStart(BaseModel):
    activity_type: ActivityTypeEnum = "Coding"
    notes: Optional[str] = Field(None, max_length=255)

class WorkSessionStop(BaseModel):
    notes: Optional[str] = Field(None, max_length=255)

class WorkSessionManualCreate(BaseModel):
    activity_type: ActivityTypeEnum = "Coding"
    started_at: datetime
    ended_at: datetime
    notes: Optional[str] = Field(None, max_length=255)

class WorkSessionOut(BaseModel):
    id: int
    user_id: int
    activity_type: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_minutes: int
    status: str
    notes: Optional[str] = None
    is_demo: bool
    created_at: datetime

    class Config:
        from_attributes = True
