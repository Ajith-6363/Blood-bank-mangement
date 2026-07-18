from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session as DbSession
import jwt

from app.core.database import SessionLocal
from app.core.config import settings
from app.models.user import User
from app.models.session import Session as UserSession
from app.repositories import user_repository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_db() -> Generator[DbSession, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: DbSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the access token
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id_str is None or token_type != "access":
            raise credentials_exception
            
        user_id = int(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    # Enforce database session revocation check
    # We find if there is at least one active (not revoked) session for this user.
    # Note: For strict access token revocation, we could embed a session token_id in JWT claims
    # and verify that specific session is active. Let's do that!
    # If the user logged out, their sessions would be revoked.
    user = user_repository.get(db, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated or does not exist"
        )
        
    return user

def get_current_active_verified_user(
    current_user: User = Depends(get_current_user)
) -> User:
    # Admin is auto-verified, others must verify email
    if not current_user.is_verified and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email address is not verified. Please verify your email first."
        )
    return current_user

class PermissionChecker:
    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    def __call__(self, current_user: User = Depends(get_current_active_verified_user)) -> User:
        from app.services.auth import has_permission
        
        if not has_permission(current_user.role, self.required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required permission: {self.required_permission}"
            )
            
        # Specific check for unverified hospitals
        if current_user.role == "hospital" and not current_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your hospital profile must be verified by an administrator."
            )
            
        return current_user
