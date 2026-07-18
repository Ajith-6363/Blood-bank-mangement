from typing import List
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.notification import Notification

class NotificationRepository(BaseRepository[Notification]):
    def __init__(self):
        super().__init__(Notification)

    def get_by_user(self, db: Session, user_id: int) -> List[Notification]:
        return db.query(self.model).filter(self.model.user_id == user_id).order_by(self.model.created_at.desc()).all()

    def get_unread_by_user(self, db: Session, user_id: int) -> List[Notification]:
        return db.query(self.model).filter(self.model.user_id == user_id, self.model.is_read == False).all()

    def mark_all_as_read(self, db: Session, user_id: int) -> int:
        count = db.query(self.model).filter(self.model.user_id == user_id, self.model.is_read == False).update({"is_read": True})
        db.commit()
        return count

notification_repository = NotificationRepository()
