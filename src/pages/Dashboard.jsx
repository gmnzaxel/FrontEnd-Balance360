import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const Dashboard = () => {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('reports/monthly-summary/');
                setStats(response.data);
            } catch (error) {
                console.error(error);
            }
        };

        fetchStats();
    }, []);

    if (!stats) return <div className="flex-center" style={{ height: '100%' }}>Cargando estadísticas...</div>;

    const KpiCard = ({ title, value, icon, color }) => (
        <div className="card kpi-card">
            <div className="kpi-icon" style={{ background: `var(--${color}-light)`, color: `var(--${color})` }}>
                {icon}
            </div>
            <div className="kpi-content">
                <h3>{title}</h3>
                <div className="value">{value}</div>
            </div>
        </div>
    );

    return (
        <div className="dashboard">
            <div className="kpi-grid">
                <KpiCard
                    title="Ventas del Mes"
                    value={formatCurrency(stats.total_sold)}
                    icon={<DollarSign />}
                    color="primary"
                />
                <KpiCard
                    title="Transacciones"
                    value={stats.sales_count}
                    icon={<ShoppingBag />}
                    color="success"
                />
                <KpiCard
                    title="Margen Estimado"
                    value={formatCurrency(stats.margin)}
                    icon={<TrendingUp />}
                    color="warning"
                />
                <KpiCard
                    title="Quiebres de Stock"
                    value={stats.stockouts}
                    icon={<AlertTriangle />}
                    color="danger"
                />
            </div>

            <div className="charts-grid">
                <div className="card">
                    <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>Ventas por Día (Últimos 30 días)</h3>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.sales_by_day}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    tickFormatter={(str) => str.slice(8)}
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="total" fill="var(--primary-500)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>Top Productos</h3>
                    <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                        <table className="styled-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cant</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.top_products?.map((p, i) => (
                                    <tr key={i}>
                                        <td style={{ fontSize: '0.9rem' }}>{p.product__nombre}</td>
                                        <td className="font-bold">{p.qty}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
