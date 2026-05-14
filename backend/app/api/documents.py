from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.api.deps import get_db, get_current_active_user
from app.models.incidents import Document
from datetime import datetime
import uuid
import os
from azure.storage.blob import BlobServiceClient

router = APIRouter()

# Azure Storage Configuration
AZURE_STORAGE_ACCOUNT = "aawaidata"
AZURE_CONTAINER_NAME = "incidents-and-claims"
AZURE_SAS_TOKEN = "sv=2025-11-05&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2042-01-10T20:44:30Z&st=2026-05-13T12:29:30Z&spr=https&sig=wajZ0DL2fBd%2BSDRe9%2FPgZD3nLeKdKs7Kr9%2FOvUHUVb0%3D"
AZURE_BLOB_BASE_URL = f"https://{AZURE_STORAGE_ACCOUNT}.blob.core.windows.net"

def normalize_incident_type(raw_type: str) -> str:
    """Normalizes frontend incident types to their exact Azure Blob Storage folder names."""
    if not raw_type:
        return "General Incident"
    
    mapping = {
        # Short category names from frontend
        "Cargo & Equipment": "Cargo & Equipment Incident",
        "Human Resources": "Human Resources Incident",
        "IT & Security": "IT & Security Incident",
        "Risk & Compliance": "Risk & Compliance Incident",
        "Finance": "Finance Incident",
        "WH&S": "WH&S Incident",
        "NCR": "Non-Conformance Report (NCR)",
        "Non-Conformance Report": "Non-Conformance Report (NCR)",
        # Identity mappings - exact folder names pass through unchanged
        "Cargo & Equipment Incident": "Cargo & Equipment Incident",
        "Human Resources Incident": "Human Resources Incident",
        "IT & Security Incident": "IT & Security Incident",
        "Risk & Compliance Incident": "Risk & Compliance Incident",
        "Finance Incident": "Finance Incident",
        "WH&S Incident": "WH&S Incident",
        "Non-Conformance Report (NCR)": "Non-Conformance Report (NCR)",
        "General Incident": "General Incident",
    }
    return mapping.get(raw_type, raw_type)

@router.post("/incident/{incident_id}/upload", status_code=201)
async def upload_incident_document(
    incident_id: str,
    file: UploadFile = File(...),
    incident_type: str = None,
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    # Determine the folder structure based on provided type or inferred from ID
    final_incident_type = "General Incident"
    if incident_type:
        final_incident_type = normalize_incident_type(incident_type)
    else:
        prefix = incident_id.split("-")[0].upper() if "-" in incident_id else ""
        type_map = {
            "CEI": "Cargo & Equipment Incident",
            "HR": "Human Resources Incident",
            "WHS": "WH&S Incident",
            "IT": "IT & Security Incident",
            "RSK": "Risk & Compliance Incident",
            "FIN": "Finance Incident",
            "NCR": "Non-Conformance Report (NCR)"
        }
        final_incident_type = type_map.get(prefix, "General Incident")
    
    # Define the dynamic path as requested: [Incident Type] / [Incident ID] / [Filenames]
    blob_path = f"{final_incident_type}/{incident_id}/{file.filename}"
    
    try:
        # Initialize Azure Client
        blob_service_client = BlobServiceClient(account_url=AZURE_BLOB_BASE_URL, credential=AZURE_SAS_TOKEN)
        blob_client = blob_service_client.get_blob_client(container=AZURE_CONTAINER_NAME, blob=blob_path)
        
        # Read and Upload
        file_content = await file.read()
        blob_client.upload_blob(file_content, overwrite=True)
        
        azure_url = f"{AZURE_BLOB_BASE_URL}/{AZURE_CONTAINER_NAME}/{blob_path}?{AZURE_SAS_TOKEN}"
        
        # Record in local metadata store
        new_doc = Document(
            id=len(db.documents) + 1,
            incident_id=incident_id,
            file_name=file.filename,
            storage_location=azure_url,
            uploader_id=current_user.id,
            version=1,
            upload_date=datetime.now()
        )
        db.add(new_doc)
        
        return {
            "message": "Document uploaded to Azure Blob Storage", 
            "document_id": new_doc.id, 
            "url": azure_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload to Azure: {str(e)}")

@router.get("/incident/{incident_id}/list")
def list_incident_documents(
    incident_id: str,
    incident_type: str = None,
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    results = []
    seen_filenames = set()

    try:
        # Initialize Azure Client
        blob_service_client = BlobServiceClient(account_url=AZURE_BLOB_BASE_URL, credential=AZURE_SAS_TOKEN)
        container_client = blob_service_client.get_container_client(AZURE_CONTAINER_NAME)

        # 1. Build search path based on incident type
        final_incident_type = "General Incident"
        if incident_type:
            final_incident_type = normalize_incident_type(incident_type)
        else:
            prefix = incident_id.split("-")[0].upper() if "-" in incident_id else ""
            type_map = {
                "CEI": "Cargo & Equipment Incident",
                "HR": "Human Resources Incident",
                "WHS": "WH&S Incident",
                "IT": "IT & Security Incident",
                "RSK": "Risk & Compliance Incident",
                "FIN": "Finance Incident",
                "NCR": "Non-Conformance Report (NCR)"
            }
            final_incident_type = type_map.get(prefix, "General Incident")

        target_path = f"{final_incident_type}/{incident_id}/"

        # 2. Live scan Azure for exactly this path
        try:
            blobs = container_client.list_blobs(name_starts_with=target_path)
            for blob in blobs:
                fname = blob.name.split("/")[-1]
                if fname and fname not in seen_filenames:
                    url = f"{AZURE_BLOB_BASE_URL}/{AZURE_CONTAINER_NAME}/{blob.name}?{AZURE_SAS_TOKEN}"
                    results.append({
                        "id": blob.name,
                        "filename": fname,
                        "url": url,
                        "version": 1,
                        "upload_date": blob.last_modified
                    })
                    seen_filenames.add(fname)
        except Exception as scan_err:
            print(f"Error during prefix scan for {target_path}: {scan_err}")

    except Exception as e:
        print(f"Azure live scan failed: {e}")

    return {
        "documents": sorted(results, key=lambda x: x["upload_date"], reverse=True)
    }

@router.delete("/incident/{incident_id}/document")
def delete_incident_document(
    incident_id: str,
    filename: str,
    incident_type: str = None,
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    try:
        final_incident_type = "General Incident"
        if incident_type:
            final_incident_type = normalize_incident_type(incident_type)
        else:
            prefix = incident_id.split("-")[0].upper() if "-" in incident_id else ""
            type_map = {
                "CEI": "Cargo & Equipment Incident",
                "HR": "Human Resources Incident",
                "WHS": "WH&S Incident",
                "IT": "IT & Security Incident",
                "RSK": "Risk & Compliance Incident",
                "FIN": "Finance Incident",
                "NCR": "Non-Conformance Report (NCR)"
            }
            final_incident_type = type_map.get(prefix, "General Incident")

        blob_path = f"{final_incident_type}/{incident_id}/{filename}"
        
        blob_service_client = BlobServiceClient(account_url=AZURE_BLOB_BASE_URL, credential=AZURE_SAS_TOKEN)
        blob_client = blob_service_client.get_blob_client(container=AZURE_CONTAINER_NAME, blob=blob_path)
        
        blob_client.delete_blob()
        
        # Remove from local metadata if present
        db.documents = [d for d in db.documents if not (str(d.get("incident_id") if isinstance(d, dict) else d.incident_id).lower() == str(incident_id).lower() and (d.get("file_name") if isinstance(d, dict) else d.file_name) == filename)]
        
        return {"message": "Document deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")
