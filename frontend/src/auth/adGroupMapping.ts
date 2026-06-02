/**
 * Azure AD Group → Application Role Mapping
 * 
 * Maps Azure AD security group IDs to application roles, business units, and branches.
 * Groups are evaluated in priority order — the first match wins for role assignment.
 */

// ── Functional / Department Group IDs ────────────────────────
// Full Access / Global Admin
// TODO: Replace with the actual Object ID from your IT admin (Step 1 of Azure Portal setup)
const FULL_ACCESS_GROUP_ID: string | null = '893a070a-54ec-42fb-bdda-98066d3a7569';

const GROUPS = {
  // Department-level functional groups
  RISK_COMPLIANCE: 'f29747c6-0fb4-4869-b681-0786d602ac29',
  PEOPLE_SAFETY: 'd8195075-cc4c-4e62-b857-f4cc9c76b380',
  IT_SECURITY: 'b355c48b-09fc-4d35-b7cc-a80e53d9f3b7',
  FINANCE: '2dcbf776-a8ce-4316-8dc8-c5aef73409f7',
} as const;

// ── BU Manager Group IDs (Actual Azure AD Group Names) ──────
const BU_MANAGER_GROUPS: Record<string, string> = {
  '38e4b0e2-ba59-4b60-8c61-8650509b1a70': 'BU Manager- AAW Group Holdings',
  '956cde96-2a25-4574-8e7b-fb0de9712c0d': 'BU Manager- AAW Global Logistics-AU',
  '5ba26317-0cfe-461a-a8ac-ee35ed50a7dc': 'BU Manager- AAW Global Logistics -NZ',
  '83c2912d-604a-4e3f-b79e-5500b040197d': 'BU Manager- Bulk Liquid Logistics',
  'e4fb09bd-ed76-4a1c-b964-396057c02de6': 'BU Manager- Hoyer Logistics Australia',
  '18444ce2-793a-485c-99d1-7d0a1073945d': 'BU Manager- Coastalbridge',
  '57b8fe69-df5e-441f-94ef-1adad5458d8e': 'BU Manager- PIL Logistics Australia',
};

// ── AD Group Name → Application Business Unit Name ──────────
// Maps the actual Azure AD group display name to the app's internal BU name
// (used for data filtering and access control scoping)
const BU_AD_TO_APP: Record<string, string> = {
  'BU Manager- AAW Group Holdings': 'AAW Group Holdings',
  'BU Manager- AAW Global Logistics-AU': 'AAW Global Logistics - AU',
  'BU Manager- AAW Global Logistics -NZ': 'AAW Global Logistics - NZ',
  'BU Manager- Bulk Liquid Logistics': 'AAW Bulk Liquid Logistics',
  'BU Manager- Hoyer Logistics Australia': 'Hoyer Logistics Australia',
  'BU Manager- Coastalbridge': 'Coastalbridge',
  'BU Manager- PIL Logistics Australia': 'Regional Shipping Services',
};

// ── Branch / Department Group IDs ───────────────────────────
const BRANCH_GROUPS: Record<string, string> = {
  '7e72b9d7-0977-4d9f-83d0-f2c0f38beafb': 'AAW Global Logistics - Melbourne',
  '8e6d4f35-ec7f-4d9f-be44-f76bb4274d22': 'AAW Global Logistics - Sydney',
  'c98d0827-3c29-49cf-b466-fd6b3b4cd16b': 'AAW Global Logistics - Brisbane',
  '9f22fa97-0f1d-4136-89d8-8b9e4dc1ff2b': 'AAW Global Logistics - Adelaide',
  'fe5aecea-91c4-48ac-9038-f16edfd3cba6': 'AAW Global Logistics - Fremantle',
  'fa404616-cce0-4c8a-9e5d-a86919e4eac1': 'AAW Customs Brokerage',
  '99937019-ff28-4c3c-8de2-e5492638a233': 'AAW Project Logistics',
  'c14255e2-c4f0-459d-b889-f44938b0fd83': 'AAW Global Logistics - Auckland',
  'a960927f-14db-4632-ade6-56e9bc19213f': 'AAW Bulk Liquid Logistics Team',
  '6796ccfb-9ed2-484e-93b4-92c5d289c3a1': 'Coastalbridge',
  'c65d09a2-1b50-4adc-903b-4dc5da9dfa92': 'PIL Logistics Australia',
};

// ── Branch → Business Unit Lookup ───────────────────────────
const BRANCH_TO_BU: Record<string, string> = {
  'AAW Global Logistics - Melbourne': 'AAW Global Logistics - AU',
  'AAW Global Logistics - Sydney': 'AAW Global Logistics - AU',
  'AAW Global Logistics - Brisbane': 'AAW Global Logistics - AU',
  'AAW Global Logistics - Adelaide': 'AAW Global Logistics - AU',
  'AAW Global Logistics - Fremantle': 'AAW Global Logistics - AU',
  'AAW Customs Brokerage': 'AAW Global Logistics - AU',
  'AAW Project Logistics': 'AAW Global Logistics - AU',
  'AAW Global Logistics - Auckland': 'AAW Global Logistics - NZ',
  'AAW Bulk Liquid Logistics Team': 'AAW Bulk Liquid Logistics',
  'Coastalbridge': 'Coastalbridge',
  'PIL Logistics Australia': 'Regional Shipping Services',
};

export interface ResolvedRole {
  role: string;
  businessUnit: string | null;
  businessUnits: string[];
  branchName: string | null;
  branchNames: string[];
  functionalRoles: string[];
  matchedGroups: string[];
}

/**
 * Resolves the application role from a list of Azure AD group IDs.
 * Accumulates ALL matching groups across all tiers for cross-tier access.
 * Primary role is set to the highest tier matched.
 */
export function resolveRoleFromGroups(groupIds: string[]): ResolvedRole {
  const groupSet = new Set(groupIds.map(id => id.toLowerCase()));
  const matchedGroups: string[] = [];

  let isFullAccess = false;
  const functionalRoles: string[] = [];
  const businessUnits: string[] = [];
  const branchNames: string[] = [];

  // ── Collect ALL matches across every tier ──────────────────

  // Tier 1: Full Access / Global Admin
  if (FULL_ACCESS_GROUP_ID && groupSet.has(FULL_ACCESS_GROUP_ID.toLowerCase())) {
    isFullAccess = true;
    matchedGroups.push('Full Access / Global Admin');
  }

  // Tier 2: Department functional groups
  if (groupSet.has(GROUPS.RISK_COMPLIANCE.toLowerCase())) {
    functionalRoles.push('risk_compliance');
    matchedGroups.push('Risk & Compliance Global');
  }
  if (groupSet.has(GROUPS.PEOPLE_SAFETY.toLowerCase())) {
    functionalRoles.push('hr_access');
    matchedGroups.push('People & Safety Global');
  }
  if (groupSet.has(GROUPS.IT_SECURITY.toLowerCase())) {
    functionalRoles.push('it_access');
    matchedGroups.push('IT & Security Global');
  }
  if (groupSet.has(GROUPS.FINANCE.toLowerCase())) {
    functionalRoles.push('finance_access');
    matchedGroups.push('Finance Global');
  }

  // Tier 3: BU Manager groups
  for (const [groupId, adGroupName] of Object.entries(BU_MANAGER_GROUPS)) {
    if (groupSet.has(groupId.toLowerCase())) {
      matchedGroups.push(adGroupName);
      const bu = BU_AD_TO_APP[adGroupName] || adGroupName;
      if (!businessUnits.includes(bu)) businessUnits.push(bu);
    }
  }

  // Tier 4: Branch groups
  for (const [groupId, branchName] of Object.entries(BRANCH_GROUPS)) {
    if (groupSet.has(groupId.toLowerCase())) {
      matchedGroups.push(`Branch - ${branchName}`);
      if (!branchNames.includes(branchName)) branchNames.push(branchName);
      const bu = BRANCH_TO_BU[branchName];
      if (bu && !businessUnits.includes(bu)) businessUnits.push(bu);
    }
  }

  // ── Determine the primary role (highest tier matched) ─────
  let primaryRole: string;
  if (isFullAccess) {
    primaryRole = 'full_access';
  } else if (functionalRoles.length > 0) {
    primaryRole = functionalRoles[0];
  } else if (businessUnits.length > 0 && branchNames.length === 0) {
    primaryRole = 'bu_access';
  } else if (branchNames.length > 0) {
    primaryRole = 'branch_access';
  } else {
    primaryRole = 'submit_only';
    if (matchedGroups.length === 0) matchedGroups.push('(no matching AD group)');
  }

  return {
    role: primaryRole,
    businessUnit: businessUnits[0] || null,
    businessUnits,
    branchName: branchNames[0] || null,
    branchNames,
    functionalRoles,
    matchedGroups,
  };
}

/**
 * Extract group IDs from an Azure AD token's claims.
 * The token may have groups in the `groups` claim (array of GUIDs)
 * or in `_claim_names` / `_claim_sources` if there are too many groups (overage).
 */
export function extractGroupsFromToken(tokenClaims: any): string[] {
  // Direct groups claim (when groups fit in the token)
  if (Array.isArray(tokenClaims.groups)) {
    return tokenClaims.groups;
  }

  // Overage indicator — groups were too many to include in the token
  if (tokenClaims._claim_names?.groups) {
    console.warn('[AD Groups] Token has group overage. Will need to call Graph API to fetch groups.');
    return [];
  }

  return [];
}
