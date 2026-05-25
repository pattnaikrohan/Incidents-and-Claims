import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { PublicClientApplication, type AccountInfo, type AuthenticationResult } from '@azure/msal-browser';
import { msalConfig, loginRequest, graphConfig } from '../auth/msalConfig';
import { resolveRoleFromGroups, extractGroupsFromToken, type ResolvedRole } from '../auth/adGroupMapping';

// Initialize MSAL instance (singleton)
export const msalInstance = new PublicClientApplication(msalConfig);

// MSAL v5+ requires initialize() + handleRedirectPromise() before any interactions.
// handleRedirectPromise MUST be called immediately after initialize, before React Router
// processes the URL, otherwise the auth response hash is lost.
let msalInitPromise: Promise<AuthenticationResult | null> | null = null;
export function ensureMsalInitialized(): Promise<AuthenticationResult | null> {
  if (!msalInitPromise) {
    msalInitPromise = msalInstance.initialize().then(() => {
      return msalInstance.handleRedirectPromise();
    });
  }
  return msalInitPromise;
}

interface AuthContextType {
  token: string | null;
  role: string | null;
  email: string | null;
  displayName: string | null;
  branchId: number | null;
  branchName: string | null;
  businessUnit: string | null;
  isSSOUser: boolean;
  ssoLoading: boolean;
  resolvedGroupInfo: ResolvedRole | null;
  login: (token: string, role: string, email: string, branchId: number | null, branchName: string | null, businessUnit: string | null) => void;
  loginWithSSO: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Fetch group memberships from Microsoft Graph API.
 * Used as fallback when groups are not included in the token (overage scenario).
 */
async function fetchGroupsFromGraph(accessToken: string): Promise<string[]> {
  // Try transitiveMemberOf first (captures nested groups, needs GroupMember.Read.All)
  // Fall back to memberOf (direct memberships only, works with User.Read)
  const endpoints = [
    'https://graph.microsoft.com/v1.0/me/transitiveMemberOf?$select=id,displayName&$top=999',
    'https://graph.microsoft.com/v1.0/me/memberOf?$select=id,displayName&$top=999',
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        console.warn(`[SSO] ${endpoint.split('/v1.0/')[1]?.split('?')[0]} returned ${response.status}, trying next...`);
        continue;
      }
      const data = await response.json();
      const groups = (data.value || [])
        .filter((item: any) => item['@odata.type'] === '#microsoft.graph.group')
        .map((group: any) => group.id);
      console.log(`[SSO] Groups fetched from Graph API (${endpoint.includes('transitive') ? 'transitive' : 'direct'}):`, groups.length, 'groups found');
      if (groups.length > 0) return groups;
    } catch (err) {
      console.warn(`[SSO] Graph endpoint failed:`, err);
    }
  }
  
  console.error('[SSO] All Graph group-fetch endpoints failed');
  return [];
}

/**
 * Process a successful MSAL authentication result.
 */
async function processAuthResult(authResult: AuthenticationResult): Promise<{
  accessToken: string;
  role: string;
  email: string;
  displayName: string;
  branchName: string | null;
  businessUnit: string | null;
  resolved: ResolvedRole;
}> {
  const account: AccountInfo = authResult.account;
  msalInstance.setActiveAccount(account);

  // Try to get Graph API token for group fetching
  // Strategy: try with GroupMember.Read.All first, fallback to just User.Read
  let graphToken: string | null = null;
  try {
    const tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: ['User.Read', 'GroupMember.Read.All'],
      account,
    });
    graphToken = tokenResponse.accessToken;
  } catch {
    // GroupMember.Read.All may not be consented — fallback to User.Read only
    try {
      const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: ['User.Read'],
        account,
      });
      graphToken = tokenResponse.accessToken;
      console.log('[SSO] Using User.Read-only token for Graph fallback');
    } catch (err2) {
      console.warn('[SSO] Could not acquire any Graph token:', err2);
    }
  }

  // Extract groups from ID token claims
  let groupIds = extractGroupsFromToken(authResult.idTokenClaims || {});
  console.log('[SSO] Groups from token claims:', groupIds.length);
  
  // ALWAYS try Graph API if token claims had no groups
  if (groupIds.length === 0 && graphToken) {
    console.log('[SSO] No groups in token claims, fetching from Graph API...');
    groupIds = await fetchGroupsFromGraph(graphToken);
  }
  
  // If STILL empty, try Graph API one more time with just User.Read token
  if (groupIds.length === 0 && !graphToken) {
    console.warn('[SSO] No groups found and no Graph token available. User will get submit_only role.');
  }

  console.log('[SSO] User groups:', groupIds);

  const resolved = resolveRoleFromGroups(groupIds);
  console.log('[SSO] Resolved role:', resolved);

  return {
    accessToken: authResult.idToken,
    role: resolved.role,
    email: account.username,
    displayName: account.name || account.username,
    branchName: resolved.branchName,
    businessUnit: resolved.businessUnit,
    resolved,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
  const [email, setEmail] = useState<string | null>(localStorage.getItem('email'));
  const [displayName, setDisplayName] = useState<string | null>(localStorage.getItem('displayName'));
  const [branchName, setBranchName] = useState<string | null>(localStorage.getItem('branchName'));
  const [businessUnit, setBusinessUnit] = useState<string | null>(localStorage.getItem('businessUnit'));
  const [branchId, setBranchId] = useState<number | null>(
    localStorage.getItem('branchId') ? Number(localStorage.getItem('branchId')) : null
  );
  const [isSSOUser, setIsSSOUser] = useState<boolean>(localStorage.getItem('isSSOUser') === 'true');
  const [ssoLoading, setSsoLoading] = useState<boolean>(false);
  const [resolvedGroupInfo, setResolvedGroupInfo] = useState<ResolvedRole | null>(null);

  /** Apply SSO auth result to state and localStorage */
  const applyAuthResult = useCallback((result: {
    accessToken: string;
    role: string;
    email: string;
    displayName: string;
    branchName: string | null;
    businessUnit: string | null;
    resolved: ResolvedRole;
  }) => {
    localStorage.setItem('token', result.accessToken);
    localStorage.setItem('role', result.role);
    localStorage.setItem('email', result.email);
    localStorage.setItem('displayName', result.displayName);
    localStorage.setItem('isSSOUser', 'true');

    if (result.branchName) {
      localStorage.setItem('branchName', result.branchName);
    } else {
      localStorage.removeItem('branchName');
    }
    if (result.businessUnit) {
      localStorage.setItem('businessUnit', result.businessUnit);
    } else {
      localStorage.removeItem('businessUnit');
    }
    localStorage.removeItem('branchId');

    setToken(result.accessToken);
    setRole(result.role);
    setEmail(result.email);
    setDisplayName(result.displayName);
    setBranchName(result.branchName);
    setBusinessUnit(result.businessUnit);
    setBranchId(null);
    setIsSSOUser(true);
    setResolvedGroupInfo(result.resolved);
  }, []);

  // On mount: check the redirect response that was captured during MSAL initialization
  useEffect(() => {
    let cancelled = false;

    async function checkRedirectResult() {
      try {
        setSsoLoading(true);
        // ensureMsalInitialized() returns the cached promise which includes handleRedirectPromise result
        const response = await ensureMsalInitialized();

        if (response && response.account && !cancelled) {
          console.log('[SSO] Redirect response found, processing login for:', response.account.username);
          const result = await processAuthResult(response);
          if (!cancelled) {
            applyAuthResult(result);
            console.log('[SSO] Login complete! Role:', result.role);
          }
        } else {
          console.log('[SSO] No redirect response (normal page load)');
        }
      } catch (err) {
        console.error('[MSAL] Redirect handling failed:', err);
      } finally {
        if (!cancelled) setSsoLoading(false);
      }
    }

    checkRedirectResult();

    return () => { cancelled = true; };
  }, [applyAuthResult]);

  // Legacy login (email/password or mock personas)
  const login = (newToken: string, newRole: string, newEmail: string, newBranchId: number | null, newBranchName: string | null, newBusinessUnit: string | null) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', newRole);
    localStorage.setItem('email', newEmail);
    localStorage.setItem('isSSOUser', 'false');
    if (newBranchId !== null) {
      localStorage.setItem('branchId', newBranchId.toString());
    } else {
      localStorage.removeItem('branchId');
    }
    if (newBranchName !== null) {
      localStorage.setItem('branchName', newBranchName);
    } else {
      localStorage.removeItem('branchName');
    }
    if (newBusinessUnit !== null) {
      localStorage.setItem('businessUnit', newBusinessUnit);
    } else {
      localStorage.removeItem('businessUnit');
    }
    setToken(newToken);
    setRole(newRole);
    setEmail(newEmail);
    setBranchId(newBranchId);
    setBranchName(newBranchName);
    setBusinessUnit(newBusinessUnit);
    setIsSSOUser(false);
  };

  // Azure AD SSO Login — uses redirect flow
  const loginWithSSO = useCallback(async () => {
    try {
      await ensureMsalInitialized();
      await msalInstance.loginRedirect({
        ...loginRequest,
        prompt: 'select_account',
      });
    } catch (err: any) {
      console.error('[SSO] Login redirect failed:', err);
      throw err;
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    localStorage.removeItem('displayName');
    localStorage.removeItem('branchId');
    localStorage.removeItem('branchName');
    localStorage.removeItem('businessUnit');
    localStorage.removeItem('isSSOUser');

    setToken(null);
    setRole(null);
    setEmail(null);
    setDisplayName(null);
    setBranchId(null);
    setBranchName(null);
    setBusinessUnit(null);
    setIsSSOUser(false);
    setResolvedGroupInfo(null);

    if (isSSOUser) {
      msalInstance.logoutRedirect().catch(() => {});
    }
  };

  return (
    <AuthContext.Provider value={{ token, role, email, displayName, branchId, branchName, businessUnit, isSSOUser, ssoLoading, resolvedGroupInfo, login, loginWithSSO, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
