from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserRegister(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Full Name")
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password (minimum 8 characters)")

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

class GoogleAuthRequest(BaseModel):
    id_token: str | None = Field(default=None, description="Google ID Token JWT")
    credential: str | None = Field(default=None, description="Google Credential JWT from Google Identity Services")

    @property
    def token(self) -> str:
        t = (self.id_token or self.credential or "").strip()
        if not t:
            raise ValueError("Google ID token or credential must be provided.")
        return t

class UserAuthOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str = "user"
    user_key: str | None = None
    auth_provider: str = "local"
    avatar_url: str | None = None
    created_at: datetime
    token: str | None = None

    class Config:
        from_attributes = True
