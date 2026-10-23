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


def test_agent_property_room_bed_management(db_session):
    orchestrator = OrchestratorAgent(db_session)

    # 1. Add Property
    prop_res = orchestrator.dispatch_interactive_task(
        "Add property StayOps Horizon at HSR Layout, Sector 2, Bengaluru with 4 floors"
    )
    assert prop_res["action_performed"] == "create_property"
    assert "StayOps Horizon".lower() in prop_res["response"].lower()
    prop_id = prop_res["data"]["property_id"]

    # 2. Add Room to Property
    room_res = orchestrator.dispatch_interactive_task(
        f"Add room 302 Double with rent 13500 on 3rd floor in StayOps Horizon"
    )
    assert room_res["action_performed"] == "create_room"
    assert "Room 302" in room_res["response"]
    assert room_res["data"]["beds_created"] == 2

    # 3. Add Bed to Room
    bed_res = orchestrator.dispatch_interactive_task(
        "Add bed C in room 302 rent 13500"
    )
    assert bed_res["action_performed"] == "create_bed"
    assert "Bed C" in bed_res["response"]
    assert bed_res["data"]["status"] == "available"

    # 4. Update Bed Status to Occupied
    occ_res = orchestrator.dispatch_interactive_task("Set bed C in room 302 occupied")
    assert occ_res["action_performed"] == "update_bed_status"
    assert occ_res["data"]["status"] == "occupied"

    # 5. Mark Bed Vacant / Relist
    vac_res = orchestrator.dispatch_interactive_task("Mark bed C in room 302 vacant")
    assert vac_res["action_performed"] == "update_bed_status"
    assert vac_res["data"]["status"] == "available"


def test_agent_partial_name_user_resolution(db_session):
    orchestrator = OrchestratorAgent(db_session)

    # User in seed is "Rohan Mehta (Resident)"
    # Prompt: "Deactivate user Rohan"
    deact_res = orchestrator.dispatch_interactive_task("Deactivate user Rohan")
    assert deact_res["action_performed"] == "deactivate_user"
    assert "Rohan" in deact_res["response"]
    assert deact_res["data"]["is_active"] is False

    # Prompt: "Activate user Rohan"
    act_res = orchestrator.dispatch_interactive_task("Activate user Rohan")
    assert act_res["action_performed"] == "activate_user"
    assert "Rohan" in act_res["response"]
    assert act_res["data"]["is_active"] is True


def test_agent_resolve_maintenance_synonyms(db_session):
    orchestrator = OrchestratorAgent(db_session)

    # Create ticket first
    ticket_res = orchestrator.dispatch_interactive_task("Create maintenance ticket for broken geyser in room 204")
    assert ticket_res["action_performed"] == "create_maintenance_ticket"

    # Resolve using "resolve maintenance"
    resolve_res = orchestrator.dispatch_interactive_task("resolve maintenance")
    assert resolve_res["action_performed"] == "resolve_maintenance_ticket"
    assert "marked as resolved" in resolve_res["response"]


def test_agent_rbac_tenant_permission_denied(db_session):
    orchestrator = OrchestratorAgent(db_session)
    tenant_context = {"user_role": "tenant", "email": "resident@stayops.ai"}

    # 1. Tenant attempting to deactivate user -> DENIED
    deact_res = orchestrator.dispatch_interactive_task("Deactivate user Rohan", context=tenant_context)
    assert deact_res["action_performed"] == "permission_denied"
    assert deact_res["data"]["denied_action"] == "user_management"
    assert "Permission Denied" in deact_res["response"]

    # 2. Tenant attempting to add property -> DENIED
    prop_res = orchestrator.dispatch_interactive_task("Add property Royal Palace in Pune", context=tenant_context)
    assert prop_res["action_performed"] == "permission_denied"
    assert prop_res["data"]["denied_action"] == "property_management"

    # 3. Tenant attempting to add room -> DENIED
    room_res = orchestrator.dispatch_interactive_task("Add room 501 Single rent 18000", context=tenant_context)
    assert room_res["action_performed"] == "permission_denied"
    assert room_res["data"]["denied_action"] == "room_management"

    # 4. Tenant attempting to manage beds -> DENIED
    bed_res = orchestrator.dispatch_interactive_task("Mark bed A in room 101 vacant", context=tenant_context)
    assert bed_res["action_performed"] == "permission_denied"
    assert bed_res["data"]["denied_action"] == "bed_management"

    # 5. Tenant attempting to assign vendor -> DENIED
    assign_res = orchestrator.dispatch_interactive_task("Assign vendor plumber to ticket", context=tenant_context)
    assert assign_res["action_performed"] == "permission_denied"
    assert assign_res["data"]["denied_action"] == "assign_vendor"

    # 6. Tenant attempting to resolve ticket -> DENIED
    res_ticket = orchestrator.dispatch_interactive_task("Resolve maintenance ticket", context=tenant_context)
    assert res_ticket["action_performed"] == "permission_denied"
    assert res_ticket["data"]["denied_action"] == "resolve_maintenance_ticket"

    # 7. Tenant attempting to approve safety gate -> DENIED
    appr_res = orchestrator.dispatch_interactive_task("Approve all pending approvals", context=tenant_context)
    assert appr_res["action_performed"] == "permission_denied"
    assert appr_res["data"]["denied_action"] == "approve_safety_gate"

    # 8. Tenant attempting to create lease -> DENIED
    lease_res = orchestrator.dispatch_interactive_task("Create lease for Bob in room 202 rent 12000", context=tenant_context)
    assert lease_res["action_performed"] == "permission_denied"
    assert lease_res["data"]["denied_action"] == "create_lease"

    # 9. Tenant attempting to broadcast announcement -> DENIED
    ann_res = orchestrator.dispatch_interactive_task("Create announcement: Power outage at 5 PM", context=tenant_context)
    assert ann_res["action_performed"] == "permission_denied"
    assert ann_res["data"]["denied_action"] == "broadcast_announcement"

    # 10. Tenant attempting to list users -> DENIED
    list_u_res = orchestrator.dispatch_interactive_task("List all users", context=tenant_context)
    assert list_u_res["action_performed"] == "permission_denied"
    assert list_u_res["data"]["denied_action"] == "list_users"

    # 11. Tenant allowed actions: filing ticket -> ALLOWED
    ticket_res = orchestrator.dispatch_interactive_task("Create maintenance ticket for kitchen sink leakage", context=tenant_context)
    assert ticket_res["action_performed"] == "create_maintenance_ticket"

    # 12. Tenant allowed actions: booking tour -> ALLOWED
    tour_res = orchestrator.dispatch_interactive_task("Schedule tour for myself tomorrow at 5 PM", context=tenant_context)
    assert tour_res["action_performed"] == "schedule_property_visit"


def test_agent_viman_nagar_bed_allocation_and_safety_approvals(db_session):
    orchestrator = OrchestratorAgent(db_session)

    # 1. Test allocating a bed in Viman Nagar flat with budget
    alloc_res = orchestrator.dispatch_interactive_task(
        "allocate a bed in vimangar flat with single bed room of 20000"
    )
    assert alloc_res["action_performed"] == "create_lease_agreement"
    assert "Viman Nagar" in alloc_res["response"]
    assert "Lease agreement successfully created" in alloc_res["response"]
    assert alloc_res["data"]["monthly_rent"] <= 20000

    # 2. Test checking pending safety approvals
    safety_res = orchestrator.dispatch_interactive_task("Check pending safety approvals")
    assert safety_res["action_performed"] == "list_approvals"
    assert "safety" in safety_res["response"].lower()



