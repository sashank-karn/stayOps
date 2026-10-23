"""Database session and connection management for StayOps."""
from datetime import datetime, timezone
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from backend.app.core.config import settings


class Base(DeclarativeBase):
    """Declarative base class for all StayOps database models."""
    pass


# SQLite-fallback or PostgreSQL (Supabase / RDS / Neon) engine
connect_args = {}
engine_kwargs = {
    "pool_pre_ping": True,
    "echo": False,
}

db_url = settings.sqlalchemy_url
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    # Cloud PostgreSQL / Supabase pooler resilience
    connect_args.setdefault("connect_timeout", 20)
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 300,  # Recycle connections after 5 mins to handle cloud idle drops
    })

try:
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        **engine_kwargs,
    )
    if not db_url.startswith("sqlite"):
        with engine.connect() as _test_conn:
            pass
except Exception as _conn_err:
    import logging
    _logger = logging.getLogger(__name__)
    _logger.warning("Primary database connection failed (%s); activating local sqlite:///./stayops.db fallback.", _conn_err)
    engine = create_engine("sqlite:///./stayops.db", connect_args={"check_same_thread": False}, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency for yielding request-scoped database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
