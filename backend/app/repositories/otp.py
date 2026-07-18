from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.otp import OTP

class OTPRepository(BaseRepository[OTP]):
    def __init__(self):
        super().__init__(OTP)

    def get_valid_otp(self, db: Session, email: str, code: str, purpose: str) -> Optional[OTP]:
        now = datetime.now(timezone.utc)
        return db.query(self.model).filter(
            self.model.email == email,
            self.model.otp_code == code,
            self.model.purpose == purpose,
            self.model.is_used == False,
            self.model.expires_at > now
        ).order_by(self.model.created_at.desc()).first()

    def invalidate_otps(self, db: Session, email: str, purpose: str) -> int:
        count = db.query(self.model).filter(
            self.model.email == email,
            self.model.purpose == purpose,
            self.model.is_used == False
        ).update({"is_used": True})
        db.commit()
        return count

otp_repository = OTPRepository()
