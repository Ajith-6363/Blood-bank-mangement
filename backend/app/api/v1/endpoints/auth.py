from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.schemas.auth import Token, RefreshTokenRequest, PasswordResetRequest, PasswordResetConfirm, OTPVerifyRequest, OTPGenerateRequest
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.models.user import User
from app.models.notification import Notification
from app.services.auth import (
    register_new_user, 
    authenticate_user, 
    refresh_user_session, 
    generate_and_send_otp, 
    verify_otp_and_action
)
from app.repositories import user_repository

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if user_in.role not in ["admin", "donor", "recipient", "hospital", "volunteer"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role selected."
        )
    return register_new_user(db, user_in.model_dump())

@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    access_token, refresh_token, user = authenticate_user(
        db, 
        email=form_data.username, 
        password=form_data.password, 
        ip_address=ip, 
        user_agent=user_agent
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
        "full_name": user.full_name,
        "user_id": user.id
    }

@router.post("/refresh", response_model=Token)
def refresh(
    request: Request,
    payload: RefreshTokenRequest, 
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    # Refresh session
    access_token, refresh_token = refresh_user_session(
        db, 
        refresh_token=payload.refresh_token, 
        ip_address=ip, 
        user_agent=user_agent
    )
    
    # We query the user to return details
    from app.core.security import decode_refresh_token
    token_data = decode_refresh_token(refresh_token)
    user_id = int(token_data["sub"])
    user = user_repository.get(db, user_id)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
        "full_name": user.full_name,
        "user_id": user.id
    }

@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserOut)
def update_me(
    user_in: UserUpdate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Verify old password if password or email is being changed
    if user_in.password is not None or (user_in.email is not None and user_in.email != current_user.email):
        if not user_in.old_password:
            raise HTTPException(
                status_code=400,
                detail="Old password is required to update credentials."
            )
        from app.core.security import verify_password
        if not verify_password(user_in.old_password, current_user.hashed_password):
            raise HTTPException(
                status_code=400,
                detail="Incorrect old password."
            )

    if user_in.email is not None and user_in.email != current_user.email:
        # Check if email is already taken
        existing_user = user_repository.get_by_email(db, user_in.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
            
    # Remove keys that are None and pop metadata fields
    update_data = {k: v for k, v in user_in.model_dump().items() if v is not None}
    update_data.pop("old_password", None)
    
    # Hash password if updated
    if "password" in update_data:
        from app.core.security import get_password_hash
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        
    return user_repository.update(db, db_obj=current_user, obj_in=update_data)

@router.post("/send-otp")
def send_otp_code(payload: OTPGenerateRequest, db: Session = Depends(get_db)):
    generate_and_send_otp(db, payload.email, payload.purpose)
    return {"message": "OTP sent successfully."}

@router.post("/verify-otp")
def verify_otp_code(payload: OTPVerifyRequest, db: Session = Depends(get_db)):
    success = verify_otp_and_action(db, payload.email, payload.code, payload.purpose)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect or expired OTP verification code"
        )
        
    # If the purpose was email verification, mark the user as verified
    if payload.purpose == "verification":
        user = user_repository.get_by_email(db, payload.email)
        if user:
            user_repository.update(db, db_obj=user, obj_in={"is_verified": True})
            
    return {"message": "OTP verification successful."}

@router.post("/forgot-password")
def forgot_password_request(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    user = user_repository.get_by_email(db, payload.email)
    if not user:
        # Prevent enum security scanning
        return {"message": "If the email exists, a password reset code has been sent."}
        
    generate_and_send_otp(db, user.email, "reset")
    return {"message": "Password reset code sent successfully."}

@router.post("/reset-password")
def reset_password_execution(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    success = verify_otp_and_action(db, payload.email, payload.otp, "reset")
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect or expired reset code"
        )
        
    user = user_repository.get_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    from app.core.security import get_password_hash
    hashed = get_password_hash(payload.new_password)
    user_repository.update(db, db_obj=user, obj_in={"hashed_password": hashed})
    
    # Notify security alert
    alert = Notification(
        user_id=user.id,
        title="Security Alert: Password Changed",
        message="Your account password was updated successfully. If this was not you, please contact helpdesk immediately."
    )
    db.add(alert)
    db.commit()
    
    return {"message": "Password reset completed successfully."}
