import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { DollarSign, ShoppingBag, AlertTriangle, TrendingUp } from 'lucide-react';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('reports/monthly-summary/');
                setStats(response.data);
            } catch (error) {
                console.error("Error fetching stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div>Cargando dashboard...</div>;
    if (!stats) return <div>No hay datos disponibles.</div>;

    const formatCurrency = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

    return (
        <div className="dashboard">
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="icon-bg blue"><DollarSign size={24} /></div>
                    <div className="stat-info">
                        <h3>Ventas Mes</h3>
                        <p>{formatCurrency(stats.total_sold)}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="icon-bg green"><ShoppingBag size={24} /></div>
                    <div className="stat-info">
                        <h3>Cant. Ventas</h3>
                        <p>{stats.sales_count}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="icon-bg purple"><TrendingUp size={24} /></div>
                    <div className="stat-info">
                        <h3>Margen Est.</h3>
                        <p>{formatCurrency(stats.margin)}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="icon-bg red"><AlertTriangle size={24} /></div>
                    <div className="stat-info">
                        <h3>Quiebres Stock</h3>
                        <p>{stats.stockouts}</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections">
                <div className="section">
                    <h3>Top Productos</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Cant.</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.top_products.map((p, idx) => (
                                <tr key={idx}>
                                    <td>{p.product__nombre}</td>
                                    <td>{p.qty}</td>
                                    <td>{formatCurrency(p.revenue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="section">
                    <h3>Ventas por Vendedor</h3>
                    <ul>
                        {stats.sales_by_seller.map((s, idx) => (
                            <li key={idx} className="seller-item">
                                <span>{s.user__username}</span>
                                <span>{formatCurrency(s.total)} ({s.count})</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
