from fastapi import APIRouter, Depends
from app.api.deps import get_db, require_risk_compliance_role
from collections import Counter

router = APIRouter()

@router.get("/statistics")
def get_dashboard_statistics(
    db = Depends(get_db),
    current_user = Depends(require_risk_compliance_role)
):
    """
    Returns aggregated analytics for Risk & Compliance teams using In-Memory data.
    """
    incidents = db.incidents
    branches = db.branches

    # Total open
    total_open = len([i for i in incidents if i.status not in ["Closed", "Claim Processing"]])
    
    # By Branch
    # Create a mapping of branch_id -> branch_name
    branch_map = {b["id"]: b["name"] for b in branches}
    branch_counts = Counter([i.branch_id for i in incidents])
    
    by_branch = []
    for b_id, count in branch_counts.items():
        if b_id in branch_map:
            by_branch.append({"branch": branch_map[b_id], "count": count})
            
    # By Type
    type_counts = Counter([i.type for i in incidents])
    by_type = [{"type": t, "count": c} for t, c in type_counts.items()]
    
    # Add dummy data if empty so the dashboard charts aren't blank
    if not by_type:
        by_type = [{"type": "No Data", "count": 0}]
    if not by_branch:
        by_branch = [{"branch": "Head Office", "count": 0}]

    return {
        "total_open": total_open,
        "total_incidents": len(incidents),
        "total_closed": len(incidents) - total_open,
        "by_branch": by_branch,
        "by_type": by_type
    }
