import axios from 'axios';

// Sanitize and force HTTPS for Azure production
let BASE_URL = import.meta.env.VITE_API_URL || 'https://incidents-and-claims.azurewebsites.net/api';

if (BASE_URL.startsWith('http://') && !BASE_URL.includes('localhost') && !BASE_URL.includes('127.0.0.1')) {
  BASE_URL = BASE_URL.replace('http://', 'https://');
}

export const api = axios.create({
  baseURL: BASE_URL,
});

/**
 * Silently refresh the Azure AD token if the user is an SSO user.
 * MSAL's acquireTokenSilent uses the cached refresh token to get a new
 * ID token without any user interaction, avoiding the 401 → login redirect
 * that occurs when the short-lived ID token (≈1 hour) expires.
 */
async function refreshSSOTokenIfNeeded(): Promise<string | null> {
  try {
    // Dynamic import to avoid circular dependency with AuthContext
    const { msalInstance, ensureMsalInitialized } = await import('../context/AuthContext');
    await ensureMsalInitialized();

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) return null;

    const account = msalInstance.getActiveAccount() || accounts[0];
    const tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: ['openid', 'profile', 'User.Read'],
      account,
    });

    // Update localStorage with the fresh token so all subsequent calls use it
    if (tokenResponse.idToken) {
      localStorage.setItem('token', tokenResponse.idToken);
      return tokenResponse.idToken;
    }
    return null;
  } catch (err) {
    console.warn('[API] Silent token refresh failed, using cached token:', err);
    return null;
  }
}

api.interceptors.request.use(async (config) => {
  const isSSOUser = localStorage.getItem('isSSOUser') === 'true';

  // For SSO users, silently refresh the token before each request
  if (isSSOUser) {
    const freshToken = await refreshSSOTokenIfNeeded();
    const token = freshToken || localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } else {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // Signal to backend whether this is an SSO token or local JWT
  if (isSSOUser && config.headers) {
    config.headers['X-Auth-Source'] = 'azure-ad';
    // Send resolved role and group IDs so backend can use them
    // (groups may not be in the ID token if groupMembershipClaims isn't configured)
    const role = localStorage.getItem('role');
    const branchName = localStorage.getItem('branchName');
    const businessUnit = localStorage.getItem('businessUnit');
    const branchNames = localStorage.getItem('branchNames');
    const businessUnits = localStorage.getItem('businessUnits');
    if (role) config.headers['X-User-Role'] = role;
    // Send arrays if available, fall back to single values
    if (branchNames) {
      config.headers['X-User-Branch'] = branchNames;
    } else if (branchName) {
      config.headers['X-User-Branch'] = JSON.stringify([branchName]);
    }
    if (businessUnits) {
      config.headers['X-User-BU'] = businessUnits;
    } else if (businessUnit) {
      config.headers['X-User-BU'] = JSON.stringify([businessUnit]);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // On 401, attempt a silent token refresh and retry ONCE before giving up
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const isSSOUser = localStorage.getItem('isSSOUser') === 'true';

      if (isSSOUser) {
        const freshToken = await refreshSSOTokenIfNeeded();
        if (freshToken) {
          console.log('[API] Token refreshed after 401, retrying request...');
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return api(originalRequest);
        }
      }

      // Refresh failed or not an SSO user — redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('branchId');
      localStorage.removeItem('isSSOUser');
      localStorage.removeItem('displayName');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
