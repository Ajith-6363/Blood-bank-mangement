from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, PermissionChecker
from app.models.user import User
from app.schemas.user import UserOut, UserUpdate
from app.repositories import user_repository, audit_log_repository

router = APIRouter()

@router.get("", response_model=List[UserOut])
def list_all_users(
    role: str = Query(None),
    is_active: bool = Query(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(PermissionChecker("read:users"))
):
    """List all registered users (Admin only)."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    return query.all()

@router.put("/{id}/toggle-active", response_model=UserOut)
def toggle_user_active(
    id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(PermissionChecker("write:users"))
):
    """Toggle user active/suspended state (Admin only)."""
    if id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot suspend yourself.")
        
    user = user_repository.get(db, id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    state = "activated" if user.is_active else "suspended/deactivated"
    audit_log_repository.log_action(
        db,
        admin_id=current_admin.id,
        action=f"Admin {state} user account for {user.email} (ID: {user.id})"
    )

    return user

@router.put("/{id}/verify", response_model=UserOut)
def verify_user_account(
    id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(PermissionChecker("write:users"))
):
    """Approve/verify hospital or donor verification status (Admin only)."""
    user = user_repository.get(db, id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_verified = True
    db.commit()
    db.refresh(user)

    audit_log_repository.log_action(
        db,
        admin_id=current_admin.id,
        action=f"Admin verified credentials/details for user: {user.email}"
    )

    return user

@router.delete("/{id}")
def delete_user_account(
    id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(PermissionChecker("write:users"))
):
    """Delete a user account from database (Admin only)."""
    if id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself.")

    user = user_repository.get(db, id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    email = user.email
    user_repository.remove(db, id=id)

    audit_log_repository.log_action(
        db,
        admin_id=current_admin.id,
        action=f"Admin permanently deleted user account: {email} (ID: {id})"
    )

    return {"message": f"User account {email} has been permanently deleted."}
