"""
Central configuration for StayOps AI.

All settings load from environment variables (see `.env.example`). Both the FastAPI
backend and the LangGraph agents import `get_settings()` so there is one source of truth.

The LLM provider is intentionally **configurable** — nothing in the codebase hard-codes
OpenAI or Gemini. Set `LLM_PROVIDER` in `.env` and provide the matching API key.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- App ----
    app_name: str = "StayOps AI"
    app_env: Literal["development", "staging", "production"] = "development"
    app_debug: bool = True
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    frontend_url: str = "http://localhost:3000"

    # ---- Database ----
    postgres_user: str = "stayops"
    postgres_password: str = "change_me"
    postgres_db: str = "stayops"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    database_url: str | None = None

    # ---- Auth ----
    jwt_secret_key: str = "change_me"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # ---- LLM (configurable) ----
    llm_provider: Literal["openai", "gemini"] = "openai"
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.2
    openai_api_key: str = ""
    gemini_api_key: str = ""

    # ---- Embeddings ----
    embedding_provider: Literal["openai", "gemini"] = "openai"
    embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536

    # ---- WhatsApp (Phase 12) ----
    whatsapp_api_url: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_access_token: str = ""
    whatsapp_verify_token: str = ""

    # ---- Human-in-the-loop ----
    approval_cost_threshold: float = Field(
        default=2000, description="Maintenance cost (INR) above which human approval is required."
    )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def sqlalchemy_url(self) -> str:
        """Prefer an explicit DATABASE_URL; otherwise build one from the parts."""
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    def has_llm_key(self) -> bool:
        """True if the API key for the selected provider is present (no key is leaked)."""
        return bool(self.openai_api_key if self.llm_provider == "openai" else self.gemini_api_key)


@lru_cache
def get_settings() -> Settings:
    """Cached accessor so settings are parsed once per process."""
    return Settings()
