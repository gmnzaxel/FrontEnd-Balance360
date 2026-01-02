import React, { useEffect, useState, useContext } from 'react';
import { Edit, Trash2, Plus, Upload, Users, Search, Store, Package, RotateCcw, Archive, FileDown, CheckSquare } from 'lucide-react';
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
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'ADMIN';
  const columnCount = isAdmin ? 8 : 7;

  // --- Estados de UI ---
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // Nuevo para deshabilitar botones
  const [showModal, setShowModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchivedProducts, setShowArchivedProducts] = useState(false);
  const [showArchivedSuppliers, setShowArchivedSuppliers] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [importErrors, setImportErrors] = useState([]);
  const [showImportErrors, setShowImportErrors] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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
        productService.getAll({
          include_archived: showArchivedProducts,
          page,
          page_size: pageSize,
          search: searchTerm || undefined
        }),
        productService.getSuppliers({ include_archived: showArchivedSuppliers })
      ]);

      const [prodRes, suppRes] = results;

      if (prodRes.status === 'fulfilled') {
        const payload = prodRes.value;
        if (payload?.results) {
          setProducts(payload.results);
          setTotalCount(payload.count || 0);
        } else {
          setProducts(payload || []);
          setTotalCount((payload || []).length);
        }
      } else {
        console.error("Error loading products:", prodRes.reason);
        toast.error(getErrorMessage(prodRes.reason));
      }

      if (suppRes.status === 'fulfilled') {
        setSuppliers(suppRes.value);
      } else {
        console.warn("Error loading suppliers (posible falta de permisos):", suppRes.reason);
      }

    } catch (error) {
      console.error("Critical error in loadData:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showArchivedProducts, showArchivedSuppliers, page, searchTerm]);

  useEffect(() => {
    setSelectedProductIds([]);
  }, [searchTerm, showArchivedProducts, products]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, showArchivedProducts]);

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

  const toggleProductSelection = (productId) => {
    setSelectedProductIds((prev) => (
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    ));
  };

  const allVisibleSelected = products.length > 0
    && products.every((p) => selectedProductIds.includes(p.id));

  const toggleSelectAllVisible = () => {
    if (!products.length) return;
    if (allVisibleSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !products.some((p) => p.id === id)));
      return;
    }
    setSelectedProductIds((prev) => {
      const merged = new Set([...prev, ...products.map((p) => p.id)]);
      return Array.from(merged);
    });
  };

  const handleBulkArchive = async () => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden archivar productos');
      return;
    }
    if (!selectedProductIds.length) return;
    if (!window.confirm(`¿Archivar ${selectedProductIds.length} productos seleccionados?`)) return;
    const targets = products.filter((p) => selectedProductIds.includes(p.id) && !p.is_archived);
    const results = await Promise.allSettled(targets.map((p) => productService.delete(p.id)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    const archived = targets.length - failed;
    if (failed) toast.error(`Archivados: ${archived}. Fallaron: ${failed}.`);
    if (archived) toast.success(`Archivados: ${archived}`);
    setSelectedProductIds([]);
    loadData();
  };

  const handleBulkDelete = async () => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden eliminar productos');
      return;
    }
    if (!selectedProductIds.length) return;
    if (!window.confirm(`Eliminar definitivamente ${selectedProductIds.length} productos? Esta acción no se puede deshacer.`)) return;
    const targets = products.filter((p) => selectedProductIds.includes(p.id));
    const results = await Promise.allSettled(targets.map((p) => productService.hardDelete(p.id)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    const deleted = targets.length - failed;
    if (failed) toast.error(`Eliminados: ${deleted}. Fallaron: ${failed}.`);
    if (deleted) toast.success(`Eliminados: ${deleted}`);
    setSelectedProductIds([]);
    loadData();
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'codigo',
      'nombre',
      'stock_actual',
      'stock_minimo',
      'stock_maximo',
      'costo_compra',
      'precio_venta',
      'supplier_name'
    ];
    const sample = [
      'A001',
      'Shampoo 500ml',
      '10',
      '5',
      '30',
      '1200.50',
      '2100.00',
      'Distribuidora Sur'
    ];
    const csv = `${headers.join(',')}\n${sample.join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_productos.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData(product);
    setShowModal(true);
  };

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
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
      const { created, updated, errors, processed_rows, total_rows, skipped_rows } = await productService.importCSV(file);

      let msg = `Proceso finalizado. Nuevos: ${created}, Actualizados: ${updated}.`;
      if (typeof total_rows === 'number' && typeof processed_rows === 'number') {
        msg += ` Procesadas: ${processed_rows}/${total_rows}.`;
      }
      if (skipped_rows) msg += ` Omitidas: ${skipped_rows}.`;
      if (errors && errors.length > 0) msg += ` Errores: ${errors.length}`;

      toast.update(toastId, { render: msg, type: "success", isLoading: false, autoClose: 4000 });
      if (errors && errors.length > 0) {
        setImportErrors(errors);
        setShowImportErrors(true);
      }
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
          <Button variant="secondary" icon={<FileDown size={16} />} onClick={handleDownloadTemplate}>
            Plantilla
          </Button>
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
        {isAdmin && (
          <div className="bulk-actions">
            <div className="bulk-count">
              Seleccionados: <strong>{selectedProductIds.length}</strong>
            </div>
            <button className="ui-btn ui-btn-secondary" onClick={handleBulkArchive} disabled={!selectedProductIds.length}>
              <Archive size={16} /> Archivar
            </button>
            <button className="ui-btn ui-btn-secondary" onClick={handleBulkDelete} disabled={!selectedProductIds.length}>
              <Trash2 size={16} /> Eliminar
            </button>
            <span className="bulk-pill" aria-live="polite">{selectedProductIds.length}</span>
          </div>
        )}
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

      {/* Alertas de Stock (se muestran en Dashboard) */}

      {/* Tabla Principal */}
      <div className="table-container">
        <table className="styled-table">
          <thead>
            <tr>
              {isAdmin && (
                <th width="40">
                  <button
                    className="btn-icon"
                    title={allVisibleSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                    onClick={toggleSelectAllVisible}
                  >
                    <CheckSquare size={16} />
                  </button>
                </th>
              )}
              <th width="100">Código</th>
              <th>Producto / Proveedor</th>
              <th>Stock</th>
              <th>Min</th>
              <th>Max</th>
              <th>Costo</th>
              <th>Precio Venta</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map(i => <tr key={i}><td colSpan={columnCount}><Skeleton height={48} /></td></tr>)
            ) : products.length > 0 ? (
              products.map((p) => (
                <tr
                  key={p.id}
                  className={p.is_archived ? 'row-muted opacity-60' : ''}
                  onClick={() => handleViewDetails(p)}
                  style={{ cursor: 'pointer' }}
                >
                  {isAdmin && (
                    <td data-label="Seleccionar">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={() => toggleProductSelection(p.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
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
                    {p.stock_actual < p.stock_minimo
                      ? <Badge tone="danger">Bajo ({p.stock_actual})</Badge>
                      : p.stock_actual === p.stock_minimo
                        ? <Badge tone="warning">{p.stock_actual} un.</Badge>
                        : <Badge tone="success">{p.stock_actual} un.</Badge>}
                  </td>
                  <td className="text-slate-500" data-label="Min">{p.stock_minimo}</td>
                  <td className="text-slate-500" data-label="Max">{p.stock_maximo || '-'}</td>
                  <td className="text-slate-500" data-label="Costo">{formatARS(p.costo_compra)}</td>
                  <td className="font-bold text-slate-700" data-label="Precio Venta">{formatARS(p.precio_venta)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnCount}>
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

      <div className="pagination">
        <button
          className="ui-btn ui-btn-secondary"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Anterior
        </button>
        <span className="muted small">Página {page} de {totalPages}</span>
        <button
          className="ui-btn ui-btn-secondary"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Siguiente
        </button>
      </div>

      {showDetailsModal && selectedProduct && (
        <Modal
          title="Detalle de producto"
          onClose={() => setShowDetailsModal(false)}
          size="md"
          footer={(
            <>
              <Button variant="ghost" onClick={() => setShowDetailsModal(false)}>Cerrar</Button>
              {isAdmin && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleEdit(selectedProduct);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => selectedProduct.is_archived ? handleRestore(selectedProduct.id) : handleArchive(selectedProduct.id)}
                  >
                    {selectedProduct.is_archived ? 'Desarchivar' : 'Archivar'}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleHardDelete(selectedProduct)}
                  >
                    Eliminar
                  </Button>
                </>
              )}
            </>
          )}
        >
          <div className="form-stack">
            <div className="grid two-cols">
              <div>
                <p className="text-xs text-slate-500">Código</p>
                <p className="font-medium">{selectedProduct.codigo || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Proveedor</p>
                <p className="font-medium">{selectedProduct.supplier_name || 'General'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Nombre</p>
              <p className="font-medium">{selectedProduct.nombre}</p>
            </div>
            <div className="grid three-cols">
              <div>
                <p className="text-xs text-slate-500">Stock actual</p>
                <p className="font-medium">{selectedProduct.stock_actual}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Stock mínimo</p>
                <p className="font-medium">{selectedProduct.stock_minimo}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Stock máximo</p>
                <p className="font-medium">{selectedProduct.stock_maximo || '—'}</p>
              </div>
            </div>
            <div className="grid two-cols">
              <div>
                <p className="text-xs text-slate-500">Costo</p>
                <p className="font-medium">{formatARS(selectedProduct.costo_compra)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Precio venta</p>
                <p className="font-medium">{formatARS(selectedProduct.precio_venta)}</p>
              </div>
            </div>
            {selectedProduct.is_archived && (
              <div className="muted text-sm">Producto archivado.</div>
            )}
          </div>
        </Modal>
      )}

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
                label="Código"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="Ej: A-001"
                helper="Si lo dejás vacío, se genera automáticamente."
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

      {showImportErrors && (
        <Modal
          title="Errores de importación"
          onClose={() => setShowImportErrors(false)}
          size="md"
        >
          <div className="form-stack">
            <p className="text-sm text-slate-500">
              Estas filas no se importaron. Corregilas y volvé a subir el archivo.
            </p>
            <div className="table-container compact" style={{ maxHeight: 260, overflowY: 'auto' }}>
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {importErrors.map((e, idx) => {
                    const [rowLabel, ...rest] = String(e).split(':');
                    return (
                      <tr key={idx}>
                        <td data-label="Fila">{rowLabel || `Fila ${idx + 1}`}</td>
                        <td data-label="Error">{rest.join(':').trim() || e}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
