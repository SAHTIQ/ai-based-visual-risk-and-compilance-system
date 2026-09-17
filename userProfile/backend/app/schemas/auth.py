from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserRegister(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Full Name")
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password (minimum 8 characters)")

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

class UserAuthOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True
