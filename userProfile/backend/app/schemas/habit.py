from datetime import datetime, date
from pydantic import BaseModel, Field
from typing import Optional

class HabitRecordBase(BaseModel):
    habit_name: str = Field(..., min_length=1, max_length=255)
    completed: bool = False
    category: str = Field("Routine", min_length=1, max_length=100)
    duration: str = Field(..., min_length=1, max_length=100)
    frequency: str = Field("Daily", min_length=1, max_length=100)
    recorded_at: date

class HabitRecordCreate(HabitRecordBase):
    pass

class HabitRecordUpdate(BaseModel):
    habit_name: Optional[str] = Field(None, min_length=1, max_length=255)
    completed: Optional[bool] = None
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    duration: Optional[str] = Field(None, min_length=1, max_length=100)
    frequency: Optional[str] = Field(None, min_length=1, max_length=100)
    recorded_at: Optional[date] = None

class HabitRecordOut(HabitRecordBase):
    id: int
    user_id: int
    created_at: datetime
    # Computed from the habit's real recorded history (see habit_analytics
    # service) — never hardcoded. Optional so existing callers that build
    # this model straight from the ORM object without attaching streaks
    # still validate.
    current_streak_days: Optional[int] = None
    longest_streak_days: Optional[int] = None

    class Config:
        from_attributes = True
