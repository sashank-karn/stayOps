"""Vacancy and Revenue Recovery Agent — Adarsh Jha (AdarshCodes1221).

Specialized agent responsible for:
- Monitoring portfolio occupancy rates, capacity, and current/upcoming vacancies.
- Identifying rooms transitioning to vacant due to tenant move-out notices.
- Matching active prospective leads against upcoming vacancies to minimize vacancy gap.
- Calculating projected revenue loss from downtime vs. recovered revenue from early lead matching.
- Formulating actionable revenue-recovery recommendations for property managers.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any, List, Optional
from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from backend.app.models.property import Property, Room, Bed
from backend.app.models.tenant import Tenant, Lease
from backend.app.models.lead import Lead
from shared.schemas.agent_message import AgentMessage, MessageStatus, TaskPriority

logger = logging.getLogger(__name__)

AGENT_NAME = "vacancy_revenue"


def calculate_portfolio_occupancy(db: Session) -> dict[str, Any]:
    """Calculate overall portfolio capacity, active occupancy, and vacancy rates."""
    beds = db.execute(select(Bed).where(Bed.is_deleted == False)).scalars().all()

    total_beds = len(beds)
    occupied_beds = sum(1 for b in beds if b.status == "occupied")
    available_beds = sum(1 for b in beds if b.status == "available")
    reserved_beds = sum(1 for b in beds if b.status == "reserved")
    maintenance_beds = sum(1 for b in beds if b.status == "maintenance")

    occupancy_rate = (occupied_beds / total_beds * 100.0) if total_beds > 0 else 0.0
    potential_monthly_revenue = sum(b.monthly_rent for b in beds)
    actual_monthly_revenue = sum(b.monthly_rent for b in beds if b.status == "occupied")
    vacancy_monthly_loss = sum(b.monthly_rent for b in beds if b.status in ("available", "maintenance"))

    return {
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "available_beds": available_beds,
        "reserved_beds": reserved_beds,
        "maintenance_beds": maintenance_beds,
        "occupancy_rate_percent": round(occupancy_rate, 1),
        "potential_monthly_revenue": round(potential_monthly_revenue, 2),
        "actual_monthly_revenue": round(actual_monthly_revenue, 2),
        "monthly_vacancy_loss": round(vacancy_monthly_loss, 2),
    }


def find_matching_leads_for_room(
    db: Session,
    location: str,
    room_type: str,
    monthly_rent: float,
    target_move_in_date: Optional[date] = None,
    limit: int = 5,
) -> List[dict[str, Any]]:
    """Search existing active leads matching a specific upcoming room vacancy."""
    stmt = (
        select(Lead)
        .where(
            and_(
                Lead.status.in_(["new", "contacted", "matched"]),
                Lead.is_deleted == False,
            )
        )
    )
    leads = db.execute(stmt).scalars().all()

    matches = []
    loc_lower = location.lower()

    for l in leads:
        match_score = 0.0

        # Location matching (40 pts)
        if loc_lower in l.preferred_location.lower() or l.preferred_location.lower() in loc_lower:
            match_score += 40.0
        else:
            match_score += 15.0

        # Budget matching (40 pts)
        if l.budget >= monthly_rent:
            match_score += 40.0
        elif l.budget >= monthly_rent * 0.9:
            match_score += 25.0
        else:
            match_score += 10.0

        # Room type matching (20 pts)
        if l.preferred_room_type.lower() == room_type.lower():
            match_score += 20.0
        else:
            match_score += 5.0

        matches.append(
            {
                "lead_id": l.id,
                "name": l.full_name,
                "phone": l.phone,
                "email": l.email,
                "budget": l.budget,
                "preferred_location": l.preferred_location,
                "preferred_room_type": l.preferred_room_type,
                "lead_move_in_date": l.move_in_date.isoformat() if l.move_in_date else None,
                "status": l.status,
                "match_score": round(match_score, 1),
            }
        )

    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return matches[:limit]


class VacancyRevenueAgent:
    """Specialized Vacancy and Revenue Recovery Agent implementation."""

    name = AGENT_NAME

    def __init__(self, db: Session):
        self.db = db

    def handle_message(self, message: AgentMessage) -> AgentMessage:
        """Process incoming task messages."""
        task_type = message.task_type
        payload = message.input_data

        try:
            if task_type in ("identify_vacancy_and_leads", "handle_move_out_vacancy"):
                result = self.handle_upcoming_vacancy(payload)
            elif task_type == "occupancy_metrics":
                result = self.get_occupancy_metrics()
            else:
                return message.mark(
                    MessageStatus.FAILED,
                    error=f"Unsupported task_type '{task_type}' for VacancyRevenueAgent",
                )

            return message.mark(MessageStatus.COMPLETED, result=result)

        except Exception as e:
            logger.exception("Error executing vacancy task %s", task_type)
            return message.mark(MessageStatus.FAILED, error=str(e))

    def handle_upcoming_vacancy(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Analyze upcoming vacancy from move-out notice and immediately match existing pipeline leads."""
        property_id = payload.get("property_id")
        property_name = payload.get("property_name", "PG Property")
        room_id = payload.get("room_id")
        room_number = payload.get("room_number", "N/A")
        room_type = payload.get("room_type", "Single")
        monthly_rent = float(payload.get("monthly_rent", 12000.0))
        expected_move_out_str = payload.get("expected_move_out_date")

        target_date = None
        if expected_move_out_str:
            try:
                target_date = date.fromisoformat(str(expected_move_out_str))
            except ValueError:
                pass

        # 1. Project financial impact of downtime
        daily_rent = round(monthly_rent / 30.0, 2)
        projected_15d_loss = round(daily_rent * 15, 2)
        projected_30d_loss = round(monthly_rent, 2)

        # 2. Search existing leads
        location = payload.get("city") or "Bengaluru"
        matched_leads = find_matching_leads_for_room(
            db=self.db,
            location=location,
            room_type=room_type,
            monthly_rent=monthly_rent,
            target_move_in_date=target_date,
            limit=3,
        )

        recovery_strategy = (
            f"Upcoming vacancy detected for Room {room_number} ({room_type}, ₹{monthly_rent:,.0f}/mo) "
            f"effective {expected_move_out_str or '15 days'}. Daily revenue risk is ₹{daily_rent:,.0f}. "
            f"Found {len(matched_leads)} high-intent lead(s) in active pipeline. "
            f"Immediate outreach recommended to eliminate turnover gap and recover up to ₹{projected_30d_loss:,.0f}/mo."
        )

        return {
            "property_name": property_name,
            "room_number": room_number,
            "room_type": room_type,
            "monthly_rent": monthly_rent,
            "daily_revenue_risk": daily_rent,
            "projected_15d_loss": projected_15d_loss,
            "projected_30d_loss": projected_30d_loss,
            "expected_vacancy_date": expected_move_out_str,
            "matched_lead_count": len(matched_leads),
            "matched_leads": matched_leads,
            "recovery_strategy": recovery_strategy,
            "hand_off_to_leasing": len(matched_leads) > 0,
        }

    def get_occupancy_metrics(self) -> dict[str, Any]:
        """Return portfolio-wide occupancy rates and potential vs actual revenues."""
        return calculate_portfolio_occupancy(self.db)
