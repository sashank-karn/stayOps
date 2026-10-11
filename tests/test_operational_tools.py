"""
Tests for StayOps operational analysis and auditing tools.
Verifies collections audit, maintenance SLA tracker, leasing funnel, and system readiness.
"""
from datetime import date, datetime, timedelta, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db.session import Base
from backend.app.models.property import Property, Room, Bed
from backend.app.models.tenant import Tenant, Lease
from backend.app.models.financial import RentRecord, PaymentTransaction
from backend.app.models.maintenance import Vendor, MaintenanceTicket
from backend.app.models.lead import Lead, PropertyVisit

from agents.collections.audit import generate_collection_audit, calculate_overdue_aging
from agents.maintenance.sla import audit_maintenance_sla, audit_vendor_performance
from agents.leasing.funnel import audit_leasing_funnel
from backend.app.core.readiness import check_system_readiness


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed minimal operational models
    prop = Property(
        name="Test PG - Koramangala",
        code="TEST-PG",
        address="123 4th Cross",
        city="Bengaluru",
        state="Karnataka",
        pincode="560034",
    )
    session.add(prop)
    session.flush()

    room = Room(property_id=prop.id, room_number="101", floor_number=1, base_rent=10000.0)
    session.add(room)
    session.flush()

    bed = Bed(room_id=room.id, bed_label="A", status="occupied", monthly_rent=10000.0)
    bed2 = Bed(room_id=room.id, bed_label="B", status="available", monthly_rent=10000.0)
    session.add_all([bed, bed2])
    session.flush()

    tenant = Tenant(
        full_name="Arjun Verma",
        email="arjun@example.com",
        phone="+919876543210",
        id_proof_type="Aadhaar",
        id_proof_number="1234-5678-9012",
        status="active",
    )
    session.add(tenant)
    session.flush()

    lease = Lease(
        tenant_id=tenant.id,
        bed_id=bed.id,
        start_date=date.today() - timedelta(days=60),
        end_date=date.today() + timedelta(days=300),
        monthly_rent=10000.0,
        security_deposit=20000.0,
        status="active",
    )
    session.add(lease)
    session.flush()

    # Financial record
    rr1 = RentRecord(
        lease_id=lease.id,
        tenant_id=tenant.id,
        billing_month="2026-09",
        due_date=date.today() - timedelta(days=10),
        amount_due=10000.0,
        amount_paid=6000.0,
        status="partially_paid",
    )
    session.add(rr1)

    # Vendor & Maintenance ticket
    vendor = Vendor(
        name="Apex Plumbing Solutions",
        category="Plumbing",
        phone="+919999988888",
        rating=4.8,
        hourly_rate=600.0,
        is_active=True,
    )
    session.add(vendor)
    session.flush()

    ticket = MaintenanceTicket(
        property_id=prop.id,
        room_id=room.id,
        tenant_id=tenant.id,
        vendor_id=vendor.id,
        title="Shower leak",
        description="Bathroom faucet dripping continuously",
        category="Plumbing",
        severity="Medium",
        status="open",
        estimated_cost=500.0,
    )
    session.add(ticket)

    # Lead & Visit
    lead = Lead(
        full_name="Pooja Sharma",
        phone="+919888877777",
        budget=12000.0,
        preferred_location="Koramangala",
        status="visit_scheduled",
    )
    session.add(lead)
    session.flush()

    visit = PropertyVisit(
        lead_id=lead.id,
        property_id=prop.id,
        scheduled_time=datetime.now(timezone.utc) + timedelta(days=2),
        status="scheduled",
    )
    session.add(visit)

    session.commit()
    yield session
    session.close()


def test_collections_audit(db_session):
    audit = generate_collection_audit(db_session)
    assert audit["total_records"] == 1
    assert audit["total_billed"] == 10000.0
    assert audit["total_collected"] == 6000.0
    assert audit["total_outstanding"] == 4000.0
    assert audit["collection_efficiency_pct"] == 60.0
    assert audit["overdue_count"] == 1
    assert audit["overdue_records"][0]["pending_balance"] == 4000.0


def test_overdue_aging(db_session):
    aging = calculate_overdue_aging(db_session)
    assert "aging_buckets" in aging
    # Due date is 10 days ago -> falls into moderate_8_to_15_days
    assert aging["aging_buckets"]["moderate_8_to_15_days"]["count"] == 1
    assert aging["aging_buckets"]["moderate_8_to_15_days"]["amount"] == 4000.0


def test_maintenance_sla(db_session):
    sla = audit_maintenance_sla(db_session)
    assert sla["total_tickets"] == 1
    assert sla["open_tickets"] == 1
    assert sla["emergency_open_count"] == 0
    assert sla["resolution_rate_pct"] == 0.0

    vendor_perf = audit_vendor_performance(db_session)
    assert vendor_perf["total_vendors"] == 1
    assert vendor_perf["active_vendors"] == 1
    assert vendor_perf["vendor_breakdown"][0]["name"] == "Apex Plumbing Solutions"


def test_leasing_funnel(db_session):
    funnel = audit_leasing_funnel(db_session)
    assert funnel["total_leads"] == 1
    assert funnel["status_breakdown"]["visit_scheduled"] == 1
    assert funnel["total_visits"] == 1
    assert funnel["upcoming_visits_count"] == 1
    assert funnel["upcoming_visits"][0]["lead_name"] == "Pooja Sharma"


def test_system_readiness(db_session):
    readiness = check_system_readiness(db_session)
    assert readiness["overall_status"] == "healthy"
    assert readiness["active_agent_count"] == 7
    assert readiness["subsystems"]["property_registry"]["properties_count"] == 1
    assert readiness["subsystems"]["property_registry"]["total_beds"] == 2
    assert readiness["subsystems"]["lead_and_leasing"]["status"] == "operational"
    assert readiness["subsystems"]["maintenance_and_vendors"]["status"] == "operational"
    assert readiness["subsystems"]["rent_and_collections"]["status"] == "operational"
