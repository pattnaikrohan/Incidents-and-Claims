from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.api.deps import get_current_active_user, require_risk_compliance_role
from app.models.users import User, RoleEnum, Branch
from app.models.incidents import Incident, IncidentNote
from app.services.sql_server import enrich_incident_from_sql_server

router = APIRouter()

class IncidentCreate(BaseModel):
    type: str
    location: str
    description: str
    job_number: str | None = None
    vault: str | None = None
    incident_number_str: str | None = None
    responsible_party: str | None = None
    company_liability: str | None = None
    cor_risk_level: str | None = None
    cor_assessment: str | None = None
    corrective_actions: str | None = None
    status_remarks: str | None = None
    formal_claim_issued: str | None = None
    insurer_notified: str | None = None
    management_escalation: str | None = None
    
    # Cargo Specific
    mbl_mawb_issued: str | None = None
    hbl_hawb_issued: str | None = None
    mbl_mawb_number: str | None = None
    hbl_hawb_number: str | None = None
    customer: str | None = None
    container_numbers: str | None = None
    origin: str | None = None
    destination: str | None = None
    mode: str | None = None
    cargo_description: str | None = None
    cargo_value: str | None = None
    location_of_incident: str | None = None
    origin_agent: str | None = None
    destination_agent: str | None = None
    shipping_line: str | None = None
    coloader: str | None = None
    transport_company: str | None = None
    scope_of_work: str | None = None
    role_performed: str | None = None
    incident_summary: str | None = None
    root_cause: str | None = None
    claim_estimate: str | None = None

    # Missing M-Files Master Log Fields
    name: str | None = None
    incident_state: str | None = None
    state_location: str | None = None
    cor_required: str | None = None
    dupli: str | None = None
    cant_find_email: str | None = None
    email_subject: str | None = None
    follow_up_1: str | None = None
    follow_up_2: str | None = None
    follow_up_3: str | None = None
    follow_up_4: str | None = None
    follow_up_5: str | None = None

class IncidentUpdateStatus(BaseModel):
    status: str

class IncidentLiabilityUpdate(BaseModel):
    responsible_party: str | None = None
    formal_claim_issued: str | None = None
    insurer_notified: str | None = None
    risk_level: str | None = None
    management_escalation: str | None = None
    cor: str | None = None
    status: str | None = None

class IncidentNoteCreate(BaseModel):
    message: str

class IncidentAssign(BaseModel):
    assigned_to_id: int
    status: str | None = None

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_incident(
    incident_in: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new incident. Background enrichment triggers if a job number is provided.
    """
    location_val = incident_in.location or incident_in.location_of_incident or "Unknown"
    
    # Hardened Branch Detection
    assigned_branch_id = current_user.branch_id
    location_lower = location_val.lower()
    branches = db.query(Branch).all()

    # Priority 1: City & Code Aliases Mapping
    alias_map = {
        "sydney": "syd",
        "melbourne": "mel",
        "brisbane": "bne",
        "adelaide": "adl",
        "fremantle": "fre",
        "perth": "fre",
        "auckland": "akl",
    }

    found = False
    for b in branches:
        b_name = b.name.lower()
        
        # Strategy A: Exact or contained match (e.g. "AAW Global - SYD")
        if b_name == location_lower or b_name in location_lower or location_lower in b_name:
            assigned_branch_id = b.id
            found = True
            break
            
        # Strategy B: Alias matching (e.g. "Sydney" -> "SYD")
        for city, code in alias_map.items():
            if city in location_lower and code in b_name:
                assigned_branch_id = b.id
                found = True
                break
        if found: break

    # Strategy C: If still not found and user has a branch, force use user's branch
    if not found and current_user.branch_id:
        assigned_branch_id = current_user.branch_id
    elif not found and not current_user.branch_id:
        # Final fallback for global admins: assign to "Risk & Compliance" (ID 3) if it exists
        risk_branch = next((b for b in branches if "risk" in b.name.lower()), None)
        if risk_branch:
            assigned_branch_id = risk_branch.id

    new_incident = Incident(
        type=incident_in.type,
        location=location_val,
        description=incident_in.description or incident_in.incident_summary or "No description",
        job_number=incident_in.job_number,
        vault=incident_in.vault,
        incident_number_str=incident_in.incident_number_str,
        responsible_party=incident_in.responsible_party,
        company_liability=incident_in.company_liability,
        cor_risk_level=incident_in.cor_risk_level,
        cor_assessment=incident_in.cor_assessment,
        corrective_actions=incident_in.corrective_actions,
        status_remarks=incident_in.status_remarks,

        # Cargo Specific
        bill_of_lading=incident_in.mbl_mawb_number,
        customer_name=incident_in.customer,
        container_number=incident_in.container_numbers,
        port_of_loading=incident_in.origin,
        port_of_discharge=incident_in.destination,
        vessel_name=incident_in.shipping_line,
        
        # New M-Files fields
        name=incident_in.name or f"{incident_in.type} - {incident_in.customer or 'Unknown'}",
        incident_state=incident_in.incident_state,
        state_location=incident_in.state_location,
        cor_required=incident_in.cor_required,
        dupli=incident_in.dupli,
        cant_find_email=incident_in.cant_find_email,
        email_subject=incident_in.email_subject,
        follow_up_1=incident_in.follow_up_1,
        follow_up_2=incident_in.follow_up_2,
        follow_up_3=incident_in.follow_up_3,
        follow_up_4=incident_in.follow_up_4,
        follow_up_5=incident_in.follow_up_5,
        
        creator_id=current_user.id,
        branch_id=assigned_branch_id
    )
    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)

    # Trigger SQL Server synchronous/async enrichment (Replaces Snowflake)
    if incident_in.job_number:
        enrichment_result = enrich_incident_from_sql_server(incident_in.job_number)
        if enrichment_result.get("status") == "success":
            data = enrichment_result["data"]
            new_incident.bill_of_lading = data.get("bill_of_lading")
            new_incident.customer_name = data.get("customer_name")
            new_incident.vessel_details = data.get("vessel_details")
            db.commit()
            db.refresh(new_incident)

    # Cargo & Equipment Incident - Power Automate Email Trigger
    if incident_in.mbl_mawb_issued or incident_in.hbl_hawb_issued:
        power_automate_url = "" # INSERT YOUR POWER AUTOMATE FLOW LINK HERE
        
        # In production, use `requests.post(power_automate_url, json=payload)`
        print("--------------------------------------------------")
        print("POWER AUTOMATE WEBHOOK TRIGGERED")
        print(f"New Cargo & Equipment Incident submitted (ID: {new_incident.id})")
        print(f"Email routing to: Risk&Compliance team AND Ops Manager for Branch ID: {new_incident.branch_id}")
        print("--------------------------------------------------")

    return {"message": "Incident created", "incident_id": new_incident.id, "status": new_incident.status}

@router.get("/", response_model=List[dict])
def read_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve incidents. Branch users see only their branch. Risk compliance sees all.
    """
    query = db.query(Incident)
    role = current_user.role
    
    if role in [RoleEnum.full_access, RoleEnum.risk_compliance]:
        pass # Full access, no filter
    elif role == RoleEnum.bu_access:
        # User sees incidents for branches in their own BU, restricted to Operational types
        user_branch = db.query(Branch).filter(Branch.id == current_user.branch_id).first()
        if user_branch:
            bu_branches = db.query(Branch.id).filter(Branch.business_unit == user_branch.business_unit).all()
            branch_ids = [b[0] for b in bu_branches]
            query = query.filter(Incident.branch_id.in_(branch_ids))
            query = query.filter(Incident.type.in_(["Cargo & Equipment Incident", "Claims Incidents", "CoR Incident"]))
    elif role == RoleEnum.branch_access:
        query = query.filter(Incident.branch_id == current_user.branch_id)
        query = query.filter(Incident.type.in_(["Cargo & Equipment Incident", "Claims Incidents", "CoR Incident"]))
    elif role == RoleEnum.hr_access:
        query = query.filter(Incident.type == "Human Resources Incident")
    elif role == RoleEnum.whs_access:
        query = query.filter(Incident.type == "WH&S Incident")
    elif role == RoleEnum.it_access:
        query = query.filter(Incident.type == "IT & Security Incident")
    elif role == RoleEnum.finance_access:
        query = query.filter(Incident.type == "Finance Incident")
    elif role == RoleEnum.submit_only:
        # Can only see incidents they created
        query = query.filter(Incident.creator_id == current_user.id)
    else:
        # Fallback to strict branch isolation
        query = query.filter(Incident.branch_id == current_user.branch_id)
        
    incidents = query.all()
    # Return limited fields plus the liability flags for filtering
    return [{
        "id": i.id, 
        "type": i.type, 
        "status": i.status, 
        "date": i.date, 
        "location": i.location,
        "incident_number_str": i.incident_number_str,
        "formal_claim_issued": getattr(i, 'formal_claim_issued', None),
        "cor_required": getattr(i, 'cor_required', None)
    } for i in incidents]

@router.put("/{incident_id}/status", response_model=dict)
def update_incident_status(
    incident_id: int,
    status_update: IncidentUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_risk_compliance_role)
):
    """
    Update incident status. Restricted to Risk & Compliance role.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    incident.status = status_update.status
    db.commit()
    
    # Automatically log status change to incident notes
    system_note = IncidentNote(
        incident_id=incident_id,
        message=f"Status changed to {status_update.status} by {current_user.name}",
        note_type="system"
    )
    db.add(system_note)
    db.commit()
    
    return {"message": "Status updated", "new_status": incident.status}

@router.put("/{incident_id}/liability", response_model=dict)
def update_incident_liability(
    incident_id: int,
    liability_in: IncidentLiabilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update incident liability details and automatically trigger related templates/logs.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    incident.responsible_party = liability_in.responsible_party
    incident.cor_risk_level = liability_in.risk_level
    incident.cor_required = liability_in.cor
    incident.formal_claim_issued = liability_in.formal_claim_issued
    incident.insurer_notified = liability_in.insurer_notified
    incident.management_escalation = liability_in.management_escalation
    
    if liability_in.status:
        incident.status = liability_in.status
        
    # Generate System Notes/Triggers based on selected liability actions
    if liability_in.formal_claim_issued == "Yes":
        db.add(IncidentNote(incident_id=incident_id, message="[AUTOMATED ACTION] Formal Claim Issued: Initiated new Claims Log record.", note_type="system"))
        
    if liability_in.insurer_notified == "Yes":
        db.add(IncidentNote(incident_id=incident_id, message="[AUTOMATED ACTION] Insurer Notified: Generated Insurers Notification Template.", note_type="system"))
        
    if liability_in.management_escalation == "Yes":
        db.add(IncidentNote(incident_id=incident_id, message="[AUTOMATED ACTION] Management Escalated: Generated Management Notification Template.", note_type="system"))
        
    if liability_in.cor == "Yes":
        db.add(IncidentNote(incident_id=incident_id, message="[AUTOMATED ACTION] COR flag selected: Initiated new CoR Log record.", note_type="system"))

    db.commit()
    return {"message": "Liability details processed successfully"}

@router.get("/{incident_id}", response_model=dict)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a single incident by ID.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Return all fields for the complete form view
    data = {c.name: getattr(incident, c.name) for c in incident.__table__.columns}
    return data

@router.get("/{incident_id}/notes", response_model=List[dict])
def get_incident_notes(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all notes/chat messages for an incident.
    """
    notes = db.query(IncidentNote).filter(IncidentNote.incident_id == incident_id).order_by(IncidentNote.timestamp.asc()).all()
    return [{
        "id": n.id,
        "message": n.message,
        "timestamp": n.timestamp,
        "note_type": n.note_type,
        "author_name": n.author.name if n.author else "System"
    } for n in notes]

@router.post("/{incident_id}/notes", response_model=dict)
def add_incident_note(
    incident_id: int,
    note_in: IncidentNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add a new manual note (chat message) to an incident.
    """
    new_note = IncidentNote(
        incident_id=incident_id,
        author_id=current_user.id,
        message=note_in.message,
        note_type="user"
    )
    db.add(new_note)
    db.commit()
    return {"message": "Note added"}

@router.patch("/{incident_id}/assign", response_model=dict)
def assign_incident(
    incident_id: int,
    assign_in: IncidentAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_risk_compliance_role)
):
    """
    Assign an incident to a user and optionally update status.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    target_user = db.query(User).filter(User.id == assign_in.assigned_to_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    old_assignee = incident.assigned_to_id
    incident.assigned_to_id = assign_in.assigned_to_id
    if assign_in.status:
        incident.status = assign_in.status

    # Log assignment change
    system_msg = f"Incident assigned to {target_user.name}"
    if assign_in.status:
        system_msg += f" and status updated to {assign_in.status}"
    
    db.add(IncidentNote(
        incident_id=incident_id,
        message=system_msg,
        note_type="system"
    ))
    
    db.commit()
    return {"message": "Incident assigned successfully"}
