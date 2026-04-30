import os
from azure.storage.blob import BlobServiceClient
from app.core.config import settings

# In production this would come from settings or Key Vault
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;")
CONTAINER_NAME = "incident-documents"

blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)

def get_container_client():
    container_client = blob_service_client.get_container_client(CONTAINER_NAME)
    if not container_client.exists():
        container_client.create_container()
    return container_client

def upload_document(file_name: str, file_data: bytes) -> str:
    container_client = get_container_client()
    blob_client = container_client.get_blob_client(file_name)
    blob_client.upload_blob(file_data, overwrite=True)
    return blob_client.url

def generate_blob_sas_url(file_name: str) -> str:
    # Logic to return a temporary read-only URL
    pass
