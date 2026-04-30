from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings
from app.core.store import store
from app.models.users import RoleEnum

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_db():
    # Return the memory store instead of a database session
    return store

def get_current_user(db = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Search the memory store for the user
    user = next((u for u in db.users if u["email"] == email), None)
    if user is None:
        raise credentials_exception
    
    # Convert dict to a simple object for attribute access compatibility
    class UserObj:
        def __init__(self, **entries): self.__dict__.update(entries)
    return UserObj(**user)

def get_current_active_user(current_user = Depends(get_current_user)):
    return current_user

def require_risk_compliance_role(current_user = Depends(get_current_active_user)):
    if current_user.role != RoleEnum.risk_compliance:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires Risk & Compliance permissions"
        )
    return current_user
