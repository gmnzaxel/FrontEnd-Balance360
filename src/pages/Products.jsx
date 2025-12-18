import React, { useEffect, useMemo, useState } from 'react';
import { Edit, Trash2, Plus, Upload, Users, AlertTriangle, Search, Store } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { formatARS } from '../utils/format';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_phone: '' });
  const [formData, setFormData] = useState({
    codigo: '', nombre: '', stock_actual: 0, stock_minimo: 5, costo_compra: 0, precio_venta: 0, supplier_name: '',
  });
  const [lowStockData, setLowStockData] = useState({ mode: 'simple', results: [] });
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('all');

  const fetchProducts = async () => {
    try {
      const response = await api.get('inventory/products/');
      setProducts(response.data.results || response.data);
    } catch (_error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('inventory/suppliers/');
      setSuppliers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLowStock = async () => {
    try {
      const res = await api.get('inventory/low-stock/');
      setLowStockData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
    fetchLowStock();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter((p) =>
      p.nombre.toLowerCase().includes(term) || p.codigo.toLowerCase().includes(term));
  }, [products, searchTerm]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar producto?')) return;
    try {
      await api.delete(`inventory/products/${id}/`);
      toast.success('Producto eliminado');
      fetchProducts();
    } catch (_error) {
      toast.error('Error al eliminar');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData(product);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setFormData({
      codigo: '', nombre: '', stock_actual: 0, stock_minimo: 5, costo_compra: 0, precio_venta: 0, supplier_name: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.put(`inventory/products/${editingProduct.id}/`, formData);
        toast.success('Producto actualizado');
      } else {
        await api.post('inventory/products/', formData);
        toast.success('Producto creado');
      }
      setShowModal(false);
      fetchProducts();
      fetchLowStock();
    } catch (_error) {
      toast.error('Error al guardar');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const response = await api.post('inventory/products/import/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { created, updated, errors } = response.data;
      let msg = `Importación completada. Creados: ${created} | Actualizados: ${updated}`;
      if (errors.length > 0) msg += ` | Errores: ${errors.length}`;
      toast.success(msg);
      fetchProducts();
    } catch (_error) {
      toast.error('Error al importar archivo');
    }
  };

  return (
    <div className="stack gap-lg">
      <Card
        title="Inventario"
        description="Administra productos y proveedores."
        headerSlot={(
          <div className="flex-row gap-sm">
            <label className="ui-btn ui-btn-secondary" style={{ cursor: 'pointer' }}>
              <Upload size={16} /> Importar
              <input type="file" hidden onChange={handleImport} accept=".csv, .xlsx" />
            </label>
            <Button variant="secondary" icon={<Users size={16} />} onClick={() => setShowSupplierModal(true)}>Proveedores</Button>
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreate}>Nuevo producto</Button>
          </div>
        )}
      >
        <div className="flex-row between">
          <Input
            placeholder="Buscar por código o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>
      </Card>

      {lowStockData.results.length > 0 && (
        <Card
          title="Alertas de stock"
          description="Productos bajo mínimo"
          className="alert-card"
          headerSlot={<AlertTriangle size={18} className="text-warn" />}
        >
          {lowStockData.mode === 'simple' ? (
            <div className="chip-grid">
              {lowStockData.results.map((p) => (
                <Badge key={p.id} tone="danger">
                  {p.nombre} ({p.stock_actual}/{p.stock_minimo})
                </Badge>
              ))}
            </div>
          ) : (
            <>
              <Select value={selectedSupplierFilter} onChange={(e) => setSelectedSupplierFilter(e.target.value)}>
                <option value="all">Ver todos</option>
                {lowStockData.results.map((g) => (
                  <option key={g.supplier_id} value={g.supplier_id}>{g.supplier_name}</option>
                ))}
              </Select>
              <div className="grid three-cols">
                {lowStockData.results
                  .filter((g) => selectedSupplierFilter === 'all' || g.supplier_id.toString() === selectedSupplierFilter)
                  .map((group) => (
                    <div key={group.supplier_id} className="mini-card">
                      <h4>{group.supplier_name}</h4>
                      <ul>
                        {group.items.map((item) => (
                          <li key={item.product_id}>
                            {item.product_name} — <span className="muted tiny">Min: {item.stock_minimo_supplier}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </>
          )}
        </Card>
      )}

      <div className="table-container">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre / Proveedor</th>
              <th>Stock</th>
              <th>Mínimo</th>
              <th>Costo</th>
              <th>Precio</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7"><Skeleton height={48} /></td></tr>
            ) : filteredProducts.map((p) => (
              <tr key={p.id}>
                <td className="muted">#{p.codigo}</td>
                <td>
                  <div className="title-sm">{p.nombre}</div>
                  <div className="muted tiny flex-row gap-xs">
                    <Store size={12} /> {p.supplier_name || 'Sin proveedor'}
                  </div>
                </td>
                <td>
                  {p.bajo_stock ? <Badge tone="danger">Bajo: {p.stock_actual}</Badge> : <Badge tone="success">{p.stock_actual}</Badge>}
                </td>
                <td>{p.stock_minimo}</td>
                <td>{formatARS(p.costo_compra)}</td>
                <td className="title-sm">{formatARS(p.precio_venta)}</td>
                <td style={{ textAlign: 'right' }}>
                  <div className="flex-row gap-xs justify-end">
                    <button className="ghost-icon" onClick={() => handleEdit(p)}><Edit size={18} /></button>
                    <button className="ghost-icon" onClick={() => handleDelete(p.id)}><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filteredProducts.length === 0 && (
              <tr><td colSpan="7" className="text-center muted p-3">No se encontraron productos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal
          title={editingProduct ? 'Editar producto' : 'Nuevo producto'}
          onClose={() => setShowModal(false)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSubmit}>Guardar</Button>
            </>
          )}
        >
          <form onSubmit={handleSubmit} className="form-stack">
            <Input label="Código" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} required />
            <Input label="Nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required />
            <div className="grid two-cols">
              <Input label="Stock" type="number" value={formData.stock_actual} onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })} disabled={!!editingProduct} />
              <Input label="Stock mínimo" type="number" value={formData.stock_minimo} onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })} required />
            </div>
            <div className="grid two-cols">
              <Input label="Costo" type="number" value={formData.costo_compra} onChange={(e) => setFormData({ ...formData, costo_compra: e.target.value })} required />
              <Input label="Precio" type="number" value={formData.precio_venta} onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })} required />
            </div>
            <Select
              label="Proveedor"
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
            >
              <option value="">Seleccionar...</option>
              {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </Select>
          </form>
        </Modal>
      )}

      {showSupplierModal && (
        <Modal
          title="Gestión de proveedores"
          onClose={() => setShowSupplierModal(false)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setShowSupplierModal(false)}>Cerrar</Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (!supplierForm.name) return;
                  try {
                    await api.post('inventory/suppliers/', supplierForm);
                    toast.success('Proveedor agregado');
                    setSupplierForm({ name: '', contact_phone: '' });
                    fetchSuppliers();
                  } catch (_e) {
                    toast.error('Error al crear proveedor');
                  }
                }}
              >
                Crear
              </Button>
            </>
          )}
        >
          <div className="table-container compact" style={{ maxHeight: 180, overflow: 'auto' }}>
            <table className="styled-table">
              <thead><tr><th>Nombre</th></tr></thead>
              <tbody>
                {suppliers.map((s) => <tr key={s.id}><td>{s.name}</td></tr>)}
              </tbody>
            </table>
          </div>
          <Input
            label="Nuevo proveedor"
            value={supplierForm.name}
            onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
            placeholder="Nombre"
          />
        </Modal>
      )}
    </div>
  );
};

export default Products;
