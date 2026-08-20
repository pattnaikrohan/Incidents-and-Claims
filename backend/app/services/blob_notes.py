"""
Azure Blob Storage backed collaboration notes service.

Stores each incident's collaboration thread as a JSON file in Azure Blob Storage
at the path: collaboration/{incident_id}/notes.json

This ensures notes persist across Azure App Service restarts and are accessible
in real-time across all environments.
"""
import json
from datetime import datetime, timezone
from azure.storage.blob import BlobServiceClient, ContentSettings

# Azure Storage configuration
AZURE_STORAGE_ACCOUNT = "aawaidata"
AZURE_CONTAINER_NAME = "incidents-and-claims"
AZURE_SAS_TOKEN = "sv=2025-11-05&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2042-01-10T20:44:30Z&st=2026-05-13T12:29:30Z&spr=https&sig=wajZ0DL2fBd%2BSDRe9%2FPgZD3nLeKdKs7Kr9%2FOvUHUVb0%3D"
AZURE_BLOB_BASE_URL = f"https://{AZURE_STORAGE_ACCOUNT}.blob.core.windows.net"

NOTES_FOLDER = "collaboration"


def _get_blob_client(incident_id: str):
    """Get a blob client for the notes JSON file of a specific incident."""
    # Sanitize incident_id to be safe for blob path
    safe_id = str(incident_id).strip().replace("/", "_").replace("\\", "_")
    blob_path = f"{NOTES_FOLDER}/{safe_id}/notes.json"
    blob_service_client = BlobServiceClient(
        account_url=AZURE_BLOB_BASE_URL, credential=AZURE_SAS_TOKEN
    )
    return blob_service_client.get_blob_client(
        container=AZURE_CONTAINER_NAME, blob=blob_path
    )


def get_notes(incident_id: str) -> list:
    """Fetch all collaboration notes for an incident from Azure Blob Storage."""
    try:
        blob_client = _get_blob_client(incident_id)
        if not blob_client.exists():
            return []
        blob_data = blob_client.download_blob().readall()
        notes = json.loads(blob_data.decode("utf-8"))
        return notes if isinstance(notes, list) else []
    except Exception as e:
        error_msg = str(e)
        if "BlobNotFound" in error_msg or "ResourceNotFound" in error_msg or "404" in error_msg:
            return []
        print(f"[BlobNotes] Error fetching notes for {incident_id}: {e}")
        return []


POWER_AUTOMATE_COLLABORATION_URL = (
    "https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/"
    "powerautomate/automations/direct/cu/29/workflows/5c440ebc9da5492ca70c12ad1274f7c8/"
    "triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=bHUdb-NvEZr5C3VvzREdUc5jsQyvWBjFGn2daF6tUdg"
)


def _trigger_power_automate(incident_id: str, message: str, author_name: str, timestamp: str):
    """Trigger the Power Automate collaboration flow in a non-blocking manner."""
    import threading
    import requests

    def _call():
        try:
            payload = {
                "incident_id": str(incident_id),
                "message": message,
                "author_name": author_name,
                "timestamp": timestamp,
            }
            requests.post(
                POWER_AUTOMATE_COLLABORATION_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10,
            )
        except Exception as e:
            print(f"[BlobNotes] Power Automate notification error: {e}")

    threading.Thread(target=_call, daemon=True).start()


def add_note(incident_id: str, message: str, author_name: str, note_type: str = "user") -> dict:
    """Add a new collaboration note for an incident, persisted to Azure Blob Storage."""
    notes = get_notes(incident_id)

    timestamp_str = datetime.now(timezone.utc).isoformat()
    new_note = {
        "id": len(notes) + 1,
        "incident_id": str(incident_id),
        "message": message,
        "author_name": author_name,
        "note_type": note_type,
        "timestamp": timestamp_str,
    }
    notes.append(new_note)

    try:
        blob_client = _get_blob_client(incident_id)
        json_bytes = json.dumps(notes, default=str, indent=2).encode("utf-8")
        blob_client.upload_blob(
            json_bytes,
            overwrite=True,
            content_settings=ContentSettings(content_type="application/json")
        )
    except Exception as e:
        print(f"[BlobNotes] Error saving note for {incident_id}: {e}")
        raise

    # Trigger Power Automate notification flow
    _trigger_power_automate(incident_id, message, author_name, timestamp_str)

    return new_note


def clear_notes(incident_id: str) -> int:
    """Delete all collaboration notes for an incident. Returns the count removed."""
    notes = get_notes(incident_id)
    count = len(notes)

    try:
        blob_client = _get_blob_client(incident_id)
        if blob_client.exists():
            blob_client.delete_blob()
    except Exception as e:
        print(f"[BlobNotes] Error clearing notes for {incident_id}: {e}")
        raise

    return count
