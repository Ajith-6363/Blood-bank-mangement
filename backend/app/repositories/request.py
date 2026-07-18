from typing import List
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.request import BloodRequest

class BloodRequestRepository(BaseRepository[BloodRequest]):
    def __init__(self):
        super().__init__(BloodRequest)

    def get_by_requester(self, db: Session, requester_id: int) -> List[BloodRequest]:
        return db.query(self.model).filter(self.model.requester_id == requester_id).order_by(self.model.request_date.desc()).all()

    def get_pending_requests(self, db: Session) -> List[BloodRequest]:
        return db.query(self.model).filter(self.model.status == "pending").all()

request_repository = BloodRequestRepository()
