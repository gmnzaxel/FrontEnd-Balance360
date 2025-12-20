import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { FileSpreadsheet, TrendingUp, DollarSign, Package, AlertTriangle, Calendar, ShoppingBag, CreditCard } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const Reports = () => {
    const [months, setMonths] = useState(6);
    const [series, setSeries] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [months]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [seriesRes, statsRes] = await Promise.all([
                api.get(`reports/series/?months=${months}`),
                api.get('reports/monthly-summary/')
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
            const response = await api.get(`reports/export-excel/?months=${months}`, { responseType: 'blob' });
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

    const KPICard = ({ title, value, icon: Icon, tone, subvalue }) => (
        <div className={`card reports-kpi tone-${tone}`}>
            <div className="reports-kpi-head">
                <div>
                    <p className="reports-kpi-label">{title}</p>
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
                <div className="page-header-actions reports-actions">
                    <div className="reports-period">
                        <Calendar size={18} className="text-slate-400" />
                        <span className="reports-period-label">Histórico:</span>
                        <select
                            className="reports-period-select"
                            value={months}
                            onChange={e => setMonths(e.target.value)}
                        >
                            <option value="3">3 Meses</option>
                            <option value="6">6 Meses</option>
                            <option value="12">1 Año</option>
                        </select>
                    </div>
                    <button className="btn btn-primary flex items-center gap-2" onClick={handleExport}>
                        <FileSpreadsheet size={18} /> Exportar Excel
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
                            title="Ventas del mes"
                            value={formatCurrency(stats.total_sold)}
                            icon={DollarSign}
                            tone="primary"
                            subvalue={`${stats.sales_count} transacciones`}
                        />
                        <KPICard
                            title="Margen bruto"
                            value={formatCurrency(stats.margin)}
                            icon={TrendingUp}
                            tone="success"
                            subvalue="Ganancia estimada"
                        />
                        <KPICard
                            title="Valor de inventario"
                            value={formatCurrency(stats.stock_valorized)}
                            icon={Package}
                            tone="violet"
                            subvalue="Costo total stock"
                        />
                        <KPICard
                            title="Ticket promedio"
                            value={formatCurrency(stats.sales_count ? stats.total_sold / stats.sales_count : 0)}
                            icon={CreditCard}
                            tone="warning"
                            subvalue="Por venta"
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
                    <div className="reports-charts">
                        {/* Main Evolution Chart */}
                        <div className="card reports-chart-card">
                            <div className="card-header reports-card-header">
                                <h3 className="text-lg font-bold text-slate-800">Evolución de ingresos</h3>
                            </div>
                            <div className="reports-chart-body">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={series} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                        <Tooltip
                                            cursor={{ fill: '#f1f5f9' }}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 12px 30px rgba(15,23,42,0.12)', backdropFilter: 'blur(8px)' }}
                                            formatter={(value) => [formatCurrency(value), "Ventas"]}
                                        />
                                        <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={36} name="Ventas" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Products List/Chart */}
                        <div className="card reports-top-card">
                            <div className="card-header reports-card-header flex-between">
                                <h3 className="text-lg font-bold text-slate-800">Top productos</h3>
                                <ShoppingBag size={18} className="text-slate-400" />
                            </div>
                            <div className="reports-top-list">
                                {stats.top_products?.length > 0 ? (
                                    <div className="stack gap-sm">
                                        {stats.top_products.map((p, i) => (
                                            <div key={i} className="reports-top-item">
                                                <div className="reports-top-meta">
                                                    <div className={`reports-rank ${i < 3 ? 'top' : 'base'}`}>
                                                        {i + 1}
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700 truncate" title={p.product__nombre}>
                                                        {p.product__nombre}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-sm font-bold text-slate-900">{p.qty} un.</span>
                                                    <span className="block text-xs text-slate-500">{formatCurrency(p.revenue)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 py-8">Todavía no hay datos de productos.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default Reports;
