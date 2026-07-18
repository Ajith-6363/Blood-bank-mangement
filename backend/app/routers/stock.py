import uuid
from datetime import date, datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.stock import BloodStock
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.stock import BloodStockOut, BloodStockCreate, BloodStockUpdate, StockAnalytics, BloodStockGroupSummary
from app.dependencies.auth import get_current_active_user, verify_admin, verify_hospital
from app.services.matching import get_compatible_donor_types

router = APIRouter(prefix="/stock", tags=["Blood Stock Management"])

@router.get("", response_model=StockAnalytics)
def get_overall_stock(
    db: Session = Depends(get_db)
):
    """
    Returns aggregated stock statistics and warning counts.
    Available to all logged-in users.
    """
    # Expiry threshold: expiring in 7 days
    today = date.today()
    expiring_threshold = today + func.cast(func.concat(7, ' day'), func.Interval) if not db.bind.name == 'sqlite' else func.date(today, '+7 days')

    # Total available bags
    total_avail = db.query(func.sum(BloodStock.quantity)).filter(
        BloodStock.status == "available"
    ).scalar() or 0

    # Group by blood type
    groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    summaries = []
    
    for bg in groups:
        # Total bags in system
        total = db.query(func.sum(BloodStock.quantity)).filter(
            BloodStock.blood_group == bg
        ).scalar() or 0
        
        # Available bags
        available = db.query(func.sum(BloodStock.quantity)).filter(
            BloodStock.blood_group == bg,
            BloodStock.status == "available"
        ).scalar() or 0
        
        # Expiring soon bags
        if db.bind.name == 'sqlite':
            expiring_soon = db.query(func.sum(BloodStock.quantity)).filter(
                BloodStock.blood_group == bg,
                BloodStock.status == "available",
                BloodStock.expiry_date <= today + func.cast(timedelta(days=7), func.Date) if False else func.date(BloodStock.expiry_date) <= func.date(today, '+7 days'),
                BloodStock.expiry_date >= today
            ).scalar() or 0
        else:
            # Postgres version
            expiring_soon = db.query(func.sum(BloodStock.quantity)).filter(
                BloodStock.blood_group == bg,
                BloodStock.status == "available",
                BloodStock.expiry_date <= today + func.cast(timedelta(days=7), func.Date) if False else BloodStock.expiry_date <= today + func.cast('7 days', func.Interval),
                BloodStock.expiry_date >= today
            ).scalar() or 0
            
        summaries.append(
            BloodStockGroupSummary(
                blood_group=bg,
                total_bags=total,
                available_bags=available,
                expiring_soon_bags=expiring_soon
            )
        )

    return StockAnalytics(
        total_available_units=total_avail,
        group_summaries=summaries
    )

@router.get("/batches", response_model=list[BloodStockOut])
def get_stock_batches(
    status: str = Query(None, description="Filter by status (available, reserved, expired, transfused)"),
    blood_group: str = Query(None, description="Filter by blood group"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List detailed blood batches in refrigerator inventory."""
    query = db.query(BloodStock)
    if status:
        query = query.filter(BloodStock.status == status)
    if blood_group:
        query = query.filter(BloodStock.blood_group == blood_group)
    
    # Auto expire batches on retrieval
    today = date.today()
    batches = query.order_by(BloodStock.expiry_date.asc()).all()
    
    updated = False
    for b in batches:
        if b.expiry_date < today and b.status == "available":
            b.status = "expired"
            updated = True
    if updated:
        db.commit()
        
    return batches

@router.post("", response_model=BloodStockOut, status_code=status.HTTP_201_CREATED)
def add_blood_batch(
    stock_in: BloodStockCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(verify_admin)
):
    """
    Manually register a blood unit batch.
    Only available to Admin users. Logs action in Audit Trail.
    """
    if stock_in.blood_group not in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]:
        raise HTTPException(status_code=400, detail="Invalid blood group")

    # Generate batch number
    batch_num = f"BB-{stock_in.blood_group.replace('+', 'P').replace('-', 'M')}-{uuid.uuid4().hex[:6].upper()}"
    
    new_batch = BloodStock(
        batch_number=batch_num,
        blood_group=stock_in.blood_group,
        quantity=stock_in.quantity,
        collection_date=stock_in.collection_date,
        expiry_date=stock_in.expiry_date,
        storage_location=stock_in.storage_location,
        status=stock_in.status
    )
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)

    # Log in Audit trail
    log = AuditLog(
        admin_id=current_admin.id,
        action=f"Manually created blood batch {batch_num} ({stock_in.quantity} units {stock_in.blood_group})"
    )
    db.add(log)
    db.commit()

    return new_batch

@router.put("/{batch_number}", response_model=BloodStockOut)
def update_blood_batch(
    batch_number: str,
    stock_in: BloodStockUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(verify_admin)
):
    """
    Update batch details (quantity, storage location, status).
    Only available to Admin users. Logs in Audit Trail.
    """
    batch = db.query(BloodStock).filter(BloodStock.batch_number == batch_number).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Blood batch not found")

    changes = []
    if stock_in.quantity is not None:
        changes.append(f"quantity: {batch.quantity} -> {stock_in.quantity}")
        batch.quantity = stock_in.quantity
    if stock_in.storage_location is not None:
        changes.append(f"location: {batch.storage_location} -> {stock_in.storage_location}")
        batch.storage_location = stock_in.storage_location
    if stock_in.status is not None:
        changes.append(f"status: {batch.status} -> {stock_in.status}")
        batch.status = stock_in.status
    if stock_in.expiry_date is not None:
        changes.append(f"expiry: {batch.expiry_date} -> {stock_in.expiry_date}")
        batch.expiry_date = stock_in.expiry_date

    db.commit()
    db.refresh(batch)

    # Log audit trail
    if changes:
        log = AuditLog(
            admin_id=current_admin.id,
            action=f"Updated batch {batch_number}: {', '.join(changes)}"
        )
        db.add(log)
        db.commit()

    return batch

@router.get("/compatible/{recipient_blood_group}", response_model=list[BloodStockOut])
def get_compatible_batches(
    recipient_blood_group: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_hospital)
):
    """
    Get all available blood batches compatible with the recipient blood group.
    Available to Hospitals and Admins.
    """
    compatible_types = get_compatible_donor_types(recipient_blood_group)
    batches = db.query(BloodStock).filter(
        BloodStock.blood_group.in_(compatible_types),
        BloodStock.status == "available",
        BloodStock.expiry_date >= date.today()
    ).order_by(BloodStock.expiry_date.asc()).all()

    return batches
