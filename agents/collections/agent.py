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
