"""StayOps AI Operations & Multi-Agent API Router.

Provides REST endpoints for:
- Live Dashboard metrics (occupancy %, collections, open tickets, leads).
- Properties, rooms, and bed inventory.
- Tenants and active lease agreements.
- Leads and prospective resident pipeline.
- Maintenance tickets, vendor assignments, and human-in-the-loop approvals.
- Multi-agent workflow execution (15-day move-out, lead inquiry, maintenance).
- Audit timeline of all agent tasks and supervisory facilitator verification.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.db.seed import seed_database
from backend.app.models.property import Property, Room, Bed
from backend.app.models.tenant import Tenant, Lease
from backend.app.models.lead import Lead, PropertyVisit
from backend.app.models.maintenance import Vendor, MaintenanceTicket
from backend.app.models.financial import RentRecord, PaymentTransaction
from backend.app.models.workflow import WorkflowExecution, AgentTaskRecord, ApprovalRequest
from backend.app.schemas.domain import (
    PropertyRead,
    TenantRead,
    LeadRead,
    LeadCreate,
    MaintenanceTicketRead,
    VendorRead,
    ApprovalRequestRead,
    WorkflowExecutionRead,
    MoveOutNoticeRequest,
    MoveOutWorkflowResponse,
    LeadInquiryRequest,
    LeadInquiryResponse,
)

from agents.orchestrator.agent import OrchestratorAgent
from agents.collections.agent import get_portfolio_financial_metrics
from agents.vacancy_revenue.agent import calculate_portfolio_occupancy

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["StayOps Operations"])


# -------------------------------------------------------------
# 1. Dashboard Metrics
# -------------------------------------------------------------

@router.get("/dashboard/metrics")
def get_dashboard_metrics(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Retrieve unified property operations and multi-agent metrics."""
    occupancy = calculate_portfolio_occupancy(db)
    financials = get_portfolio_financial_metrics(db)

    active_tenants = db.query(Tenant).filter(Tenant.status == "active").count()
    notice_tenants = db.query(Tenant).filter(Tenant.status == "notice").count()
    active_leads = db.query(Lead).filter(Lead.status.in_(["new", "contacted", "matched"])).count()
    open_tickets = db.query(MaintenanceTicket).filter(MaintenanceTicket.status.in_(["open", "assigned", "in_progress"])).count()
    pending_approvals = db.query(ApprovalRequest).filter(ApprovalRequest.status == "pending").count()
    recent_workflows = db.query(WorkflowExecution).count()

    return {
        "occupancy": occupancy,
        "financials": financials,
        "counts": {
            "active_tenants": active_tenants,
            "notice_tenants": notice_tenants,
            "active_leads": active_leads,
            "open_tickets": open_tickets,
            "pending_approvals": pending_approvals,
            "total_workflows": recent_workflows,
        },
    }


# -------------------------------------------------------------
# 2. Properties & Inventory
# -------------------------------------------------------------

@router.get("/properties")
def list_properties(db: Session = Depends(get_db)) -> List[dict[str, Any]]:
    """List all managed properties with room and bed counts."""
    props = db.query(Property).filter(Property.is_deleted == False).all()
    results = []
    for p in props:
        total_rooms = len(p.rooms)
        total_beds = sum(len(r.beds) for r in p.rooms)
        available_beds = sum(sum(1 for b in r.beds if b.status == "available") for r in p.rooms)
        results.append(
            {
                "id": p.id,
                "name": p.name,
                "code": p.code,
                "city": p.city,
                "address": p.address,
                "total_floors": p.total_floors,
                "amenities": p.amenities or [],
                "rules_summary": p.rules_summary,
                "total_rooms": total_rooms,
                "total_beds": total_beds,
                "available_beds": available_beds,
            }
        )
    return results


@router.get("/rooms")
def list_rooms(property_id: Optional[str] = None, db: Session = Depends(get_db)) -> List[dict[str, Any]]:
    """List rooms with their beds and availability status."""
    stmt = select(Room, Property).join(Property, Room.property_id == Property.id).where(Room.is_deleted == False)
    if property_id:
        stmt = stmt.where(Room.property_id == property_id)
    records = db.execute(stmt).all()

    results = []
    for room, prop in records:
        beds_info = [{"id": b.id, "label": b.bed_label, "status": b.status, "rent": b.monthly_rent} for b in room.beds]
        results.append(
            {
                "id": room.id,
                "property_id": prop.id,
                "property_name": prop.name,
                "room_number": room.room_number,
                "floor_number": room.floor_number,
                "room_type": room.room_type,
                "base_rent": room.base_rent,
                "is_available": room.is_available,
                "beds": beds_info,
            }
        )
    return results


# -------------------------------------------------------------
# 3. Tenants & Leases
# -------------------------------------------------------------

@router.get("/tenants")
def list_tenants(status: Optional[str] = None, db: Session = Depends(get_db)) -> List[dict[str, Any]]:
    """List residents with current room and lease assignment."""
    stmt = (
        select(Tenant, Lease, Bed, Room, Property)
        .outerjoin(Lease, and_(Lease.tenant_id == Tenant.id, Lease.status == "active"))
        .outerjoin(Bed, Lease.bed_id == Bed.id)
        .outerjoin(Room, Bed.room_id == Room.id)
        .outerjoin(Property, Room.property_id == Property.id)
        .where(Tenant.is_deleted == False)
    )
    if status:
        stmt = stmt.where(Tenant.status == status)

    records = db.execute(stmt).all()
    results = []
    for tenant, lease, bed, room, prop in records:
        results.append(
            {
                "id": tenant.id,
                "full_name": tenant.full_name,
                "phone": tenant.phone,
                "email": tenant.email,
                "status": tenant.status,
                "property_name": prop.name if prop else "N/A",
                "room_number": room.room_number if room else "N/A",
                "bed_label": bed.bed_label if bed else "N/A",
                "monthly_rent": lease.monthly_rent if lease else 0.0,
                "security_deposit": lease.security_deposit if lease else 0.0,
                "lease_start": lease.start_date.isoformat() if lease else None,
                "lease_end": lease.end_date.isoformat() if lease and lease.end_date else None,
            }
        )
    return results


# -------------------------------------------------------------
# 4. Leads Pipeline
# -------------------------------------------------------------

@router.get("/leads")
def list_leads(db: Session = Depends(get_db)) -> List[dict[str, Any]]:
    """List prospective tenant leads."""
    leads = db.query(Lead).filter(Lead.is_deleted == False).order_by(desc(Lead.created_at)).all()
    return [
        {
            "id": l.id,
            "full_name": l.full_name,
            "phone": l.phone,
            "email": l.email,
            "budget": l.budget,
            "preferred_location": l.preferred_location,
            "preferred_room_type": l.preferred_room_type,
            "move_in_date": l.move_in_date.isoformat() if l.move_in_date else None,
            "status": l.status,
            "notes": l.notes,
        }
        for l in leads
    ]


@router.post("/leads")
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Create a new prospective lead."""
    lead = Lead(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return {"id": lead.id, "status": "created", "full_name": lead.full_name}


class VisitRescheduleRequest(BaseModel):
    visit_id: str
    new_scheduled_time: datetime
    reason: Optional[str] = "Lead requested change"


@router.post("/visits/reschedule")
def reschedule_visit_api(payload: VisitRescheduleRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Reschedule an existing property visit via Leasing Agent."""
    from agents.leasing.agent import reschedule_property_visit
    try:
        visit = reschedule_property_visit(db, payload.visit_id, payload.new_scheduled_time, payload.reason)
        return {
            "visit_id": visit.id,
            "scheduled_time": visit.scheduled_time.isoformat(),
            "status": "rescheduled",
            "message": "Visit successfully rescheduled.",
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


# -------------------------------------------------------------
# 5. Maintenance & Vendors
# -------------------------------------------------------------

@router.get("/tickets")
def list_tickets(db: Session = Depends(get_db)) -> List[dict[str, Any]]:
    """List maintenance tickets."""
    tickets = db.query(MaintenanceTicket).order_by(desc(MaintenanceTicket.created_at)).all()
    results = []
    for t in tickets:
        results.append(
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "category": t.category,
                "severity": t.severity,
                "status": t.status,
                "estimated_cost": t.estimated_cost,
                "vendor_name": t.vendor.name if t.vendor else "Unassigned",
                "created_at": t.created_at.isoformat(),
            }
        )
    return results


@router.get("/vendors")
def list_vendors(db: Session = Depends(get_db)) -> List[dict[str, Any]]:
    """List registered service contractors."""
    vendors = db.query(Vendor).filter(Vendor.is_active == True).all()
    return [
        {
            "id": v.id,
            "name": v.name,
            "category": v.category,
            "phone": v.phone,
            "rating": v.rating,
            "hourly_rate": v.hourly_rate,
        }
        for v in vendors
    ]


# -------------------------------------------------------------
# 6. Approvals (Human-in-the-Loop)
# -------------------------------------------------------------

@router.get("/approvals")
def list_approvals(db: Session = Depends(get_db)) -> List[dict[str, Any]]:
    """List approval requests requiring property manager action."""
    approvals = db.query(ApprovalRequest).order_by(desc(ApprovalRequest.created_at)).all()
    return [
        {
            "id": a.id,
            "workflow_id": a.workflow_id,
            "agent_name": a.agent_name,
            "action_type": a.action_type,
            "estimated_cost": a.estimated_cost,
            "description": a.description,
            "status": a.status,
            "reviewed_by": a.reviewed_by,
            "review_notes": a.review_notes,
            "created_at": a.created_at.isoformat(),
        }
        for a in approvals
    ]


class ApprovalReviewRequest(BaseModel):
    action: str = Field(..., description="'approved' or 'rejected'")
    reviewed_by: str = "Property Manager"
    notes: Optional[str] = "Approved via dashboard"


@router.post("/approvals/{approval_id}/review")
def review_approval(
    approval_id: str,
    payload: ApprovalReviewRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Approve or reject a sensitive or high-cost agent task."""
    approval = db.get(ApprovalRequest, approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found.")

    if payload.action not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Action must be 'approved' or 'rejected'.")

    approval.status = payload.action
    approval.reviewed_by = payload.reviewed_by
    approval.review_notes = payload.notes
    approval.reviewed_at = datetime.now(timezone.utc)

    # If approved, update associated workflow status
    if approval.workflow:
        approval.workflow.status = "completed" if payload.action == "approved" else "rejected"

    db.commit()
    return {
        "approval_id": approval.id,
        "status": approval.status,
        "reviewed_by": approval.reviewed_by,
        "message": f"Action has been {approval.status}.",
    }


# -------------------------------------------------------------
# 7. Multi-Agent Workflows & Audit Timeline
# -------------------------------------------------------------

@router.get("/workflows")
def list_workflows(limit: int = 20, db: Session = Depends(get_db)) -> List[dict[str, Any]]:
    """List orchestrated multi-agent workflows with task timeline."""
    wfs = db.query(WorkflowExecution).order_by(desc(WorkflowExecution.created_at)).limit(limit).all()
    results = []
    for wf in wfs:
        tasks_data = [
            {
                "task_id": t.task_id,
                "receiver_agent": t.receiver_agent,
                "task_type": t.task_type,
                "status": t.status,
                "is_parallel": t.is_parallel,
                "execution_time_ms": t.execution_time_ms,
            }
            for t in wf.tasks
        ]
        results.append(
            {
                "id": wf.id,
                "workflow_type": wf.workflow_type,
                "status": wf.status,
                "initiator": wf.initiator,
                "summary": wf.summary_result,
                "tasks_count": len(wf.tasks),
                "tasks": tasks_data,
                "created_at": wf.created_at.isoformat(),
            }
        )
    return results


@router.get("/workflows/{workflow_id}")
def get_workflow_detail(workflow_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Get full audit timeline and outputs for a specific workflow."""
    wf = db.get(WorkflowExecution, workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found.")

    tasks = [
        {
            "id": t.id,
            "task_id": t.task_id,
            "sender_agent": t.sender_agent,
            "receiver_agent": t.receiver_agent,
            "task_type": t.task_type,
            "input_data": t.input_data,
            "output_data": t.output_data,
            "status": t.status,
            "is_parallel": t.is_parallel,
            "execution_order": t.execution_order,
            "execution_time_ms": t.execution_time_ms,
        }
        for t in wf.tasks
    ]

    return {
        "id": wf.id,
        "workflow_type": wf.workflow_type,
        "status": wf.status,
        "initiator": wf.initiator,
        "input_payload": wf.input_payload,
        "summary_result": wf.summary_result,
        "tasks": tasks,
        "created_at": wf.created_at.isoformat(),
    }


@router.post("/workflows/move-out")
def trigger_move_out_workflow(
    payload: MoveOutNoticeRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Trigger the flagship 15-day move-out notice multi-agent workflow."""
    orchestrator = OrchestratorAgent(db)
    try:
        response = orchestrator.run_move_out_workflow(
            tenant_id=payload.tenant_id,
            notice_days=payload.notice_days,
            expected_move_out_date=payload.expected_move_out_date,
            reason=payload.reason,
        )
        return response
    except ValueError as ve:
        logger.warning("Move-out validation rejection: %s", ve)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error executing move-out workflow")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/workflows/lead-inquiry")
def trigger_lead_inquiry_workflow(
    payload: LeadInquiryRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Trigger lead enquiry matching via Lead & Leasing Agent."""
    orchestrator = OrchestratorAgent(db)
    return orchestrator.run_lead_inquiry_workflow(payload.model_dump())


@router.post("/seed")
def run_database_seed(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Seed initial sample data if not already seeded."""
    return seed_database(db=db)
