"""
StayOps AI — Maintenance SLA & Vendor Performance Tracker
Authored by: Prabin Yadav (@Prabin-yadav, PRN: 23070122280)
Role: Tenant Support & Maintenance Agent Specialist
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.maintenance import MaintenanceTicket, Vendor


def audit_maintenance_sla(
    db: Session,
    max_resolution_hours: float = 48.0,
) -> Dict[str, Any]:
    """Audit ticket SLA resolution compliance and identify breaches."""
    tickets = db.execute(select(MaintenanceTicket)).scalars().all()

    total_tickets = len(tickets)
    resolved_tickets = [t for t in tickets if t.status in ("resolved", "closed")]
    open_tickets = [t for t in tickets if t.status not in ("resolved", "closed")]
    emergency_open = [
        t for t in open_tickets if t.severity in ("Emergency", "High")
    ]

    breached_tickets: List[Dict[str, Any]] = []
    now = datetime.now(timezone.utc)

    for t in open_tickets:
        created_at = t.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        age_hours = (now - created_at).total_seconds() / 3600.0
        if age_hours > max_resolution_hours or (t.severity == "Emergency" and age_hours > 6.0):
            breached_tickets.append({
                "ticket_id": t.id,
                "title": t.title,
                "severity": t.severity,
                "status": t.status,
                "category": t.category,
                "age_hours": round(age_hours, 1),
                "vendor_name": t.vendor.name if t.vendor else "Unassigned",
            })

    resolution_rate = (
        (len(resolved_tickets) / total_tickets * 100.0) if total_tickets > 0 else 100.0
    )
    sla_compliance = (
        ((total_tickets - len(breached_tickets)) / total_tickets * 100.0)
        if total_tickets > 0
        else 100.0
    )

    return {
        "total_tickets": total_tickets,
        "resolved_tickets": len(resolved_tickets),
        "open_tickets": len(open_tickets),
        "emergency_open_count": len(emergency_open),
        "sla_breach_count": len(breached_tickets),
        "resolution_rate_pct": round(resolution_rate, 2),
        "sla_compliance_pct": round(sla_compliance, 2),
        "breached_tickets": breached_tickets,
    }


def audit_vendor_performance(db: Session) -> Dict[str, Any]:
    """Track vendor utilization, ticket completion efficiency, and total expenses."""
    vendors = db.execute(select(Vendor)).scalars().all()
    vendor_metrics: List[Dict[str, Any]] = []

    for v in vendors:
        v_tickets = v.tickets
        resolved_count = sum(1 for t in v_tickets if t.status in ("resolved", "closed"))
        total_spent = sum(t.actual_cost or t.estimated_cost for t in v_tickets)
        completion_pct = (
            (resolved_count / len(v_tickets) * 100.0) if v_tickets else 100.0
        )

        vendor_metrics.append({
            "vendor_id": v.id,
            "name": v.name,
            "category": v.category,
            "rating": v.rating,
            "hourly_rate": v.hourly_rate,
            "is_active": v.is_active,
            "total_assigned": len(v_tickets),
            "total_resolved": resolved_count,
            "completion_rate_pct": round(completion_pct, 1),
            "total_cost_incurred": round(total_spent, 2),
        })

    return {
        "total_vendors": len(vendors),
        "active_vendors": sum(1 for v in vendors if v.is_active),
        "vendor_breakdown": vendor_metrics,
    }
