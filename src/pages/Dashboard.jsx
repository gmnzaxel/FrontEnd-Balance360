import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, AlertTriangle, PackageOpen, FileDown, Filter } from 'lucide-react';
import api from '../api/axios';
import { formatARS } from '../utils/format';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';

// --- MOCK DATA GENERATOR ---
const generateMockData = () => {
  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // Generamos curvas "orgánicas" con algo de aleatoriedad
    const base = 50000 + Math.random() * 50000;
    const peak = Math.sin(i / 5) * 40000; // Onda sinusoidal
    const total = Math.max(10000, base + peak);

    days.push({
      day: d.toISOString().split('T')[0],
      total: Math.round(total),
      count: Math.round(total / 8500), // Ticket promedio aprox
    });
  }
  return days;
};

const MOCK_STATS = {
  total_sold: 2854300,
  sales_count: 342,
  margin: 856200,
  stockouts: 2,
  sales_by_day: generateMockData(),
  top_products: [], // Dejar vacío para probar el Empty State, o llenar si se prefiere
};

// Imports moved to top
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        padding: '12px',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
          {label}
        </p>
        <p style={{ margin: '4px 0 0', fontWeight: 700, color: '#4f46e5', fontSize: '1rem' }}>
          {formatARS(payload[0].value)}
        </p>
        {payload[1] && (
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#10b981', fontWeight: 500 }}>
            {payload[1].value} transacciones
          </p>
        )}
      </div>
    );
  }
  return null;
};



const kpis = [
  { key: 'total_sold', label: 'Ventas del mes', icon: <DollarSign size={22} />, tone: 'primary', formatter: formatARS },
  { key: 'sales_count', label: 'Transacciones', icon: <ShoppingBag size={22} />, tone: 'success' },
  { key: 'margin', label: 'Margen estimado', icon: <TrendingUp size={22} />, tone: 'warning', formatter: formatARS },
  { key: 'stockouts', label: 'Bajo Stock', icon: <AlertTriangle size={22} />, tone: 'danger' }, // Changed label
];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // State for Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('reports/monthly-summary/');
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Use the full supplier list provided by backend, or fallback to extracting from low_stock if not available
  const uniqueSuppliers = stats?.all_suppliers || Array.from(new Set(stats?.low_stock_products?.map(p => p.supplier_name).filter(Boolean) || []));

  const filteredStock = selectedSupplier
    ? stats?.low_stock_products?.filter(p => p.supplier_name === selectedSupplier)
    : stats?.low_stock_products || [];

  const handleDownloadSupplierExcel = () => {
    if (!selectedSupplier) return;
    // Trigger backend download
    window.open(`${api.defaults.baseURL}reports/export-supplier-order/?supplier=${encodeURIComponent(selectedSupplier)}`, '_blank');
  };

  return (
    <div className="grid-layout">
      {/* ... existing KPI grid ... */}
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

      {/* ... Low Stock Table Card (Moved to bottom) ... */}


      <div className="charts-grid">
        {/* ... AreaChart Card ... */}
        <Card title="Evolución de Ventas" description="Tendencia de los últimos 30 días">
          <div style={{ height: 320, marginTop: 10 }}>
            {loading ? <Skeleton height="100%" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.sales_by_day || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(203, 213, 225, 0.5)" />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(str) => str.slice(8)}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `$${val / 1000}k`}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Top Products Card (Restored to original position) */}
        <Card title="Top Productos" description="Rendimiento por volumen">
          {loading ? <Skeleton height={240} /> : (
            <div className="table-container compact" style={{ border: 'none', boxShadow: 'none' }}>
              {!stats?.top_products?.length ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <div style={{
                    width: 48, height: 48,
                    borderRadius: '50%', background: 'var(--slate-100)',
                    color: 'var(--slate-400)', display: 'grid', placeItems: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <PackageOpen size={24} />
                  </div>
                  <p style={{ fontWeight: 600, color: 'var(--slate-700)', margin: 0 }}>Sin movimientos</p>
                  <p className="text-sm text-muted">No hay ventas registradas aún</p>
                </div>
              ) : (
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th style={{ background: 'transparent' }}>Producto</th>
                      <th style={{ textAlign: 'right', background: 'transparent' }}>Cant.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_products.map((p, idx) => (
                      <tr key={idx} style={{ background: 'transparent' }}>
                        <td style={{ borderBottomColor: 'rgba(226, 232, 240, 0.6)' }}>
                          <span style={{ fontWeight: 500 }}>{p.product__nombre}</span>
                        </td>
                        <td style={{ textAlign: 'right', borderBottomColor: 'rgba(226, 232, 240, 0.6)' }}>
                          <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                            {p.qty}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Low Stock Table Card (New Section Below) */}
      <div className="mt-6">
        <Card title="Alertas de Stock" description="Productos por debajo del mínimo">
          <div className="flex justify-end mb-4">
            <Button variant="secondary" size="sm" icon={<Filter size={16} />} onClick={() => setShowSupplierModal(true)}>
              Filtrar por Proveedor
            </Button>
          </div>
          {loading ? <Skeleton height={200} /> : (
            <div className="table-container compact" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {!stats?.low_stock_products?.length ? (
                <div className="empty-state py-8">
                  <p>Todo en orden. No hay productos con stock bajo.</p>
                </div>
              ) : (
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Proveedor</th>
                      <th className="text-center">Min</th>
                      <th className="text-center">Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.low_stock_products.map((p) => (
                      <tr key={p.id}>
                        <td className="font-medium text-slate-700">{p.nombre}</td>
                        <td className="text-sm text-slate-500">{p.supplier_name || '-'}</td>
                        <td className="text-center">
                          <span className="badge badge-neutral">{p.stock_minimo}</span>
                        </td>
                        <td className="text-center">
                          <span className="badge badge-danger">{p.stock_actual}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Supplier Filter Modal */}
      {
        showSupplierModal && (
          <Modal title="Generar Pedido a Proveedor" onClose={() => setShowSupplierModal(false)} size="lg">
            <div className="flex flex-col gap-4">
              <div className="flex items-end gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1">
                  <Select
                    label="Seleccionar Proveedor"
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                  >
                    <option value="">-- Todos los Proveedores --</option>
                    {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
                <div className="mb-1">
                  <Button
                    variant="primary"
                    icon={<FileDown size={18} />}
                    disabled={!selectedSupplier}
                    onClick={handleDownloadSupplierExcel}
                  >
                    Descargar Orden (Excel)
                  </Button>
                </div>
              </div>

              <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Producto</th>
                      <th className="text-center">Stock Mínimo</th>
                      <th className="text-center">Stock Actual</th>
                      <th className="text-center">A Reponer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-8 text-slate-500">No hay productos que coincidan.</td></tr>
                    ) : (
                      filteredStock.map(p => {
                        const deficit = Math.max(0, p.stock_minimo - p.stock_actual);
                        const suggestedOrder = deficit + Math.ceil(p.stock_minimo * 0.2); // Suggest +20% buffer
                        return (
                          <tr key={p.id}>
                            <td className="text-xs font-mono text-slate-500">{p.codigo}</td>
                            <td className="font-medium">{p.nombre}</td>
                            <td className="text-center text-slate-500">{p.stock_minimo}</td>
                            <td className="text-center font-bold text-red-600">{p.stock_actual}</td>
                            <td className="text-center">
                              <span className="badge badge-primary">{suggestedOrder} u.</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Modal>
        )
      }

    </div >
  );
};

export default Dashboard;
