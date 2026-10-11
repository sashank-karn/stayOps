"""Unit tests for Lead & Leasing Agent — Sonali Gupta (Sona1147)."""
import pytest
from datetime import date, datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.models.base import Base
from backend.app.db.seed import seed_database
from agents.leasing.agent import (
    LeasingAgent,
    match_rooms_for_lead,
    create_or_update_lead,
    schedule_property_visit,
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


class TestLeasingAgentLogic:
    def test_match_rooms_bengaluru_budget(self, db_session):
        matches = match_rooms_for_lead(
            db=db_session,
            budget=12000.0,
            location="Bengaluru",
            preferred_room_type="Double",
        )
        assert len(matches) > 0
        top = matches[0]
        assert "Bengaluru" in top["city"]
        assert top["monthly_rent"] <= 12000.0
        assert top["match_score"] >= 70.0

    def test_match_rooms_pune_budget(self, db_session):
        matches = match_rooms_for_lead(
            db=db_session,
            budget=8000.0,
            location="Pune",
            preferred_room_type="Triple",
        )
        assert len(matches) > 0
        top = matches[0]
        assert "Pune" in top["city"]
        assert top["room_type"] == "Triple"
        assert top["monthly_rent"] <= 8000.0

    def test_create_and_update_lead(self, db_session):
        lead = create_or_update_lead(
            db=db_session,
            full_name="Tanvi Sen",
            phone="+919844455566",
            email="tanvi.sen@example.com",
            budget=14000.0,
            preferred_location="Bengaluru",
            preferred_room_type="Single",
            notes="Prefers quiet floor",
        )
        assert lead.id is not None
        assert lead.full_name == "Tanvi Sen"

        # Updating same phone number updates profile
        updated = create_or_update_lead(
            db=db_session,
            full_name="Tanvi Sen",
            phone="+919844455566",
            budget=15000.0,
            preferred_location="Bengaluru",
            notes="Ready to move in 1 week",
        )
        assert updated.id == lead.id
        assert updated.budget == 15000.0
        assert "Ready to move" in updated.notes

    def test_schedule_visit(self, db_session):
        matches = match_rooms_for_lead(db=db_session, budget=15000.0, location="Bengaluru")
        lead = create_or_update_lead(
            db=db_session,
            full_name="Karan Malhotra",
            phone="+919811223344",
            preferred_location="Bengaluru",
        )
        visit_time = datetime.now(timezone.utc)
        visit = schedule_property_visit(
            db=db_session,
            lead_id=lead.id,
            property_id=matches[0]["property_id"],
            room_id=matches[0]["room_id"],
            scheduled_time=visit_time,
        )
        assert visit.id is not None
        assert visit.status == "scheduled"
        assert lead.status == "visit_scheduled"


class TestLeasingAgentMessageHandling:
    def test_handle_enquiry_message(self, db_session):
        agent = LeasingAgent(db=db_session)
        msg = AgentMessage(
            sender_agent="orchestrator",
            receiver_agent="leasing",
            task_type="process_enquiry",
            input_data={
                "full_name": "Devika Roy",
                "phone": "+919877700112",
                "budget": 11500.0,
                "preferred_location": "Bengaluru",
                "preferred_room_type": "Double",
            },
        )
        response = agent.handle_message(msg)
        assert response.status == MessageStatus.COMPLETED
        assert response.result is not None
        assert response.result["match_count"] >= 1
        assert "Devika Roy" in response.result["agent_message"]

    def test_handle_schedule_visit_message(self, db_session):
        agent = LeasingAgent(db=db_session)
        lead = create_or_update_lead(
            db=db_session,
            full_name="Sunil Joshi",
            phone="+919866655544",
            preferred_location="Bengaluru",
        )
        matches = match_rooms_for_lead(db=db_session, budget=12000.0, location="Bengaluru")

        msg = AgentMessage(
            sender_agent="orchestrator",
            receiver_agent="leasing",
            task_type="schedule_visit",
            input_data={
                "lead_id": lead.id,
                "property_id": matches[0]["property_id"],
            },
        )
        response = agent.handle_message(msg)
        assert response.status == MessageStatus.COMPLETED
        assert response.result["status"] == "scheduled"

    def test_handle_vacancy_lead_proposals(self, db_session):
        agent = LeasingAgent(db=db_session)
        msg = AgentMessage(
            sender_agent="orchestrator",
            receiver_agent="leasing",
            task_type="match_vacancy_leads",
            input_data={
                "property_name": "StayOps TechPG",
                "room_number": "101",
                "matched_leads": [
                    {"lead_id": "l-1", "name": "Kavya Nair", "phone": "+919833300001", "preferred_room_type": "Single"}
                ],
            },
        )
        response = agent.handle_message(msg)
        assert response.status == MessageStatus.COMPLETED
        assert response.result["proposal_count"] == 1
        assert "Kavya Nair" in response.result["prepared_proposals"][0]["draft_message"]

    def test_handle_invalid_task_type(self, db_session):
        agent = LeasingAgent(db=db_session)
        msg = AgentMessage(
            sender_agent="orchestrator",
            receiver_agent="leasing",
            task_type="unsupported_action",
            input_data={},
        )
        response = agent.handle_message(msg)
        assert response.status == MessageStatus.FAILED
        assert "Unsupported task_type" in response.error
