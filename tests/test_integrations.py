"""Tests for StayOps AI external integrations (Email, Calendar, WhatsApp, LLM attribution)."""
import pytest
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.app.services.email_service import (
    send_email_notification,
    send_rent_reminder_email,
    send_payment_receipt_email,
    send_move_out_notice_email,
    get_email_history,
)
from backend.app.services.calendar_service import (
    schedule_calendar_event,
    generate_ics_content,
    get_calendar_events,
)
from backend.app.services.whatsapp_service import (
    normalize_phone_number,
    send_whatsapp_notification,
    get_whatsapp_messages,
)
from shared.llm.client import call_llm_with_attribution
from backend.app.db.session import SessionLocal
from backend.app.db.seed import seed_database
from agents.orchestrator.agent import OrchestratorAgent
from backend.app.models.tenant import Tenant


def test_email_service_notifications():
    """Verify email notifications dispatch in dev mode and record audit history."""
    res = send_email_notification(
        to_email="test.resident@stayops.ai",
        subject="Welcome to StayOps PG",
        message="Your onboarding is complete. Room 101-B is ready.",
        notification_type="onboarding",
    )
    assert res["status"] in ["sent", "simulated_dev", "simulated_dev_mode"]
    assert res["recipient"] == "test.resident@stayops.ai"

    # Verify specialized template helpers
    rent_res = send_rent_reminder_email(
        recipient_email="test.resident@stayops.ai",
        tenant_name="Aarav Sharma",
        amount_due=12000.0,
        due_date="2026-11-01",
        billing_month="November 2026",
    )
    assert rent_res["status"] in ["sent", "simulated_dev", "simulated_dev_mode"]

    receipt_res = send_payment_receipt_email(
        recipient_email="test.resident@stayops.ai",
        tenant_name="Aarav Sharma",
        amount_paid=12000.0,
        transaction_ref="TXN-TEST-12345",
        billing_month="November 2026",
    )
    assert receipt_res["status"] in ["sent", "simulated_dev", "simulated_dev_mode"]

    history = get_email_history()
    assert len(history) >= 3


def test_calendar_service_ics_generation():
    """Verify RFC 5545 iCalendar generation and scheduling."""
    ics = generate_ics_content(
        event_id="evt-unit-test-1",
        title="Turnover Inspection: Room 201",
        description="Pre-checkout inspection",
        start_dt=datetime(2026, 11, 10, 10, 0, tzinfo=timezone.utc),
        duration_minutes=45,
        location="StayOps PG Koramangala",
        attendee_email="manager@stayops.ai",
    )
    assert "BEGIN:VCALENDAR" in ics
    assert "BEGIN:VEVENT" in ics
    assert "SUMMARY:Turnover Inspection: Room 201" in ics
    assert "END:VCALENDAR" in ics

    event = schedule_calendar_event(
        event_type="property_visit",
        title="Guided PG Tour: Rohan Mehta",
        description="Prospective student resident tour",
        start_time="2026-11-12T14:00:00Z",
        duration_minutes=30,
        location="StayOps PG Indiranagar",
        attendee_name="Rohan Mehta",
        attendee_email="rohan@example.com",
    )
    assert event["status"] in ["confirmed", "confirmed_google_calendar", "scheduled_local_ics", "ics_invite"]
    assert event["event_type"] == "property_visit"
    assert "BEGIN:VCALENDAR" in event["ics_data"]

    events = get_calendar_events()
    assert len(events) >= 1


def test_whatsapp_service_normalization_and_preview():
    """Verify phone normalization and WhatsApp simulator dispatch."""
    assert normalize_phone_number("9876543210") == "+919876543210"
    assert normalize_phone_number("09876543210") == "+919876543210"
    assert normalize_phone_number("+91 98765 43210") == "+919876543210"

    res = send_whatsapp_notification(
        recipient_phone="9876543210",
        message="Hi Aarav, your rent receipt for ₹12,000 has been generated.",
        template_name="rent_receipt",
        parameters={"amount": "12000"},
    )
    assert res["status"] in ["sent", "simulated_preview", "failed"]
    assert res["normalized_phone"] == "+919876543210"

    messages = get_whatsapp_messages()
    assert len(messages) >= 1


def test_llm_attribution_transparency():
    """Verify that call_llm_with_attribution labels model source and fallback status."""
    text, source, is_fallback = call_llm_with_attribution(
        prompt="Tenant submits 15-day move-out notice for Room 302.",
        system_prompt="You are StayOps AI Assistant.",
    )
    assert isinstance(text, str)
    assert len(text) > 10
    assert isinstance(source, str)
    assert isinstance(is_fallback, bool)
    if is_fallback:
        assert source == "deterministic_local_fallback"


def test_move_out_workflow_integrations_dispatch():
    """Verify move-out workflow dispatches calendar, email, and whatsapp events."""
    db: Session = SessionLocal()
    try:
        seed_database(db)
        tenant = db.query(Tenant).first()
        assert tenant is not None, "Seeded tenant required"
        tenant.status = "active"
        from backend.app.models.tenant import Lease
        lease = db.query(Lease).filter(Lease.tenant_id == tenant.id).first()
        if lease:
            lease.status = "active"
        db.commit()

        orchestrator = OrchestratorAgent(db)
        result = orchestrator.run_move_out_workflow(
            tenant_id=tenant.id,
            notice_days=15,
            reason="Relocating to another city",
        )

        assert "integrations" in result
        integrations = result["integrations"]
        assert "calendar" in integrations
        assert "email" in integrations
        assert "whatsapp" in integrations

        # Verify calendar event was generated
        cal = integrations["calendar"]
        assert cal["status"] in ["confirmed", "confirmed_google_calendar", "scheduled_local_ics", "ics_invite"]

        # Verify email was dispatched or simulated
        em = integrations["email"]
        assert em["status"] in ["sent", "simulated_dev", "simulated_dev_mode"]

        # Verify WhatsApp was dispatched or simulated
        wa = integrations["whatsapp"]
        assert wa["status"] in ["sent", "simulated_preview", "failed"]

        # Verify summary reflects integrations
        assert "integrations" in result["summary"]
    finally:
        db.close()


def test_whatsapp_webhook_verification_and_event():
    """Verify Meta WhatsApp Webhook GET challenge verification and POST message ingestion."""
    from starlette.testclient import TestClient
    from backend.app.main import app

    client = TestClient(app)

    # 1. Test Verification Challenge with correct token
    res = client.get(
        "/api/webhook/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "stayops_wa_verify_token_2026",
            "hub.challenge": "challenge_123456789",
        },
    )
    assert res.status_code == 200
    assert res.text == "challenge_123456789"

    # 2. Test Verification with incorrect token (Forbidden)
    bad_res = client.get(
        "/api/webhook/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "invalid_wrong_token",
            "hub.challenge": "challenge_123456789",
        },
    )
    assert bad_res.status_code == 403

    # 3. Test POST Event from Meta containing incoming resident message
    event_payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "1399803109881445",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {"display_phone_number": "15550234567", "phone_number_id": "1399803109881445"},
                            "messages": [
                                {
                                    "from": "9779825016096",
                                    "id": "wamid.INCOMING_TEST_MSG_001",
                                    "timestamp": "1729350000",
                                    "text": {"body": "Hello StayOps, I need assistance with room checkout."},
                                    "type": "text",
                                }
                            ],
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    }

    post_res = client.post("/api/webhook/whatsapp", json=event_payload)
    assert post_res.status_code == 200
    assert post_res.json() == {"status": "ok"}

    # Verify message was logged in memory stream
    msgs = get_whatsapp_messages()
    assert any("Hello StayOps, I need assistance with room checkout." in m.get("preview_text", "") for m in msgs)

