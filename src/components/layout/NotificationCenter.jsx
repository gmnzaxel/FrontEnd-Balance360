import React, { useEffect, useState, useRef, useContext, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, ShieldAlert, RefreshCw, ArrowRight, Package } from 'lucide-react'
import api from '../../api/axios'
import { AuthContext } from '../../context/AuthContext'

const NotificationCenter = () => {
  const { user, isAdminActual } = useContext(AuthContext)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('stock') // 'stock' o 'security'
  const [loading, setLoading] = useState(false)
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [securityAlerts, setSecurityAlerts] = useState([])
  const popoverRef = useRef(null)

  // Administradores y Superusuarios pueden ver el centro de notificaciones
  const isAllowedToSeeAlerts = user?.is_superuser || isAdminActual || user?.role === 'ADMIN'

  const fetchAlerts = useCallback(async () => {
    if (!isAllowedToSeeAlerts) return
    setLoading(true)
    try {
      // 1. Fetch low stock products from dedicated unpaginated endpoint
      const prodRes = await api.get('inventory/low-stock/')
      const lowStock = prodRes.data?.results || prodRes.data || []
      setLowStockProducts(lowStock)

      // 2. Fetch security alerts ONLY for SuperUsers
      const secAlerts = []
      if (user?.is_superuser) {
        try {
          const logsRes = await api.get('users/login-logs/')
          const logs = logsRes.data || []
          const failedLogs = logs.filter((l) => l.status !== 'SUCCESS').slice(0, 5)
          failedLogs.forEach((l) => {
            secAlerts.push({
              id: `log-${l.id}`,
              type: 'failed_login',
              title: `Intento de login fallido: ${l.username}`,
              detail: `IP: ${l.ip_address || '—'} - ${new Date(l.fecha).toLocaleString('es-AR')}`,
              time: new Date(l.fecha),
            })
          })
        } catch {
          // No alertar si el usuario no tiene permisos de auditoría
        }

        try {
          const salesRes = await api.get('sales/sales/')
          const sales = salesRes.data?.results || salesRes.data || []
          const voidedOrRefunded = sales.filter((s) => s.is_voided || s.is_refunded).slice(0, 5)
          voidedOrRefunded.forEach((s) => {
            const saleDate = s.date ? new Date(s.date) : new Date()
            const reasonText = s.void_reason || s.refund_reason || 'Sin motivo especificado'
            secAlerts.push({
              id: `sale-${s.id}`,
              type: 'sale_action',
              title: s.is_voided ? `Venta #${s.sale_number || s.id} Anulada` : `Venta #${s.sale_number || s.id} Reembolsada`,
              detail: `Monto: $${Number(s.total).toLocaleString('es-AR')} - ${reasonText}`,
              time: saleDate,
            })
          })
        } catch {
          // No alertar si la carga de ventas falla
        }

        secAlerts.sort((a, b) => b.time - a.time)
      }
      setSecurityAlerts(secAlerts)
    } catch (error) {
      console.error('Error al cargar centro de notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }, [isAllowedToSeeAlerts, user?.is_superuser])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!isAllowedToSeeAlerts) return null

  const totalBadges = lowStockProducts.length + (user?.is_superuser ? securityAlerts.length : 0)

  return (
    <div style={{ position: 'relative' }} ref={popoverRef}>
      <button
        className={`notification-bell-btn ${totalBadges > 0 ? 'has-alerts' : ''}`}
        onClick={() => {
          setOpen((prev) => !prev)
          if (!open) fetchAlerts()
        }}
        title="Centro de Notificaciones y Alertas"
        aria-label="Centro de Notificaciones"
      >
        <Bell size={18} />
        {totalBadges > 0 && (
          <span className="notification-badge">
            {totalBadges > 99 ? '99+' : totalBadges}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop on mobile touch screens for outside tap */}
          <div className="notification-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />

          <div className="notification-dropdown">
            {/* Header */}
            <div className="notification-header">
              <div className="notification-header-title">
                <Bell size={16} style={{ color: 'var(--primary-300)', flexShrink: 0 }} />
                <span>Notificaciones & Alertas</span>
              </div>
              <button
                onClick={() => fetchAlerts()}
                title="Actualizar notificaciones"
                className="notification-refresh-btn"
                aria-label="Actualizar notificaciones"
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
              </button>
            </div>

            {/* Sub-tabs only for SuperUser */}
            {user?.is_superuser && (
              <div className="notification-tabs">
                <button
                  onClick={() => setActiveTab('stock')}
                  className={`notification-tab-btn stock ${activeTab === 'stock' ? 'active' : ''}`}
                >
                  <span className="tab-label-full">⚠️ Bajo Stock ({lowStockProducts.length})</span>
                  <span className="tab-label-short">⚠️ Stock ({lowStockProducts.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`notification-tab-btn security ${activeTab === 'security' ? 'active' : ''}`}
                >
                  <span className="tab-label-full">🛡️ Alertas de Seguridad ({securityAlerts.length})</span>
                  <span className="tab-label-short">🛡️ Alertas ({securityAlerts.length})</span>
                </button>
              </div>
            )}

            {/* Tab Contents */}
            <div className="notification-body">
              {(!user?.is_superuser || activeTab === 'stock') &&
                (lowStockProducts.length > 0 ? (
                  <>
                    {lowStockProducts.map((p) => (
                      <div key={p.id} className="notification-card">
                        <div className="notification-card-info">
                          <div className="notification-card-title" title={p.nombre}>
                            {p.nombre}
                          </div>
                          <div className="notification-card-subtitle">
                            Stock: <strong>{p.stock_actual}</strong> <span style={{ opacity: 0.8 }}>(Mín: {p.stock_minimo})</span>
                          </div>
                        </div>
                        <span className="badge badge-warning notification-card-badge">
                          Bajo Stock
                        </span>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setOpen(false)
                        navigate('/products')
                      }}
                      className="notification-footer-btn"
                    >
                      Ver todo en Inventario <ArrowRight size={13} />
                    </button>
                  </>
                ) : (
                  <div className="notification-empty">
                    <Package size={28} />
                    <p>No hay productos bajo stock mínimo.</p>
                  </div>
                ))}

              {user?.is_superuser &&
                activeTab === 'security' &&
                (securityAlerts.length > 0 ? (
                  <>
                    {securityAlerts.map((s) => (
                      <div key={s.id} className="notification-card danger">
                        <div className="notification-card-info">
                          <div className="notification-card-title danger" title={s.title}>
                            <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                            <span>{s.title}</span>
                          </div>
                          <div className="notification-card-subtitle muted" title={s.detail}>
                            {s.detail}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="notification-empty">
                    <ShieldAlert size={28} />
                    <p>No hay alertas de seguridad registradas.</p>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationCenter
