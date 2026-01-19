import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!username.trim()) nextErrors.username = 'Ingresá tu usuario.';
    if (!password) nextErrors.password = 'Ingresá tu contraseña.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setLoading(true);
    const success = await login(username.trim(), password);
    setLoading(false);
    if (success) {
      navigate('/');
    } else {
      setErrors((prev) => ({
        ...prev,
        password: 'Revisá usuario y contraseña.',
      }));
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-layout">
        <aside className="auth-aside">
          <div className="auth-brand">
            <div className="brand-icon"><ShieldCheck size={26} /></div>
            <div className="brand-text">
              <span>Balance</span>
              <strong>360</strong>
            </div>
          </div>
          <h2 className="auth-headline">Gestioná tu negocio en un solo lugar.</h2>
          <p className="auth-subtitle">Ventas, inventario y reportes con foco en claridad y control.</p>
          <ul className="auth-list">
            <li>Inventario con stock en tiempo real.</li>
            <li>Ventas rápidas con historial completo.</li>
            <li>Reportes claros para tomar decisiones.</li>
          </ul>
          <div className="auth-trust">Seguridad y auditoría integradas.</div>
        </aside>

        <div className="auth-panel">
          <Card
            className="w-full auth-card animate-slide-up"
            title="Iniciá sesión"
            description="Accedé a tu cuenta para continuar."
          >
            <div className="brand-chip auth-mobile-brand">
              <div className="brand-icon"><ShieldCheck size={26} /></div>
              <div>
                <p className="eyebrow">Acceso seguro</p>
                <h2>Balance360</h2>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="form-stack">
              <Input
                label="Usuario"
                placeholder="usuario_admin"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrors((prev) => ({ ...prev, username: '' }));
                }}
                icon={<User size={18} />}
                autoComplete="username"
                error={errors.username}
                required
              />
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: '' }));
                }}
                icon={<Lock size={18} />}
                autoComplete="current-password"
                error={errors.password}
                suffix={(
                  <button
                    type="button"
                    className="field-action"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                )}
                required
              />
              <Button type="submit" variant="primary" fullWidth loading={loading} icon={<ArrowRight size={18} />}>
                Ingresar
              </Button>
            </form>
            <p className="muted text-center">
              ¿No tenés cuenta?{' '}
              <Link to="/registro" className="link">
                Registrá tu empresa
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
