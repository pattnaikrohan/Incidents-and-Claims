from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings
from app.core.store import store
from app.models.users import RoleEnum

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

def get_db():
    # Return the memory store instead of a database session
    return store

def get_current_user(request: Request, db = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
    
    # Check if this is an Azure AD SSO token
    auth_source = request.headers.get("X-Auth-Source", "")
    
    if auth_source == "azure-ad":
        # ── Azure AD Token Validation ─────────────────────────
        try:
            from app.core.azure_auth import validate_azure_token, resolve_role_from_groups
            
            claims = validate_azure_token(token)
            email = claims.get("preferred_username") or claims.get("email") or claims.get("upn", "")
            name = claims.get("name", email)
            group_ids = claims.get("groups", [])
            
            # Resolve role from AD group memberships
            resolved = resolve_role_from_groups(group_ids)
            role_str = resolved["role"]
            
            # Map string role to RoleEnum
            try:
                role_enum = RoleEnum(role_str)
            except ValueError:
                role_enum = RoleEnum.submit_only
            
            # Find matching branch_id if we have a branch_name
            branch_id = None
            if resolved.get("branch_name"):
                # Try exact match first, then case-insensitive contains as fallback
                for b in db.branches:
                    if b["name"] == resolved["branch_name"]:
                        branch_id = b["id"]
                        break
                if branch_id is None:
                    for b in db.branches:
                        if resolved["branch_name"].lower() in b["name"].lower() or b["name"].lower() in resolved["branch_name"].lower():
                            branch_id = b["id"]
                            break
            
            # Create a user-like object for compatibility
            class SSOUserObj:
                def __init__(self):
                    self.id = 0  # Virtual user ID for SSO users
                    self.email = email
                    self.name = name
                    self.role = role_enum
                    self.branch_id = branch_id
                    self.business_unit = resolved.get("business_unit")
                    self.is_sso = True
            
            return SSOUserObj()
            
        except JWTError as e:
            print(f"[Auth] Azure AD token validation failed: {e}")
            raise credentials_exception
        except Exception as e:
            print(f"[Auth] Unexpected error validating Azure AD token: {e}")
            raise credentials_exception
    
    # ── Local JWT Token Validation (legacy) ─────────────────
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
    
    # Resolve business_unit from branch_id for BU scoping
    user_data = dict(user)
    if user_data.get("branch_id") and "business_unit" not in user_data:
        branch = next((b for b in db.branches if b["id"] == user_data["branch_id"]), None)
        user_data["business_unit"] = branch["business_unit"] if branch else None
    
    # Convert dict to a simple object for attribute access compatibility
    class UserObj:
        def __init__(self, **entries): self.__dict__.update(entries)
    return UserObj(**user_data)

def get_current_active_user(current_user = Depends(get_current_user)):
    return current_user

def require_risk_compliance_role(current_user = Depends(get_current_active_user)):
    if current_user.role not in [RoleEnum.risk_compliance, RoleEnum.full_access]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires Risk & Compliance permissions"
        )
    return current_user
