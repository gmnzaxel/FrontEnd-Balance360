import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Users, Store, Phone, MapPin, Loader2, Eye,
  ShieldCheck, Power, PowerOff, Trash2, AlertTriangle,
  Search, Key, Package, TrendingUp,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { getErrorMessage } from '../utils/errorUtils';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';

const SuperDashboard = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState(null);
  const [companyUsers, setCompanyUsers] = useState({});
  const [loadingUsers, setLoadingUsers] = useState({});

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Global metrics state
  const [globalMetrics, setGlobalMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Reset password states
  const [resetUser, setResetUser] = useState(null);
  const [resetCompanyId, setResetCompanyId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Action states
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // company object

  // Form states
  const [formData, setFormData] = useState({
    empresa_nombre: '',
    empresa_direccion: '',
    empresa_telefono: '',
    local_principal_nombre: 'Casa Central',
    username: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const response = await api.get('settings/companies/');
      setCompanies(response.data?.results || response.data || []);
    } catch (error) {
      toast.error('Error al cargar empresas: ' + getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const response = await api.get('settings/companies/global-metrics/');
      setGlobalMetrics(response.data);
    } catch (error) {
      console.error('Error al cargar métricas globales:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadGlobalMetrics();
  }, []);

  const toggleExpandCompany = async (companyId) => {
    if (expandedCompanyId === companyId) {
      setExpandedCompanyId(null);
      return;
    }

    setExpandedCompanyId(companyId);
    if (!companyUsers[companyId]) {
      setLoadingUsers((prev) => ({ ...prev, [companyId]: true }));
      try {
        const response = await api.get(`settings/companies/${companyId}/users/`);
        setCompanyUsers((prev) => ({ ...prev, [companyId]: response.data || [] }));
      } catch (error) {
        toast.error('Error al cargar usuarios: ' + getErrorMessage(error));
      } finally {
        setLoadingUsers((prev) => ({ ...prev, [companyId]: false }));
      }
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('La contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    setResettingPassword(true);
    try {
      const response = await api.post(`settings/companies/${resetCompanyId}/reset-user-password/`, {
        user_id: resetUser.id,
        new_password: newPassword,
      });
      toast.success(response.data.detail || 'Contraseña restablecida correctamente.');
      setResetUser(null);
    } catch (error) {
      toast.error('Error al restablecer contraseña: ' + getErrorMessage(error));
    } finally {
      setResettingPassword(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    if (formData.password.length < 8 || !/\d/.test(formData.password)) {
      toast.error('La contraseña debe tener mínimo 8 caracteres y al menos un número.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('settings/companies/', formData);
      toast.success('Empresa registrada con éxito.');
      setShowModal(false);
      setFormData({
        empresa_nombre: '',
        empresa_direccion: '',
        empresa_telefono: '',
        local_principal_nombre: 'Casa Central',
        username: '',
        email: '',
        password: '',
        confirm_password: '',
      });
      loadCompanies();
      loadGlobalMetrics();
    } catch (error) {
      toast.error('Error al registrar empresa: ' + getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleImpersonate = (company) => {
    localStorage.setItem('impersonated_company_id', company.id);
    localStorage.setItem('impersonated_company_name', company.name);
    toast.success(`Entrando como ${company.name}`);
    navigate('/new-sale');
  };

  const handleToggleActive = async (company) => {
    setTogglingId(company.id);
    try {
      const res = await api.post(`settings/companies/${company.id}/toggle-active/`);
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, is_active: res.data.is_active } : c))
      );
      toast.success(res.data.detail);
      loadGlobalMetrics();
    } catch (error) {
      toast.error('Error al cambiar estado: ' + getErrorMessage(error));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await api.delete(`settings/companies/${confirmDelete.id}/`);
      toast.success(`Empresa "${confirmDelete.name}" eliminada permanentemente.`);
      
      // Limpiar datos de impersonación si se elimina la empresa que se audita actualmente
      if (localStorage.getItem('impersonated_company_id') === String(confirmDelete.id)) {
        localStorage.removeItem('impersonated_company_id');
        localStorage.removeItem('impersonated_company_name');
      }

      setCompanies((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      setConfirmDelete(null);
      loadGlobalMetrics();
    } catch (error) {
      toast.error('Error al eliminar: ' + getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };



  const filteredCompanies = companies.filter((company) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      company.name.toLowerCase().includes(term) ||
      (company.phone && company.phone.toLowerCase().includes(term)) ||
      (company.address && company.address.toLowerCase().includes(term))
    );
  });

  return (
    <div className="page" style={{ animation: 'fadeIn var(--duration-enter) var(--ease-out-expo) both' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-title">
          <p className="eyebrow">Control de Plataforma</p>
          <h2 className="page-heading">Empresas Registradas</h2>
          <p className="page-subtitle">Visualizá, auditá, habilitá o eliminá empresas del sistema.</p>
        </div>
        <div className="page-header-actions">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowModal(true)}>
            Nueva Empresa
          </Button>
        </div>
      </div>

      {/* Global Metrics Grid */}
      {loadingMetrics ? (
        <div className="grid four-cols gap-md" style={{ marginBottom: '24px' }}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={80} />)}
        </div>
      ) : globalMetrics && (
        <div className="kpi-grid" style={{ marginBottom: '24px' }}>
          <div className="card kpi-card">
            <div className="flex-row justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="muted small" style={{ margin: 0, fontSize: '0.85rem' }}>Empresas Habilitadas</p>
                <h3 className="kpi-value" style={{ margin: '4px 0 0 0', fontSize: '1.4rem' }}>{globalMetrics.active_companies} / {globalMetrics.total_companies}</h3>
              </div>
              <div className="kpi-icon">
                <Store size={18} />
              </div>
            </div>
          </div>

          <div className="card kpi-card">
            <div className="flex-row justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="muted small" style={{ margin: 0, fontSize: '0.85rem' }}>Usuarios de Negocio</p>
                <h3 className="kpi-value" style={{ margin: '4px 0 0 0', fontSize: '1.4rem' }}>{globalMetrics.total_users}</h3>
              </div>
              <div className="kpi-icon tone-success">
                <Users size={18} />
              </div>
            </div>
          </div>

          <div className="card kpi-card">
            <div className="flex-row justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="muted small" style={{ margin: 0, fontSize: '0.85rem' }}>Productos Totales</p>
                <h3 className="kpi-value" style={{ margin: '4px 0 0 0', fontSize: '1.4rem' }}>{globalMetrics.total_products}</h3>
              </div>
              <div className="kpi-icon tone-warning">
                <Package size={18} />
              </div>
            </div>
          </div>

          <div className="card kpi-card">
            <div className="flex-row justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="muted small" style={{ margin: 0, fontSize: '0.85rem' }}>Ventas / Facturación</p>
                <h3 className="kpi-value" style={{ margin: '4px 0 0 0', fontSize: '1.3rem' }}>{globalMetrics.total_sales} (${globalMetrics.total_revenue.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</h3>
              </div>
              <div className="kpi-icon tone-danger">
                <TrendingUp size={18} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Toolbar */}
      <Card className="page-toolbar" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', padding: '12px' }}>
        <div style={{ maxWidth: '400px', width: '100%' }}>
          <Input
            placeholder="Buscar empresa por nombre, teléfono o dirección…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>
      </Card>

      {/* Table */}
      <div className="table-container">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Contacto</th>
              <th>Ubicación</th>
              <th>Alta</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Estado</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Usuarios</th>
              <th style={{ width: '220px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan="7"><Skeleton height={48} /></td>
                </tr>
              ))
            ) : filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => {
                const isActive = company.is_active !== false;
                const isToggling = togglingId === company.id;
                const isDeleting = deletingId === company.id;


                return (
                  <React.Fragment key={company.id}>
                    <tr
                      style={{
                        cursor: 'pointer',
                        opacity: isActive ? 1 : 0.55,
                        transition: 'opacity 0.2s',
                      }}
                      onClick={() => toggleExpandCompany(company.id)}
                    >
                      {/* Name */}
                      <td data-label="Empresa">
                        <div className="flex-row gap-xs items-center">
                          <div
                            className="section-icon"
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              background: isActive
                                ? 'rgba(99, 102, 241, 0.15)'
                                : 'rgba(148, 163, 184, 0.1)',
                              color: isActive ? 'var(--primary-300)' : 'var(--text-secondary)',
                            }}
                          >
                            <Store size={14} />
                          </div>
                          <span className="font-medium">{company.name}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td data-label="Contacto" className="text-slate-500">
                        <div className="flex-row gap-xs items-center">
                          <Phone size={12} /> {company.phone || '—'}
                        </div>
                      </td>

                      {/* Address */}
                      <td data-label="Ubicación" className="text-slate-500">
                        <div className="flex-row gap-xs items-center">
                          <MapPin size={12} /> {company.address || '—'}
                        </div>
                      </td>

                      {/* Created at */}
                      <td data-label="Alta" className="text-slate-500">
                        {new Date(company.created_at).toLocaleDateString('es-AR')}
                      </td>

                      {/* Status badge */}
                      <td data-label="Estado" style={{ textAlign: 'center' }}>
                        <span className={`badge ${isActive ? 'badge-success' : 'badge-neutral'}`}>
                          {isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>

                      {/* Users expand */}
                      <td data-label="Usuarios" style={{ textAlign: 'center' }}>
                        <button
                          className="badge badge-neutral"
                          style={{ border: 'none', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandCompany(company.id);
                          }}
                        >
                          <Users size={12} style={{ marginRight: '4px' }} /> Ver
                        </button>
                      </td>

                      {/* Actions */}
                      <td
                        data-label="Acciones"
                        style={{ textAlign: 'right' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* Enter company */}
                          {(() => {
                            const isCurrentAudit = localStorage.getItem('impersonated_company_id') === String(company.id);
                            return (
                              <Button
                                variant={isCurrentAudit ? "primary" : "secondary"}
                                size="sm"
                                icon={isCurrentAudit ? <ShieldCheck size={14} /> : <Eye size={14} />}
                                onClick={() => handleImpersonate(company)}
                                style={{
                                  padding: '6px 10px',
                                  ...(isCurrentAudit ? {
                                    background: 'var(--warning-bg)',
                                    borderColor: 'rgba(245, 158, 11, 0.3)',
                                    color: 'var(--warning-text)',
                                    fontWeight: '600'
                                  } : {})
                                }}
                                title={isCurrentAudit ? "Actualmente auditando esta empresa" : "Entrar como esta empresa"}
                              >
                                {isCurrentAudit ? 'Auditando' : 'Entrar'}
                              </Button>
                            );
                          })()}


                          {/* Toggle active */}
                          <button
                            className="btn-icon"
                            title={isActive ? 'Deshabilitar empresa' : 'Habilitar empresa'}
                            disabled={isToggling}
                            onClick={() => handleToggleActive(company)}
                            style={{
                              color: isActive ? 'var(--warning-text)' : 'var(--success-text)',
                              border: `1px solid ${isActive ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                              borderRadius: '8px',
                              padding: '6px',
                            }}
                          >
                            {isToggling
                              ? <Loader2 size={14} className="spin" />
                              : isActive
                                ? <PowerOff size={14} />
                                : <Power size={14} />
                            }
                          </button>

                          {/* Delete */}
                          <button
                            className="btn-icon"
                            title="Eliminar empresa permanentemente"
                            disabled={isDeleting}
                            onClick={() => setConfirmDelete(company)}
                            style={{
                              color: 'var(--danger-text)',
                              border: '1px solid rgba(239,68,68,0.3)',
                              borderRadius: '8px',
                              padding: '6px',
                            }}
                          >
                            {isDeleting
                              ? <Loader2 size={14} className="spin" />
                              : <Trash2 size={14} />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded users row */}
                    {expandedCompanyId === company.id && (
                      <tr>
                        <td
                          colSpan="7"
                          style={{ background: 'rgba(15, 23, 42, 0.25)', padding: '12px 24px' }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p className="eyebrow" style={{ marginBottom: '4px' }}>
                              Cuentas de usuario registradas:
                            </p>
                            {loadingUsers[company.id] ? (
                              <div className="flex-row gap-xs items-center text-slate-500">
                                <Loader2 className="spin" size={14} /> Cargando usuarios...
                              </div>
                            ) : companyUsers[company.id]?.length > 0 ? (
                              <div className="grid three-cols gap-sm">
                                {companyUsers[company.id].map((u) => (
                                  <div
                                    key={u.id}
                                    className="mini-card"
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      background: 'var(--surface-1)',
                                    }}
                                  >
                                    <div>
                                      <div className="font-medium" style={{ fontSize: '0.9rem' }}>
                                        {u.username}
                                      </div>
                                      <div className="muted tiny">{u.email || 'Sin email'}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span
                                        className={`badge ${u.role === 'ADMIN' ? 'badge-primary' : 'badge-neutral'}`}
                                        style={{ fontSize: '0.7rem' }}
                                      >
                                        {u.role}
                                      </span>
                                      <button
                                        className="btn-icon"
                                        title="Restablecer contraseña"
                                        style={{ 
                                          padding: '4px',
                                          borderRadius: '6px',
                                          border: '1px solid rgba(148, 163, 184, 0.25)',
                                          background: 'rgba(15, 23, 42, 0.15)',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: 'var(--text-secondary)'
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setResetUser(u);
                                          setResetCompanyId(company.id);
                                          setNewPassword('');
                                          setConfirmNewPassword('');
                                        }}
                                      >
                                        <Key size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="muted small">No hay usuarios registrados en esta empresa.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan="7">
                  <div className="empty-state">
                    <Store size={40} />
                    <p>{searchTerm ? 'No se encontraron empresas' : 'No hay empresas registradas'}</p>
                    <p>{searchTerm ? 'Probá con otro término de búsqueda.' : 'Creá la primera empresa con el botón de arriba.'}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal: Confirm Delete ───────────────────────────────── */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => !deletingId && setConfirmDelete(null)}>
          <div className="ui-modal" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.1)', display: 'grid',
                  placeItems: 'center', color: 'var(--danger-text)',
                }}>
                  <AlertTriangle size={18} />
                </div>
                <h3 style={{ margin: 0 }}>Eliminar empresa</h3>
              </div>
            </div>

            <div className="modal-body" style={{ gap: '12px' }}>
              <div className="inline-notice inline-notice-error">
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <strong>Esta acción es irreversible.</strong><br />
                  Se eliminarán permanentemente la empresa, todos sus usuarios, productos, ventas y configuraciones.
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                ¿Estás seguro de que querés eliminar{' '}
                <strong style={{ color: 'var(--text-primary)' }}>"{confirmDelete.name}"</strong>?
              </p>
            </div>

            <div className="modal-foot">
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(null)}
                disabled={!!deletingId}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                icon={deletingId ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                onClick={handleDelete}
                disabled={!!deletingId}
              >
                {deletingId ? 'Eliminando…' : 'Eliminar permanentemente'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Create Company ───────────────────────────────── */}
      {showModal && (
        <Modal
          persist={true}
          title="Agregar Nueva Empresa"
          onClose={() => !submitting && setShowModal(false)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setShowModal(false)} disabled={submitting}>Cancelar</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Creando…' : 'Crear Empresa'}
              </Button>
            </>
          )}
        >
          <form onSubmit={handleSubmit} className="form-stack">
            <div className="section-block" style={{ marginBottom: '12px' }}>
              <p className="eyebrow" style={{ marginBottom: '8px' }}>1. Información de la Empresa</p>
              <div className="grid two-cols">
                <Input
                  label="Nombre / Razón Social *"
                  name="empresa_nombre"
                  value={formData.empresa_nombre}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: Distribuidora Norte S.A."
                />
                <Input
                  label="Sucursal Principal *"
                  name="local_principal_nombre"
                  value={formData.local_principal_nombre}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: Casa Central"
                />
              </div>
              <div className="grid two-cols mt-2">
                <Input
                  label="Dirección *"
                  name="empresa_direccion"
                  value={formData.empresa_direccion}
                  onChange={handleInputChange}
                  required
                  placeholder="Calle 123, Ciudad"
                  icon={<MapPin size={16} />}
                />
                <Input
                  label="Teléfono *"
                  name="empresa_telefono"
                  value={formData.empresa_telefono}
                  onChange={handleInputChange}
                  required
                  placeholder="+54 11 12345678"
                  icon={<Phone size={16} />}
                />
              </div>
            </div>

            <div className="section-block">
              <p className="eyebrow" style={{ marginBottom: '8px' }}>2. Cuenta Administrador</p>
              <div className="grid two-cols">
                <Input
                  label="Usuario Administrador *"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  placeholder="admin_empresa"
                />
                <Input
                  label="Email (Opcional)"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="contacto@empresa.com"
                />
              </div>
              <div className="grid two-cols mt-2">
                <Input
                  label="Contraseña *"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="••••••••"
                />
                <Input
                  label="Confirmar Contraseña *"
                  name="confirm_password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  required
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="auth-note mt-3">
              <ShieldCheck size={16} style={{ color: 'var(--primary-300)' }} />
              Se creará automáticamente la empresa junto con sus configuraciones y el usuario administrador inicial.
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SuperDashboard;
