from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.api.deps import get_db, get_current_active_user
from app.models.incidents import Document
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/incident/{incident_id}/upload", status_code=201)
async def upload_incident_document(
    incident_id: int,
    file: UploadFile = File(...),
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    # In mock mode, we don't actually upload to Azure Blob, we just track the record
    new_doc = Document(
        id=len(db.documents) + 1,
        incident_id=incident_id,
        file_name=file.filename,
        storage_location=f"https://mock-storage.com/{uuid.uuid4()}_{file.filename}",
        uploader_id=current_user.id,
        version=1,
        upload_date=datetime.now()
    )
    db.add(new_doc)
    
    return {
        "message": "Document tracked in memory", 
        "document_id": new_doc.id, 
        "url": new_doc.storage_location
    }

@router.get("/incident/{incident_id}/list")
def list_incident_documents(
    incident_id: int,
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    docs = [d for d in db.documents if d.incident_id == incident_id]
    return [{"id": d.id, "filename": d.file_name, "version": d.version, "upload_date": d.upload_date} for d in docs]
