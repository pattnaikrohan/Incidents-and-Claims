from fastapi import APIRouter
from app.api import auth, incidents, dashboard, documents, speech

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(speech.router, prefix="/speech", tags=["Speech Extraction"])
# api_router.include_router(search.router, prefix="/search", tags=["Search"])
# api_router.include_router(email.router, prefix="/email", tags=["Email"])
