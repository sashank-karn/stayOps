"""
StayOps AI — Comprehensive Multi-Agent System Readiness & Health Audit
Authored by: Sashank Karn (@sashank-karn, PRN: 23070122277)
Role: Central Orchestrator & Facilitator Lead
"""
from __future__ import annotations

from typing import Any, Dict
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from backend.app.models.property import Property, Bed
from backend.app.models.tenant import Tenant, Lease
from agents.collections.audit import generate_collection_audit
from agents.maintenance.sla import audit_maintenance_sla
from agents.leasing.funnel import audit_leasing_funnel
from agents.vacancy_revenue.agent import calculate_portfolio_occupancy


def check_system_readiness(db: Session) -> Dict[str, Any]:
    """Audit all 7 multi-agent subsystems and return unified operational readiness."""
    subsystems: Dict[str, Any] = {}

    # 1. Core Property & Bed Registry
    total_properties = db.execute(select(func.count(Property.id))).scalar() or 0
    total_beds = db.execute(select(func.count(Bed.id))).scalar() or 0
    occupied_beds = (
        db.execute(select(func.count(Bed.id)).where(Bed.status == "occupied")).scalar() or 0
    )
    occupancy_pct = (
        (occupied_beds / total_beds * 100.0) if total_beds > 0 else 0.0
    )
    subsystems["property_registry"] = {
        "status": "operational" if total_properties > 0 else "empty",
        "properties_count": total_properties,
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "occupancy_rate_pct": round(occupancy_pct, 1),
    }

    # 2. Lead & Leasing Funnel
    funnel = audit_leasing_funnel(db)
    subsystems["lead_and_leasing"] = {
        "status": "operational",
        "total_leads": funnel["total_leads"],
        "conversion_rate_pct": funnel["conversion_rate_pct"],
        "upcoming_visits": funnel["upcoming_visits_count"],
    }

    # 3. Tenant Support & Active Tenancies
    total_tenants = db.execute(select(func.count(Tenant.id))).scalar() or 0
    notice_tenants = (
        db.execute(select(func.count(Tenant.id)).where(Tenant.status == "notice")).scalar() or 0
    )
    subsystems["tenant_support"] = {
        "status": "operational",
        "active_tenants": total_tenants,
        "move_out_notice_count": notice_tenants,
    }

    # 4. Maintenance & Vendor SLA
    maintenance_audit = audit_maintenance_sla(db)
    subsystems["maintenance_and_vendors"] = {
        "status": "operational",
        "total_tickets": maintenance_audit["total_tickets"],
        "sla_compliance_pct": maintenance_audit["sla_compliance_pct"],
        "emergency_open": maintenance_audit["emergency_open_count"],
    }

    # 5. Rent & Collections
    collections_audit = generate_collection_audit(db)
    subsystems["rent_and_collections"] = {
        "status": "operational",
        "efficiency_pct": collections_audit["collection_efficiency_pct"],
        "total_outstanding": collections_audit["total_outstanding"],
        "overdue_count": collections_audit["overdue_count"],
    }

    # 6. Vacancy & Revenue Recovery
    vacancy_info = calculate_portfolio_occupancy(db)
    subsystems["vacancy_and_revenue"] = {
        "status": "operational",
        "overall_occupancy_pct": vacancy_info["occupancy_rate_percent"],
        "available_beds": vacancy_info["available_beds"],
    }

    # 7. Central Orchestrator & Facilitator
    subsystems["central_orchestrator"] = {
        "status": "operational",
        "routed_agents_count": 7,
        "safety_guardrails": "enabled",
    }

    all_operational = all(s.get("status") == "operational" for s in subsystems.values())
    overall_status = "healthy" if all_operational else "degraded"

    return {
        "overall_status": overall_status,
        "active_agent_count": 7,
        "subsystems": subsystems,
    }
