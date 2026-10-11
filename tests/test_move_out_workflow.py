"""End-to-End Multi-Agent Demonstration Test: 15-Day Move-Out Workflow.

Verifies:
1. Tenant submits 15-day move-out notice.
2. Tenant Support Agent validates tenant, records expected move-out date, marks status to 'notice'.
3. Orchestrator triggers parallel execution of:
   - Vacancy and Revenue Recovery Agent (downtime risk & lead matching).
   - Rent and Collections Agent (tenant ledger audit & deposit settlement).
4. Sequential handoff: Lead & Leasing Agent prepares personalized visit proposals.
5. Maintenance & Vendor Agent prepares room turnover and evaluates approval threshold.
6. Monitoring and Facilitator Agent validates all outputs and flags any contradictions.
7. Orchestrator aggregates results into unified workflow summary.
"""
import pytest
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.models.base import Base
from backend.app.models.tenant import Tenant
from backend.app.models.workflow import WorkflowExecution, AgentTaskRecord, ApprovalRequest
from backend.app.db.seed import seed_database
from agents.orchestrator.agent import OrchestratorAgent


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


class TestMoveOutWorkflowEndToEnd:
    def test_rohan_mehta_move_out_clean_settlement(self, db_session):
        """Test move-out workflow for tenant with clean payment history (Rohan Mehta)."""
        rohan = db_session.query(Tenant).filter_by(full_name="Rohan Mehta").first()
        orchestrator = OrchestratorAgent(db=db_session)

        # Execute full multi-agent workflow
        response = orchestrator.run_move_out_workflow(
            tenant_id=rohan.id,
            notice_days=15,
            reason="Relocating to London for work",
        )

        # 1. High-level workflow assertions
        assert response["workflow_id"] is not None
        assert response["tenant_name"] == "Rohan Mehta"
        assert response["room_number"] == "101"
        assert "StayOps TechPG" in response["property_name"]
        assert rohan.status == "notice"

        # 2. Collections Agent verification (clean rent)
        rent_status = response["rent_status"]
        assert rent_status["outstanding_balance"] == 0.0
        assert rent_status["has_overdue"] is False
        assert rent_status["net_deposit_settlement"] == 32000.0  # Full deposit refunded

        # 3. Vacancy & Revenue Agent verification
        vacancy = response["vacancy_recovery"]
        assert vacancy["daily_revenue_risk"] == 533.33
        assert vacancy["matched_lead_count"] >= 1
        top_lead = vacancy["matched_leads"][0]
        assert top_lead["name"] == "Kavya Nair"

        # 4. Lead & Leasing Agent handoff verification
        proposals = response["leasing_proposals"]
        assert proposals["proposal_count"] >= 1
        assert "Kavya Nair" in proposals["prepared_proposals"][0]["draft_message"]

        # 5. Maintenance turnover verification
        maint = response["maintenance_turnover"]
        assert maint["action"] == "room_turnover_scheduled"
        assert maint["room_number"] == "101"
        assert maint["estimated_cost"] > 0

        # 6. Facilitator verification
        fac = response["facilitator_verification"]
        assert fac["facilitator_status"] == "verified_healthy"
        assert fac["is_healthy"] is True
        assert fac["checks_passed_count"] >= 4

        # 7. Timeline verification
        timeline = response["timeline"]
        assert len(timeline) == 5
        # Step 2 must be parallel
        step2 = next(s for s in timeline if s["step"] == 2)
        assert step2["is_parallel"] is True
        assert "vacancy_revenue" in step2["agents"]
        assert "collections" in step2["agents"]

        # 8. Database persistence verification
        wf_record = db_session.get(WorkflowExecution, response["workflow_id"])
        assert wf_record is not None
        assert len(wf_record.tasks) == 6  # support, vacancy, rent, lease, maint, facilitator
        parallel_tasks = [t for t in wf_record.tasks if t.is_parallel]
        assert len(parallel_tasks) == 2

    def test_vikram_reddy_move_out_overdue_deduction(self, db_session):
        """Test move-out workflow for tenant with overdue rent (Vikram Reddy)."""
        vikram = db_session.query(Tenant).filter_by(full_name="Vikram Reddy").first()
        orchestrator = OrchestratorAgent(db=db_session)

        response = orchestrator.run_move_out_workflow(
            tenant_id=vikram.id,
            notice_days=15,
            reason="Relocating to hometown",
        )

        assert response["tenant_name"] == "Vikram Reddy"
        rent_status = response["rent_status"]
        assert rent_status["has_overdue"] is True
        assert rent_status["outstanding_balance"] == 11000.0
        assert rent_status["escalation_level"] == "escalated_notice"
        # Security deposit was 22,000; after deducting 11,000 overdue, net settlement is 11,000
        assert rent_status["net_deposit_settlement"] == 11000.0
        assert "Deduct from deposit" in rent_status["recommendation"]
