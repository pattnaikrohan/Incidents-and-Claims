from fastapi import FastAPI, Request
from app.api.api import api_router
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

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
    "https://icy-desert-0a4e94a00.azurestaticapps.net",
    "https://ashy-forest-0478c1800.azurestaticapps.net",
    "https://incidents-and-claims.azurewebsites.net"
]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.azurestaticapps\.net|http://localhost:5173|http://127.0.0.1:5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Essential for HTTPS redirects on Azure
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

app.include_router(api_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "incident-management-in-memory"}
