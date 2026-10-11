"""API tests for StayOps Operations & Multi-Agent endpoints."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.db.session import Base, get_db
from backend.app.db.seed import seed_database
from backend.app.models.tenant import Tenant


@pytest.fixture
def client_with_db():
    """Provides a TestClient with thread-safe in-memory SQLite database."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()
    seed_database(db=session)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    try:
        yield test_client, session
    finally:
        app.dependency_overrides.clear()
        session.close()
        Base.metadata.drop_all(bind=engine)


class TestOperationsAPI:
    def test_dashboard_metrics_endpoint(self, client_with_db):
        client, session = client_with_db
        resp = client.get("/api/dashboard/metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert "occupancy" in data
        assert "financials" in data
        assert "counts" in data
        assert data["counts"]["active_tenants"] == 4
        assert data["occupancy"]["total_beds"] == 10

    def test_list_properties_and_rooms(self, client_with_db):
        client, _ = client_with_db
        resp = client.get("/api/properties")
        assert resp.status_code == 200
        props = resp.json()
        assert len(props) == 2
        assert "StayOps TechPG" in props[0]["name"]

        resp_rooms = client.get("/api/rooms")
        assert resp_rooms.status_code == 200
        rooms = resp_rooms.json()
        assert len(rooms) >= 5

    def test_tenants_and_leads(self, client_with_db):
        client, _ = client_with_db
        resp = client.get("/api/tenants")
        assert resp.status_code == 200
        tenants = resp.json()
        assert len(tenants) == 4

        resp_leads = client.get("/api/leads")
        assert resp_leads.status_code == 200
        leads = resp_leads.json()
        assert len(leads) >= 3

        # Create new lead
        new_lead_resp = client.post(
            "/api/leads",
            json={
                "full_name": "Rishi Kapoor",
                "phone": "+919888877771",
                "budget": 14000.0,
                "preferred_location": "Bengaluru",
                "preferred_room_type": "Single",
            },
        )
        assert new_lead_resp.status_code == 200
        assert new_lead_resp.json()["status"] == "created"

    def test_maintenance_tickets_and_vendors(self, client_with_db):
        client, _ = client_with_db
        resp = client.get("/api/tickets")
        assert resp.status_code == 200
        tickets = resp.json()
        assert len(tickets) >= 1

        resp_v = client.get("/api/vendors")
        assert resp_v.status_code == 200
        vendors = resp_v.json()
        assert len(vendors) == 4

    def test_trigger_move_out_workflow_api(self, client_with_db):
        client, session = client_with_db
        rohan = session.query(Tenant).filter_by(full_name="Rohan Mehta").first()

        resp = client.post(
            "/api/workflows/move-out",
            json={
                "tenant_id": rohan.id,
                "notice_days": 15,
                "reason": "Office transfer to Mumbai",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["tenant_name"] == "Rohan Mehta"
        assert data["workflow_id"] is not None
        assert "timeline" in data
        assert len(data["timeline"]) == 5
        assert data["rent_status"]["outstanding_balance"] == 0.0

        # Check workflow detail endpoint
        wf_resp = client.get(f"/api/workflows/{data['workflow_id']}")
        assert wf_resp.status_code == 200
        wf_detail = wf_resp.json()
        assert len(wf_detail["tasks"]) == 6
