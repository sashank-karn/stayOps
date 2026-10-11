"""Workflow, Task, and Approval models for Multi-Agent coordination."""
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Float, ForeignKey, DateTime, Text, JSON, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.session import Base
from backend.app.models.base import UUIDMixin, TimestampMixin, SoftDeleteMixin, utc_now


class WorkflowExecution(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Tracks a multi-agent workflow run orchestrated across specialized agents."""
    __tablename__ = "workflow_executions"

    workflow_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # tenant_move_out_notice, lead_enquiry, tenant_support, maintenance_request, collections_audit
    initiator: Mapped[str] = mapped_column(String(50), default="system", nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default="running", nullable=False, index=True
    )  # running, completed, failed, needs_approval
    input_payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    summary_result: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    tasks: Mapped[List["AgentTaskRecord"]] = relationship(
        "AgentTaskRecord", back_populates="workflow", cascade="all, delete-orphan"
    )
    approvals: Mapped[List["ApprovalRequest"]] = relationship(
        "ApprovalRequest", back_populates="workflow", cascade="all, delete-orphan"
    )


class AgentTaskRecord(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Persistent audit log of an individual agent task execution."""
    __tablename__ = "agent_task_records"

    workflow_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    task_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    sender_agent: Mapped[str] = mapped_column(String(50), nullable=False)
    receiver_agent: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    task_type: Mapped[str] = mapped_column(String(100), nullable=False)
    input_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    output_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False, index=True
    )  # pending, in_progress, completed, failed, needs_approval
    is_parallel: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    execution_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    execution_time_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    workflow: Mapped["WorkflowExecution"] = relationship(
        "WorkflowExecution", back_populates="tasks"
    )
    approvals: Mapped[List["ApprovalRequest"]] = relationship(
        "ApprovalRequest", back_populates="task_record"
    )


class ApprovalRequest(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Human-in-the-loop approval gate for high-cost or sensitive actions."""
    __tablename__ = "approval_requests"

    workflow_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    task_record_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("agent_task_records.id", ondelete="SET NULL"), nullable=True
    )
    agent_name: Mapped[str] = mapped_column(String(50), nullable=False)
    action_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # high_cost_maintenance, tenant_eviction, deposit_refund, vendor_dispatch
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False, index=True
    )  # pending, approved, rejected
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    workflow: Mapped["WorkflowExecution"] = relationship(
        "WorkflowExecution", back_populates="approvals"
    )
    task_record: Mapped[Optional["AgentTaskRecord"]] = relationship(
        "AgentTaskRecord", back_populates="approvals"
    )
