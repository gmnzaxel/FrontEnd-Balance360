import React, { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-fallback">
        <div className="spinner" aria-hidden />
        <p>Verificando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isSuperUser = user?.is_superuser === true;
  const hasImpersonated = Boolean(localStorage.getItem('impersonated_company_id'));
  const isAllowedPath = location.pathname === '/super-dashboard' || location.pathname === '/mi-perfil';

  if (isSuperUser && !hasImpersonated && !isAllowedPath) {
    return <Navigate to="/super-dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
