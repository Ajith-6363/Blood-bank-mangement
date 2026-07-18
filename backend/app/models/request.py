from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class BloodRequest(Base):
    __tablename__ = "blood_requests"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    blood_group = Column(String(5), nullable=False)
    quantity = Column(Integer, nullable=False)  # in bags
    
    # Patient & Hospital details
    patient_name = Column(String(255), nullable=False)
    patient_age = Column(Integer, nullable=False)
    doctor_name = Column(String(255), nullable=True)
    hospital_name = Column(String(255), nullable=False)
    hospital_address = Column(Text, nullable=False)
    contact_person = Column(String(255), nullable=False)
    
    # Priority & Timeline
    urgency = Column(String(50), default="normal")  # 'normal', 'urgent', 'critical'
    priority_score = Column(Float, nullable=True)  # AI computed priority score (0-100)
    expected_delivery = Column(DateTime, nullable=False)
    reason = Column(Text, nullable=True)
    
    # Lifecycle
    status = Column(String(50), default="pending")  # 'pending', 'approved', 'rejected', 'fulfilled'
    fulfilled_quantity = Column(Integer, default=0)
    request_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    action_date = Column(DateTime, nullable=True)

    # Relationships
    requester = relationship("User", back_populates="requests")
