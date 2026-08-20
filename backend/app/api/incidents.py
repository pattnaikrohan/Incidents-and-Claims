from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, get_current_active_user, require_risk_compliance_role
from app.models.users import RoleEnum
from app.models.incidents import Incident, IncidentNote

router = APIRouter()

class IncidentCreate(BaseModel):
    incident_id: str | None = None
    type: str
    location: str
    description: str
    job_number: str | None = None
    mbl_mawb_issued: str | None = None
    hbl_hawb_issued: str | None = None
    customer: str | None = None
    business_unit: str | None = None
    branch_department: str | None = None
    # Cargo & Equipment form fields
    role_performed: str | None = None
    claim_types: str | None = None
    incident_types: str | None = None
    incident_summary: str | None = None
    scope_of_work: str | None = None
    mode: str | None = None
    cargo_description: str | None = None
    cargo_value: str | None = None
    claim_estimate: str | None = None
    root_cause: str | None = None
    origin: str | None = None
    destination: str | None = None
    origin_agent: str | None = None
    destination_agent: str | None = None
    carrier: str | None = None
    coloader: str | None = None
    transport_company: str | None = None
    container_numbers: str | None = None
    mbl_mawb_number: str | None = None
    hbl_hawb_number: str | None = None
    system_job_number: str | None = None
    short_description: str | None = None
    date_of_incident: str | None = None
    logged_by: str | None = None
    corrective_actions: str | None = None

    class Config:
        extra = "allow"  # Accept any additional fields silently

class IncidentUpdateStatus(BaseModel):
    status: str

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_incident(
    incident_in: IncidentCreate,
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    assigned_branch_id = current_user.branch_id
    
    if incident_in.branch_department:
        branch_lower = incident_in.branch_department.lower()
        for b in db.branches:
            if b["name"].lower() == branch_lower:
                assigned_branch_id = b["id"]
                break
    else:
        # Fallback to guessing from location text if not explicitly provided
        location_lower = incident_in.location.lower()
        for b in db.branches:
            if b["name"].lower() in location_lower or location_lower in b["name"].lower():
                assigned_branch_id = b["id"]
                break

    new_incident = Incident(
        id=incident_in.incident_id if incident_in.incident_id else str(len(db.incidents) + 1),
        type=incident_in.type,
        location=incident_in.location,
        description=incident_in.description,
        job_number=incident_in.job_number or incident_in.system_job_number,
        status="Open",
        creator_id=current_user.id,
        branch_id=assigned_branch_id,
        date=datetime.now(),
        customer_name=incident_in.customer,
        # Cargo form fields
        role_performed=incident_in.role_performed,
        claim_types=incident_in.claim_types,
        incident_types=incident_in.incident_types,
        incident_summary=incident_in.incident_summary,
        scope_of_work=incident_in.scope_of_work,
        mode=incident_in.mode,
        cargo_description=incident_in.cargo_description,
        cargo_value=incident_in.cargo_value,
        claim_estimate=incident_in.claim_estimate,
        root_cause=incident_in.root_cause,
        origin=incident_in.origin,
        destination=incident_in.destination,
        origin_agent=incident_in.origin_agent,
        destination_agent=incident_in.destination_agent,
        carrier=incident_in.carrier,
        coloader=incident_in.coloader,
        transport_company=incident_in.transport_company,
        container_numbers=incident_in.container_numbers,
        mbl_mawb_number=incident_in.mbl_mawb_number,
        hbl_hawb_number=incident_in.hbl_hawb_number,
        mbl_mawb_issued=incident_in.mbl_mawb_issued,
        hbl_hawb_issued=incident_in.hbl_hawb_issued,
        system_job_number=incident_in.system_job_number,
        short_description=incident_in.short_description,
        date_of_incident=incident_in.date_of_incident,
        logged_by=incident_in.logged_by,
        business_unit=incident_in.business_unit,
        branch_department=incident_in.branch_department,
        corrective_actions=incident_in.corrective_actions,
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
    
    # Helper to get value regardless of type
    def get_val(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)
    
    if role in [RoleEnum.full_access, RoleEnum.risk_compliance]:
        filtered = incidents
    elif role == RoleEnum.bu_access:
        # BU Manager sees all incidents within their Business Unit(s)
        bu_map = {b["id"]: b["business_unit"] for b in db.branches}
        user_bus = getattr(current_user, 'business_units', [])
        if not user_bus:
            # Backward compat: fall back to single business_unit
            single_bu = getattr(current_user, 'business_unit', None)
            user_bus = [single_bu] if single_bu else []
        if user_bus:
            bu_set = set(user_bus)
            filtered = [i for i in incidents if bu_map.get(get_val(i, "branch_id"), "") in bu_set or get_val(i, "business_unit") in bu_set]
        else:
            filtered = [i for i in incidents if get_val(i, "creator_id") == current_user.id]
    elif role == RoleEnum.branch_access:
        # Branch user sees incidents from ALL their branches
        user_branch_ids = getattr(current_user, 'branch_ids', [])
        if not user_branch_ids:
            single_bid = getattr(current_user, 'branch_id', None)
            user_branch_ids = [single_bid] if single_bid else []
        branch_set = set(user_branch_ids)
        filtered = [i for i in incidents if get_val(i, "branch_id") in branch_set]
    elif role in [RoleEnum.it_access, RoleEnum.hr_access, RoleEnum.finance_access]:
        # Department roles: see their incident types globally.
        # Also accumulate types from ALL functional_roles if user is in multiple depts.
        func_roles = getattr(current_user, 'functional_roles', [])
        if not func_roles:
            func_roles = [role.value]
        
        type_filter = set()
        for fr in func_roles:
            if fr == 'it_access':
                type_filter.update(['Data Breach','Ransomware / Malware','Phishing Attack','System Outage','Software Failure','Hardware Failure'])
            elif fr == 'hr_access':
                type_filter.update(['Near Miss','First Aid Injury','Lost Time Injury','Workplace Harassment','Misconduct','Grievance'])
            elif fr == 'finance_access':
                type_filter.update(['Travel Disruption','Financial Loss','Fraud','Payment Error'])
        
        filtered = [i for i in incidents if get_val(i, "type") in type_filter]
        
        # Cross-tier: also include incidents from any branch groups the user belongs to
        user_branch_ids = getattr(current_user, 'branch_ids', [])
        if user_branch_ids:
            branch_set = set(user_branch_ids)
            branch_incidents = [i for i in incidents if get_val(i, "branch_id") in branch_set and i not in filtered]
            filtered = filtered + branch_incidents
    else:
        # submit_only: only see own incidents
        filtered = [i for i in incidents if get_val(i, "creator_id") == current_user.id]
        
    branch_map = {b["id"]: b["name"] for b in db.branches}
    bu_map = {b["id"]: b["business_unit"] for b in db.branches}
    return [{
        "id": get_val(i, "id"), 
        "type": get_val(i, "type"), 
        "status": get_val(i, "status"), 
        "date": get_val(i, "date"), 
        "location": get_val(i, "location"),
        "branch_department": branch_map.get(get_val(i, "branch_id"), "N/A"),
        "business_unit": bu_map.get(get_val(i, "branch_id"), "N/A")
    } for i in filtered]

@router.get("/{incident_id}", response_model=dict)
def get_incident(
    incident_id: str,
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    # Case-insensitive search
    search_id = incident_id.strip().lower()
    incident = next((i for i in db.incidents if str(i.get("id") if isinstance(i, dict) else i.id).lower() == search_id), None)
    
    if not incident:
        # Incident not found locally; it may only exist in Dataverse or was created before the recent restart.
        # Returning 404 allows the frontend to fall back on the Power Automate Digital Twin data.
        raise HTTPException(status_code=404, detail="Incident not found locally")
    
    branch_map = {b["id"]: b["name"] for b in db.branches}
    
    # Helper to get value regardless of type
    def get_val(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)
    
    # Return all attributes dynamically
    res = {
        "id": get_val(incident, "id"),
        "type": get_val(incident, "type"),
        "status": get_val(incident, "status"),
        "date": get_val(incident, "date"),
        "location": get_val(incident, "location"),
        "description": get_val(incident, "description"),
        "job_number": get_val(incident, "job_number"),
        "customer_name": get_val(incident, 'customer_name', 'N/A'),
        "branch_department": branch_map.get(get_val(incident, "branch_id"), "N/A")
    }
    
    # Add investigation fields present on the object
    investigation_fields = [
        "investigation_outcome", "legal_counsel_engaged", "medical_treatment_required",
        "lost_time_injury", "notifiable_safework", "root_cause", "corrective_action",
        "corrective_action_owner", "corrective_action_due_date", "chro_cro_notified",
        "workers_comp_claim", "containment_actions", "personal_data_involved",
        "notifiable_privacy_breach", "cio_notified", "regulator_involved",
        "notified_regulator", "penalty_imposed", "financial_value", "actual_loss",
        "recovery_possible", "recovery_amount", "write_off_required",
        "cfo_notified", "cro_notified", "police_reported", "dept_section_updated",
        "formal_claim_issued", "insurer_notified", "risk_level", "management_escalation",
        "cor", "responsible_party", "notes", "notesconfidentialhreyesonly",
        "records_affected", "date_notified_oaic", "cyber_specialist_engaged", "insurer_notified_dept",
        "date_notified", "penalty_amount",
        # Cargo & Equipment Original Submission Fields
        "role_performed", "claim_types", "incident_types", "incident_summary",
        "scope_of_work", "mode", "cargo_description", "cargo_value", "claim_estimate",
        "origin", "destination", "origin_agent", "destination_agent", "carrier",
        "coloader", "transport_company", "container_numbers", "mbl_mawb_number",
        "hbl_hawb_number", "mbl_mawb_issued", "hbl_hawb_issued", "system_job_number",
        "short_description", "date_of_incident", "logged_by", "business_unit",
        "branch_department", "corrective_actions",
    ]
    
    for field in investigation_fields:
        val = get_val(incident, field)
        if val is not None and val != "":
            res[field] = val
            
    # Mutual fallback for notes fields to cover both patched and seeded mock records
    notes_val = res.get("notes") or res.get("notesconfidentialhreyesonly")
    if notes_val:
        res["notes"] = notes_val
        res["notesconfidentialhreyesonly"] = notes_val
        
    return res

@router.patch("/{incident_id}", response_model=dict)
def patch_incident(
    incident_id: str,
    update_data: dict,
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    search_id = str(incident_id).strip().lower()
    incident = next(
        (i for i in db.incidents if str(i.get("id") if isinstance(i, dict) else i.id).strip().lower() == search_id), 
        None
    )
    
    if not incident:
        # Create a side-store record for Dataverse/PA IDs
        new_incident = Incident(
            id=incident_id, 
            type=update_data.get("type", "SyncRecord"),
            location=update_data.get("location", "Sync"),
            description=update_data.get("description", "Metadata only record"),
            branch_id=update_data.get("branch_id")
        )
        db.add(new_incident)
        # Re-fetch from the store to ensure we modify the persistent dict representation
        incident = next(
            (i for i in db.incidents if str(i.get("id") if isinstance(i, dict) else i.id).strip().lower() == search_id),
            new_incident
        )
    
    if isinstance(incident, dict):
        for key, value in update_data.items():
            if key == 'id': continue
            incident[key] = value
        db._save()
        res_id = incident.get("id")
    else:
        for key, value in update_data.items():
            if key == 'id': continue
            setattr(incident, key, value)
        db._save()
        res_id = incident.id
            
    return {"message": "Incident updated", "incident_id": res_id}

@router.put("/{incident_id}/status", response_model=dict)
def update_incident_status(
    incident_id: str,
    status_update: IncidentUpdateStatus,
    db = Depends(get_db),
    current_user = Depends(require_risk_compliance_role)
):
    incident = next((i for i in db.incidents if str(i.get("id") if isinstance(i, dict) else i.id) == str(incident_id)), None)
    
    if not incident:
        # Create a side-store record for Dataverse/PA IDs so we can store the status locally
        new_incident = Incident(
            id=incident_id, 
            type="SyncRecord",
            location="Sync",
            description="Metadata only record",
            status=status_update.status
        )
        db.add(new_incident)
        incident = new_incident
    else:
        # Update existing record
        if isinstance(incident, dict):
            incident["status"] = status_update.status
            db._save()
        else:
            incident.status = status_update.status
            db._save()
            
    # Also return the actual status so frontend updates correctly
    current_status = incident.get("status") if isinstance(incident, dict) else incident.status
    return {"message": "Status updated", "status": current_status}

@router.get("/{incident_id}/notes", response_model=List[dict])
def list_incident_notes(
    incident_id: str,
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    from app.services import blob_notes
    
    # 1. Fetch from Azure Blob Storage (primary persistent storage)
    try:
        blob_data = blob_notes.get_notes(incident_id)
        if blob_data:
            return blob_data
    except Exception as e:
        print(f"[NotesAPI] Azure Blob fetch failed: {e}")

    # 2. Fallback to in-memory store if blob empty / unavailable
    search_id = str(incident_id).strip().lower()
    local_notes = [
        n for n in db.notes 
        if str(n.get("incident_id") if isinstance(n, dict) else getattr(n, "incident_id", "")).strip().lower() == search_id
    ]
    
    return [
        {
            "id": n.get("id") if isinstance(n, dict) else getattr(n, "id", None),
            "incident_id": incident_id,
            "message": n.get("message") if isinstance(n, dict) else getattr(n, "message", ""),
            "note_type": n.get("note_type") if isinstance(n, dict) else getattr(n, "note_type", "user"),
            "author_name": n.get("author_name") if isinstance(n, dict) else getattr(n, "author_name", 
                           getattr(current_user, "name", "System User")),
            "timestamp": str(n.get("timestamp") if isinstance(n, dict) else getattr(n, "timestamp", 
                         getattr(n, "created_at", datetime.now().isoformat())))
        }
        for n in local_notes
    ]

@router.post("/{incident_id}/notes", response_model=dict)
def add_incident_note(
    incident_id: str,
    note_in: dict,
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    from app.services import blob_notes
    
    author_name = getattr(current_user, "name", None) or getattr(current_user, "email", "Team Member")
    message = note_in.get("message", "").strip()
    
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    new_note = None
    # 1. Persist to Azure Blob Storage notepad
    try:
        new_note = blob_notes.add_note(
            incident_id=incident_id,
            message=message,
            author_name=author_name,
            note_type="user"
        )
    except Exception as e:
        print(f"[NotesAPI] Azure Blob save failed: {e}")

    # 2. Also record in local store
    local_note = IncidentNote(
        id=len(db.notes) + 1,
        incident_id=incident_id,
        message=message,
        author_id=getattr(current_user, "id", None),
        note_type="user",
        timestamp=datetime.now()
    )
    local_note.author_name = author_name
    db.add(local_note)

    if new_note:
        return {
            "message": "Note added",
            "note_id": new_note.get("id"),
            "author_name": author_name,
            "timestamp": new_note.get("timestamp"),
            "note": new_note
        }
    
    return {
        "message": "Note added",
        "note_id": local_note.id,
        "author_name": author_name,
        "timestamp": str(local_note.timestamp)
    }

@router.delete("/{incident_id}/notes", response_model=dict)
def clear_incident_notes(
    incident_id: str,
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    from app.services import blob_notes
    
    # 1. Clear Azure Blob Storage notepad
    blob_removed = 0
    try:
        blob_removed = blob_notes.clear_notes(incident_id)
    except Exception as e:
        print(f"[NotesAPI] Azure Blob clear failed: {e}")

    # 2. Clear local memory store
    search_id = str(incident_id).strip().lower()
    before_count = len(db.notes)
    db.notes = [
        n for n in db.notes
        if str(n.get("incident_id") if isinstance(n, dict) else getattr(n, "incident_id", "")).strip().lower() != search_id
    ]
    local_removed = before_count - len(db.notes)
    db._save()
    
    total_removed = max(blob_removed, local_removed)
    return {"message": f"Cleared {total_removed} message(s)", "removed": total_removed}
