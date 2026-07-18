from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, PermissionChecker
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationOut
from app.repositories import notification_repository

router = APIRouter()

@router.get("", response_model=List[NotificationOut])
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker("read:notifications"))
):
    """Retrieve all notifications for the current logged-in user."""
    return notification_repository.get_by_user(db, current_user.id)

@router.put("/{id}/read", response_model=NotificationOut)
def mark_as_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker("write:notifications"))
):
    """Mark a single notification as read."""
    notif = notification_repository.get(db, id)
    if not notif or notif.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.put("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(PermissionChecker("write:notifications"))
):
    """Mark all unread notifications for current user as read."""
    count = notification_repository.mark_all_as_read(db, current_user.id)
    return {"message": f"{count} notifications marked as read."}
