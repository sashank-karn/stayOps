"""Unit tests for Tenant Support Agent & Maintenance and Vendor Agent — Prabin Yadav (Prabin-yadav)."""
import pytest
from datetime import date, datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.models.base import Base
from backend.app.models.tenant import Tenant
from backend.app.db.seed import seed_database
from agents.tenant_support.agent import (
    TenantSupportAgent,
    classify_tenant_intent,
    get_active_tenant_details,
    record_move_out_notice,
)
from agents.maintenance.agent import (
    MaintenanceAgent,
    find_best_vendor,
    estimate_service_cost,
)
from shared.schemas.agent_message import AgentMessage, MessageStatus


@pytest.fixture
def db_session():
    """Provides a fresh seeded SQLite in-memory database."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    seed_database(db=session)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


class TestTenantSupportAgent:
    def test_classify_tenant_intent(self):
        assert classify_tenant_intent("I want to give my 15 days move out notice") == "move_out_notice"
        assert classify_tenant_intent("The geyser in my bathroom is leaking") == "maintenance_issue"
        assert classify_tenant_intent("How can I pay my rent via UPI?") == "billing_inquiry"
        assert classify_tenant_intent("What is the night gate curfew timing?") == "rules_amenities"
        assert classify_tenant_intent("Hello, good morning team") == "general_support"

    def test_get_active_tenant_details(self, db_session):
        tenant = db_session.query(Tenant).filter_by(full_name="Rohan Mehta").first()
        details = get_active_tenant_details(db_session, tenant.id)
        assert details is not None
        assert details["full_name"] == "Rohan Mehta"
        assert details["room_number"] == "101"
        assert "StayOps TechPG" in details["property_name"]
        assert details["monthly_rent"] == 16000.0

    def test_record_move_out_notice(self, db_session):
        tenant = db_session.query(Tenant).filter_by(full_name="Rohan Mehta").first()
        res = record_move_out_notice(db_session, tenant_id=tenant.id, notice_days=15)
        assert res["status"] == "notice_recorded"
        assert res["notice_days"] == 15
        assert tenant.status == "notice"
        assert res["expected_move_out_date"] is not None

    def test_handle_move_out_message(self, db_session):
        tenant = db_session.query(Tenant).filter_by(full_name="Rohan Mehta").first()
        agent = TenantSupportAgent(db=db_session)
        msg = AgentMessage(
            sender_agent="orchestrator",
            receiver_agent="tenant_support",
            task_type="submit_move_out_notice",
            input_data={"tenant_id": tenant.id, "notice_days": 15},
        )
        response = agent.handle_message(msg)
        assert response.status == MessageStatus.COMPLETED
        assert response.result["tenant_name"] == "Rohan Mehta"
        assert response.result["notice_days"] == 15


class TestMaintenanceAndVendorAgent:
    def test_find_best_vendor(self, db_session):
        plumber = find_best_vendor(db_session, "Plumbing")
        assert plumber is not None
        assert plumber.category == "Plumbing"
        assert plumber.rating >= 4.5

        cleaner = find_best_vendor(db_session, "Cleaning")
        assert cleaner is not None
        assert cleaner.category == "Cleaning"

    def test_estimate_cost(self, db_session):
        plumber = find_best_vendor(db_session, "Plumbing")
        cost = estimate_service_cost("Plumbing", plumber, scope="standard")
        assert cost > 0.0

    def test_create_ticket_under_threshold(self, db_session):
        tenant = db_session.query(Tenant).first()
        details = get_active_tenant_details(db_session, tenant.id)

        # High threshold so no approval needed
        agent = MaintenanceAgent(db=db_session, cost_threshold=5000.0)
        msg = AgentMessage(
            sender_agent="orchestrator",
            receiver_agent="maintenance",
            task_type="create_ticket",
            input_data={
                "property_id": details["property_id"],
                "room_id": details["room_id"],
                "tenant_id": tenant.id,
                "title": "Minor dripping basin tap",
                "category": "Plumbing",
            },
        )
        resp = agent.handle_message(msg)
        assert resp.status == MessageStatus.COMPLETED
        assert resp.requires_approval is False
        assert resp.result["status"] == "assigned"

    def test_create_ticket_over_threshold_requires_approval(self, db_session):
        tenant = db_session.query(Tenant).first()
        details = get_active_tenant_details(db_session, tenant.id)

        # Set low threshold to test approval gating
        agent = MaintenanceAgent(db=db_session, cost_threshold=800.0)
        msg = AgentMessage(
            sender_agent="orchestrator",
            receiver_agent="maintenance",
            task_type="create_ticket",
            input_data={
                "property_id": details["property_id"],
                "room_id": details["room_id"],
                "tenant_id": tenant.id,
                "title": "Replace broken geyser unit",
                "category": "Appliance",
            },
        )
        resp = agent.handle_message(msg)
        assert resp.status == MessageStatus.NEEDS_APPROVAL
        assert resp.requires_approval is True
        assert resp.result["requires_approval"] is True

    def test_prepare_room_turnover_on_move_out(self, db_session):
        tenant = db_session.query(Tenant).first()
        details = get_active_tenant_details(db_session, tenant.id)

        agent = MaintenanceAgent(db=db_session)
        msg = AgentMessage(
            sender_agent="orchestrator",
            receiver_agent="maintenance",
            task_type="prepare_turnover",
            input_data={
                "property_id": details["property_id"],
                "room_id": details["room_id"],
                "room_number": details["room_number"],
                "tenant_name": tenant.full_name,
            },
        )
        resp = agent.handle_message(msg)
        assert resp.result["action"] == "room_turnover_scheduled"
        assert resp.result["room_number"] == details["room_number"]
        assert "Cleaning" in resp.result["assigned_vendor"] or "CleanPro" in resp.result["assigned_vendor"]
