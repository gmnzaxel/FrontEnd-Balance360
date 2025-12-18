import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { User, Key, Building, MapPin, Phone, Shield } from 'lucide-react';

const Profile = () => {
    const { user: currentUser } = useContext(AuthContext);
    const [profileData, setProfileData] = useState(null);
    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('users/me/');
            setProfileData(response.data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar datos del perfil");
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            toast.error("Las contraseñas nuevas no coinciden");
            return;
        }
        setLoading(true);
        try {
            await api.post('users/profile/change-password/', {
                old_password: passwordData.old_password,
                new_password: passwordData.new_password
            });
            toast.success("Contraseña actualizada correctamente");
            setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.old_password?.[0] || error.response?.data?.new_password?.[0] || "Error al cambiar contraseña";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!profileData) return <div className="p-8 text-center">Cargando perfil...</div>;

    return (
        <div className="profile-page fade-in">
            <div className="profile-grid">
                {/* User Info Card */}
                <div className="card profile-info-card">
                    <div className="card-header">
                        <User size={20} className="text-primary" />
                        <h3>Información de Usuario</h3>
                    </div>
                    <div className="card-body">
                        <div className="info-item">
                            <label>Nombre de Usuario</label>
                            <p>{profileData.username}</p>
                        </div>
                        <div className="info-item">
                            <label>Email</label>
                            <p>{profileData.email || 'No proporcionado'}</p>
                        </div>
                        <div className="info-item">
                            <label>Rol</label>
                            <span className={`badge ${profileData.role === 'ADMIN' ? 'badge-primary' : 'badge-neutral'}`}>
                                {profileData.role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Company Info Card */}
                <div className="card profile-company-card">
                    <div className="card-header">
                        <Building size={20} className="text-primary" />
                        <h3>Mi Empresa</h3>
                    </div>
                    <div className="card-body">
                        <div className="info-item">
                            <label>Nombre</label>
                            <p>{profileData.company_name}</p>
                        </div>
                        <div className="info-item">
                            <label>Sucursal Principal</label>
                            <p>{profileData.branch_name}</p>
                        </div>
                        <div className="info-item">
                            <label>Moneda</label>
                            <p>{profileData.currency}</p>
                        </div>
                    </div>
                </div>

                {/* Password Change Card */}
                <div className="card profile-password-card">
                    <div className="card-header">
                        <Key size={20} className="text-primary" />
                        <h3>Cambiar Contraseña</h3>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handlePasswordChange}>
                            <div className="form-group">
                                <label>Contraseña Actual</label>
                                <input
                                    type="password"
                                    value={passwordData.old_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={passwordData.new_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                    required
                                    placeholder="Mínimo 8 caracteres y 1 número"
                                />
                            </div>
                            <div className="form-group">
                                <label>Confirmar Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={passwordData.confirm_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn-primary w-full" disabled={loading}>
                                {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
