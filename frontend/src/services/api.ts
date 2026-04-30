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
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Basic auto-logout on 401
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('branchId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
