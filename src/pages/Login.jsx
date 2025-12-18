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
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(username, password);
    setLoading(false);
    if (success) navigate('/');
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <Card className="w-full" title="Bienvenido a Balance360" description="Gestiona tu negocio con una experiencia premium.">
          <div className="brand-chip">
            <div className="brand-icon"><ShieldCheck size={26} /></div>
            <div>
              <p className="eyebrow">Acceso seguro</p>
              <h2>Inicia sesión</h2>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="form-stack">
            <Input
              label="Usuario"
              placeholder="usuario_admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon={<User size={18} />}
              required
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={18} />}
              required
            />
            <Button type="submit" variant="primary" fullWidth loading={loading} icon={<ArrowRight size={18} />}>
              Ingresar
            </Button>
          </form>
          <p className="muted text-center">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="link">
              Registrar tu empresa
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Login;
