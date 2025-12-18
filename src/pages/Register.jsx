import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { User, Lock, Building, MapPin, Phone, Store, CreditCard, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-toastify';

const Register = () => {
    const [formData, setFormData] = useState({
        empresa_nombre: '',
        empresa_direccion: '',
        empresa_telefono: '',
        local_principal_nombre: '',
        username: '',
        password: '',
        confirm_password: ''
    });
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirm_password) {
            toast.error("Las contraseñas no coinciden");
            return;
        }
        setLoading(true);
        try {
            await api.post('auth/registro/', formData);
            toast.success("¡Empresa registrada con éxito!");
            toast.info("Iniciando sesión automáticamente...");

            // Auto-login or redirect to login. The backend returns tokens in registration.
            // But to keep it simple and clean as requested, we redirect to home to let it reload or login page.
            // Based on previous version, we did window.location.href = '/'
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);

        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.password?.[0] || "Error en el registro. Verifique los datos.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper register-bg">
            <div className="register-container fade-in">
                <div className="register-header-full">
                    <Link to="/login" className="back-link"><ArrowLeft size={16} /> Volver</Link>
                    <div className="logo-center">
                        <ShieldCheck size={40} className="text-primary-600" />
                        <h1>Balance<span>360</span></h1>
                    </div>
                    <h2>Registra tu Empresa</h2>
                    <p>Comienza a gestionar tu negocio de forma profesional hoy mismo</p>
                </div>

                <div className="auth-card register-card">
                    <form onSubmit={handleSubmit} className="modern-form">
                        <div className="form-section">
                            <div className="section-header">
                                <Building size={18} />
                                <h3>Información de la Empresa</h3>
                            </div>

                            <div className="form-field full-width">
                                <label>Nombre Comercial / Razón Social</label>
                                <div className="input-affix-wrapper">
                                    <span className="input-prefix"><Building size={18} /></span>
                                    <input
                                        type="text"
                                        name="empresa_nombre"
                                        value={formData.empresa_nombre}
                                        onChange={handleChange}
                                        required
                                        placeholder="Ej. Mi Negocio S.A."
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-field">
                                    <label>Dirección Laboral</label>
                                    <div className="input-affix-wrapper">
                                        <span className="input-prefix"><MapPin size={18} /></span>
                                        <input
                                            type="text"
                                            name="empresa_direccion"
                                            value={formData.empresa_direccion}
                                            onChange={handleChange}
                                            required
                                            placeholder="Calle Falsa 123"
                                        />
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label>Teléfono de Contacto</label>
                                    <div className="input-affix-wrapper">
                                        <span className="input-prefix"><Phone size={18} /></span>
                                        <input
                                            type="text"
                                            name="empresa_telefono"
                                            value={formData.empresa_telefono}
                                            onChange={handleChange}
                                            required
                                            placeholder="+54 11 ..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-field full-width">
                                <label>Nombre del Local o Sucursal Principal</label>
                                <div className="input-affix-wrapper">
                                    <span className="input-prefix"><Store size={18} /></span>
                                    <input
                                        type="text"
                                        name="local_principal_nombre"
                                        value={formData.local_principal_nombre}
                                        onChange={handleChange}
                                        required
                                        placeholder="Sucursal Centro"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <div className="section-header">
                                <User size={18} />
                                <h3>Credenciales de Administrador</h3>
                            </div>

                            <div className="form-field full-width">
                                <label>Nombre de Usuario</label>
                                <div className="input-affix-wrapper">
                                    <span className="input-prefix"><User size={18} /></span>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        placeholder="admin"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-field">
                                    <label>Contraseña</label>
                                    <div className="input-affix-wrapper">
                                        <span className="input-prefix"><Lock size={18} /></span>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            placeholder="Altamente segura"
                                        />
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label>Confirmar Contraseña</label>
                                    <div className="input-affix-wrapper">
                                        <span className="input-prefix"><Lock size={18} /></span>
                                        <input
                                            type="password"
                                            name="confirm_password"
                                            value={formData.confirm_password}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="register-actions">
                            <button type="submit" className="btn-auth-primary lg" disabled={loading}>
                                {loading ? 'Procesando registro...' : (
                                    <>
                                        Completar Registro <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                            <p className="terms-text">
                                Al registrarte, aceptas nuestros <a href="#">Términos de Servicio</a> y <a href="#">Política de Privacidad</a>.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
