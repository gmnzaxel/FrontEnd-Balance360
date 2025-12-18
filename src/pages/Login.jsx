import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck, BarChart3, PieChart } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const success = await login(username, password);
        setLoading(false);
        if (success) {
            navigate('/');
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-container login-split">
                {/* Visual Side */}
                <div className="auth-hero">
                    <div className="hero-content">
                        <div className="hero-logo">
                            <ShieldCheck size={48} className="text-primary-400" />
                            <h1>Balance<span>360</span></h1>
                        </div>
                        <h2 className="hero-title">Gestión Inteligente para tu Negocio</h2>
                        <p className="hero-description">
                            Controla tu inventario, ventas y reportes en tiempo real con la plataforma
                            líder para PyMEs.
                        </p>

                        <div className="hero-features">
                            <div className="feature-item">
                                <BarChart3 size={20} />
                                <span>Reportes Avanzados</span>
                            </div>
                            <div className="feature-item">
                                <PieChart size={20} />
                                <span>Análisis de Margen</span>
                            </div>
                        </div>
                    </div>
                    <div className="hero-footer">
                        <p>© 2025 Balance360 Cloud Solutions</p>
                    </div>
                </div>

                {/* Form Side */}
                <div className="auth-form-card">
                    <div className="form-inner">
                        <div className="form-header">
                            <h3>Bienvenido de nuevo</h3>
                            <p>Ingresa tus credenciales para acceder al panel</p>
                        </div>

                        <form onSubmit={handleSubmit} className="modern-form">
                            <div className="form-field">
                                <label>Nombre de Usuario</label>
                                <div className="input-affix-wrapper">
                                    <span className="input-prefix"><User size={18} /></span>
                                    <input
                                        type="text"
                                        placeholder="Tu usuario"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="form-field">
                                <div className="label-row">
                                    <label>Contraseña</label>
                                    <a href="#" className="forgot-link">¿Olvidaste tu contraseña?</a>
                                </div>
                                <div className="input-affix-wrapper">
                                    <span className="input-prefix"><Lock size={18} /></span>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-options">
                                <label className="custom-checkbox">
                                    <input type="checkbox" />
                                    <span>Recordarme</span>
                                </label>
                            </div>

                            <button type="submit" className="btn-auth-primary" disabled={loading}>
                                {loading ? 'Validando...' : (
                                    <>
                                        Iniciar Sesión <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="form-footer">
                            <p>¿Aún no eres parte? <Link to="/registro">Registra tu empresa aquí</Link></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
