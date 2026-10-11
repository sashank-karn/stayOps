"""Lead and PropertyVisit domain models for prospective tenants."""
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import String, Float, ForeignKey, DateTime, Date, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.session import Base
from backend.app.models.base import UUIDMixin, TimestampMixin, SoftDeleteMixin


class Lead(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Prospective tenant / lead enquiry."""
    __tablename__ = "leads"

    full_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    budget: Mapped[float] = mapped_column(Float, default=10000.0, nullable=False)
    preferred_location: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    preferred_room_type: Mapped[str] = mapped_column(
        String(50), default="Double", nullable=False
    )  # Single, Double, Triple
    move_in_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), default="new", nullable=False, index=True
    )  # new, contacted, matched, visit_scheduled, converted, lost
    source: Mapped[str] = mapped_column(String(50), default="website", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    visits: Mapped[List["PropertyVisit"]] = relationship(
        "PropertyVisit", back_populates="lead", cascade="all, delete-orphan"
    )


class PropertyVisit(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Scheduled or completed property visit for a lead."""
    __tablename__ = "property_visits"

    lead_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True
    )
    room_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True
    )
    scheduled_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default="scheduled", nullable=False, index=True
    )  # scheduled, completed, cancelled, no_show
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    lead: Mapped["Lead"] = relationship("Lead", back_populates="visits")
    property: Mapped["Property"] = relationship("Property")
