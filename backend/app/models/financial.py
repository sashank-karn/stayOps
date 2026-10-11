"""Financial domain models: RentRecord and PaymentTransaction."""
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import String, Float, ForeignKey, DateTime, Date, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.session import Base
from backend.app.models.base import UUIDMixin, TimestampMixin, SoftDeleteMixin, utc_now


class RentRecord(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Monthly rent ledger record for a lease."""
    __tablename__ = "rent_records"

    lease_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("leases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    billing_month: Mapped[str] = mapped_column(String(7), nullable=False, index=True)  # YYYY-MM
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount_due: Mapped[float] = mapped_column(Float, nullable=False)
    amount_paid: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False, index=True
    )  # pending, paid, partially_paid, overdue
    days_overdue: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    lease: Mapped["Lease"] = relationship("Lease")
    tenant: Mapped["Tenant"] = relationship("Tenant")
    payments: Mapped[List["PaymentTransaction"]] = relationship(
        "PaymentTransaction", back_populates="rent_record"
    )


class PaymentTransaction(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Payment records for rents, security deposits, and maintenance."""
    __tablename__ = "payment_transactions"

    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lease_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("leases.id", ondelete="SET NULL"), nullable=True, index=True
    )
    rent_record_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("rent_records.id", ondelete="SET NULL"), nullable=True, index=True
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_type: Mapped[str] = mapped_column(
        String(50), default="Rent", nullable=False, index=True
    )  # Rent, SecurityDeposit, Maintenance, Utility
    status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False, index=True
    )  # pending, paid, failed, refunded
    payment_method: Mapped[Optional[str]] = mapped_column(
        String(50), default="UPI", nullable=True
    )  # UPI, NetBanking, Card, Cash
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    transaction_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="payments")
    lease: Mapped[Optional["Lease"]] = relationship("Lease", back_populates="payments")
    rent_record: Mapped[Optional["RentRecord"]] = relationship(
        "RentRecord", back_populates="payments"
    )
