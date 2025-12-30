import React, { useEffect, useMemo, useState, useContext } from 'react';
import { Edit, Trash2, Plus, Upload, Users, AlertTriangle, Search, Store, Package, RotateCcw, Archive } from 'lucide-react';
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
import { AuthContext } from '../context/AuthContext';

const Products = () => {
  // --- Estados de Datos ---
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [lowStockData, setLowStockData] = useState({ mode: 'simple', results: [] });
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'ADMIN';

  // --- Estados de UI ---
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // Nuevo para deshabilitar botones
  const [showModal, setShowModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('all');
  const [showArchivedProducts, setShowArchivedProducts] = useState(false);
  const [showArchivedSuppliers, setShowArchivedSuppliers] = useState(false);

  // --- Estados de Formularios ---
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '', nombre: '', stock_actual: 0, stock_minimo: 5, stock_maximo: 0, costo_compra: 0, precio_venta: 0, supplier_name: '',
  });
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_phone: '' });

  // --- Carga Inicial ---
  const loadData = async () => {
    setLoading(true);
    try {
      // Usamos allSettled para que si falla uno (ej: proveedores por permisos), no rompa todo el dashboard
      const results = await Promise.allSettled([
        productService.getAll({ include_archived: showArchivedProducts }),
        productService.getSuppliers({ include_archived: showArchivedSuppliers }),
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
  }, [showArchivedProducts, showArchivedSuppliers]);

  // --- Filtros ---
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter((p) =>
      p.nombre.toLowerCase().includes(term) || p.codigo.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // --- Acciones de Producto ---
  const handleArchive = async (id) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden archivar productos');
      return;
    }
    if (!window.confirm('¿Archivar este producto? Podrás restaurarlo luego.')) return;

    try {
      await productService.delete(id);
      toast.success('Producto archivado correctamente');
      loadData(); // Recarga completa para actualizar lowStock también
    } catch (error) {
      console.error(error); // Log para debug
      toast.error(getErrorMessage(error));
    }
  };

  const handleRestore = async (id) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden restaurar productos');
      return;
    }
    try {
      await productService.restore(id);
      toast.success('Producto restaurado');
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleHardDelete = async (product) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden eliminar productos');
      return;
    }
    if (!window.confirm(`Eliminar definitivamente "${product.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await productService.hardDelete(product.id);
      toast.success('Producto eliminado definitivamente');
      loadData();
    } catch (error) {
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
      codigo: '', nombre: '', stock_actual: 0, stock_minimo: 5, stock_maximo: 0, costo_compra: 0, precio_venta: 0, supplier_name: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Solo los administradores pueden guardar productos');
      return;
    }
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
    if (!isAdmin) {
      toast.error('Solo los administradores pueden crear proveedores');
      return;
    }

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
    if (!isAdmin) {
      toast.error('Solo los administradores pueden archivar proveedores');
      return;
    }
    if (!window.confirm(`¿Archivar proveedor "${supplier.name}"?`)) return;
    setSubmitting(true);
    try {
      await productService.deleteSupplier(supplier.id);
      toast.success('Proveedor archivado');
      setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? { ...s, is_archived: true } : s)));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestoreSupplier = async (supplier) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden restaurar proveedores');
      return;
    }
    setSubmitting(true);
    try {
      await productService.restoreSupplier(supplier.id);
      toast.success('Proveedor restaurado');
      setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? { ...s, is_archived: false } : s)));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleHardDeleteSupplier = async (supplier) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden eliminar proveedores');
      return;
    }
    if (!window.confirm(`Eliminar definitivamente "${supplier.name}"? Esta acción no se puede deshacer.`)) return;
    setSubmitting(true);
    try {
      await productService.hardDeleteSupplier(supplier.id);
      toast.success('Proveedor eliminado definitivamente');
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
          <label className={`ui-btn ui-btn-secondary ${submitting || !isAdmin ? 'disabled' : ''}`} style={{ cursor: submitting || !isAdmin ? 'not-allowed' : 'pointer' }}>
            <Upload size={16} /> Importar
            <input type="file" hidden onChange={handleImport} accept=".csv, .xlsx" disabled={submitting || !isAdmin} />
          </label>
          <Button variant="secondary" icon={<Users size={16} />} onClick={() => setShowSupplierModal(true)}>
            Proveedores
          </Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreate} disabled={!isAdmin}>
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
        <label className="archive-toggle">
          <input
            type="checkbox"
            className="archive-toggle-input"
            checked={showArchivedProducts}
            onChange={(e) => setShowArchivedProducts(e.target.checked)}
          />
          <span className="archive-toggle-control" aria-hidden="true" />
          <span className="archive-toggle-label">Mostrar archivados</span>
        </label>
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
              <th>Max</th>
              <th>Costo</th>
              <th>Precio Venta</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map(i => <tr key={i}><td colSpan="8"><Skeleton height={48} /></td></tr>)
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((p) => (
                <tr key={p.id} className={p.is_archived ? 'row-muted opacity-60' : ''}>
                  <td className="muted font-mono" data-label="Código">{p.codigo}</td>
                  <td data-label="Producto / Proveedor">
                    <div className="font-medium">{p.nombre}</div>
                    <div className="muted tiny flex-row gap-xs items-center mt-1">
                      <Store size={12} /> {p.supplier_name || 'Sin proveedor asignado'}
                    </div>
                    {p.is_archived && (
                      <div className="muted tiny mt-1">Archivado</div>
                    )}
                  </td>
                  <td data-label="Stock">
                    {p.bajo_stock
                      ? <Badge tone="danger">Bajo ({p.stock_actual})</Badge>
                      : <Badge tone="success">{p.stock_actual} un.</Badge>}
                  </td>
                  <td className="text-slate-500" data-label="Min">{p.stock_minimo}</td>
                  <td className="text-slate-500" data-label="Max">{p.stock_maximo || '-'}</td>
                  <td className="text-slate-500" data-label="Costo">{formatARS(p.costo_compra)}</td>
                  <td className="font-bold text-slate-700" data-label="Precio Venta">{formatARS(p.precio_venta)}</td>
                  <td style={{ textAlign: 'right' }} data-label="Acciones">
                    {isAdmin && (
                      <div className="flex-row gap-xs justify-end">
                        <button
                          className="btn-icon"
                          title={p.is_archived ? 'Desarchivar' : 'Archivar'}
                          onClick={() => (p.is_archived ? handleRestore(p.id) : handleArchive(p.id))}
                        >
                          {p.is_archived ? <RotateCcw size={18} /> : <Archive size={18} />}
                        </button>
                        <button
                          className="btn-icon text-danger-600"
                          title="Eliminar definitivamente"
                          onClick={() => handleHardDelete(p)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">
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

            <Input
              label="Stock Máximo"
              type="number"
              min="0"
              value={formData.stock_maximo}
              onChange={(e) => setFormData({ ...formData, stock_maximo: e.target.value })}
              helper="Si se informa, el pedido sugerido repone hasta este valor."
            />

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
                disabled={submitting || !supplierForm.name.trim() || !isAdmin}
                style={{ marginBottom: 2 }} // Alinear con input
              >
                {submitting ? '...' : <Plus size={18} />}
              </Button>
            </div>

            <label className="archive-toggle">
              <input
                type="checkbox"
                className="archive-toggle-input"
                checked={showArchivedSuppliers}
                onChange={(e) => setShowArchivedSuppliers(e.target.checked)}
              />
              <span className="archive-toggle-control" aria-hidden="true" />
              <span className="archive-toggle-label">Mostrar archivados</span>
            </label>

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
                    <tr key={s.id} className={s.is_archived ? 'row-muted opacity-60' : ''}>
                      <td data-label="Proveedor">
                        <div className="font-medium">{s.name}</div>
                        {s.is_archived && <div className="muted tiny mt-1">Archivado</div>}
                      </td>
                      <td data-label="Acciones" style={{ textAlign: 'right' }}>
                        {isAdmin && (
                          s.is_archived ? (
                            <>
                              <button
                                className="ghost-icon"
                                type="button"
                                onClick={() => handleRestoreSupplier(s)}
                                disabled={submitting}
                                aria-label={`Restaurar proveedor ${s.name}`}
                              >
                                <RotateCcw size={16} />
                              </button>
                              <button
                                className="ghost-icon text-danger-600"
                                type="button"
                                onClick={() => handleHardDeleteSupplier(s)}
                                disabled={submitting}
                                aria-label={`Eliminar proveedor ${s.name}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              className="ghost-icon"
                              type="button"
                              onClick={() => handleDeleteSupplier(s)}
                              disabled={submitting}
                              aria-label={`Archivar proveedor ${s.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          )
                        )}
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
