import os
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENV: str = "development"

    # Database
    DATABASE_URL: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/user_profiling_db"
    )

    # CORS
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173"
    )

    # Session & Security
    SESSION_SECRET_KEY: str = (
        "secret-key-change-in-production-ai-risk-compliance-2026"
    )
    SESSION_COOKIE_NAME: str = "user_profiling_session"
    DEV_AUTO_LOGIN: bool = True
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # LLM Settings (Qwen/Qwen3-Next-80B-A3B-Instruct via Hugging Face Router or OpenAI-compatible endpoint)
    LLM_MODEL: str = "Qwen/Qwen3-Next-80B-A3B-Instruct"
    LLM_BASE_URL: str = "https://router.huggingface.co/v1"
    LLM_API_KEY: str = ""
    LLM_TIMEOUT_SECONDS: float = 60.0

    # Hugging Face Token aliases
    HF_TOKEN: str = ""
    HUGGINGFACE_API_KEY: str = ""

    # Legacy / Fallback configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_BASE_URL: str = (
        "https://generativelanguage.googleapis.com/v1beta/openai/"
    )
    GEMINI_TIMEOUT_SECONDS: float = 30.0

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def active_llm_api_key(self) -> str:
        """Resolve active LLM API key with preference for HF / Qwen keys."""
        hf_key = (self.HF_TOKEN or self.HUGGINGFACE_API_KEY or self.LLM_API_KEY or "").strip()
        if hf_key:
            return hf_key
        if "gemini" in (self.LLM_MODEL or "").lower():
            return (self.GEMINI_API_KEY or "").strip()
        return ""

    @property
    def active_llm_model(self) -> str:
        """Resolve active LLM model."""
        return self.LLM_MODEL or "Qwen/Qwen3-Next-80B-A3B-Instruct"

    @property
    def active_llm_base_url(self) -> str:
        """Resolve base URL for LLM router."""
        if "gemini" in (self.active_llm_model or "").lower() and self.GEMINI_API_KEY and not (self.HF_TOKEN or self.HUGGINGFACE_API_KEY or self.LLM_API_KEY):
            return self.GEMINI_BASE_URL
        return self.LLM_BASE_URL or "https://router.huggingface.co/v1"

    @property
    def is_dev_auto_login_allowed(self) -> bool:
        """Never allow automatic demo login or password overwrite in production."""
        if self.ENV.lower() == "production":
            return False
        return self.DEV_AUTO_LOGIN

    @property
    def is_cookie_secure(self) -> bool:
        return self.COOKIE_SECURE or (self.ENV.lower() == "production")

    @property
    def normalized_database_url(self) -> str:
        """Ensure standard Postgres URLs from Neon, Supabase, Render use psycopg3 dialect."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://") and "+psycopg" not in url:
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    @property
    def case_insensitive_cors_list(self) -> List[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()