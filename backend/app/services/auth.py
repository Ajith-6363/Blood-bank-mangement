from datetime import datetime, timezone, timedelta
import secrets
import uuid
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_refresh_token
from app.repositories import user_repository, session_repository, otp_repository
from app.models.user import User
from app.models.session import Session
from app.services.email import send_email

# Define Role Permissions Mapping
ROLE_PERMISSIONS = {
    "admin": [
        "read:users", "write:users",
        "read:stock", "write:stock",
        "read:donations", "write:donations", "approve:donations",
        "read:requests", "write:requests", "approve:requests",
        "read:audit_logs", "read:analytics", "chat:assistant"
    ],
    "donor": [
        "read:stock",
        "read:own_donations", "create:donation_appointment",
        "read:own_profile", "write:own_profile",
        "read:notifications", "write:notifications"
    ],
    "hospital": [
        "read:stock",
        "read:own_requests", "create:request", "cancel:own_request",
        "read:own_profile", "write:own_profile",
        "read:notifications", "read:analytics"
    ],
    "recipient": [
        "read:stock",
        "read:own_requests", "create:request", "cancel:own_request",
        "read:own_profile", "write:own_profile",
        "read:notifications"
    ],
    "volunteer": [
        "read:stock", "read:donations", "write:donations",
        "read:notifications", "read:own_profile", "write:own_profile"
    ]
}

def get_role_permissions(role: str) -> list[str]:
    return ROLE_PERMISSIONS.get(role.lower(), [])

def has_permission(role: str, permission: str) -> bool:
    return permission in get_role_permissions(role)

def register_new_user(db: DbSession, user_data: dict) -> User:
    # Check if user exists
    existing = user_repository.get_by_email(db, user_data["email"])
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email is already registered."
        )

    # Hash password
    raw_pass = user_data.pop("password")
    user_data["hashed_password"] = get_password_hash(raw_pass)
    user_data["is_active"] = True
    # Admin is auto-verified, others verify via email/OTP
    user_data["is_verified"] = user_data.get("role") == "admin"

    new_user = user_repository.create(db, obj_in=user_data)
    
    # Generate OTP for email verification (if not admin)
    if not new_user.is_verified:
        generate_and_send_otp(db, new_user.email, "verification")
        
    return new_user

def authenticate_user(db: DbSession, email: str, password: str, ip_address: str = None, user_agent: str = None) -> Tuple[str, str, User]:
    user = user_repository.get_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user account is suspended."
        )

    # Create tokens
    token_id = str(uuid.uuid4())
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)
    
    # Expiry for session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    # Record active session
    session_repository.create(db, obj_in={
        "user_id": user.id,
        "token_id": token_id,
        "refresh_token": refresh_token,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "expires_at": expires_at
    })
    
    # Update last login timestamp
    user_repository.update(db, db_obj=user, obj_in={"last_login": datetime.now(timezone.utc)})
    
    return access_token, refresh_token, user

def refresh_user_session(db: DbSession, refresh_token: str, ip_address: str = None, user_agent: str = None) -> Tuple[str, str]:
    payload = decode_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
        
    user_id = payload.get("sub")
    role = payload.get("role")
    
    # Check session in database
    db_session = db.query(Session).filter(
        Session.refresh_token == refresh_token,
        Session.is_revoked == False,
        Session.expires_at > datetime.now(timezone.utc)
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or expired"
        )
        
    # Check if user is active
    user = user_repository.get(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    # Revoke old session and issue new tokens (token rotation pattern)
    db_session.is_revoked = True
    db.commit()
    
    # Generate new tokens
    new_token_id = str(uuid.uuid4())
    new_access_token = create_access_token(subject=user.id, role=user.role)
    new_refresh_token = create_refresh_token(subject=user.id, role=user.role)
    
    # Record new session
    session_repository.create(db, obj_in={
        "user_id": user.id,
        "token_id": new_token_id,
        "refresh_token": new_refresh_token,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7)
    })
    
    return new_access_token, new_refresh_token

def generate_and_send_otp(db: DbSession, email: str, purpose: str) -> str:
    # Invalidate previous OTPs for this email and purpose
    otp_repository.invalidate_otps(db, email, purpose)
    
    # Create random 6 digit code
    code = "".join(secrets.choice("0123456789") for _ in range(6))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10) # valid for 10 minutes
    
    otp_repository.create(db, obj_in={
        "email": email,
        "otp_code": code,
        "purpose": purpose,
        "expires_at": expires_at
    })
    
    # Send email
    subject = "Your Blood Bank Verification Code"
    if purpose == "reset":
        subject = "Reset your Blood Bank Password"
    elif purpose == "login":
        subject = "One-Time Login Passcode"
        
    body = f"""
    <h2>Blood Bank Security Portal</h2>
    <p>Please enter the following code to verify your action ({purpose}):</p>
    <h3 style="font-size:24px; letter-spacing: 2px; color: #d32f2f;">{code}</h3>
    <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
    """
    
    send_email(email, subject, body)
    return code

def verify_otp_and_action(db: DbSession, email: str, code: str, purpose: str) -> bool:
    otp_obj = otp_repository.get_valid_otp(db, email, code, purpose)
    if not otp_obj:
        return False
        
    otp_obj.is_used = True
    db.commit()
    return True
