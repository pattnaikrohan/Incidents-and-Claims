import axios from 'axios';

// Sanitize and force HTTPS for Azure production
let BASE_URL = import.meta.env.VITE_API_URL || 'https://incidents-and-claims.azurewebsites.net/api';

if (BASE_URL.startsWith('http://') && !BASE_URL.includes('localhost') && !BASE_URL.includes('127.0.0.1')) {
  BASE_URL = BASE_URL.replace('http://', 'https://');
}

export const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Signal to backend whether this is an SSO token or local JWT
  const isSSOUser = localStorage.getItem('isSSOUser') === 'true';
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
  (error) => {
    // Auto-logout on 401 Unauthorized
    if (error.response && error.response.status === 401) {
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
