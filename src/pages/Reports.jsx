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

    const KPICard = ({ title, value, icon: Icon, color, subvalue }) => (
        <div className="card p-4 border-l-4" style={{ borderLeftColor: color }}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 text-slate-600">
                    <Icon size={20} />
                </div>
            </div>
            {subvalue && <p className="text-xs text-slate-400 mt-1">{subvalue}</p>}
        </div>
    );

    return (
        <div className="reports-page max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Panel de Reportes</h2>
                    <p className="text-slate-500">Métricas clave y rendimiento del negocio (Mes Actual).</p>
                </div>

                <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-lg shadow-sm">
                        <Calendar size={18} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">Histórico:</span>
                        <select
                            className="bg-transparent border-none text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
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
                <div className="p-12 text-center text-slate-400">Cargando métricas...</div>
            ) : stats && (
                <div className="stack gap-lg">
                    {/* KPIs Row */}
                    <div className="grid four-cols gap-md">
                        <KPICard
                            title="Ventas del Mes"
                            value={formatCurrency(stats.total_sold)}
                            icon={DollarSign}
                            color="#3b82f6"
                            subvalue={`${stats.sales_count} transacciones`}
                        />
                        <KPICard
                            title="Margen Bruto"
                            value={formatCurrency(stats.margin)}
                            icon={TrendingUp}
                            color="#10b981"
                            subvalue="Ganancia estimada"
                        />
                        <KPICard
                            title="Valor Inventario"
                            value={formatCurrency(stats.stock_valorized)}
                            icon={Package}
                            color="#8b5cf6"
                            subvalue="Costo total stock"
                        />
                        <KPICard
                            title="Ticket Promedio"
                            value={formatCurrency(stats.sales_count ? stats.total_sold / stats.sales_count : 0)}
                            icon={CreditCard}
                            color="#f59e0b"
                            subvalue="Por venta"
                        />
                    </div>

                    {/* Stock Alert Banner */}
                    {stats.stockouts > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-4 text-red-700">
                            <AlertTriangle className="text-red-500" />
                            <div>
                                <span className="font-bold">¡Atención!</span> Tienes {stats.stockouts} productos con stock agotado.
                            </div>
                        </div>
                    )}

                    {/* Charts Grid */}
                    <div className="grid two-cols gap-lg" style={{ gridTemplateColumns: '2fr 1fr' }}>
                        {/* Main Evolution Chart */}
                        <div className="card" style={{ minHeight: '400px' }}>
                            <div className="card-header border-b border-slate-100 pb-4 mb-4">
                                <h3 className="text-lg font-bold text-slate-800">Evolución de Ingresos</h3>
                            </div>
                            <div style={{ width: '100%', height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={series} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                        <Tooltip
                                            cursor={{ fill: '#f1f5f9' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => [formatCurrency(value), "Ventas"]}
                                        />
                                        <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} name="Ventas" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Products List/Chart */}
                        <div className="card" style={{ minHeight: '400px' }}>
                            <div className="card-header border-b border-slate-100 pb-4 mb-4 flex-between">
                                <h3 className="text-lg font-bold text-slate-800">Top Productos</h3>
                                <ShoppingBag size={18} className="text-slate-400" />
                            </div>
                            <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
                                {stats.top_products?.length > 0 ? (
                                    <div className="stack gap-sm">
                                        {stats.top_products.map((p, i) => (
                                            <div key={i} className="flex-between p-2 hover:bg-slate-50 rounded transition-colors border-b border-slate-50 last:border-0">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={`w-6 h-6 rounded-full flex-center text-xs font-bold ${i < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
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
                                    <div className="text-center text-slate-400 py-8">Sin datos de productos</div>
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
