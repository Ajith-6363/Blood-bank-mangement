from typing import Optional
from sqlalchemy.orm import Session as DbSession
from app.repositories.base import BaseRepository
from app.models.session import Session

class SessionRepository(BaseRepository[Session]):
    def __init__(self):
        super().__init__(Session)

    def get_by_token_id(self, db: DbSession, token_id: str) -> Optional[Session]:
        return db.query(self.model).filter(self.model.token_id == token_id).first()

    def revoke_by_token_id(self, db: DbSession, token_id: str) -> bool:
        session_obj = self.get_by_token_id(db, token_id)
        if session_obj:
            session_obj.is_revoked = True
            db.commit()
            return True
        return False

    def revoke_all_user_sessions(self, db: DbSession, user_id: int) -> int:
        count = db.query(self.model).filter(
            self.model.user_id == user_id,
            self.model.is_revoked == False
        ).update({"is_revoked": True})
        db.commit()
        return count

session_repository = SessionRepository()
