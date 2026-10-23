"""Unit and integration tests for Multi-Agent Operational Actions & Entity Queries."""
import pytest
from backend.app.db.session import SessionLocal, Base, engine
from backend.app.db.seed import seed_database
from agents.orchestrator.agent import OrchestratorAgent
from backend.app.models.user import User
from backend.app.models.maintenance import MaintenanceTicket
from backend.app.models.lead import PropertyVisit


@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db=db)
    try:
        yield db
    finally:
        db.close()


def test_agent_deactivate_and_activate_user(db_session):
    orchestrator = OrchestratorAgent(db_session)

    # 1. Deactivate User
    deact_res = orchestrator.dispatch_interactive_task("Please deactivate the user resident@stayops.ai")
    assert deact_res["action_performed"] == "deactivate_user"
    assert "successfully deactivated" in deact_res["response"]

    user = db_session.query(User).filter(User.email == "resident@stayops.ai").first()
    assert user is not None
    assert user.is_active is False

    # 2. Activate User
    act_res = orchestrator.dispatch_interactive_task("Activate user resident@stayops.ai")
    assert act_res["action_performed"] == "activate_user"
    assert "successfully activated" in act_res["response"]

    db_session.refresh(user)
    assert user.is_active is True


def test_agent_ambiguous_user_prompt(db_session):
    orchestrator = OrchestratorAgent(db_session)
    res = orchestrator.dispatch_interactive_task("Deactivate user")
    assert res["action_performed"] == "prompt_target_user"
    assert "Which user account would you like to deactivate?" in res["response"]


def test_agent_create_and_resolve_maintenance_ticket(db_session):
    orchestrator = OrchestratorAgent(db_session)

    # Create Ticket
    res = orchestrator.dispatch_interactive_task("Create a maintenance ticket for Room 101 AC water leaking")
    assert res["action_performed"] == "create_maintenance_ticket"
    ticket_id = res["data"]["ticket_id"]

    ticket = db_session.get(MaintenanceTicket, ticket_id)
    assert ticket is not None
    assert ticket.status == "open"
    assert ticket.category == "Appliance"

    # Assign Vendor
    assign_res = orchestrator.dispatch_interactive_task(f"Assign vendor plumber to ticket {ticket_id}")
    assert assign_res["action_performed"] == "assign_vendor"
    db_session.refresh(ticket)
    assert ticket.status == "assigned"

    # Resolve Ticket
    resolve_res = orchestrator.dispatch_interactive_task(f"Resolve ticket {ticket_id}")
    assert resolve_res["action_performed"] == "resolve_maintenance_ticket"
    db_session.refresh(ticket)
    assert ticket.status == "resolved"


def test_agent_schedule_property_visit(db_session):
    orchestrator = OrchestratorAgent(db_session)
    res = orchestrator.dispatch_interactive_task("Schedule tour for Alice Walker at Sunrise PG tomorrow at 4 PM")
    assert res["action_performed"] == "schedule_property_visit"
    visit_id = res["data"]["visit_id"]

    visit = db_session.get(PropertyVisit, visit_id)
    assert visit is not None
    assert visit.status == "scheduled"


def test_agent_list_properties_and_users(db_session):
    orchestrator = OrchestratorAgent(db_session)

    # List Properties
    prop_res = orchestrator.dispatch_interactive_task("list the property")
    assert prop_res["action_performed"] == "list_properties"
    assert "properties currently managed" in prop_res["response"]

    # List Users
    user_res = orchestrator.dispatch_interactive_task("list users")
    assert user_res["action_performed"] == "list_users"
    assert "registered user accounts" in user_res["response"]


def test_agent_confirm_tour_and_lease_and_payment(db_session):
    orchestrator = OrchestratorAgent(db_session)

    # 1. Confirm tour for Mohammed Al Hajj
    tour_res = orchestrator.dispatch_interactive_task("confirm mohammed al hajj tour")
    assert tour_res["action_performed"] == "update_property_visit"
    assert "confirmed" in tour_res["response"].lower()
    assert "mohammed" in tour_res["response"].lower()

    # 2. Create Lease
    lease_res = orchestrator.dispatch_interactive_task("create lease for Vikram Seth in room 101 rent 14000")
    assert lease_res["action_performed"] == "create_lease_agreement"
    assert "successfully created & activated" in lease_res["response"]

    # 3. Record Rent Payment
    pay_res = orchestrator.dispatch_interactive_task("record rent payment of 14000 for Vikram Seth")
    assert pay_res["action_performed"] == "record_rent_payment"
    assert "successfully recorded" in pay_res["response"]

    # 4. Send Rent Reminders
    remind_res = orchestrator.dispatch_interactive_task("send rent reminders to residents")
    assert remind_res["action_performed"] == "send_rent_reminders"

    # 5. List Entity Pipelines
    tours_list = orchestrator.dispatch_interactive_task("list tours")
    assert tours_list["action_performed"] == "list_tours"

    tenants_list = orchestrator.dispatch_interactive_task("list tenants")
    assert tenants_list["action_performed"] == "list_tenants"

    approvals_list = orchestrator.dispatch_interactive_task("list approvals")
    assert approvals_list["action_performed"] == "list_approvals"

    vacant_list = orchestrator.dispatch_interactive_task("show vacant rooms and beds")
    assert vacant_list["action_performed"] == "list_vacant_beds"

