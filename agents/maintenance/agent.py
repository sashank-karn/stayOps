"""Maintenance and Vendor Agent — Prabin Yadav (Prabin-yadav).

Specialized agent responsible for:
- Processing and categorizing maintenance tickets (Plumbing, Electrical, Cleaning, etc.).
- Matching best-fit vendors from stored authoritative vendor directory.
- Estimating repair costs based on vendor rates and task complexity.
- High-cost approval gating (requires human approval when estimated cost > threshold).
- Preparing turnover inspection and cleaning tasks upon tenant move-out notices.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, List, Optional
from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from backend.app.models.maintenance import Vendor, MaintenanceTicket
from backend.app.models.workflow import ApprovalRequest
from backend.app.core.config import settings
from shared.schemas.agent_message import AgentMessage, MessageStatus, TaskPriority

logger = logging.getLogger(__name__)

AGENT_NAME = "maintenance"


def find_best_vendor(db: Session, category: str) -> Optional[Vendor]:
    """Find the highest-rated active vendor for a given trade category."""
    stmt = (
        select(Vendor)
        .where(and_(Vendor.is_active == True, Vendor.is_deleted == False))
        .order_by(Vendor.rating.desc())
    )
    vendors = db.execute(stmt).scalars().all()

    cat_lower = category.lower()
    # Match exact or partial category
    for v in vendors:
        if cat_lower in v.category.lower() or v.category.lower() in cat_lower:
            return v

    # Fallback to general vendor
    return vendors[0] if vendors else None


def estimate_service_cost(category: str, vendor: Optional[Vendor], scope: str = "standard") -> float:
    """Calculate realistic estimated service costs."""
    base_rate = vendor.hourly_rate if vendor else 500.0

    scope_multipliers = {
        "minor": 1.0,
        "standard": 2.0,
        "major": 4.0,
        "turnover_deep_clean": 3.5,
        "full_room_turnover": 5.0,
    }
    multiplier = scope_multipliers.get(scope, 2.0)
    parts_cost = {
        "plumbing": 300.0,
        "electrical": 400.0,
        "appliance": 800.0,
        "cleaning": 200.0,
        "turnover": 600.0,
    }.get(category.lower(), 250.0)

    total = (base_rate * multiplier) + parts_cost
    return round(total, 2)


class MaintenanceAgent:
    """Specialized Maintenance and Vendor Agent implementation."""

    name = AGENT_NAME

    def __init__(self, db: Session, cost_threshold: Optional[float] = None):
        self.db = db
        self.cost_threshold = cost_threshold if cost_threshold is not None else settings.approval_cost_threshold

    def handle_message(self, message: AgentMessage) -> AgentMessage:
        """Process incoming task messages."""
        task_type = message.task_type
        payload = message.input_data

        try:
            if task_type == "create_ticket":
                result = self.process_ticket_creation(payload)
            elif task_type == "prepare_turnover":
                result = self.prepare_room_turnover(payload)
            elif task_type == "assign_vendor":
                result = self.assign_vendor(payload)
            else:
                return message.mark(
                    MessageStatus.FAILED,
                    error=f"Unsupported task_type '{task_type}' for MaintenanceAgent",
                )

            # Check if human approval is required
            requires_approval = result.get("requires_approval", False)
            status = MessageStatus.NEEDS_APPROVAL if requires_approval else MessageStatus.COMPLETED

            return message.mark(
                status,
                result=result,
                requires_approval=requires_approval,
            )

        except Exception as e:
            logger.exception("Error executing maintenance task %s", task_type)
            return message.mark(MessageStatus.FAILED, error=str(e))

    def process_ticket_creation(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Create a maintenance ticket, match vendor, estimate cost, and check approval."""
        property_id = payload.get("property_id")
        title = payload.get("title", "Reported Maintenance Issue")
        description = payload.get("description", "")
        category = payload.get("category", "Plumbing")
        severity = payload.get("severity", "Medium")
        tenant_id = payload.get("tenant_id")
        room_id = payload.get("room_id")

        if not property_id:
            raise ValueError("property_id is required to raise a maintenance ticket.")

        vendor = find_best_vendor(self.db, category)
        estimated_cost = estimate_service_cost(category, vendor, scope="standard")
        needs_approval = estimated_cost > self.cost_threshold

        ticket = MaintenanceTicket(
            property_id=property_id,
            room_id=room_id,
            tenant_id=tenant_id,
            vendor_id=vendor.id if vendor else None,
            title=title,
            description=description,
            category=category,
            severity=severity,
            status="assigned" if vendor and not needs_approval else "open",
            estimated_cost=estimated_cost,
        )
        self.db.add(ticket)
        self.db.commit()
        self.db.refresh(ticket)

        return {
            "ticket_id": ticket.id,
            "title": ticket.title,
            "category": ticket.category,
            "severity": ticket.severity,
            "status": ticket.status,
            "estimated_cost": estimated_cost,
            "matched_vendor": vendor.name if vendor else "None available",
            "vendor_phone": vendor.phone if vendor else None,
            "requires_approval": needs_approval,
            "approval_threshold": self.cost_threshold,
            "message": (
                f"Ticket created: '{title}'. Estimated cost ₹{estimated_cost:,.0f}. "
                f"{'Requires property manager approval (> ₹' + str(self.cost_threshold) + ').' if needs_approval else 'Assigned to ' + (vendor.name if vendor else 'vendor') + '.'}"
            ),
        }

    def prepare_room_turnover(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Prepare room inspection, deep clean, and turnover upon tenant move-out."""
        property_id = payload.get("property_id")
        room_id = payload.get("room_id")
        room_number = payload.get("room_number", "N/A")
        tenant_name = payload.get("tenant_name", "Resident")

        cleaning_vendor = find_best_vendor(self.db, "Cleaning")
        estimated_cost = estimate_service_cost("Cleaning", cleaning_vendor, scope="turnover_deep_clean")
        needs_approval = estimated_cost > self.cost_threshold

        ticket = MaintenanceTicket(
            property_id=property_id,
            room_id=room_id,
            vendor_id=cleaning_vendor.id if cleaning_vendor else None,
            title=f"Turnover Inspection & Deep Clean: Room {room_number}",
            description=f"Turnover preparation and room inspection following move-out notice from {tenant_name}.",
            category="Cleaning",
            severity="Medium",
            status="assigned" if not needs_approval else "open",
            estimated_cost=estimated_cost,
        )
        self.db.add(ticket)
        self.db.commit()
        self.db.refresh(ticket)

        return {
            "turnover_ticket_id": ticket.id,
            "room_number": room_number,
            "action": "room_turnover_scheduled",
            "estimated_cost": estimated_cost,
            "assigned_vendor": cleaning_vendor.name if cleaning_vendor else "CleanPro Services",
            "requires_approval": needs_approval,
            "message": (
                f"Room turnover ticket generated for Room {room_number}. "
                f"Assigned to {cleaning_vendor.name if cleaning_vendor else 'CleanPro Services'} (Est: ₹{estimated_cost:,.0f}). "
                f"{'Pending manager approval.' if needs_approval else 'Ready for scheduled move-out date.'}"
            ),
        }

    def assign_vendor(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Manually or automatically assign a vendor to an existing ticket."""
        ticket_id = payload.get("ticket_id")
        vendor_id = payload.get("vendor_id")

        ticket = self.db.get(MaintenanceTicket, ticket_id)
        if not ticket:
            raise ValueError(f"Maintenance ticket '{ticket_id}' not found.")

        vendor = self.db.get(Vendor, vendor_id) if vendor_id else find_best_vendor(self.db, ticket.category)
        if not vendor:
            raise ValueError("No matching vendor available.")

        ticket.vendor_id = vendor.id
        ticket.status = "assigned"
        self.db.commit()

        return {
            "ticket_id": ticket.id,
            "vendor_name": vendor.name,
            "vendor_phone": vendor.phone,
            "status": "assigned",
            "message": f"Ticket assigned to {vendor.name}.",
        }
