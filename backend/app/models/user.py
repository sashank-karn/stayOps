"""User and Authentication SQLAlchemy Models."""
from __future__ import annotations

from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from backend.app.models.base import Base, UUIDMixin, TimestampMixin


class User(Base, UUIDMixin, TimestampMixin):
    """System user account for authentication and role-based access."""

    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="property_manager")  # admin, property_manager, tenant
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role} is_verified={self.is_verified}>"


class EmailVerificationCode(Base, UUIDMixin, TimestampMixin):
    """Temporary one-time password (OTP) codes for email authorization & verification."""

    __tablename__ = "email_verification_codes"

    email = Column(String(255), nullable=False, index=True)
    code = Column(String(10), nullable=False)
    purpose = Column(String(50), default="registration", nullable=False)  # registration, password_reset, etc.
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)

    def __repr__(self) -> str:
        return f"<EmailVerificationCode email={self.email} purpose={self.purpose} is_used={self.is_used}>"
