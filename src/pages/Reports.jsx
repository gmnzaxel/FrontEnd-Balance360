import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Download, BarChart2, Calendar, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const Reports = () => {
    const [months, setMonths] = useState(6);
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchSeries = async () => {
        setLoading(true);
        try {
            const response = await api.get(`reports/series/?months=${months}`);
            // Ensure data structure matches Recharts expectation
            setSeries(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSeries();
    }, [months]);

    const handleExport = async () => {
        try {
            const response = await api.get(`reports/export-excel/?months=${months}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_balance360_${months}meses.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error downloading report", error);
        }
    };

    return (
        <div className="reports-page max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Reportes Financieros</h2>
                    <p className="text-sm text-slate-500">Análisis de evolución de ventas y exportación de datos.</p>
                </div>

                <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-lg shadow-sm">
                        <Calendar size={18} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">Periodo:</span>
                        <select
                            className="bg-transparent border-none text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
                            value={months}
                            onChange={e => setMonths(e.target.value)}
                        >
                            <option value="3">Últimos 3 Meses</option>
                            <option value="6">Últimos 6 Meses</option>
                            <option value="12">Último Año</option>
                        </select>
                    </div>
                    <button className="btn btn-primary flex items-center gap-2" onClick={handleExport}>
                        <FileSpreadsheet size={18} /> Exportar Excel
                    </button>
                </div>
            </div>

            <div className="card h-96">
                <div className="card-header border-b border-gray-100 pb-4 mb-4 flex-between">
                    <div className="flex items-center gap-2">
                        <BarChart2 size={20} className="text-primary-600" />
                        <h3 className="text-lg font-semibold text-slate-800 m-0">Evolución de Ingresos</h3>
                    </div>
                </div>

                <div style={{ width: '100%', height: '300px' }}>
                    {loading ? (
                        <div className="h-full w-full flex-center text-muted">Cargando datos...</div>
                    ) : series.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={series} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => [formatCurrency(value), "Total Ventas"]}
                                />
                                <Bar
                                    dataKey="total"
                                    fill="var(--primary-600)"
                                    radius={[4, 4, 0, 0]}
                                    barSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full w-full flex-center text-muted flex-col gap-2">
                            <BarChart2 size={32} className="text-slate-300" />
                            <p>No hay datos disponibles para el periodo seleccionado</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reports;
