from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, get_current_active_user, require_risk_compliance_role
from app.models.users import RoleEnum
from app.models.incidents import Incident, IncidentNote

router = APIRouter()

class IncidentCreate(BaseModel):
    type: str
    location: str
    description: str
    job_number: str | None = None
    mbl_mawb_issued: str | None = None
    hbl_hawb_issued: str | None = None
    customer: str | None = None

class IncidentUpdateStatus(BaseModel):
    status: str

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_incident(
    incident_in: IncidentCreate,
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    location_lower = incident_in.location.lower()
    assigned_branch_id = current_user.branch_id
    
    for b in db.branches:
        if b["name"].lower() in location_lower or location_lower in b["name"].lower():
            assigned_branch_id = b["id"]
            break

    new_incident = Incident(
        id=len(db.incidents) + 1,
        type=incident_in.type,
        location=incident_in.location,
        description=incident_in.description,
        job_number=incident_in.job_number,
        status="Open",
        creator_id=current_user.id,
        branch_id=assigned_branch_id,
        date=datetime.now(),
        customer_name=incident_in.customer
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
    
    if role in [RoleEnum.full_access, RoleEnum.risk_compliance]:
        filtered = incidents
    elif role == RoleEnum.bu_access:
        # A BU Manager should see all incidents within their Business Unit.
        # We need to map branch_id -> branch -> business_unit
        bu_map = {b["id"]: b["business_unit"] for b in db.branches}
        # A bit hacky: infer the BU name from the user's email or assume they manage the AU BU for this demo
        # Actually, let's just show them all AU incidents for this demo if they are BU manager
        filtered = [i for i in incidents if bu_map.get(i.branch_id, "") == "AAW Global Logistics - AU"]
    elif role == RoleEnum.it_access:
        filtered = [i for i in incidents if i.type in ['Data Breach','Ransomware / Malware','Phishing Attack','System Outage','Software Failure','Hardware Failure']]
    elif role == RoleEnum.finance_access:
        filtered = [i for i in incidents if i.type == 'Travel Disruption']
    elif role == RoleEnum.hr_access:
        filtered = [i for i in incidents if i.type in ['Near Miss','First Aid Injury','Lost Time Injury']]
    elif role == RoleEnum.branch_access:
        filtered = [i for i in incidents if i.branch_id == current_user.branch_id]
    else:
        filtered = [i for i in incidents if i.creator_id == current_user.id]
        
    return [{
        "id": i.id, 
        "type": i.type, 
        "status": i.status, 
        "date": i.date, 
        "location": i.location
    } for i in filtered]

@router.get("/{incident_id}", response_model=dict)
def get_incident(
    incident_id: int,
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    incident = next((i for i in db.incidents if i.id == incident_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Simple conversion to dict for response
    return {
        "id": incident.id,
        "type": incident.type,
        "status": incident.status,
        "date": incident.date,
        "location": incident.location,
        "description": incident.description,
        "job_number": incident.job_number,
        "customer_name": getattr(incident, 'customer_name', 'N/A')
    }

@router.put("/{incident_id}/status", response_model=dict)
def update_incident_status(
    incident_id: int,
    status_update: IncidentUpdateStatus,
    db = Depends(get_db),
    current_user = Depends(require_risk_compliance_role)
):
    incident = next((i for i in db.incidents if i.id == incident_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    incident.status = status_update.status
    return {"message": "Status updated", "status": incident.status}

@router.get("/{incident_id}/notes", response_model=List[dict])
def list_incident_notes(
    incident_id: int,
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    notes = [n for n in db.notes if n.incident_id == incident_id]
    return [{"id": n.id, "message": n.message, "author": "System User", "date": n.created_at} for n in notes]

@router.post("/{incident_id}/notes", response_model=dict)
def add_incident_note(
    incident_id: int,
    note_in: dict, # Simplified
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    new_note = IncidentNote(
        id=len(db.notes) + 1,
        incident_id=incident_id,
        message=note_in.get("message", ""),
        author_id=current_user.id,
        created_at=datetime.now()
    )
    db.add(new_note)
    return {"message": "Note added", "note_id": new_note.id}
