import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import { formatARS } from '../utils/format';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';

const kpis = [
  { key: 'total_sold', label: 'Ventas del mes', icon: <DollarSign size={22} />, tone: 'primary', formatter: formatARS },
  { key: 'sales_count', label: 'Transacciones', icon: <ShoppingBag size={22} />, tone: 'success' },
  { key: 'margin', label: 'Margen estimado', icon: <TrendingUp size={22} />, tone: 'warning', formatter: formatARS },
  { key: 'stockouts', label: 'Quiebres de stock', icon: <AlertTriangle size={22} />, tone: 'danger' },
];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('reports/monthly-summary/');
        setStats(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="grid-layout">
      {loading ? (
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={120} />)}
        </div>
      ) : (
        <div className="kpi-grid">
          {kpis.map((item) => (
            <Card
              key={item.key}
              className="kpi-card"
              headerSlot={<div className={`kpi-icon tone-${item.tone}`}>{item.icon}</div>}
              title={item.label}
            >
              <div className="kpi-value">
                {item.formatter ? item.formatter(stats?.[item.key]) : stats?.[item.key] || 0}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="charts-grid">
        <Card title="Ventas por día" description="Últimos 30 días">
          <div style={{ height: 320 }}>
            {loading ? <Skeleton height="100%" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.sales_by_day || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(str) => str.slice(8)}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(15,23,42,0.12)' }}
                    formatter={(value) => formatARS(value)}
                  />
                  <Bar dataKey="total" fill="var(--primary-500)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="Top productos" description="Más vendidos este periodo">
          {loading ? <Skeleton height={240} /> : (
            <div className="table-container compact">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: 'right' }}>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.top_products?.length ? stats.top_products.map((p) => (
                    <tr key={p.product__nombre}>
                      <td>{p.product__nombre}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.qty}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="2" className="text-center muted">Sin datos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
