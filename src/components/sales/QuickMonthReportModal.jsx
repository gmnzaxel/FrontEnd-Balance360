import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import salesService from '../../services/salesService'
import { formatCurrency } from '../../utils/format'
import { getErrorMessage } from '../../utils/errorUtils'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Wallet,
  CreditCard,
  ShieldCheck,
  RotateCw,
  ArrowRight,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
} from 'lucide-react'

/**
 * Retorna los límites de fecha del mes calendario actual (01 al último día del mes)
 * formateados en YYYY-MM-DD y etiquetas legibles en español.
 */
export function getCurrentMonthBounds() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed (0 = Enero, 8 = Septiembre, etc.)
  const startObj = new Date(year, month, 1)
  const endObj = new Date(year, month + 1, 0) // Último día del mes actual

  const pad = (n) => String(n).padStart(2, '0')
  const startDate = `${year}-${pad(month + 1)}-01`
  const endDate = `${year}-${pad(month + 1)}-${pad(endObj.getDate())}`

  const rawMonthName = startObj.toLocaleDateString('es-AR', { month: 'long' })
  const monthName = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1)
  const monthLabel = `${monthName} ${year}`
  const rangeLabel = `01/${pad(month + 1)}/${year} al ${pad(endObj.getDate())}/${pad(month + 1)}/${year}`

  return {
    startDate,
    endDate,
    monthName,
    monthLabel,
    rangeLabel,
    currentDay: now.getDate(),
    daysInMonth: endObj.getDate(),
  }
}

export default function QuickMonthReportModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const bounds = useMemo(() => getCurrentMonthBounds(), [])

  const fetchMonthSummary = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    try {
      // Solicitamos explícitamente las métricas acotadas al mes actual
      const result = await salesService.getSummary({
        start_date: bounds.startDate,
        end_date: bounds.endDate,
      })
      setData(result)
      setLastUpdated(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch (err) {
      console.error('Error al cargar reporte rápido del mes:', err)
      setError(getErrorMessage(err) || 'No se pudo obtener el reporte del mes.')
    } finally {
      setLoading(false)
    }
  }, [isOpen, bounds.startDate, bounds.endDate])

  useEffect(() => {
    if (isOpen) {
      fetchMonthSummary()
    }
  }, [isOpen, fetchMonthSummary])

  if (!isOpen) return null

  // Calcular porcentajes de métodos de pago sobre el total ingresado en el mes
  const totalRevenue = data?.total_revenue || 0
  const methodBreakdown = [
    { key: 'TRANSFERENCIA', label: 'Transferencia / MP', val: data?.transfer_total || 0, color: '#38bdf8' },
    { key: 'EFECTIVO', label: 'Efectivo en Caja', val: data?.cash_total || 0, color: '#fbbf24' },
    { key: 'DEBITO', label: 'Tarjeta Débito', val: data?.debit_total || 0, color: '#a78bfa' },
    { key: 'CREDITO', label: 'Tarjeta Crédito', val: data?.credit_total || 0, color: '#818cf8' },
  ]

  return (
    <Modal
      size="lg"
      isOpen={isOpen}
      onClose={onClose}
      className="quick-report-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc',
              }}
            >
              <BarChart3 size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  Reporte Rápido del Mes
                </span>
                <span className="quick-report-badge-month">
                  {bounds.monthLabel}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="quick-report-refresh-btn"
            onClick={fetchMonthSummary}
            disabled={loading}
            title="Actualizar datos en tiempo real"
            aria-label="Actualizar métricas"
          >
            <RotateCw size={14} className={loading ? 'spin-animation' : ''} />
          </button>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
          <Button
            variant="ghost"
            icon={<FileText size={15} />}
            onClick={() => {
              onClose()
              navigate('/reports')
            }}
          >
            Ver reportes completos
          </Button>
          <Button variant="primary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      <div className="quick-report-container">
        {/* Banner Informativo del Período */}
        <div className="quick-report-banner">
          <div className="banner-left">
            <Calendar size={15} className="banner-icon" />
            <span>
              Período evaluado: <strong>{bounds.rangeLabel}</strong> (Día {bounds.currentDay} de {bounds.daysInMonth})
            </span>
          </div>
          {lastUpdated && (
            <div className="banner-right">
              <Clock size={12} />
              <span>Actualizado {lastUpdated}</span>
            </div>
          )}
        </div>

        {/* Estado de Error */}
        {error && (
          <div className="quick-report-error">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button type="button" onClick={fetchMonthSummary} className="retry-link">
              Reintentar
            </button>
          </div>
        )}

        {/* ─── 4 Tarjetas KPI del Mes Actual ─── */}
        <div className="sales-admin-kpi-grid quick-report-grid">
          {/* Card 1: Ingresos del Mes */}
          <div className="sales-kpi-card kpi-revenue">
            <div className="kpi-icon-wrapper kpi-icon-revenue">
              <DollarSign size={20} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Ingresos de {bounds.monthName}</span>
              <div className="kpi-value-row">
                <span className="kpi-value">
                  {loading ? '...' : formatCurrency(data?.total_revenue || 0)}
                </span>
              </div>
              <span className="kpi-subtext">
                {loading
                  ? 'Calculando...'
                  : `${data?.total_orders || 0} operaciones registradas en el mes`}
              </span>
            </div>
          </div>

          {/* Card 2: Ticket Promedio del Mes */}
          <div className="sales-kpi-card kpi-ticket">
            <div className="kpi-icon-wrapper kpi-icon-ticket">
              <TrendingUp size={20} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Ticket Promedio Mes</span>
              <div className="kpi-value-row">
                <span className="kpi-value">
                  {loading ? '...' : formatCurrency(data?.avg_ticket || 0)}
                </span>
              </div>
              <span className="kpi-subtext">
                {loading
                  ? 'Calculando...'
                  : data?.completed_count
                    ? `Sobre ${data.completed_count} ventas efectivas`
                    : 'Sin ventas efectivas este mes'}
              </span>
            </div>
          </div>

          {/* Card 3: Efectivo en Caja del Mes */}
          <div className="sales-kpi-card kpi-cash">
            <div className="kpi-icon-wrapper kpi-icon-cash">
              <Wallet size={20} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Efectivo en Caja (Mes)</span>
              <div className="kpi-value-row">
                <span className="kpi-value">
                  {loading ? '...' : formatCurrency(data?.cash_total || 0)}
                </span>
              </div>
              <span className="kpi-subtext">
                {loading
                  ? 'Calculando...'
                  : 'Total físico cobrado en el mes'}
              </span>
            </div>
          </div>

          {/* Card 4: Cobros Digitales y Fiscales del Mes */}
          <div className="sales-kpi-card kpi-digital">
            <div className="kpi-icon-wrapper kpi-icon-digital">
              <CreditCard size={20} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Digital / Bancarizado</span>
              <div className="kpi-value-row">
                <span className="kpi-value">
                  {loading ? '...' : formatCurrency(data?.digital_total || 0)}
                </span>
              </div>
              <div className="kpi-badges-row">
                <span className="kpi-mini-badge badge-fiscal" title="Facturas y comprobantes ARCA aprobados con CAE este mes">
                  <ShieldCheck size={11} /> {data?.fiscal_count || 0} Fiscales
                </span>
                <span className="kpi-mini-badge badge-internal" title="Tickets internos emitidos este mes">
                  {data?.non_fiscal_count || 0} Internos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Desglose por Método de Pago del Mes ─── */}
        <div className="quick-report-breakdown-card">
          <div className="breakdown-header">
            <span className="breakdown-title">Distribución de Ingresos por Medio de Pago ({bounds.monthName})</span>
          </div>

          <div className="breakdown-list">
            {methodBreakdown.map((m) => {
              const pct = totalRevenue > 0 ? Math.round((m.val / totalRevenue) * 100) : 0
              return (
                <div key={m.key} className="breakdown-row">
                  <div className="breakdown-info">
                    <span className="breakdown-indicator" style={{ backgroundColor: m.color }}></span>
                    <span className="breakdown-label">{m.label}</span>
                  </div>
                  <div className="breakdown-values">
                    <span className="breakdown-amount">{loading ? '...' : formatCurrency(m.val)}</span>
                    <span className="breakdown-pct">({pct}%)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── Resumen Operativo de Auditoría del Mes ─── */}
        <div className="quick-report-stats-row">
          <div className="stats-box">
            <span className="stats-num">{loading ? '...' : data?.completed_count || 0}</span>
            <span className="stats-desc">Ventas Completadas</span>
          </div>
          <div className="stats-box">
            <span className="stats-num" style={{ color: '#fbbf24' }}>
              {loading ? '...' : data?.edited_count || 0}
            </span>
            <span className="stats-desc">Ventas Editadas (Auditadas)</span>
          </div>
          <div className="stats-box">
            <span className="stats-num" style={{ color: '#ef4444' }}>
              {loading ? '...' : (data?.voided_count || 0) + (data?.refunded_count || 0)}
            </span>
            <span className="stats-desc">Anuladas / Reembolsadas</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
