from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.stock import BloodStock

class BloodStockRepository(BaseRepository[BloodStock]):
    def __init__(self):
        super().__init__(BloodStock)

    def get_by_batch(self, db: Session, batch_number: str) -> Optional[BloodStock]:
        return db.query(self.model).filter(self.model.batch_number == batch_number).first()

    def get_all_available(self, db: Session) -> List[BloodStock]:
        return db.query(self.model).filter(self.model.status == "available").all()

    def get_stock_by_blood_group(self, db: Session, blood_group: str) -> List[BloodStock]:
        return db.query(self.model).filter(
            self.model.blood_group == blood_group,
            self.model.status == "available"
        ).all()

stock_repository = BloodStockRepository()
