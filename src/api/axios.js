import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const rawApiUrl = import.meta.env.VITE_API_URL
  || import.meta.env.VITE_API_BASE_URL
  || 'http://localhost:8000/api/';

const normalizeApiUrl = (value) => {
  const trimmed = String(value || '').trim();
  if (trimmed.endsWith('/api/')) return trimmed;
  if (trimmed.endsWith('/api')) return `${trimmed}/`;
  if (trimmed.endsWith('/')) return `${trimmed}api/`;
  return `${trimmed}/api/`;
};

export const API_BASE_URL = normalizeApiUrl(rawApiUrl);

if (import.meta.env.MODE === 'production' || import.meta.env.VITE_APP_ENV === 'production') {
  if (!API_BASE_URL.endsWith('/api/')) {
    throw new Error('Invalid VITE_API_URL. It must point to the API root ending with /api/');
  }
}

if (import.meta.env.MODE !== 'production') {
  console.info('API_BASE_URL:', API_BASE_URL);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000, // 15 segundos — evita que requests queden colgados si el backend no responde
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

// Cache de tokens decodificados — evita llamar a jwtDecode en cada request
const _tokenCache = new Map();
const decodeToken = (token) => {
  if (_tokenCache.has(token)) return _tokenCache.get(token);
  try {
    const decoded = jwtDecode(token);
    // Limpiar entradas viejas si el cache crece (máx 5 tokens distintos)
    if (_tokenCache.size >= 5) _tokenCache.clear();
    _tokenCache.set(token, decoded);
    return decoded;
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

  const impersonatedCompanyId = localStorage.getItem('impersonated_company_id');
  if (impersonatedCompanyId) {
    config.headers['X-Company-ID'] = impersonatedCompanyId;
  }

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

    // Sin respuesta = backend caído, timeout o error de red
    if (!response) {
      const isTimeout = error.code === 'ECONNABORTED';
      const msg = isTimeout
        ? 'La solicitud tardó demasiado. Verificá que el servidor esté activo.'
        : 'No se pudo conectar con el servidor. Verificá tu conexión o que el backend esté corriendo.';
      // Importamos toast de forma lazy para no crear una dependencia circular
      import('react-toastify').then(({ toast }) => toast.error(msg, { toastId: 'network-error' }));
      return Promise.reject(error);
    }

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
