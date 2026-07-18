from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.user import UserOut, UserUpdate
from app.dependencies.auth import verify_admin

router = APIRouter(prefix="/users", tags=["Users Management"])

@router.get("", response_model=list[UserOut])
def list_all_users(
    role: str = Query(None, description="Filter by role"),
    is_active: bool = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(verify_admin)
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
    current_admin: User = Depends(verify_admin)
):
    """Toggle user active/suspended state (Admin only)."""
    if id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot suspend yourself.")
        
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    # Log in audit trail
    state = "activated" if user.is_active else "suspended/deactivated"
    log = AuditLog(
        admin_id=current_admin.id,
        action=f"Admin {state} user account for {user.email} (ID: {user.id})"
    )
    db.add(log)
    db.commit()

    return user

@router.put("/{id}/verify", response_model=UserOut)
def verify_user_account(
    id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(verify_admin)
):
    """Approve/verify hospital or donor verification status (Admin only)."""
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_verified = True
    db.commit()
    db.refresh(user)

    # Audit Log
    log = AuditLog(
        admin_id=current_admin.id,
        action=f"Admin verified credentials/details for user: {user.email}"
    )
    db.add(log)
    db.commit()

    return user

@router.delete("/{id}")
def delete_user_account(
    id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(verify_admin)
):
    """Delete a user account from database (Admin only)."""
    if id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself.")

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    email = user.email
    db.delete(user)
    db.commit()

    # Audit Log
    log = AuditLog(
        admin_id=current_admin.id,
        action=f"Admin permanently deleted user account: {email} (ID: {id})"
    )
    db.add(log)
    db.commit()

    return {"message": f"User account {email} has been permanently deleted."}
