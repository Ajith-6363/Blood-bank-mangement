from typing import List
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.audit_log import AuditLog

class AuditLogRepository(BaseRepository[AuditLog]):
    def __init__(self):
        super().__init__(AuditLog)

    def get_logs(self, db: Session, limit: int = 250) -> List[AuditLog]:
        return db.query(self.model).order_by(self.model.timestamp.desc()).limit(limit).all()

    def log_action(self, db: Session, admin_id: int, action: str, ip_address: str = None) -> AuditLog:
        return self.create(db, obj_in={
            "admin_id": admin_id,
            "action": action,
            "ip_address": ip_address
        })

audit_log_repository = AuditLogRepository()
