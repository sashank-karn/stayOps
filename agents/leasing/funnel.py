"""
StayOps AI — Leasing Funnel & Lead Conversion Analytics
Authored by: Sonali Gupta (@Sona1147, PRN: 23070122266)
Role: Lead & Leasing Agent Specialist
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.lead import Lead, PropertyVisit


def audit_leasing_funnel(db: Session) -> Dict[str, Any]:
    """Calculate lead conversion stages, visit fulfillment, and funnel throughput."""
    leads = db.execute(select(Lead)).scalars().all()
    visits = db.execute(select(PropertyVisit)).scalars().all()

    total_leads = len(leads)
    status_counts: Dict[str, int] = {
        "new": 0,
        "contacted": 0,
        "matched": 0,
        "visit_scheduled": 0,
        "converted": 0,
        "lost": 0,
    }

    for l in leads:
        st = l.status if l.status in status_counts else "new"
        status_counts[st] += 1

    converted_count = status_counts["converted"]
    conversion_rate = (
        (converted_count / total_leads * 100.0) if total_leads > 0 else 0.0
    )

    visit_status_counts: Dict[str, int] = {
        "scheduled": 0,
        "completed": 0,
        "cancelled": 0,
        "no_show": 0,
    }
    for v in visits:
        v_st = v.status if v.status in visit_status_counts else "scheduled"
        visit_status_counts[v_st] += 1

    total_visits = len(visits)
    visit_completion_rate = (
        (visit_status_counts["completed"] / total_visits * 100.0)
        if total_visits > 0
        else 0.0
    )

    now = datetime.now(timezone.utc)
    upcoming_visits: List[Dict[str, Any]] = []
    for v in visits:
        scheduled_time = v.scheduled_time
        if scheduled_time.tzinfo is None:
            scheduled_time = scheduled_time.replace(tzinfo=timezone.utc)
        if v.status == "scheduled" and scheduled_time >= now:
            upcoming_visits.append({
                "visit_id": v.id,
                "lead_name": v.lead.full_name if v.lead else "Unknown",
                "lead_phone": v.lead.phone if v.lead else "N/A",
                "property_name": v.property.name if v.property else "Unknown",
                "scheduled_time": scheduled_time.isoformat(),
            })

    return {
        "total_leads": total_leads,
        "status_breakdown": status_counts,
        "conversion_rate_pct": round(conversion_rate, 2),
        "total_visits": total_visits,
        "visit_status_breakdown": visit_status_counts,
        "visit_completion_rate_pct": round(visit_completion_rate, 2),
        "upcoming_visits_count": len(upcoming_visits),
        "upcoming_visits": upcoming_visits,
    }
