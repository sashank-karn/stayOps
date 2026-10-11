"""Property, Room, and Bed domain models."""
from typing import List, Optional
from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.session import Base
from backend.app.models.base import UUIDMixin, TimestampMixin, SoftDeleteMixin


class Property(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """PG / Co-Living property."""
    __tablename__ = "properties"

    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pincode: Mapped[str] = mapped_column(String(20), nullable=False)
    total_floors: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    rules_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    amenities: Mapped[Optional[list]] = mapped_column(JSON, default=list, nullable=True)
    manager_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    manager_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    manager_email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    rooms: Mapped[List["Room"]] = relationship(
        "Room", back_populates="property", cascade="all, delete-orphan"
    )
    tickets: Mapped[List["MaintenanceTicket"]] = relationship(
        "MaintenanceTicket", back_populates="property", cascade="all, delete-orphan"
    )


class Room(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Individual room within a property."""
    __tablename__ = "rooms"

    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True
    )
    room_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    floor_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    room_type: Mapped[str] = mapped_column(
        String(50), default="Double", nullable=False
    )  # Single, Double, Triple, Quad
    base_rent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    property: Mapped["Property"] = relationship("Property", back_populates="rooms")
    beds: Mapped[List["Bed"]] = relationship(
        "Bed", back_populates="room", cascade="all, delete-orphan"
    )


class Bed(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Individual bed/spot inside a room."""
    __tablename__ = "beds"

    room_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    bed_label: Mapped[str] = mapped_column(String(20), nullable=False)  # Bed A, Bed B
    status: Mapped[str] = mapped_column(
        String(30), default="available", nullable=False, index=True
    )  # available, occupied, reserved, maintenance
    monthly_rent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Relationships
    room: Mapped["Room"] = relationship("Room", back_populates="beds")
    leases: Mapped[List["Lease"]] = relationship("Lease", back_populates="bed")
