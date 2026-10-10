"""Unit tests for StayOps SQLAlchemy models, seeder, and Pydantic domain schemas."""
import pytest
from datetime import date, datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.models.base import Base
from backend.app.models.property import Property, Room, Bed
from backend.app.models.tenant import Tenant, Lease
from backend.app.models.lead import Lead, PropertyVisit
from backend.app.models.maintenance import Vendor, MaintenanceTicket
from backend.app.models.financial import RentRecord, PaymentTransaction
from backend.app.models.workflow import WorkflowExecution, AgentTaskRecord, ApprovalRequest
from backend.app.schemas.domain import (
    PropertyCreate,
    PropertyRead,
    RoomCreate,
    RoomRead,
    BedCreate,
    BedRead,
    TenantCreate,
    TenantRead,
    LeadCreate,
    LeadRead,
    MaintenanceTicketCreate,
    MaintenanceTicketRead,
)
from backend.app.db.seed import seed_database


@pytest.fixture
def db_session():
    """Provides a fresh SQLite in-memory database for testing models."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


class TestPropertyModels:
    def test_create_property_room_bed_hierarchy(self, db_session):
        prop = Property(
            name="StayOps Elite PG",
            code="SO-BLR-01",
            address="123 Koramangala 4th Block",
            city="Bengaluru",
            state="Karnataka",
            pincode="560034",
            total_floors=3,
            rules_summary="No smoking. Curfew 11 PM.",
            amenities=["High-Speed Wi-Fi", "Daily Housekeeping", "Power Backup"],
            manager_name="Rajesh Kumar",
            manager_phone="+919876543210",
        )
        db_session.add(prop)
        db_session.commit()

        assert prop.id is not None
        assert prop.created_at is not None
        assert prop.is_deleted is False

        # Add room
        room = Room(
            property_id=prop.id,
            room_number="101",
            floor_number=1,
            room_type="Double",
            base_rent=12000.0,
        )
        db_session.add(room)
        db_session.commit()

        # Add beds
        bed_a = Bed(room_id=room.id, bed_label="Bed A", monthly_rent=12000.0)
        bed_b = Bed(room_id=room.id, bed_label="Bed B", monthly_rent=12000.0)
        db_session.add_all([bed_a, bed_b])
        db_session.commit()

        # Check relationships
        db_session.refresh(prop)
        assert len(prop.rooms) == 1
        assert prop.rooms[0].room_number == "101"
        assert len(prop.rooms[0].beds) == 2
        assert {b.bed_label for b in prop.rooms[0].beds} == {"Bed A", "Bed B"}

    def test_property_cascade_delete(self, db_session):
        prop = Property(
            name="StayOps Green PG",
            code="SO-PUN-02",
            address="Viman Nagar",
            city="Pune",
            state="Maharashtra",
            pincode="411014",
        )
        db_session.add(prop)
        db_session.commit()

        room = Room(property_id=prop.id, room_number="201", floor_number=2)
        db_session.add(room)
        db_session.commit()

        bed = Bed(room_id=room.id, bed_label="A", monthly_rent=9000.0)
        db_session.add(bed)
        db_session.commit()

        # Deleting property should cascade delete rooms and beds
        db_session.delete(prop)
        db_session.commit()

        assert db_session.query(Room).filter_by(id=room.id).first() is None
        assert db_session.query(Bed).filter_by(id=bed.id).first() is None


class TestTenantAndOperationsModels:
    def test_create_tenant_and_lease(self, db_session):
        prop = Property(
            name="StayOps North PG",
            code="SO-DEL-01",
            address="Saket",
            city="New Delhi",
            state="Delhi",
            pincode="110017",
        )
        db_session.add(prop)
        db_session.commit()

        room = Room(property_id=prop.id, room_number="102", floor_number=1)
        db_session.add(room)
        db_session.commit()

        bed = Bed(room_id=room.id, bed_label="Bed 1", monthly_rent=15000.0)
        db_session.add(bed)
        db_session.commit()

        tenant = Tenant(
            full_name="Aarav Sharma",
            email="aarav.sharma@example.com",
            phone="+919811122233",
            emergency_contact="+919811122244",
            id_proof_type="Aadhaar",
            id_proof_number="1234-5678-9012",
        )
        db_session.add(tenant)
        db_session.commit()

        lease = Lease(
            tenant_id=tenant.id,
            bed_id=bed.id,
            start_date=date(2026, 1, 1),
            monthly_rent=15000.0,
            security_deposit=30000.0,
            status="active",
        )
        db_session.add(lease)
        db_session.commit()

        db_session.refresh(tenant)
        assert len(tenant.leases) == 1
        assert tenant.leases[0].monthly_rent == 15000.0
        assert tenant.leases[0].bed.bed_label == "Bed 1"

    def test_maintenance_ticket_and_vendor(self, db_session):
        prop = Property(
            name="StayOps South PG",
            code="SO-HYD-01",
            address="Hitech City",
            city="Hyderabad",
            state="Telangana",
            pincode="500081",
        )
        tenant = Tenant(
            full_name="Pooja Rao",
            email="pooja.rao@example.com",
            phone="+919877788899",
        )
        vendor = Vendor(
            name="Super Plumber",
            category="Plumbing",
            phone="+919988776655",
            hourly_rate=450.0,
        )
        db_session.add_all([prop, tenant, vendor])
        db_session.commit()

        ticket = MaintenanceTicket(
            property_id=prop.id,
            tenant_id=tenant.id,
            vendor_id=vendor.id,
            title="Geyser not heating in Room 204",
            description="Water is cold even after 20 minutes.",
            category="Electrical",
            severity="High",
            status="open",
        )
        db_session.add(ticket)
        db_session.commit()

        assert ticket.id is not None
        assert ticket.severity == "High"
        assert ticket.tenant.full_name == "Pooja Rao"
        assert ticket.vendor.name == "Super Plumber"


class TestMultiAgentWorkflowModels:
    def test_workflow_execution_and_tasks(self, db_session):
        wf = WorkflowExecution(
            workflow_type="tenant_move_out_notice",
            initiator="tenant",
            input_payload={"tenant_id": "test-123", "notice_days": 15},
        )
        db_session.add(wf)
        db_session.commit()

        t1 = AgentTaskRecord(
            workflow_id=wf.id,
            task_id="task-001",
            sender_agent="orchestrator",
            receiver_agent="vacancy_revenue",
            task_type="identify_vacancy_and_leads",
            input_data={"room_id": "r-1"},
            is_parallel=True,
            execution_order=1,
        )
        t2 = AgentTaskRecord(
            workflow_id=wf.id,
            task_id="task-002",
            sender_agent="orchestrator",
            receiver_agent="collections",
            task_type="audit_tenant_balance",
            input_data={"tenant_id": "test-123"},
            is_parallel=True,
            execution_order=1,
        )
        db_session.add_all([t1, t2])
        db_session.commit()

        db_session.refresh(wf)
        assert len(wf.tasks) == 2
        assert wf.tasks[0].is_parallel is True

        # Test approval gate for high cost
        approval = ApprovalRequest(
            workflow_id=wf.id,
            task_record_id=t1.id,
            agent_name="maintenance",
            action_type="high_cost_maintenance",
            estimated_cost=3500.0,
            description="Deep clean and AC servicing required before move-in",
        )
        db_session.add(approval)
        db_session.commit()

        db_session.refresh(wf)
        assert len(wf.approvals) == 1
        assert wf.approvals[0].estimated_cost == 3500.0


class TestDatabaseSeeder:
    def test_seed_database_execution(self, db_session):
        res = seed_database(db=db_session)
        assert res.get("properties") == 2
        assert res.get("tenants") == 4
        assert res.get("vendors") == 4
        assert res.get("leads") == 3
