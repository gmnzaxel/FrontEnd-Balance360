import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';

const AdminOnly = ({ children, useActualRole = false }) => {
    const { user, loading, isAdmin, isAdminActual } = useContext(AuthContext);

    if (loading) return null;

    const allowed = useActualRole ? isAdminActual : isAdmin;

    if (!allowed) {
        // We use a small timeout to avoid double mounting issues with toast in dev
        setTimeout(() => {
            toast.error("Acceso denegado: Solo administradores pueden ver esta sección.");
        }, 100);
        return <Navigate to="/products" />; // Redirect users to inventory
    }

    return children;
};

export default AdminOnly;
