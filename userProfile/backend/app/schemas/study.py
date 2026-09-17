from datetime import datetime, date
from pydantic import BaseModel, Field
from typing import Optional

class StudyRecordBase(BaseModel):
    course: str = Field(..., min_length=1, max_length=100)
    subject: str = Field(..., min_length=1, max_length=255)
    study_hours: float = Field(..., gt=0.0, description="Study hours must be greater than 0")
    study_goal: float = Field(..., gt=0.0, description="Study goal must be greater than 0")
    academic_performance: str = Field(..., min_length=1, max_length=100)
    recorded_at: date

class StudyRecordCreate(StudyRecordBase):
    pass

class StudyRecordUpdate(BaseModel):
    course: Optional[str] = Field(None, min_length=1, max_length=100)
    subject: Optional[str] = Field(None, min_length=1, max_length=255)
    study_hours: Optional[float] = Field(None, gt=0.0)
    study_goal: Optional[float] = Field(None, gt=0.0)
    academic_performance: Optional[str] = Field(None, min_length=1, max_length=100)
    recorded_at: Optional[date] = None

class StudyRecordOut(StudyRecordBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
