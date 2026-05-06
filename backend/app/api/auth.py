from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.api.deps import get_db
from app.core import security
from pydantic import BaseModel

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    branch_id: int | None = None
    branch_name: str | None = None
    business_unit: str | None = None

@router.post("/login", response_model=Token)
def login_access_token(db = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    # Search memory store
    user = next((u for u in db.users if u["email"] == form_data.username), None)
    
    if not user or not security.verify_password(form_data.password, user["hashed_password"]): 
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = security.create_access_token(data={"sub": user["email"]})
    
    branch_name = None
    business_unit = None
    
    if user["branch_id"]:
        branch = next((b for b in db.branches if b["id"] == user["branch_id"]), None)
        if branch:
            branch_name = branch["name"]
            business_unit = branch["business_unit"]
    
    # If BU manager, they might not have a branch_id but we can derive BU from their name/email
    # or better, just check if they have a BU role
    if not business_unit and user["role"] == RoleEnum.bu_access:
        # In our seed, bu managers have names like "AAW Global Logistics - AU Manager"
        business_unit = user["name"].replace(" Manager", "")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"].value if hasattr(user["role"], 'value') else user["role"],
        "branch_id": user["branch_id"],
        "branch_name": branch_name,
        "business_unit": business_unit
    }
