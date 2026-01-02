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
  { key: 'sales_count', label: 'Operaciones', icon: <ShoppingBag size={22} />, tone: 'success' },
  { key: 'margin', label: 'Margen estimado', icon: <TrendingUp size={22} />, tone: 'warning', formatter: formatARS },
  { key: 'stockouts', label: 'Stock bajo', icon: <AlertTriangle size={22} />, tone: 'danger' },
];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // State for Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);

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

  useEffect(() => {
    setSelectedProductIds([]);
  }, [selectedSupplier]);

  const allFilteredSelected = filteredStock.length > 0 && filteredStock.every((p) => selectedProductIds.includes(p.id));

  const toggleProductSelection = (productId) => {
    setSelectedProductIds((prev) => (
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    ));
  };

  const toggleAllFiltered = () => {
    if (!filteredStock.length) return;
    if (allFilteredSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !filteredStock.some((p) => p.id === id)));
      return;
    }
    setSelectedProductIds((prev) => {
      const merged = new Set([...prev, ...filteredStock.map((p) => p.id)]);
      return Array.from(merged);
    });
  };

  const handleDownloadSupplierExcel = async () => {
    if (!selectedSupplier) return;
    if (!filteredStock.length) return;
    const selectedForExport = filteredStock.filter((p) => selectedProductIds.includes(p.id));
    const productIds = (selectedForExport.length ? selectedForExport : filteredStock).map((p) => p.id);
    try {
      const response = await api.get('reports/export-supplier-order/', {
        params: { supplier: selectedSupplier, product_ids: productIds.join(',') },
        responseType: 'blob'
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      const fileName = `Orden_Pedido_${selectedSupplier}.xlsx`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="dashboard-page page">
      <div className="page-header">
        <div className="page-header-title">
          <p className="eyebrow">Resumen ejecutivo</p>
          <h2 className="page-heading">Dashboard</h2>
          <p className="page-subtitle">Resumen de ventas, inventario y actividad reciente.</p>
        </div>
      </div>

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
        <Card title="Evolución de ventas" description="Tendencia de los últimos 30 días.">
          <div className="dashboard-chart-body">
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
        <Card title="Top productos" description="Rendimiento por volumen.">
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
                  <p style={{ fontWeight: 600, color: 'var(--slate-700)', margin: 0 }}>Todavía no hay ventas registradas.</p>
                  <p className="text-sm text-muted">El ranking aparecerá cuando haya ventas.</p>
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
                        <td style={{ borderBottomColor: 'rgba(226, 232, 240, 0.6)' }} data-label="Producto">
                          <span style={{ fontWeight: 500 }}>{p.product__nombre}</span>
                        </td>
                        <td style={{ textAlign: 'right', borderBottomColor: 'rgba(226, 232, 240, 0.6)' }} data-label="Cant.">
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
        <Card title="Alertas de stock" description="Productos por debajo del mínimo.">
          <div className="flex justify-end mb-4">
            <Button variant="secondary" size="sm" icon={<Filter size={16} />} onClick={() => setShowSupplierModal(true)}>
              Filtrar por proveedor
            </Button>
          </div>
          {loading ? <Skeleton height={200} /> : (
            <div className="table-container compact" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {!stats?.low_stock_products?.length ? (
                <div className="empty-state py-8">
                  <p>No hay productos con stock bajo.</p>
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
                        <td className="font-medium text-slate-700" data-label="Producto">{p.nombre}</td>
                        <td className="text-sm text-slate-500" data-label="Proveedor">{p.supplier_name || '-'}</td>
                        <td className="text-center" data-label="Min">
                          <span className="badge badge-neutral">{p.stock_minimo}</span>
                        </td>
                        <td className="text-center" data-label="Actual">
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
          <Modal title="Generar pedido a proveedor" onClose={() => setShowSupplierModal(false)} size="lg">
            <div className="supplier-order-modal flex flex-col gap-4">
              <div className="supplier-order-controls flex items-end gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1">
                  <Select
                    label="Proveedor"
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                  >
                    <option value="">-- Todos los Proveedores --</option>
                    {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
                <div className="supplier-order-download mb-1">
                  <Button
                    variant="primary"
                    icon={<FileDown size={18} />}
                    disabled={!selectedSupplier || filteredStock.length === 0}
                    onClick={handleDownloadSupplierExcel}
                  >
                    Descargar Orden (Excel)
                  </Button>
                </div>
              </div>

              <div className="supplier-order-actions flex items-center justify-between text-sm text-slate-600">
                <span>Seleccioná los productos a incluir en el Excel.</span>
                <Button variant="secondary" size="sm" onClick={toggleAllFiltered}>
                  {allFilteredSelected ? 'Quitar selección' : 'Seleccionar todos'}
                </Button>
              </div>

              <div className="supplier-order-table table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th className="text-center">Incluir</th>
                      <th>Código</th>
                      <th>Producto</th>
                      <th className="text-center">Stock Mínimo</th>
                      <th className="text-center">Stock Actual</th>
                      <th className="text-center">A Reponer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-8 text-slate-500">No hay productos para este proveedor.</td></tr>
                    ) : (
                      filteredStock.map(p => {
                        const target = p.stock_maximo > 0 ? p.stock_maximo : p.stock_minimo;
                        const suggestedOrder = Math.max(0, target - p.stock_actual);
                        return (
                          <tr key={p.id}>
                            <td className="text-center" data-label="Incluir">
                              <input
                                type="checkbox"
                                checked={selectedProductIds.includes(p.id)}
                                onChange={() => toggleProductSelection(p.id)}
                              />
                            </td>
                            <td className="text-xs font-mono text-slate-500" data-label="Código">{p.codigo}</td>
                            <td className="font-medium" data-label="Producto">{p.nombre}</td>
                            <td className="text-center text-slate-500" data-label="Stock Mínimo">{p.stock_minimo}</td>
                            <td className="text-center font-bold text-red-600" data-label="Stock Actual">{p.stock_actual}</td>
                            <td className="text-center" data-label="A Reponer">
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

      </div>
    </div >
  );
};

export default Dashboard;
