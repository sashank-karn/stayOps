"""Rent and Collections Agent — Adarsh Jha (AdarshCodes1221).

Specialized agent responsible for:
- Tracking rent ledger, payment statuses, and overdue balances from authoritative data.
- Calculating financial summaries (expected, collected, overdue, collection rate).
- Providing tenant settlement balances and deposit deductions for move-out workflows.
- Tiered payment reminder and escalation recommendations based on days overdue.
- Strict data integrity: never hallucinating transactions or unauthorized charges.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any, List, Optional
from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session

from backend.app.models.tenant import Tenant, Lease
from backend.app.models.financial import RentRecord, PaymentTransaction
from shared.schemas.agent_message import AgentMessage, MessageStatus, TaskPriority

logger = logging.getLogger(__name__)

AGENT_NAME = "collections"


def calculate_tenant_balance(db: Session, tenant_id: str) -> dict[str, Any]:
    """Calculate verified financial standing, overdue dues, and deposit settlement for a tenant."""
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise ValueError(f"Tenant with ID '{tenant_id}' not found.")

    # Get active lease for security deposit
    lease_stmt = select(Lease).where(and_(Lease.tenant_id == tenant_id, Lease.status == "active"))
    lease = db.execute(lease_stmt).scalar_one_or_none()
    security_deposit = lease.security_deposit if lease else 0.0
    monthly_rent = lease.monthly_rent if lease else 0.0

    # Query all rent records for tenant
    stmt = (
        select(RentRecord)
        .where(and_(RentRecord.tenant_id == tenant_id, RentRecord.is_deleted == False))
        .order_by(RentRecord.billing_month.desc())
    )
    records = db.execute(stmt).scalars().all()

    total_due = sum(r.amount_due for r in records)
    total_paid = sum(r.amount_paid for r in records)
    outstanding = round(total_due - total_paid, 2)

    overdue_items = []
    max_days_late = 0

    for r in records:
        balance_for_record = r.amount_due - r.amount_paid
        if balance_for_record > 0:
            days_late = r.days_overdue
            if days_late > max_days_late:
                max_days_late = days_late
            overdue_items.append(
                {
                    "billing_month": r.billing_month,
                    "due_date": r.due_date.isoformat(),
                    "amount_due": r.amount_due,
                    "amount_paid": r.amount_paid,
                    "unpaid_amount": round(balance_for_record, 2),
                    "days_overdue": days_late,
                    "status": r.status,
                }
            )

    # Escalation level logic
    if outstanding <= 0:
        escalation_level = "clear"
        recommendation = "All accounts clear. Full security deposit eligible for refund upon room inspection."
    elif max_days_late <= 3:
        escalation_level = "reminder"
        recommendation = f"Gentle payment reminder recommended for unpaid ₹{outstanding:,.0f}."
    else:
        escalation_level = "escalated_notice"
        recommendation = f"Formal overdue notice required. ₹{outstanding:,.0f} overdue by {max_days_late} days. Deduct from deposit if uncollected."

    net_refund_or_due = round(security_deposit - outstanding, 2)

    return {
        "tenant_id": tenant.id,
        "tenant_name": tenant.full_name,
        "monthly_rent": monthly_rent,
        "security_deposit": security_deposit,
        "total_rent_due": total_due,
        "total_rent_paid": total_paid,
        "outstanding_balance": outstanding,
        "has_overdue": outstanding > 0,
        "max_days_overdue": max_days_late,
        "overdue_count": len(overdue_items),
        "overdue_records": overdue_items,
        "escalation_level": escalation_level,
        "recommendation": recommendation,
        "net_deposit_settlement": net_refund_or_due,
    }


def get_portfolio_financial_metrics(db: Session) -> dict[str, Any]:
    """Calculate aggregated portfolio collections and overdue metrics."""
    records = db.execute(select(RentRecord).where(RentRecord.is_deleted == False)).scalars().all()

    total_due = sum(r.amount_due for r in records)
    total_paid = sum(r.amount_paid for r in records)
    total_overdue = sum((r.amount_due - r.amount_paid) for r in records if (r.amount_due - r.amount_paid) > 0)
    collection_rate = (total_paid / total_due * 100.0) if total_due > 0 else 100.0

    return {
        "total_billed": round(total_due, 2),
        "total_collected": round(total_paid, 2),
        "total_outstanding": round(total_overdue, 2),
        "collection_rate_percent": round(collection_rate, 1),
        "record_count": len(records),
    }


def calculate_late_fees(
    db: Session,
    tenant_id: str,
    per_day_penalty: float = 100.0,
    grace_days: int = 5,
) -> dict[str, Any]:
    """Calculate accrued late payment fees based on days overdue exceeding grace period."""
    balance_info = calculate_tenant_balance(db, tenant_id)
    overdue_records = balance_info.get("overdue_records", [])

    itemized_penalties = []
    total_late_fees = 0.0

    for item in overdue_records:
        days_late = item.get("days_overdue", 0)
        unpaid = item.get("unpaid_amount", 0.0)
        if days_late > grace_days and unpaid > 0:
            chargeable_days = days_late - grace_days
            penalty = round(chargeable_days * per_day_penalty, 2)
            total_late_fees += penalty
            itemized_penalties.append(
                {
                    "billing_month": item.get("billing_month"),
                    "unpaid_amount": unpaid,
                    "days_overdue": days_late,
                    "grace_days": grace_days,
                    "chargeable_days": chargeable_days,
                    "late_fee": penalty,
                }
            )

    total_outstanding_with_fees = round(balance_info["outstanding_balance"] + total_late_fees, 2)

    return {
        "tenant_id": tenant_id,
        "tenant_name": balance_info["tenant_name"],
        "base_outstanding": balance_info["outstanding_balance"],
        "total_late_fees": total_late_fees,
        "total_payable": total_outstanding_with_fees,
        "grace_days_allowed": grace_days,
        "per_day_rate": per_day_penalty,
        "penalties": itemized_penalties,
        "is_waivable": total_late_fees > 0 and balance_info["max_days_overdue"] <= 7,
    }


def forecast_monthly_collections(db: Session, target_month: Optional[str] = None) -> dict[str, Any]:
    """Forecast total projected collections for active portfolio leases."""
    portfolio_metrics = get_portfolio_financial_metrics(db)
    active_leases = db.execute(select(Lease).where(Lease.status == "active")).scalars().all()

    contracted_monthly_revenue = sum(l.monthly_rent for l in active_leases)
    historical_rate = (
        portfolio_metrics["collection_rate_percent"] / 100.0
        if portfolio_metrics["collection_rate_percent"] > 0
        else 0.95
    )
    projected_realization = round(contracted_monthly_revenue * historical_rate, 2)

    return {
        "active_lease_count": len(active_leases),
        "contracted_monthly_revenue": round(contracted_monthly_revenue, 2),
        "historical_collection_rate_percent": portfolio_metrics["collection_rate_percent"],
        "projected_realized_revenue": projected_realization,
        "projected_uncollected_gap": round(contracted_monthly_revenue - projected_realization, 2),
        "current_total_collected": portfolio_metrics["total_collected"],
        "current_total_outstanding": portfolio_metrics["total_outstanding"],
    }


class CollectionsAgent:
    """Specialized Rent and Collections Agent implementation."""

    name = AGENT_NAME

    def __init__(self, db: Session):
        self.db = db

    def handle_message(self, message: AgentMessage) -> AgentMessage:
        """Process incoming task messages."""
        task_type = message.task_type
        payload = message.input_data

        try:
            if task_type in ("audit_tenant_balance", "check_rent_status"):
                result = self.audit_tenant_balance(payload)
            elif task_type == "portfolio_financials":
                result = self.get_portfolio_financials()
            elif task_type == "generate_reminder":
                result = self.generate_payment_reminder(payload)
            elif task_type in ("assess_late_fees", "calculate_late_fees"):
                result = self.assess_late_fees(payload)
            elif task_type in ("forecast_collections", "collection_forecast"):
                result = self.forecast_collections(payload)
            else:
                return message.mark(
                    MessageStatus.FAILED,
                    error=f"Unsupported task_type '{task_type}' for CollectionsAgent",
                )

            return message.mark(MessageStatus.COMPLETED, result=result)

        except Exception as e:
            logger.exception("Error executing collections task %s", task_type)
            return message.mark(MessageStatus.FAILED, error=str(e))

    def audit_tenant_balance(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Perform verified tenant ledger audit for move-out workflow."""
        tenant_id = payload.get("tenant_id")
        if not tenant_id:
            raise ValueError("tenant_id is required to audit rent balance.")
        return calculate_tenant_balance(self.db, tenant_id)

    def get_portfolio_financials(self) -> dict[str, Any]:
        """Aggregate total expected, collected, and pending rents."""
        return get_portfolio_financial_metrics(self.db)

    def generate_payment_reminder(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Create draft reminder or formal escalation based on stored records."""
        tenant_id = payload.get("tenant_id")
        audit = calculate_tenant_balance(self.db, tenant_id)

        if not audit["has_overdue"]:
            return {
                "tenant_name": audit["tenant_name"],
                "reminder_needed": False,
                "message": f"Tenant {audit['tenant_name']} has no outstanding dues.",
            }

        days = audit["max_days_overdue"]
        amount = audit["outstanding_balance"]

        if days <= 3:
            draft = (
                f"Hi {audit['tenant_name']}, gentle reminder that your monthly rent of "
                f"₹{amount:,.0f} is due. Please complete payment via UPI at your earliest convenience."
            )
        else:
            draft = (
                f"URGENT NOTICE: Dear {audit['tenant_name']}, your PG rent balance of "
                f"₹{amount:,.0f} is now {days} days overdue. Please clear this balance immediately "
                f"to avoid late penalties or deposit deduction."
            )

        return {
            "tenant_name": audit["tenant_name"],
            "reminder_needed": True,
            "escalation_level": audit["escalation_level"],
            "overdue_amount": amount,
            "days_overdue": days,
            "draft_text": draft,
        }

    def assess_late_fees(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Assess late payment fees according to grace days and per-day penalty policies."""
        tenant_id = payload.get("tenant_id")
        per_day = float(payload.get("per_day_penalty", 100.0))
        grace_days = int(payload.get("grace_days", 5))
        if not tenant_id:
            raise ValueError("tenant_id is required to assess late fees.")
        return calculate_late_fees(self.db, tenant_id=tenant_id, per_day_penalty=per_day, grace_days=grace_days)

    def forecast_collections(self, payload: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        """Project monthly collections and identify revenue gap."""
        target_month = payload.get("target_month") if payload else None
        return forecast_monthly_collections(self.db, target_month=target_month)
