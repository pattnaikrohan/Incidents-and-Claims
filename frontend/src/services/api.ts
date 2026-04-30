import axios from 'axios';

// Default to port 8000 for standard dev 
const API_URL = import.meta.env.VITE_API_URL || 'https://incidents-and-claims.azurewebsites.net/api';

export const api = axios.create({
  baseURL: API_URL,
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
