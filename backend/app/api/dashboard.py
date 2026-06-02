from fastapi import APIRouter, Depends
from app.api.deps import get_db, get_current_active_user
from collections import Counter

router = APIRouter()

@router.get("/statistics")
def get_dashboard_statistics(
    db = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Returns aggregated analytics for Risk & Compliance teams using In-Memory data.
    """
    from app.models.users import RoleEnum
    
    role = current_user.role
    all_incidents = db.incidents
    
    def get_val(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)
    
    if role in [RoleEnum.full_access, RoleEnum.risk_compliance]:
        incidents = all_incidents
    elif role == RoleEnum.bu_access:
        user_bus = getattr(current_user, "business_units", [])
        if not user_bus:
            single_bu = getattr(current_user, "business_unit", None)
            user_bus = [single_bu] if single_bu else []
        bu_map = {b["id"]: b["business_unit"] for b in db.branches}
        bu_set = set(user_bus)
        incidents = [i for i in all_incidents if bu_map.get(get_val(i, "branch_id"), "") in bu_set]
    elif role == RoleEnum.branch_access:
        user_branch_ids = getattr(current_user, 'branch_ids', [])
        if not user_branch_ids:
            single_bid = getattr(current_user, 'branch_id', None)
            user_branch_ids = [single_bid] if single_bid else []
        branch_set = set(user_branch_ids)
        incidents = [i for i in all_incidents if get_val(i, "branch_id") in branch_set]
    elif role in [RoleEnum.it_access, RoleEnum.finance_access, RoleEnum.hr_access]:
        # Department roles: their incident types globally + any branch incidents
        func_roles = getattr(current_user, 'functional_roles', [])
        if not func_roles:
            func_roles = [role.value]
        type_filter = set()
        for fr in func_roles:
            if fr == 'it_access':
                type_filter.update(['Data Breach','Ransomware / Malware','Phishing Attack','System Outage','Software Failure','Hardware Failure'])
            elif fr == 'hr_access':
                type_filter.update(['Near Miss','First Aid Injury','Lost Time Injury','Workplace Harassment','Misconduct','Grievance'])
            elif fr == 'finance_access':
                type_filter.update(['Travel Disruption','Financial Loss','Fraud','Payment Error'])
        incidents = [i for i in all_incidents if get_val(i, "type") in type_filter]
        # Cross-tier: also include branch incidents
        user_branch_ids = getattr(current_user, 'branch_ids', [])
        if user_branch_ids:
            branch_set = set(user_branch_ids)
            branch_incidents = [i for i in all_incidents if get_val(i, "branch_id") in branch_set and i not in incidents]
            incidents = incidents + branch_incidents
    else:
        incidents = [i for i in all_incidents if get_val(i, "creator_id") == current_user.id]

    branches = db.branches

    # Total open
    total_open = len([i for i in incidents if get_val(i, "status") not in ["Closed", "Claim Processing"]])
    
    # By Branch
    # Create a mapping of branch_id -> branch_name
    branch_map = {b["id"]: b["name"] for b in branches}
    branch_counts = Counter([get_val(i, "branch_id") for i in incidents])
    
    by_branch = []
    for b_id, count in branch_counts.items():
        if b_id in branch_map:
            by_branch.append({"branch": branch_map[b_id], "count": count})
            
    # By Type
    type_counts = Counter([get_val(i, "type") for i in incidents])
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
