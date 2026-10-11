"""Unit tests for Rent & Collections Agent and Vacancy & Revenue Recovery Agent — Adarsh Jha (AdarshCodes1221)."""
import pytest
from datetime import date, datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.models.base import Base
from backend.app.models.tenant import Tenant
from backend.app.db.seed import seed_database
from agents.collections.agent import (
    CollectionsAgent,
    calculate_tenant_balance,
    get_portfolio_financial_metrics,
)
from agents.vacancy_revenue.agent import (
    VacancyRevenueAgent,
    calculate_portfolio_occupancy,
    find_matching_leads_for_room,
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


class TestCollectionsAgent:
    def test_calculate_tenant_balance_paid(self, db_session):
        # Rohan Mehta (t1) has paid his rent in full
        rohan = db_session.query(Tenant).filter_by(full_name="Rohan Mehta").first()
        audit = calculate_tenant_balance(db_session, rohan.id)
        assert audit["tenant_name"] == "Rohan Mehta"
        assert audit["outstanding_balance"] == 0.0
        assert audit["has_overdue"] is False
        assert audit["escalation_level"] == "clear"
        assert audit["net_deposit_settlement"] == 32000.0  # Full deposit refunded

    def test_calculate_tenant_balance_overdue(self, db_session):
        # Vikram Reddy (t3) has overdue rent of 11,000 INR
        vikram = db_session.query(Tenant).filter_by(full_name="Vikram Reddy").first()
        audit = calculate_tenant_balance(db_session, vikram.id)
        assert audit["tenant_name"] == "Vikram Reddy"
        assert audit["outstanding_balance"] == 11000.0
        assert audit["has_overdue"] is True
        assert audit["escalation_level"] == "escalated_notice"
        assert audit["max_days_overdue"] >= 6
        assert audit["net_deposit_settlement"] == 11000.0  # 22000 deposit - 11000 overdue

    def test_portfolio_financial_metrics(self, db_session):
        metrics = get_portfolio_financial_metrics(db_session)
        assert metrics["total_billed"] > 0
        assert metrics["total_collected"] > 0
        assert metrics["collection_rate_percent"] > 0
        assert metrics["total_outstanding"] == 11000.0

    def test_handle_audit_message(self, db_session):
        rohan = db_session.query(Tenant).filter_by(full_name="Rohan Mehta").first()
        agent = CollectionsAgent(db=db_session)
        msg = AgentMessage(
            sender_agent="orchestrator",
            receiver_agent="collections",
            task_type="audit_tenant_balance",
            input_data={"tenant_id": rohan.id},
        )
        resp = agent.handle_message(msg)
        assert resp.status == MessageStatus.COMPLETED
        assert resp.result["outstanding_balance"] == 0.0

    def test_calculate_late_fees_grace_period(self, db_session):
        from agents.collections.agent import calculate_late_fees
        # Rohan Mehta (0 overdue)
        rohan = db_session.query(Tenant).filter_by(full_name="Rohan Mehta").first()
        res_rohan = calculate_late_fees(db_session, rohan.id, per_day_penalty=100.0, grace_days=5)
        assert res_rohan["total_late_fees"] == 0.0
        assert res_rohan["total_payable"] == 0.0

        # Vikram Reddy (has overdue days >= 6)
        vikram = db_session.query(Tenant).filter_by(full_name="Vikram Reddy").first()
        res_vikram = calculate_late_fees(db_session, vikram.id, per_day_penalty=100.0, grace_days=5)
        assert res_vikram["base_outstanding"] == 11000.0
        assert res_vikram["total_late_fees"] >= 100.0
        assert res_vikram["total_payable"] > 11000.0
        assert len(res_vikram["penalties"]) > 0

    def test_calculate_late_fees_negative_inputs_rejected(self, db_session):
        from agents.collections.agent import calculate_late_fees
        vikram = db_session.query(Tenant).filter_by(full_name="Vikram Reddy").first()
        with pytest.raises(ValueError, match="per_day_penalty must be non-negative"):
            calculate_late_fees(db_session, vikram.id, per_day_penalty=-50.0, grace_days=5)
        with pytest.raises(ValueError, match="grace_days must be non-negative"):
            calculate_late_fees(db_session, vikram.id, per_day_penalty=50.0, grace_days=-1)

    def test_forecast_monthly_collections(self, db_session):
        from agents.collections.agent import forecast_monthly_collections
        forecast = forecast_monthly_collections(db_session)
        assert forecast["active_lease_count"] >= 4
        assert forecast["contracted_monthly_revenue"] > 40000.0
        assert forecast["projected_realized_revenue"] > 0.0
        assert forecast["current_total_collected"] > 0.0

    def test_handle_late_fees_and_forecast_messages(self, db_session):
        vikram = db_session.query(Tenant).filter_by(full_name="Vikram Reddy").first()
        agent = CollectionsAgent(db=db_session)

        # assess_late_fees message
        msg_late = AgentMessage(
            sender_agent="orchestrator",
            receiver_agent="collections",
            task_type="assess_late_fees",
            input_data={"tenant_id": vikram.id, "grace_days": 5, "per_day_penalty": 150.0},
        )
        resp_late = agent.handle_message(msg_late)
        assert resp_late.status == MessageStatus.COMPLETED
        assert resp_late.result["total_late_fees"] >= 150.0

        # forecast_collections message
        msg_fc = AgentMessage(
            sender_agent="orchestrator",
            receiver_agent="collections",
            task_type="forecast_collections",
            input_data={},
        )
        resp_fc = agent.handle_message(msg_fc)
        assert resp_fc.status == MessageStatus.COMPLETED
        assert resp_fc.result["contracted_monthly_revenue"] > 0.0


class TestVacancyRevenueAgent:
    def test_calculate_portfolio_occupancy(self, db_session):
        occ = calculate_portfolio_occupancy(db_session)
        assert occ["total_beds"] == 10
        assert occ["occupied_beds"] == 6
        assert occ["available_beds"] == 4
        assert occ["occupancy_rate_percent"] == 60.0
        assert occ["potential_monthly_revenue"] > occ["actual_monthly_revenue"]

    def test_find_matching_leads_for_room(self, db_session):
        # Look for leads for single room in Bengaluru with rent 16000
        matches = find_matching_leads_for_room(
            db=db_session,
            location="Bengaluru",
            room_type="Single",
            monthly_rent=16000.0,
        )
        assert len(matches) > 0
        top = matches[0]
        # Kavya Nair has budget 16,500 for single room in Bengaluru
        assert top["name"] == "Kavya Nair"
        assert top["match_score"] >= 80.0

    def test_handle_upcoming_vacancy_message(self, db_session):
        agent = VacancyRevenueAgent(db=db_session)
        msg = AgentMessage(
            sender_agent="orchestrator",
            receiver_agent="vacancy_revenue",
            task_type="identify_vacancy_and_leads",
            input_data={
                "property_name": "StayOps TechPG",
                "room_number": "101",
                "room_type": "Single",
                "monthly_rent": 16000.0,
                "city": "Bengaluru",
                "expected_move_out_date": (date.today() + timedelta(days=15)).isoformat(),
            },
        )
        resp = agent.handle_message(msg)
        assert resp.status == MessageStatus.COMPLETED
        assert resp.result["daily_revenue_risk"] == 533.33
        assert resp.result["matched_lead_count"] >= 1
        assert resp.result["hand_off_to_leasing"] is True
        assert "Kavya Nair" in resp.result["matched_leads"][0]["name"]

    def test_calculate_vacancy_loss(self, db_session):
        from agents.vacancy_revenue.agent import calculate_vacancy_loss
        loss = calculate_vacancy_loss(db_session, downtime_days=30)
        assert loss["vacant_bed_count"] == 4
        assert loss["daily_runrate_loss"] > 0
        assert loss["monthly_vacancy_loss"] > 0
        assert loss["projected_downtime_loss"] > 0
        assert loss["annualized_exposure"] > 0
        assert loss["impact_severity"] in ("High", "Moderate")

    def test_priority_relist_queue(self, db_session):
        from agents.vacancy_revenue.agent import get_priority_relist_queue
        queue = get_priority_relist_queue(db_session, limit=5)
        assert len(queue) > 0
        # Beds should be sorted by monthly_rent descending
        for i in range(len(queue) - 1):
            assert queue[i]["monthly_rent"] >= queue[i + 1]["monthly_rent"]
        assert queue[0]["priority_rank"] in ("P1-High Value", "P2-Standard")

    def test_vacancy_agent_message_handling(self, db_session):
        agent = VacancyRevenueAgent(db=db_session)

        # calculate_vacancy_loss task
        msg_loss = AgentMessage(
            sender_agent="orchestrator",
            receiver_agent="vacancy_revenue",
            task_type="calculate_vacancy_loss",
            input_data={"downtime_days": 15},
        )
        resp_loss = agent.handle_message(msg_loss)
        assert resp_loss.status == MessageStatus.COMPLETED
        assert resp_loss.result["projected_loss_period_days"] == 15

        # priority_relist_queue task
        msg_q = AgentMessage(
            sender_agent="orchestrator",
            receiver_agent="vacancy_revenue",
            task_type="priority_relist_queue",
            input_data={"limit": 3},
        )
        resp_q = agent.handle_message(msg_q)
        assert resp_q.status == MessageStatus.COMPLETED
        assert len(resp_q.result) <= 3

    def test_100_percent_full_occupancy_edge_case(self, db_session):
        from backend.app.models.property import Bed
        from agents.vacancy_revenue.agent import calculate_portfolio_occupancy, calculate_vacancy_loss, get_priority_relist_queue

        # Temporarily mark all beds as occupied
        all_beds = db_session.query(Bed).all()
        for b in all_beds:
            b.status = "occupied"
        db_session.commit()

        occ = calculate_portfolio_occupancy(db_session)
        assert occ["occupancy_rate_percent"] == 100.0
        assert occ["available_beds"] == 0
        assert occ["monthly_vacancy_loss"] == 0.0

        loss = calculate_vacancy_loss(db_session, downtime_days=30)
        assert loss["vacant_bed_count"] == 0
        assert loss["monthly_vacancy_loss"] == 0.0
        assert loss["daily_runrate_loss"] == 0.0
        assert loss["impact_severity"] == "None"

        queue = get_priority_relist_queue(db_session)
        assert len(queue) == 0
