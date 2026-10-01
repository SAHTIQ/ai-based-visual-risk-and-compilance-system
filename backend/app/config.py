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

    # LLM Provider & Model Settings
    LLM_PROVIDER: str = "auto"  # "auto", "gemini", "huggingface", "openai", "custom"
    LLM_MODEL: str = "Qwen/Qwen3-Next-80B-A3B-Instruct"
    LLM_FAST_MODEL: str = "Qwen/Qwen2.5-7B-Instruct"
    LLM_BASE_URL: str = "https://router.huggingface.co/v1"
    LLM_API_KEY: str = ""
    LLM_MAX_OUTPUT_TOKENS: int = 800
    LLM_TEMPERATURE: float = 0.3
    LLM_TIMEOUT_SECONDS: float = 45.0

    # Hugging Face Token aliases
    HF_TOKEN: str = ""
    HUGGINGFACE_API_KEY: str = ""

    # Gemini configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_BASE_URL: str = (
        "https://generativelanguage.googleapis.com/v1beta/openai/"
    )
    GEMINI_TIMEOUT_SECONDS: float = 30.0

    # OpenAI configuration
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"

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
    def resolved_llm_provider(self) -> str:
        """Determine active provider based on explicit config or available credentials."""
        prov = (self.LLM_PROVIDER or "auto").lower().strip()
        if prov != "auto":
            return prov
        if self.GEMINI_API_KEY and not (self.HF_TOKEN or self.HUGGINGFACE_API_KEY or self.LLM_API_KEY):
            return "gemini"
        if self.OPENAI_API_KEY and not (self.HF_TOKEN or self.HUGGINGFACE_API_KEY or self.LLM_API_KEY):
            return "openai"
        if self.HF_TOKEN or self.HUGGINGFACE_API_KEY or (self.LLM_BASE_URL and "huggingface" in self.LLM_BASE_URL):
            return "huggingface"
        if "gemini" in (self.LLM_MODEL or "").lower():
            return "gemini"
        return "huggingface"

    @property
    def active_llm_api_key(self) -> str:
        """Resolve active LLM API key based on resolved provider and environment keys."""
        prov = self.resolved_llm_provider
        if prov == "gemini":
            return (self.GEMINI_API_KEY or self.LLM_API_KEY).strip()
        if prov == "openai":
            return (self.OPENAI_API_KEY or self.LLM_API_KEY).strip()
        
        # Hugging Face or default
        hf_key = (self.HF_TOKEN or self.HUGGINGFACE_API_KEY or self.LLM_API_KEY or "").strip()
        if hf_key:
            return hf_key
        if self.GEMINI_API_KEY:
            return self.GEMINI_API_KEY.strip()
        if self.OPENAI_API_KEY:
            return self.OPENAI_API_KEY.strip()
        return ""

    @property
    def active_llm_model(self) -> str:
        """Resolve active primary LLM model."""
        prov = self.resolved_llm_provider
        if prov == "gemini":
            if "gemini" in (self.LLM_MODEL or "").lower():
                return self.LLM_MODEL
            return self.GEMINI_MODEL or "gemini-2.5-flash"
        if prov == "openai":
            if self.LLM_MODEL and not self.LLM_MODEL.startswith("Qwen"):
                return self.LLM_MODEL
            return self.OPENAI_MODEL or "gpt-4o-mini"
        return self.LLM_MODEL or "Qwen/Qwen3-Next-80B-A3B-Instruct"

    @property
    def active_llm_fast_model(self) -> str:
        """Resolve active fast/low-cost model for simple queries."""
        prov = self.resolved_llm_provider
        if prov == "gemini":
            return "gemini-2.5-flash"
        if prov == "openai":
            return "gpt-4o-mini"
        # If user explicitly set LLM_FAST_MODEL in env, use it; otherwise use active primary model
        if self.LLM_FAST_MODEL and self.LLM_FAST_MODEL != "Qwen/Qwen2.5-7B-Instruct":
            return self.LLM_FAST_MODEL
        return self.active_llm_model

    @property
    def active_llm_base_url(self) -> str:
        """Resolve base URL for LLM router / endpoint."""
        prov = self.resolved_llm_provider
        if prov == "gemini":
            return self.GEMINI_BASE_URL
        if prov == "openai":
            return self.OPENAI_BASE_URL
        if self.LLM_BASE_URL:
            return self.LLM_BASE_URL
        return "https://router.huggingface.co/v1"

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