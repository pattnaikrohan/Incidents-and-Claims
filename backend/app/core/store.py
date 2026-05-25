import json
import os
from datetime import datetime
from app.core import security
from app.models.users import RoleEnum

# Use a stable absolute path for the local database file in the project root
DB_FILE = os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")), "db.json")

class MemoryStore:
    def __init__(self):
        print(f"DEBUG: Initializing MemoryStore with DB_FILE: {DB_FILE}")
        self.users = []
        self.branches = []
        self.incidents = []
        self.audit_logs = []
        self.documents = []
        self.notes = []
        self._seed()
        self._load()

    def _seed(self):
        # (Seeding logic remains the same)
        pwd_hash = security.get_password_hash("Access2026!")
        branch_data = {
            "AAW Group Holdings": ["IT & Security", "Finance", "Risk & Compliance", "People & Safety"],
            "AAW Global Logistics - AU": ["AAW Global Logistics - Melbourne", "AAW Global Logistics - Sydney", "AAW Global Logistics - Brisbane", "AAW Global Logistics - Adelaide", "AAW Global Logistics - Fremantle", "AAW Customs Brokerage", "AAW Project Logistics"],
            "AAW Global Logistics - NZ": ["AAW Global Logistics - Auckland"],
            "AAW Bulk Liquid Logistics": ["AAW Bulk Liquid Logistics Team"],
            "Hoyer Logistics Australia": ["Hoyer Logistics Australia"],
            "Coastalbridge": ["Coastalbridge", "Coastalbridge Agencies"],
            "Regional Shipping Services": ["PIL Logistics Australia", "Regional Shipping Services"],
            "International Logistics Management": ["ILM"]
        }
        b_id = 1
        for bu, names in branch_data.items():
            for name in names:
                self.branches.append({"id": b_id, "name": name, "business_unit": bu})
                b_id += 1
        self.users.append({"id": 1, "email": "full.access@aaw.com", "name": "Global Admin", "hashed_password": pwd_hash, "role": RoleEnum.full_access, "branch_id": None})
        for branch in self.branches:
            b_name = branch["name"]
            role = RoleEnum.branch_access
            if b_name == "IT & Security": role = RoleEnum.it_access
            elif b_name == "Finance": role = RoleEnum.finance_access
            elif b_name == "Risk & Compliance": role = RoleEnum.risk_compliance
            elif b_name == "People & Safety": role = RoleEnum.hr_access
            safe_email = b_name.lower().replace(" & ", ".").replace("&", "").replace(" - ", ".").replace(" ", ".").replace("-", "").replace("..", ".") + "@aaw.com"
            self.users.append({"id": len(self.users) + 1, "email": safe_email, "hashed_password": pwd_hash, "name": f"{b_name} User", "role": role, "branch_id": branch["id"]})

    def _load(self):
        if os.path.exists(DB_FILE):
            try:
                with open(DB_FILE, "r") as f:
                    data = json.load(f)
                    # We only load dynamic data, keeping seeded branches/users
                    self.incidents = data.get("incidents", [])
                    self.documents = data.get("documents", [])
                    self.notes = data.get("notes", [])
                    self.audit_logs = data.get("audit_logs", [])
                    print(f"Loaded {len(self.incidents)} incidents from {DB_FILE}")
            except Exception as e:
                print(f"Failed to load DB: {e}")

    def _save(self):
        try:
            # Simple serialization (handling non-serializable types if any)
            data = {
                "incidents": self.incidents,
                "documents": self.documents,
                "notes": self.notes,
                "audit_logs": self.audit_logs
            }
            # Note: In a real app, we'd use a proper serializer for datetime objects
            # For this mock, we'll just skip the complex types or convert them
            with open(DB_FILE, "w") as f:
                json.dump(data, f, default=str)
        except Exception as e:
            print(f"Failed to save DB: {e}")

    def query(self, model_type):
        return self

    def add(self, item):
        type_str = str(type(item))
        # Convert SQLAlchemy objects to dicts for persistence if needed
        # (Though in this mock setup they are mostly already dicts or simple objects)
        
        target_list = []
        if "Incident" in type_str: target_list = self.incidents
        elif "User" in type_str: target_list = self.users
        elif "Document" in type_str: target_list = self.documents
        elif "IncidentNote" in type_str: target_list = self.notes
        elif "AuditLog" in type_str: target_list = self.audit_logs

        if not hasattr(item, 'id') or item.id is None:
            item.id = len(target_list) + 1
        
        # Convert object to dict for JSON serialization
        record = item
        if hasattr(item, '__dict__'):
            record = {k: v for k, v in item.__dict__.items() if not k.startswith('_')}
        
        if "Incident" in type_str: self.incidents.append(record)
        elif "User" in type_str: self.users.append(record)
        elif "AuditLog" in type_str: self.audit_logs.append(record)
        elif "Document" in type_str: self.documents.append(record)
        elif "IncidentNote" in type_str: self.notes.append(record)
        
        self._save()

    def commit(self): pass
    def refresh(self, item): pass
    def close(self): pass

# Global instance
store = MemoryStore()
