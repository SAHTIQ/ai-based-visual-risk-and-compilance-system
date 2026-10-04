from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

class ProfileBase(BaseModel):
    age: Optional[int] = Field(None, ge=1, le=120)
    gender: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(ProfileBase):
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Full Name")

class ProfileOut(ProfileBase):
    id: int
    user_id: int
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
