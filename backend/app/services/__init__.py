"""StayOps External & Notification Services."""
from backend.app.services.email_service import (
    dispatch_email,
    send_rent_reminder_email,
    send_payment_receipt_email,
    send_move_out_notice_email,
    get_notification_history,
)
from backend.app.services.calendar_service import (
    schedule_calendar_event,
    list_calendar_events,
    is_google_calendar_configured,
)
from backend.app.services.whatsapp_service import (
    send_whatsapp_message,
    send_whatsapp_rent_reminder,
    send_whatsapp_visit_confirmation,
    send_whatsapp_maintenance_update,
    list_whatsapp_messages,
    is_whatsapp_configured,
)

__all__ = [
    "dispatch_email",
    "send_rent_reminder_email",
    "send_payment_receipt_email",
    "send_move_out_notice_email",
    "get_notification_history",
    "schedule_calendar_event",
    "list_calendar_events",
    "is_google_calendar_configured",
    "send_whatsapp_message",
    "send_whatsapp_rent_reminder",
    "send_whatsapp_visit_confirmation",
    "send_whatsapp_maintenance_update",
    "list_whatsapp_messages",
    "is_whatsapp_configured",
]
