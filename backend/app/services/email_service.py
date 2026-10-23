"""Comprehensive Email Delivery & Notification Service for StayOps AI."""
from __future__ import annotations

import logging
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional

from shared.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# In-memory notification dispatch log for auditing & status reporting
NOTIFICATION_AUDIT_LOG: List[Dict[str, Any]] = []


def dispatch_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
    notification_type: str = "general",
) -> Dict[str, Any]:
    """
    Send an email via configured SMTP server or log clearly in local development mode.
    Returns audit details with status 'sent', 'simulated_dev_mode', or 'failed'.
    """
    to_email = to_email.strip().lower()
    timestamp = datetime.now(timezone.utc).isoformat()

    smtp_host = getattr(settings, "smtp_host", None) or getattr(settings, "smtp_server", None)
    smtp_user = getattr(settings, "smtp_user", None) or getattr(settings, "smtp_username", None)
    smtp_pass = getattr(settings, "smtp_password", None)
    smtp_port = int(getattr(settings, "smtp_port", 587))
    sender_from = (
        getattr(settings, "smtp_from", None)
        or getattr(settings, "smtp_from_email", None)
        or getattr(settings, "email_from", None)
        or "StayOps AI <noreply@sashankkarn.com.np>"
    )
    brevo_key = (getattr(settings, "brevo_api_key", None) or "").strip()

    status = "simulated_dev_mode"
    error = None

    # 1. Try Brevo HTTP API first (Works on Render/Cloud HTTPS 443)
    if brevo_key:
        try:
            import httpx
            sender_name = "StayOps Security"
            clean_from = sender_from
            if "<" in sender_from and ">" in sender_from:
                sender_name = sender_from.split("<")[0].strip()
                clean_from = sender_from.split("<")[1].replace(">", "").strip()

            brevo_payload = {
                "sender": {"name": sender_name, "email": clean_from},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_body,
                "textContent": text_body,
            }
            res = httpx.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": brevo_key,
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                json=brevo_payload,
                timeout=10.0,
            )
            if res.status_code in (200, 201, 202):
                status = "sent"
                logger.info("[Email Service] Dispatched live email to %s via Brevo HTTP API (%s)", to_email, subject)
            else:
                logger.warning("[Email Service] Brevo API error (%s): %s", res.status_code, res.text)
        except Exception as e:
            logger.warning("[Email Service] Brevo HTTP dispatch failed: %s", e)

    # 2. Fallback to standard SMTP if HTTP API wasn't sent
    if status != "sent" and smtp_host and smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = sender_from
            msg["To"] = to_email
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=8) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(sender_from, [to_email], msg.as_string())
            status = "sent"
            logger.info("[Email Service] Dispatched live email to %s via SMTP (%s)", to_email, subject)
        except Exception as e:
            status = "failed"
            error = str(e)
            logger.warning("[Email Service] SMTP dispatch failed (%s), logged locally", e)
    elif status != "sent":
        logger.info("[Email Service: Dev Mode] Email to %s: '%s'", to_email, subject)

    audit_entry = {
        "id": f"notif-email-{len(NOTIFICATION_AUDIT_LOG) + 1}",
        "channel": "email",
        "recipient": to_email,
        "subject": subject,
        "type": notification_type,
        "status": status,
        "timestamp": timestamp,
        "error": error,
        "summary": text_body[:160],
    }
    NOTIFICATION_AUDIT_LOG.insert(0, audit_entry)
    # Keep last 100 notifications in memory
    if len(NOTIFICATION_AUDIT_LOG) > 100:
        NOTIFICATION_AUDIT_LOG.pop()

    return audit_entry


def send_email_notification(
    to_email: str,
    subject: str,
    message: str,
    notification_type: str = "general",
) -> Dict[str, Any]:
    """Send generic notification email or record simulated dev delivery."""
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a; margin-top: 0;">StayOps AI Notification</h2>
      <p style="white-space: pre-wrap; color: #334155; line-height: 1.5;">{message}</p>
    </div>
    """
    return dispatch_email(
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        text_body=message,
        notification_type=notification_type,
    )


def send_rent_reminder_email(
    to_email: str = "",
    tenant_name: str = "Resident",
    amount_due: float = 0.0,
    due_date: str = "",
    property_name: str = "StayOps Green Glen PG",
    recipient_email: Optional[str] = None,
    billing_month: Optional[str] = None,
) -> Dict[str, Any]:
    """Dispatch rent due reminder email."""
    target_email = recipient_email or to_email
    subject = f"Rent Due Notice — ₹{amount_due:,.2f} for {property_name}"
    text_body = (
        f"Dear {tenant_name},\n\n"
        f"This is a friendly reminder that your monthly rent of ₹{amount_due:,.2f} for {property_name} "
        f"is scheduled for payment by {due_date}.\n\n"
        f"You can pay seamlessly via the StayOps Tenant Portal using UPI, NetBanking, or Card.\n\n"
        f"Thank you,\nStayOps Property Management"
    )
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a; margin-top: 0;">StayOps AI — Rent Due Notice</h2>
      <p>Dear <strong>{tenant_name}</strong>,</p>
      <p>This is a reminder that your rent for <strong>{property_name}</strong> is due on <strong>{due_date}</strong>.</p>
      <div style="background: #f8fafc; padding: 14px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #2563eb;">
        <span style="font-size: 20px; font-weight: bold; color: #0f172a;">Amount Due: ₹{amount_due:,.2f}</span>
      </div>
      <p style="font-size: 13px; color: #64748b;">Pay online via UPI, NetBanking, or Card through the resident dashboard.</p>
    </div>
    """
    return dispatch_email(target_email, subject, html_body, text_body, notification_type="rent_reminder")


def send_payment_receipt_email(
    to_email: str = "",
    tenant_name: str = "Resident",
    amount_paid: float = 0.0,
    payment_method: str = "UPI",
    transaction_id: str = "TXN-DEFAULT",
    property_name: str = "StayOps Green Glen PG",
    recipient_email: Optional[str] = None,
    transaction_ref: Optional[str] = None,
    billing_month: Optional[str] = None,
) -> Dict[str, Any]:
    """Dispatch verified payment receipt."""
    target_email = recipient_email or to_email
    ref = transaction_ref or transaction_id
    subject = f"Payment Receipt: ₹{amount_paid:,.2f} Received — StayOps AI"
    text_body = (
        f"Dear {tenant_name},\n\n"
        f"We have confirmed receipt of ₹{amount_paid:,.2f} via {payment_method} for {property_name}.\n"
        f"Transaction Reference: {ref}\n"
        f"Status: VERIFIED & CREDITED\n\n"
        f"StayOps AI Operations"
    )
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #15803d; margin-top: 0;">Payment Receipt Confirmed</h2>
      <p>Dear <strong>{tenant_name}</strong>,</p>
      <p>Thank you for your payment. Your rent transaction has been credited to your account.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #64748b;">Amount:</td><td style="font-weight: bold; color: #15803d;">₹{amount_paid:,.2f}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Method:</td><td>{payment_method}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Txn Ref:</td><td><code>{ref}</code></td></tr>
      </table>
    </div>
    """
    return dispatch_email(target_email, subject, html_body, text_body, notification_type="payment_receipt")


def send_move_out_notice_email(
    to_email: str = "",
    tenant_name: str = "Resident",
    expected_move_out_date: str = "In 15 Days",
    deposit_refund: float = 0.0,
    room_number: str = "N/A",
    recipient_email: Optional[str] = None,
    net_deposit_settlement: Optional[float] = None,
) -> Dict[str, Any]:
    """Dispatch move-out workflow confirmation and deposit settlement breakdown."""
    target_email = recipient_email or to_email
    refund = net_deposit_settlement if net_deposit_settlement is not None else deposit_refund
    subject = f"Move-Out Notice Acknowledged — Room {room_number}"
    text_body = (
        f"Dear {tenant_name},\n\n"
        f"Your 15-day move-out notice for Room {room_number} on {expected_move_out_date} has been recorded.\n"
        f"Estimated Net Security Deposit Refund: ₹{refund:,.2f}\n"
        f"A room turnover inspection has been scheduled prior to checkout.\n\n"
        f"StayOps AI Operations Swarm"
    )
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a; margin-top: 0;">Move-Out Notice Acknowledged</h2>
      <p>Dear <strong>{tenant_name}</strong>,</p>
      <p>Your move-out request for Room <strong>{room_number}</strong> on <strong>{expected_move_out_date}</strong> has been verified by the Tenant Support and Orchestrator Agents.</p>
      <div style="background: #eff6ff; padding: 14px; border-radius: 6px; margin: 16px 0;">
        <strong>Projected Deposit Refund:</strong> ₹{refund:,.2f}
      </div>
      <p style="font-size: 13px; color: #64748b;">Final settlement will be transferred to your registered bank account upon inspection completion.</p>
    </div>
    """
    return dispatch_email(target_email, subject, html_body, text_body, notification_type="move_out_notice")


def get_notification_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve recent notification dispatch history."""
    return NOTIFICATION_AUDIT_LOG[:limit]


# Alias for consistent naming
get_email_history = get_notification_history

