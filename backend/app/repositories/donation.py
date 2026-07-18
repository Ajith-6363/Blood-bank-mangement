from typing import List
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.donation import Donation

class DonationRepository(BaseRepository[Donation]):
    def __init__(self):
        super().__init__(Donation)

    def get_by_donor(self, db: Session, donor_id: int) -> List[Donation]:
        return db.query(self.model).filter(self.model.donor_id == donor_id).order_by(self.model.appointment_date.desc()).all()

    def get_pending_appointments(self, db: Session) -> List[Donation]:
        return db.query(self.model).filter(self.model.status == "scheduled").all()

donation_repository = DonationRepository()
