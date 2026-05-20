"""
Azure AD (Entra ID) Group → R&C Hub Role/Branch Mapping
========================================================

HOW TO USE:
1. Ask your Azure AD admin to go to:
   Azure Portal → Entra ID → Groups → Click each group → Copy the "Object ID"
   
2. Replace every "PASTE-GROUP-ID-HERE" below with the actual Object ID (GUID)
   Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

3. Each group maps to exactly one combination of:
   - role:          The permission level (matches existing RoleEnum)
   - branch_name:   The branch this group belongs to (must match store.py branch names EXACTLY)
   - business_unit: The parent business unit (must match store.py BU names EXACTLY)

IMPORTANT: branch_name values MUST match the names in store.py / init_db.py exactly.
"""

from app.models.users import RoleEnum


# ============================================================================
#  AD GROUP → ROLE/BRANCH MAPPING
# ============================================================================
# Key:   Azure AD Group Object ID (GUID string)
# Value: Dict with role, branch_name, business_unit
#
# Your admin can bulk-export these from PowerShell:
#   Get-AzureADGroup -SearchString "RCHub" | Select DisplayName, ObjectId
# ============================================================================

AD_GROUP_MAP: dict[str, dict] = {

    # ── GLOBAL / CROSS-FUNCTIONAL ROLES ─────────────────────────────────────

    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-FullAccess (or your equivalent)
        "role": RoleEnum.full_access,
        "branch_name": None,
        "business_unit": None,
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-RiskCompliance
        "role": RoleEnum.risk_compliance,
        "branch_name": "Risk & Compliance",
        "business_unit": "AAW Group Holdings",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-PeopleSafety
        "role": RoleEnum.hr_access,
        "branch_name": "People & Safety",
        "business_unit": "AAW Group Holdings",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-ITSecurity
        "role": RoleEnum.it_access,
        "branch_name": "IT & Security",
        "business_unit": "AAW Group Holdings",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Finance
        "role": RoleEnum.finance_access,
        "branch_name": "Finance",
        "business_unit": "AAW Group Holdings",
    },

    # ── BUSINESS UNIT MANAGERS ──────────────────────────────────────────────
    # These users see ALL incidents within their Business Unit

    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-BU-AAWGroupHoldings
        "role": RoleEnum.bu_access,
        "branch_name": None,
        "business_unit": "AAW Group Holdings",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-BU-AAWGlobalAU
        "role": RoleEnum.bu_access,
        "branch_name": None,
        "business_unit": "AAW Global Logistics - AU",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-BU-AAWGlobalNZ
        "role": RoleEnum.bu_access,
        "branch_name": None,
        "business_unit": "AAW Global Logistics - NZ",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-BU-AAWBulkLiquid
        "role": RoleEnum.bu_access,
        "branch_name": None,
        "business_unit": "AAW Bulk Liquid Logistics",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-BU-HoyerAU
        "role": RoleEnum.bu_access,
        "branch_name": None,
        "business_unit": "Hoyer Logistics Australia",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-BU-Coastalbridge
        "role": RoleEnum.bu_access,
        "branch_name": None,
        "business_unit": "Coastalbridge",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-BU-RSS
        "role": RoleEnum.bu_access,
        "branch_name": None,
        "business_unit": "Regional Shipping Services",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-BU-ILM
        "role": RoleEnum.bu_access,
        "branch_name": None,
        "business_unit": "International Logistics Management",
    },

    # ── AAW GLOBAL LOGISTICS - AU  (7 branches) ────────────────────────────

    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-MEL
        "role": RoleEnum.branch_access,
        "branch_name": "AAW Global - MEL",
        "business_unit": "AAW Global Logistics - AU",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-SYD
        "role": RoleEnum.branch_access,
        "branch_name": "AAW Global - SYD",
        "business_unit": "AAW Global Logistics - AU",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-BNE
        "role": RoleEnum.branch_access,
        "branch_name": "AAW Global - BNE",
        "business_unit": "AAW Global Logistics - AU",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-ADL
        "role": RoleEnum.branch_access,
        "branch_name": "AAW Global - ADL",
        "business_unit": "AAW Global Logistics - AU",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-FRE
        "role": RoleEnum.branch_access,
        "branch_name": "AAW Global - FRE",
        "business_unit": "AAW Global Logistics - AU",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-Brokerage
        "role": RoleEnum.branch_access,
        "branch_name": "AAW Brokerage",
        "business_unit": "AAW Global Logistics - AU",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-ProjectLogistics
        "role": RoleEnum.branch_access,
        "branch_name": "AAW Project Logistics",
        "business_unit": "AAW Global Logistics - AU",
    },

    # ── AAW GLOBAL LOGISTICS - NZ  (1 branch) ──────────────────────────────

    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-AKL
        "role": RoleEnum.branch_access,
        "branch_name": "AAW Global - AKL",
        "business_unit": "AAW Global Logistics - NZ",
    },

    # ── AAW BULK LIQUID LOGISTICS  (1 branch) ──────────────────────────────

    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-BLL
        "role": RoleEnum.branch_access,
        "branch_name": "AAW BLL",
        "business_unit": "AAW Bulk Liquid Logistics",
    },

    # ── HOYER LOGISTICS AUSTRALIA  (1 branch) ──────────────────────────────

    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-HLA
        "role": RoleEnum.branch_access,
        "branch_name": "HLA",
        "business_unit": "Hoyer Logistics Australia",
    },

    # ── COASTALBRIDGE  (2 branches) ────────────────────────────────────────

    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-Coastalbridge
        "role": RoleEnum.branch_access,
        "branch_name": "Coastalbridge",
        "business_unit": "Coastalbridge",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-CoastalbridgeAgencies
        "role": RoleEnum.branch_access,
        "branch_name": "Coastalbridge Agencies",
        "business_unit": "Coastalbridge",
    },

    # ── REGIONAL SHIPPING SERVICES  (2 branches) ───────────────────────────

    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-PILLA
        "role": RoleEnum.branch_access,
        "branch_name": "PILLA",
        "business_unit": "Regional Shipping Services",
    },
    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-RSS
        "role": RoleEnum.branch_access,
        "branch_name": "RSS",
        "business_unit": "Regional Shipping Services",
    },

    # ── INTERNATIONAL LOGISTICS MANAGEMENT  (1 branch) ─────────────────────

    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-Branch-ILM
        "role": RoleEnum.branch_access,
        "branch_name": "ILM",
        "business_unit": "International Logistics Management",
    },

    # ── SUBMIT ONLY (Standard Operators) ───────────────────────────────────

    "PASTE-GROUP-ID-HERE": {  # AD Group: RCHub-SubmitOnly
        "role": RoleEnum.submit_only,
        "branch_name": None,
        "business_unit": None,
    },
}


# ============================================================================
#  ROLE PRIORITY (highest → lowest)
#  When a user belongs to multiple AD groups, the highest-privilege role wins.
# ============================================================================

ROLE_PRIORITY = [
    RoleEnum.full_access,       # 0 - sees everything
    RoleEnum.risk_compliance,   # 1 - sees everything (R&C lens)
    RoleEnum.bu_access,         # 2 - sees all branches in their BU
    RoleEnum.hr_access,         # 3 - sees HR/WHS incidents
    RoleEnum.whs_access,        # 4 - sees WHS incidents
    RoleEnum.it_access,         # 5 - sees IT/Cyber incidents
    RoleEnum.finance_access,    # 6 - sees Finance incidents
    RoleEnum.branch_access,     # 7 - sees own branch only
    RoleEnum.submit_only,       # 8 - can only submit
]


def resolve_user_from_groups(group_ids: list[str], user_email: str, user_name: str) -> dict:
    """
    Given a list of Azure AD Group Object IDs from the user's token,
    resolve their highest-privilege role, branch, and business unit.
    
    Returns a dict compatible with the existing in-memory store user format,
    so all downstream filtering (incidents.py, dashboard.py, etc.) works unchanged.
    
    Args:
        group_ids:  List of Azure AD Group Object ID strings from the JWT 'groups' claim
        user_email: The user's email from the JWT 'preferred_username' claim
        user_name:  The user's display name from the JWT 'name' claim
    
    Returns:
        dict with keys: email, name, role, branch_name, business_unit
    """
    best_role = RoleEnum.submit_only
    best_priority = ROLE_PRIORITY.index(RoleEnum.submit_only)
    branch_name = None
    business_unit = None

    for gid in group_ids:
        mapping = AD_GROUP_MAP.get(gid)
        if not mapping:
            continue  # Not an R&C Hub group, skip

        role = mapping["role"]
        priority = ROLE_PRIORITY.index(role)

        if priority < best_priority:
            best_role = role
            best_priority = priority
            branch_name = mapping.get("branch_name")
            business_unit = mapping.get("business_unit")

    return {
        "email": user_email,
        "name": user_name,
        "role": best_role,
        "branch_name": branch_name,
        "business_unit": business_unit,
    }


def get_group_summary() -> list[dict]:
    """
    Utility: returns a human-readable summary of all configured group mappings.
    Useful for the admin to verify the setup.
    
    Call from a debug endpoint or management script.
    """
    summary = []
    for gid, mapping in AD_GROUP_MAP.items():
        summary.append({
            "group_id": gid,
            "configured": gid != "PASTE-GROUP-ID-HERE",
            "role": mapping["role"].value,
            "branch_name": mapping.get("branch_name", "—"),
            "business_unit": mapping.get("business_unit", "—"),
        })
    return summary
