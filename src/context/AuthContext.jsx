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
  const [viewAsSeller, setViewAsSellerState] = useState(
    () => localStorage.getItem('view_as_seller') === 'true'
  );

  const handleLogout = useCallback(() => {
    clearStoredTokens();
    localStorage.removeItem('view_as_seller');
    setUser(null);
    setViewAsSellerState(false);
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

  useEffect(() => {
    if (!user) return;
    if (user?.role !== 'ADMIN' && viewAsSeller) {
      localStorage.removeItem('view_as_seller');
      setViewAsSellerState(false);
    }
  }, [user, viewAsSeller]);

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

  const setViewAsSeller = useCallback((next) => {
    if (user?.role !== 'ADMIN') return;
    const value = Boolean(next);
    setViewAsSellerState(value);
    localStorage.setItem('view_as_seller', value ? 'true' : 'false');
  }, [user]);

  const effectiveRole = useMemo(() => {
    if (!user?.role) return null;
    if (user.role === 'ADMIN' && viewAsSeller) return 'USER';
    return user.role;
  }, [user, viewAsSeller]);

  const isAdmin = effectiveRole === 'ADMIN';
  const isAdminActual = user?.role === 'ADMIN';

  const value = useMemo(() => ({
    user,
    login,
    logout: handleLogout,
    loading,
    effectiveRole,
    isAdmin,
    isAdminActual,
    viewAsSeller,
    setViewAsSeller,
  }), [user, login, handleLogout, loading, effectiveRole, isAdmin, isAdminActual, viewAsSeller, setViewAsSeller]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
