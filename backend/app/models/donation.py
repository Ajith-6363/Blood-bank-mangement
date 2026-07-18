from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    donor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    blood_group = Column(String(5), nullable=False)
    quantity = Column(Integer, default=1)  # standard unit = 1 bag
    appointment_date = Column(DateTime, nullable=False)
    donation_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="scheduled")  # 'scheduled', 'approved', 'completed', 'cancelled'
    
    # Medical Metrics (Eligibility Check details completed at time of donation)
    hemoglobin_level = Column(Float, nullable=True)  # in g/dL
    blood_pressure = Column(String(20), nullable=True)  # e.g., "120/80"
    temperature = Column(Float, nullable=True)  # in Celsius
    pulse_rate = Column(Integer, nullable=True)  # in bpm
    weight = Column(Float, nullable=True)  # in kg
    
    # Personnel & Administrative
    doctor_name = Column(String(255), nullable=True)
    medical_notes = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    certificate_generated = Column(Boolean, default=False)

    # Relationships
    donor = relationship("User", back_populates="donations")
