import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { PublicClientApplication, type AccountInfo } from '@azure/msal-browser';
import { msalConfig, loginRequest, graphConfig } from '../auth/msalConfig';
import { resolveRoleFromGroups, extractGroupsFromToken, type ResolvedRole } from '../auth/adGroupMapping';

// Initialize MSAL instance (singleton)
export const msalInstance = new PublicClientApplication(msalConfig);

// MSAL v5+ requires explicit initialization before any interactions
let msalInitPromise: Promise<void> | null = null;
export function ensureMsalInitialized(): Promise<void> {
  if (!msalInitPromise) {
    msalInitPromise = msalInstance.initialize().then(() => {
      // Handle any redirect responses (important for popup fallback scenarios)
      return msalInstance.handleRedirectPromise().then(() => {});
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
  const [resolvedGroupInfo, setResolvedGroupInfo] = useState<ResolvedRole | null>(null);

  // Initialize MSAL on mount
  useEffect(() => {
    ensureMsalInitialized().then(() => {
      console.log('[MSAL] Initialized successfully');
    }).catch((err) => {
      console.error('[MSAL] Initialization failed:', err);
    });
  }, []);

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

  // Azure AD SSO Login
  const loginWithSSO = useCallback(async () => {
    try {
      // Ensure MSAL is fully initialized before attempting login
      await ensureMsalInitialized();

      // 1. Acquire token via popup
      const loginResponse = await msalInstance.loginPopup({
        ...loginRequest,
        prompt: 'select_account',
      });

      const account: AccountInfo = loginResponse.account;
      msalInstance.setActiveAccount(account);

      // 2. Get access token for Graph API (to fetch groups if needed)
      let graphToken: string | null = null;
      try {
        const tokenResponse = await msalInstance.acquireTokenSilent({
          scopes: ['User.Read', 'GroupMember.Read.All'],
          account,
        });
        graphToken = tokenResponse.accessToken;
      } catch (silentErr) {
        console.warn('[SSO] Silent token acquisition failed, trying popup:', silentErr);
        try {
          const tokenResponse = await msalInstance.acquireTokenPopup({
            scopes: ['User.Read', 'GroupMember.Read.All'],
            account,
          });
          graphToken = tokenResponse.accessToken;
        } catch (popupErr) {
          console.warn('[SSO] Graph API token acquisition failed, continuing without groups from Graph:', popupErr);
          // Continue without graph token — groups may still come from ID token claims
        }
      }

      // 3. Extract groups from ID token claims OR call Graph API
      let groupIds = extractGroupsFromToken(loginResponse.idTokenClaims || {});
      
      if (groupIds.length === 0 && graphToken) {
        console.log('[SSO] No groups in token, fetching from Graph API...');
        groupIds = await fetchGroupsFromGraph(graphToken);
      }

      console.log('[SSO] User groups:', groupIds);

      // 4. Resolve role from AD group memberships
      const resolved = resolveRoleFromGroups(groupIds);
      console.log('[SSO] Resolved role:', resolved);

      // 5. Store auth state
      const accessToken = loginResponse.idToken; // Use ID token for API auth
      const userEmail = account.username;
      const userName = account.name || userEmail;

      localStorage.setItem('token', accessToken);
      localStorage.setItem('role', resolved.role);
      localStorage.setItem('email', userEmail);
      localStorage.setItem('displayName', userName);
      localStorage.setItem('isSSOUser', 'true');

      if (resolved.branchName) {
        localStorage.setItem('branchName', resolved.branchName);
      } else {
        localStorage.removeItem('branchName');
      }
      if (resolved.businessUnit) {
        localStorage.setItem('businessUnit', resolved.businessUnit);
      } else {
        localStorage.removeItem('businessUnit');
      }
      localStorage.removeItem('branchId'); // SSO doesn't use numeric branch IDs

      setToken(accessToken);
      setRole(resolved.role);
      setEmail(userEmail);
      setDisplayName(userName);
      setBranchName(resolved.branchName);
      setBusinessUnit(resolved.businessUnit);
      setBranchId(null);
      setIsSSOUser(true);
      setResolvedGroupInfo(resolved);

    } catch (err: any) {
      console.error('[SSO] Login failed:', err);
      throw err; // Re-throw so the Login page can handle it
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
      msalInstance.logoutPopup().catch(() => {});
    }
  };

  return (
    <AuthContext.Provider value={{ token, role, email, displayName, branchId, branchName, businessUnit, isSSOUser, resolvedGroupInfo, login, loginWithSSO, logout }}>
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
