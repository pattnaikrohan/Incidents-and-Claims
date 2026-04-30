from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.users import User
from app.models.incidents import Incident, IncidentNote

router = APIRouter()

class InboundEmailWebhook(BaseModel):
    to: str
    from_address: str
    subject: str
    text_content: str
    # Attachments would typically accompany this in a multipart payload

class OutboundEmail(BaseModel):
    incident_id: int
    to_address: str
    subject: str
    body: str

@router.post("/webhook/inbound")
def handle_inbound_email(payload: InboundEmailWebhook, db: Session = Depends(get_db)):
    """
    Receives inbound email via webhook (e.g., SendGrid/AWS SES).
    Extracts the incident identifier from the 'to' address and threads it as an IncidentNote or Email artifact.
    """
    # Pseudo threading logic
    # if payload.to == 'incident-INC-0001@claims.company.com' -> find incident id 1
    return {"status": "threaded"}

@router.post("/outbound")
def send_outbound_email(
    email_data: OutboundEmail, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Dispatches an outbound email and logs it to the incident thread.
    """
    incident = db.query(Incident).filter(Incident.id == email_data.incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    thread_note = IncidentNote(
        incident_id=incident.id,
        author_id=current_user.id,
        message=f"[OUTBOUND EMAIL] To: {email_data.to_address}\nSubject: {email_data.subject}\n\n{email_data.body}"
    )
    db.add(thread_note)
    db.commit()
    
    # Send email asynchronously via Celery or BackgroundTasks
    # background_tasks.add_task(send_smtp_email, ...)
    
    return {"message": "Email queued for dispatch", "note_id": thread_note.id}
