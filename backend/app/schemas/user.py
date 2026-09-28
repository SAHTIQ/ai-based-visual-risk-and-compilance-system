from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.schemas.profile import ProfileOut

class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)

class UserOut(UserBase):
    id: int
    role: str = "user"
    user_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    profile: Optional[ProfileOut] = None

    class Config:
        from_attributes = True
