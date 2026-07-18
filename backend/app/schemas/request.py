from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.schemas.user import UserOut

class BloodRequestBase(BaseModel):
    blood_group: str
    quantity: int = Field(..., ge=1)
    patient_name: str
    patient_age: int = Field(..., ge=0, le=120)
    doctor_name: Optional[str] = None
    hospital_name: str
    hospital_address: str
    contact_person: str
    urgency: str = "normal"  # 'normal', 'urgent', 'critical'
    expected_delivery: datetime
    reason: Optional[str] = None

class BloodRequestCreate(BloodRequestBase):
    pass

class BloodRequestUpdate(BaseModel):
    status: Optional[str] = None  # 'pending', 'approved', 'rejected', 'fulfilled'
    fulfilled_quantity: Optional[int] = None
    action_date: Optional[datetime] = None

class BloodRequestOut(BloodRequestBase):
    id: int
    requester_id: int
    status: str
    fulfilled_quantity: int
    request_date: datetime
    action_date: Optional[datetime] = None
    requester: Optional[UserOut] = None

    model_config = {
        "from_attributes": True
    }
