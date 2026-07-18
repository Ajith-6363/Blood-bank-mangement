import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

# Configure logger
logger = logging.getLogger("email_service")
logging.basicConfig(level=logging.INFO)

def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Sends an email using standard SMTP.
    If credentials are not configured or email sending fails,
    it falls back to logging the email to the console (mock mode).
    """
    # Verify setup
    if not settings.SMTP_HOST or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.info(f"[MOCK EMAIL] To: {to_email} | Subject: {subject} | Body: {body}")
        return True

    try:
        # Create message container
        msg = MIMEMultipart()
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email
        msg["Subject"] = subject
        
        # Attach the body text
        msg.attach(MIMEText(body, "html"))
        
        # Connect to SMTP server
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()  # Upgrade connection to secure TLS
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        
        # Send mail
        server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
        server.quit()
        logger.info(f"Email successfully sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        logger.info(f"[FALLBACK MOCK EMAIL] To: {to_email} | Subject: {subject} | Body: {body}")
        return False
