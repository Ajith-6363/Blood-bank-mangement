from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class BloodStockBase(BaseModel):
    blood_group: str
    quantity: int = 1  # Standard bag unit
    collection_date: date
    expiry_date: date
    storage_location: Optional[str] = None
    status: Optional[str] = "available"  # 'available', 'reserved', 'expired', 'transfused'

class BloodStockCreate(BloodStockBase):
    pass

class BloodStockUpdate(BaseModel):
    quantity: Optional[int] = None
    storage_location: Optional[str] = None
    status: Optional[str] = None
    expiry_date: Optional[date] = None

class BloodStockOut(BloodStockBase):
    id: int
    batch_number: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

class BloodStockGroupSummary(BaseModel):
    blood_group: str
    total_bags: int
    available_bags: int
    expiring_soon_bags: int  # e.g., within 7 days

class StockAnalytics(BaseModel):
    total_available_units: int
    group_summaries: list[BloodStockGroupSummary]
