import React, { useEffect, useState, useContext, useRef } from 'react';
import { Edit, Trash2, Plus, Upload, Users, Search, Store, Package, Archive, FileDown, CheckSquare, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
import ConfirmModal from '../components/ui/ConfirmModal';

const Products = () => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef(null);

  // --- Estados de Datos ---
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const { isAdmin } = useContext(AuthContext);
  const columnCount = isAdmin ? 8 : 7;

  // --- Estados de UI ---
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // Nuevo para deshabilitar botones
  const [showModal, setShowModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchivedProducts, setShowArchivedProducts] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [importErrors, setImportErrors] = useState([]);
  const [showImportErrors, setShowImportErrors] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // --- Estado de Ordenamiento ---
  const [sortField, setSortField] = useState(null);   // null = default del backend
  const [sortDir, setSortDir]     = useState('asc');  // 'asc' | 'desc'

  // --- Estados de Formularios ---
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '', nombre: '', stock_actual: 0, stock_minimo: 5, stock_maximo: 0, costo_compra: 0, precio_venta: 0, supplier_name: '',
  });
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_phone: '' });
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    variant: 'danger',
    onConfirm: null
  });

  // --- Carga Inicial ---
  const loadData = async () => {
    setLoading(true);
    try {
      const promises = [
        productService.getAll({
          include_archived: showArchivedProducts,
          page,
          page_size: pageSize,
          search: searchTerm || undefined,
          ...(sortField ? { ordering: sortDir === 'desc' ? `-${sortField}` : sortField } : {}),
        })
      ];
      if (isAdmin) {
        promises.push(productService.getSuppliers());
      }

      const results = await Promise.allSettled(promises);
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

      if (isAdmin && suppRes && suppRes.status === 'fulfilled') {
        setSuppliers(suppRes.value);
      } else if (isAdmin && suppRes) {
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
  }, [showArchivedProducts, page, searchTerm, sortField, sortDir]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    setSelectedProductIds([]);
  }, [searchTerm, showArchivedProducts, products]);

  // Atajos de teclado para enfocar buscador
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable;
      if (isInput) return;

      if (e.key === 'F2' || e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [products]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable;

      if (isInput) {
        if (e.key === 'ArrowDown' && e.target === searchInputRef.current) {
          e.preventDefault();
          setFocusedIndex(0);
        }
        return;
      }

      if (e.key === 'F2' || e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        if (isAdmin) handleCreate();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(i => Math.min(products.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(i => Math.max(0, i - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPage((p) => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPage((p) => Math.min(totalPages, p + 1));
      } else if (focusedIndex >= 0 && focusedIndex < products.length) {
        const activeProduct = products[focusedIndex];
        if (e.key === 'Enter') {
          e.preventDefault();
          handleViewDetails(activeProduct);
        } else if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          if (isAdmin) handleEdit(activeProduct);
        } else if (e.key === 'Delete' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          if (isAdmin) handleArchive(activeProduct.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, focusedIndex, totalPages, isAdmin]);

  // --- Acciones de Producto ---
  const handleArchive = (id) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden archivar productos');
      return;
    }
    setConfirmConfig({
      isOpen: true,
      title: 'Archivar producto',
      message: '¿Archivar este producto? Podrás restaurarlo luego.',
      confirmLabel: 'Archivar',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await productService.delete(id);
          toast.success('Producto archivado correctamente');
          loadData();
        } catch (error) {
          console.error(error);
          toast.error(getErrorMessage(error));
        }
      }
    });
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

  const handleHardDelete = (product) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden eliminar productos');
      return;
    }
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar producto',
      message: `¿Eliminar definitivamente "${product.nombre}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await productService.hardDelete(product.id);
          toast.success('Producto eliminado definitivamente');
          loadData();
        } catch (error) {
          toast.error(getErrorMessage(error));
        }
      }
    });
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
    setConfirmConfig({
      isOpen: true,
      title: 'Archivar productos',
      message: `¿Archivar ${selectedProductIds.length} productos seleccionados?`,
      confirmLabel: 'Archivar',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        const targets = products.filter((p) => selectedProductIds.includes(p.id) && !p.is_archived);
        const results = await Promise.allSettled(targets.map((p) => productService.delete(p.id)));
        const failed = results.filter((r) => r.status === 'rejected').length;
        const archived = targets.length - failed;
        if (failed) toast.error(`Archivados: ${archived}. Fallaron: ${failed}.`);
        if (archived) toast.success(`Archivados: ${archived}`);
        setSelectedProductIds([]);
        loadData();
      }
    });
  };

  const handleBulkRestore = async () => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden restaurar productos');
      return;
    }
    if (!selectedProductIds.length) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Restaurar productos',
      message: `¿Desarchivar/Restaurar ${selectedProductIds.length} productos seleccionados?`,
      confirmLabel: 'Restaurar',
      variant: 'primary',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        const targets = products.filter((p) => selectedProductIds.includes(p.id) && p.is_archived);
        const results = await Promise.allSettled(targets.map((p) => productService.restore(p.id)));
        const failed = results.filter((r) => r.status === 'rejected').length;
        const restored = targets.length - failed;
        if (failed) toast.error(`Restaurados: ${restored}. Fallaron: ${failed}.`);
        if (restored) toast.success(`Restaurados: ${restored}`);
        setSelectedProductIds([]);
        loadData();
      }
    });
  };

  const handleBulkDelete = async () => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden eliminar productos');
      return;
    }
    if (!selectedProductIds.length) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar productos',
      message: `¿Eliminar definitivamente ${selectedProductIds.length} productos? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        const targets = products.filter((p) => selectedProductIds.includes(p.id));
        const results = await Promise.allSettled(targets.map((p) => productService.hardDelete(p.id)));
        const failed = results.filter((r) => r.status === 'rejected').length;
        const deleted = targets.length - failed;
        if (failed) toast.error(`Eliminados: ${deleted}. Fallaron: ${failed}.`);
        if (deleted) toast.success(`Eliminados: ${deleted}`);
        setSelectedProductIds([]);
        loadData();
      }
    });
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
      toast.error('Solo los administradores pueden gestionar proveedores');
      return;
    }

    setSubmitting(true);
    try {
      if (editingSupplier) {
        await productService.updateSupplier(editingSupplier.id, supplierForm);
        toast.success('Proveedor actualizado');
      } else {
        await productService.createSupplier(supplierForm);
        toast.success('Proveedor agregado');
      }
      setEditingSupplier(null);
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

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name || '',
      contact_phone: supplier.contact_phone || ''
    });
  };

  const handleCancelSupplierEdit = () => {
    setEditingSupplier(null);
    setSupplierForm({ name: '', contact_phone: '' });
  };

  const handleDeleteSupplier = (supplier) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden archivar proveedores');
      return;
    }
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar proveedor',
      message: `¿Eliminar definitivamente "${supplier.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setSubmitting(true);
        try {
          await productService.deleteSupplier(supplier.id);
          toast.success('Proveedor eliminado definitivamente');
          setSuppliers((prev) => prev.filter((s) => s.id !== supplier.id));
        } catch (error) {
          toast.error(getErrorMessage(error));
        } finally {
          setSubmitting(false);
        }
      }
    });
  };



  // --- Ordenamiento por columna ---
  const handleSort = (field) => {
    if (sortField === field) {
      // misma columna: toggle dirección, o volver al default si ya estaba desc
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortField(null);
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1); // volver a la primera página al cambiar el orden
  };

  const SortableTh = ({ field, label, sortField, sortDir, onSort }) => {
    const isActive = sortField === field;
    const Icon = isActive ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th
        onClick={() => onSort(field)}
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
        title={`Ordenar por ${label}`}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {label}
          <Icon
            size={13}
            style={{
              opacity: isActive ? 1 : 0.4,
              color: isActive ? 'var(--accent)' : 'inherit',
              transition: 'opacity 0.2s, color 0.2s',
              flexShrink: 0,
            }}
          />
        </span>
      </th>
    );
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
          {isAdmin && (
            <Button variant="secondary" icon={<Users size={16} />} onClick={() => setShowSupplierModal(true)}>
              Proveedores
            </Button>
          )}
          <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreate} disabled={!isAdmin}>
            Nuevo producto
          </Button>
        </div>
      </div>

      <Card className="page-toolbar">
        <Input
          ref={searchInputRef}
          placeholder="Buscar por código o nombre (Presione /)…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          icon={<Search size={16} />}
          suffix={<kbd className="search-kbd">/</kbd>}
          className="products-search"
        />
        {isAdmin && selectedProductIds.length > 0 && (
          <div style={{
            position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--surface-elevated)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(99, 102, 241, 0.2)', padding: '12px 24px', borderRadius: '100px',
            boxShadow: 'var(--shadow), 0 0 30px rgba(99, 102, 241, 0.05)', zIndex: 100,
            display: 'flex', alignItems: 'center', gap: '16px', animation: 'slideUp 0.3s var(--ease-smooth)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>
              <div style={{ display: 'flex', background: 'var(--primary-500)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)' }}>
                {selectedProductIds.length}
              </div>
              <span style={{ letterSpacing: '0.02em' }}>Seleccionados</span>
            </div>

            <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }}></div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {products.some(p => selectedProductIds.includes(p.id) && !p.is_archived) && (
                <button className="btn btn-secondary" onClick={handleBulkArchive} style={{ borderRadius: '100px', padding: '8px 16px', height: 'auto', fontSize: '13px', border: '1px solid var(--border-subtle)' }}>
                  <Archive size={14} /> Archivar
                </button>
              )}
              {products.some(p => selectedProductIds.includes(p.id) && p.is_archived) && (
                <button className="btn btn-secondary" onClick={handleBulkRestore} style={{ borderRadius: '100px', padding: '8px 16px', height: 'auto', fontSize: '13px', border: '1px solid var(--border-subtle)' }}>
                  <Archive size={14} /> Desarchivar
                </button>
              )}
              <button className="btn btn-danger" onClick={handleBulkDelete} style={{ borderRadius: '100px', padding: '8px 16px', height: 'auto', fontSize: '13px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <Trash2 size={14} /> Eliminar
              </button>
            </div>

            <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }}></div>

            <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', transition: 'color 0.2s', outline: 'none' }} onClick={() => setSelectedProductIds([])} title="Cancelar selección" onMouseEnter={(e) => e.currentTarget.style.color = 'white'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <X size={18} />
            </button>
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
              <th style={{ width: isAdmin ? undefined : '50%' }}>{isAdmin ? 'Producto / Proveedor' : 'Producto'}</th>
              <SortableTh field="stock_actual" label="Stock" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableTh field="stock_minimo" label="Min" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableTh field="stock_maximo" label="Max" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableTh field="costo_compra" label="Costo" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableTh field="precio_venta" label="Precio Venta" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map(i => <tr key={i}><td colSpan={columnCount}><Skeleton height={48} /></td></tr>)
            ) : products.length > 0 ? (
              products.map((p, idx) => (
                <tr
                  key={p.id}
                  className={p.is_archived ? 'row-muted opacity-60' : ''}
                  onClick={() => handleViewDetails(p)}
                  style={{ 
                    cursor: 'pointer',
                    backgroundColor: focusedIndex === idx ? 'rgba(14, 165, 233, 0.12)' : undefined,
                    '--delay': `${idx * 25}ms`,
                  }}
                  onMouseEnter={() => setFocusedIndex(idx)}
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
                  <td data-label={isAdmin ? "Producto / Proveedor" : "Producto"}>
                    <div className="font-medium">{p.nombre}</div>
                    {isAdmin && (
                      <div className="muted tiny flex-row gap-xs items-center mt-1">
                        <Store size={12} /> {p.supplier_name || 'Sin proveedor asignado'}
                      </div>
                    )}
                    {p.is_archived && (
                      <div className="muted tiny mt-1">Archivado</div>
                    )}
                  </td>
                  <td data-label="Stock">
                    {p.stock_actual < p.stock_minimo
                      ? <Badge tone="danger" className="badge-pulse-danger">Bajo ({p.stock_actual})</Badge>
                      : (p.stock_actual === p.stock_minimo && (p.stock_maximo === 0 || p.stock_actual < p.stock_maximo))
                        ? <Badge tone="warning">{p.stock_actual} un.</Badge>
                        : <Badge tone="success">{p.stock_actual} un.</Badge>}
                  </td>
                  <td className="text-muted" data-label="Min">{p.stock_minimo}</td>
                  <td className="text-muted" data-label="Max">{p.stock_maximo || '-'}</td>
                  <td className="text-muted" data-label="Costo">{formatARS(p.costo_compra)}</td>
                  <td className="font-bold" data-label="Precio Venta">{formatARS(p.precio_venta)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnCount}>
                  <div className="empty-state">
                    <Package size={48} strokeWidth={1.5} className="text-muted mb-2" style={{ opacity: 0.5 }} />
                    <p className="font-medium">No se encontraron productos.</p>
                    <p className="text-sm text-muted">Probá con otra búsqueda o creá un producto.</p>
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
            <div className={isAdmin ? "grid two-cols" : "grid one-col"}>
              <div>
                <p className="text-xs muted">Código</p>
                <p className="font-medium">{selectedProduct.codigo || '—'}</p>
              </div>
              {isAdmin && (
                <div>
                  <p className="text-xs muted">Proveedor</p>
                  <p className="font-medium">{selectedProduct.supplier_name || 'General'}</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs muted">Nombre</p>
              <p className="font-medium">{selectedProduct.nombre}</p>
            </div>
            <div className="grid three-cols">
              <div>
                <p className="text-xs muted">Stock actual</p>
                <p className="font-medium">{selectedProduct.stock_actual}</p>
              </div>
              <div>
                <p className="text-xs muted">Stock mínimo</p>
                <p className="font-medium">{selectedProduct.stock_minimo}</p>
              </div>
              <div>
                <p className="text-xs muted">Stock máximo</p>
                <p className="font-medium">{selectedProduct.stock_maximo || '—'}</p>
              </div>
            </div>
            <div className="grid two-cols">
              <div>
                <p className="text-xs muted">Costo</p>
                <p className="font-medium">{formatARS(selectedProduct.costo_compra)}</p>
              </div>
              <div>
                <p className="text-xs muted">Precio venta</p>
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
                {formData.supplier_name && !suppliers.some(s => s.name === formData.supplier_name) && (
                  <option value={formData.supplier_name}>{formData.supplier_name} (No registrado)</option>
                )}
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

            {parseFloat(formData.precio_venta) > 0 && (
              (() => {
                const costVal = parseFloat(formData.costo_compra) || 0;
                const sellVal = parseFloat(formData.precio_venta) || 0;
                const marginPercent = ((sellVal - costVal) / sellVal) * 100;
                const markupPercent = costVal > 0 ? ((sellVal - costVal) / costVal) * 100 : 0;
                
                return (
                  <div 
                    className="rentabilidad-indicator" 
                    style={{ 
                      background: 'var(--surface-muted)', 
                      padding: '10px 14px', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.85rem',
                      marginTop: '12px'
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Margen Neto: </span>
                      <strong style={{ 
                        color: marginPercent > 20 
                          ? 'var(--success-text)' 
                          : marginPercent > 0 
                            ? 'var(--warning-text)' 
                            : 'var(--danger-text)'
                      }}>
                        {marginPercent.toFixed(1)}%
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Recargo (Markup): </span>
                      <strong style={{ 
                        color: markupPercent > 25 
                          ? 'var(--success-text)' 
                          : markupPercent > 0 
                            ? 'var(--warning-text)' 
                            : 'var(--danger-text)'
                      }}>
                        {costVal > 0 ? `+${markupPercent.toFixed(1)}%` : 'N/A'}
                      </strong>
                    </div>
                  </div>
                );
              })()
            )}
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
            <p className="text-sm text-muted">
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
          onClose={() => {
            if (submitting) return;
            setShowSupplierModal(false);
            handleCancelSupplierEdit();
          }}
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
                  label={editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  label="Teléfono"
                  value={supplierForm.contact_phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contact_phone: e.target.value })}
                  placeholder="Ej: 11 2345 6789"
                />
              </div>
              <Button
                type="button" // <--- IMPORTANT: Prevent default submit behavior
                variant="primary"
                onClick={handleSubmitSupplier}
                disabled={submitting || !supplierForm.name.trim() || !isAdmin}
                style={{ marginBottom: 2 }} // Alinear con input
              >
                {submitting ? '...' : (editingSupplier ? 'Guardar' : <Plus size={18} />)}
              </Button>
              {editingSupplier && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancelSupplierEdit}
                  disabled={submitting}
                  style={{ marginBottom: 2 }}
                >
                  Cancelar
                </Button>
              )}
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
                      <td data-label="Proveedor">
                        <div className="font-medium">{s.name}</div>
                        {s.contact_phone && (
                          <div className="muted tiny mt-1">{s.contact_phone}</div>
                        )}
                      </td>
                      <td data-label="Acciones" style={{ textAlign: 'right' }}>
                        {isAdmin && (
                          <>
                            <button
                              className="ghost-icon"
                              type="button"
                              onClick={() => handleEditSupplier(s)}
                              disabled={submitting}
                              aria-label={`Editar proveedor ${s.name}`}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="ghost-icon text-danger-600"
                              type="button"
                              onClick={() => handleDeleteSupplier(s)}
                              disabled={submitting}
                              aria-label={`Eliminar proveedor ${s.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
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

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default Products;
