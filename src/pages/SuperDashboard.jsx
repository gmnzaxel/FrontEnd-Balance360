import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Users, Store, Phone, MapPin, Loader2, Eye,
  ShieldCheck, Power, PowerOff, Trash2, AlertTriangle,
  Search, Key, Package, TrendingUp, Pencil, Copy, Download,
  ChevronLeft, ChevronRight, Filter, Activity, CheckCircle2, XCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { getErrorMessage } from '../utils/errorUtils';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';

// ── Live Pulsing Dot ──────────────────────────────────────────────────────────
const LiveDot = ({ active }) => (
  <span
    style={{
      display: 'inline-block',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: active ? '#10b981' : '#94a3b8',
      boxShadow: active ? '0 0 0 3px rgba(16, 185, 129, 0.25)' : 'none',
      marginRight: '8px',
      flexShrink: 0,
    }}
  />
);

// ── Reusable Paginator ────────────────────────────────────────────────────────
const Paginator = ({ currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }) => {
  if (totalItems === 0) return null;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'var(--surface-1)',
        borderTop: '1px solid var(--border-color)',
        borderRadius: '0 0 12px 12px',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <div>
        Mostrando <strong style={{ color: 'var(--text-primary)' }}>{startItem}-{endItem}</strong> de{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> registros
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Mostrar:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="btn-icon"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            style={{
              padding: '5px',
              borderRadius: '6px',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage <= 1 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ padding: '0 8px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {currentPage} / {totalPages}
          </span>

          <button
            className="btn-icon"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            style={{
              padding: '5px',
              borderRadius: '6px',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage >= totalPages ? 0.4 : 1,
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const SuperDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('companies'); // 'companies' o 'logs'
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Edit Company State
  const [editingCompany, setEditingCompany] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', address: '', phone: '' });
  const [updatingCompany, setUpdatingCompany] = useState(false);

  // Expandable company detail & users
  const [expandedCompanyId, setExpandedCompanyId] = useState(null);
  const [companyDetails, setCompanyDetails] = useState({}); // { [companyId]: { users: [], stats: {} } }
  const [loadingUsers, setLoadingUsers] = useState({});
  const [togglingUser, setTogglingUser] = useState({}); // { [userId]: bool }

  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [logsSearchTerm, setLogsSearchTerm] = useState('');

  // Logs Filter states
  const [logStatusFilter, setLogStatusFilter] = useState('ALL'); // 'ALL', 'SUCCESS', 'FAILED'
  const [logTimeFilter, setLogTimeFilter] = useState('ALL'); // 'ALL', '24H', '7D'

  // Pagination states
  const [companyPage, setCompanyPage] = useState(1);
  const [companyPageSize, setCompanyPageSize] = useState(10);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(15);

  // Global metrics state
  const [globalMetrics, setGlobalMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Login logs state
  const [loginLogs, setLoginLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

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
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  // Form states (Create Company)
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
      toast.error('Error al cargar métricas globales');
    } finally {
      setLoadingMetrics(false);
    }
  };

  const loadLoginLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await api.get('users/login-logs/');
      setLoginLogs(response.data || []);
    } catch (error) {
      console.error('Error al cargar logs de login:', error);
      toast.error('Error al cargar logs de auditoría de accesos');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadGlobalMetrics();
    loadLoginLogs();
  }, []);

  // Copy text helper
  const handleCopyText = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.info(`${label || 'Texto'} copiado al portapapeles`);
  };

  // Toggle company expanded view
  const toggleExpandCompany = async (companyId) => {
    if (expandedCompanyId === companyId) {
      setExpandedCompanyId(null);
      return;
    }

    setExpandedCompanyId(companyId);
    if (!companyDetails[companyId]) {
      setLoadingUsers((prev) => ({ ...prev, [companyId]: true }));
      try {
        const response = await api.get(`settings/companies/${companyId}/users/`);
        const users = Array.isArray(response.data) ? response.data : response.data?.users || [];
        const stats = response.data?.stats || {};
        setCompanyDetails((prev) => ({ ...prev, [companyId]: { users, stats } }));
      } catch (error) {
        toast.error('Error al cargar detalle de empresa: ' + getErrorMessage(error));
      } finally {
        setLoadingUsers((prev) => ({ ...prev, [companyId]: false }));
      }
    }
  };

  // Toggle user active status
  const handleToggleUserActive = async (companyId, user) => {
    setTogglingUser((prev) => ({ ...prev, [user.id]: true }));
    try {
      const res = await api.post(`settings/companies/${companyId}/toggle-user-active/`, {
        user_id: user.id,
      });
      toast.success(res.data.detail);
      setCompanyDetails((prev) => {
        const current = prev[companyId] || { users: [], stats: {} };
        const updatedUsers = (current.users || []).map((u) =>
          u.id === user.id ? { ...u, is_active: res.data.is_active } : u
        );
        return { ...prev, [companyId]: { ...current, users: updatedUsers } };
      });
    } catch (error) {
      toast.error('Error al cambiar estado de usuario: ' + getErrorMessage(error));
    } finally {
      setTogglingUser((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  // Edit company
  const handleEditCompanyOpen = (company) => {
    setEditingCompany(company);
    setEditFormData({
      name: company.name || '',
      address: company.address || '',
      phone: company.phone || '',
    });
  };

  const handleEditCompanySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!editingCompany) return;
    setUpdatingCompany(true);
    try {
      const res = await api.patch(`settings/companies/${editingCompany.id}/`, editFormData);
      setCompanies((prev) =>
        prev.map((c) => (c.id === editingCompany.id ? { ...c, ...res.data } : c))
      );
      toast.success(`Empresa "${res.data.name}" actualizada correctamente.`);
      setEditingCompany(null);
    } catch (error) {
      toast.error('Error al actualizar empresa: ' + getErrorMessage(error));
    } finally {
      setUpdatingCompany(false);
    }
  };

  // Reset password
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
    if (deleteConfirmationInput !== confirmDelete.name) {
      toast.error('El nombre de la empresa no coincide.');
      return;
    }
    setDeletingId(confirmDelete.id);
    try {
      await api.post(`settings/companies/${confirmDelete.id}/purge/`, {
        confirm_name: deleteConfirmationInput,
      });
      toast.success(`Empresa "${confirmDelete.name}" y todos sus registros asociados han sido purgados permanentemente.`);

      if (localStorage.getItem('impersonated_company_id') === String(confirmDelete.id)) {
        localStorage.removeItem('impersonated_company_id');
        localStorage.removeItem('impersonated_company_name');
      }

      setCompanies((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      setConfirmDelete(null);
      setDeleteConfirmationInput('');
      loadGlobalMetrics();
    } catch (error) {
      toast.error('Error al eliminar: ' + getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  // CSV Exporters
  const exportCompaniesCSV = () => {
    if (filteredCompanies.length === 0) return;
    const headers = ['ID', 'Nombre', 'Telefono', 'Direccion', 'Fecha Alta', 'Estado'];
    const rows = filteredCompanies.map((c) => [
      c.id,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      new Date(c.created_at).toLocaleDateString('es-AR'),
      c.is_active !== false ? 'Activa' : 'Inactiva',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `empresas_balance360_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Lista de empresas exportada a CSV.');
  };

  const exportLogsCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Usuario', 'Empresa', 'IP', 'User Agent', 'Fecha y Hora', 'Estado'];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${(l.username || '').replace(/"/g, '""')}"`,
      `"${(l.company_name || '').replace(/"/g, '""')}"`,
      `"${(l.ip_address || '').replace(/"/g, '""')}"`,
      `"${(l.user_agent || '').replace(/"/g, '""')}"`,
      new Date(l.fecha).toLocaleString('es-AR'),
      l.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_logins_balance360_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Logs de auditoría exportados a CSV.');
  };

  // Filtered & Paginated Companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        company.name.toLowerCase().includes(term) ||
        (company.phone && company.phone.toLowerCase().includes(term)) ||
        (company.address && company.address.toLowerCase().includes(term))
      );
    });
  }, [companies, searchTerm]);

  const totalCompanyPages = Math.ceil(filteredCompanies.length / companyPageSize) || 1;
  const paginatedCompanies = useMemo(() => {
    const start = (companyPage - 1) * companyPageSize;
    return filteredCompanies.slice(start, start + companyPageSize);
  }, [filteredCompanies, companyPage, companyPageSize]);

  // Filtered & Paginated Logs
  const filteredLogs = useMemo(() => {
    const now = new Date().getTime();
    return loginLogs.filter((log) => {
      // Search term
      const term = logsSearchTerm.toLowerCase().trim();
      if (term) {
        const match =
          (log.username && log.username.toLowerCase().includes(term)) ||
          (log.company_name && log.company_name.toLowerCase().includes(term)) ||
          (log.ip_address && log.ip_address.toLowerCase().includes(term));
        if (!match) return false;
      }
      // Status filter
      if (logStatusFilter !== 'ALL') {
        if (logStatusFilter === 'SUCCESS' && log.status !== 'SUCCESS') return false;
        if (logStatusFilter === 'FAILED' && log.status === 'SUCCESS') return false;
      }
      // Time filter
      if (logTimeFilter !== 'ALL') {
        const logTime = new Date(log.fecha).getTime();
        const diffHours = (now - logTime) / (1000 * 60 * 60);
        if (logTimeFilter === '24H' && diffHours > 24) return false;
        if (logTimeFilter === '7D' && diffHours > 24 * 7) return false;
      }
      return true;
    });
  }, [loginLogs, logsSearchTerm, logStatusFilter, logTimeFilter]);

  const totalLogsPages = Math.ceil(filteredLogs.length / logsPageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (logsPage - 1) * logsPageSize;
    return filteredLogs.slice(start, start + logsPageSize);
  }, [filteredLogs, logsPage, logsPageSize]);

  // Reset page when search/filters change
  useEffect(() => { setCompanyPage(1); }, [searchTerm]);
  useEffect(() => { setLogsPage(1); }, [logsSearchTerm, logStatusFilter, logTimeFilter]);

  return (
    <div className="page" style={{ animation: 'fadeIn var(--duration-enter) var(--ease-out-expo) both' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-title">
          <p className="eyebrow">Control de Plataforma</p>
          <h2 className="page-heading">Panel de Control Global</h2>
          <p className="page-subtitle">Visualizá métricas, auditá accesos, administrá y gestioná empresas del sistema.</p>
        </div>
        <div className="page-header-actions">
          {activeTab === 'companies' && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowModal(true)}>
              Nueva Empresa
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          className={`tab-btn ${activeTab === 'companies' ? 'active' : ''}`}
          onClick={() => setActiveTab('companies')}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 16px',
            cursor: 'pointer',
            color: activeTab === 'companies' ? 'var(--primary-300)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'companies' ? '2px solid var(--primary-300)' : 'none',
            fontWeight: activeTab === 'companies' ? '600' : 'normal',
            fontSize: '0.95rem',
          }}
        >
          Empresas y Métricas ({companies.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 16px',
            cursor: 'pointer',
            color: activeTab === 'logs' ? 'var(--primary-300)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'logs' ? '2px solid var(--primary-300)' : 'none',
            fontWeight: activeTab === 'logs' ? '600' : 'normal',
            fontSize: '0.95rem',
          }}
        >
          Auditoría de Inicios de Sesión ({loginLogs.length})
        </button>
      </div>

      {activeTab === 'companies' && (
        <>
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
                    <h3 className="kpi-value" style={{ margin: '4px 0 0 0', fontSize: '1.4rem' }}>
                      {globalMetrics.active_companies} / {globalMetrics.total_companies}
                    </h3>
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
                    <h3 className="kpi-value" style={{ margin: '4px 0 0 0', fontSize: '1.3rem' }}>
                      {globalMetrics.total_sales} (${globalMetrics.total_revenue.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                    </h3>
                  </div>
                  <div className="kpi-icon tone-danger">
                    <TrendingUp size={18} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <Card className="page-toolbar" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ maxWidth: '400px', width: '100%' }}>
              <Input
                placeholder="Buscar empresa por nombre, teléfono o dirección…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              onClick={exportCompaniesCSV}
              disabled={filteredCompanies.length === 0}
            >
              Exportar CSV
            </Button>
          </Card>

          {/* Companies Table */}
          <div className="table-container">
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Contacto</th>
                  <th>Ubicación</th>
                  <th>Alta</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Estado</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Usuarios</th>
                  <th style={{ width: '250px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td colSpan="7"><Skeleton height={48} /></td>
                    </tr>
                  ))
                ) : paginatedCompanies.length > 0 ? (
                  paginatedCompanies.map((company) => {
                    const isActive = company.is_active !== false;
                    const isToggling = togglingId === company.id;
                    const isDeleting = deletingId === company.id;

                    return (
                      <React.Fragment key={company.id}>
                        <tr
                          style={{
                            cursor: 'pointer',
                            opacity: isActive ? 1 : 0.6,
                            transition: 'opacity 0.2s',
                          }}
                          onClick={() => toggleExpandCompany(company.id)}
                        >
                          {/* Name */}
                          <td data-label="Empresa">
                            <div className="flex-row gap-xs items-center">
                              <LiveDot active={isActive} />
                              <span className="font-medium">{company.name}</span>
                            </div>
                          </td>

                          {/* Phone */}
                          <td data-label="Contacto" className="text-muted" onClick={(e) => { e.stopPropagation(); handleCopyText(company.phone, 'Teléfono'); }}>
                            <div className="flex-row gap-xs items-center" style={{ cursor: company.phone ? 'pointer' : 'default' }} title="Clic para copiar">
                              <Phone size={12} /> {company.phone || '—'}
                            </div>
                          </td>

                          {/* Address */}
                          <td data-label="Ubicación" className="text-muted" onClick={(e) => { e.stopPropagation(); handleCopyText(company.address, 'Dirección'); }}>
                            <div className="flex-row gap-xs items-center" style={{ cursor: company.address ? 'pointer' : 'default' }} title="Clic para copiar">
                              <MapPin size={12} /> {company.address || '—'}
                            </div>
                          </td>

                          {/* Created at */}
                          <td data-label="Alta" className="text-muted">
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

                              {/* Edit Company */}
                              <button
                                className="btn-icon"
                                title="Editar datos de la empresa"
                                onClick={() => handleEditCompanyOpen(company)}
                                style={{
                                  color: 'var(--primary-300)',
                                  border: '1px solid rgba(99, 102, 241, 0.3)',
                                  borderRadius: '8px',
                                  padding: '6px',
                                }}
                              >
                                <Pencil size={14} />
                              </button>

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
                                {isToggling ? <Loader2 size={14} className="spin" /> : isActive ? <PowerOff size={14} /> : <Power size={14} />}
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
                                {isDeleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Company Detail Row */}
                        {expandedCompanyId === company.id && (
                          <tr>
                            <td colSpan="7" style={{ background: 'rgba(15, 23, 42, 0.35)', padding: '16px 24px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Company Stats Grid */}
                                {companyDetails[company.id]?.stats && (
                                  <div className="grid three-cols gap-sm">
                                    <div className="mini-card" style={{ background: 'var(--surface-1)', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-300)' }}>
                                        <Package size={18} />
                                      </div>
                                      <div>
                                        <p className="muted tiny" style={{ margin: 0 }}>Catálogo de Productos</p>
                                        <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                          {companyDetails[company.id].stats.products_count ?? 0} items
                                        </strong>
                                      </div>
                                    </div>

                                    <div className="mini-card" style={{ background: 'var(--surface-1)', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-text)' }}>
                                        <TrendingUp size={18} />
                                      </div>
                                      <div>
                                        <p className="muted tiny" style={{ margin: 0 }}>Ventas Registradas</p>
                                        <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                          {companyDetails[company.id].stats.sales_count ?? 0} (${(companyDetails[company.id].stats.total_revenue || 0).toLocaleString('es-AR')})
                                        </strong>
                                      </div>
                                    </div>

                                    <div className="mini-card" style={{ background: 'var(--surface-1)', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning-text)' }}>
                                        <Activity size={18} />
                                      </div>
                                      <div>
                                        <p className="muted tiny" style={{ margin: 0 }}>Última Actividad</p>
                                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                          {companyDetails[company.id].stats.last_activity
                                            ? new Date(companyDetails[company.id].stats.last_activity).toLocaleString('es-AR')
                                            : 'Sin accesos registrados'}
                                        </strong>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Users List */}
                                <div>
                                  <p className="eyebrow" style={{ marginBottom: '8px' }}>
                                    Cuentas de usuario registradas en este Tenant:
                                  </p>
                                  {loadingUsers[company.id] ? (
                                    <div className="flex-row gap-xs items-center text-muted">
                                      <Loader2 className="spin" size={14} /> Cargando usuarios...
                                    </div>
                                  ) : companyDetails[company.id]?.users?.length > 0 ? (
                                    <div className="grid three-cols gap-sm">
                                      {companyDetails[company.id].users.map((u) => {
                                        const isUserActive = u.is_active !== false;
                                        const isTogglingThisUser = togglingUser[u.id];

                                        return (
                                          <div
                                            key={u.id}
                                            className="mini-card"
                                            style={{
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              background: 'var(--surface-1)',
                                              padding: '10px 14px',
                                              borderRadius: '10px',
                                              border: '1px solid var(--border-color)',
                                              opacity: isUserActive ? 1 : 0.6,
                                            }}
                                          >
                                            <div>
                                              <div className="font-medium" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {u.username}
                                                <span className={`badge ${isUserActive ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                                  {isUserActive ? 'Activo' : 'Suspendido'}
                                                </span>
                                              </div>
                                              <div
                                                className="muted tiny flex-row items-center gap-xs"
                                                style={{ cursor: u.email ? 'pointer' : 'default', marginTop: '2px' }}
                                                onClick={() => handleCopyText(u.email, 'Email')}
                                                title="Clic para copiar"
                                              >
                                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '130px' }}>
                                                  {u.email || 'Sin email'}
                                                </span>
                                                {u.email && <Copy size={10} />}
                                              </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <span
                                                className={`badge ${u.role === 'ADMIN' ? 'badge-primary' : 'badge-neutral'}`}
                                                style={{ fontSize: '0.7rem' }}
                                              >
                                                {u.role}
                                              </span>

                                              {/* Toggle User Active */}
                                              <button
                                                className="btn-icon"
                                                title={isUserActive ? 'Suspender usuario' : 'Habilitar usuario'}
                                                disabled={isTogglingThisUser}
                                                style={{
                                                  padding: '4px',
                                                  borderRadius: '6px',
                                                  border: `1px solid ${isUserActive ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                                  background: 'rgba(15, 23, 42, 0.15)',
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  color: isUserActive ? 'var(--warning-text)' : 'var(--success-text)',
                                                }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleToggleUserActive(company.id, u);
                                                }}
                                              >
                                                {isTogglingThisUser ? <Loader2 size={12} className="spin" /> : isUserActive ? <PowerOff size={12} /> : <Power size={12} />}
                                              </button>

                                              {/* Reset password */}
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
                                                  color: 'var(--text-secondary)',
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
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="muted small">No hay usuarios registrados en esta empresa.</p>
                                  )}
                                </div>
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

            <Paginator
              currentPage={companyPage}
              totalPages={totalCompanyPages}
              totalItems={filteredCompanies.length}
              pageSize={companyPageSize}
              onPageChange={setCompanyPage}
              onPageSizeChange={setCompanyPageSize}
            />
          </div>
        </>
      )}

      {/* Tab: Login Logs */}
      {activeTab === 'logs' && (
        <>
          {/* Search & Filter Toolbar */}
          <Card className="page-toolbar" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ maxWidth: '320px', width: '100%' }}>
                <Input
                  placeholder="Buscar por usuario, empresa o IP…"
                  value={logsSearchTerm}
                  onChange={(e) => setLogsSearchTerm(e.target.value)}
                  icon={<Search size={16} />}
                />
              </div>

              {/* Status filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
                <select
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value)}
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="SUCCESS">Solo Exitosos (SUCCESS)</option>
                  <option value="FAILED">Solo Fallidos / Errores</option>
                </select>
              </div>

              {/* Time filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select
                  value={logTimeFilter}
                  onChange={(e) => setLogTimeFilter(e.target.value)}
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">Todo el Historial</option>
                  <option value="24H">Últimas 24 Horas</option>
                  <option value="7D">Últimos 7 Días</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                onClick={exportLogsCSV}
                disabled={filteredLogs.length === 0}
              >
                Exportar CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadLoginLogs}
                disabled={loadingLogs}
                icon={loadingLogs ? <Loader2 size={14} className="spin" /> : null}
              >
                Refrescar
              </Button>
            </div>
          </Card>

          {/* Table of Login Logs */}
          <div className="table-container">
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Empresa / Ecosistema</th>
                  <th>Dirección IP</th>
                  <th>Navegador / Dispositivo</th>
                  <th>Fecha y Hora</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loadingLogs ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td colSpan="6"><Skeleton height={48} /></td>
                    </tr>
                  ))
                ) : paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log) => {
                    const isSuccess = log.status === 'SUCCESS';
                    return (
                      <tr key={log.id}>
                        <td
                          data-label="Usuario"
                          className="font-medium"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleCopyText(log.username, 'Usuario')}
                          title="Clic para copiar usuario"
                        >
                          <div className="flex-row items-center gap-xs">
                            {log.username}
                            <Copy size={10} style={{ color: 'var(--text-secondary)' }} />
                          </div>
                        </td>
                        <td data-label="Empresa / Ecosistema" className="text-muted">{log.company_name || '—'}</td>
                        <td
                          data-label="Dirección IP"
                          className="text-muted"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleCopyText(log.ip_address, 'IP')}
                          title="Clic para copiar IP"
                        >
                          <div className="flex-row items-center gap-xs">
                            {log.ip_address || '—'}
                            {log.ip_address && <Copy size={10} />}
                          </div>
                        </td>
                        <td
                          data-label="Navegador"
                          className="text-muted"
                          style={{ maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          title={log.user_agent}
                        >
                          {log.user_agent || '—'}
                        </td>
                        <td data-label="Fecha y Hora" className="text-muted">
                          {log.fecha ? new Date(log.fecha).toLocaleString('es-AR') : '—'}
                        </td>
                        <td data-label="Estado" style={{ textAlign: 'center' }}>
                          <span
                            className={`badge ${isSuccess ? 'badge-success' : 'badge-danger'}`}
                            style={!isSuccess ? { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' } : {}}
                          >
                            {isSuccess ? <CheckCircle2 size={12} style={{ marginRight: '4px' }} /> : <XCircle size={12} style={{ marginRight: '4px' }} />}
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state">
                        <Users size={40} />
                        <p>{logsSearchTerm || logStatusFilter !== 'ALL' || logTimeFilter !== 'ALL' ? 'No se encontraron registros con estos filtros' : 'No hay registros de auditoría'}</p>
                        <p>Los registros aparecerán cuando los usuarios inicien sesión.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <Paginator
              currentPage={logsPage}
              totalPages={totalLogsPages}
              totalItems={filteredLogs.length}
              pageSize={logsPageSize}
              onPageChange={setLogsPage}
              onPageSizeChange={setLogsPageSize}
            />
          </div>
        </>
      )}

      {/* ── Modal: Edit Company ──────────────────────────────────── */}
      {editingCompany && (
        <Modal
          title={`Editar Empresa: ${editingCompany.name}`}
          onClose={() => !updatingCompany && setEditingCompany(null)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setEditingCompany(null)} disabled={updatingCompany}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleEditCompanySubmit} disabled={updatingCompany}>
                {updatingCompany ? 'Guardando…' : 'Guardar Cambios'}
              </Button>
            </>
          )}
        >
          <form onSubmit={handleEditCompanySubmit} className="form-stack">
            <Input
              label="Nombre / Razón Social *"
              value={editFormData.name}
              onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label="Teléfono"
              value={editFormData.phone}
              onChange={(e) => setEditFormData((prev) => ({ ...prev, phone: e.target.value }))}
              icon={<Phone size={16} />}
            />
            <Input
              label="Dirección"
              value={editFormData.address}
              onChange={(e) => setEditFormData((prev) => ({ ...prev, address: e.target.value }))}
              icon={<MapPin size={16} />}
            />
          </form>
        </Modal>
      )}

      {/* ── Modal: Confirm Delete ───────────────────────────────── */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => !deletingId && (setConfirmDelete(null), setDeleteConfirmationInput(''))}>
          <div className="ui-modal" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(239,68,68,0.1)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--danger-text)',
                  }}
                >
                  <AlertTriangle size={18} />
                </div>
                <h3 style={{ margin: 0 }}>Purgar Empresa Definitivamente</h3>
              </div>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="inline-notice inline-notice-error">
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <strong>Esta acción es física e irreversible.</strong><br />
                  Se eliminarán permanentemente de la base de datos la empresa, todos sus usuarios, productos, ventas, movimientos y configuraciones.
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                Para confirmar la purga permanente de{' '}
                <strong style={{ color: 'var(--text-primary)' }}>"{confirmDelete.name}"</strong>, escribí su nombre exacto a continuación:
              </p>
              <Input
                placeholder="Ej: Nombre Empresa"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                disabled={!!deletingId}
                required
              />
            </div>

            <div className="modal-foot">
              <Button
                variant="ghost"
                onClick={() => { setConfirmDelete(null); setDeleteConfirmationInput(''); }}
                disabled={!!deletingId}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                icon={deletingId ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                onClick={handleDelete}
                disabled={!!deletingId || deleteConfirmationInput !== confirmDelete.name}
              >
                {deletingId ? 'Eliminando…' : 'Confirmar Purga Permanente'}
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
