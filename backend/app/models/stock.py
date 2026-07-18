from sqlalchemy import Column, Integer, String, Date, DateTime
from datetime import datetime, timezone
from app.core.database import Base

class BloodStock(Base):
    __tablename__ = "blood_stock"

    id = Column(Integer, primary_key=True, index=True)
    batch_number = Column(String(100), unique=True, index=True, nullable=False)
    blood_group = Column(String(5), index=True, nullable=False)  # 'A+', 'O-', etc.
    quantity = Column(Integer, default=1)  # in bags (usually 1 whole donation = 1 bag)
    collection_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)
    storage_location = Column(String(100), nullable=True)  # e.g. "Fridge A, Shelf 3"
    status = Column(String(50), default="available")  # 'available', 'reserved', 'expired', 'transfused'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
