import uuid
from datetime import date, datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_db, PermissionChecker
from app.models.stock import BloodStock
from app.models.user import User
from app.schemas.stock import BloodStockOut, BloodStockCreate, BloodStockUpdate, StockAnalytics, BloodStockGroupSummary
from app.repositories import stock_repository, audit_log_repository
from app.services.matching import get_compatible_donor_types
from app.websockets.manager import manager

router = APIRouter()

@router.get("", response_model=StockAnalytics)
def get_overall_stock(db: Session = Depends(get_db)):
    """
    Returns aggregated stock statistics. Available to all authenticated users.
    """
    # Total available bags
    total_avail = db.query(func.sum(BloodStock.quantity)).filter(
        BloodStock.status == "available"
    ).scalar() or 0

    groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    summaries = []
    today = date.today()
    
    for bg in groups:
        total = db.query(func.sum(BloodStock.quantity)).filter(
            BloodStock.blood_group == bg
        ).scalar() or 0
        
        available = db.query(func.sum(BloodStock.quantity)).filter(
            BloodStock.blood_group == bg,
            BloodStock.status == "available"
        ).scalar() or 0
        
        # Expiring in 7 days query (supports Postgres/SQLite)
        if db.bind.name == "sqlite":
            expiring_soon = db.query(func.sum(BloodStock.quantity)).filter(
                BloodStock.blood_group == bg,
                BloodStock.status == "available",
                func.date(BloodStock.expiry_date) <= func.date(today, "+7 days"),
                BloodStock.expiry_date >= today
            ).scalar() or 0
        else:
            expiring_soon = db.query(func.sum(BloodStock.quantity)).filter(
                BloodStock.blood_group == bg,
                BloodStock.status == "available",
                BloodStock.expiry_date <= today + timedelta(days=7),
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

@router.get("/batches", response_model=List[BloodStockOut])
def get_stock_batches(
    status: str = Query(None),
    blood_group: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker("read:stock"))
):
    """List detailed blood batches in refrigerator inventory."""
    query = db.query(BloodStock)
    if status:
        query = query.filter(BloodStock.status == status)
    if blood_group:
        query = query.filter(BloodStock.blood_group == blood_group)
        
    today = date.today()
    batches = query.order_by(BloodStock.expiry_date.asc()).all()
    
    updated = False
    for b in batches:
        if b.expiry_date < today and b.status == "available":
            b.status = "expired"
            updated = True
            
    if updated:
        db.commit()
        # Broadcast stock update
        import asyncio
        asyncio.create_task(manager.broadcast({"event": "stock_updated", "source": "system_auto_expire"}))
        
    return batches

@router.post("", response_model=BloodStockOut, status_code=status.HTTP_201_CREATED)
async def add_blood_batch(
    stock_in: BloodStockCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(PermissionChecker("write:stock"))
):
    """Register a new blood unit batch. Logs in audit trail and broadcasts update."""
    if stock_in.blood_group not in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]:
        raise HTTPException(status_code=400, detail="Invalid blood group")

    batch_num = f"BB-{stock_in.blood_group.replace('+', 'P').replace('-', 'M')}-{uuid.uuid4().hex[:6].upper()}"
    
    new_batch = stock_repository.create(db, obj_in={
        "batch_number": batch_num,
        "blood_group": stock_in.blood_group,
        "quantity": stock_in.quantity,
        "collection_date": stock_in.collection_date,
        "expiry_date": stock_in.expiry_date,
        "storage_location": stock_in.storage_location,
        "status": stock_in.status
    })

    audit_log_repository.log_action(
        db, 
        admin_id=current_admin.id, 
        action=f"Created blood batch {batch_num} ({stock_in.quantity} units {stock_in.blood_group})"
    )

    # Broadcast websocket update
    await manager.broadcast({"event": "stock_updated", "source": "add_batch", "blood_group": stock_in.blood_group})
    
    return new_batch

@router.put("/{batch_number}", response_model=BloodStockOut)
async def update_blood_batch(
    batch_number: str,
    stock_in: BloodStockUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(PermissionChecker("write:stock"))
):
    """Update details of a batch and notify WS clients."""
    batch = stock_repository.get_by_batch(db, batch_number)
    if not batch:
        raise HTTPException(status_code=404, detail="Blood batch not found")

    changes = []
    update_data = {}
    
    if stock_in.quantity is not None:
        changes.append(f"quantity: {batch.quantity} -> {stock_in.quantity}")
        update_data["quantity"] = stock_in.quantity
    if stock_in.storage_location is not None:
        changes.append(f"location: {batch.storage_location} -> {stock_in.storage_location}")
        update_data["storage_location"] = stock_in.storage_location
    if stock_in.status is not None:
        changes.append(f"status: {batch.status} -> {stock_in.status}")
        update_data["status"] = stock_in.status
    if stock_in.expiry_date is not None:
        changes.append(f"expiry: {batch.expiry_date} -> {stock_in.expiry_date}")
        update_data["expiry_date"] = stock_in.expiry_date

    updated_batch = stock_repository.update(db, db_obj=batch, obj_in=update_data)

    if changes:
        audit_log_repository.log_action(
            db, 
            admin_id=current_admin.id, 
            action=f"Updated batch {batch_number}: {', '.join(changes)}"
        )
        # Broadcast websocket update
        await manager.broadcast({"event": "stock_updated", "source": "update_batch", "batch_number": batch_number})

    return updated_batch

@router.get("/compatible/{recipient_blood_group}", response_model=List[BloodStockOut])
def get_compatible_batches(
    recipient_blood_group: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker("read:stock"))
):
    """Get all available blood batches compatible with recipient blood group."""
    compatible_types = get_compatible_donor_types(recipient_blood_group)
    batches = db.query(BloodStock).filter(
        BloodStock.blood_group.in_(compatible_types),
        BloodStock.status == "available",
        BloodStock.expiry_date >= date.today()
    ).order_by(BloodStock.expiry_date.asc()).all()

    return batches
