from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.schemas.user import UserOut

class DonationBase(BaseModel):
    blood_group: str
    appointment_date: datetime
    quantity: int = 1

class DonationCreate(DonationBase):
    pass

class DonationUpdate(BaseModel):
    status: Optional[str] = None  # 'scheduled', 'approved', 'completed', 'cancelled'
    donation_date: Optional[datetime] = None
    hemoglobin_level: Optional[float] = None
    blood_pressure: Optional[str] = None
    temperature: Optional[float] = None
    pulse_rate: Optional[int] = None
    weight: Optional[float] = None
    doctor_name: Optional[str] = None
    medical_notes: Optional[str] = None
    remarks: Optional[str] = None
    certificate_generated: Optional[bool] = None

class DonationOut(DonationBase):
    id: int
    donor_id: int
    donation_date: Optional[datetime] = None
    status: str
    hemoglobin_level: Optional[float] = None
    blood_pressure: Optional[str] = None
    temperature: Optional[float] = None
    pulse_rate: Optional[int] = None
    weight: Optional[float] = None
    doctor_name: Optional[str] = None
    medical_notes: Optional[str] = None
    remarks: Optional[str] = None
    certificate_generated: bool
    donor: Optional[UserOut] = None

    model_config = {
        "from_attributes": True
    }

class EligibilityCheckRequest(BaseModel):
    age: int = Field(..., ge=0, le=120)
    weight: float = Field(..., ge=10, le=300)
    hemoglobin_level: Optional[float] = None
    blood_pressure: Optional[str] = None  # e.g., "120/80"

class EligibilityCheckResponse(BaseModel):
    eligible: bool
    reason: str
    next_eligible_date: Optional[datetime] = None
