from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.api.deps import require_risk_compliance_role
from app.models.users import User, Branch
from app.models.incidents import Incident

router = APIRouter()

@router.get("/statistics")
def get_dashboard_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_risk_compliance_role)
):
    """
    Returns aggregated analytics for Risk & Compliance teams:
    - Incidents by branch
    - Incidents by type
    - Open vs Closed incidents
    """
    # Total open
    total_open = db.query(Incident).filter(Incident.status.notin_(["Closed", "Claim Processing"])).count()
    
    # By Branch
    by_branch = db.query(
        Branch.name, func.count(Incident.id)
    ).join(Incident, Branch.id == Incident.branch_id).group_by(Branch.name).all()
    
    # By Type
    by_type = db.query(
        Incident.type, func.count(Incident.id)
    ).group_by(Incident.type).all()
    
    return {
        "total_open": total_open,
        "by_branch": [{"branch": b[0], "count": b[1]} for b in by_branch],
        "by_type": [{"type": t[0], "count": t[1]} for t in by_type]
    }
