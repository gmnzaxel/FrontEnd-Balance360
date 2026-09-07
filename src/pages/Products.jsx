import React, { useEffect, useState, useContext, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Edit,
  Trash2,
  Plus,
  Upload,
  Users,
  Search,
  Store,
  Package,
  Archive,
  FileDown,
  CheckSquare,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { toast } from 'react-toastify'
import { getErrorMessage } from '../utils/errorUtils'
import { formatARS } from '../utils/format'
import { productService } from '../services/productService'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/ui/Skeleton'
import { AuthContext } from '../context/AuthContext'
import ConfirmModal from '../components/ui/ConfirmModal'

const Products = () => {
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const searchInputRef = useRef(null)

  // --- Estados de Datos ---
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const { isAdmin } = useContext(AuthContext)
  const columnCount = isAdmin ? 8 : 7

  // --- Estados de UI ---
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false) // Nuevo para deshabilitar botones
  const [showModal, setShowModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showArchivedProducts, setShowArchivedProducts] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [importErrors, setImportErrors] = useState([])
  const [showImportErrors, setShowImportErrors] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredProduct, setHoveredProduct] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // --- Estado de Ordenamiento ---
  const [sortField, setSortField] = useState(null) // null = default del backend
  const [sortDir, setSortDir] = useState('asc') // 'asc' | 'desc'

  // --- Estados de Formularios ---
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    stock_actual: 0,
    stock_minimo: 5,
    stock_maximo: 0,
    costo_compra: 0,
    precio_venta: 0,
    supplier_name: '',
  })
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_phone: '' })
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    variant: 'danger',
    onConfirm: null,
  })

  // --- Carga Inicial ---
  const loadData = async () => {
    setLoading(true)
    try {
      const promises = [
        productService.getAll({
          include_archived: showArchivedProducts,
          page,
          page_size: pageSize,
          search: searchTerm || undefined,
          ...(sortField ? { ordering: sortDir === 'desc' ? `-${sortField}` : sortField } : {}),
        }),
      ]
      if (isAdmin) {
        promises.push(productService.getSuppliers())
      }

      const results = await Promise.allSettled(promises)
      const [prodRes, suppRes] = results

      if (prodRes.status === 'fulfilled') {
        const payload = prodRes.value
        if (payload?.results) {
          setProducts(payload.results)
          setTotalCount(payload.count || 0)
        } else {
          setProducts(payload || [])
          setTotalCount((payload || []).length)
        }
      } else {
        console.error('Error loading products:', prodRes.reason)
        toast.error(getErrorMessage(prodRes.reason))
      }

      if (isAdmin && suppRes && suppRes.status === 'fulfilled') {
        setSuppliers(suppRes.value)
      } else if (isAdmin && suppRes) {
        console.warn('Error loading suppliers (posible falta de permisos):', suppRes.reason)
      }
    } catch (error) {
      console.error('Critical error in loadData:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [showArchivedProducts, page, searchTerm, sortField, sortDir])

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput.trim())
    }, 350)
    return () => clearTimeout(handler)
  }, [searchInput])

  useEffect(() => {
    setSelectedProductIds([])
  }, [searchTerm, showArchivedProducts, products])

  // Atajos de teclado para enfocar buscador
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput =
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT' ||
        e.target.isContentEditable
      if (isInput) return

      if (e.key === 'F2' || e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    setFocusedIndex(-1)
  }, [products])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput =
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT' ||
        e.target.isContentEditable

      if (isInput) {
        if (e.key === 'ArrowDown' && e.target === searchInputRef.current) {
          e.preventDefault()
          setFocusedIndex(0)
        }
        return
      }

      if (e.key === 'F2' || e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault()
        if (isAdmin) handleCreate()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((i) => Math.min(products.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((i) => Math.max(0, i - 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setPage((p) => Math.max(1, p - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setPage((p) => Math.min(totalPages, p + 1))
      } else if (focusedIndex >= 0 && focusedIndex < products.length) {
        const activeProduct = products[focusedIndex]
        if (e.key === 'Enter') {
          e.preventDefault()
          handleViewDetails(activeProduct)
        } else if (e.key === 'e' || e.key === 'E') {
          e.preventDefault()
          if (isAdmin) handleEdit(activeProduct)
        } else if (e.key === 'Delete' || e.key === 'd' || e.key === 'D') {
          e.preventDefault()
          if (isAdmin) handleArchive(activeProduct.id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [products, focusedIndex, totalPages, isAdmin])

  // --- Acciones de Producto ---
  const handleArchive = (id) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden archivar productos')
      return
    }
    setConfirmConfig({
      isOpen: true,
      title: 'Archivar producto',
      message: '¿Archivar este producto? Podrás restaurarlo luego.',
      confirmLabel: 'Archivar',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }))
        try {
          await productService.delete(id)
          toast.success('Producto archivado correctamente')
          loadData()
        } catch (error) {
          console.error(error)
          toast.error(getErrorMessage(error))
        }
      },
    })
  }

  const handleRestore = async (id) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden restaurar productos')
      return
    }
    try {
      await productService.restore(id)
      toast.success('Producto restaurado')
      loadData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleHardDelete = (product) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden eliminar productos')
      return
    }
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar producto',
      message: `¿Eliminar definitivamente "${product.nombre}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }))
        try {
          await productService.hardDelete(product.id)
          toast.success('Producto eliminado definitivamente')
          loadData()
        } catch (error) {
          toast.error(getErrorMessage(error))
        }
      },
    })
  }

  const toggleProductSelection = (productId) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  const allVisibleSelected =
    products.length > 0 && products.every((p) => selectedProductIds.includes(p.id))

  const toggleSelectAllVisible = () => {
    if (!products.length) return
    if (allVisibleSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !products.some((p) => p.id === id)))
      return
    }
    setSelectedProductIds((prev) => {
      const merged = new Set([...prev, ...products.map((p) => p.id)])
      return Array.from(merged)
    })
  }

  const handleBulkArchive = async () => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden archivar productos')
      return
    }
    if (!selectedProductIds.length) return
    setConfirmConfig({
      isOpen: true,
      title: 'Archivar productos',
      message: `¿Archivar ${selectedProductIds.length} productos seleccionados?`,
      confirmLabel: 'Archivar',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }))
        const targets = products.filter((p) => selectedProductIds.includes(p.id) && !p.is_archived)
        const results = await Promise.allSettled(targets.map((p) => productService.delete(p.id)))
        const failed = results.filter((r) => r.status === 'rejected').length
        const archived = targets.length - failed
        if (failed) toast.error(`Archivados: ${archived}. Fallaron: ${failed}.`)
        if (archived) toast.success(`Archivados: ${archived}`)
        setSelectedProductIds([])
        loadData()
      },
    })
  }

  const handleBulkRestore = async () => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden restaurar productos')
      return
    }
    if (!selectedProductIds.length) return
    setConfirmConfig({
      isOpen: true,
      title: 'Restaurar productos',
      message: `¿Desarchivar/Restaurar ${selectedProductIds.length} productos seleccionados?`,
      confirmLabel: 'Restaurar',
      variant: 'primary',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }))
        const targets = products.filter((p) => selectedProductIds.includes(p.id) && p.is_archived)
        const results = await Promise.allSettled(targets.map((p) => productService.restore(p.id)))
        const failed = results.filter((r) => r.status === 'rejected').length
        const restored = targets.length - failed
        if (failed) toast.error(`Restaurados: ${restored}. Fallaron: ${failed}.`)
        if (restored) toast.success(`Restaurados: ${restored}`)
        setSelectedProductIds([])
        loadData()
      },
    })
  }

  const handleBulkDelete = async () => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden eliminar productos')
      return
    }
    if (!selectedProductIds.length) return
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar productos',
      message: `¿Eliminar definitivamente ${selectedProductIds.length} productos? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }))
        const targets = products.filter((p) => selectedProductIds.includes(p.id))
        const results = await Promise.allSettled(
          targets.map((p) => productService.hardDelete(p.id)),
        )
        const failed = results.filter((r) => r.status === 'rejected').length
        const deleted = targets.length - failed
        if (failed) toast.error(`Eliminados: ${deleted}. Fallaron: ${failed}.`)
        if (deleted) toast.success(`Eliminados: ${deleted}`)
        setSelectedProductIds([])
        loadData()
      },
    })
  }

  const handleDownloadTemplate = () => {
    const headers = [
      'codigo',
      'nombre',
      'stock_actual',
      'stock_minimo',
      'stock_maximo',
      'costo_compra',
      'precio_venta',
      'supplier_name',
    ]
    const sample = [
      'A001',
      'Shampoo 500ml',
      '10',
      '5',
      '30',
      '1200.50',
      '2100.00',
      'Distribuidora Sur',
    ]
    const csv = `${headers.join(',')}\n${sample.join(',')}\n`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'plantilla_productos.csv')
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleEdit = (product) => {
    setHoveredProduct(null)
    setEditingProduct(product)
    setFormData({
      ...product,
      imagen_base64: product.imagen_base64 || '',
    })
    setShowModal(true)
  }

  const handleViewDetails = (product) => {
    setHoveredProduct(null)
    setSelectedProduct(product)
    setShowDetailsModal(true)
  }

  const processImageFile = (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, seleccioná un archivo de imagen válido.')
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 400
        const MAX_HEIGHT = 400
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width)
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height)
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        setFormData((prev) => ({ ...prev, imagen_base64: dataUrl }))
      }
      img.onerror = () => {
        toast.error('Error al procesar la imagen.')
      }
    }
    reader.onerror = () => {
      toast.error('Error al leer el archivo.')
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      processImageFile(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      processImageFile(file)
    }
  }

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, imagen_base64: '' }))
  }

  const handleCreate = () => {
    setEditingProduct(null)
    setFormData({
      codigo: '',
      nombre: '',
      stock_actual: 0,
      stock_minimo: 5,
      stock_maximo: 0,
      costo_compra: 0,
      precio_venta: 0,
      supplier_name: '',
      imagen_base64: '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isAdmin) {
      toast.error('Solo los administradores pueden guardar productos')
      return
    }
    if (submitting) return

    setSubmitting(true)
    try {
      if (editingProduct) {
        await productService.update(editingProduct.id, {
          ...formData,
          supplier_name: formData.supplier_name || 'General', // Fallback para editar
        })
        toast.success('Producto actualizado exitosamente')
      } else {
        await productService.create({
          ...formData,
          supplier_name: formData.supplier_name || 'General', // Fallback para crear
        })
        toast.success('Producto creado exitosamente')
      }
      setShowModal(false)
      loadData()
    } catch (error) {
      console.error(error)
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const toastId = toast.loading('Procesando archivo...')
    try {
      const { created, updated, errors, processed_rows, total_rows, skipped_rows } =
        await productService.importCSV(file)

      let msg = `Proceso finalizado. Nuevos: ${created}, Actualizados: ${updated}.`
      if (typeof total_rows === 'number' && typeof processed_rows === 'number') {
        msg += ` Procesadas: ${processed_rows}/${total_rows}.`
      }
      if (skipped_rows) msg += ` Omitidas: ${skipped_rows}.`
      if (errors && errors.length > 0) msg += ` Errores: ${errors.length}`

      toast.update(toastId, { render: msg, type: 'success', isLoading: false, autoClose: 4000 })
      if (errors && errors.length > 0) {
        setImportErrors(errors)
        setShowImportErrors(true)
      }
      loadData()
    } catch (error) {
      toast.update(toastId, {
        render: getErrorMessage(error),
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      })
    }
    e.target.value = null // Reset input
  }

  // --- Acciones de Proveedor ---
  const handleSubmitSupplier = async () => {
    if (!supplierForm.name.trim()) return
    if (!isAdmin) {
      toast.error('Solo los administradores pueden gestionar proveedores')
      return
    }

    setSubmitting(true)
    try {
      if (editingSupplier) {
        await productService.updateSupplier(editingSupplier.id, supplierForm)
        toast.success('Proveedor actualizado')
      } else {
        await productService.createSupplier(supplierForm)
        toast.success('Proveedor agregado')
      }
      setEditingSupplier(null)
      setSupplierForm({ name: '', contact_phone: '' })
      // Recargar solo proveedores
      const newSuppliers = await productService.getSuppliers()
      setSuppliers(newSuppliers)
    } catch (error) {
      if (error.response && error.response.status === 403) {
        toast.error('Solo los administradores pueden crear un nuevo proveedor')
      } else {
        toast.error(getErrorMessage(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier)
    setSupplierForm({
      name: supplier.name || '',
      contact_phone: supplier.contact_phone || '',
    })
  }

  const handleCancelSupplierEdit = () => {
    setEditingSupplier(null)
    setSupplierForm({ name: '', contact_phone: '' })
  }

  const handleDeleteSupplier = (supplier) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden archivar proveedores')
      return
    }
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar proveedor',
      message: `¿Eliminar definitivamente "${supplier.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }))
        setSubmitting(true)
        try {
          await productService.deleteSupplier(supplier.id)
          toast.success('Proveedor eliminado definitivamente')
          setSuppliers((prev) => prev.filter((s) => s.id !== supplier.id))
        } catch (error) {
          toast.error(getErrorMessage(error))
        } finally {
          setSubmitting(false)
        }
      },
    })
  }

  // --- Ordenamiento por columna ---
  const handleSort = (field) => {
    if (sortField === field) {
      // misma columna: toggle dirección, o volver al default si ya estaba desc
      if (sortDir === 'asc') {
        setSortDir('desc')
      } else {
        setSortField(null)
        setSortDir('asc')
      }
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(1) // volver a la primera página al cambiar el orden
  }

  const handleMobileSort = (e) => {
    const val = e.target.value
    if (!val) {
      setSortField(null)
      setSortDir('asc')
    } else {
      const [field, dir] = val.split(':')
      setSortField(field)
      setSortDir(dir || 'asc')
    }
    setPage(1)
  }

  const SortableTh = ({ field, label, sortField, sortDir, onSort }) => {
    const isActive = sortField === field
    const Icon = isActive ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
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
    )
  }

  return (
    <div className="products-page page">
      <div className="page-header">
        <div className="page-header-title">
          <p className="eyebrow">Inventario</p>
          <h2 className="page-heading">Productos</h2>
          <p className="page-subtitle">Administrá el inventario y el catálogo de productos.</p>
        </div>
        <div className="page-header-actions">
          <Button
            variant="secondary"
            icon={<FileDown size={16} />}
            onClick={handleDownloadTemplate}
          >
            Plantilla
          </Button>
          <label
            className={`ui-btn ui-btn-secondary ${submitting || !isAdmin ? 'disabled' : ''}`}
            style={{ cursor: submitting || !isAdmin ? 'not-allowed' : 'pointer' }}
          >
            <Upload size={16} /> Importar
            <input
              type="file"
              hidden
              onChange={handleImport}
              accept=".csv, .xlsx"
              disabled={submitting || !isAdmin}
            />
          </label>
          {isAdmin && (
            <Button
              variant="secondary"
              icon={<Users size={16} />}
              onClick={() => setShowSupplierModal(true)}
            >
              Proveedores
            </Button>
          )}
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={handleCreate}
            disabled={!isAdmin}
          >
            Nuevo producto
          </Button>
        </div>
      </div>

      <Card className="page-toolbar products-toolbar">
        <Input
          ref={searchInputRef}
          placeholder="Buscar por código o nombre (Presione /)…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          icon={<Search size={16} />}
          suffix={<kbd className="search-kbd">/</kbd>}
          className="products-search"
        />

        <div className="products-toolbar-filters">
          <div className="products-sort-wrapper">
            <Select
              value={sortField ? `${sortField}:${sortDir}` : ''}
              onChange={handleMobileSort}
              className="products-sort-select"
              aria-label="Ordenar productos"
            >
              <option value="">Ordenar: Predeterminado</option>
              <option value="nombre:asc">Nombre (A - Z)</option>
              <option value="nombre:desc">Nombre (Z - A)</option>
              <option value="stock_actual:asc">Stock (Menor primero)</option>
              <option value="stock_actual:desc">Stock (Mayor primero)</option>
              <option value="precio_venta:asc">Precio (Menor primero)</option>
              <option value="precio_venta:desc">Precio (Mayor primero)</option>
              <option value="costo_compra:asc">Costo (Menor primero)</option>
              <option value="costo_compra:desc">Costo (Mayor primero)</option>
            </Select>
          </div>

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
        </div>

        {isAdmin && selectedProductIds.length > 0 && (
          <div className="product-selection-dock">
            <div className="dock-count-group">
              <span className="dock-badge">{selectedProductIds.length}</span>
              <span className="dock-label">Seleccionados</span>
            </div>

            <div className="dock-divider" />

            <div className="dock-buttons">
              {products.some((p) => selectedProductIds.includes(p.id) && !p.is_archived) && (
                <button
                  type="button"
                  className="btn btn-secondary dock-btn"
                  onClick={handleBulkArchive}
                >
                  <Archive size={14} /> Archivar
                </button>
              )}
              {products.some((p) => selectedProductIds.includes(p.id) && p.is_archived) && (
                <button
                  type="button"
                  className="btn btn-secondary dock-btn"
                  onClick={handleBulkRestore}
                >
                  <Archive size={14} /> Desarchivar
                </button>
              )}
              <button type="button" className="btn btn-danger dock-btn" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Eliminar
              </button>
            </div>

            <div className="dock-divider" />

            <button
              type="button"
              className="dock-close-btn"
              onClick={() => setSelectedProductIds([])}
              title="Cancelar selección"
              aria-label="Cancelar selección"
            >
              <X size={18} />
            </button>
          </div>
        )}
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
              <th style={{ width: isAdmin ? undefined : '50%' }}>
                {isAdmin ? 'Producto / Proveedor' : 'Producto'}
              </th>
              <SortableTh
                field="stock_actual"
                label="Stock"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableTh
                field="stock_minimo"
                label="Min"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableTh
                field="stock_maximo"
                label="Max"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableTh
                field="costo_compra"
                label="Costo"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableTh
                field="precio_venta"
                label="Precio Venta"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan={columnCount}>
                    <Skeleton height={48} />
                  </td>
                </tr>
              ))
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
                  onMouseEnter={() => {
                    setFocusedIndex(idx)
                    setHoveredProduct(p)
                  }}
                  onMouseLeave={() => {
                    setFocusedIndex((prev) => (prev === idx ? -1 : prev))
                    setHoveredProduct(null)
                  }}
                  onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                >
                  {isAdmin && (
                    <td data-label="Seleccionar" className="cell-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={() => toggleProductSelection(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Seleccionar producto ${p.nombre}`}
                      />
                    </td>
                  )}
                  <td className="muted font-mono cell-codigo" data-label="Código">
                    {p.codigo}
                  </td>
                  <td
                    data-label={isAdmin ? 'Producto / Proveedor' : 'Producto'}
                    className="cell-product"
                  >
                    <div className="product-item-layout">
                      {p.imagen_base64 ? (
                        <img
                          src={p.imagen_base64}
                          alt={p.nombre}
                          className="product-cell-thumb"
                          loading="lazy"
                        />
                      ) : (
                        <div className="product-cell-thumb-placeholder">
                          <Package size={16} />
                        </div>
                      )}
                      <div className="product-cell-details">
                        <div className="font-medium product-name-title">{p.nombre}</div>
                        {isAdmin && (
                          <div className="muted tiny flex-row gap-xs items-center mt-1">
                            <Store size={12} /> {p.supplier_name || 'Sin proveedor asignado'}
                          </div>
                        )}
                        {p.is_archived && <div className="product-archived-badge">Archivado</div>}
                      </div>
                    </div>
                  </td>
                  <td data-label="Stock" className="cell-stock">
                    {p.stock_actual < p.stock_minimo ? (
                      <Badge tone="danger" className="badge-pulse-danger">
                        Bajo ({p.stock_actual})
                      </Badge>
                    ) : p.stock_actual === p.stock_minimo &&
                      (p.stock_maximo === 0 || p.stock_actual < p.stock_maximo) ? (
                      <Badge tone="warning">{p.stock_actual} un.</Badge>
                    ) : (
                      <Badge tone="success">{p.stock_actual} un.</Badge>
                    )}
                  </td>
                  <td className="text-muted cell-min" data-label="Min">
                    {p.stock_minimo}
                  </td>
                  <td className="text-muted cell-max" data-label="Max">
                    {p.stock_maximo || '-'}
                  </td>
                  <td className="text-muted cell-cost" data-label="Costo">
                    {formatARS(p.costo_compra)}
                  </td>
                  <td className="font-bold cell-price" data-label="Precio Venta">
                    {formatARS(p.precio_venta)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnCount}>
                  <div className="empty-state">
                    <Package
                      size={48}
                      strokeWidth={1.5}
                      className="text-muted mb-2"
                      style={{ opacity: 0.5 }}
                    />
                    <p className="font-medium">No se encontraron productos.</p>
                    <p className="text-sm text-muted">
                      Probá con otra búsqueda o creá un producto.
                    </p>
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
        <span className="muted small">
          Página {page} de {totalPages}
        </span>
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
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowDetailsModal(false)}>
                Cerrar
              </Button>
              {isAdmin && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowDetailsModal(false)
                      handleEdit(selectedProduct)
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      selectedProduct.is_archived
                        ? handleRestore(selectedProduct.id)
                        : handleArchive(selectedProduct.id)
                    }
                  >
                    {selectedProduct.is_archived ? 'Desarchivar' : 'Archivar'}
                  </Button>
                  <Button variant="primary" onClick={() => handleHardDelete(selectedProduct)}>
                    Eliminar
                  </Button>
                </>
              )}
            </>
          }
        >
          <div className="form-stack">
            {selectedProduct.imagen_base64 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)',
                    backgroundColor: 'var(--surface-muted)',
                  }}
                >
                  <img
                    src={selectedProduct.imagen_base64}
                    alt={selectedProduct.nombre}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </div>
            )}
            <div className={isAdmin ? 'grid two-cols' : 'grid one-col'}>
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
            <div className="product-details-stats">
              <div className="detail-stat-box">
                <p className="text-xs muted">Stock actual</p>
                <p className="font-semibold text-base">{selectedProduct.stock_actual}</p>
              </div>
              <div className="detail-stat-box">
                <p className="text-xs muted">Stock mínimo</p>
                <p className="font-semibold text-base">{selectedProduct.stock_minimo}</p>
              </div>
              <div className="detail-stat-box">
                <p className="text-xs muted">Stock máximo</p>
                <p className="font-semibold text-base">{selectedProduct.stock_maximo || '—'}</p>
              </div>
            </div>
            <div className="grid two-cols">
              <div className="detail-stat-box">
                <p className="text-xs muted">Costo</p>
                <p className="font-medium">{formatARS(selectedProduct.costo_compra)}</p>
              </div>
              <div className="detail-stat-box">
                <p className="text-xs muted">Precio venta</p>
                <p className="font-bold text-primary-400">
                  {formatARS(selectedProduct.precio_venta)}
                </p>
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
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowModal(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Guardando…' : 'Guardar'}
              </Button>
            </>
          }
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
                {formData.supplier_name &&
                  !suppliers.some((s) => s.name === formData.supplier_name) && (
                    <option value={formData.supplier_name}>
                      {formData.supplier_name} (No registrado)
                    </option>
                  )}
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
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

            <div style={{ marginTop: '16px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: 'var(--slate-700)',
                }}
              >
                Imagen del Producto (Vista Previa en Hover)
              </label>
              {formData.imagen_base64 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      overflow: 'hidden',
                      backgroundColor: 'var(--surface-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={formData.imagen_base64}
                      alt="Vista previa"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    icon={<Trash2 size={16} />}
                    onClick={handleRemoveImage}
                    style={{ color: 'var(--danger-600)' }}
                  >
                    Eliminar Imagen
                  </Button>
                </div>
              ) : (
                <label
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isDragging
                      ? '2px dashed var(--primary-500)'
                      : '2px dashed var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    backgroundColor: isDragging
                      ? 'var(--surface-hover, #eff6ff)'
                      : 'var(--surface-muted, #f8fafc)',
                    transition: 'border-color 0.2s, background-color 0.2s',
                    textAlign: 'center',
                  }}
                  onMouseEnter={(e) => {
                    if (!isDragging) {
                      e.currentTarget.style.borderColor = 'var(--primary-500)'
                      e.currentTarget.style.backgroundColor = 'var(--surface-hover)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDragging) {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                      e.currentTarget.style.backgroundColor = 'var(--surface-muted)'
                    }
                  }}
                >
                  <Upload
                    size={24}
                    className="text-muted"
                    style={{
                      marginBottom: '8px',
                      color: isDragging ? 'var(--primary-600)' : 'var(--text-secondary)',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      color: isDragging ? 'var(--primary-700)' : 'var(--text-secondary)',
                    }}
                  >
                    {isDragging ? '¡Soltá la imagen acá!' : 'Hacé clic o arrastrá una imagen acá'}
                  </span>
                  <span
                    style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}
                  >
                    Sube una foto clara (se redimensionará para conservar nitidez)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>

            {parseFloat(formData.precio_venta) > 0 &&
              (() => {
                const costVal = parseFloat(formData.costo_compra) || 0
                const sellVal = parseFloat(formData.precio_venta) || 0
                const marginPercent = ((sellVal - costVal) / sellVal) * 100
                const markupPercent = costVal > 0 ? ((sellVal - costVal) / costVal) * 100 : 0

                return (
                  <div className="rentabilidad-indicator">
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Margen Neto: </span>
                      <strong
                        style={{
                          color:
                            marginPercent > 20
                              ? 'var(--success-text)'
                              : marginPercent > 0
                                ? 'var(--warning-text)'
                                : 'var(--danger-text)',
                        }}
                      >
                        {marginPercent.toFixed(1)}%
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Recargo (Markup): </span>
                      <strong
                        style={{
                          color:
                            markupPercent > 25
                              ? 'var(--success-text)'
                              : markupPercent > 0
                                ? 'var(--warning-text)'
                                : 'var(--danger-text)',
                        }}
                      >
                        {costVal > 0 ? `+${markupPercent.toFixed(1)}%` : 'N/A'}
                      </strong>
                    </div>
                  </div>
                )
              })()}
          </form>
        </Modal>
      )}

      {showImportErrors && (
        <Modal title="Errores de importación" onClose={() => setShowImportErrors(false)} size="md">
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
                    const [rowLabel, ...rest] = String(e).split(':')
                    return (
                      <tr key={idx}>
                        <td data-label="Fila">{rowLabel || `Fila ${idx + 1}`}</td>
                        <td data-label="Error">{rest.join(':').trim() || e}</td>
                      </tr>
                    )
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
            if (submitting) return
            setShowSupplierModal(false)
            handleCancelSupplierEdit()
          }}
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowSupplierModal(false)}>
                Cerrar
              </Button>
            </>
          }
        >
          <div className="form-stack">
            <div className="supplier-form-row">
              <div className="supplier-input-col">
                <Input
                  label={editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div className="supplier-input-col">
                <Input
                  label="Teléfono"
                  value={supplierForm.contact_phone}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, contact_phone: e.target.value })
                  }
                  placeholder="Ej: 11 2345 6789"
                />
              </div>
              <div className="supplier-btn-group">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSubmitSupplier}
                  disabled={submitting || !supplierForm.name.trim() || !isAdmin}
                  className="supplier-submit-btn"
                >
                  {submitting ? '...' : editingSupplier ? 'Guardar' : <Plus size={18} />}
                </Button>
                {editingSupplier && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancelSupplierEdit}
                    disabled={submitting}
                    className="supplier-cancel-btn"
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>

            <div
              className="table-container compact"
              style={{ maxHeight: 200, overflowY: 'auto', marginTop: 10 }}
            >
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
                      <td className="muted text-sm" data-label="Proveedor">
                        Todavía no hay proveedores.
                      </td>
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
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {!window.matchMedia('(pointer: coarse)').matches &&
        hoveredProduct &&
        !showDetailsModal &&
        !showModal &&
        !showSupplierModal &&
        !showImportErrors &&
        hoveredProduct.imagen_base64 &&
        createPortal(
          (() => {
            const tooltipWidth = 160
            const tooltipHeight = 160
            let x = mousePos.x + 15
            let y = mousePos.y + 15
            if (x + tooltipWidth > window.innerWidth) {
              x = mousePos.x - tooltipWidth - 15
            }
            if (y + tooltipHeight > window.innerHeight) {
              y = mousePos.y - tooltipHeight - 15
            }
            return (
              <>
                <style>{`
              @keyframes fadeInScale {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
              }
            `}</style>
                <div
                  style={{
                    position: 'fixed',
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${tooltipWidth}px`,
                    height: `${tooltipHeight}px`,
                    zIndex: 100000,
                    pointerEvents: 'none',
                    backgroundColor: 'var(--surface-elevated, #1e293b)',
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    borderRadius: '12px',
                    boxShadow:
                      '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px',
                    animation: 'fadeInScale 0.15s ease-out',
                  }}
                >
                  <img
                    src={hoveredProduct.imagen_base64}
                    alt={hoveredProduct.nombre}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '9px',
                    }}
                  />
                </div>
              </>
            )
          })(),
          document.body,
        )}
    </div>
  )
}

export default Products
