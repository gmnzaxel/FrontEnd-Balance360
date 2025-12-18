import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

const decodeToken = (token) => {
  try {
    return jwtDecode(token);
  } catch (_e) {
    return null;
  }
};

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) {
    throw new Error('No refresh token');
  }

  refreshPromise = axios.post(`${API_BASE_URL}token/refresh/`, { refresh })
    .then((response) => {
      const newAccess = response.data.access;
      if (newAccess) {
        localStorage.setItem('access_token', newAccess);
      }
      return newAccess;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

const attachAuthHeader = async (config) => {
  const isRefreshCall = config?.url?.includes('token/refresh');
  if (isRefreshCall) return config;

  const token = localStorage.getItem('access_token');
  if (!token) return config;

  const decoded = decodeToken(token);
  const isExpired = !decoded || decoded.exp * 1000 <= Date.now() + 30_000;

  if (isExpired) {
    try {
      const newToken = await refreshAccessToken();
      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`;
      }
    } catch (_error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    return config;
  }

  config.headers.Authorization = `Bearer ${token}`;
  return config;
};

api.interceptors.request.use(attachAuthHeader, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    if (!response) return Promise.reject(error);

    const isAuthEndpoint = config?.url?.includes('token/');
    if (response.status === 401 && !config?._retry && !isAuthEndpoint) {
      config._retry = true;
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
          return api(config);
        }
      } catch (_e) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const clearStoredTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export default api;
