"""
app/utils/brevo_mailer.py
----------------------------
Thin wrapper around the Brevo (formerly Sendinblue) transactional email
API. Used for license-expiry reminders and other operational alerts.

Brevo is used purely via its REST API (no SMTP), so the only dependency
is the `requests` library.
"""

import requests
from flask import current_app

BREVO_SEND_EMAIL_URL = "https://api.brevo.com/v3/smtp/email"


def send_email(to_email: str, to_name: str, subject: str, html_content: str) -> dict:
    """
    Send a transactional email through the Brevo API.

    Args:
        to_email: recipient email address
        to_name: recipient display name
        subject: email subject line
        html_content: HTML body of the email

    Returns:
        dict: parsed JSON response from Brevo, or an error dict if the
        request failed.
    """
    api_key = current_app.config.get("BREVO_API_KEY")
    sender_email = current_app.config.get("BREVO_SENDER_EMAIL")
    sender_name = current_app.config.get("BREVO_SENDER_NAME")

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html_content,
    }

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }

    try:
        response = requests.post(BREVO_SEND_EMAIL_URL, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as exc:
        # Log and swallow - email failures should never crash the main flow
        current_app.logger.error(f"Brevo email send failed: {exc}")
        return {"error": str(exc)}


def send_license_expiry_reminder(driver_email: str, driver_name: str, expiry_date: str) -> dict:
    """Convenience helper for the license-expiry bonus feature."""
    subject = "transiti-fy: Your driving license is expiring soon"
    html_content = f"""
        <p>Hi {driver_name},</p>
        <p>Our records show your driving license is set to expire on <b>{expiry_date}</b>.</p>
        <p>Please renew it as soon as possible to remain eligible for trip assignments.</p>
        <p>- transiti-fy Fleet Team</p>
    """
    return send_email(driver_email, driver_name, subject, html_content)
