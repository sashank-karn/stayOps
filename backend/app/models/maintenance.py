"""Maintenance and Vendor domain models."""
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.session import Base
from backend.app.models.base import UUIDMixin, TimestampMixin, SoftDeleteMixin


class Vendor(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Registered vendor / contractor for property maintenance."""
    __tablename__ = "vendors"

    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # Plumbing, Electrical, Cleaning, Appliance, Carpentry, Painting
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    rating: Mapped[float] = mapped_column(Float, default=4.5, nullable=False)
    hourly_rate: Mapped[float] = mapped_column(Float, default=500.0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    tickets: Mapped[List["MaintenanceTicket"]] = relationship(
        "MaintenanceTicket", back_populates="vendor"
    )


class MaintenanceTicket(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Maintenance and repair ticket raised by resident or staff."""
    __tablename__ = "maintenance_tickets"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True
    )
    room_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True, index=True
    )
    tenant_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True, index=True
    )
    vendor_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True, index=True
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(
        String(50), default="Plumbing", nullable=False, index=True
    )  # Plumbing, Electrical, Cleaning, Appliance, Carpentry, Other
    severity: Mapped[str] = mapped_column(
        String(30), default="Medium", nullable=False, index=True
    )  # Emergency, High, Medium, Low
    status: Mapped[str] = mapped_column(
        String(30), default="open", nullable=False, index=True
    )  # open, assigned, in_progress, resolved, closed
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    actual_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    property: Mapped["Property"] = relationship("Property", back_populates="tickets")
    tenant: Mapped[Optional["Tenant"]] = relationship("Tenant", back_populates="tickets")
    vendor: Mapped[Optional["Vendor"]] = relationship("Vendor", back_populates="tickets")
