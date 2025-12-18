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

    if (!profileData) return <div className="p-8 text-center text-muted">Cargando perfil...</div>;

    const InfoCard = ({ icon, title, children, innerRef }) => (
        <div className="card h-full" ref={innerRef}>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                <div style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--primary-50)', color: 'var(--primary-600)' }}>
                    {icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-800 m-0">{title}</h3>
            </div>
            <div className="flex flex-col gap-4">
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
        <div className="profile-page max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Mi Perfil</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* User Info Card */}
                <InfoCard icon={<User size={20} />} title="Información Personal">
                    <InfoRow label="Nombre de Usuario" value={profileData.username} />
                    <InfoRow label="Email" value={profileData.email || 'No proporcionado'} />
                    <InfoRow label="Rol de Usuario" value={profileData.role} badge="primary" />
                </InfoCard>

                {/* Company Info Card */}
                <InfoCard icon={<Building size={20} />} title="Detalles de Empresa">
                    <InfoRow label="Nombre Comercial" value={profileData.company_name} />
                    <InfoRow label="Sucursal Actual" value={profileData.branch_name} />
                    <InfoRow label="Moneda Configurada" value={profileData.currency || 'ARS'} />
                </InfoCard>

                {/* Password Change Card */}
                <InfoCard icon={<ShieldCheck size={20} />} title="Seguridad" innerRef={securityRef}>
                    <form onSubmit={handlePasswordChange}>
                        <div className="form-group">
                            <label>Contraseña Actual</label>
                            <input
                                className="input-control"
                                type="password"
                                value={passwordData.old_password}
                                onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Nueva Contraseña</label>
                            <input
                                className="input-control"
                                type="password"
                                value={passwordData.new_password}
                                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                required
                                placeholder="8+ caracteres"
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirmar Nueva</label>
                            <input
                                className="input-control"
                                type="password"
                                value={passwordData.confirm_password}
                                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
                            {loading ? 'Procesando...' : 'Actualizar Contraseña'}
                        </button>
                    </form>
                </InfoCard>
            </div>
        </div>
    );
};

export default Profile;
