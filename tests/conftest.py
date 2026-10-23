"""Global pytest configuration and database initialization fixtures."""
import pytest
from backend.app.db.session import engine, Base, SessionLocal
from backend.app.db.seed import seed_database


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure all database tables are created and seeded before running the test suite."""
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        seed_database(db=session)
    finally:
        session.close()
