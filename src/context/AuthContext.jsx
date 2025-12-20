import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import api, { clearStoredTokens } from '../api/axios';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../utils/errorUtils';

export const AuthContext = createContext();

const parseToken = (token) => {
  try {
    const decoded = jwtDecode(token);
    return { ...decoded, user_id: decoded.user_id };
  } catch (_e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = useCallback(() => {
    clearStoredTokens();
    setUser(null);
    toast.info('Sesión cerrada');
    window.location.href = '/login';
  }, []);

  const bootstrapSession = useCallback(async () => {
    const stored = localStorage.getItem('access_token');
    if (!stored) {
      setLoading(false);
      return;
    }

    const decoded = parseToken(stored);
    const isExpired = !decoded || decoded.exp * 1000 <= Date.now();

    if (!isExpired) {
      setUser(decoded);
      setLoading(false);
      return;
    }

    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
      handleLogout();
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('token/refresh/', { refresh });
      const newAccess = response.data.access;
      if (newAccess) {
        localStorage.setItem('access_token', newAccess);
        setUser(parseToken(newAccess));
      } else {
        handleLogout();
      }
    } catch (_error) {
      handleLogout();
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  const login = useCallback(async (username, password) => {
    try {
      const response = await api.post('token/', { username, password });
      const { access, refresh } = response.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      const decoded = parseToken(access);
      setUser(decoded);
      toast.success('Bienvenido de nuevo');
      return true;
    } catch (error) {
      // Specialized message for 401 on login
      if (error.response && error.response.status === 401) {
        toast.error('Credenciales inválidas');
      } else {
        toast.error(getErrorMessage(error));
      }
      return false;
    }
  }, []);

  const value = useMemo(() => ({
    user,
    login,
    logout: handleLogout,
    loading,
  }), [user, login, handleLogout, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
