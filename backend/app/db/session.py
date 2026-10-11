"""Database session and connection management for StayOps."""
from datetime import datetime, timezone
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from backend.app.core.config import settings


class Base(DeclarativeBase):
    """Declarative base class for all StayOps database models."""
    pass


# SQLite-fallback or PostgreSQL engine
connect_args = {}
db_url = settings.sqlalchemy_url
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency for yielding request-scoped database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
