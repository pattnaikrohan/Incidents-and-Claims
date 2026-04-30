from datetime import datetime
from app.core import security
from app.models.users import RoleEnum

class MemoryStore:
    def __init__(self):
        self.users = []
        self.branches = []
        self.incidents = []
        self.audit_logs = []
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
        
        # Seed Sydney User
        syd_branch = next(b for b in self.branches if "SYD" in b["name"])
        self.users.append({
            "id": 2, "email": "aaw.global.syd@aaw.com", "name": "Sydney User", 
            "hashed_password": pwd_hash, "role": RoleEnum.branch_access, "branch_id": syd_branch["id"]
        })

    # Helper methods to mimic SQLAlchemy query style
    def query(self, model_type):
        if "User" in str(model_type): return MockQuery(self.users)
        if "Branch" in str(model_type): return MockQuery(self.branches)
        if "Incident" in str(model_type): return MockQuery(self.incidents)
        return MockQuery([])

    def add(self, item):
        if not hasattr(item, 'id') or item.id is None:
            # Simple auto-increment
            target_list = []
            if "Incident" in str(type(item)): target_list = self.incidents
            elif "User" in str(type(item)): target_list = self.users
            item.id = len(target_list) + 1
        
        # Convert model object to dict for storage if needed, or just store object
        # For simplicity in this mock, we'll store the objects themselves
        if "Incident" in str(type(item)): self.incidents.append(item)
        elif "User" in str(type(item)): self.users.append(item)
        elif "AuditLog" in str(type(item)): self.audit_logs.append(item)

    def commit(self): pass
    def refresh(self, item): pass
    def close(self): pass

class MockQuery:
    def __init__(self, data):
        self.data = data
    def filter(self, condition): return self # Mocking filters for now
    def first(self): return self.data[0] if self.data else None
    def all(self): return self.data

# Global instance
store = MemoryStore()
