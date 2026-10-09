"""Phase 1 smoke tests — prove the stack boots and the shared contracts hold.

Run from the repo root:
    pytest
"""
from fastapi.testclient import TestClient

from backend.app.main import app
from shared.config import get_settings
from shared.schemas import AgentMessage, MessageStatus

client = TestClient(app)


def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_root_banner():
    resp = client.get("/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["service"] == get_settings().app_name
    assert body["version"] == "0.1.0"


def test_readiness_reports_llm_provider_without_leaking_key():
    resp = client.get("/readiness")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ready"
    assert body["llm_provider"] in ("openai", "gemini")
    # The actual key must never appear in the response.
    assert "api_key" not in body
    assert isinstance(body["llm_key_configured"], bool)


def test_settings_build_sqlalchemy_url():
    settings = get_settings()
    assert settings.sqlalchemy_url.startswith("postgresql+psycopg://")


def test_agent_message_envelope_defaults_and_transition():
    msg = AgentMessage(
        sender_agent="orchestrator",
        receiver_agent="leasing",
        task_type="search_rooms",
        input_data={"location": "Hinjewadi", "budget": 12000},
    )
    assert msg.status == MessageStatus.PENDING
    assert msg.task_id  # auto-generated uuid

    done = msg.mark(MessageStatus.COMPLETED, result={"matches": 3})
    assert done.status == MessageStatus.COMPLETED
    assert done.result == {"matches": 3}
    # original is unchanged (immutable transition)
    assert msg.status == MessageStatus.PENDING
