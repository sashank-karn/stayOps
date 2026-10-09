"""Core backend utilities (config access, security, db session).

Phase 1 only re-exports the shared settings so backend code has a single, stable
import path:  `from app.core.config import settings`.
"""
from shared.config import get_settings

settings = get_settings()

__all__ = ["settings", "get_settings"]
