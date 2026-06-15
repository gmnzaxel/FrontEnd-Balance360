import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const SuperUserOnly = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;

  const isSuperUser = user?.is_superuser === true;

  if (!isSuperUser) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default SuperUserOnly;
