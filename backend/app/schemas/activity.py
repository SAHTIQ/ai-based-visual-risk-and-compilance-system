from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class ActivityHistoryBase(BaseModel):
    activity_type: str
    description: str
    metadata_json: Optional[str] = None

class ActivityHistoryCreate(ActivityHistoryBase):
    pass

class ActivityHistoryOut(ActivityHistoryBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
