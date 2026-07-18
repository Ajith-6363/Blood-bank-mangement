from datetime import datetime, date, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.api.deps import get_db, PermissionChecker
from app.models.user import User
from app.models.donation import Donation
from app.models.request import BloodRequest
from app.models.stock import BloodStock
from app.models.audit_log import AuditLog
from app.repositories import audit_log_repository

router = APIRouter()

@router.get("/dashboard")
def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(PermissionChecker("read:analytics"))
):
    """
    Consolidated analytics for Admin dashboard:
    Total stats, blood distributions, trend graphs, warnings, and audit logs.
    """
    today = date.today()
    start_of_today = datetime.combine(today, datetime.min.time())

    # User counts
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_donors = db.query(func.count(User.id)).filter(User.role == "donor").scalar() or 0
    total_hospitals = db.query(func.count(User.id)).filter(User.role == "hospital").scalar() or 0
    total_recipients = db.query(func.count(User.id)).filter(User.role == "recipient").scalar() or 0

    # Donation counts
    today_donations = db.query(func.count(Donation.id)).filter(
        Donation.status == "completed",
        Donation.donation_date >= start_of_today
    ).scalar() or 0

    # Requests counts
    pending_requests = db.query(func.count(BloodRequest.id)).filter(
        BloodRequest.status == "pending"
    ).scalar() or 0
    completed_requests = db.query(func.count(BloodRequest.id)).filter(
        BloodRequest.status == "fulfilled"
    ).scalar() or 0

    # Stock warning (Blood groups with stock < 5 bags)
    groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    low_stock = []
    blood_distribution = {}
    
    for bg in groups:
        avail_units = db.query(func.sum(BloodStock.quantity)).filter(
            BloodStock.blood_group == bg,
            BloodStock.status == "available"
        ).scalar() or 0
        
        blood_distribution[bg] = int(avail_units)
        if avail_units < 5:
            low_stock.append({"blood_group": bg, "units": int(avail_units)})

    # Recent activity logs (Audit logs, recent requests, and donations combined)
    recent_audit = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(5).all()
    audit_activities = [
        {
            "id": log.id,
            "type": "audit",
            "message": log.action,
            "timestamp": log.timestamp
        }
        for log in recent_audit
    ]

    recent_requests = db.query(BloodRequest).order_by(BloodRequest.request_date.desc()).limit(5).all()
    request_activities = [
        {
            "id": req.id,
            "type": "request",
            "message": f"Blood request #{req.id} ({req.quantity} units {req.blood_group}) submitted for {req.patient_name}.",
            "timestamp": req.request_date
        }
        for req in recent_requests
    ]

    recent_donations = db.query(Donation).order_by(Donation.appointment_date.desc()).limit(5).all()
    donation_activities = [
        {
            "id": d.id,
            "type": "donation",
            "message": f"Appointment scheduled for {d.blood_group} by donor ID {d.donor_id}.",
            "timestamp": d.appointment_date
        }
        for d in recent_donations
    ]

    recent_activities = sorted(
        audit_activities + request_activities + donation_activities,
        key=lambda x: x["timestamp"],
        reverse=True
    )[:10]

    # Monthly completed donations count (for trend charts - last 6 months)
    monthly_trends = []
    for i in range(5, -1, -1):
        target_date = date.today() - timedelta(days=i*30)
        month_start = date(target_date.year, target_date.month, 1)
        if target_date.month == 12:
            month_end = date(target_date.year + 1, 1, 1)
        else:
            month_end = date(target_date.year, target_date.month + 1, 1)
            
        cnt = db.query(func.count(Donation.id)).filter(
            Donation.status == "completed",
            Donation.donation_date >= datetime.combine(month_start, datetime.min.time()),
            Donation.donation_date < datetime.combine(month_end, datetime.min.time())
        ).scalar() or 0
        
        monthly_trends.append({
            "month": month_start.strftime("%b %Y"),
            "completed_donations": cnt
        })

    # Top donors
    top_donors_query = db.query(
        User.id,
        User.full_name,
        User.email,
        User.blood_group,
        func.count(Donation.id).label("donation_count")
    ).join(Donation, Donation.donor_id == User.id).filter(
        Donation.status == "completed"
    ).group_by(User.id).order_by(desc("donation_count")).limit(5).all()

    top_donors = [
        {
            "id": d[0],
            "full_name": d[1],
            "email": d[2],
            "blood_group": d[3],
            "donation_count": d[4]
        }
        for d in top_donors_query
    ]

    return {
        "summary": {
            "total_users": total_users,
            "total_donors": total_donors,
            "total_hospitals": total_hospitals,
            "total_recipients": total_recipients,
            "today_donations": today_donations,
            "pending_requests": pending_requests,
            "completed_requests": completed_requests
        },
        "low_stock_alerts": low_stock,
        "blood_distribution": blood_distribution,
        "monthly_donation_trends": monthly_trends,
        "recent_activities": recent_activities,
        "top_donors": top_donors
    }

@router.get("/audit-logs")
def get_audit_trail(
    db: Session = Depends(get_db),
    current_admin: User = Depends(PermissionChecker("read:audit_logs"))
):
    """Retrieve database audit trail (Admin only)."""
    logs = audit_log_repository.get_logs(db, limit=100)
    
    result = []
    for log in logs:
        admin_name = db.query(User.full_name).filter(User.id == log.admin_id).scalar() or "System"
        result.append({
            "id": log.id,
            "admin_name": admin_name,
            "action": log.action,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp
        })
        
    return result
