import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, SessionLocal
from app.models.base import Base as ModelBase
from app.models.users import User, Branch, RoleEnum
from app.models.incidents import Incident, IncidentNote, Document, AuditLog
from sqlalchemy.orm import Session
from app.core import security

print("Ensuring database tables exist...")
ModelBase.metadata.create_all(bind=engine)

db = SessionLocal()

BRANCH_MAPPING = {
  "AAW Group Holdings": [
    "IT & Security",
    "Finance",
    "Risk & Compliance",
    "People & Safety"
  ],
  "AAW Global Logistics - AU": [
    "AAW Global - MEL",
    "AAW Global - SYD",
    "AAW Global - BNE",
    "AAW Global - ADL",
    "AAW Global - FRE",
    "AAW Brokerage",
    "AAW Project Logistics"
  ],
  "AAW Global Logistics - NZ": [
    "AAW Global - AKL"
  ],
  "AAW Bulk Liquid Logistics": [
    "AAW BLL"
  ],
  "Hoyer Logistics Australia": [
    "HLA"
  ],
  "Coastalbridge": [
    "Coastalbridge",
    "Coastalbridge Agencies"
  ],
  "Regional Shipping Services": [
    "PILLA",
    "RSS"
  ],
  "International Logistics Management": [
    "ILM"
  ]
}

try:
    print("Wiping old data...")
    db.query(AuditLog).delete()
    db.query(Document).delete()
    db.query(IncidentNote).delete()
    db.query(Incident).delete()
    db.query(User).delete()
    db.query(Branch).delete()
    db.commit()

    print("Checking/Seeding AAW Branches and Users...")
    pwd_hash = security.get_password_hash("Access2026!")

    # Global full access admin
    full_admin = User(email="full.access@aaw.com", hashed_password=pwd_hash, name="Global Admin", role=RoleEnum.full_access)
    db.add(full_admin)

    # Seed Business Unit access users (e.g., National Managers)
    for bu in BRANCH_MAPPING.keys():
        safe_bu = bu.lower().replace(" ", ".").replace("-", "").replace("&", "and")
        u = User(
            email=f"{safe_bu}.manager@aaw.com",
            hashed_password=pwd_hash,
            name=f"{bu} Manager",
            role=RoleEnum.bu_access
        )
        db.add(u)
    
    db.commit()

    # Seed Branches and Branch Users
    for bu, branches in BRANCH_MAPPING.items():
        for b_name in branches:
            new_branch = Branch(name=b_name, business_unit=bu)
            db.add(new_branch)
            db.commit()
            db.refresh(new_branch)

            # Determine role based on branch name (Command Center vs standard branch)
            role = RoleEnum.branch_access
            if b_name == "IT & Security":
                role = RoleEnum.it_access
            elif b_name == "Finance":
                role = RoleEnum.finance_access
            elif b_name == "Risk & Compliance":
                role = RoleEnum.risk_compliance
            elif b_name == "People & Safety":
                role = RoleEnum.hr_access
            
            safe_email = b_name.lower().replace(" ", ".").replace("-", "").replace("&", "and") + "@aaw.com"
            safe_email = safe_email.replace("..", ".")
            
            u = User(
                email=safe_email,
                hashed_password=pwd_hash,
                name=f"{b_name} User",
                role=role,
                branch_id=new_branch.id
            )
            db.add(u)
            print(f"Created: {safe_email} | Role: {role.value}")

    # Add a generic 'submit only' user
    submit_user = User(email="submit.only@aaw.com", hashed_password=pwd_hash, name="Standard Operator", role=RoleEnum.submit_only)
    db.add(submit_user)

    db.commit()
    print("Seeding complete. Matrix enforced.")

except Exception as e:
    print(f"Error seeding data: {e}")
    db.rollback()
finally:
    db.close()
