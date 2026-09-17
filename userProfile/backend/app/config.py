import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/user_profiling_db"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    SESSION_SECRET_KEY: str = "secret-key-change-in-production-ai-risk-compliance-2026"
    SESSION_COOKIE_NAME: str = "user_profiling_session"
    DEV_AUTO_LOGIN: bool = True

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def case_insensitive_cors_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
