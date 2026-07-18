from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_db, PermissionChecker
from app.models.user import User
from app.services.ai import admin_assistant_query_parser, predict_monthly_demand, search_compatible_donors

router = APIRouter()

class AssistantQuery(BaseModel):
    query: str

@router.post("/assistant")
def chat_with_assistant(
    payload: AssistantQuery,
    db: Session = Depends(get_db),
    current_admin: User = Depends(PermissionChecker("chat:assistant"))
):
    """
    Chatbot assistant for admins. Parses queries locally
    to answer database and eligibility related questions.
    """
    if not payload.query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    return admin_assistant_query_parser(db, payload.query)

@router.get("/forecast")
def get_predicted_demand(
    db: Session = Depends(get_db),
    current_admin: User = Depends(PermissionChecker("read:analytics"))
):
    """
    Returns AI-powered predictive demand forecast for all blood groups.
    """
    return predict_monthly_demand(db)

@router.get("/match/{blood_group}")
def get_compatible_donors_list(
    blood_group: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(PermissionChecker("read:donations"))
):
    """
    List verified, active, eligible compatible donors for a specific blood group.
    """
    if blood_group.upper() not in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]:
        raise HTTPException(status_code=400, detail="Invalid blood group specified")
        
    return search_compatible_donors(db, blood_group.upper())
