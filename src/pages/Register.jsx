import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building, MapPin, Phone, Store, User, Lock, ArrowLeft, ArrowRight } from 'lucide-react';
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
      <div className="auth-panel wide">
        <Card
          title="Crear cuenta de empresa"
          description="Completa los datos para comenzar a operar en minutos."
          headerSlot={(
            <Link to="/login" className="link flex-row">
              <ArrowLeft size={16} /> Volver
            </Link>
          )}
        >
          <form onSubmit={handleSubmit} className="form-stack gap-lg">
            <div className="section-block">
              <div className="section-title">
                <div className="section-icon"><Building size={18} /></div>
                <div>
                  <h4>Datos de la empresa</h4>
                  <p>Información necesaria para emitir reportes y tickets.</p>
                </div>
              </div>
              <div className="grid two-cols">
                <Input
                  label="Razón Social / Nombre"
                  name="empresa_nombre"
                  value={formData.empresa_nombre}
                  onChange={handleChange}
                  placeholder="Ej. Mi Negocio S.A."
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
                  <p>Acceso principal para configurar tu empresa.</p>
                </div>
              </div>
              <div className="grid two-cols">
                <Input
                  label="Nombre de usuario"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="admin"
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

            <Button type="submit" variant="primary" fullWidth icon={<ArrowRight size={18} />} loading={loading}>
              Crear cuenta
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Register;
