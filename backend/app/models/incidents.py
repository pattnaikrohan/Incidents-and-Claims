from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.models.base import Base

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, index=True)
    date = Column(DateTime, default=datetime.utcnow)
    location = Column(String)
    description = Column(Text)
    job_number = Column(String, index=True, nullable=True) # CargoWise job number
    status = Column(String, default="Open", index=True)
    creator_id = Column(Integer, ForeignKey("users.id"))
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    
    # Enrichment fields
    bill_of_lading = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)
    vessel_details = Column(String, nullable=True)
    departure_date = Column(DateTime, nullable=True)
    arrival_date = Column(DateTime, nullable=True)
    container_number = Column(String, nullable=True)
    seal_number = Column(String, nullable=True)
    vessel_name = Column(String, nullable=True)
    voyage_number = Column(String, nullable=True)
    port_of_loading = Column(String, nullable=True)
    port_of_discharge = Column(String, nullable=True)
    estimated_time_of_arrival = Column(DateTime, nullable=True)
    actual_time_of_arrival = Column(DateTime, nullable=True)
    estimated_time_of_departure = Column(DateTime, nullable=True)
    actual_time_of_departure = Column(DateTime, nullable=True)

    # AAW Specific / COR / Legal Fields
    vault = Column(String, nullable=True)
    incident_number_str = Column(String, nullable=True) # Manual ref if needed
    responsible_party = Column(String, nullable=True)
    company_liability = Column(String, nullable=True)
    cor_risk_level = Column(String, nullable=True) # Severe, High, Medium, Low
    cor_assessment = Column(Text, nullable=True)
    corrective_actions = Column(Text, nullable=True)
    status_remarks = Column(Text, nullable=True)
    formal_claim_issued = Column(String, nullable=True)
    insurer_notified = Column(String, nullable=True)
    management_escalation = Column(String, nullable=True)

    # Missing M-Files Master Log Fields
    name = Column(String, nullable=True)               # e.g., 'Cargo & Equipment Incident -416'
    incident_state = Column(String, nullable=True)     # e.g., 'Open - Intent to Claim'
    state_location = Column(String, nullable=True)     # e.g., 'NSW' or 'VIC' (mapped from 'State' in Excel)
    cor_required = Column(String, nullable=True)       # e.g., 'No' or 'Yes'
    dupli = Column(String, nullable=True)              # Duplication check field
    cant_find_email = Column(String, nullable=True)    # Checkbox/Flag
    email_subject = Column(String, nullable=True)
    follow_up_1 = Column(String, nullable=True)        # 1ST Follow Up Date/Status
    follow_up_2 = Column(String, nullable=True)        # 2ND Follow Up
    follow_up_3 = Column(String, nullable=True)        # 3RD Follow Up
    follow_up_4 = Column(String, nullable=True)        # 4TH Follow Up
    follow_up_5 = Column(String, nullable=True)        # 5TH Follow Up

    # Legal and Risk Assessment fields
    legal_assessment_status = Column(String, nullable=True, default="Pending")
    risk_assessment_status = Column(String, nullable=True, default="Pending")
    legal_team_assigned = Column(String, nullable=True)
    risk_team_assigned = Column(String, nullable=True)
    legal_notes = Column(Text, nullable=True)
    risk_notes = Column(Text, nullable=True)

    creator = relationship("User", foreign_keys=[creator_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    branch = relationship("Branch")
    notes = relationship("IncidentNote", back_populates="incident")
    documents = relationship("Document", back_populates="incident")

class IncidentNote(Base):
    __tablename__ = "incident_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Null for system messages
    message = Column(Text, nullable=False)
    note_type = Column(String, default="user") # 'user' or 'system'
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    incident = relationship("Incident", back_populates="notes")
    author = relationship("User", foreign_keys=[author_id])

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    file_name = Column(String, nullable=False)
    storage_location = Column(String, nullable=False)
    uploader_id = Column(Integer, ForeignKey("users.id"))
    upload_date = Column(DateTime, default=datetime.utcnow)
    version = Column(Integer, default=1)
    
    incident = relationship("Incident", back_populates="documents")
    uploader = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action_type = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
