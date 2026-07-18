from datetime import datetime, timedelta, timezone
import random
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.models.user import User
from app.models.notification import Notification
from app.schemas.auth import Token, RefreshTokenRequest, PasswordResetRequest, PasswordResetConfirm
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.dependencies.auth import get_current_active_user
from app.services.email import send_email

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory store for OTPs (For production, use Redis or database with expiry)
reset_otps = {}

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )
    
    # Check if role is valid
    if user_in.role not in ["admin", "donor", "recipient", "hospital"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role selected.",
        )

    # Create new user
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        role=user_in.role,
        phone=user_in.phone,
        address=user_in.address,
        blood_group=user_in.blood_group,
        is_active=True,
        is_verified=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create welcome notification
    welcome_notif = Notification(
        user_id=new_user.id,
        title="Welcome to LifeLink!",
        message=f"Hi {new_user.full_name}, thank you for registering as a {new_user.role}. Your account is now active."
    )
    db.add(welcome_notif)
    db.commit()

    # Send Welcome Email
    email_body = f"""
    <h2>Welcome to LifeLink!</h2>
    <p>Hi {new_user.full_name},</p>
    <p>Thank you for registering on the LifeLink Blood Bank Management System as a <strong>{new_user.role}</strong>.</p>
    <p>We are thrilled to have you join our lifesaving network.</p>
    <br/>
    <p>Best regards,<br/>LifeLink Team</p>
    """
    send_email(new_user.email, "Welcome to LifeLink Blood Bank!", email_body)

    return new_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated."
        )

    # Update last login time
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    # Generate tokens
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
        "full_name": user.full_name,
        "user_id": user.id,
    }

@router.post("/refresh", response_model=Token)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    decoded = decode_refresh_token(payload.refresh_token)
    if not decoded:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    
    user_id = decoded.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Issue new access and refresh tokens
    new_access = create_access_token(subject=user.id, role=user.role)
    new_refresh = create_refresh_token(subject=user.id, role=user.role)

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
        "full_name": user.full_name,
        "user_id": user.id,
    }

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.put("/me", response_model=UserOut)
def update_profile(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if user_in.email is not None and user_in.email != current_user.email:
        # Check if email is already taken
        existing_user = db.query(User).filter(User.email == user_in.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = user_in.email

    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    if user_in.phone is not None:
        current_user.phone = user_in.phone
    if user_in.address is not None:
        current_user.address = user_in.address
    if user_in.blood_group is not None:
        current_user.blood_group = user_in.blood_group
    if user_in.profile_image is not None:
        current_user.profile_image = user_in.profile_image
    
    if user_in.password is not None:
        current_user.hashed_password = get_password_hash(user_in.password)

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/forgot-password")
def forgot_password(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Prevent enum security mapping: return success even if user not found to avoid scanning
        return {"message": "If the email exists, a password reset code has been sent."}

    # Generate 6 digit OTP
    otp = f"{random.randint(100000, 999999)}"
    reset_otps[payload.email] = {
        "otp": otp,
        "expiry": datetime.now() + timedelta(minutes=10)
    }

    # Send reset email
    email_body = f"""
    <h2>Password Reset Request</h2>
    <p>Hi {user.full_name},</p>
    <p>You requested a password reset. Please use the following One-Time Password (OTP) to reset your password:</p>
    <h3 style="font-size: 24px; color: #cc1111; letter-spacing: 2px;">{otp}</h3>
    <p>This code is valid for 10 minutes.</p>
    <br/>
    <p>If you did not request this, please ignore this email.</p>
    """
    send_email(user.email, "LifeLink Password Reset Verification Code", email_body)

    return {"message": "Password reset code sent successfully."}

@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    otp_data = reset_otps.get(payload.email)
    if not otp_data:
        raise HTTPException(status_code=400, detail="Invalid request or expired OTP")

    if otp_data["otp"] != payload.otp or datetime.now() > otp_data["expiry"]:
        raise HTTPException(status_code=400, detail="Incorrect or expired verification code")

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()

    # Clear OTP
    del reset_otps[payload.email]

    # Create security alert notification
    reset_notif = Notification(
        user_id=user.id,
        title="Security Alert: Password Changed",
        message="Your account password was updated successfully. If this wasn't you, contact admin immediately."
    )
    db.add(reset_notif)
    db.commit()

    return {"message": "Password reset completed successfully."}
