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
  ShieldCheck,
  FileDown,
  ExternalLink,
} from 'lucide-react'
import { formatCurrency } from '../utils/format'
import { arcaService } from '../services/arcaService'
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
  const [activeTab, setActiveTab] = useState('analytics') // 'analytics' | 'libro_iva'
  const [months] = useState(6)
  const [series, setSeries] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Estado para Libro IVA Ventas Digital
  const [libroIvaData, setLibroIvaData] = useState(null)
  const [loadingLibroIva, setLoadingLibroIva] = useState(false)
  const [exportingLibroExcel, setExportingLibroExcel] = useState(false)
  const [exportingLibroTxt, setExportingLibroTxt] = useState(false)

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

  const fetchLibroIva = useCallback(async () => {
    setLoadingLibroIva(true)
    try {
      const res = await api.get(
        `reports/libro-iva-ventas/?start_date=${startDate}&end_date=${endDate}`,
      )
      setLibroIvaData(res.data)
    } catch (err) {
      console.error('Error fetching Libro IVA', err)
      toast.error('Error al cargar datos del Libro IVA Ventas')
    } finally {
      setLoadingLibroIva(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    if (activeTab === 'libro_iva') {
      fetchLibroIva()
    }
  }, [activeTab, fetchLibroIva])

  const handleExportLibroIvaExcel = async () => {
    if (exportingLibroExcel) return
    setExportingLibroExcel(true)
    const toastId = toast.info('Generando Excel Libro IVA Ventas...', { autoClose: false })
    try {
      const response = await api.get(
        `reports/export-libro-iva-excel/?start_date=${startDate}&end_date=${endDate}`,
        { responseType: 'blob' },
      )
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Libro_IVA_Ventas_${startDate}_${endDate}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.update(toastId, {
        render: 'Excel del Libro IVA descargado con éxito',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      })
    } catch (error) {
      console.error('Error downloading Libro IVA Excel', error)
      toast.update(toastId, {
        render: 'Error al exportar Excel de Libro IVA',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      })
    } finally {
      setExportingLibroExcel(false)
    }
  }

  const handleExportLibroIvaTxt = async () => {
    if (exportingLibroTxt) return
    setExportingLibroTxt(true)
    const toastId = toast.info('Generando archivos TXT para ARCA...', { autoClose: false })
    try {
      const response = await api.get(
        `reports/export-libro-iva-txt/?start_date=${startDate}&end_date=${endDate}`,
        { responseType: 'blob' },
      )
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Libro_IVA_Digital_ARCA_${startDate}_${endDate}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.update(toastId, {
        render: 'Archivos TXT para Portal IVA Digital generados con éxito',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      })
    } catch (error) {
      console.error('Error downloading Libro IVA TXT', error)
      toast.update(toastId, {
        render: 'Error al exportar TXT de ARCA',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      })
    } finally {
      setExportingLibroTxt(false)
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
    if (chartType === 'monthly') return [...(series || [])].reverse()
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

          {/* Action Buttons based on Tab */}
          {activeTab === 'analytics' ? (
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
          ) : (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="reports-export-btn"
                onClick={handleExportLibroIvaExcel}
                disabled={exportingLibroExcel}
                title="Descargar planilla Excel formateada para el contador"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#059669' }}
              >
                <FileSpreadsheet size={16} />
                <span>{exportingLibroExcel ? 'Generando…' : 'Excel Contador'}</span>
              </button>
              <button
                type="button"
                className="reports-export-btn"
                onClick={handleExportLibroIvaTxt}
                disabled={exportingLibroTxt}
                title="Descargar archivos TXT reglamentarios para Portal IVA Digital de ARCA"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', borderColor: '#6366f1' }}
              >
                <FileDown size={16} />
                <span>{exportingLibroTxt ? 'Generando…' : 'TXT ARCA'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selector de Pestañas: Analítica vs Libro IVA Ventas */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', marginBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`ui-btn ${activeTab === 'analytics' ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
          style={{ height: '34px', fontSize: '0.82rem', gap: '6px' }}
        >
          <BarChart3 size={15} /> Analítica y Métricas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('libro_iva')}
          className={`ui-btn ${activeTab === 'libro_iva' ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
          style={{ height: '34px', fontSize: '0.82rem', gap: '6px' }}
        >
          <ShieldCheck size={15} /> Libro IVA Ventas Digital (ARCA)
        </button>
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

      {activeTab === 'analytics' ? (
        loading && !stats ? (
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
                        <stop offset="0%" stopColor="#7c86eb" stopOpacity={1} />
                        <stop offset="100%" stopColor="#4d56be" stopOpacity={0.85} />
                      </linearGradient>
                      <linearGradient id="barHoverGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9ea6f1" stopOpacity={1} />
                        <stop offset="100%" stopColor="#5e6ad2" stopOpacity={0.95} />
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
                      cursor={{ fill: 'rgba(94, 106, 210, 0.1)' }}
                      contentStyle={{
                        borderRadius: '12px',
                        background: 'var(--surface-elevated, #1d1e24)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
                        color: 'var(--text-primary)',
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
      )
    ) : (
        /* ── Sección Libro IVA Ventas Digital (ARCA) ── */
        <div className="reports-content-stack">
          {/* KPIs del Libro Fiscal */}
          <div className="reports-kpi-grid">
            <KPICard
              title="Total Facturado Fiscal"
              value={formatCurrency(libroIvaData?.summary?.total_facturado || 0)}
              icon={DollarSign}
              tone="primary"
              subvalue={`${libroIvaData?.summary?.count || 0} comprobantes`}
              tooltip="Monto total emitido con CAE oficial (descontando Notas de Crédito)."
            />
            <KPICard
              title="Neto Gravado"
              value={formatCurrency(libroIvaData?.summary?.total_neto || 0)}
              icon={TrendingUp}
              tone="success"
              subvalue="Base imponible"
              tooltip="Total de ventas gravadas sin computar IVA."
            />
            <KPICard
              title="IVA Débito Fiscal"
              value={formatCurrency(libroIvaData?.summary?.total_iva || 0)}
              icon={CreditCard}
              tone="warning"
              subvalue="Impuesto liquidado"
              tooltip="Monto total de IVA facturado en comprobantes A y B."
            />
            <KPICard
              title="Comprobantes Emitidos"
              value={libroIvaData?.summary?.count || 0}
              icon={ShieldCheck}
              tone="violet"
              subvalue="Facturas y NC"
              tooltip="Cantidad de comprobantes oficiales con CAE dentro del período."
            />
          </div>

          {/* Tabla de Registros del Libro IVA */}
          <div className="reports-chart-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 className="reports-chart-title" style={{ fontSize: '0.98rem' }}>Comprobantes Oficiales Registrados</h3>
                <p className="reports-chart-subtitle">
                  Período: {libroIvaData?.period?.start_date || startDate} al {libroIvaData?.period?.end_date || endDate}
                </p>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                {libroIvaData?.records?.length || 0} registros
              </span>
            </div>

            {loadingLibroIva ? (
              <div className="reports-loading-state" style={{ minHeight: '180px' }}>
                <div className="reports-loading-spinner" />
                <p>Cargando libro fiscal desde ARCA…</p>
              </div>
            ) : (!libroIvaData?.records || libroIvaData.records.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
                <ShieldCheck size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
                <p style={{ fontWeight: 600, margin: '0 0 4px 0' }}>No hay comprobantes fiscales en este período</p>
                <span style={{ fontSize: '0.8rem' }}>Las ventas con facturación ARCA activada aparecerán detalladas aquí con su CAE.</span>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 10px' }}>Fecha</th>
                      <th style={{ padding: '8px 10px' }}>Comprobante</th>
                      <th style={{ padding: '8px 10px' }}>Número</th>
                      <th style={{ padding: '8px 10px' }}>Documento</th>
                      <th style={{ padding: '8px 10px' }}>Cliente / Razón Social</th>
                      <th style={{ padding: '8px 10px' }}>Condición IVA</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Neto</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>IVA</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total</th>
                      <th style={{ padding: '8px 10px' }}>CAE</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {libroIvaData.records.map((rec) => {
                      const isNc = [2, 3, 7, 8, 12, 13].includes(rec.voucher_type)
                      return (
                        <tr key={rec.id}>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{rec.date}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span className={`badge ${isNc ? 'badge-danger' : 'badge-primary'}`}>
                              {rec.voucher_name}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{rec.formatted_number}</td>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                            {rec.doc_number ? `${rec.doc_type_label}: ${rec.doc_number}` : 'Cons. Final'}
                          </td>
                          <td style={{ padding: '8px 10px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rec.customer_name}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                              {rec.iva_condition_label}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500 }}>
                            {formatCurrency(rec.neto)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500 }}>
                            {formatCurrency(rec.iva)}
                          </td>
                          <td
                            style={{
                              padding: '8px 10px',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: isNc ? '#ef4444' : 'var(--text-primary)',
                            }}
                          >
                            {formatCurrency(rec.total)}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {rec.cae || '-'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              className="ui-btn ui-btn-ghost"
                              style={{ padding: '3px 7px', height: '26px' }}
                              onClick={() =>
                                arcaService.downloadInvoicePdf(
                                  rec.sale_id,
                                  `${rec.voucher_letter}_${rec.formatted_number}.pdf`,
                                )
                              }
                              title="Descargar comprobante oficial"
                            >
                              <FileDown size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports
