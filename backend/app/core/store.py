from datetime import datetime
from app.core import security
from app.models.users import RoleEnum

class MemoryStore:
    def __init__(self):
        self.users = []
        self.branches = []
        self.incidents = []
        self.audit_logs = []
        self.documents = []
        self.notes = []
        self._seed()

    def _seed(self):
        pwd_hash = security.get_password_hash("Access2026!")
        
        # Seed Branches
        branch_data = {
            "AAW Group Holdings": ["IT & Security", "Finance", "Risk & Compliance", "People & Safety"],
            "AAW Global Logistics - AU": ["AAW Global - MEL", "AAW Global - SYD", "AAW Global - BNE", "AAW Global - ADL", "AAW Global - FRE"],
        }
        
        b_id = 1
        for bu, names in branch_data.items():
            for name in names:
                self.branches.append({"id": b_id, "name": name, "business_unit": bu})
                b_id += 1

        # Seed Users
        self.users.append({
            "id": 1, "email": "full.access@aaw.com", "name": "Global Admin", 
            "hashed_password": pwd_hash, "role": RoleEnum.full_access, "branch_id": None
        })
        
        # Seed Business Unit access users (e.g., National Managers)
        for bu in branch_data.keys():
            safe_bu = bu.lower().replace(" ", ".").replace("-", "").replace("&", "and")
            self.users.append({
                "id": len(self.users) + 1,
                "email": f"{safe_bu}.manager@aaw.com",
                "hashed_password": pwd_hash,
                "name": f"{bu} Manager",
                "role": RoleEnum.bu_access,
                "branch_id": None
            })

        # Seed Branches and Branch Users
        for branch in self.branches:
            b_name = branch["name"]
            
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
            
            self.users.append({
                "id": len(self.users) + 1,
                "email": safe_email,
                "hashed_password": pwd_hash,
                "name": f"{b_name} User",
                "role": role,
                "branch_id": branch["id"]
            })

        # Add a generic 'submit only' user
        self.users.append({
            "id": len(self.users) + 1,
            "email": "submit.only@aaw.com",
            "hashed_password": pwd_hash,
            "name": "Standard Operator",
            "role": RoleEnum.submit_only,
            "branch_id": None
        })

    def query(self, model_type):
        return self # Simple mock

    def add(self, item):
        if not hasattr(item, 'id') or item.id is None:
            # Simple auto-increment
            target_list = []
            type_str = str(type(item))
            if "Incident" in type_str: target_list = self.incidents
            elif "User" in type_str: target_list = self.users
            elif "Document" in type_str: target_list = self.documents
            elif "IncidentNote" in type_str: target_list = self.notes
            item.id = len(target_list) + 1
        
        type_str = str(type(item))
        if "Incident" in type_str: self.incidents.append(item)
        elif "User" in type_str: self.users.append(item)
        elif "AuditLog" in type_str: self.audit_logs.append(item)
        elif "Document" in type_str: self.documents.append(item)
        elif "IncidentNote" in type_str: self.notes.append(item)

    def commit(self): pass
    def refresh(self, item): pass
    def close(self): pass

# Global instance
store = MemoryStore()
