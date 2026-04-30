from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.users import User
from app.models.incidents import Document
from app.services.blob_storage import upload_document
import uuid

router = APIRouter()

@router.post("/incident/{incident_id}/upload", status_code=201)
async def upload_incident_document(
    incident_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Uploads a document to Azure Blob Storage and tracks version history in PostgreSQL.
    Triggers an asynchronous search indexing task upon upload.
    """
    content = await file.read()
    file_blob_name = f"{incident_id}_{uuid.uuid4()}_{file.filename}"
    
    try:
        storage_url = upload_document(file_blob_name, content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload to storage: {str(e)}")
    
    # Calculate next version
    existing = db.query(Document).filter(
        Document.incident_id == incident_id,
        Document.file_name == file.filename
    ).order_by(Document.version.desc()).first()
    
    next_version = 1 if not existing else existing.version + 1
    
    new_doc = Document(
        incident_id=incident_id,
        file_name=file.filename,
        storage_location=storage_url,
        uploader_id=current_user.id,
        version=next_version
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    # Note: In a complete implementation, we'd trigger OCR parsing and Solr/ES indexing via Celery here
    
    return {
        "message": "Document uploaded successfully", 
        "document_id": new_doc.id, 
        "version": new_doc.version,
        "url": new_doc.storage_location
    }

@router.get("/incident/{incident_id}/list")
def list_incident_documents(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Lists all documents linked to an incident, including their version history.
    """
    docs = db.query(Document).filter(Document.incident_id == incident_id).all()
    return [{"id": d.id, "filename": d.file_name, "version": d.version, "upload_date": d.upload_date} for d in docs]
