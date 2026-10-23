"""Pydantic v2 schemas for request validation, serialization, and agent contracts."""
from datetime import date, datetime
import re
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
PHONE_REGEX = re.compile(r"^\+?[0-9\s\-()]{7,25}$")


def validate_email_str(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    val = value.strip()
    if not val:
        return None
    if not EMAIL_REGEX.match(val):
        raise ValueError(f"Invalid email address format: '{val}'")
    return val.lower()


def validate_phone_str(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    val = value.strip()
    if not val:
        return None
    digits = re.sub(r"\D", "", val)
    if len(digits) < 7 or len(digits) > 16:
        raise ValueError(f"Invalid phone number '{val}'. Must contain between 7 and 16 digits.")
    if not PHONE_REGEX.match(val):
        raise ValueError(f"Invalid phone number format: '{val}'")
    return val


# ---------------------------------------------------------
# Property, Room, Bed
# ---------------------------------------------------------

class PropertyBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    code: str = Field(..., min_length=2, max_length=30)
    address: str
    city: str
    state: str
    pincode: str
    total_floors: int = Field(default=1, ge=1)
    rules_summary: Optional[str] = None
    amenities: List[str] = Field(default_factory=list)
    manager_name: Optional[str] = None
    manager_phone: Optional[str] = None
    manager_email: Optional[str] = None
    is_active: bool = True


class PropertyCreate(PropertyBase):
    pass


class PropertyRead(PropertyBase):
    id: str
    created_at: datetime
    updated_at: datetime
    is_deleted: bool

    model_config = ConfigDict(from_attributes=True)


class RoomBase(BaseModel):
    property_id: str
    room_number: str
    floor_number: int = Field(default=1, ge=0)
    room_type: str = "Double"
    base_rent: float = Field(default=0.0, ge=0.0)
    is_available: bool = True


class RoomCreate(RoomBase):
    pass


class RoomRead(RoomBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BedBase(BaseModel):
    room_id: Optional[str] = None
    bed_label: str
    status: str = "available"  # available, occupied, reserved, maintenance
    monthly_rent: float = Field(default=0.0, ge=0.0)


class BedCreate(BedBase):
    pass


class BedRead(BedBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Tenant & Lease
# ---------------------------------------------------------

class TenantBase(BaseModel):
    full_name: str
    email: str
    phone: str
    emergency_contact: Optional[str] = None
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None
    status: str = "active"  # active, notice, moved_out

    @field_validator("email", mode="before")
    @classmethod
    def check_email(cls, v: str) -> str:
        res = validate_email_str(v)
        if not res:
            raise ValueError("Valid email is required.")
        return res

    @field_validator("phone", mode="before")
    @classmethod
    def check_phone(cls, v: str) -> str:
        res = validate_phone_str(v)
        if not res:
            raise ValueError("Valid phone number is required.")
        return res


class TenantCreate(TenantBase):
    pass


class TenantRead(TenantBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeaseBase(BaseModel):
    tenant_id: str
    bed_id: str
    start_date: date
    end_date: Optional[date] = None
    monthly_rent: float = Field(..., ge=0.0)
    security_deposit: float = Field(default=0.0, ge=0.0)
    status: str = "active"  # draft, active, expired, terminated


class LeaseCreate(LeaseBase):
    pass


class LeaseRead(LeaseBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Lead & PropertyVisit
# ---------------------------------------------------------

class LeadBase(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    budget: float = Field(default=10000.0, ge=0.0)
    preferred_location: str
    preferred_room_type: str = "Double"
    move_in_date: Optional[date] = None
    status: str = "new"  # new, contacted, matched, visit_scheduled, converted, lost
    source: str = "website"
    notes: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def check_email(cls, v: Optional[str]) -> Optional[str]:
        return validate_email_str(v)

    @field_validator("phone", mode="before")
    @classmethod
    def check_phone(cls, v: str) -> str:
        res = validate_phone_str(v)
        if not res:
            raise ValueError("Valid phone number is required.")
        return res


class LeadCreate(LeadBase):
    pass


class LeadRead(LeadBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PropertyVisitCreate(BaseModel):
    lead_id: str
    property_id: str
    room_id: Optional[str] = None
    scheduled_time: datetime
    status: str = "scheduled"
    feedback: Optional[str] = None


class PropertyVisitRead(PropertyVisitCreate):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Vendor & Maintenance
# ---------------------------------------------------------

class VendorBase(BaseModel):
    name: str
    category: str
    phone: str
    email: Optional[str] = None
    rating: float = 4.5
    hourly_rate: float = 500.0
    is_active: bool = True


class VendorCreate(VendorBase):
    pass


class VendorRead(VendorBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MaintenanceTicketBase(BaseModel):
    property_id: str
    room_id: Optional[str] = None
    tenant_id: Optional[str] = None
    vendor_id: Optional[str] = None
    title: str = Field(..., min_length=3, max_length=200)
    description: str
    category: str = "Plumbing"
    severity: str = "Medium"  # Emergency, High, Medium, Low
    status: str = "open"
    estimated_cost: float = Field(default=0.0, ge=0.0)


class MaintenanceTicketCreate(MaintenanceTicketBase):
    pass


class MaintenanceTicketRead(MaintenanceTicketBase):
    id: str
    actual_cost: float
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Financial
# ---------------------------------------------------------

class RentRecordRead(BaseModel):
    id: str
    lease_id: str
    tenant_id: str
    billing_month: str
    due_date: date
    amount_due: float
    amount_paid: float
    status: str  # pending, paid, partially_paid, overdue
    days_overdue: int

    model_config = ConfigDict(from_attributes=True)


class PaymentTransactionCreate(BaseModel):
    tenant_id: str
    lease_id: Optional[str] = None
    rent_record_id: Optional[str] = None
    amount: float = Field(..., gt=0.0)
    payment_type: str = "Rent"
    status: str = "pending"
    payment_method: Optional[str] = "UPI"
    reference_id: Optional[str] = None


class PaymentTransactionRead(PaymentTransactionCreate):
    id: str
    transaction_date: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Workflow & Approval Schemas
# ---------------------------------------------------------

class ApprovalRequestRead(BaseModel):
    id: str
    workflow_id: str
    task_record_id: Optional[str] = None
    agent_name: str
    action_type: str
    estimated_cost: float
    description: str
    status: str  # pending, approved, rejected
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentTaskRecordRead(BaseModel):
    id: str
    task_id: str
    sender_agent: str
    receiver_agent: str
    task_type: str
    input_data: dict[str, Any]
    output_data: Optional[dict[str, Any]] = None
    status: str
    is_parallel: bool
    execution_order: int
    execution_time_ms: float
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkflowExecutionRead(BaseModel):
    id: str
    workflow_type: str
    initiator: str
    status: str
    input_payload: dict[str, Any]
    summary_result: Optional[dict[str, Any]] = None
    error_message: Optional[str] = None
    tasks: List[AgentTaskRecordRead] = Field(default_factory=list)
    approvals: List[ApprovalRequestRead] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# High-Level Multi-Agent Workflow Requests & Responses
# ---------------------------------------------------------

class MoveOutNoticeRequest(BaseModel):
    tenant_id: str
    notice_days: int = Field(default=15, ge=1, le=90)
    expected_move_out_date: Optional[date] = None
    reason: Optional[str] = "Relocating for work/studies"


class MoveOutWorkflowResponse(BaseModel):
    workflow_id: str
    status: str
    tenant_name: str
    room_number: str
    property_name: str
    notice_date: date
    expected_move_out_date: date
    rent_status: dict[str, Any]
    vacancy_recovery: dict[str, Any]
    maintenance_turnover: dict[str, Any]
    facilitator_verification: dict[str, Any]
    pending_approval: bool = False
    approval_details: Optional[dict[str, Any]] = None
    timeline: List[dict[str, Any]] = Field(default_factory=list)


class LeadInquiryRequest(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    budget: float
    preferred_location: str
    preferred_room_type: str = "Double"
    move_in_date: Optional[date] = None
    message: Optional[str] = None


class LeadInquiryResponse(BaseModel):
    workflow_id: str
    status: str
    lead_id: str
    matched_rooms: List[dict[str, Any]]
    visit_suggested: bool
    scheduled_visit: Optional[dict[str, Any]] = None
    agent_response: str


# ---------------------------------------------------------
# User Authentication & Role Schemas
# ---------------------------------------------------------

class UserRegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: Optional[str] = "property_manager"  # admin, property_manager, tenant
    otp: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def check_email(cls, v: str) -> str:
        res = validate_email_str(v)
        if not res:
            raise ValueError("Valid email is required.")
        return res


class SendOTPRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    purpose: Optional[str] = "registration"

    @field_validator("email", mode="before")
    @classmethod
    def check_email(cls, v: str) -> str:
        res = validate_email_str(v)
        if not res:
            raise ValueError("Valid email is required.")
        return res


class VerifyOTPRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    otp: str = Field(..., min_length=4, max_length=10)
    purpose: Optional[str] = "registration"

    @field_validator("email", mode="before")
    @classmethod
    def check_email(cls, v: str) -> str:
        res = validate_email_str(v)
        if not res:
            raise ValueError("Valid email is required.")
        return res


class OTPResponse(BaseModel):
    success: bool
    message: str
    email: str
    expires_in_seconds: int = 600
    dev_otp: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)

    @field_validator("email", mode="before")
    @classmethod
    def check_email(cls, v: str) -> str:
        res = validate_email_str(v)
        if not res:
            raise ValueError("Valid email is required.")
        return res


class ResetPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    otp: str = Field(..., min_length=4, max_length=10)
    new_password: str = Field(..., min_length=6, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def check_email(cls, v: str) -> str:
        res = validate_email_str(v)
        if not res:
            raise ValueError("Valid email is required.")
        return res


class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def check_email(cls, v: Optional[str]) -> Optional[str]:
        return validate_email_str(v)

    @field_validator("phone", mode="before")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_str(v)


class UserLoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    is_verified: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Entity CRUD Upgrades & Payments
# ---------------------------------------------------------

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    total_floors: Optional[int] = None
    rules_summary: Optional[str] = None
    amenities: Optional[List[str]] = None
    manager_name: Optional[str] = None
    manager_phone: Optional[str] = None
    manager_email: Optional[str] = None


class TenantUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    status: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def check_email(cls, v: Optional[str]) -> Optional[str]:
        return validate_email_str(v)

    @field_validator("phone", mode="before")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_str(v)


class RentPaymentRequest(BaseModel):
    amount: float = Field(..., gt=0.0)
    payment_method: str = "UPI"  # UPI, Bank Transfer, Card, Cash
    notes: Optional[str] = "Demo recorded payment"


class TicketCreateRequest(BaseModel):
    property_id: str
    room_id: Optional[str] = None
    tenant_id: Optional[str] = None
    title: str = Field(..., min_length=3, max_length=200)
    description: str
    category: str = "General"  # Plumbing, Electrical, Appliance, Housekeeping, Wi-Fi, General
    severity: str = "Medium"  # Emergency, High, Medium, Low
    estimated_cost: Optional[float] = None


class TicketStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="open, assigned, in_progress, resolved, cancelled")
    resolution_notes: Optional[str] = None
    actual_cost: Optional[float] = None


class TicketAssignRequest(BaseModel):
    vendor_id: str
    estimated_cost: Optional[float] = None


# ---------------------------------------------------------
# Interactive Agent Workspace Dispatch
# ---------------------------------------------------------

class AgentDispatchTaskRequest(BaseModel):
    prompt: str = Field(..., min_length=3, description="Task instructions or query for the agent")
    target_agent: Optional[str] = Field(None, description="Specific agent name, or None for automatic orchestrator routing")
    context: Optional[dict[str, Any]] = Field(default_factory=dict, description="Optional parameter context")


class AgentDispatchTaskResponse(BaseModel):
    workflow_id: str
    status: str
    primary_agent: str
    executed_agents: List[str]
    response: str
    llm_synthesis: Optional[str] = None
    llm_attribution: Optional[dict[str, Any]] = None
    data: Optional[dict[str, Any]] = None
    action_performed: Optional[str] = None
    execution_time_ms: float
    trace_steps: List[dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------
# Notifications, Calendar & Integrations Schemas
# ---------------------------------------------------------

class EmailNotificationRequest(BaseModel):
    to_email: str = Field(..., min_length=3)
    subject: str = Field(..., min_length=2)
    message: str = Field(..., min_length=2)
    notification_type: Optional[str] = "general"


class CalendarScheduleRequest(BaseModel):
    event_type: str = Field(default="property_visit")  # property_visit, room_inspection, turnover_maintenance
    title: str = Field(..., min_length=3)
    start_time: str = Field(..., description="ISO 8601 datetime string")
    duration_minutes: Optional[int] = 45
    location: Optional[str] = "StayOps PG, Bengaluru"
    attendee_name: Optional[str] = "Resident"
    attendee_email: Optional[str] = "resident@stayops.ai"
    description: Optional[str] = None


class WhatsAppNotificationRequest(BaseModel):
    recipient_phone: Optional[str] = None
    phone: Optional[str] = None
    template_name: str = "general_alert"
    preview_text: Optional[str] = None
    message: Optional[str] = None
    parameters: Optional[dict[str, Any]] = Field(default_factory=dict)


class IntegrationsStatusResponse(BaseModel):
    gemini_configured: bool
    email_smtp_configured: bool
    google_calendar_configured: bool
    whatsapp_configured: bool
    vector_store_ready: bool
    active_llm_provider: str


# ---------------------------------------------------------
# Property Viewing & Visit Requests
# ---------------------------------------------------------

class PropertyVisitCreateRequest(BaseModel):
    property_id: str
    room_id: Optional[str] = None
    lead_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    scheduled_time: str
    notes: Optional[str] = None


class PropertyVisitStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="scheduled, confirmed, completed, cancelled, no_show")
    feedback: Optional[str] = None


class PropertyVisitResponse(BaseModel):
    id: str
    lead_id: str
    lead_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    property_id: str
    property_name: str
    property_code: Optional[str] = None
    room_id: Optional[str] = None
    room_number: Optional[str] = None
    scheduled_time: str
    status: str
    feedback: Optional[str] = None
    created_at: Optional[str] = None



