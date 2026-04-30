from sqlalchemy.orm import Session
from app.models.users import User, Branch, RoleEnum
from app.models.base import Base
from app.core import security
from app.core.database import engine

BRANCH_MAPPING = {
  "AAW Group Holdings": ["IT & Security", "Finance", "Risk & Compliance", "People & Safety"],
  "AAW Global Logistics - AU": ["AAW Global - MEL", "AAW Global - SYD", "AAW Global - BNE", "AAW Global - ADL", "AAW Global - FRE", "AAW Brokerage", "AAW Project Logistics"],
  "AAW Global Logistics - NZ": ["AAW Global - AKL"],
  "AAW Bulk Liquid Logistics": ["AAW BLL"],
  "Hoyer Logistics Australia": ["HLA"],
  "Coastalbridge": ["Coastalbridge", "Coastalbridge Agencies"],
  "Regional Shipping Services": ["PILLA", "RSS"],
  "International Logistics Management": ["ILM"]
}

def init_db(db: Session):
    # 1. Create tables
    Base.metadata.create_all(bind=engine)
    
    # 2. Check if already seeded
    if db.query(User).first():
        return # Already has data

    print("Seeding database...")
    pwd_hash = security.get_password_hash("Access2026!")

    # Global Admin
    db.add(User(email="full.access@aaw.com", hashed_password=pwd_hash, name="Global Admin", role=RoleEnum.full_access))
    
    # Branches and Users
    for bu, branches in BRANCH_MAPPING.items():
        for b_name in branches:
            new_branch = Branch(name=b_name, business_unit=bu)
            db.add(new_branch)
            db.flush() # Get ID

            role = RoleEnum.branch_access
            if "IT" in b_name: role = RoleEnum.it_access
            elif "Finance" in b_name: role = RoleEnum.finance_access
            elif "Risk" in b_name: role = RoleEnum.risk_compliance
            elif "Safety" in b_name: role = RoleEnum.hr_access
            
            safe_email = b_name.lower().replace(" ", ".").replace("-", "").replace("&", "and") + "@aaw.com"
            safe_email = safe_email.replace("..", ".")
            
            db.add(User(
                email=safe_email,
                hashed_password=pwd_hash,
                name=f"{b_name} User",
                role=role,
                branch_id=new_branch.id
            ))
    
    db.commit()
    print("Seeding complete.")
