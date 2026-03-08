import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { FileSpreadsheet, TrendingUp, DollarSign, Package, AlertTriangle, Calendar, ShoppingBag, CreditCard, HelpCircle } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const Reports = () => {
    const [months, setMonths] = useState(6);
    const [series, setSeries] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    const formatDateObj = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [startDate, setStartDate] = useState(formatDateObj(firstDay));
    const [endDate, setEndDate] = useState(formatDateObj(today));
    const [chartType, setChartType] = useState('monthly'); // 'monthly' o 'daily'

    useEffect(() => {
        fetchData();
    }, [months, startDate, endDate]);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 640px)');
        const handleChange = (event) => setIsMobile(event.matches);
        setIsMobile(media.matches);
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [seriesRes, statsRes] = await Promise.all([
                api.get(`reports/series/?months=${months}`),
                api.get(`reports/monthly-summary/?start_date=${startDate}&end_date=${endDate}`)
            ]);
            setSeries(seriesRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error("Error loading reports", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const response = await api.get(`reports/export-excel/?months=${months}&start_date=${startDate}&end_date=${endDate}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_balance360.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error downloading report", error);
        }
    };

    const formatMonthLabel = (value) => {
        if (!value) return '';
        const parts = String(value).split('-');
        if (parts.length < 2) return value;
        const year = parts[0].slice(-2);
        const month = parts[1];
        return `${month}/${year}`;
    };

    const formatDayLabel = (value) => {
        if (!value) return '';
        const parts = String(value).split('-');
        if (parts.length < 3) return value;
        const month = parts[1];
        const day = parts[2];
        return `${day}/${month}`;
    };

    const KPICard = ({ title, value, icon: Icon, tone, subvalue, tooltip }) => (
        <div className={`card reports-kpi tone-${tone}`}>
            <div className="reports-kpi-head">
                <div>
                    <p className="reports-kpi-label">
                        {title}
                        {tooltip && (
                            <button type="button" className="reports-tooltip" aria-label={tooltip}>
                                <HelpCircle size={14} />
                                <span className="reports-tooltip-bubble" role="tooltip">
                                    {tooltip}
                                </span>
                            </button>
                        )}
                    </p>
                    <h3 className="reports-kpi-value">{value}</h3>
                </div>
                <div className="reports-kpi-icon">
                    <Icon size={20} />
                </div>
            </div>
            {subvalue && <p className="reports-kpi-subvalue">{subvalue}</p>}
        </div>
    );

    return (
        <div className="reports-page page page-container">
            <div className="page-header">
                <div className="page-header-title">
                    <p className="eyebrow">Analítica</p>
                    <h2 className="page-heading">Reportes</h2>
                    <p className="page-subtitle">Métricas clave y rendimiento del negocio.</p>
                </div>
                <div className="page-header-actions">
                    <div className="reports-date-filters" style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'rgba(30, 41, 59, 0.5)', padding: '6px 12px',
                        borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-slate-400 text-sm font-medium">Desde:</span>
                        <input
                            type="date"
                            className="bg-transparent text-sm text-slate-200 outline-none w-auto font-medium"
                            style={{ colorScheme: 'dark' }}
                            value={startDate}
                            max={endDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                        <span className="text-slate-500 mx-1">|</span>
                        <span className="text-slate-400 text-sm font-medium">Hasta:</span>
                        <input
                            type="date"
                            className="bg-transparent text-sm text-slate-200 outline-none w-auto font-medium"
                            style={{ colorScheme: 'dark' }}
                            value={endDate}
                            min={startDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px' }}>
                        <FileSpreadsheet size={16} /> Exportar
                    </button>
                </div>
            </div>

            {loading && !stats ? (
                <div className="p-12 text-center text-slate-400">Cargando reportes…</div>
            ) : stats && (
                <div className="stack gap-lg page-section">
                    {/* KPIs Row */}
                    <div className="grid four-cols gap-md reports-kpi-grid">
                        <KPICard
                            title="Ventas del período"
                            value={formatCurrency(stats.total_sold)}
                            icon={DollarSign}
                            tone="primary"
                            subvalue={`${stats.sales_count} transacciones`}
                            tooltip="Importe total vendido en el período. No incluye ventas anuladas ni reembolsadas."
                        />
                        <KPICard
                            title="Margen bruto"
                            value={formatCurrency(stats.margin)}
                            icon={TrendingUp}
                            tone="success"
                            subvalue="Ganancia estimada"
                            tooltip="Ganancia estimada: ventas menos costo de los productos vendidos."
                        />
                        <KPICard
                            title="Valor de inventario"
                            value={formatCurrency(stats.stock_valorized)}
                            icon={Package}
                            tone="violet"
                            subvalue="Costo total stock"
                            tooltip="Valor del stock actual calculado al costo de compra."
                        />
                        <KPICard
                            title="Ticket promedio"
                            value={formatCurrency(stats.sales_count ? stats.total_sold / stats.sales_count : 0)}
                            icon={CreditCard}
                            tone="warning"
                            subvalue="Por venta"
                            tooltip="Promedio por venta en el período seleccionado."
                        />
                    </div>

                    {/* Stock Alert Banner */}
                    {stats.stockouts > 0 && (
                        <div className="reports-alert">
                            <AlertTriangle className="reports-alert-icon" />
                            <div>
                                <span className="font-bold">¡Atención!</span> Tienes {stats.stockouts} productos con stock agotado.
                            </div>
                        </div>
                    )}

                    {/* Charts Grid */}
                    <div className="reports-charts" style={{ gridTemplateColumns: '1fr' }}>
                        {/* Main Evolution Chart */}
                        <div className="card reports-chart-card">
                            <div className="card-header reports-card-header flex-between" style={{ paddingBottom: '20px' }}>
                                <div className="flex items-center gap-3">
                                    <TrendingUp size={20} className="text-slate-400" />
                                    <h3 className="text-lg font-bold text-slate-200">Evolución de ingresos</h3>
                                </div>
                                <div style={{ background: 'rgba(30,30,40,0.4)', borderRadius: '8px', padding: '4px', border: '1px solid rgba(255,255,255,0.05)' }} className="flex">
                                    <button
                                        type="button"
                                        style={{
                                            background: chartType === 'monthly' ? '#3B82F6' : 'transparent',
                                            color: chartType === 'monthly' ? '#FFF' : '#94A3B8',
                                            borderRadius: '4px', border: 'none', padding: '6px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onClick={() => setChartType('monthly')}
                                    >
                                        Meses
                                    </button>
                                    <button
                                        type="button"
                                        style={{
                                            background: chartType === 'daily' ? '#3B82F6' : 'transparent',
                                            color: chartType === 'daily' ? '#FFF' : '#94A3B8',
                                            borderRadius: '4px', border: 'none', padding: '6px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onClick={() => setChartType('daily')}
                                    >
                                        Días
                                    </button>
                                </div>
                            </div>
                            <div className="reports-chart-scroll">
                                <div className="reports-chart-body" style={{ height: '350px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={chartType === 'monthly' ? series : stats.sales_by_day}
                                            margin={{
                                                top: 10,
                                                right: 10,
                                                left: 0,
                                                bottom: 0
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                            <XAxis
                                                dataKey={chartType === 'monthly' ? "month" : "day"}
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                                axisLine={false}
                                                tickLine={false}
                                                interval={chartType === 'monthly' && isMobile ? 1 : 'preserveStartEnd'}
                                                tickFormatter={chartType === 'monthly' ? formatMonthLabel : formatDayLabel}
                                                dy={10}
                                            />
                                            <YAxis
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(value) => `$${value}`}
                                                width={60}
                                                dx={-10}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                                contentStyle={{ borderRadius: '12px', background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 30px rgba(0,0,0,0.5)', color: '#F8FAFC' }}
                                                formatter={(value) => [formatCurrency(value), "Ventas"]}
                                                labelFormatter={(label) => chartType === 'monthly' ? formatMonthLabel(label) : formatDayLabel(label)}
                                            />
                                            <Bar
                                                dataKey="total"
                                                fill="#6366f1"
                                                radius={[6, 6, 0, 0]}
                                                maxBarSize={60}
                                                name="Ventas"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default Reports;
