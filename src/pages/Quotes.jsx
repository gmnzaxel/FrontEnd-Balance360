import React, { useCallback, useEffect, useMemo, useState, useRef, memo } from 'react'
import { createPortal } from 'react-dom'
import useCart from '../hooks/useCart'
import useMediaQuery from '../hooks/useMediaQuery'
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

const loadHtml2Pdf = () => {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) {
      resolve(window.html2pdf)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
    script.onload = () => resolve(window.html2pdf)
    script.onerror = (err) => reject(err)
    document.body.appendChild(script)
  })
}

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

const QuoteCartItem = memo(
  ({ item, onRemove, onUpdatePrice, onUpdateDiscount, onUpdateQuantity, isClearing }) => {
    const qty = parseInt(item.quantity, 10) || 1
    const price = parseFloat(item.price) || 0
    const sub = price * qty
    const dv = parseFloat(item.discountValue)
    const discountAmount =
      !item.discountValue || isNaN(dv)
        ? 0
        : item.discountType === '%'
          ? sub * (dv / 100)
          : dv
    const itemTotal = Math.max(0, sub - discountAmount)

    return (
      <div className={`pos-cart-item ${isClearing ? 'clearing' : ''}`}>
        <div className="pos-item-header">
          <div className="pos-item-info">
            <span className="pos-item-name" title={item.nombre}>
              {item.nombre}
            </span>
            {qty > 1 && (
              <span className="pos-item-unit-tag">
                ({formatARS(price)} c/u)
              </span>
            )}
            {item.item_type === 'SERVICIO' && (
              <span className="pos-item-badge">Servicio</span>
            )}
          </div>
          <button
            type="button"
            className="pos-item-delete"
            onClick={() => onRemove(item.id)}
            aria-label="Eliminar ítem"
            title="Eliminar"
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div className="pos-item-controls-row">
          {/* Stepper */}
          <div className="pos-stepper-wrap">
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.id, qty - 1)}
              disabled={qty <= 1}
              className="pos-stepper-btn"
              aria-label="Disminuir cantidad"
            >
              -
            </button>
            <input
              type="number"
              value={item.quantity}
              onChange={(e) =>
                onUpdateQuantity(
                  item.id,
                  e.target.value === '' ? '' : parseInt(e.target.value, 10),
                )
              }
              className="pos-stepper-input"
              aria-label="Cantidad"
            />
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.id, qty + 1)}
              className="pos-stepper-btn"
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>

          {/* Editable Unit Price Pill */}
          <div className="quote-item-price-edit-wrap" title="Precio unitario (haga clic para editar)">
            <span className="quote-price-symbol">$</span>
            <input
              type="number"
              value={item.price}
              onChange={(e) => onUpdatePrice(item.id, e.target.value)}
              className="quote-price-input"
              placeholder="0.00"
              aria-label="Precio unitario"
            />
          </div>

          {/* Item Discount Inline */}
          <div className="pos-item-discount-wrap">
            <span className="pos-discount-label">Desc:</span>
            <input
              type="number"
              className="pos-discount-input"
              value={item.discountValue || ''}
              onChange={(e) =>
                onUpdateDiscount(item.id, e.target.value, item.discountType || '$')
              }
              placeholder="0"
              aria-label="Descuento"
            />
            <button
              type="button"
              className="pos-discount-type-btn"
              onClick={() =>
                onUpdateDiscount(
                  item.id,
                  item.discountValue || '',
                  (item.discountType || '$') === '$' ? '%' : '$',
                )
              }
              title="Cambiar tipo de descuento ($ / %)"
              aria-label="Tipo de descuento"
            >
              {item.discountType || '$'}
            </button>
          </div>

          {/* Subtotal */}
          <div className="pos-item-price-wrap">
            <span className="pos-item-subtotal">{formatARS(itemTotal)}</span>
          </div>
        </div>
      </div>
    )
  },
)
QuoteCartItem.displayName = 'QuoteCartItem'

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

  // Persistencia de clientName con debounce
  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem('quote_client', clientName), 500)
    return () => clearTimeout(t)
  }, [clientName])

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
    },
    [setCart, triggerCartPulse, multiplier],
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
      setIsClearingCart(false)
    }, 300)
  }, [clearCart])

  // ─── Generar / imprimir presupuesto ─────────────────────────────────────────

  const handleGenerateQuote = useCallback(() => {
    if (!cart.length) {
      toast.warning('El presupuesto está vacío')
      return
    }
    const invalidItem = cart.find((item) => !item.quantity || parseInt(item.quantity, 10) <= 0)
    if (invalidItem) {
      toast.warning(`La cantidad para el producto "${invalidItem.nombre}" debe ser mayor a 0.`)
      return
    }

    const branchName = ticketConfigRef.current?.branch_name || 'TU NEGOCIO'
    const headerText = ticketConfigRef.current?.ticket_header || 'BALANCE 360'
    const address = ticketConfigRef.current?.ticket_address
    const cuit = ticketConfigRef.current?.ticket_cuit
    const iibb = ticketConfigRef.current?.ticket_iibb
    const iva = ticketConfigRef.current?.ticket_iva
    const phone = ticketConfigRef.current?.ticket_phone
    const email = ticketConfigRef.current?.ticket_email
    const dateStr = new Date().toLocaleString('es-AR', { hour12: false })
    const logoDataUrl =
      ticketConfigRef.current?.ticket_logo || localStorage.getItem('ticket_logo') || ''
    const ticketWidth = ticketConfigRef.current?.ticket_width || '58mm'
    const is58mm = ticketWidth === '58mm'

    // Lógica de descuentos para presupuesto
    const itemsBaseSubtotal = cart.reduce(
      (acc, item) => acc + (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1),
      0,
    )
    const itemsDiscountTotal = cart.reduce((acc, item) => {
      const baseSub = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1)
      const dv = parseFloat(item.discountValue)
      const descItem =
        !item.discountValue || isNaN(dv) ? 0 : item.discountType === '%' ? baseSub * (dv / 100) : dv
      return acc + descItem
    }, 0)
    const globalDiscount = (() => {
      const currentSub = itemsBaseSubtotal - itemsDiscountTotal
      const dv = parseFloat(discount)
      if (isNaN(dv) || dv <= 0) return 0
      return discountType === '%' ? currentSub * (dv / 100) : dv
    })()
    const totalDiscount = itemsDiscountTotal + globalDiscount
    const finalTotal = itemsBaseSubtotal - totalDiscount

    const htmlContent = `
      <html>
        <head>
          <title>Presupuesto${clientName ? ` - ${clientName}` : ''}</title>
          <meta charset="UTF-8">
          <style>
            @media print {
              @page {
                size: ${ticketWidth} auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: ${is58mm ? '1mm 2.5mm' : '2mm 4mm'};
              }
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              width: ${ticketWidth};
              max-width: ${ticketWidth};
              margin: 0 auto;
              padding: ${is58mm ? '1mm 2.5mm' : '2mm 4mm'};
              font-size: ${is58mm ? '11px' : '12px'};
              box-sizing: border-box;
              color: #000;
            }
            .header {
              text-align: center;
              margin-bottom: 8px;
              border-bottom: 1px dashed #000;
              padding-bottom: 8px;
            }
            .branch-title {
              font-size: ${is58mm ? '14px' : '16px'};
              font-weight: bold;
              text-transform: uppercase;
            }
            .company {
              font-size: ${is58mm ? '10px' : '11px'};
              color: #000;
              margin-bottom: 4px;
              white-space: pre-wrap;
            }
            .info {
              font-size: ${is58mm ? '9px' : '10px'};
              margin-bottom: 3px;
              color: #000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8px;
            }
            th {
              text-align: left;
              border-bottom: 1px solid #000;
              font-size: ${is58mm ? '10px' : '12px'};
              color: #000;
            }
            td {
              padding: 3px 0;
              color: #000;
            }
            .text-right {
              text-align: right;
            }
            .totals {
              border-top: 1px dashed #000;
              padding-top: 6px;
              margin-top: 4px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
              font-size: ${is58mm ? '11px' : '12px'};
              color: #000;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: ${is58mm ? '9px' : '10px'};
              white-space: pre-wrap;
              color: #000;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display:flex;align-items:center;justify-content:center;gap:12px;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px;">
              ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" style="max-height:${is58mm ? '35px' : '44px'};max-width:${is58mm ? '50px' : '60px'};object-fit:contain;flex-shrink:0;" />` : ''}
              <div class="branch-title">${branchName}</div>
            </div>
            <div class="company">${headerText}</div>
            ${address ? `<div class="info">Dirección: ${address}</div>` : ''}
            ${cuit ? `<div class="info">CUIT: ${cuit}</div>` : ''}
            ${iibb ? `<div class="info">IIBB: ${iibb}</div>` : ''}
            ${iva ? `<div class="info">IVA: ${iva}</div>` : ''}
            ${phone ? `<div class="info">Tel: ${phone}</div>` : ''}
            ${email ? `<div class="info">Email: ${email}</div>` : ''}
            <div class="info">Validez: ${validityDays} días</div>
            ${clientName ? `<div class="info">Cliente: ${clientName}</div>` : ''}
            <div class="info">Fecha: ${dateStr}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: ${is58mm ? '50%' : '55%'};">Producto</th>
                <th class="text-right" style="width: 20%;">Cant</th>
                <th class="text-right" style="width: 30%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${cart
                .map((item) => {
                  const baseSub = (parseFloat(item.price) || 0) * item.quantity
                  const dv = parseFloat(item.discountValue)
                  const descItem =
                    !item.discountValue || isNaN(dv)
                      ? 0
                      : item.discountType === '%'
                        ? baseSub * (dv / 100)
                        : dv
                  const itemPrice = parseFloat(item.price) || 0
                  const itemLabel = item.nombre || 'Producto'

                  if (is58mm) {
                    return `
                    <tr>
                      <td colspan="3" style="font-weight: bold; font-size: 11px; padding-top: 4px;">${itemLabel}</td>
                    </tr>
                    <tr style="border-bottom: 1px dashed #eee;">
                      <td style="font-size: 10px; color: #000; padding-bottom: 4px; padding-left: 5px;">
                        $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        ${item.quantity > 1 ? ` x ${item.quantity}` : ''}
                        ${descItem > 0 ? `<span style="font-weight: bold; text-decoration: underline; margin-left: 4px;">(Desc. -$${descItem.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>` : ''}
                      </td>
                      <td class="text-right" style="vertical-align: top; font-size: 10px; color: #000; padding-bottom: 4px;">${item.quantity}</td>
                      <td class="text-right" style="vertical-align: top; font-size: 11px; font-weight: bold; padding-bottom: 4px;">$${(baseSub - descItem).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    </tr>
                  `
                  } else {
                    return `
                    <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 4px 0;">
                        <div style="font-weight: bold;">${itemLabel}</div>
                        ${
                          descItem > 0
                            ? `
                          <div style="font-size: 10px; color: #000; margin-top: 2px;">
                            Precio: $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            ${item.quantity > 1 ? ` x ${item.quantity} un.` : ''}
                            <span style="font-weight: bold; margin-left: 6px; text-decoration: underline;">(Desc. -$${descItem.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>
                          </div>
                        `
                            : `
                          <div style="font-size: 10px; color: #000; margin-top: 2px;">
                            Precio: $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                        `
                        }
                      </td>
                      <td class="text-right" style="vertical-align: top; padding: 4px 0;">${item.quantity}</td>
                      <td class="text-right" style="vertical-align: top; padding: 4px 0;">$${(baseSub - descItem).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    </tr>
                  `
                  }
                })
                .join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="row">
              <span>Subtotal:</span>
              <span>$${itemsBaseSubtotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            ${
              totalDiscount > 0
                ? `
            <div class="row">
              <span>Descuento:</span>
              <span>-$${totalDiscount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>`
                : ''
            }
            <div class="row" style="font-weight: bold; font-size: ${is58mm ? '13px' : '14px'}; margin-top: 5px; border-top: 1px solid #000; padding-top: 3px;">
              <span>TOTAL PREVISTO:</span>
              <span>$${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          <div class="footer">
            <p>Los precios pueden estar sujetos a modificaciones sin previo aviso luego de su expiración.</p>
          </div>
        </body>
      </html>
    `

    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0px'
    iframe.style.height = '0px'
    iframe.style.border = 'none'
    iframe.style.top = '-9999px'
    iframe.style.left = '-9999px'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(htmlContent)
    doc.close()

    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 300)
  }, [cart, discount, discountType, validityDays, clientName])

  const [downloadingPDF, setDownloadingPDF] = useState(false)

  const handleDownloadQuotePDF = useCallback(async () => {
    if (!cart.length) {
      toast.warning('El presupuesto está vacío')
      return
    }
    const invalidItem = cart.find((item) => !item.quantity || parseInt(item.quantity, 10) <= 0)
    if (invalidItem) {
      toast.warning(`La cantidad para el producto "${invalidItem.nombre}" debe ser mayor a 0.`)
      return
    }
    setDownloadingPDF(true)

    const branchName = ticketConfigRef.current?.branch_name || 'TU NEGOCIO'
    const headerText = ticketConfigRef.current?.ticket_header || 'BALANCE 360'
    const address = ticketConfigRef.current?.ticket_address
    const cuit = ticketConfigRef.current?.ticket_cuit
    const iibb = ticketConfigRef.current?.ticket_iibb
    const iva = ticketConfigRef.current?.ticket_iva
    const phone = ticketConfigRef.current?.ticket_phone
    const email = ticketConfigRef.current?.ticket_email
    const dateStr = new Date().toLocaleString('es-AR', { hour12: false })
    const logoDataUrl =
      ticketConfigRef.current?.ticket_logo || localStorage.getItem('ticket_logo') || ''

    // Lógica de descuentos para presupuesto en PDF
    const itemsBaseSubtotal = cart.reduce(
      (acc, item) => acc + (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1),
      0,
    )
    const itemsDiscountTotal = cart.reduce((acc, item) => {
      const baseSub = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1)
      const dv = parseFloat(item.discountValue)
      const descItem =
        !item.discountValue || isNaN(dv) ? 0 : item.discountType === '%' ? baseSub * (dv / 100) : dv
      return acc + descItem
    }, 0)
    const globalDiscount = (() => {
      const currentSub = itemsBaseSubtotal - itemsDiscountTotal
      const dv = parseFloat(discount)
      if (isNaN(dv) || dv <= 0) return 0
      return discountType === '%' ? currentSub * (dv / 100) : dv
    })()
    const totalDiscount = itemsDiscountTotal + globalDiscount
    const finalTotal = itemsBaseSubtotal - totalDiscount

    const htmlContent = `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 20px; font-size: 11px; box-sizing: border-box; background: white; color: #1e293b; line-height: 1.5;">
        <!-- Header Grid -->
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px;">
          <!-- Left: Logo & Business Details -->
          <div style="display: flex; align-items: flex-start; gap: 15px;">
            ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" style="max-height: 60px; max-width: 90px; object-fit: contain;" />` : ''}
            <div>
              <h1 style="font-size: 20px; font-weight: 800; margin: 0; text-transform: uppercase; color: #0f172a; letter-spacing: -0.5px;">${branchName}</h1>
              <p style="font-size: 11px; color: #64748b; margin: 4px 0 6px 0; white-space: pre-wrap; max-width: 320px;">${headerText}</p>
              <div style="font-size: 10px; color: #475569; display: flex; flex-direction: column; gap: 2px;">
                ${address ? `<div>Dirección: ${address}</div>` : ''}
                ${phone ? `<div>Teléfono: ${phone}</div>` : ''}
                ${email ? `<div>Email: ${email}</div>` : ''}
              </div>
            </div>
          </div>
          <!-- Right: Document Info & Legal details -->
          <div style="text-align: right;">
            <h2 style="font-size: 12px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Presupuesto Valorado</h2>
            <div style="font-size: 10px; color: #475569; display: flex; flex-direction: column; gap: 3px; align-items: flex-end; margin-top: 6px;">
              ${cuit ? `<div><strong>CUIT:</strong> ${cuit}</div>` : ''}
              ${iibb ? `<div><strong>Ingresos Brutos:</strong> ${iibb}</div>` : ''}
              ${iva ? `<div><strong>Cond. IVA:</strong> ${iva}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- Info bar: Date, Client, Validity -->
        <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 25px; font-size: 10px; color: #334155;">
          <div>
            <strong>Fecha:</strong> ${dateStr}
          </div>
          ${
            clientName
              ? `
          <div>
            <strong>Cliente:</strong> ${clientName}
          </div>`
              : ''
          }
          <div>
            <strong>Validez:</strong> ${validityDays} días
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px;">
          <thead>
            <tr style="background: #0f172a; color: white;">
              <th style="text-align: left; padding: 8px 10px; border-top-left-radius: 6px; border-bottom-left-radius: 6px; font-weight: 600;">Detalle / Producto</th>
              <th style="text-align: right; padding: 8px 10px; font-weight: 600; width: 15%;">Precio Unit.</th>
              <th style="text-align: right; padding: 8px 10px; font-weight: 600; width: 10%;">Cant.</th>
              <th style="text-align: right; padding: 8px 10px; font-weight: 600; width: 15%;">Descuento</th>
              <th style="text-align: right; padding: 8px 10px; border-top-right-radius: 6px; border-bottom-right-radius: 6px; font-weight: 600; width: 18%;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${cart
              .map((item) => {
                const baseSub = (parseFloat(item.price) || 0) * item.quantity
                const dv = parseFloat(item.discountValue)
                const descItem =
                  !item.discountValue || isNaN(dv)
                    ? 0
                    : item.discountType === '%'
                      ? baseSub * (dv / 100)
                      : dv
                const lineTotal = baseSub - descItem
                return `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 10px; text-align: left; vertical-align: middle; font-weight: 500; color: #1e293b;">${item.nombre}</td>
                <td style="padding: 8px 10px; text-align: right; vertical-align: middle; color: #475569;">$${(parseFloat(item.price) || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td style="padding: 8px 10px; text-align: right; vertical-align: middle; color: #475569;">${item.quantity}</td>
                <td style="padding: 8px 10px; text-align: right; vertical-align: middle; color: #ef4444;">${descItem > 0 ? `-$${descItem.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'}</td>
                <td style="padding: 8px 10px; text-align: right; vertical-align: middle; font-weight: 700; color: #0f172a;">$${lineTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              </tr>
            `
              })
              .join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="display: flex; justify-content: flex-end; margin-top: 10px; margin-bottom: 30px;">
          <table style="border-collapse: collapse; font-size: 11px; min-width: 240px;">
            <tr>
              <td style="padding: 5px 10px; color: #64748b;">Subtotal</td>
              <td style="padding: 5px 10px; text-align: right; font-weight: 600; color: #334155;">$${itemsBaseSubtotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            </tr>
            ${
              totalDiscount > 0
                ? `
            <tr>
              <td style="padding: 5px 10px; color: #ef4444;">Descuento Total</td>
              <td style="padding: 5px 10px; text-align: right; font-weight: 600; color: #ef4444;">-$${totalDiscount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            </tr>`
                : ''
            }
            <tr style="border-top: 2px solid #0f172a;">
              <td style="padding: 8px 10px; font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase;">Total Previsto</td>
              <td style="padding: 8px 10px; text-align: right; font-size: 14px; font-weight: 800; color: #0284c7;">$${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 15px; font-size: 9px; color: #64748b; white-space: pre-wrap; line-height: 1.6;">
          <p style="margin: 0;">Los precios pueden estar sujetos a modificaciones sin previo aviso luego de su expiración.</p>
        </div>
      </div>
    `

    try {
      const html2pdf = await loadHtml2Pdf()
      const element = document.createElement('div')
      element.innerHTML = htmlContent
      const opt = {
        margin: 15,
        filename: `Presupuesto_${clientName ? clientName.replace(/\s+/g, '_') : 'Cliente'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }
      await html2pdf().from(element).set(opt).save()
    } catch (error) {
      console.error('html2pdf failed, attempting native print fallback:', error)
      try {
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(htmlContent)
          printWindow.document.close()
          printWindow.focus()
          setTimeout(() => {
            printWindow.print()
          }, 300)
          toast.info('Se abrió el diálogo de impresión nativo para Guardar como PDF.')
        } else {
          toast.error(
            'Error al generar el PDF. Verifique su conexión o permita ventanas emergentes.',
          )
        }
      } catch (fallbackErr) {
        console.error('Fallback print error:', fallbackErr)
        toast.error('Error al generar el PDF')
      }
    } finally {
      setDownloadingPDF(false)
    }
  }, [cart, discount, discountType, validityDays, clientName])

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
                  searchInputRef.current?.focus()
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
                <QuoteCartItem
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
            <div className="quote-action-buttons-row">
              <Button
                variant="primary"
                fullWidth
                onClick={handleGenerateQuote}
                disabled={!cart.length}
                icon={<Printer size={17} />}
              >
                Imprimir [F8]
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={handleDownloadQuotePDF}
                disabled={!cart.length || downloadingPDF}
                icon={<FileDown size={17} />}
              >
                {downloadingPDF ? 'Descargando…' : 'PDF'}
              </Button>
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
                        <QuoteCartItem
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
                    onClick={handleGenerateQuote}
                    disabled={!cart.length}
                    icon={<Printer size={18} />}
                    className="pos-docked-submit-btn"
                  >
                    Imprimir
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={handleDownloadQuotePDF}
                    disabled={!cart.length || downloadingPDF}
                    icon={<FileDown size={18} />}
                    className="pos-docked-submit-btn"
                  >
                    {downloadingPDF ? 'Descargando…' : 'PDF'}
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
    </div>
  )
}

export default Quotes
