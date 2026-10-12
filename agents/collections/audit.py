"""
StayOps AI — Collections Audit & Overdue Aging Module
Authored by: Adarsh Jha (@AdarshCodes1221, PRN: 23070122261)
Role: Rent and Collections Agent Specialist
"""
from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional
from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from backend.app.models.financial import RentRecord, PaymentTransaction
from backend.app.models.tenant import Tenant, Lease
from backend.app.models.property import Property, Room, Bed
from agents.collections.agent import calculate_late_fees


def generate_collection_audit(
    db: Session,
    billing_month: Optional[str] = None,
) -> Dict[str, Any]:
    """Audit monthly billing, collected sums, overdue balances, and efficiency."""
    stmt = select(RentRecord)
    if billing_month:
        stmt = stmt.where(RentRecord.billing_month == billing_month)
    records = db.execute(stmt).scalars().all()

    total_billed = sum(r.amount_due for r in records)
    total_collected = sum(r.amount_paid for r in records)
    total_outstanding = sum(max(0.0, r.amount_due - r.amount_paid) for r in records)

    efficiency = (total_collected / total_billed * 100.0) if total_billed > 0 else 100.0

    overdue_items: List[Dict[str, Any]] = []
    for r in records:
        pending = max(0.0, r.amount_due - r.amount_paid)
        if pending > 0 or r.status == "overdue":
            tenant_name = r.tenant.full_name if r.tenant else "Unknown"
            tenant_phone = r.tenant.phone if r.tenant else "N/A"
            late_fee_info = calculate_late_fees(
                db=db,
                tenant_id=r.tenant_id,
                per_day_penalty=50.0,
                grace_days=3,
            )
            assessed_fee = late_fee_info.get("total_late_fees", 0.0)
            overdue_items.append({
                "record_id": r.id,
                "tenant_id": r.tenant_id,
                "tenant_name": tenant_name,
                "tenant_phone": tenant_phone,
                "billing_month": r.billing_month,
                "due_date": r.due_date.isoformat(),
                "amount_due": r.amount_due,
                "amount_paid": r.amount_paid,
                "pending_balance": round(pending, 2),
                "days_overdue": r.days_overdue,
                "late_fee_assessed": assessed_fee,
                "total_payable": round(pending + assessed_fee, 2),
            })

    return {
        "billing_month": billing_month or "all",
        "total_records": len(records),
        "total_billed": round(total_billed, 2),
        "total_collected": round(total_collected, 2),
        "total_outstanding": round(total_outstanding, 2),
        "collection_efficiency_pct": round(efficiency, 2),
        "overdue_count": len(overdue_items),
        "overdue_records": overdue_items,
    }


def calculate_overdue_aging(db: Session) -> Dict[str, Any]:
    """Categorize overdue dues into 0-7d, 8-15d, 16-30d, and 30d+ aging buckets."""
    records = db.execute(select(RentRecord)).scalars().all()
    today = date.today()

    buckets: Dict[str, Dict[str, Any]] = {
        "current_0_to_7_days": {"count": 0, "amount": 0.0},
        "moderate_8_to_15_days": {"count": 0, "amount": 0.0},
        "critical_16_to_30_days": {"count": 0, "amount": 0.0},
        "severe_over_30_days": {"count": 0, "amount": 0.0},
    }

    for r in records:
        pending = max(0.0, r.amount_due - r.amount_paid)
        if pending <= 0:
            continue

        days_past = max(0, (today - r.due_date).days)
        if days_past <= 7:
            buckets["current_0_to_7_days"]["count"] += 1
            buckets["current_0_to_7_days"]["amount"] += pending
        elif days_past <= 15:
            buckets["moderate_8_to_15_days"]["count"] += 1
            buckets["moderate_8_to_15_days"]["amount"] += pending
        elif days_past <= 30:
            buckets["critical_16_to_30_days"]["count"] += 1
            buckets["critical_16_to_30_days"]["amount"] += pending
        else:
            buckets["severe_over_30_days"]["count"] += 1
            buckets["severe_over_30_days"]["amount"] += pending

    for b in buckets.values():
        b["amount"] = round(b["amount"], 2)

    return {
        "as_of_date": today.isoformat(),
        "aging_buckets": buckets,
    }
