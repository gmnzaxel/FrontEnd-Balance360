import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building, MapPin, Phone, Store, User, Lock, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../utils/errorUtils';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    empresa_nombre: '',
    empresa_direccion: '',
    empresa_telefono: '',
    local_principal_nombre: '',
    username: '',
    password: '',
    confirm_password: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await api.post('auth/registro/', formData);
      toast.success('¡Empresa registrada con éxito!');
      navigate('/login');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
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
          <h2 className="auth-headline">Tu empresa, ordenada desde el primer día.</h2>
          <p className="auth-subtitle">Configurá el negocio y empezá a operar en minutos.</p>
          <ul className="auth-list">
            <li>Configuración inicial guiada.</li>
            <li>Usuarios y permisos listos para trabajar.</li>
            <li>Reportes claros desde el primer día.</li>
          </ul>
          <div className="auth-trust">Infraestructura segura y confiable.</div>
        </aside>

        <div className="auth-panel wide">
          <Card
            className="w-full auth-card animate-slide-up"
            title="Crear cuenta de empresa"
            description="Completá los datos para comenzar a operar en minutos."
            headerSlot={(
              <Link to="/login" className="link flex-row">
                <ArrowLeft size={16} /> Volver
              </Link>
            )}
          >
            <div className="brand-chip auth-mobile-brand">
              <div className="brand-icon"><ShieldCheck size={26} /></div>
              <div>
                <p className="eyebrow">Onboarding seguro</p>
                <h2>Balance360</h2>
              </div>
            </div>
            <div className="auth-stepper">
              <div className="auth-step">
                <span className="auth-step-index">1</span>
                <span className="auth-step-label">Empresa</span>
              </div>
              <div className="auth-step">
                <span className="auth-step-index">2</span>
                <span className="auth-step-label">Administrador</span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="form-stack gap-lg">
              <div className="section-block">
                <div className="section-title">
                  <div className="section-icon"><Building size={18} /></div>
                  <div>
                    <h4>Datos de la empresa</h4>
                    <p>Información necesaria para emitir reportes y comprobantes.</p>
                  </div>
                </div>
                <div className="grid two-cols">
                  <Input
                    label="Razón Social / Nombre"
                    name="empresa_nombre"
                    value={formData.empresa_nombre}
                    onChange={handleChange}
                    placeholder="Ej. Mi Negocio S.A."
                    helper="Usá el nombre legal o comercial."
                    className="full-span"
                  />
                  <Input
                    label="Dirección"
                    name="empresa_direccion"
                    value={formData.empresa_direccion}
                    onChange={handleChange}
                    placeholder="Calle 123"
                    icon={<MapPin size={16} />}
                  />
                  <Input
                    label="Teléfono"
                    name="empresa_telefono"
                    value={formData.empresa_telefono}
                    onChange={handleChange}
                    placeholder="+54 ..."
                    helper="Incluí código de país."
                    icon={<Phone size={16} />}
                  />
                  <Input
                    label="Sucursal principal"
                    name="local_principal_nombre"
                    value={formData.local_principal_nombre}
                    onChange={handleChange}
                    placeholder="Ej. Casa Central"
                    icon={<Store size={16} />}
                    className="full-span"
                  />
                </div>
              </div>

              <div className="section-block">
                <div className="section-title">
                  <div className="section-icon subtle"><User size={18} /></div>
                  <div>
                    <h4>Usuario administrador</h4>
                    <p>Acceso principal para configurar el negocio.</p>
                  </div>
                </div>
                <div className="grid two-cols">
                  <Input
                    label="Nombre de usuario"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="admin"
                    helper="Solo letras y números, sin espacios."
                    className="full-span"
                  />
                  <Input
                    label="Contraseña"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    icon={<Lock size={16} />}
                    helper="Mínimo 8 caracteres y 1 número."
                  />
                  <Input
                    label="Confirmar contraseña"
                    type="password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    icon={<Lock size={16} />}
                  />
                </div>
              </div>

              <div className="auth-note">
                <ShieldCheck size={16} />
                Tus datos se almacenan cifrados y no se comparten con terceros.
              </div>

              <Button type="submit" variant="primary" fullWidth icon={<ArrowRight size={18} />} loading={loading}>
                Crear cuenta
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;
