import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { user, loading } = useContext(AuthContext);

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

  // Redirect superuser to super-dashboard if they haven't impersonated a company yet
  const isSuperUser = user?.is_superuser === true;
  const hasImpersonated = !!localStorage.getItem('impersonated_company_id');
  const isSuperDashboard = window.location.pathname === '/super-dashboard';
  const isProfile = window.location.pathname === '/mi-perfil';

  if (isSuperUser && !hasImpersonated && !isSuperDashboard && !isProfile) {
    return <Navigate to="/super-dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
