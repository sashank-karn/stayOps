"""StayOps SQLAlchemy Domain Models."""
from backend.app.models.base import Base, TimestampMixin, SoftDeleteMixin, UUIDMixin, utc_now
from backend.app.models.property import Property, Room, Bed
from backend.app.models.tenant import Tenant, Lease
from backend.app.models.lead import Lead, PropertyVisit
from backend.app.models.maintenance import Vendor, MaintenanceTicket
from backend.app.models.financial import RentRecord, PaymentTransaction
from backend.app.models.workflow import WorkflowExecution, AgentTaskRecord, ApprovalRequest

__all__ = [
    "Base",
    "TimestampMixin",
    "SoftDeleteMixin",
    "UUIDMixin",
    "utc_now",
    "Property",
    "Room",
    "Bed",
    "Tenant",
    "Lease",
    "Lead",
    "PropertyVisit",
    "Vendor",
    "MaintenanceTicket",
    "RentRecord",
    "PaymentTransaction",
    "WorkflowExecution",
    "AgentTaskRecord",
    "ApprovalRequest",
]
