import os
from fastapi import APIRouter, UploadFile, File, HTTPException
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Environment variable pointing to the Power Automate HTTP request trigger URL.
# Ensure this is set securely via Azure configuration or an .env file.
POWER_AUTOMATE_WEBHOOK_URL = os.getenv("POWER_AUTOMATE_WEBHOOK_URL", "")

@router.post("/extract")
async def extract_incident_from_audio(file: UploadFile = File(...)):
    """
    Receives an audio file (WebM/WAV) containing a dictated incident.
    Acts as a secure proxy to forward audio bytes to Power Automate.
    """
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid file format. Must be audio.")

    try:
        audio_bytes = await file.read()
        logger.info(f"Received dictation audio payload: {file.filename} | Size: {len(audio_bytes)} bytes")
        
        # -------------------------------------------------------------
        # FUTURE STATE: Integration with Power Automate 
        # Uncomment and utilize `httpx` to POST the audio to Power Automate Flow
        # which runs the AI Builder prompt to extract the M-Files schema JSON.
        #
        # async with httpx.AsyncClient() as client:
        #    response = await client.post(
        #        POWER_AUTOMATE_WEBHOOK_URL, 
        #        files={'file': (file.filename, audio_bytes, file.content_type)}
        #    )
        #    return {"status": "success", "extracted_data": response.json()}
        # -------------------------------------------------------------
        
        # CURRENT STATE: MOCK RESPONSE
        # Represents the extracted structured JSON payload returned from the AI agent.
        mock_extracted_data = {
            "name": "Cargo Spoilage - Thermal variance detected (Voice Overwrite)",
            "type": "Cargo Damage",
            "vault": "Global",
            "location": "Port Botany Container Terminal",
            "customer": "Oceanic Cold Chain Logistics",
            "description": "The driver identified that the container seals were disturbed upon pickup. The temperature logs indicate a 6-degree variance outside the required threshold for a period exceeding 12 hours. Perishable cargo is visibly compromised.",
            "responsible_party": "Triton Freight Carrier",
            "incident_state": "Open - Intent to Claim",
            "cor_risk_level": "Medium",
            "cor_required": "Yes",
            "state_location": "NSW"
        }
        
        return {"status": "success", "extracted_data": mock_extracted_data}
        
    except Exception as e:
        logger.error(f"Failed to process dictation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse audio and extract metadata via AI.")
