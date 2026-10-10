"""Tenant and Lease domain models."""
from datetime import date
from typing import List, Optional
from sqlalchemy import String, Float, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.session import Base
from backend.app.models.base import UUIDMixin, TimestampMixin, SoftDeleteMixin


class Tenant(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Resident / tenant in a PG or co-living property."""
    __tablename__ = "tenants"

    full_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    emergency_contact: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    id_proof_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # Aadhaar, Passport
    id_proof_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), default="active", nullable=False, index=True
    )  # active, notice, moved_out

    # Relationships
    leases: Mapped[List["Lease"]] = relationship("Lease", back_populates="tenant")
    tickets: Mapped[List["MaintenanceTicket"]] = relationship(
        "MaintenanceTicket", back_populates="tenant"
    )
    payments: Mapped[List["PaymentTransaction"]] = relationship(
        "PaymentTransaction", back_populates="tenant"
    )


class Lease(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Rental agreement binding a tenant to a specific bed."""
    __tablename__ = "leases"

    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    bed_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("beds.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    monthly_rent: Mapped[float] = mapped_column(Float, nullable=False)
    security_deposit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default="active", nullable=False, index=True
    )  # draft, active, expired, terminated

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="leases")
    bed: Mapped["Bed"] = relationship("Bed", back_populates="leases")
    payments: Mapped[List["PaymentTransaction"]] = relationship(
        "PaymentTransaction", back_populates="lease"
    )
