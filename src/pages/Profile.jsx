import React, { useState, useContext, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { User, Key, Building, ShieldCheck } from 'lucide-react';

const Profile = () => {
    const { user: currentUser } = useContext(AuthContext);
    const [profileData, setProfileData] = useState(null);
    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const securityRef = useRef(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (searchParams.get('tab') === 'seguridad' && securityRef.current) {
            securityRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [searchParams, profileData]);

    const fetchProfile = async () => {
        try {
            const response = await api.get('me/');
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
            await api.post('profile/change-password/', {
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

    if (!profileData) return <div className="p-8 text-center text-muted">Cargando perfil…</div>;

    const InfoCard = ({ icon, title, children, innerRef }) => (
        <div className="card profile-card" ref={innerRef}>
            <div className="profile-card-header">
                <div className="profile-card-icon">
                    {icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-800 m-0">{title}</h3>
            </div>
            <div className="profile-card-body">
                {children}
            </div>
        </div>
    );

    const InfoRow = ({ label, value, badge }) => (
        <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{label}</label>
            {badge ? (
                <span className={`badge ${badge === 'primary' ? 'badge-primary' : 'badge-neutral'}`}>{value}</span>
            ) : (
                <p className="text-slate-800 font-medium m-0">{value}</p>
            )}
        </div>
    );

    return (
        <div className="profile-page page page-container">
            <div className="page-header">
                <div className="page-header-title">
                    <p className="eyebrow">Cuenta</p>
                    <h2 className="page-heading">Mi perfil</h2>
                    <p className="page-subtitle">Datos personales, empresa y seguridad.</p>
                </div>
            </div>

            <div className="profile-grid page-section">
                {/* User Info Card */}
                <InfoCard icon={<User size={20} />} title="Datos personales">
                    <InfoRow label="Usuario" value={profileData.username} />
                    <InfoRow label="Email" value={profileData.email || 'No proporcionado'} />
                    <InfoRow label="Rol" value={profileData.role} badge="primary" />
                </InfoCard>

                {/* Company Info Card */}
                <InfoCard icon={<Building size={20} />} title="Empresa">
                    <InfoRow label="Nombre comercial" value={profileData.company_name} />
                    <InfoRow label="Sucursal actual" value={profileData.branch_name} />
                    <InfoRow label="Moneda" value={profileData.currency || 'ARS'} />
                </InfoCard>

                {/* Password Change Card */}
                <InfoCard icon={<ShieldCheck size={20} />} title="Seguridad" innerRef={securityRef}>
                    <form onSubmit={handlePasswordChange}>
                        <div className="form-group">
                            <label>Contraseña actual</label>
                            <input
                                className="input-control"
                                type="password"
                                value={passwordData.old_password}
                                onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Nueva contraseña</label>
                            <input
                                className="input-control"
                                type="password"
                                value={passwordData.new_password}
                                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                required
                                placeholder="Mínimo 8 caracteres"
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirmar nueva contraseña</label>
                            <input
                                className="input-control"
                                type="password"
                                value={passwordData.confirm_password}
                                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
                            {loading ? 'Procesando…' : 'Actualizar contraseña'}
                        </button>
                    </form>
                </InfoCard>
            </div>
        </div>
    );
};

export default Profile;
