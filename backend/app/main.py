from fastapi import FastAPI, Request
from app.api.api import api_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Incident & Claims Management API",
    description="Zero-DB High Performance API for Incident Management",
    version="1.0.0"
)

# Production CORS policy
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://icy-desert-0a4e94a00.7.azurestaticapps.net",
    "https://incidents-and-claims.azurewebsites.net"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "incident-management-in-memory"}
