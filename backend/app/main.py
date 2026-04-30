from fastapi import FastAPI, Request
from app.api.api import api_router
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import SessionLocal
from app.models.incidents import AuditLog
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Incident & Claims Management API",
    description="API for managing cargo incidents, claims, documents, and reporting.",
    version="1.0.0"
)
#
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

@app.middleware("http")
async def audit_log_middleware(request: Request, call_next):
    response = await call_next(request)
    # Basic catch-all for state-changing requests
    if request.method in ["POST", "PUT", "DELETE"]:
        db = SessionLocal()
        try:
            log = AuditLog(
                action_type=f"{request.method} {request.url.path}",
                entity_type="API Endpoint",
                entity_id=0
            )
            db.add(log)
            db.commit()
        except:
            pass # Keep middleware lightweight and non-blocking
        finally:
            db.close()
    return response

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "incident-management"}
