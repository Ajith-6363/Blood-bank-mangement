from datetime import datetime, date, timedelta, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.donation import Donation
from app.models.stock import BloodStock
from app.models.user import User
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.schemas.donation import DonationOut, DonationCreate, DonationUpdate, EligibilityCheckResponse
from app.dependencies.auth import get_current_active_user, verify_admin, verify_donor
from app.services.email import send_email

router = APIRouter(prefix="/donations", tags=["Donations & Appointments"])

@router.post("/schedule", response_model=DonationOut, status_code=status.HTTP_201_CREATED)
def schedule_donation(
    donation_in: DonationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_donor)
):
    """
    Schedule a donation appointment.
    Checks donor's last donation date. Must be > 56 days ago.
    """
    # Eligibility check based on history
    last_completed = db.query(Donation).filter(
        Donation.donor_id == current_user.id,
        Donation.status == "completed"
    ).order_by(Donation.donation_date.desc()).first()

    if last_completed and last_completed.donation_date:
        days_since = (datetime.now(timezone.utc) - last_completed.donation_date.replace(tzinfo=timezone.utc)).days
        if days_since < 56:
            next_date = last_completed.donation_date + timedelta(days=56)
            raise HTTPException(
                status_code=400,
                detail=f"You must wait 56 days between donations. You will be eligible on {next_date.strftime('%Y-%m-%d')}."
            )

    new_appt = Donation(
        donor_id=current_user.id,
        blood_group=current_user.blood_group or donation_in.blood_group,
        quantity=donation_in.quantity,
        appointment_date=donation_in.appointment_date,
        status="scheduled"
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)

    # Notification
    notif = Notification(
        user_id=current_user.id,
        title="Donation Scheduled",
        message=f"Your appointment is set for {donation_in.appointment_date.strftime('%Y-%m-%d %H:%M')}. Please ensure you are well hydrated."
    )
    db.add(notif)
    db.commit()

    # Email
    email_body = f"""
    <h2>Donation Appointment Scheduled</h2>
    <p>Hi {current_user.full_name},</p>
    <p>Your blood donation appointment has been successfully scheduled.</p>
    <ul>
      <li><strong>Date & Time:</strong> {donation_in.appointment_date.strftime('%Y-%m-%d %H:%M')}</li>
      <li><strong>Blood Group:</strong> {donation_in.blood_group}</li>
      <li><strong>Location:</strong> LifeLink Main Center</li>
    </ul>
    <p>Thank you for your generous contribution to saving lives!</p>
    """
    send_email(current_user.email, "Blood Donation Scheduled", email_body)

    return new_appt

@router.get("/my", response_model=list[DonationOut])
def get_my_donations(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_donor)
):
    """Retrieve donation history and scheduled appointments for logged-in donor."""
    return db.query(Donation).filter(Donation.donor_id == current_user.id).order_by(Donation.appointment_date.desc()).all()

@router.get("/eligibility-check", response_model=EligibilityCheckResponse)
def check_my_eligibility(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_donor)
):
    """Check donor eligibility based on historical records."""
    last_completed = db.query(Donation).filter(
        Donation.donor_id == current_user.id,
        Donation.status == "completed"
    ).order_by(Donation.donation_date.desc()).first()

    if last_completed and last_completed.donation_date:
        days_since = (datetime.now(timezone.utc) - last_completed.donation_date.replace(tzinfo=timezone.utc)).days
        if days_since < 56:
            next_date = last_completed.donation_date + timedelta(days=56)
            return EligibilityCheckResponse(
                eligible=False,
                reason=f"Only {days_since} days since last donation. Next eligible date: {next_date.strftime('%Y-%m-%d')}.",
                next_eligible_date=next_date
            )
            
    # Age Check if profile date exists (standard eligibility threshold fallback)
    return EligibilityCheckResponse(
        eligible=True,
        reason="You are eligible to donate whole blood today!",
        next_eligible_date=datetime.now()
    )

@router.get("/all", response_model=list[DonationOut])
def get_all_appointments(
    status: str = Query(None, description="Filter by status (scheduled, approved, completed, cancelled)"),
    blood_group: str = Query(None, description="Filter by blood group"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(verify_admin)
):
    """Admin-only view to search, filter, and audit all donation appointments."""
    query = db.query(Donation)
    if status:
        query = query.filter(Donation.status == status)
    if blood_group:
        query = query.filter(Donation.blood_group == blood_group)
    return query.order_by(Donation.appointment_date.desc()).all()

@router.patch("/{id}/status", response_model=DonationOut)
def update_appointment_status(
    id: int,
    donation_in: DonationUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(verify_admin)
):
    """
    Approve, complete, or cancel a donation appointment (Admin only).
    If COMPLETED, verify eligibility criteria and auto-create new stock batch.
    """
    appt = db.query(Donation).filter(Donation.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Donation appointment not found")

    donor = db.query(User).filter(User.id == appt.donor_id).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor profile not found")

    old_status = appt.status
    new_status = donation_in.status

    # Set parameters if present
    if donation_in.hemoglobin_level is not None:
        appt.hemoglobin_level = donation_in.hemoglobin_level
    if donation_in.blood_pressure is not None:
        appt.blood_pressure = donation_in.blood_pressure
    if donation_in.temperature is not None:
        appt.temperature = donation_in.temperature
    if donation_in.pulse_rate is not None:
        appt.pulse_rate = donation_in.pulse_rate
    if donation_in.weight is not None:
        appt.weight = donation_in.weight
    if donation_in.doctor_name is not None:
        appt.doctor_name = donation_in.doctor_name
    if donation_in.medical_notes is not None:
        appt.medical_notes = donation_in.medical_notes
    if donation_in.remarks is not None:
        appt.remarks = donation_in.remarks

    if new_status:
        appt.status = new_status

    if new_status == "completed" and old_status != "completed":
        # Make sure health metrics are set or check them
        # Minimum hemoglobin = 12.5, minimum weight = 50 kg, pulse rate 60-100
        # If any of these parameters are specified, validate them
        errors = []
        if appt.weight is not None and appt.weight < 50:
            errors.append(f"Weight is below 50 kg (got {appt.weight} kg)")
        if appt.hemoglobin_level is not None and appt.hemoglobin_level < 12.5:
            errors.append(f"Hemoglobin is below 12.5 g/dL (got {appt.hemoglobin_level} g/dL)")
        
        if errors:
            raise HTTPException(
                status_code=400,
                detail=f"Donor did not meet eligibility criteria for completion: {', '.join(errors)}"
            )

        appt.donation_date = datetime.now()
        appt.certificate_generated = True

        # Auto create a new batch in stock
        batch_num = f"BB-{appt.blood_group.replace('+', 'P').replace('-', 'M')}-{uuid.uuid4().hex[:6].upper()}"
        col_date = date.today()
        # Red blood cells standard expiry is 42 days
        exp_date = col_date + timedelta(days=42)

        new_stock = BloodStock(
            batch_number=batch_num,
            blood_group=appt.blood_group,
            quantity=appt.quantity,
            collection_date=col_date,
            expiry_date=exp_date,
            storage_location="Fridge B",
            status="available"
        )
        db.add(new_stock)

        # Notify donor of certificate and completion
        notif = Notification(
            user_id=donor.id,
            title="Blood Donation Completed!",
            message=f"Thank you for donating {appt.quantity} bags of {appt.blood_group} blood. Your certificate is ready to download."
        )
        db.add(notif)

        # Log admin audit trail
        log = AuditLog(
            admin_id=current_admin.id,
            action=f"Completed donation appt #{appt.id} and added stock batch {batch_num}."
        )
        db.add(log)

        # Send completion email with Certificate info
        email_body = f"""
        <h2>Thank You for Saving Lives!</h2>
        <p>Hi {donor.full_name},</p>
        <p>Your blood donation appointment has been marked as <strong>Completed</strong>.</p>
        <p><strong>Details:</strong></p>
        <ul>
          <li><strong>Blood Group:</strong> {appt.blood_group}</li>
          <li><strong>Quantity:</strong> {appt.quantity} unit(s)</li>
          <li><strong>Date:</strong> {appt.donation_date.strftime('%Y-%m-%d')}</li>
        </ul>
        <p>Your digital donation certificate has been generated and is available for download on your dashboard.</p>
        <p>Best regards,<br/>LifeLink Team</p>
        """
        send_email(donor.email, "LifeLink Blood Donation Certificate Ready!", email_body)
    
    elif new_status == "approved" and old_status != "approved":
        notif = Notification(
            user_id=donor.id,
            title="Donation Appointment Approved",
            message=f"Your appointment for {appt.appointment_date.strftime('%Y-%m-%d %H:%M')} has been approved."
        )
        db.add(notif)
        
        # Audit Log
        log = AuditLog(
            admin_id=current_admin.id,
            action=f"Approved donation appointment #{appt.id}."
        )
        db.add(log)

    elif new_status == "cancelled" and old_status != "cancelled":
        notif = Notification(
            user_id=donor.id,
            title="Appointment Cancelled",
            message=f"Your donation appointment for {appt.appointment_date.strftime('%Y-%m-%d %H:%M')} was cancelled."
        )
        db.add(notif)
        
        # Audit Log
        log = AuditLog(
            admin_id=current_admin.id,
            action=f"Cancelled donation appointment #{appt.id}."
        )
        db.add(log)

    db.commit()
    db.refresh(appt)
    return appt

@router.get("/{id}/certificate")
def get_certificate_data(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve metadata required to generate a donation certificate."""
    appt = db.query(Donation).filter(Donation.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Donation record not found")
        
    if current_user.role != "admin" and appt.donor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this certificate")

    if not appt.certificate_generated or not appt.donation_date:
        raise HTTPException(status_code=400, detail="Certificate is not generated for this donation")

    donor = db.query(User).filter(User.id == appt.donor_id).first()

    return {
        "certificate_id": f"LL-CERT-{appt.id:05d}-{appt.donation_date.strftime('%Y%m%d')}",
        "donor_name": donor.full_name,
        "blood_group": appt.blood_group,
        "quantity_units": appt.quantity,
        "donation_date": appt.donation_date.strftime('%B %d, %Y'),
        "doctor_name": appt.doctor_name or "Medical Director",
        "hospital": "LifeLink Blood Bank Center"
    }
