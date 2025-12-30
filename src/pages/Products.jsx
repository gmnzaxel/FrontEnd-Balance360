import React, { useEffect, useMemo, useState } from 'react';
import { Edit, Trash2, Plus, Upload, Users, AlertTriangle, Search, Store, Package } from 'lucide-react';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../utils/errorUtils';
import { formatARS } from '../utils/format';
import { productService } from '../services/productService';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';

const Products = () => {
  // --- Estados de Datos ---
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [lowStockData, setLowStockData] = useState({ mode: 'simple', results: [] });

  // --- Estados de UI ---
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // Nuevo para deshabilitar botones
  const [showModal, setShowModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('all');

  // --- Estados de Formularios ---
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '', nombre: '', stock_actual: 0, stock_minimo: 5, costo_compra: 0, precio_venta: 0, supplier_name: '',
  });
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_phone: '' });

  // --- Carga Inicial ---
  const loadData = async () => {
    setLoading(true);
    try {
      // Usamos allSettled para que si falla uno (ej: proveedores por permisos), no rompa todo el dashboard
      const results = await Promise.allSettled([
        productService.getAll(),
        productService.getSuppliers(),
        productService.getLowStock()
      ]);

      const [prodRes, suppRes, lowRes] = results;

      if (prodRes.status === 'fulfilled') {
        setProducts(prodRes.value);
      } else {
        console.error("Error loading products:", prodRes.reason);
        toast.error(getErrorMessage(prodRes.reason));
      }

      if (suppRes.status === 'fulfilled') {
        setSuppliers(suppRes.value);
      } else {
        console.warn("Error loading suppliers (posible falta de permisos):", suppRes.reason);
      }

      if (lowRes.status === 'fulfilled') {
        setLowStockData(lowRes.value);
      } else {
        console.warn("Error loading low stock:", lowRes.reason);
      }

    } catch (error) {
      console.error("Critical error in loadData:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Filtros ---
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter((p) =>
      p.nombre.toLowerCase().includes(term) || p.codigo.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // --- Acciones de Producto ---
  const handleDelete = async (id) => {
    if (!window.confirm('¿Confirma eliminar este producto? Esta acción no se puede deshacer.')) return;

    try {
      await productService.delete(id);
      toast.success('Producto eliminado correctamente');
      loadData(); // Recarga completa para actualizar lowStock también
    } catch (error) {
      console.error(error); // Log para debug
      toast.error(getErrorMessage(error));
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
    if (submitting) return;

    setSubmitting(true);
    try {
      if (editingProduct) {
        await productService.update(editingProduct.id, {
          ...formData,
          supplier_name: formData.supplier_name || 'General' // Fallback para editar
        });
        toast.success('Producto actualizado exitosamente');
      } else {
        await productService.create({
          ...formData,
          supplier_name: formData.supplier_name || 'General' // Fallback para crear
        });
        toast.success('Producto creado exitosamente');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const toastId = toast.loading("Procesando archivo...");
    try {
      const { created, updated, errors } = await productService.importCSV(file);

      let msg = `Proceso finalizado. Nuevos: ${created}, Actualizados: ${updated}.`;
      if (errors && errors.length > 0) msg += ` Errores: ${errors.length}`;

      toast.update(toastId, { render: msg, type: "success", isLoading: false, autoClose: 4000 });
      loadData();
    } catch (error) {
      toast.update(toastId, { render: getErrorMessage(error), type: "error", isLoading: false, autoClose: 3000 });
    }
    e.target.value = null; // Reset input
  };

  // --- Acciones de Proveedor ---
  const handleSubmitSupplier = async () => {
    if (!supplierForm.name.trim()) return;

    setSubmitting(true);
    try {
      await productService.createSupplier(supplierForm);
      toast.success('Proveedor agregado');
      setSupplierForm({ name: '', contact_phone: '' });
      // Recargar solo proveedores
      const newSuppliers = await productService.getSuppliers();
      setSuppliers(newSuppliers);
    } catch (error) {
      if (error.response && error.response.status === 403) {
        toast.error('Solo los administradores pueden crear un nuevo proveedor');
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (supplier) => {
    if (!window.confirm(`¿Eliminar proveedor "${supplier.name}"?`)) return;
    setSubmitting(true);
    try {
      await productService.deleteSupplier(supplier.id);
      toast.success('Proveedor eliminado');
      setSuppliers((prev) => prev.filter((s) => s.id !== supplier.id));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="products-page page">
      <div className="page-header">
        <div className="page-header-title">
          <p className="eyebrow">Inventario</p>
          <h2 className="page-heading">Productos</h2>
          <p className="page-subtitle">Administrá el inventario y el catálogo de productos.</p>
        </div>
        <div className="page-header-actions">
          <label className={`ui-btn ui-btn-secondary ${submitting ? 'disabled' : ''}`} style={{ cursor: submitting ? 'not-allowed' : 'pointer' }}>
            <Upload size={16} /> Importar
            <input type="file" hidden onChange={handleImport} accept=".csv, .xlsx" disabled={submitting} />
          </label>
          <Button variant="secondary" icon={<Users size={16} />} onClick={() => setShowSupplierModal(true)}>
            Proveedores
          </Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreate}>
            Nuevo producto
          </Button>
        </div>
      </div>

      <Card className="page-toolbar">
        <Input
          placeholder="Buscar por código o nombre…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search size={16} />}
          className="products-search"
        />
      </Card>

      {/* Alertas de Stock */}
      {lowStockData.results.length > 0 && (
        <Card
          title="Alertas de stock"
          description="Productos por debajo del stock mínimo."
          className="alert-card"
          headerSlot={<AlertTriangle size={20} className="text-danger-600" />}
        >
          {lowStockData.mode === 'simple' ? (
            <div className="chip-grid">
              {lowStockData.results.map((p) => (
                <Badge key={p.id} tone="danger">
                  {p.nombre} (Stock: {p.stock_actual} / Min: {p.stock_minimo})
                </Badge>
              ))}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 12, maxWidth: 300 }}>
                <Select value={selectedSupplierFilter} onChange={(e) => setSelectedSupplierFilter(e.target.value)}>
                  <option value="all">Todos los proveedores</option>
                  {lowStockData.results.map((g) => (
                    <option key={g.supplier_id} value={g.supplier_id}>{g.supplier_name}</option>
                  ))}
                </Select>
              </div>
              <div className="grid three-cols">
                {lowStockData.results
                  .filter((g) => selectedSupplierFilter === 'all' || g.supplier_id.toString() === selectedSupplierFilter)
                  .map((group) => (
                    <div key={group.supplier_id} className="mini-card">
                      <h4 className="text-sm font-semibold mb-2 flex-row gap-xs">
                        <Users size={14} className="text-slate-400" /> {group.supplier_name}
                      </h4>
                      <ul className="list-disc pl-4 space-y-1">
                        {group.items.map((item) => (
                          <li key={item.product_id} className="text-xs text-slate-600">
                            <span className="font-medium text-slate-800">{item.product_name}</span>
                            <span className="text-danger-600 ml-1">(Stock: {item.stock_actual})</span>
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

      {/* Tabla Principal */}
      <div className="table-container">
        <table className="styled-table">
          <thead>
            <tr>
              <th width="100">Código</th>
              <th>Producto / Proveedor</th>
              <th>Stock</th>
              <th>Min</th>
              <th>Costo</th>
              <th>Precio Venta</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map(i => <tr key={i}><td colSpan="7"><Skeleton height={48} /></td></tr>)
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((p) => (
                <tr key={p.id}>
                  <td className="muted font-mono" data-label="Código">{p.codigo}</td>
                  <td data-label="Producto / Proveedor">
                    <div className="font-medium">{p.nombre}</div>
                    <div className="muted tiny flex-row gap-xs items-center mt-1">
                      <Store size={12} /> {p.supplier_name || 'Sin proveedor asignado'}
                    </div>
                  </td>
                  <td data-label="Stock">
                    {p.bajo_stock
                      ? <Badge tone="danger">Bajo ({p.stock_actual})</Badge>
                      : <Badge tone="success">{p.stock_actual} un.</Badge>}
                  </td>
                  <td className="text-slate-500" data-label="Min">{p.stock_minimo}</td>
                  <td className="text-slate-500" data-label="Costo">{formatARS(p.costo_compra)}</td>
                  <td className="font-bold text-slate-700" data-label="Precio Venta">{formatARS(p.precio_venta)}</td>
                  <td style={{ textAlign: 'right' }} data-label="Acciones">
                    <div className="flex-row gap-xs justify-end">
                      <button
                        className="btn-icon"
                        title="Editar"
                        onClick={() => handleEdit(p)}
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        className="btn-icon text-danger-600"
                        title="Eliminar"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">
                  <div className="empty-state">
                    <Package size={48} strokeWidth={1.5} className="text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">No se encontraron productos.</p>
                    <p className="text-sm text-slate-400">Probá con otra búsqueda o creá un producto.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Producto */}
      {showModal && (
        <Modal
          persist={true}
          title={editingProduct ? 'Editar producto' : 'Nuevo producto'}
          onClose={() => !submitting && setShowModal(false)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setShowModal(false)} disabled={submitting}>Cancelar</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Guardando…' : 'Guardar'}
              </Button>
            </>
          )}
        >
          <form id="product-form" onSubmit={handleSubmit} className="form-stack">
            <div className="grid two-cols">
              <Input
                label="Código *"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                required
                placeholder="Ej: A-001"
              />
              <Select
                label="Proveedor"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              >
                <option value="">-- Seleccionar --</option>
                {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </Select>
            </div>

            <Input
                label="Nombre del producto *"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              placeholder="Ej: Auriculares Bluetooth"
            />

            <div className="grid two-cols">
              <Input
                label="Stock Actual"
                type="number"
                min="0"
                value={formData.stock_actual}
                onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
              // Permitimos editar stock si es admin o si decides que se puede ajustar manual
              />
              <Input
                label="Stock Mínimo *"
                type="number"
                min="0"
                value={formData.stock_minimo}
                onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                required
              />
            </div>

            <div className="grid two-cols">
              <Input
                label="Costo Compra ($)"
                type="number"
                step="0.01"
                min="0"
                value={formData.costo_compra}
                onChange={(e) => setFormData({ ...formData, costo_compra: e.target.value })}
                required
              />
              <Input
                label="Precio Venta ($) *"
                type="number"
                step="0.01"
                min="0"
                value={formData.precio_venta}
                onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Proveedores */}
      {showSupplierModal && (
        <Modal
          persist={true}
          title="Proveedores"
          onClose={() => !submitting && setShowSupplierModal(false)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setShowSupplierModal(false)}>Cerrar</Button>
            </>
          )}
        >
          <div className="form-stack">
            <div className="flex-row gap-sm items-end">
              <div style={{ flex: 1 }}>
                <Input
                  label="Nuevo proveedor"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="Nombre del proveedor"
                />
              </div>
              <Button
                type="button" // <--- IMPORTANT: Prevent default submit behavior
                variant="primary"
                onClick={handleSubmitSupplier}
                disabled={submitting || !supplierForm.name.trim()}
                style={{ marginBottom: 2 }} // Alinear con input
              >
                {submitting ? '...' : <Plus size={18} />}
              </Button>
            </div>

            <div className="table-container compact" style={{ maxHeight: 200, overflowY: 'auto', marginTop: 10 }}>
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Proveedor</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id}>
                      <td data-label="Proveedor">{s.name}</td>
                      <td data-label="Acciones" style={{ textAlign: 'right' }}>
                        <button
                          className="ghost-icon"
                          type="button"
                          onClick={() => handleDeleteSupplier(s)}
                          disabled={submitting}
                          aria-label={`Eliminar proveedor ${s.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr>
                      <td className="muted text-sm" data-label="Proveedor">Todavía no hay proveedores.</td>
                      <td />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Products;
