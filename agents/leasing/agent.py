"""Lead and Leasing Agent — Sonali Gupta (Sona1147).

Specialized agent responsible for:
- Prospective tenant enquiry handling and intent extraction.
- Searching available PG inventory from authoritative operational data.
- Constraint-based matching and transparent scoring.
- Lead profile management and follow-up tracking.
- Scheduling and confirming property visits.
- Receiving upcoming vacancy handoffs from Vacancy & Revenue Recovery Agent.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any, List, Optional
from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from backend.app.models.property import Property, Room, Bed
from backend.app.models.lead import Lead, PropertyVisit
from shared.schemas.agent_message import AgentMessage, MessageStatus, TaskPriority

logger = logging.getLogger(__name__)

AGENT_NAME = "leasing"


def match_rooms_for_lead(
    db: Session,
    budget: float,
    location: str,
    preferred_room_type: Optional[str] = None,
    limit: int = 5,
) -> List[dict[str, Any]]:
    """Match available beds/rooms in active properties based on budget and location.
    
    Uses deterministic scoring:
    - Base score: 100 max
    - Location fit: 40 pts
    - Budget fit: 40 pts (full if <= budget, scaled if within 15% stretch)
    - Room type preference: 20 pts
    """
    # Find all available beds
    stmt = (
        select(Bed, Room, Property)
        .join(Room, Bed.room_id == Room.id)
        .join(Property, Room.property_id == Property.id)
        .where(
            and_(
                Bed.status == "available",
                Property.is_active == True,
                Property.is_deleted == False,
                Room.is_deleted == False,
                Bed.is_deleted == False,
            )
        )
    )
    records = db.execute(stmt).all()

    candidates = []
    loc_lower = location.strip().lower()

    for bed, room, prop in records:
        score = 0.0

        # Location scoring (40 pts)
        prop_city = prop.city.lower()
        prop_addr = prop.address.lower()
        if loc_lower in prop_city or loc_lower in prop_addr:
            score += 40.0
        elif any(part in prop_addr for part in loc_lower.split()):
            score += 25.0
        else:
            score += 10.0  # fallback across cities

        # Budget scoring (40 pts)
        rent = bed.monthly_rent
        if rent <= budget:
            # Full score, bonus for savings
            savings_ratio = (budget - rent) / budget if budget > 0 else 0
            score += 35.0 + min(5.0, savings_ratio * 10.0)
        elif rent <= budget * 1.15:
            # Within 15% budget stretch
            score += 20.0
        else:
            # Over budget
            score += 5.0

        # Room type preference (20 pts)
        if preferred_room_type:
            if room.room_type.lower() == preferred_room_type.lower():
                score += 20.0
            else:
                score += 5.0
        else:
            score += 15.0

        candidates.append(
            {
                "property_id": prop.id,
                "property_name": prop.name,
                "property_code": prop.code,
                "city": prop.city,
                "address": prop.address,
                "room_id": room.id,
                "room_number": room.room_number,
                "room_type": room.room_type,
                "bed_id": bed.id,
                "bed_label": bed.bed_label,
                "monthly_rent": rent,
                "amenities": prop.amenities or [],
                "rules_summary": prop.rules_summary,
                "match_score": round(score, 1),
            }
        )

    # Sort descending by match score
    candidates.sort(key=lambda x: x["match_score"], reverse=True)
    return candidates[:limit]


def create_or_update_lead(
    db: Session,
    full_name: str,
    phone: str,
    email: Optional[str] = None,
    budget: float = 10000.0,
    preferred_location: str = "Bengaluru",
    preferred_room_type: str = "Double",
    move_in_date: Optional[date] = None,
    source: str = "enquiry",
    notes: Optional[str] = None,
) -> Lead:
    """Create a new lead or update an existing one matching the phone number."""
    existing = db.execute(select(Lead).where(Lead.phone == phone.strip())).scalar_one_or_none()

    if existing:
        existing.full_name = full_name
        if email:
            existing.email = email
        existing.budget = budget
        existing.preferred_location = preferred_location
        existing.preferred_room_type = preferred_room_type
        if move_in_date:
            existing.move_in_date = move_in_date
        if notes:
            existing.notes = f"{existing.notes or ''}\n{notes}".strip()
        db.commit()
        db.refresh(existing)
        return existing

    new_lead = Lead(
        full_name=full_name,
        phone=phone.strip(),
        email=email,
        budget=budget,
        preferred_location=preferred_location,
        preferred_room_type=preferred_room_type,
        move_in_date=move_in_date,
        source=source,
        notes=notes,
        status="new",
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    return new_lead


def schedule_property_visit(
    db: Session,
    lead_id: str,
    property_id: str,
    scheduled_time: datetime,
    room_id: Optional[str] = None,
    feedback: Optional[str] = None,
) -> PropertyVisit:
    """Schedule a visit for a lead and update lead status."""
    visit = PropertyVisit(
        lead_id=lead_id,
        property_id=property_id,
        room_id=room_id,
        scheduled_time=scheduled_time,
        status="scheduled",
        feedback=feedback,
    )
    db.add(visit)

    lead = db.get(Lead, lead_id)
    if lead:
        lead.status = "visit_scheduled"

    db.commit()
    db.refresh(visit)
    return visit


class LeasingAgent:
    """Specialized Lead and Leasing Agent implementation."""

    name = AGENT_NAME

    def __init__(self, db: Session):
        self.db = db

    def handle_message(self, message: AgentMessage) -> AgentMessage:
        """Route and execute incoming task messages."""
        task_type = message.task_type
        payload = message.input_data

        try:
            if task_type in ("process_enquiry", "search_rooms"):
                result = self.process_enquiry(payload)
            elif task_type == "schedule_visit":
                result = self.handle_schedule_visit(payload)
            elif task_type == "match_vacancy_leads":
                result = self.match_leads_for_vacancy(payload)
            else:
                return message.mark(
                    MessageStatus.FAILED,
                    error=f"Unsupported task_type '{task_type}' for LeasingAgent",
                )

            return message.mark(MessageStatus.COMPLETED, result=result)

        except Exception as e:
            logger.exception("Error executing leasing agent task %s", task_type)
            return message.mark(MessageStatus.FAILED, error=str(e))

    def process_enquiry(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Handle prospective tenant enquiry, match inventory, and persist lead."""
        full_name = payload.get("full_name", "Anonymous Lead")
        phone = payload.get("phone", "+919000000000")
        email = payload.get("email")
        budget = float(payload.get("budget", 12000.0))
        location = payload.get("preferred_location") or payload.get("location") or "Bengaluru"
        room_type = payload.get("preferred_room_type") or payload.get("room_type")
        notes = payload.get("notes") or payload.get("message")

        move_in_str = payload.get("move_in_date")
        move_in_date = None
        if move_in_str:
            try:
                move_in_date = date.fromisoformat(str(move_in_str))
            except ValueError:
                pass

        # 1. Persist or update lead
        lead = create_or_update_lead(
            db=self.db,
            full_name=full_name,
            phone=phone,
            email=email,
            budget=budget,
            preferred_location=location,
            preferred_room_type=room_type or "Double",
            move_in_date=move_in_date,
            notes=notes,
        )

        # 2. Search available matching inventory
        matches = match_rooms_for_lead(
            db=self.db,
            budget=budget,
            location=location,
            preferred_room_type=room_type,
            limit=3,
        )

        # 3. Draft tailored recommendations
        if matches:
            top = matches[0]
            summary = (
                f"Found {len(matches)} matching option(s) for {full_name} in {location}. "
                f"Top pick: {top['property_name']}, Room {top['room_number']} ({top['room_type']}) "
                f"at ₹{top['monthly_rent']:,.0f}/mo (Match Score: {top['match_score']}%)."
            )
            suggest_visit = True
        else:
            summary = (
                f"No currently vacant rooms directly matching ₹{budget:,.0f} in {location}. "
                f"Lead profile registered for upcoming vacancy alerts."
            )
            suggest_visit = False

        return {
            "lead_id": lead.id,
            "lead_name": lead.full_name,
            "matched_rooms": matches,
            "match_count": len(matches),
            "suggest_visit": suggest_visit,
            "agent_message": summary,
        }

    def handle_schedule_visit(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Schedule a physical property visit for an interested lead."""
        lead_id = payload.get("lead_id")
        property_id = payload.get("property_id")
        time_str = payload.get("scheduled_time")
        room_id = payload.get("room_id")

        if not lead_id or not property_id:
            raise ValueError("Both lead_id and property_id are required to schedule a visit.")

        if time_str:
            scheduled_time = datetime.fromisoformat(str(time_str))
        else:
            # Default to tomorrow at 4 PM
            tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
            scheduled_time = tomorrow.replace(hour=16, minute=0, second=0, microsecond=0)

        visit = schedule_property_visit(
            db=self.db,
            lead_id=lead_id,
            property_id=property_id,
            room_id=room_id,
            scheduled_time=scheduled_time,
            feedback=payload.get("feedback"),
        )

        return {
            "visit_id": visit.id,
            "lead_id": lead_id,
            "property_id": property_id,
            "scheduled_time": visit.scheduled_time.isoformat(),
            "status": visit.status,
            "confirmation_message": f"Property visit scheduled for {scheduled_time.strftime('%b %d, %Y at %I:%M %p')}.",
        }

    def match_leads_for_vacancy(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Coordinate with Vacancy Agent by preparing visit invitations for matched leads."""
        room_number = payload.get("room_number")
        property_name = payload.get("property_name")
        matched_leads = payload.get("matched_leads", [])

        proposals = []
        for lead_info in matched_leads:
            lead_id = lead_info.get("lead_id")
            name = lead_info.get("name")
            phone = lead_info.get("phone")
            proposals.append(
                {
                    "lead_id": lead_id,
                    "lead_name": name,
                    "contact_phone": phone,
                    "action": "outreach_and_visit_proposal",
                    "draft_message": (
                        f"Hi {name}, a {lead_info.get('preferred_room_type', 'Single')} room at "
                        f"{property_name} (Room {room_number}) matching your budget is becoming available. "
                        f"Would you like to schedule a visit?"
                    ),
                    "proposed_visit_window": (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d"),
                }
            )

        return {
            "property_name": property_name,
            "room_number": room_number,
            "prepared_proposals": proposals,
            "proposal_count": len(proposals),
            "status": "ready_for_outreach",
        }
