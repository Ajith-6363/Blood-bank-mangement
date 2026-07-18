import uuid
from datetime import datetime, date, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, PermissionChecker
from app.models.donation import Donation
from app.models.stock import BloodStock
from app.models.user import User
from app.models.notification import Notification
from app.schemas.donation import DonationOut, DonationCreate, DonationUpdate, EligibilityCheckResponse
from app.repositories import donation_repository, user_repository, stock_repository, audit_log_repository
from app.services.email import send_email
from app.websockets.manager import manager

router = APIRouter()

@router.post("/schedule", response_model=DonationOut, status_code=status.HTTP_201_CREATED)
def schedule_donation(
    donation_in: DonationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker("create:donation_appointment"))
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

    new_appt = donation_repository.create(db, obj_in={
        "donor_id": current_user.id,
        "blood_group": current_user.blood_group or donation_in.blood_group,
        "quantity": donation_in.quantity,
        "appointment_date": donation_in.appointment_date,
        "status": "scheduled"
    })

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
      <li><strong>Blood Group:</strong> {new_appt.blood_group}</li>
      <li><strong>Location:</strong> LifeLink Main Center</li>
    </ul>
    <p>Thank you for your generous contribution to saving lives!</p>
    """
    send_email(current_user.email, "Blood Donation Scheduled", email_body)

    return new_appt

@router.get("/my", response_model=List[DonationOut])
def get_my_donations(
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker("read:own_donations"))
):
    """Retrieve donation history and scheduled appointments for logged-in donor."""
    return donation_repository.get_by_donor(db, current_user.id)

@router.get("/eligibility-check", response_model=EligibilityCheckResponse)
def check_my_eligibility(
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker("read:own_profile"))
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
            
    return EligibilityCheckResponse(
        eligible=True,
        reason="You are eligible to donate whole blood today!",
        next_eligible_date=datetime.now()
    )

@router.get("/all", response_model=List[DonationOut])
def get_all_appointments(
    status: str = Query(None),
    blood_group: str = Query(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(PermissionChecker("read:donations"))
):
    """Admin/Staff view to search, filter, and audit all donation appointments."""
    query = db.query(Donation)
    if status:
        query = query.filter(Donation.status == status)
    if blood_group:
        query = query.filter(Donation.blood_group == blood_group)
    return query.order_by(Donation.appointment_date.desc()).all()

@router.patch("/{id}/status", response_model=DonationOut)
async def update_appointment_status(
    id: int,
    donation_in: DonationUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(PermissionChecker("approve:donations"))
):
    """
    Approve, complete, or cancel a donation appointment (Admin/Staff only).
    If COMPLETED, verify eligibility criteria and auto-create new stock batch.
    """
    appt = donation_repository.get(db, id)
    if not appt:
        raise HTTPException(status_code=404, detail="Donation appointment not found")

    donor = user_repository.get(db, appt.donor_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Donor profile not found")

    old_status = appt.status
    new_status = donation_in.status

    # Set parameters if present
    update_fields = {}
    if donation_in.hemoglobin_level is not None:
        update_fields["hemoglobin_level"] = donation_in.hemoglobin_level
    if donation_in.blood_pressure is not None:
        update_fields["blood_pressure"] = donation_in.blood_pressure
    if donation_in.temperature is not None:
        update_fields["temperature"] = donation_in.temperature
    if donation_in.pulse_rate is not None:
        update_fields["pulse_rate"] = donation_in.pulse_rate
    if donation_in.weight is not None:
        update_fields["weight"] = donation_in.weight
    if donation_in.doctor_name is not None:
        update_fields["doctor_name"] = donation_in.doctor_name
    if donation_in.medical_notes is not None:
        update_fields["medical_notes"] = donation_in.medical_notes
    if donation_in.remarks is not None:
        update_fields["remarks"] = donation_in.remarks

    if new_status:
        update_fields["status"] = new_status

    if new_status == "completed" and old_status != "completed":
        errors = []
        weight_val = donation_in.weight if donation_in.weight is not None else appt.weight
        hemo_val = donation_in.hemoglobin_level if donation_in.hemoglobin_level is not None else appt.hemoglobin_level
        
        if weight_val is not None and weight_val < 50:
            errors.append(f"Weight is below 50 kg (got {weight_val} kg)")
        if hemo_val is not None and hemo_val < 12.5:
            errors.append(f"Hemoglobin is below 12.5 g/dL (got {hemo_val} g/dL)")
        
        if errors:
            raise HTTPException(
                status_code=400,
                detail=f"Donor eligibility failure: {', '.join(errors)}"
            )

        update_fields["donation_date"] = datetime.now()
        update_fields["certificate_generated"] = True

        # Save details
        appt = donation_repository.update(db, db_obj=appt, obj_in=update_fields)

        # Auto create a new batch in stock
        batch_num = f"BB-{appt.blood_group.replace('+', 'P').replace('-', 'M')}-{uuid.uuid4().hex[:6].upper()}"
        col_date = date.today()
        exp_date = col_date + timedelta(days=42)

        stock_repository.create(db, obj_in={
            "batch_number": batch_num,
            "blood_group": appt.blood_group,
            "quantity": appt.quantity,
            "collection_date": col_date,
            "expiry_date": exp_date,
            "storage_location": "Fridge B, Shelf 1",
            "status": "available"
        })

        # Notify donor
        notif = Notification(
            user_id=donor.id,
            title="Blood Donation Completed!",
            message=f"Thank you for donating {appt.quantity} bags of {appt.blood_group} blood. Your certificate is ready to download."
        )
        db.add(notif)

        # Log admin audit trail
        audit_log_repository.log_action(
            db,
            admin_id=current_admin.id,
            action=f"Completed donation appt #{appt.id} and added stock batch {batch_num}."
        )

        # Send completion email
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

        # Broadcast WebSocket stock update
        await manager.broadcast({"event": "stock_updated", "source": "donation_completion", "blood_group": appt.blood_group})
    
    else:
        # Save other status changes (approved/cancelled)
        appt = donation_repository.update(db, db_obj=appt, obj_in=update_fields)
        
        if new_status == "approved":
            notif = Notification(
                user_id=donor.id,
                title="Donation Appointment Approved",
                message=f"Your appointment for {appt.appointment_date.strftime('%Y-%m-%d %H:%M')} has been approved."
            )
            db.add(notif)
            audit_log_repository.log_action(db, admin_id=current_admin.id, action=f"Approved donation appointment #{appt.id}.")
        elif new_status == "cancelled":
            notif = Notification(
                user_id=donor.id,
                title="Appointment Cancelled",
                message=f"Your donation appointment for {appt.appointment_date.strftime('%Y-%m-%d %H:%M')} was cancelled."
            )
            db.add(notif)
            audit_log_repository.log_action(db, admin_id=current_admin.id, action=f"Cancelled donation appointment #{appt.id}.")

    db.commit()
    return appt

@router.get("/{id}/certificate")
def get_certificate_data(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker("read:own_donations"))
):
    """Retrieve metadata required to generate a donation certificate."""
    appt = donation_repository.get(db, id)
    if not appt:
        raise HTTPException(status_code=404, detail="Donation record not found")
        
    if current_user.role != "admin" and appt.donor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this certificate")

    if not appt.certificate_generated or not appt.donation_date:
        raise HTTPException(status_code=400, detail="Certificate is not generated for this donation")

    donor = user_repository.get(db, appt.donor_id)

    return {
        "certificate_id": f"LL-CERT-{appt.id:05d}-{appt.donation_date.strftime('%Y%m%d')}",
        "donor_name": donor.full_name,
        "blood_group": appt.blood_group,
        "quantity_units": appt.quantity,
        "donation_date": appt.donation_date.strftime('%B %d, %Y'),
        "doctor_name": appt.doctor_name or "Medical Director",
        "hospital": "LifeLink Blood Bank Center"
    }
