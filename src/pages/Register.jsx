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
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    empresa_nombre: '',
    empresa_direccion: '',
    empresa_telefono: '',
    local_principal_nombre: '',
    username: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const getPasswordStrength = (value) => {
    if (!value) return { level: 0, label: 'Ingresá una contraseña.' };
    const hasNumber = /\d/.test(value);
    const hasLetter = /[A-Za-z]/.test(value);
    const hasSymbol = /[^A-Za-z0-9]/.test(value);
    if (value.length >= 12 && hasNumber && hasLetter && hasSymbol) {
      return { level: 3, label: 'Fuerte' };
    }
    if (value.length >= 8 && hasNumber && hasLetter) {
      return { level: 2, label: 'Media' };
    }
    return { level: 1, label: 'Débil' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleChange = (e) => {
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    const requiredFields = [
      'empresa_nombre',
      'empresa_direccion',
      'empresa_telefono',
      'local_principal_nombre',
    ];
    const nextErrors = {};
    requiredFields.forEach((field) => {
      if (!formData[field].trim()) {
        nextErrors[field] = 'Campo obligatorio.';
      }
    });
    const missing = Object.keys(nextErrors);
    if (missing.length) {
      setErrors((prev) => ({ ...prev, ...nextErrors }));
      toast.error('Completá los datos de la empresa antes de continuar.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      handleNext();
      return;
    }
    const requiredFields = [
      'username',
      'password',
      'confirm_password',
    ];
    const nextErrors = {};
    requiredFields.forEach((field) => {
      if (!formData[field].trim()) {
        nextErrors[field] = 'Campo obligatorio.';
      }
    });
    if (Object.keys(nextErrors).length) {
      setErrors((prev) => ({ ...prev, ...nextErrors }));
      toast.error('Completá los datos del administrador.');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setErrors((prev) => ({ ...prev, confirm_password: 'Las contraseñas no coinciden.' }));
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 8 || !/\d/.test(formData.password)) {
      setErrors((prev) => ({
        ...prev,
        password: 'Mínimo 8 caracteres y al menos 1 número.',
      }));
      toast.error('La contraseña es débil.');
      return;
    }
    setLoading(true);
    try {
      await api.post('auth/registro/', formData);
      toast.success('¡Empresa registrada con éxito!');
      navigate('/login');
    } catch (error) {
      if (error.response?.data && typeof error.response.data === 'object') {
        const apiErrors = {};
        Object.entries(error.response.data).forEach(([key, value]) => {
          const message = Array.isArray(value) ? value[0] : value;
          apiErrors[key] = message;
        });
        if (Object.keys(apiErrors).length) {
          setErrors((prev) => ({ ...prev, ...apiErrors }));
        }
      }
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell auth-shell-register">
      <div className="auth-layout">
        <aside className="auth-aside auth-aside-compact">
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
              <div className={`auth-step ${step >= 1 ? 'is-active' : ''}`}>
                <span className="auth-step-index">1</span>
                <span className="auth-step-label">Empresa</span>
              </div>
              <div className={`auth-step ${step >= 2 ? 'is-active' : ''}`}>
                <span className="auth-step-index">2</span>
                <span className="auth-step-label">Administrador</span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="form-stack gap-lg">
              {step === 1 ? (
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
                      error={errors.empresa_nombre}
                    />
                    <Input
                      label="Dirección"
                      name="empresa_direccion"
                      value={formData.empresa_direccion}
                      onChange={handleChange}
                      placeholder="Calle 123"
                      icon={<MapPin size={16} />}
                      error={errors.empresa_direccion}
                    />
                    <Input
                      label="Teléfono"
                      name="empresa_telefono"
                      value={formData.empresa_telefono}
                      onChange={handleChange}
                      placeholder="+54 ..."
                      helper="Incluí código de país."
                      icon={<Phone size={16} />}
                      error={errors.empresa_telefono}
                    />
                    <Input
                      label="Sucursal principal"
                      name="local_principal_nombre"
                      value={formData.local_principal_nombre}
                      onChange={handleChange}
                      placeholder="Ej. Casa Central"
                      icon={<Store size={16} />}
                      className="full-span"
                      error={errors.local_principal_nombre}
                    />
                  </div>
                </div>
              ) : (
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
                      autoComplete="username"
                      error={errors.username}
                    />
                    <Input
                      label="Email (opcional)"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="admin@tuempresa.com"
                      helper="Lo usaremos para recuperación de cuenta."
                      className="full-span"
                      autoComplete="email"
                      error={errors.email}
                    />
                    <Input
                      label="Contraseña"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      icon={<Lock size={16} />}
                      helper="Mínimo 8 caracteres y 1 número."
                      autoComplete="new-password"
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
                    />
                    <Input
                      label="Confirmar contraseña"
                      type={showConfirm ? 'text' : 'password'}
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      icon={<Lock size={16} />}
                      autoComplete="new-password"
                      error={errors.confirm_password}
                      suffix={(
                        <button
                          type="button"
                          className="field-action"
                          onClick={() => setShowConfirm((prev) => !prev)}
                        >
                          {showConfirm ? 'Ocultar' : 'Mostrar'}
                        </button>
                      )}
                    />
                    <div className="password-meter full-span">
                      <div className="password-meter-track">
                        <div className={`password-meter-bar level-${passwordStrength.level}`} />
                      </div>
                      <span className="password-meter-label">
                        Fortaleza: {passwordStrength.label}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="auth-note">
                <ShieldCheck size={16} />
                Tus datos se almacenan cifrados y no se comparten con terceros.
              </div>

              <div className={`auth-actions ${step === 1 ? 'is-single' : ''}`}>
                {step === 2 && (
                  <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                    Volver
                  </Button>
                )}
                {step === 1 ? (
                  <Button type="button" variant="primary" icon={<ArrowRight size={18} />} onClick={handleNext}>
                    Continuar
                  </Button>
                ) : (
                  <Button type="submit" variant="primary" icon={<ArrowRight size={18} />} loading={loading}>
                    Crear cuenta
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;
