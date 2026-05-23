import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { PublicClientApplication, type AccountInfo, type AuthenticationResult } from '@azure/msal-browser';
import { msalConfig, loginRequest, graphConfig } from '../auth/msalConfig';
import { resolveRoleFromGroups, extractGroupsFromToken, type ResolvedRole } from '../auth/adGroupMapping';

// Initialize MSAL instance (singleton)
export const msalInstance = new PublicClientApplication(msalConfig);

// MSAL v5+ requires explicit initialization before any interactions
let msalInitPromise: Promise<void> | null = null;
export function ensureMsalInitialized(): Promise<void> {
  if (!msalInitPromise) {
    msalInitPromise = msalInstance.initialize();
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
  try {
    const response = await fetch(graphConfig.graphMemberOfEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`Graph API returned ${response.status}`);
    const data = await response.json();
    // Filter to security groups and extract IDs
    return (data.value || [])
      .filter((item: any) => item['@odata.type'] === '#microsoft.graph.group')
      .map((group: any) => group.id);
  } catch (err) {
    console.error('[SSO] Failed to fetch groups from Graph API:', err);
    return [];
  }
}

/**
 * Process a successful MSAL authentication result.
 * Extracts groups, resolves role, and stores auth state.
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

  // Try to get Graph API token silently for group fetching
  let graphToken: string | null = null;
  try {
    const tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: ['User.Read', 'GroupMember.Read.All'],
      account,
    });
    graphToken = tokenResponse.accessToken;
  } catch (silentErr) {
    console.warn('[SSO] Silent Graph token failed, will use ID token claims for groups:', silentErr);
  }

  // Extract groups from ID token claims OR call Graph API
  let groupIds = extractGroupsFromToken(authResult.idTokenClaims || {});
  
  if (groupIds.length === 0 && graphToken) {
    console.log('[SSO] No groups in token, fetching from Graph API...');
    groupIds = await fetchGroupsFromGraph(graphToken);
  }

  console.log('[SSO] User groups:', groupIds);

  // Resolve role from AD group memberships
  const resolved = resolveRoleFromGroups(groupIds);
  console.log('[SSO] Resolved role:', resolved);

  const accessToken = authResult.idToken;
  const userEmail = account.username;
  const userName = account.name || userEmail;

  return {
    accessToken,
    role: resolved.role,
    email: userEmail,
    displayName: userName,
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

  // On mount: initialize MSAL and handle redirect response (if returning from Microsoft login)
  useEffect(() => {
    let cancelled = false;

    async function handleRedirect() {
      try {
        await ensureMsalInitialized();
        console.log('[MSAL] Initialized successfully');

        // Check if we're returning from a redirect login
        const response = await msalInstance.handleRedirectPromise();
        
        if (response && response.account && !cancelled) {
          console.log('[SSO] Redirect response received, processing...');
          setSsoLoading(true);
          const result = await processAuthResult(response);
          if (!cancelled) {
            applyAuthResult(result);
          }
          setSsoLoading(false);
        }
      } catch (err) {
        console.error('[MSAL] Redirect handling failed:', err);
        setSsoLoading(false);
      }
    }

    handleRedirect();

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

  // Azure AD SSO Login — uses redirect flow (more reliable than popup)
  const loginWithSSO = useCallback(async () => {
    try {
      await ensureMsalInitialized();
      // Redirect to Microsoft login — page will reload when user comes back
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
    // Clear local storage
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

    // If SSO user, also logout from MSAL
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
