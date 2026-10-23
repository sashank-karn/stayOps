"""Email OTP Verification and Security Authorization Service for StayOps AI."""
from __future__ import annotations

import logging
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Tuple

from sqlalchemy.orm import Session
from backend.app.models.user import EmailVerificationCode, User
from shared.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

OTP_EXPIRY_MINUTES = 20


def generate_numeric_otp(length: int = 6) -> str:
    """Generate cryptographically secure numeric OTP."""
    digits = "0123456789"
    # Ensure first digit is not 0 for clean display
    first = secrets.choice("123456789")
    rest = "".join(secrets.choice(digits) for _ in range(length - 1))
    return f"{first}{rest}"


def send_otp_email(email: str, otp_code: str, purpose: str = "registration") -> bool:
    """
    Send OTP verification email via SMTP if configured,
    or log clearly for local/dev verification.
    """
    subject = f"Your StayOps AI Verification Code: {otp_code}"
    purpose_label = "Registration & Account Authorization" if purpose == "registration" else "Account Security Verification"

    text_body = (
        f"Welcome to StayOps AI!\n\n"
        f"Your verification code is: {otp_code}\n\n"
        f"This one-time passcode is valid for {OTP_EXPIRY_MINUTES} minutes for {purpose_label}.\n"
        f"If you did not request this verification, please disregard this email."
    )

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">StayOps AI</h1>
          <p style="color: #bfdbfe; margin: 6px 0 0 0; font-size: 13px;">Smart PG & Co-Living Operations</p>
        </div>
        <div style="padding: 28px 24px; color: #1e293b;">
          <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Email Verification Required</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #475569;">
            Thank you for registering with StayOps AI. Please use the authorization code below to verify your email address and activate your account:
          </p>
          <div style="background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1d4ed8;">
              {otp_code}
            </span>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.4;">
            This one-time passcode expires in <strong>{OTP_EXPIRY_MINUTES} minutes</strong>. For your security, never share this code with anyone.
          </p>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; background: #f8fafc;">
          © 2026 StayOps AI. Automated System Notification.
        </div>
      </div>
    </body>
    </html>
    """

    # 1. Try modern HTTP REST APIs first (HTTPS Port 443 — works behind all firewalls)
    sent_via_http = False
    from_email = (getattr(settings, "smtp_from_email", None) or getattr(settings, "email_from", None) or "noreply@sashankkarn.com.np").strip()
    
    # Check for Brevo HTTP API key (starts with xkeysib-)
    brevo_key = (getattr(settings, "brevo_api_key", None) or "").strip()
    # Also check if user stored Brevo API key in smtp_pass/smtp_password
    candidate_key = (getattr(settings, "smtp_password", None) or getattr(settings, "smtp_pass", None) or "").strip()
    if candidate_key.startswith("xkeysib-") and not brevo_key:
        brevo_key = candidate_key

    # Check for Resend HTTP API key (starts with re_)
    resend_key = (getattr(settings, "resend_api_key", None) or "").strip()
    if candidate_key.startswith("re_") and not resend_key:
        resend_key = candidate_key

    if resend_key:
        try:
            import httpx
            sender_str = from_email if ("<" in from_email or "@" in from_email) else f"StayOps Security <{from_email}>"
            resend_payload = {
                "from": sender_str,
                "to": [email],
                "subject": subject,
                "html": html_body,
                "text": text_body,
            }
            res = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                },
                json=resend_payload,
                timeout=10.0,
            )
            if res.status_code in (200, 201):
                sent_via_http = True
                logger.info("[StayOps Security] Successfully sent verification email via Resend HTTP API to %s (id: %s)", email, res.json().get("id"))
                print(f"[StayOps Security] Email sent via Resend HTTP API to {email}")
            else:
                logger.warning("[StayOps Security] Resend API error (%s): %s", res.status_code, res.text)
                print(f"[StayOps Security Warning] Resend HTTP API returned {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning("[StayOps Security] Resend HTTP dispatch failed: %s", e)

    elif brevo_key:
        try:
            import httpx
            # Extract clean email and display name for Brevo schema
            sender_name = "StayOps Security"
            clean_from = from_email
            if "<" in from_email and ">" in from_email:
                sender_name = from_email.split("<")[0].strip()
                clean_from = from_email.split("<")[1].replace(">", "").strip()

            brevo_payload = {
                "sender": {"name": sender_name, "email": clean_from},
                "to": [{"email": email}],
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
                sent_via_http = True
                logger.info("[StayOps Security] Successfully sent verification email via Brevo HTTP API to %s (messageId: %s)", email, res.json().get("messageId"))
                print(f"[StayOps Security] Email sent via Brevo HTTP API to {email}")
            else:
                logger.warning("[StayOps Security] Brevo API error (%s): %s", res.status_code, res.text)
                print(f"[StayOps Security Warning] Brevo HTTP API returned {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning("[StayOps Security] Brevo HTTP dispatch failed: %s", e)

    # 2. Fallback to standard SMTP if HTTP API was not configured or failed
    sent_via_smtp = False
    if not sent_via_http:
        smtp_host = (getattr(settings, "smtp_host", None) or getattr(settings, "smtp_server", None) or "").strip()
        smtp_user = (getattr(settings, "smtp_user", None) or getattr(settings, "smtp_username", None) or "").strip()
        smtp_pass = (getattr(settings, "smtp_password", None) or getattr(settings, "smtp_pass", None) or "").strip()
        smtp_from = (getattr(settings, "smtp_from_email", None) or getattr(settings, "smtp_from", None) or "").strip()
        smtp_port = int(getattr(settings, "smtp_port", 587) or 587)

        if smtp_host and smtp_user and smtp_pass:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = smtp_from if smtp_from else f"StayOps Security <{smtp_user}>"
                msg["To"] = email
                msg.attach(MIMEText(text_body, "plain"))
                msg.attach(MIMEText(html_body, "html"))

                if smtp_port == 465:
                    with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
                        server.login(smtp_user, smtp_pass)
                        server.sendmail(msg["From"], [email], msg.as_string())
                else:
                    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                        server.starttls()
                        server.login(smtp_user, smtp_pass)
                        server.sendmail(msg["From"], [email], msg.as_string())
                sent_via_smtp = True
                logger.info("[StayOps Security] Successfully dispatched verification email via SMTP to %s", email)
            except Exception as e:
                logger.warning("[StayOps Security] SMTP dispatch failed (%s), falling back to console dispatch", e)
                print(f"[StayOps Security Warning] SMTP send failed: {e}")

    # Always log clearly for transparency, debugging, and local evaluation
    dispatch_channel = "Resend HTTP API" if resend_key and sent_via_http else ("Brevo HTTP API" if brevo_key and sent_via_http else ("SMTP" if sent_via_smtp else "console/dev"))
    logger.info(
        "[StayOps Security OTP] Code: %s | Recipient: %s | Purpose: %s | Expiry: %dm | Channel: %s",
        otp_code,
        email,
        purpose,
        OTP_EXPIRY_MINUTES,
        dispatch_channel,
    )
    print(f"\n=======================================================")
    print(f" [STAYOPS SECURITY OTP] EMAIL VERIFICATION CODE DISPATCH")
    print(f" Recipient : {email}")
    print(f" Code      : {otp_code}")
    print(f" Valid For : {OTP_EXPIRY_MINUTES} Minutes")
    print(f"=======================================================\n")
    return True


def create_and_send_otp(db: Session, email: str, purpose: str = "registration") -> Tuple[str, bool]:
    """
    Generate, persist, and send an email OTP for verification.
    Only purges codes that are already expired to prevent race conditions when users retry.
    """
    normalized_email = email.strip().lower()

    # Expire only old, already-expired codes for this email and purpose
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    db.query(EmailVerificationCode).filter(
        EmailVerificationCode.email == normalized_email,
        EmailVerificationCode.purpose == purpose,
        EmailVerificationCode.is_used == False,
        EmailVerificationCode.expires_at < now,
    ).update({"is_used": True})

    # Generate new 6-digit code with 20-minute validity
    code = generate_numeric_otp(6)
    expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)

    otp_record = EmailVerificationCode(
        email=normalized_email,
        code=code,
        purpose=purpose,
        expires_at=expires_at,
        is_used=False,
    )
    db.add(otp_record)
    db.commit()
    db.refresh(otp_record)

    # Dispatch email
    send_otp_email(normalized_email, code, purpose=purpose)
    return code, True


def verify_otp_code(db: Session, email: str, code: str, purpose: str = "registration") -> Tuple[bool, str]:
    """
    Verify the submitted OTP for the email and purpose.
    Marks the code and any pending codes as used upon successful verification.
    """
    import re
    normalized_email = email.strip().lower()
    cleaned_code = re.sub(r"\D", "", str(code or "")).strip()

    if not cleaned_code:
        return False, "Verification code cannot be empty. Please enter the 6-digit code."

    if len(cleaned_code) != 6:
        return False, f"Verification code must be exactly 6 digits (received {len(cleaned_code)} digits)."

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Search for an unused code matching this email, purpose, and code
    record = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.email == normalized_email,
            EmailVerificationCode.purpose == purpose,
            EmailVerificationCode.code == cleaned_code,
            EmailVerificationCode.is_used == False,
        )
        .order_by(EmailVerificationCode.created_at.desc())
        .first()
    )

    if not record:
        # Check if code exists but was already used
        used_check = (
            db.query(EmailVerificationCode)
            .filter(
                EmailVerificationCode.email == normalized_email,
                EmailVerificationCode.purpose == purpose,
                EmailVerificationCode.code == cleaned_code,
                EmailVerificationCode.is_used == True,
            )
            .first()
        )
        if used_check:
            return False, "This verification code has already been used. Please request a new code."
        return False, "Invalid verification code. Please check your inbox or click 'Resend code'."

    # Timezone-safe expiration comparison
    exp = record.expires_at
    curr = datetime.now(timezone.utc) if (exp.tzinfo is not None) else now

    if exp < curr:
        return False, "Verification code has expired. Please request a new code."

    # Mark this code and all pending codes for this email as used
    record.is_used = True
    db.query(EmailVerificationCode).filter(
        EmailVerificationCode.email == normalized_email,
        EmailVerificationCode.purpose == purpose,
        EmailVerificationCode.is_used == False,
    ).update({"is_used": True})

    db.commit()
    logger.info("[StayOps Security] Successfully verified OTP code for %s (purpose: %s)", normalized_email, purpose)
    return True, "Email verification successful."

