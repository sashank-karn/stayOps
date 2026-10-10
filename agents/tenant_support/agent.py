"""Tenant Support Agent — Prabin Yadav (Prabin-yadav).

Specialized agent responsible for:
- Resident enquiries regarding PG facilities, house rules, rent, and amenities.
- Intent classification of tenant messages.
- Processing and recording 15-day move-out notices.
- Routing repair/maintenance requests to Maintenance & Vendor Agent.
- Tracking tenant support tickets and service history.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any, List, Optional
from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from backend.app.models.tenant import Tenant, Lease
from backend.app.models.property import Property, Room, Bed
from backend.app.models.maintenance import MaintenanceTicket
from shared.schemas.agent_message import AgentMessage, MessageStatus, TaskPriority

logger = logging.getLogger(__name__)

AGENT_NAME = "tenant_support"


def classify_tenant_intent(text: str) -> str:
    """Classify the intent of a resident's message."""
    t = text.lower()
    if any(k in t for k in ["move out", "leaving", "vacating", "vacate", "notice period", "checkout", "check out"]):
        return "move_out_notice"
    elif any(k in t for k in ["leak", "broken", "repair", "not working", "geyser", "tap", "light", "fan", "ac", "plumber", "clean", "drainage"]):
        return "maintenance_issue"
    elif any(k in t for k in ["rent", "payment", "paid", "due", "deposit", "receipt", "upi"]):
        return "billing_inquiry"
    elif any(k in t for k in ["rule", "curfew", "guest", "visitor", "timing", "food", "mess", "wi-fi", "wifi", "laundry"]):
        return "rules_amenities"
    return "general_support"


def get_active_tenant_details(db: Session, tenant_id_or_phone: str) -> Optional[dict[str, Any]]:
    """Retrieve full resident and lease details using ID or phone number."""
    identifier = tenant_id_or_phone.strip()
    stmt = (
        select(Tenant, Lease, Bed, Room, Property)
        .outerjoin(Lease, and_(Lease.tenant_id == Tenant.id, Lease.status == "active"))
        .outerjoin(Bed, Lease.bed_id == Bed.id)
        .outerjoin(Room, Bed.room_id == Room.id)
        .outerjoin(Property, Room.property_id == Property.id)
        .where(
            (Tenant.id == identifier) | (Tenant.phone == identifier) | (Tenant.email == identifier)
        )
    )
    result = db.execute(stmt).first()
    if not result:
        return None

    tenant, lease, bed, room, prop = result
    return {
        "tenant_id": tenant.id,
        "full_name": tenant.full_name,
        "phone": tenant.phone,
        "email": tenant.email,
        "status": tenant.status,
        "lease_id": lease.id if lease else None,
        "monthly_rent": lease.monthly_rent if lease else 0.0,
        "security_deposit": lease.security_deposit if lease else 0.0,
        "start_date": lease.start_date.isoformat() if lease else None,
        "property_id": prop.id if prop else None,
        "property_name": prop.name if prop else "Unknown Property",
        "property_code": prop.code if prop else "",
        "city": prop.city if prop else "",
        "rules_summary": prop.rules_summary if prop else "",
        "room_id": room.id if room else None,
        "room_number": room.room_number if room else "N/A",
        "room_type": room.room_type if room else "N/A",
        "bed_id": bed.id if bed else None,
        "bed_label": bed.bed_label if bed else "N/A",
    }


def record_move_out_notice(
    db: Session,
    tenant_id: str,
    notice_days: int = 15,
    expected_move_out_date: Optional[date] = None,
    reason: Optional[str] = "Personal reasons / Relocation",
) -> dict[str, Any]:
    """Validate tenant and record an official move-out notice."""
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise ValueError(f"Tenant with ID '{tenant_id}' not found.")

    today = date.today()
    if expected_move_out_date is None:
        expected_move_out_date = today + timedelta(days=notice_days)

    # Transition tenant status to 'notice'
    tenant.status = "notice"

    # Find active lease and set anticipated end date
    lease_stmt = select(Lease).where(and_(Lease.tenant_id == tenant.id, Lease.status == "active"))
    lease = db.execute(lease_stmt).scalar_one_or_none()
    if lease:
        lease.end_date = expected_move_out_date

    db.commit()

    # Fetch full context
    details = get_active_tenant_details(db, tenant.id) or {}
    return {
        "tenant_id": tenant.id,
        "tenant_name": tenant.full_name,
        "notice_date": today.isoformat(),
        "notice_days": notice_days,
        "expected_move_out_date": expected_move_out_date.isoformat(),
        "reason": reason,
        "property_id": details.get("property_id"),
        "property_name": details.get("property_name"),
        "room_id": details.get("room_id"),
        "room_number": details.get("room_number"),
        "room_type": details.get("room_type"),
        "bed_id": details.get("bed_id"),
        "bed_label": details.get("bed_label"),
        "monthly_rent": details.get("monthly_rent"),
        "security_deposit": details.get("security_deposit"),
        "status": "notice_recorded",
        "message": (
            f"Move-out notice successfully recorded for {tenant.full_name}. "
            f"Expected checkout date is {expected_move_out_date.strftime('%b %d, %Y')} ({notice_days} days notice)."
        ),
    }


class TenantSupportAgent:
    """Specialized Tenant Support Agent implementation."""

    name = AGENT_NAME

    def __init__(self, db: Session):
        self.db = db

    def handle_message(self, message: AgentMessage) -> AgentMessage:
        """Process incoming task messages."""
        task_type = message.task_type
        payload = message.input_data

        try:
            if task_type == "submit_move_out_notice":
                result = self.process_move_out_notice(payload)
            elif task_type in ("process_inquiry", "answer_question"):
                result = self.process_inquiry(payload)
            elif task_type == "get_tenant_info":
                result = self.get_tenant_info(payload)
            else:
                return message.mark(
                    MessageStatus.FAILED,
                    error=f"Unsupported task_type '{task_type}' for TenantSupportAgent",
                )

            return message.mark(MessageStatus.COMPLETED, result=result)

        except Exception as e:
            logger.exception("Error in TenantSupportAgent executing %s", task_type)
            return message.mark(MessageStatus.FAILED, error=str(e))

    def process_move_out_notice(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Validate resident, record checkout notice, and prepare downstream event payload."""
        tenant_id = payload.get("tenant_id")
        if not tenant_id:
            raise ValueError("tenant_id is required to submit a move-out notice.")

        notice_days = int(payload.get("notice_days", 15))
        expected_date = None
        if payload.get("expected_move_out_date"):
            expected_date = date.fromisoformat(str(payload["expected_move_out_date"]))

        reason = payload.get("reason", "Relocating for work/education")
        return record_move_out_notice(
            db=self.db,
            tenant_id=tenant_id,
            notice_days=notice_days,
            expected_move_out_date=expected_date,
            reason=reason,
        )

    def process_inquiry(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Handle tenant message, classify intent, and provide resolution or route."""
        tenant_id = payload.get("tenant_id")
        query = payload.get("query") or payload.get("message", "")

        intent = classify_tenant_intent(query)
        details = get_active_tenant_details(self.db, tenant_id) if tenant_id else None

        if intent == "move_out_notice":
            return {
                "intent": intent,
                "action": "prompt_move_out_confirmation",
                "message": "It looks like you wish to vacate. Would you like to confirm your 15-day move-out notice?",
            }
        elif intent == "rules_amenities" and details:
            rules = details.get("rules_summary", "Standard house rules apply. Please consult property manager.")
            return {
                "intent": intent,
                "action": "answer_provided",
                "property_name": details.get("property_name"),
                "message": f"House rules for {details.get('property_name')}: {rules}",
            }
        elif intent == "maintenance_issue":
            return {
                "intent": intent,
                "action": "route_to_maintenance",
                "message": "Routing your maintenance issue to the Maintenance & Vendor Agent.",
                "requires_maintenance_agent": True,
            }
        else:
            return {
                "intent": intent,
                "action": "general_answer",
                "message": "Thank you for reaching out to StayOps Support. Our resident operations team is reviewing your request.",
            }

    def get_tenant_info(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Fetch verified tenant profile and room status."""
        identifier = payload.get("tenant_id") or payload.get("phone") or ""
        info = get_active_tenant_details(self.db, identifier)
        if not info:
            raise ValueError(f"No active tenant found matching '{identifier}'.")
        return info
