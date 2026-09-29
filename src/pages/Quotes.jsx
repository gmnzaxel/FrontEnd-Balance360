import React, { useCallback, useEffect, useMemo, useState, useRef, memo } from 'react'
import { createPortal } from 'react-dom'
import useMediaQuery from '../hooks/useMediaQuery'
import useCart from '../hooks/useCart'
import {
  Search,
  Trash2,
  Wrench,
  PackageX,
  FileDown,
  Printer,
  ShoppingCart,
  User,
  Receipt,
  X,
  Tag,
  Eye,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import api from '../api/axios'
import { toast } from 'react-toastify'
import { getErrorMessage } from '../utils/errorUtils'
import { formatARS } from '../utils/format'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Skeleton from '../components/ui/Skeleton'
import ConfirmModal from '../components/ui/ConfirmModal'
import PosCartItem from '../components/pos/PosCartItem'
import {
  printCommercialQuoteTicket,
  downloadCommercialQuotePdf,
  buildCommercialQuoteHtml,
  getCommercialQuoteWhatsAppText,
} from '../utils/ticketGenerator'

const PAGE_SIZE = 12

// ─── Sub-componentes memoizados ────────────────────────────────────────────────

const ProductRow = memo(
  ({ product, onAdd, isFocused, onMouseEnter, onMouseLeave, onMouseMove }) => {
    const handleClick = useCallback(() => onAdd(product), [product, onAdd])
    return (
      <tr
        onClick={handleClick}
        className="pos-catalog-row"
        style={{
          cursor: 'pointer',
          backgroundColor: isFocused ? 'rgba(14, 165, 233, 0.12)' : undefined,
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
      >
        <td className="cell-pos-code" data-label="Código">
          <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
            {product.codigo}
          </span>
        </td>
        <td className="cell-pos-name" data-label="Producto">
          <div
            className="pos-product-name"
            style={{ fontWeight: 600, color: 'var(--text-primary)' }}
          >
            {product.nombre}
          </div>
          <div className="pos-mobile-meta">
            <span className="badge badge-neutral pos-mobile-code">#{product.codigo}</span>
            {product.stock !== undefined && (
              <span className="badge badge-neutral pos-mobile-stock">
                Stock: {product.stock}
              </span>
            )}
          </div>
        </td>
        <td
          className="cell-pos-stock"
          style={{ textAlign: 'center' }}
          data-label="Stock"
        >
          <span className="badge badge-neutral">
            {product.stock ?? '-'}
          </span>
        </td>
        <td
          className="cell-pos-price"
          style={{ textAlign: 'right', fontWeight: 'bold' }}
          data-label="Precio"
        >
          <span className="pos-product-price">{formatARS(product.precio_venta)}</span>
        </td>
        <td
          className="cell-pos-action"
          style={{ textAlign: 'center' }}
          data-label="Acción"
        >
          <span className="product-action-plus" title="Agregar al presupuesto">
            +
          </span>
        </td>
      </tr>
    )
  },
)
ProductRow.displayName = 'ProductRow'


// ─── Componente principal ───────────────────────────────────────────────────────

const Quotes = () => {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [showCartModal, setShowCartModal] = useState(false)
  const [cartPulse, setCartPulse] = useState(false)
  const [cartAnimKey, setCartAnimKey] = useState(0)
  const cartPulseTimerRef = useRef(null)
  const [multiplier, setMultiplier] = useState(1)

  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [validityDays, setValidityDays] = useState(15)
  const [clientName, setClientName] = useState(() => localStorage.getItem('quote_client') || '')
  const [clientDoc, setClientDoc] = useState(() => localStorage.getItem('quote_client_doc') || '')
  const [clientPhone, setClientPhone] = useState(() => localStorage.getItem('quote_client_phone') || '')
  const [quoteNotes, setQuoteNotes] = useState(() => localStorage.getItem('quote_notes') || '')
  const [showExtraDetails, setShowExtraDetails] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const searchInputRef = useRef(null)
  const ticketConfigRef = useRef(null)

  const [showServiceModal, setShowServiceModal] = useState(false)
  const [serviceForm, setServiceForm] = useState({ description: '', price: '' })
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isClearingCart, setIsClearingCart] = useState(false)
  const [hoveredProduct, setHoveredProduct] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // ─── Hook de carrito compartido ─────────────────────────────────────────────
  const {
    cart,
    setCart,
    discount,
    setDiscount,
    discountType,
    setDiscountType,
    subtotal,
    total,
    cartCount,
    removeItem,
    updateItemDiscount,
    addServiceItem,
    clearCart,
  } = useCart({
    cartKey: 'quote_cart',
    discountKey: 'quote_discount',
    discountTypeKey: 'quote_discount_type',
  })

  // Persistencia de datos del cliente con debounce
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem('quote_client', clientName)
      localStorage.setItem('quote_client_doc', clientDoc)
      localStorage.setItem('quote_client_phone', clientPhone)
      localStorage.setItem('quote_notes', quoteNotes)
    }, 500)
    return () => clearTimeout(t)
  }, [clientName, clientDoc, clientPhone, quoteNotes])

  // ─── Fetch de productos ─────────────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setFetchError(false)
    try {
      const response = await api.get('inventory/products/', {
        params: { page, page_size: PAGE_SIZE, search: debouncedSearch || undefined },
      })
      const payload = response.data
      const list = payload?.results || payload
      setProducts(Array.isArray(list) ? list : [])
      setTotalCount(payload?.count || (Array.isArray(list) ? list.length : 0))
    } catch (error) {
      setFetchError(true)
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Settings solo se carga una vez al montar
  useEffect(() => {
    api
      .get('settings/')
      .then((res) => {
        ticketConfigRef.current = res.data
      })
      .catch((err) => console.error('Error loading ticket settings', err))
  }, [])

  // ─── Debounce de búsqueda ───────────────────────────────────────────────────

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(timer)
  }, [search])

  // ─── Cálculos de paginación ─────────────────────────────────────────────────

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount])

  const triggerCartPulse = useCallback(() => {
    clearTimeout(cartPulseTimerRef.current)
    setCartPulse(true)
    cartPulseTimerRef.current = setTimeout(() => setCartPulse(false), 450)
  }, [])

  // ─── Handlers del carrito ───────────────────────────────────────────────────

  const addToCart = useCallback(
    (product) => {
      const qty = multiplier
      setCart((prev) => {
        const exists = prev.find((i) => i.item_type === 'PRODUCTO' && i.product === product.id)
        if (exists) {
          return prev.map((i) =>
            i.item_type === 'PRODUCTO' && i.product === product.id
              ? { ...i, quantity: i.quantity + qty }
              : i,
          )
        }
        return [
          ...prev,
          {
            id: `prod-${product.id}`,
            item_type: 'PRODUCTO',
            product: product.id,
            nombre: product.nombre,
            price: parseFloat(product.precio_venta) || 0,
            quantity: qty,
            discountType: '$',
            discountValue: '',
          },
        ]
      })
      setMultiplier(1)
      setCartAnimKey((k) => k + 1)
      triggerCartPulse()
      if (isMobile) {
        searchInputRef.current?.blur()
      }
    },
    [setCart, triggerCartPulse, multiplier, isMobile],
  )

  const addService = useCallback(() => {
    if (!serviceForm.description || !serviceForm.price) {
      toast.error('Completa descripción y precio')
      return
    }
    addServiceItem(serviceForm.description, serviceForm.price)
    setServiceForm({ description: '', price: '' })
    setShowServiceModal(false)
    setCartAnimKey((k) => k + 1)
    triggerCartPulse()
  }, [serviceForm, addServiceItem, triggerCartPulse])

  const updatePrice = useCallback(
    (id, newPrice) => {
      setCart((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, price: newPrice === '' ? '' : parseFloat(newPrice) } : item,
        ),
      )
    },
    [setCart],
  )

  const updateQuantity = useCallback(
    (id, quantity) => {
      if (quantity === '') {
        setCart((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: '' } : item)))
        return
      }
      const val = parseInt(quantity, 10)
      if (Number.isNaN(val)) return
      const value = Math.max(1, val)
      setCart((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: value } : item)))
    },
    [setCart],
  )

  const handleClearCart = useCallback(() => {
    setShowClearConfirm(true)
  }, [])

  const confirmClearCart = useCallback(() => {
    setShowClearConfirm(false)
    setIsClearingCart(true)
    setTimeout(() => {
      clearCart()
      setClientName('')
      setClientDoc('')
      setClientPhone('')
      setQuoteNotes('')
      localStorage.removeItem('quote_client')
      localStorage.removeItem('quote_client_doc')
      localStorage.removeItem('quote_client_phone')
      localStorage.removeItem('quote_notes')
      setIsClearingCart(false)
    }, 300)
  }, [clearCart])

  // ─── Generar / imprimir presupuesto ─────────────────────────────────────────

  const handleGenerateQuote = useCallback(() => {
    printCommercialQuoteTicket({
      cart,
      clientName,
      clientDoc,
      clientPhone,
      notes: quoteNotes,
      validityDays,
      discount,
      discountType,
      ticketConfig: ticketConfigRef.current,
    })
  }, [cart, clientName, clientDoc, clientPhone, quoteNotes, validityDays, discount, discountType])

  const [downloadingPDF, setDownloadingPDF] = useState(false)

  const handleDownloadQuotePDF = useCallback(async () => {
    setDownloadingPDF(true)
    try {
      await downloadCommercialQuotePdf({
        cart,
        clientName,
        clientDoc,
        clientPhone,
        notes: quoteNotes,
        validityDays,
        discount,
        discountType,
      }, ticketConfigRef.current)
    } finally {
      setDownloadingPDF(false)
    }
  }, [cart, clientName, clientDoc, clientPhone, quoteNotes, validityDays, discount, discountType])

  const handleCopyWhatsApp = useCallback(() => {
    if (!cart.length) return
    const text = getCommercialQuoteWhatsAppText({
      cart,
      clientName,
      clientDoc,
      clientPhone,
      notes: quoteNotes,
      validityDays,
      discount,
      discountType,
    }, ticketConfigRef.current)

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success('Resumen copiado listo para enviar por WhatsApp')
      }).catch(() => {
        toast.info('Texto generado')
      })
    } else {
      toast.info('Texto generado')
    }
  }, [cart, clientName, clientDoc, clientPhone, quoteNotes, validityDays, discount, discountType])

  const previewHtml = useMemo(() => {
    if (!showPreviewModal) return ''
    return buildCommercialQuoteHtml({
      cart,
      clientName,
      clientDoc,
      clientPhone,
      notes: quoteNotes,
      validityDays,
      discount,
      discountType,
    }, ticketConfigRef.current)
  }, [showPreviewModal, cart, clientName, clientDoc, clientPhone, quoteNotes, validityDays, discount, discountType])

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
      } else if (e.key === 'F8') {
        e.preventDefault()
        handleGenerateQuote()
      } else if (e.key === 'Escape' && !showServiceModal) {
        e.preventDefault()
        handleClearCart()
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
      } else if (e.key === 'Enter') {
        if (focusedIndex >= 0 && focusedIndex < products.length) {
          e.preventDefault()
          addToCart(products[focusedIndex])
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    handleGenerateQuote,
    handleClearCart,
    showServiceModal,
    products,
    focusedIndex,
    totalPages,
    addToCart,
  ])

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="pos-shell pos-page quotes-page">
      {/* ── Panel catálogo ── */}
      <div className="catalog-panel">
        <div className="flex-row between">
          <div className="pos-search-wrapper" style={{ position: 'relative', flex: 1 }}>
            <Input
              ref={searchInputRef}
              placeholder="Buscar producto (Presione /)…"
              value={search}
              onChange={(e) => {
                let val = e.target.value
                const match = val.match(/^(\d+)\*(.*)$/)
                if (match) {
                  setMultiplier(parseInt(match[1], 10))
                  val = match[2]
                }
                setSearch(val)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setFocusedIndex((i) => Math.min(products.length - 1, i + 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setFocusedIndex((i) => Math.max(0, i - 1))
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  if (focusedIndex >= 0 && focusedIndex < products.length) {
                    addToCart(products[focusedIndex])
                    setSearch('')
                  } else if (search.length > 0) {
                    api
                      .get('inventory/products/', { params: { search, page_size: 1 } })
                      .then((res) => {
                        const list = res.data.results || res.data
                        if (list.length === 1) {
                          addToCart(list[0])
                          setSearch('')
                        }
                      })
                  }
                }
              }}
              icon={<Search size={18} />}
              suffix={!search && <kbd className="search-kbd">/</kbd>}
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('')
                  if (!isMobile) {
                    searchInputRef.current?.focus()
                  }
                }}
                aria-label="Limpiar búsqueda"
                style={{
                  position: 'absolute',
                  right: multiplier > 1 ? '52px' : '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--slate-400)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                  borderRadius: '50%',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--slate-700)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--slate-400)')}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 1l12 12M13 1L1 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
            {multiplier > 1 && (
              <span
                className="badge badge-primary"
                style={{ position: 'absolute', right: '12px', top: '10px' }}
              >
                {multiplier}x
              </span>
            )}
          </div>
          <Button
            variant="secondary"
            icon={<Wrench size={16} />}
            onClick={() => setShowServiceModal(true)}
          >
            + Servicio
          </Button>
        </div>

        <div
          className="pos-tip-banner"
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            marginTop: '6px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '1rem' }}>💡</span>
          <span>
            Tip: Podés escribir <code>cantidad*</code> (ej: <code>5*coca</code>) en el buscador para
            cargar múltiples unidades.
          </span>
        </div>

        <div className="muted small mb-2">Catálogo (Presupuestos)</div>

        <div className="pos-table-wrapper">
          <div className="table-container">
            <table className="styled-table no-stack pos-catalog-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Código</th>
                  <th>Producto</th>
                  <th className="text-center" style={{ width: '80px', textAlign: 'center' }}>
                    Stock
                  </th>
                  <th className="text-right" style={{ width: '130px', textAlign: 'right' }}>
                    Precio Base
                  </th>
                  <th style={{ width: '56px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan="5">
                        <Skeleton height={20} />
                      </td>
                    </tr>
                  ))
                  : products.map((p, idx) => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      onAdd={addToCart}
                      isFocused={focusedIndex === idx}
                      onMouseEnter={() => {
                        setFocusedIndex(idx)
                        setHoveredProduct(p)
                      }}
                      onMouseLeave={() => {
                        setFocusedIndex((prev) => (prev === idx ? -1 : prev))
                        setHoveredProduct(null)
                      }}
                      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                    />
                  ))}
                {!loading && fetchError && (
                  <tr>
                    <td colSpan="5" className="pos-empty-cell">
                      <div className="pos-empty">
                        <PackageX size={48} style={{ color: 'var(--danger-400)' }} />
                        <p style={{ fontWeight: 600, color: 'var(--danger-600)' }}>
                          No se pudo conectar con el servidor
                        </p>
                        <p className="muted small">Verificá que el backend esté corriendo</p>
                        <button
                          onClick={fetchProducts}
                          style={{
                            marginTop: '12px',
                            padding: '6px 16px',
                            borderRadius: '6px',
                            background: 'var(--primary-600)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Reintentar
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && !fetchError && !products.length && (
                  <tr>
                    <td colSpan="5" className="pos-empty-cell">
                      <div className="pos-empty">
                        <PackageX size={48} />
                        <p>No se encontraron productos</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="pagination pos-pagination">
            <Button
              variant="ghost"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="muted small">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="ghost"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>

      {/* ── Panel carrito Desktop ── */}
      {!isMobile && (
        <div className="cart-panel quote-cart-panel">
          <div
            className="card-head quote-desktop-card-head"
            style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div>
              <p className="eyebrow">Presupuesto activo</p>
              <div className="flex-row gap-sm items-center">
                <h3>Presupuesto</h3>
              </div>
            </div>
            <div className="flex-row items-center gap-sm">
              <div className="badge badge-neutral quote-items-count-badge">
                <Receipt size={15} /> {cartCount} {cartCount === 1 ? 'ítem' : 'ítems'}
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  className="quote-desktop-clear-btn"
                  onClick={handleClearCart}
                  title="Vaciar presupuesto"
                >
                  <Trash2 size={14} />
                  <span>Vaciar</span>
                </button>
              )}
            </div>
          </div>

          <div className="cart-body">
            {!cart.length ? (
              <div className="empty-state">
                <Receipt size={42} className="muted" />
                <p>Agregá productos o servicios al presupuesto</p>
              </div>
            ) : (
              cart.map((item) => (
                <PosCartItem editablePrice={true}
                  key={item.id}
                  item={item}
                  onRemove={removeItem}
                  onUpdatePrice={updatePrice}
                  onUpdateQuantity={updateQuantity}
                  onUpdateDiscount={updateItemDiscount}
                  isClearing={isClearingCart}
                />
              ))
            )}
          </div>

          <div className="cart-footer quote-desktop-cart-footer">
            {/* Cliente */}
            <div className="quote-client-box">
              <User size={16} className="quote-client-icon" />
              <input
                type="text"
                className="quote-client-input"
                placeholder="Nombre del cliente o empresa…"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
              {clientName && (
                <button
                  type="button"
                  className="quote-client-clear-btn"
                  onClick={() => setClientName('')}
                  title="Borrar nombre"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowExtraDetails(!showExtraDetails)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: '4px 2px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <span>{showExtraDetails ? 'Ocultar datos adicionales' : '+ CUIT, Teléfono y Notas'}</span>
              {showExtraDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showExtraDetails && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '6px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <input
                    type="text"
                    className="quote-client-input"
                    style={{ fontSize: '0.78rem', padding: '6px 8px', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '6px' }}
                    placeholder="CUIT o DNI…"
                    value={clientDoc}
                    onChange={(e) => setClientDoc(e.target.value)}
                  />
                  <input
                    type="text"
                    className="quote-client-input"
                    style={{ fontSize: '0.78rem', padding: '6px 8px', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '6px' }}
                    placeholder="Teléfono / WhatsApp…"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
                <textarea
                  className="quote-client-input font-mono"
                  style={{ fontSize: '0.75rem', padding: '6px 8px', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '6px', resize: 'vertical', minHeight: '44px' }}
                  placeholder="Observaciones / Términos de entrega…"
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {/* Descuento Global y Validez */}
            <div className="quote-options-grid">
              <div className="ui-field" style={{ margin: 0 }}>
                <span className="field-label">Descuento Global</span>
                <div className="quote-global-discount-box">
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0"
                    className="quote-global-discount-input"
                  />
                  <button
                    type="button"
                    className="pos-global-discount-type-btn"
                    onClick={() => setDiscountType((prev) => (prev === '$' ? '%' : '$'))}
                    title="Cambiar tipo de descuento ($ / %)"
                    aria-label="Tipo de descuento global"
                  >
                    {discountType}
                  </button>
                </div>
              </div>

              <div className="ui-field" style={{ margin: 0 }}>
                <span className="field-label">Validez</span>
                <div className="field-control">
                  <select
                    value={validityDays}
                    onChange={(e) => setValidityDays(e.target.value)}
                    className="quote-validity-select"
                  >
                    <option value="1">1 Día</option>
                    <option value="7">7 Días</option>
                    <option value="15">15 Días</option>
                    <option value="30">30 Días</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Total Presupuestado Highlight Card */}
            <div className="quote-total-card">
              <div className="quote-total-info">
                <span className="quote-total-label">Total Presupuestado</span>
                <span className="quote-total-validity-badge">
                  Válido por {validityDays} {parseInt(validityDays, 10) === 1 ? 'día' : 'días'}
                </span>
              </div>
              <div className="quote-total-amount">{formatARS(total)}</div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleDownloadQuotePDF}
                  disabled={!cart.length || downloadingPDF}
                  icon={<FileDown size={17} />}
                >
                  {downloadingPDF ? 'Generando…' : 'Descargar PDF A4'}
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setShowPreviewModal(true)}
                  disabled={!cart.length}
                  icon={<Eye size={17} />}
                >
                  Vista Previa
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={handleCopyWhatsApp}
                  disabled={!cart.length}
                  icon={<MessageCircle size={16} />}
                >
                  WhatsApp
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={handleGenerateQuote}
                  disabled={!cart.length}
                  icon={<Printer size={16} />}
                >
                  Ticket [F8]
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal servicio libre ── */}
      {showServiceModal && (
        <Modal
          title="Agregar servicio"
          onClose={() => setShowServiceModal(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowServiceModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={addService}>
                Agregar
              </Button>
            </>
          }
        >
          <Input
            label="Descripción"
            value={serviceForm.description}
            onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Ej. Instalación / Reparación"
          />
          <Input
            label="Precio base"
            type="number"
            value={serviceForm.price}
            onChange={(e) => setServiceForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="0.00"
          />
        </Modal>
      )}

      {/* FAB móvil */}
      {isMobile &&
        !showCartModal &&
        createPortal(
          <button
            className={`pos-cart-fab ${cartPulse ? 'pulse' : ''}`}
            onClick={() => setShowCartModal(true)}
            aria-label="Abrir presupuesto"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="pos-cart-count">{cartCount}</span>}
            <span key={cartAnimKey} className="pos-cart-fly" aria-hidden="true" />
          </button>,
          document.body,
        )}

      {/* Carrito Móvil Bottom Sheet Drawer */}
      {isMobile &&
        showCartModal &&
        createPortal(
          <div
            className="pos-mobile-overlay"
            onClick={() => setShowCartModal(false)}
          >
            <div
              className="pos-mobile-drawer"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Presupuesto"
            >
              {/* Drag Handle Bar */}
              <div className="drawer-handle-bar">
                <span className="drawer-handle-pill" />
              </div>

              {/* Drawer Header */}
              <div className="pos-drawer-header">
                <div className="pos-drawer-title-wrap">
                  <Receipt size={20} className="pos-drawer-icon" />
                  <div className="pos-drawer-title-group">
                    <h3>Presupuesto</h3>
                    <span className="pos-drawer-count-badge">
                      {cartCount} {cartCount === 1 ? 'ítem' : 'ítems'}
                    </span>
                  </div>
                </div>
                <div className="pos-drawer-header-actions">
                  {cart.length > 0 && (
                    <button
                      type="button"
                      className="pos-drawer-clear-btn"
                      onClick={() => setShowClearConfirm(true)}
                      title="Vaciar presupuesto"
                    >
                      <Trash2 size={15} />
                      <span>Vaciar</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="pos-drawer-close-btn"
                    onClick={() => setShowCartModal(false)}
                    aria-label="Cerrar presupuesto"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="pos-drawer-scrollable">
                {/* Section: Products */}
                <div className="pos-drawer-section">
                  <div className="pos-section-header">
                    <span className="pos-section-title">Productos agregados</span>
                    {cart.length > 0 && (
                      <span className="pos-section-sub">
                        {cart.length} {cart.length === 1 ? 'producto' : 'productos'}
                      </span>
                    )}
                  </div>

                  {!cart.length ? (
                    <div className="pos-empty-cart">
                      <Receipt size={44} className="pos-empty-icon" />
                      <p className="pos-empty-text">El presupuesto está vacío</p>
                      <button
                        type="button"
                        className="pos-empty-action-btn"
                        onClick={() => setShowCartModal(false)}
                      >
                        Explorar catálogo
                      </button>
                    </div>
                  ) : (
                    <div className="pos-items-list">
                      {cart.map((item) => (
                        <PosCartItem editablePrice={true}
                          key={item.id}
                          item={item}
                          onRemove={removeItem}
                          onUpdatePrice={updatePrice}
                          onUpdateQuantity={updateQuantity}
                          onUpdateDiscount={updateItemDiscount}
                          isClearing={isClearingCart}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
                  <>
                    {/* Section: Client & Validity */}
                    <div className="pos-drawer-section">
                      <div className="pos-section-header">
                        <span className="pos-section-title flex-row items-center gap-xs">
                          <User size={15} /> Datos del Presupuesto
                        </span>
                      </div>
                      <div className="quote-mobile-drawer-fields">
                        <div className="quote-client-box">
                          <User size={15} className="quote-client-icon" />
                          <input
                            type="text"
                            className="quote-client-input"
                            placeholder="Nombre del cliente (opcional)…"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                          />
                          {clientName && (
                            <button
                              type="button"
                              className="quote-client-clear-btn"
                              onClick={() => setClientName('')}
                              title="Borrar nombre"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowExtraDetails(!showExtraDetails)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            padding: '4px 2px',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          <span>{showExtraDetails ? 'Ocultar datos adicionales' : '+ CUIT, Teléfono y Notas'}</span>
                          {showExtraDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {showExtraDetails && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                              <input
                                type="text"
                                className="quote-client-input"
                                style={{ fontSize: '0.78rem', padding: '6px 8px', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '6px' }}
                                placeholder="CUIT o DNI…"
                                value={clientDoc}
                                onChange={(e) => setClientDoc(e.target.value)}
                              />
                              <input
                                type="text"
                                className="quote-client-input"
                                style={{ fontSize: '0.78rem', padding: '6px 8px', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '6px' }}
                                placeholder="Teléfono / WhatsApp…"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                              />
                            </div>
                            <textarea
                              className="quote-client-input font-mono"
                              style={{ fontSize: '0.75rem', padding: '6px 8px', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '6px', resize: 'vertical', minHeight: '44px' }}
                              placeholder="Observaciones / Términos de entrega…"
                              value={quoteNotes}
                              onChange={(e) => setQuoteNotes(e.target.value)}
                              rows={2}
                            />
                          </div>
                        )}

                        <div className="ui-field" style={{ margin: 0 }}>
                          <span className="field-label">Validez del presupuesto</span>
                          <div className="field-control">
                            <select
                              value={validityDays}
                              onChange={(e) => setValidityDays(e.target.value)}
                              className="quote-validity-select"
                            >
                              <option value="1">1 Día</option>
                              <option value="7">7 Días</option>
                              <option value="15">15 Días</option>
                              <option value="30">30 Días</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section: Global Discount */}
                    <div className="pos-drawer-section pos-discount-section">
                      <div className="pos-section-header">
                        <span className="pos-section-title flex-row items-center gap-xs">
                          <Tag size={15} /> Descuento Global
                        </span>
                      </div>
                      <div className="pos-global-discount-box">
                        <input
                          type="number"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          placeholder="Monto de descuento (0)"
                          className="pos-global-discount-input"
                        />
                        <button
                          type="button"
                          className="pos-global-discount-type-btn"
                          onClick={() => setDiscountType((prev) => (prev === '$' ? '%' : '$'))}
                          title="Cambiar tipo de descuento ($ / %)"
                          aria-label="Tipo de descuento global"
                        >
                          {discountType}
                        </button>
                      </div>
                    </div>

                    {/* Section: Summary Breakdown */}
                    <div className="pos-drawer-section pos-summary-section">
                      <div className="pos-summary-row">
                        <span>Subtotal</span>
                        <span>{formatARS(subtotal)}</span>
                      </div>
                      {discount && parseFloat(discount) > 0 && (
                        <div className="pos-summary-row discount">
                          <span>
                            Descuento global (
                            {discountType === '%' ? `${discount}%` : formatARS(discount)})
                          </span>
                          <span>-{formatARS(subtotal - total)}</span>
                        </div>
                      )}
                      <div className="pos-summary-row total">
                        <span>Total presupuestado</span>
                        <span className="pos-total-highlight">{formatARS(total)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Docked Sticky Bottom Bar */}
              <div className="pos-drawer-docked-footer">
                <div className="pos-docked-total-row">
                  <div className="pos-docked-total-info">
                    <span className="pos-docked-label">Total presupuestado</span>
                    <span className="pos-docked-amount">{formatARS(total)}</span>
                  </div>
                  <span className="pos-docked-method-badge">
                    Validez: {validityDays}d
                  </span>
                </div>
                <div className="quote-mobile-docked-actions">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleDownloadQuotePDF}
                    disabled={!cart.length || downloadingPDF}
                    icon={<FileDown size={17} />}
                    className="pos-docked-submit-btn"
                  >
                    {downloadingPDF ? 'Generando…' : 'Descargar A4'}
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      setShowCartModal(false)
                      setShowPreviewModal(true)
                    }}
                    disabled={!cart.length}
                    icon={<Eye size={17} />}
                    className="pos-docked-submit-btn"
                  >
                    Vista Previa
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={handleCopyWhatsApp}
                    disabled={!cart.length}
                    icon={<MessageCircle size={16} />}
                  >
                    WhatsApp
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={handleGenerateQuote}
                    disabled={!cart.length}
                    icon={<Printer size={16} />}
                  >
                    Ticket
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <ConfirmModal
        isOpen={showClearConfirm}
        title="Vaciar presupuesto"
        message="¿Seguro que deseas vaciar el presupuesto actual?"
        confirmLabel="Vaciar"
        variant="danger"
        onConfirm={confirmClearCart}
        onClose={() => setShowClearConfirm(false)}
      />

      {!window.matchMedia('(pointer: coarse)').matches &&
        hoveredProduct &&
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
                    backgroundColor: 'white',
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
      {/* ── Modal Vista Previa Presupuesto A4 ── */}
      {showPreviewModal && (
        <Modal
          title="Vista Previa de Presupuesto A4"
          onClose={() => setShowPreviewModal(false)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button variant="ghost" onClick={() => setShowPreviewModal(false)}>
                Cerrar
              </Button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={handleCopyWhatsApp} icon={<MessageCircle size={16} />}>
                  Copiar WhatsApp
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    handleDownloadQuotePDF()
                    setShowPreviewModal(false)
                  }}
                  disabled={downloadingPDF}
                  icon={<FileDown size={16} />}
                >
                  {downloadingPDF ? 'Descargando…' : 'Descargar PDF A4'}
                </Button>
              </div>
            </div>
          }
        >
          <div
            style={{
              maxHeight: '68vh',
              overflowY: 'auto',
              padding: '16px',
              background: '#f1f5f9',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                borderRadius: '6px',
                overflow: 'hidden',
                background: '#ffffff',
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Quotes
