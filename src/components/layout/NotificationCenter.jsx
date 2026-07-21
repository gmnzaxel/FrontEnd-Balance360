import React, { useEffect, useState, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, ShieldAlert, RefreshCw, ArrowRight, Package } from 'lucide-react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const NotificationCenter = () => {
  const { user, isAdminActual } = useContext(AuthContext);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' o 'security'
  const [loading, setLoading] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const popoverRef = useRef(null);

  // Administradores y Superusuarios pueden ver el centro de notificaciones
  const isAllowedToSeeAlerts = user?.is_superuser || isAdminActual || user?.role === 'ADMIN';

  const fetchAlerts = async () => {
    if (!isAllowedToSeeAlerts) return;
    setLoading(true);
    try {
      // 1. Fetch low stock products (strictly less than stock_minimo)
      const prodRes = await api.get('inventory/products/?include_archived=false');
      const allProds = prodRes.data?.results || prodRes.data || [];
      const lowStock = allProds.filter((p) => Number(p.stock_actual) < Number(p.stock_minimo));
      setLowStockProducts(lowStock);

      // 2. Fetch security alerts ONLY for SuperUsers
      const secAlerts = [];
      if (user?.is_superuser) {
        try {
          const logsRes = await api.get('users/login-logs/');
          const logs = logsRes.data || [];
          const failedLogs = logs.filter((l) => l.status !== 'SUCCESS').slice(0, 5);
          failedLogs.forEach((l) => {
            secAlerts.push({
              id: `log-${l.id}`,
              type: 'failed_login',
              title: `Intento de login fallido: ${l.username}`,
              detail: `IP: ${l.ip_address || '—'} - ${new Date(l.fecha).toLocaleString('es-AR')}`,
              time: new Date(l.fecha),
            });
          });
        } catch (_e) {}

        try {
          const salesRes = await api.get('sales/sales/');
          const sales = salesRes.data?.results || salesRes.data || [];
          const voidedOrRefunded = sales.filter((s) => s.is_voided || s.is_refunded).slice(0, 5);
          voidedOrRefunded.forEach((s) => {
            secAlerts.push({
              id: `sale-${s.id}`,
              type: 'sale_action',
              title: s.is_voided ? `Venta #${s.id} Anulada` : `Venta #${s.id} Reembolsada`,
              detail: `Monto: $${Number(s.total).toLocaleString('es-AR')} - ${s.reason || 'Sin motivo'}`,
              time: new Date(s.created_at || s.fecha),
            });
          });
        } catch (_e) {}

        secAlerts.sort((a, b) => b.time - a.time);
      }
      setSecurityAlerts(secAlerts);
    } catch (error) {
      console.error('Error al cargar centro de notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAllowedToSeeAlerts) return null;

  const totalBadges = lowStockProducts.length + (user?.is_superuser ? securityAlerts.length : 0);

  return (
    <div style={{ position: 'relative' }} ref={popoverRef}>
      <button
        className="btn-icon"
        onClick={() => { setOpen((prev) => !prev); if (!open) fetchAlerts(); }}
        title="Centro de Notificaciones y Alertas"
        style={{
          position: 'relative',
          padding: '8px',
          borderRadius: '10px',
          background: 'var(--surface-1)',
          border: '1px solid var(--border-color)',
          color: totalBadges > 0 ? 'var(--warning-text)' : 'var(--text-secondary)',
          cursor: 'pointer',
        }}
      >
        <Bell size={18} />
        {totalBadges > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: '700',
              borderRadius: '999px',
              padding: '2px 6px',
              minWidth: '18px',
              textAlign: 'center',
              boxShadow: '0 0 0 2px var(--surface-1)',
              animation: 'pulse 2s infinite',
            }}
          >
            {totalBadges}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: '0',
            width: '360px',
            maxWidth: '92vw',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} style={{ color: 'var(--primary-300)' }} />
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Notificaciones & Alertas</strong>
            </div>
            <button
              onClick={() => fetchAlerts()}
              title="Actualizar notificaciones"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>

          {/* Sub-tabs only for SuperUser */}
          {user?.is_superuser && (
            <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.2)', borderBottom: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setActiveTab('stock')}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  border: 'none',
                  background: 'none',
                  color: activeTab === 'stock' ? 'var(--warning-text)' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'stock' ? '2px solid var(--warning-text)' : 'none',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === 'stock' ? '600' : '400',
                  cursor: 'pointer',
                }}
              >
                ⚠️ Bajo Stock ({lowStockProducts.length})
              </button>
              <button
                onClick={() => setActiveTab('security')}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  border: 'none',
                  background: 'none',
                  color: activeTab === 'security' ? '#f87171' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'security' ? '2px solid #f87171' : 'none',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === 'security' ? '600' : '400',
                  cursor: 'pointer',
                }}
              >
                🛡️ Alertas de Seguridad ({securityAlerts.length})
              </button>
            </div>
          )}

          {/* Tab Contents */}
          <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '12px' }}>
            {(!user?.is_superuser || activeTab === 'stock') && (
              lowStockProducts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {lowStockProducts.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{p.nombre}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--warning-text)' }}>
                          Stock actual: <strong>{p.stock_actual}</strong> (Mínimo: {p.stock_minimo})
                        </div>
                      </div>
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Bajo Stock</span>
                    </div>
                  ))}
                  <button
                    onClick={() => { setOpen(false); navigate('/products'); }}
                    style={{
                      marginTop: '4px',
                      padding: '8px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--primary-300)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    Ver todo en Inventario <ArrowRight size={12} />
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <Package size={28} style={{ opacity: 0.5, marginBottom: '6px' }} />
                  <p style={{ margin: 0 }}>No hay productos bajo stock mínimo.</p>
                </div>
              )
            )}

            {user?.is_superuser && activeTab === 'security' && (
              securityAlerts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {securityAlerts.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontWeight: '600', fontSize: '0.82rem' }}>
                        <ShieldAlert size={14} />
                        {s.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {s.detail}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <ShieldAlert size={28} style={{ opacity: 0.5, marginBottom: '6px' }} />
                  <p style={{ margin: 0 }}>No hay alertas de seguridad registradas.</p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
