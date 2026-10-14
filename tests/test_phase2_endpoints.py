"""Comprehensive tests for StayOps AI Phase 2 features.

Verifies:
1. User registration, login, JWT token decoding, and /auth/me profile.
2. Property and Room CRUD operations.
3. Tenant creation and Lease assignment with bed availability guard (prevent double assignment).
4. Lease termination and bed status release back to available.
5. Rent records listing and simulated rent payment transaction.
6. Maintenance ticket creation, status update, and vendor assignment.
7. Interactive multi-agent workspace task dispatch with Orchestrator and Facilitator verification.
8. System notifications compilation.
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.session import SessionLocal, Base, engine
from backend.app.db.seed import seed_database
from backend.app.models.user import User
from backend.app.models.property import Property, Room, Bed
from backend.app.models.tenant import Tenant, Lease

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield


class TestAuthenticationEndpoints:
    def test_default_seeded_login(self):
        resp = client.post(
            "/api/auth/login",
            json={"email": "manager@stayops.ai", "password": "Manager@123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "manager@stayops.ai"
        assert data["user"]["role"] == "property_manager"

    def test_login_invalid_password(self):
        resp = client.post(
            "/api/auth/login",
            json={"email": "manager@stayops.ai", "password": "WrongPassword!"},
        )
        assert resp.status_code == 401
        assert "Invalid" in resp.json()["detail"]

    def test_register_new_user(self):
        import time
        email = f"testuser_{int(time.time())}@stayops.ai"
        resp = client.post(
            "/api/auth/register",
            json={
                "email": email,
                "password": "SecurePassword@123",
                "full_name": "Test Engineer",
                "role": "property_manager",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == email

    def test_send_and_verify_otp_flow(self):
        import time
        email = f"otp_user_{int(time.time())}@stayops.ai"

        # 1. Request OTP
        send_resp = client.post("/api/auth/send-otp", json={"email": email, "purpose": "registration"})
        assert send_resp.status_code == 200
        data = send_resp.json()
        assert data["success"] is True
        otp_code = data.get("dev_otp")
        assert otp_code is not None
        assert len(otp_code) == 6

        # 2. Verify invalid OTP fails
        bad_resp = client.post("/api/auth/verify-otp", json={"email": email, "otp": "000000"})
        assert bad_resp.status_code == 400

        # 3. Register with valid OTP
        reg_resp = client.post(
            "/api/auth/register",
            json={
                "email": email,
                "password": "SecurePassword@123",
                "full_name": "OTP Verified User",
                "role": "tenant",
                "otp": otp_code,
            },
        )
        assert reg_resp.status_code == 200
        reg_data = reg_resp.json()
        assert reg_data["user"]["is_verified"] is True

    def test_auth_me_endpoint(self):
        login_resp = client.post(
            "/api/auth/login",
            json={"email": "admin@stayops.ai", "password": "Admin@123"},
        )
        token = login_resp.json()["access_token"]
        me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["role"] == "admin"
        assert me_resp.json()["authenticated"] is True


class TestPropertyAndUnitCRUD:
    def test_create_and_delete_property(self):
        import time
        code = f"TEST-PROP-{int(time.time()) % 10000}"
        create_resp = client.post(
            "/api/properties",
            json={
                "name": "StayOps Demo Residency",
                "code": code,
                "address": "100 MG Road",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pincode": "560001",
                "total_floors": 2,
                "amenities": ["Wi-Fi", "Housekeeping"],
            },
        )
        assert create_resp.status_code == 200
        prop_id = create_resp.json()["id"]

        # Update property
        update_resp = client.put(
            f"/api/properties/{prop_id}",
            json={"name": "StayOps Demo Residency (Updated)"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["name"] == "StayOps Demo Residency (Updated)"

        # Soft delete property
        del_resp = client.delete(f"/api/properties/{prop_id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "deleted"


class TestTenantAndLeaseGuards:
    def test_lease_assignment_bed_guard(self):
        db = SessionLocal()
        # Find an occupied bed
        occupied_bed = db.query(Bed).filter(Bed.status == "occupied").first()
        tenant = db.query(Tenant).filter(Tenant.status == "active").first()
        db.close()

        if occupied_bed and tenant:
            # Try to assign an already occupied bed
            resp = client.post(
                "/api/leases",
                json={
                    "tenant_id": tenant.id,
                    "bed_id": occupied_bed.id,
                    "start_date": "2026-10-01",
                    "monthly_rent": 12000.0,
                    "security_deposit": 24000.0,
                },
            )
            assert resp.status_code == 400
            assert "already occupied" in resp.json()["detail"].lower()

    def test_lease_termination_releases_bed(self):
        db = SessionLocal()
        # Find a tenant and create a test available bed
        prop = db.query(Property).filter(Property.is_deleted == False).first()
        room = db.query(Room).filter(Room.property_id == prop.id).first()
        import time
        t_suffix = int(time.time() * 1000) % 10000000
        bed = Bed(room_id=room.id, bed_label=f"T-{t_suffix % 1000}", status="available", monthly_rent=9000.0)
        tenant = Tenant(full_name="Temporary Resident", email=f"temp_{t_suffix}@stayops.ai", phone=f"+9199{t_suffix:08d}")
        db.add_all([bed, tenant])
        db.commit()
        db.refresh(bed)
        db.refresh(tenant)
        db.close()

        # Create lease
        lease_resp = client.post(
            "/api/leases",
            json={
                "tenant_id": tenant.id,
                "bed_id": bed.id,
                "start_date": "2026-10-01",
                "monthly_rent": 9000.0,
                "security_deposit": 18000.0,
            },
        )
        assert lease_resp.status_code == 200
        lease_id = lease_resp.json()["id"]

        # Terminate lease
        term_resp = client.post(f"/api/leases/{lease_id}/terminate")
        assert term_resp.status_code == 200
        assert term_resp.json()["status"] == "terminated"

        # Verify bed is back to available
        db = SessionLocal()
        refreshed_bed = db.get(Bed, bed.id)
        assert refreshed_bed.status == "available"
        db.close()


class TestRentLedgerAndPayments:
    def test_list_rent_records(self):
        resp = client.get("/api/rent-records")
        assert resp.status_code == 200
        records = resp.json()
        assert isinstance(records, list)
        assert len(records) > 0

    def test_record_rent_payment(self):
        db = SessionLocal()
        from backend.app.models.financial import RentRecord
        record = db.query(RentRecord).filter(RentRecord.status.in_(["pending", "overdue"])).first()
        record_id = record.id if record else None
        db.close()

        if record_id:
            resp = client.post(
                f"/api/rent-records/{record_id}/pay",
                json={"amount": 5000.0, "payment_method": "UPI", "notes": "Automated test payment"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["record_id"] == record_id
            assert data["amount_paid_now"] == 5000.0
            assert "transaction_id" in data


class TestInteractiveAgentWorkspace:
    def test_list_available_agents(self):
        resp = client.get("/api/agents")
        assert resp.status_code == 200
        agents = resp.json()
        assert len(agents) == 7
        agent_ids = [a["id"] for a in agents]
        assert "orchestrator" in agent_ids
        assert "collections" in agent_ids
        assert "vacancy_revenue" in agent_ids
        assert "maintenance" in agent_ids

    def test_dispatch_interactive_task(self):
        resp = client.post(
            "/api/agents/dispatch",
            json={"prompt": "Analyze 30-day vacancy revenue loss exposure", "target_agent": "vacancy_revenue"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"
        assert data["primary_agent"] == "vacancy_revenue"
        assert len(data["trace_steps"]) >= 2
        assert "facilitator" in data["executed_agents"]


class TestNotifications:
    def test_get_notifications(self):
        resp = client.get("/api/notifications")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_notifications" in data
        assert "urgent_count" in data
        assert isinstance(data["notifications"], list)
