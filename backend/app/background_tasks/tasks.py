import logging
from datetime import datetime, timezone, date
from sqlalchemy.orm import Session
from app.models.stock import BloodStock
from app.models.notification import Notification
from app.models.session import Session as UserSession
from app.models.otp import OTP
from app.models.user import User
from app.services.ai import search_compatible_donors
from app.services.email import send_email

logger = logging.getLogger("background_tasks")

def check_expiring_stock(db: Session):
    """Checks for stock expiring today or already expired and marks it as expired."""
    today = date.today()
    expired_batches = db.query(BloodStock).filter(
        BloodStock.expiry_date <= today,
        BloodStock.status == "available"
    ).all()
    
    if not expired_batches:
        logger.info("No expired blood stock found today.")
        return
        
    for batch in expired_batches:
        batch.status = "expired"
        logger.warning(f"Batch {batch.batch_number} ({batch.blood_group}) has expired.")
        
        # Notify admins
        admins = db.query(User).filter(User.role == "admin").all()
        for admin in admins:
            notif = Notification(
                user_id=admin.id,
                title="Stock Expiration Alert",
                message=f"Blood Stock Batch {batch.batch_number} ({batch.blood_group}) has expired on {batch.expiry_date}."
            )
            db.add(notif)
            
    db.commit()
    logger.info(f"Successfully processed {len(expired_batches)} expired stock items.")

def clean_expired_sessions_and_otps(db: Session):
    """Purges expired sessions and OTP entries from the database to maintain performance."""
    now = datetime.now(timezone.utc)
    
    # Delete expired OTPs
    deleted_otps = db.query(OTP).filter(
        (OTP.expires_at < now) | (OTP.is_used == True)
    ).delete()
    
    # Delete expired user sessions
    deleted_sessions = db.query(UserSession).filter(
        (UserSession.expires_at < now) | (UserSession.is_revoked == True)
    ).delete()
    
    db.commit()
    logger.info(f"Database cleanup complete. Purged {deleted_otps} OTPs and {deleted_sessions} Sessions.")

def notify_compatible_donors_for_request(db: Session, request_id: int):
    """Finds compatible donors for an urgent blood request and notifies them."""
    from app.models.request import BloodRequest
    
    req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not req or req.urgency.lower() not in ["urgent", "critical"]:
        return
        
    compatible_donors = search_compatible_donors(db, req.blood_group)
    notified_count = 0
    
    for donor_info in compatible_donors:
        if not donor_info["eligible"]:
            continue
            
        # Send Notification
        notif = Notification(
            user_id=donor_info["id"],
            title="Urgent Blood Donation Request",
            message=f"An urgent request for blood group {req.blood_group} has been opened at {req.hospital_name}. You are eligible to donate. Please schedule an appointment!"
        )
        db.add(notif)
        
        # Send Email
        email_body = f"""
        <h2>Urgent Blood Match Match Alert</h2>
        <p>Dear {donor_info['full_name']},</p>
        <p>There is an urgent request for blood group <strong>{req.blood_group}</strong> at {req.hospital_name}.</p>
        <p>As a registered donor, you are eligible to donate. Your contribution could save a life.</p>
        <p>Please log in to your dashboard to schedule a donation appointment.</p>
        """
        send_email(donor_info["email"], "Urgent Blood Donation Request", email_body)
        notified_count += 1
        
    db.commit()
    logger.info(f"Notified {notified_count} eligible donors for request {request_id} ({req.blood_group})")
