import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from app.models.base import Base
from app.models.users import User, Branch
from app.models.incidents import Incident, IncidentNote, Document, AuditLog

def create():
    print("Forcing table creation in sql_app.db...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

if __name__ == "__main__":
    create()
