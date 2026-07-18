from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.request import BloodRequest
from app.models.stock import BloodStock
from app.models.user import User
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.schemas.request import BloodRequestOut, BloodRequestCreate, BloodRequestUpdate
from app.dependencies.auth import get_current_active_user, verify_admin, verify_hospital
from app.services.matching import get_compatible_donor_types
from app.services.email import send_email

router = APIRouter(prefix="/requests", tags=["Blood Requests Management"])

@router.post("/create", response_model=BloodRequestOut, status_code=status.HTTP_201_CREATED)
def create_blood_request(
    request_in: BloodRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a blood request.
    Available to Recipients, Hospitals, and Admins.
    """
    if current_user.role not in ["recipient", "hospital", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to request blood units."
        )

    if request_in.blood_group not in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]:
        raise HTTPException(status_code=400, detail="Invalid blood group")

    new_request = BloodRequest(
        requester_id=current_user.id,
        blood_group=request_in.blood_group,
        quantity=request_in.quantity,
        patient_name=request_in.patient_name,
        patient_age=request_in.patient_age,
        doctor_name=request_in.doctor_name,
        hospital_name=request_in.hospital_name,
        hospital_address=request_in.hospital_address,
        contact_person=request_in.contact_person,
        urgency=request_in.urgency,
        expected_delivery=request_in.expected_delivery,
        reason=request_in.reason,
        status="pending"
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    # Notify requester
    notif = Notification(
        user_id=current_user.id,
        title="Blood Request Registered",
        message=f"Request #{new_request.id} for {request_in.quantity} units of {request_in.blood_group} has been submitted."
    )
    db.add(notif)
    
    # Notify Admin about critical/urgent request
    if request_in.urgency in ["critical", "urgent"]:
        # Find all admins
        admins = db.query(User).filter(User.role == "admin").all()
        for admin in admins:
            admin_notif = Notification(
                user_id=admin.id,
                title="URGENT: Blood Request Submitted",
                message=f"Request #{new_request.id} ({request_in.blood_group}) is marked as {request_in.urgency}!"
            )
            db.add(admin_notif)
            
    db.commit()

    # Send confirmation email
    email_body = f"""
    <h2>Blood Request Received</h2>
    <p>Hi {current_user.full_name},</p>
    <p>Your blood request #{new_request.id} has been registered successfully. Our team is processing it.</p>
    <ul>
      <li><strong>Patient Name:</strong> {request_in.patient_name}</li>
      <li><strong>Blood Group:</strong> {request_in.blood_group}</li>
      <li><strong>Quantity:</strong> {request_in.quantity} unit(s)</li>
      <li><strong>Urgency:</strong> {request_in.urgency}</li>
      <li><strong>Hospital:</strong> {request_in.hospital_name}</li>
    </ul>
    <p>We will notify you immediately once the request status updates.</p>
    """
    send_email(current_user.email, f"LifeLink Blood Request #{new_request.id} Registered", email_body)

    return new_request

@router.get("/my", response_model=list[BloodRequestOut])
def get_my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve blood request logs submitted by the logged-in user."""
    return db.query(BloodRequest).filter(BloodRequest.requester_id == current_user.id).order_by(BloodRequest.request_date.desc()).all()

@router.get("/all", response_model=list[BloodRequestOut])
def get_all_requests(
    status: str = Query(None, description="Filter by status (pending, approved, rejected, fulfilled)"),
    blood_group: str = Query(None, description="Filter by blood group"),
    urgency: str = Query(None, description="Filter by urgency"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(verify_admin)
):
    """Admin-only route to search, filter, and audit all blood requests in the system."""
    query = db.query(BloodRequest)
    if status:
        query = query.filter(BloodRequest.status == status)
    if blood_group:
        query = query.filter(BloodRequest.blood_group == blood_group)
    if urgency:
        query = query.filter(BloodRequest.urgency == urgency)
    return query.order_by(BloodRequest.request_date.desc()).all()

@router.patch("/{id}/status", response_model=BloodRequestOut)
def update_request_status(
    id: int,
    request_in: BloodRequestUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(verify_admin)
):
    """
    Approve, Reject, or Fulfill a blood request (Admin only).
    Fulfillment will auto-deduct compatible stock batches using FIFO (expiry date logic).
    Logs actions in Audit Log.
    """
    req = db.query(BloodRequest).filter(BloodRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    requester = db.query(User).filter(User.id == req.requester_id).first()
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")

    old_status = req.status
    new_status = request_in.status

    if new_status == "fulfilled" and old_status != "fulfilled":
        # FIFO Matching and stock deduction
        compatible_groups = get_compatible_donor_types(req.blood_group)
        
        # Get available stock batches ordered by expiration (closest to expiry first to prevent waste)
        available_stock = db.query(BloodStock).filter(
            BloodStock.blood_group.in_(compatible_groups),
            BloodStock.status == "available"
        ).order_by(BloodStock.expiry_date.asc()).all()

        total_available = sum(batch.quantity for batch in available_stock)
        needed = req.quantity

        if total_available < needed:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock to fulfill request. Requested: {needed} units of {req.blood_group}. Available compatible: {total_available} units."
            )

        # Deduct stock
        deducted_details = []
        for batch in available_stock:
            if needed <= 0:
                break
            
            if batch.quantity <= needed:
                # Consume entire batch
                needed -= batch.quantity
                deducted_details.append(f"{batch.batch_number} ({batch.quantity} units {batch.blood_group})")
                batch.quantity = 0
                batch.status = "transfused"
            else:
                # Consume part of batch
                batch.quantity -= needed
                deducted_details.append(f"{batch.batch_number} ({needed} units {batch.blood_group})")
                needed = 0

        req.fulfilled_quantity = req.quantity
        req.status = "fulfilled"
        req.action_date = datetime.now()

        # Audit Log
        log = AuditLog(
            admin_id=current_admin.id,
            action=f"Fulfilled request #{req.id} for patient {req.patient_name}. Stock deducted from: {', '.join(deducted_details)}."
        )
        db.add(log)

        # Notify Requester
        notif = Notification(
            user_id=requester.id,
            title="Blood Request FULFILLED",
            message=f"Great news! Your blood request #{req.id} has been fulfilled and dispatched."
        )
        db.add(notif)

        # Email Notification
        email_body = f"""
        <h2>Blood Request Fulfilled!</h2>
        <p>Hi {requester.full_name},</p>
        <p>We are pleased to inform you that your blood request #{req.id} has been **Fulfilled** and units are ready for transit.</p>
        <ul>
          <li><strong>Patient Name:</strong> {req.patient_name}</li>
          <li><strong>Blood Group:</strong> {req.blood_group}</li>
          <li><strong>Fulfilled Quantity:</strong> {req.quantity} unit(s)</li>
          <li><strong>Hospital Location:</strong> {req.hospital_name}</li>
        </ul>
        <p>Please coordinate with LifeLink main desk if transport verification code is required.</p>
        """
        send_email(requester.email, f"LifeLink Blood Request #{req.id} FULFILLED", email_body)

    elif new_status == "approved" and old_status != "approved":
        req.status = "approved"
        req.action_date = datetime.now()

        # Audit Log
        log = AuditLog(
            admin_id=current_admin.id,
            action=f"Approved blood request #{req.id}."
        )
        db.add(log)

        # Notify Requester
        notif = Notification(
            user_id=requester.id,
            title="Blood Request Approved",
            message=f"Your request #{req.id} has been approved. Dispatch fulfillment is in progress."
        )
        db.add(notif)

        # Email
        email_body = f"""
        <h2>Blood Request Approved</h2>
        <p>Hi {requester.full_name},</p>
        <p>Your blood request #{req.id} has been **Approved** by the medical administrator.</p>
        <p>Fulfillment preparation is underway.</p>
        """
        send_email(requester.email, f"LifeLink Blood Request #{req.id} Approved", email_body)

    elif new_status == "rejected" and old_status != "rejected":
        req.status = "rejected"
        req.action_date = datetime.now()

        # Audit Log
        log = AuditLog(
            admin_id=current_admin.id,
            action=f"Rejected blood request #{req.id}."
        )
        db.add(log)

        # Notify Requester
        notif = Notification(
            user_id=requester.id,
            title="Blood Request Rejected",
            message=f"We regret to inform you that your request #{req.id} was rejected."
        )
        db.add(notif)

        # Email
        email_body = f"""
        <h2>Blood Request Notification</h2>
        <p>Hi {requester.full_name},</p>
        <p>Your blood request #{req.id} was reviewed and **Rejected** due to validation limits or stock criteria.</p>
        <p>Please contact support for more details.</p>
        """
        send_email(requester.email, f"LifeLink Blood Request #{req.id} Rejected", email_body)

    db.commit()
    db.refresh(req)
    return req
