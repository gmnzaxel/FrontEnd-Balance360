import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';

const AdminOnly = ({ children }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return null;

    if (user?.role !== 'ADMIN') {
        // We use a small timeout to avoid double mounting issues with toast in dev
        setTimeout(() => {
            toast.error("Acceso denegado: Solo administradores pueden ver esta sección.");
        }, 100);
        return <Navigate to="/products" />; // Redirect users to inventory
    }

    return children;
};

export default AdminOnly;
