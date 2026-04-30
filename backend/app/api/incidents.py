from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, get_current_active_user
from app.models.users import RoleEnum
from app.models.incidents import Incident

router = APIRouter()

class IncidentCreate(BaseModel):
    type: str
    location: str
    description: str
    job_number: str | None = None
    # ... simplified for brevity in mock mode, but keep important ones
    mbl_mawb_issued: str | None = None
    hbl_hawb_issued: str | None = None

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_incident(
    incident_in: IncidentCreate,
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    # Logic to find branch ID from location string (simplified from our previous logic)
    location_lower = incident_in.location.lower()
    assigned_branch_id = current_user.branch_id
    
    for b in db.branches:
        if b["name"].lower() in location_lower or location_lower in b["name"].lower():
            assigned_branch_id = b["id"]
            break

    # Mock Incident object
    new_incident = Incident(
        id=len(db.incidents) + 1,
        type=incident_in.type,
        location=incident_in.location,
        description=incident_in.description,
        status="Open",
        creator_id=current_user.id,
        branch_id=assigned_branch_id,
        date=datetime.now()
    )
    
    db.add(new_incident)
    return {"message": "Incident created", "incident_id": new_incident.id, "status": new_incident.status}

@router.get("/", response_model=List[dict])
def read_incidents(
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    incidents = db.incidents
    role = current_user.role
    
    # Filter using Python logic
    if role in [RoleEnum.full_access, RoleEnum.risk_compliance]:
        filtered = incidents
    elif role == RoleEnum.branch_access:
        filtered = [i for i in incidents if i.branch_id == current_user.branch_id]
    elif role == RoleEnum.it_access:
        filtered = [i for i in incidents if i.type == "IT & Security Incident"]
    elif role == RoleEnum.finance_access:
        filtered = [i for i in incidents if i.type == "Finance Incident"]
    else:
        filtered = [i for i in incidents if i.branch_id == current_user.branch_id]
        
    return [{
        "id": i.id, 
        "type": i.type, 
        "status": i.status, 
        "date": i.date, 
        "location": i.location
    } for i in filtered]
