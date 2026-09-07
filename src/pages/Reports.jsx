import React, { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../api/axios'
import { toast } from 'react-toastify'
import {
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Calendar,
  CreditCard,
  HelpCircle,
  BarChart3,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import { formatCurrency } from '../utils/format'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import useMediaQuery from '../hooks/useMediaQuery'

const formatCompactARS = (value) => {
  const num = Number(value) || 0
  if (num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)
    return `$${formatted}M`
  }
  if (num >= 1_000) {
    const formatted = (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1)
    return `$${formatted}k`
  }
  return `$${num}`
}

const Reports = () => {
  const isMobile = useMediaQuery('(max-width: 640px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')
  const [months] = useState(6)
  const [series, setSeries] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const today = useMemo(() => new Date(), [])
  const firstDay = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today])

  const formatDateObj = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [startDate, setStartDate] = useState(() => formatDateObj(firstDay))
  const [endDate, setEndDate] = useState(() => formatDateObj(today))
  const [activePreset, setActivePreset] = useState('this_month')
  const [chartType, setChartType] = useState('monthly') // 'monthly' | 'daily'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [seriesRes, statsRes] = await Promise.all([
        api.get(`reports/series/?months=${months}`),
        api.get(`reports/monthly-summary/?start_date=${startDate}&end_date=${endDate}`),
      ])
      setSeries(seriesRes.data || [])
      setStats(statsRes.data || null)
    } catch (error) {
      console.error('Error loading reports', error)
      toast.error('Error al cargar métricas de reportes')
    } finally {
      setLoading(false)
    }
  }, [months, startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleQuickPreset = (preset) => {
    const now = new Date()
    setActivePreset(preset)
    if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      setStartDate(formatDateObj(start))
      setEndDate(formatDateObj(now))
    } else if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      setStartDate(formatDateObj(start))
      setEndDate(formatDateObj(end))
    } else if (preset === 'last_30_days') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      setStartDate(formatDateObj(start))
      setEndDate(formatDateObj(now))
    } else if (preset === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1)
      setStartDate(formatDateObj(start))
      setEndDate(formatDateObj(now))
    }
  }

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    const toastId = toast.info('Generando reporte Excel...', { autoClose: false })
    try {
      const response = await api.get(
        `reports/export-excel/?months=${months}&start_date=${startDate}&end_date=${endDate}`,
        { responseType: 'blob' },
      )
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `reporte_balance360_${startDate}_${endDate}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.update(toastId, {
        render: 'Reporte descargado con éxito',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      })
    } catch (error) {
      console.error('Error downloading report', error)
      toast.update(toastId, {
        render: 'Error al generar el reporte',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      })
    } finally {
      setExporting(false)
    }
  }

  const formatMonthLabel = (value) => {
    if (!value) return ''
    const parts = String(value).split('-')
    if (parts.length < 2) return value
    const year = parts[0].slice(-2)
    const month = parts[1]
    return `${month}/${year}`
  }

  const formatDayLabel = (value) => {
    if (!value) return ''
    const parts = String(value).split('-')
    if (parts.length < 3) return value
    const month = parts[1]
    const day = parts[2]
    return `${day}/${month}`
  }

  const KPICard = ({ title, value, icon: Icon, tone, subvalue, tooltip }) => (
    <div className={`reports-kpi-card tone-${tone}`}>
      <div className="reports-kpi-header">
        <div className="reports-kpi-title-wrap">
          <span className="reports-kpi-title">{title}</span>
          {tooltip && (
            <span className="reports-tooltip-wrapper" title={tooltip}>
              <HelpCircle size={13} className="reports-tooltip-icon" />
            </span>
          )}
        </div>
        <div className={`reports-kpi-icon-pill tone-${tone}`}>
          {Icon && <Icon size={18} />}
        </div>
      </div>
      <div className="reports-kpi-body">
        <h3 className="reports-kpi-amount">{value}</h3>
        {subvalue && <span className="reports-kpi-subtext">{subvalue}</span>}
      </div>
    </div>
  )

  const chartData = useMemo(() => {
    if (chartType === 'monthly') return series || []
    return stats?.sales_by_day || []
  }, [chartType, series, stats])

  return (
    <div className="reports-page page page-container">
      {/* ── Page Header ── */}
      <div className="reports-header-row">
        <div className="reports-title-group">
          <p className="eyebrow">Analítica y Rendimiento</p>
          <h2 className="page-heading">Reportes</h2>
          <p className="page-subtitle">Métricas financieras, margen y evolución del negocio.</p>
        </div>

        <div className="reports-actions-group">
          {/* Date Picker Capsule */}
          <div className="reports-date-capsule">
            <Calendar size={16} className="reports-date-icon" />
            <div className="reports-date-item">
              <span className="reports-date-label">Desde:</span>
              <input
                type="date"
                className="reports-date-native"
                value={startDate}
                max={endDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setActivePreset(null)
                }}
              />
            </div>
            <span className="reports-date-divider" />
            <div className="reports-date-item">
              <span className="reports-date-label">Hasta:</span>
              <input
                type="date"
                className="reports-date-native"
                value={endDate}
                min={startDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setActivePreset(null)
                }}
              />
            </div>
          </div>

          {/* Export Button */}
          <button
            type="button"
            className="reports-export-btn"
            onClick={handleExport}
            disabled={exporting}
            title="Exportar reporte en formato Excel"
          >
            <FileSpreadsheet size={16} />
            <span>{exporting ? 'Generando…' : 'Exportar Excel'}</span>
          </button>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="reports-presets-bar">
        <span className="reports-presets-label">Período rápido:</span>
        <div className="reports-presets-list">
          <button
            type="button"
            className={`reports-preset-chip ${activePreset === 'this_month' ? 'active' : ''}`}
            onClick={() => handleQuickPreset('this_month')}
          >
            Este mes
          </button>
          <button
            type="button"
            className={`reports-preset-chip ${activePreset === 'last_month' ? 'active' : ''}`}
            onClick={() => handleQuickPreset('last_month')}
          >
            Mes anterior
          </button>
          <button
            type="button"
            className={`reports-preset-chip ${activePreset === 'last_30_days' ? 'active' : ''}`}
            onClick={() => handleQuickPreset('last_30_days')}
          >
            Últimos 30 días
          </button>
          <button
            type="button"
            className={`reports-preset-chip ${activePreset === 'this_year' ? 'active' : ''}`}
            onClick={() => handleQuickPreset('this_year')}
          >
            Este año
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="reports-loading-state">
          <div className="reports-loading-spinner" />
          <p>Cargando métricas y evolución de ventas…</p>
        </div>
      ) : (
        stats && (
          <div className="reports-content-stack">
            {/* ── KPIs Grid ── */}
            <div className="reports-kpi-grid">
              <KPICard
                title="Ventas del período"
                value={formatCurrency(stats.total_sold)}
                icon={DollarSign}
                tone="primary"
                subvalue={`${stats.sales_count || 0} ${stats.sales_count === 1 ? 'venta' : 'ventas'}`}
                tooltip="Importe total facturado en el rango seleccionado."
              />
              <KPICard
                title="Margen bruto"
                value={formatCurrency(stats.margin)}
                icon={TrendingUp}
                tone="success"
                subvalue="Ganancia estimada"
                tooltip="Diferencia entre precio de venta y costo de compra."
              />
              <KPICard
                title="Valor de inventario"
                value={formatCurrency(stats.stock_valorized)}
                icon={Package}
                tone="violet"
                subvalue="Costo total stock"
                tooltip="Valorización del stock actual al costo de reposición."
              />
              <KPICard
                title="Ticket promedio"
                value={formatCurrency(stats.sales_count ? stats.total_sold / stats.sales_count : 0)}
                icon={CreditCard}
                tone="warning"
                subvalue="Por transacción"
                tooltip="Promedio monetario por cada venta registrada."
              />
            </div>

            {/* ── Stock Alert Banner (if any) ── */}
            {stats.stockouts > 0 && (
              <div className="reports-stock-alert">
                <div className="reports-stock-alert-content">
                  <div className="reports-alert-icon-wrap">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <strong className="reports-alert-strong">¡Atención de inventario!</strong>
                    <span className="reports-alert-text">
                      Tenés {stats.stockouts} {stats.stockouts === 1 ? 'producto' : 'productos'} con stock agotado.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Chart Card ── */}
            <div className="reports-chart-card">
              <div className="reports-chart-header">
                <div className="reports-chart-title-wrap">
                  <div className="reports-chart-icon-wrap">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <h3 className="reports-chart-title">Evolución de ingresos</h3>
                    <p className="reports-chart-subtitle">
                      Visualizá la tendencia de ventas por {chartType === 'monthly' ? 'mes' : 'día'}
                    </p>
                  </div>
                </div>
                <div className="reports-chart-toggle">
                  <button
                    type="button"
                    className={`reports-toggle-btn ${chartType === 'monthly' ? 'active' : ''}`}
                    onClick={() => setChartType('monthly')}
                  >
                    Meses
                  </button>
                  <button
                    type="button"
                    className={`reports-toggle-btn ${chartType === 'daily' ? 'active' : ''}`}
                    onClick={() => setChartType('daily')}
                  >
                    Días
                  </button>
                </div>
              </div>

              <div className="reports-chart-wrapper">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 15,
                      right: 15,
                      left: 0,
                      bottom: 5,
                    }}
                  >
                    <defs>
                      <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.85} />
                      </linearGradient>
                      <linearGradient id="barHoverGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a5b4fc" stopOpacity={1} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.95} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="rgba(255, 255, 255, 0.07)"
                    />
                    <XAxis
                      dataKey={chartType === 'monthly' ? 'month' : 'day'}
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }}
                      axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                      tickLine={false}
                      interval={chartType === 'daily' && isMobile ? 3 : 'preserveStartEnd'}
                      tickFormatter={chartType === 'monthly' ? formatMonthLabel : formatDayLabel}
                      dy={8}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatCompactARS}
                      width={isMobile ? 52 : 68}
                      dx={-6}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                      contentStyle={{
                        borderRadius: '12px',
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
                        color: '#f8fafc',
                        padding: '10px 14px',
                      }}
                      formatter={(value) => [formatCurrency(value), 'Total Vendido']}
                      labelFormatter={(label) =>
                        chartType === 'monthly'
                          ? `Mes: ${formatMonthLabel(label)}`
                          : `Fecha: ${formatDayLabel(label)}`
                      }
                    />
                    <Bar
                      dataKey="total"
                      fill="url(#revenueBarGradient)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={52}
                      name="Ventas"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}

export default Reports
