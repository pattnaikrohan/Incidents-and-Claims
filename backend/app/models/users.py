import enum
from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.models.base import Base

class RoleEnum(str, enum.Enum):
    full_access = "full_access"
    bu_access = "bu_access"
    branch_access = "branch_access"
    hr_access = "hr_access"
    whs_access = "whs_access"
    it_access = "it_access"
    risk_compliance = "risk_compliance"
    finance_access = "finance_access"
    submit_only = "submit_only"

class Branch(Base):
    __tablename__ = "branches"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    business_unit = Column(String, nullable=False)
    
    users = relationship("User", back_populates="branch")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.branch_access, nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    
    branch = relationship("Branch", back_populates="users")
