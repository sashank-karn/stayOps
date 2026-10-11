"""API tests for StayOps Operations & Multi-Agent endpoints."""
import pytest
from datetime import datetime, timezone
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

    def test_approval_review_flow_and_validation(self, client_with_db):
        """Test listing pending approvals and submitting review decision."""
        client, session = client_with_db
        rohan = session.query(Tenant).filter_by(full_name="Rohan Mehta").first()

        # Trigger workflow to create a pending approval
        client.post(
            "/api/workflows/move-out",
            json={"tenant_id": rohan.id, "notice_days": 15},
        )

        approvals_resp = client.get("/api/approvals")
        assert approvals_resp.status_code == 200
        approvals = approvals_resp.json()
        assert len(approvals) >= 1
        approval_id = approvals[0]["id"]

        # Test invalid action validation
        bad_resp = client.post(
            f"/api/approvals/{approval_id}/review",
            json={"action": "invalid_choice", "reviewed_by": "Tester"},
        )
        assert bad_resp.status_code == 400

        # Test valid approval
        good_resp = client.post(
            f"/api/approvals/{approval_id}/review",
            json={"action": "approved", "reviewed_by": "Ops Manager", "notes": "Approved clean"},
        )
        assert good_resp.status_code == 200
        assert good_resp.json()["status"] == "approved"

    def test_move_out_invalid_tenant_returns_400(self, client_with_db):
        """Test move-out API returns 400 when tenant does not exist."""
        client, _ = client_with_db
        resp = client.post(
            "/api/workflows/move-out",
            json={"tenant_id": "nonexistent-tenant-id", "notice_days": 15},
        )
        assert resp.status_code == 400
        assert "not found" in resp.json()["detail"].lower()

    def test_lead_inquiry_workflow_endpoint(self, client_with_db):
        """Test lead inquiry matching endpoint via API."""
        client, _ = client_with_db
        resp = client.post(
            "/api/workflows/lead-inquiry",
            json={
                "full_name": "Divya Sharma",
                "phone": "+919877700001",
                "budget": 16000.0,
                "preferred_room_type": "Single",
                "preferred_location": "Koramangala",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["workflow_type"] == "lead_inquiry"
        assert "matched_rooms" in data

    def test_visit_reschedule_api_flow(self, client_with_db):
        """Test scheduling and subsequently rescheduling a property visit via API."""
        client, session = client_with_db
        lead = session.query(Tenant).first()
        from backend.app.models.lead import Lead, PropertyVisit
        from backend.app.models.property import Property
        l = session.query(Lead).first()
        p = session.query(Property).first()
        visit = PropertyVisit(
            lead_id=l.id,
            property_id=p.id,
            scheduled_time=datetime.now(timezone.utc),
            status="scheduled",
        )
        session.add(visit)
        session.commit()
        session.refresh(visit)

        resched_resp = client.post(
            "/api/visits/reschedule",
            json={
                "visit_id": visit.id,
                "new_scheduled_time": "2026-10-18T15:00:00Z",
                "reason": "Rescheduled for weekend visit",
            },
        )
        assert resched_resp.status_code == 200
        assert resched_resp.json()["status"] == "rescheduled"

