"""
The structured message envelope agents use to communicate.

Agents do not call each other as plain functions — every hand-off is an `AgentMessage`
with a `task_id`, sender, receiver, payload, and status. This envelope is what gets
persisted to the `AgentMessages` / `AgentTasks` tables (Phase 2) and rendered on the
Agent Activity view of the dashboard (Phase 13), which is how we *prove* the system is
genuinely multi-agent.

This is the Phase 1 contract; fields may be extended in later phases but not removed.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class MessageStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_APPROVAL = "needs_approval"
    ESCALATED = "escalated"


class TaskPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class AgentMessage(BaseModel):
    """A single task/message passed between agents (or from the orchestrator)."""

    task_id: str = Field(default_factory=lambda: str(uuid4()))
    sender_agent: str
    receiver_agent: str
    task_type: str                      # e.g. "search_rooms", "create_ticket"
    input_data: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)   # shared-memory snippets
    priority: TaskPriority = TaskPriority.NORMAL
    status: MessageStatus = MessageStatus.PENDING
    result: dict[str, Any] | None = None
    error: str | None = None
    requires_approval: bool = False
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    def mark(self, status: MessageStatus, **changes: Any) -> "AgentMessage":
        """Return a copy with an updated status/fields and a fresh timestamp."""
        return self.model_copy(
            update={"status": status, "updated_at": _now(), **changes}
        )
