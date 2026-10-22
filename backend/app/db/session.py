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
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 300,  # Recycle connections after 5 mins to handle cloud idle drops
    })

engine = create_engine(
    db_url,
    connect_args=connect_args,
    **engine_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency for yielding request-scoped database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
