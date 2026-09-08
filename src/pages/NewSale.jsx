import React, { useCallback, useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import useMediaQuery from '../hooks/useMediaQuery'
import useCart from '../hooks/useCart'
import {
  Search,
  ShoppingCart,
  Tag,
  CreditCard,
  Trash2,
  Wrench,
  PackageX,
  Printer,
  FileDown,
  ArrowRightLeft,
  Layers,
  X,
  Check,
} from 'lucide-react'
import api from '../api/axios'
import { toast } from 'react-toastify'
import { getErrorMessage } from '../utils/errorUtils'
import { formatARS } from '../utils/format'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'
import Skeleton from '../components/ui/Skeleton'
import ConfirmModal from '../components/ui/ConfirmModal'
import { loadHtml2Pdf } from '../utils/pdfUtils'

const PAGE_SIZE = 12

const PosCartItem = React.memo(
  ({ item, onRemove, onUpdateQuantity, onUpdateDiscount, isClearing }) => {
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

          {/* Item Discount Inline */}
          <div className="pos-item-discount-wrap">
            <span className="pos-discount-label">Desc:</span>
            <input
              type="number"
              className="pos-discount-input"
              value={item.discountValue ?? ''}
              style={{
                width: `${Math.max(2.2, (String(item.discountValue ?? '').length || 1) + 0.4)}ch`,
              }}
              onChange={(e) =>
                onUpdateDiscount(item.id, e.target.value, item.discountType || '$')
              }
              placeholder="0"
              min="0"
              step="any"
              aria-label="Descuento unitario"
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
PosCartItem.displayName = 'PosCartItem'

const PaymentSection = ({
  isSplitPayment,
  setIsSplitPayment,
  paymentMethod,
  setPaymentMethod,
  splitMethod1,
  setSplitMethod1,
  splitAmount1,
  setSplitAmount1,
  splitMethod2,
  setSplitMethod2,
  splitAmount2,
  setSplitAmount2,
  total,
  amountPaid,
  setAmountPaid,
}) => {
  const a1Num = parseFloat(splitAmount1) || 0
  const a2Num = parseFloat(splitAmount2) || 0
  const splitTotalAssigned = Number((a1Num + a2Num).toFixed(2))
  const splitDiff = Number((total - splitTotalAssigned).toFixed(2))
  const isSplitCovered = Math.abs(splitDiff) <= 0.01 && a1Num > 0 && a2Num > 0

  const pct1 = total > 0 ? Math.min(100, Math.max(0, Math.round((a1Num / total) * 100))) : 50
  const pct2 = total > 0 ? Math.min(100, Math.max(0, 100 - pct1)) : 50

  const paidNum = parseFloat(amountPaid) || 0
  const change = Number((paidNum - total).toFixed(2))
  const isCashCovered = paidNum >= total && total > 0

  // Quick cash bill chips
  const quickBills = [
    { label: 'Exacto', value: total },
    { label: '+$1.000', add: 1000 },
    { label: '+$2.000', add: 2000 },
    { label: '+$5.000', add: 5000 },
    { label: '+$10.000', add: 10000 },
    { label: '+$20.000', add: 20000 },
  ]

  const handleQuickCash = (bill) => {
    if (bill.value !== undefined) {
      setAmountPaid(bill.value > 0 ? bill.value.toString() : '')
    } else if (bill.add !== undefined) {
      const current = parseFloat(amountPaid) || 0
      setAmountPaid((current + bill.add).toString())
    }
  }

  return (
    <div className="pos-payment-box">
      <div className="pos-payment-header">
        <span className="pos-payment-title">Método de pago</span>
        <button
          type="button"
          onClick={() => {
            const next = !isSplitPayment
            setIsSplitPayment(next)
            if (next) {
              setPaymentMethod('MIXTO')
              if (!splitMethod1) setSplitMethod1('EFECTIVO')
              if (!splitMethod2) setSplitMethod2('TRANSFERENCIA')
              if (!splitAmount1 && total > 0) {
                const half = Number((total / 2).toFixed(2))
                setSplitAmount1(half)
                setSplitAmount2(Number((total - half).toFixed(2)))
              }
            } else {
              setPaymentMethod('')
              setSplitMethod1('')
              setSplitAmount1('')
              setSplitMethod2('')
              setSplitAmount2('')
            }
          }}
          className={`pos-payment-toggle ${isSplitPayment ? 'active' : ''}`}
        >
          <ArrowRightLeft size={13} />
          {isSplitPayment ? '2 Métodos (Activo)' : 'Dividir en 2'}
        </button>
      </div>

      {!isSplitPayment ? (
        <div className="pos-single-payment-view">
          <div className="pos-select-wrap">
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value)
                if (e.target.value !== 'EFECTIVO') setAmountPaid('')
              }}
              className="pos-payment-select"
            >
              <option value="" disabled>
                -- Seleccionar método de pago --
              </option>
              <option value="EFECTIVO">💵 Efectivo</option>
              <option value="TRANSFERENCIA">🏦 Transferencia</option>
              <option value="DEBITO">💳 Tarjeta Débito</option>
              <option value="CREDITO">💳 Tarjeta Crédito</option>
              <option value="OTRO">⚡ Otro</option>
            </select>
          </div>

          {paymentMethod === 'EFECTIVO' && (
            <div className="pos-cash-calculator-card">
              <div className="pos-cash-input-row">
                <div className="pos-cash-field">
                  <label className="pos-cash-label">Paga con</label>
                  <div className="pos-cash-input-wrap">
                    <span className="pos-currency-symbol">$</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder={total > 0 ? total.toString() : '0.00'}
                      className="pos-cash-input"
                    />
                    {amountPaid && (
                      <button
                        type="button"
                        onClick={() => setAmountPaid('')}
                        className="pos-cash-clear"
                        title="Limpiar monto"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <div className="pos-cash-vuelto-box">
                  <span className="pos-vuelto-label">
                    {isCashCovered ? 'Vuelto a entregar' : paidNum > 0 ? 'Falta cubrir' : 'Vuelto'}
                  </span>
                  <div
                    className={`pos-vuelto-amount ${isCashCovered ? 'covered' : paidNum > 0 ? 'lacking' : 'empty'
                      }`}
                  >
                    {isCashCovered
                      ? formatARS(change)
                      : paidNum > 0
                        ? formatARS(total - paidNum)
                        : '$0,00'}
                  </div>
                </div>
              </div>

              {/* Quick Cash Chips */}
              <div className="pos-quick-bills-wrap">
                <span className="pos-quick-bills-label">Billetes rápidos:</span>
                <div className="pos-quick-bills-grid">
                  {quickBills.map((b, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickCash(b)}
                      className="pos-quick-bill-chip"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="pos-split-payment-view">
          {/* Progress / Distribution Bar */}
          <div className="pos-split-progress-box">
            <div className="pos-split-progress-header">
              <span>Distribución del pago</span>
              <span
                key={isSplitCovered ? 'covered' : splitDiff > 0 ? 'lacking' : 'excess'}
                className={`pos-split-status-badge ${isSplitCovered ? 'covered' : splitDiff > 0 ? 'lacking' : 'excess'
                  }`}
              >
                {isSplitCovered
                  ? '✓ 100% Cubierto'
                  : splitDiff > 0
                    ? `Falta ${formatARS(splitDiff)}`
                    : `Excede ${formatARS(Math.abs(splitDiff))}`}
              </span>
            </div>
            <div className="pos-split-progress-track">
              <div className="pos-split-fill-1" style={{ width: `${pct1}%` }} />
              <div className="pos-split-fill-2" style={{ width: `${pct2}%` }} />
            </div>
          </div>

          {/* Método 1 */}
          <div className="pos-split-card pos-split-card-1">
            <div className="pos-split-card-header">
              <span className="pos-split-card-title">1° Método ({pct1}%)</span>
              <button
                type="button"
                onClick={() => {
                  const half = Number((total / 2).toFixed(2))
                  setSplitAmount1(half)
                  setSplitAmount2(Number((total - half).toFixed(2)))
                }}
                className="pos-split-action-btn"
              >
                Dividir 50%
              </button>
            </div>
            <div className="pos-split-card-grid">
              <select
                value={splitMethod1}
                onChange={(e) => setSplitMethod1(e.target.value)}
                className="pos-split-select"
              >
                <option value="" disabled>
                  Seleccione método
                </option>
                <option value="EFECTIVO">💵 Efectivo</option>
                <option value="TRANSFERENCIA">🏦 Transferencia</option>
                <option value="DEBITO">💳 Tarjeta Débito</option>
                <option value="CREDITO">💳 Tarjeta Crédito</option>
                <option value="OTRO">⚡ Otro</option>
              </select>
              <div className="pos-split-amount-wrap">
                <span className="pos-currency-symbol">$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={splitAmount1}
                  onChange={(e) => {
                    const val = e.target.value
                    setSplitAmount1(val)
                    const n = parseFloat(val) || 0
                    if (n <= total) {
                      setSplitAmount2(Math.max(0, Number((total - n).toFixed(2))))
                    }
                  }}
                  className="pos-split-amount-input"
                />
              </div>
            </div>
          </div>

          {/* Método 2 */}
          <div className="pos-split-card pos-split-card-2">
            <div className="pos-split-card-header">
              <span className="pos-split-card-title">2° Método ({pct2}%)</span>
              {splitDiff !== 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const m1 = parseFloat(splitAmount1) || 0
                    setSplitAmount2(Math.max(0, Number((total - m1).toFixed(2))))
                  }}
                  className="pos-split-action-btn"
                >
                  Completar restante
                </button>
              )}
            </div>
            <div className="pos-split-card-grid">
              <select
                value={splitMethod2}
                onChange={(e) => setSplitMethod2(e.target.value)}
                className="pos-split-select"
              >
                <option value="" disabled>
                  Seleccione método
                </option>
                <option value="TRANSFERENCIA">🏦 Transferencia</option>
                <option value="EFECTIVO">💵 Efectivo</option>
                <option value="DEBITO">💳 Tarjeta Débito</option>
                <option value="CREDITO">💳 Tarjeta Crédito</option>
                <option value="OTRO">⚡ Otro</option>
              </select>
              <div className="pos-split-amount-wrap">
                <span className="pos-currency-symbol">$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={splitAmount2}
                  onChange={(e) => setSplitAmount2(e.target.value)}
                  className="pos-split-amount-input"
                />
              </div>
            </div>
          </div>

          {/* Resumen Total Asignado */}
          <div className={`pos-split-total-banner ${isSplitCovered ? 'covered' : 'lacking'}`}>
            <span>Total asignado:</span>
            <span className="pos-split-total-value">
              {formatARS(splitTotalAssigned)} / {formatARS(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

const NewSale = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [isSplitPayment, setIsSplitPayment] = useState(false)
  const [splitMethod1, setSplitMethod1] = useState('')
  const [splitAmount1, setSplitAmount1] = useState('')
  const [splitMethod2, setSplitMethod2] = useState('')
  const [splitAmount2, setSplitAmount2] = useState('')

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
    cartKey: 'pos_cart',
    discountKey: 'pos_discount',
    discountTypeKey: 'pos_discount_type',
  })

  const searchInputRef = useRef(null)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [serviceForm, setServiceForm] = useState({ description: '', price: '' })
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const ticketConfigRef = useRef(null)
  const cartPulseTimerRef = useRef(null)
  const [showCartModal, setShowCartModal] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [cartPulse, setCartPulse] = useState(false)
  const [cartAnimKey, setCartAnimKey] = useState(0)
  const [editingSaleId, setEditingSaleId] = useState(null)
  const [editingSaleNumber, setEditingSaleNumber] = useState(null)
  const [loadingSale, setLoadingSale] = useState(false)
  const [lastSaleWasEdit, setLastSaleWasEdit] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [multiplier, setMultiplier] = useState(1)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [amountPaid, setAmountPaid] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isClearingCart, setIsClearingCart] = useState(false)
  const [hoveredProduct, setHoveredProduct] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setFetchError(false)
    try {
      const response = await api.get('inventory/products/', {
        params: {
          page,
          page_size: PAGE_SIZE,
          search: debouncedSearch || undefined,
        },
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
    localStorage.removeItem('pos_payment')
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Settings se carga una sola vez al montar
  useEffect(() => {
    api
      .get('settings/')
      .then((res) => {
        ticketConfigRef.current = res.data
      })
      .catch((err) => console.error('Error loading ticket settings', err))
  }, [])

  useEffect(() => {
    setFocusedIndex(-1)
  }, [products])

  const normalizeSaleItems = useCallback(
    (items = []) =>
      items.map((item) => {
        const isService = item.item_type === 'SERVICIO'
        const description = item.description || 'Servicio'

        let calculatedDiscount = 0
        if (item.discount !== undefined) {
          calculatedDiscount = parseFloat(item.discount) || 0
        } else if (item.discountValue) {
          const val = parseFloat(item.discountValue)
          if (!isNaN(val)) {
            const base = parseFloat(item.price) || 0
            const qty = parseInt(item.quantity, 10) || 1
            calculatedDiscount = item.discountType === '%' ? base * qty * (val / 100) : val
          }
        }

        return {
          id: `sale-${item.id || Math.random().toString(36).slice(2)}`,
          item_type: item.item_type,
          product: isService ? null : item.product,
          description: isService ? description : undefined,
          nombre: isService
            ? `[Servicio] ${description}`
            : item.producto_nombre || item.nombre || 'Producto',
          price: parseFloat(item.price),
          quantity: item.quantity,
          originalQuantity: item.quantity,
          stock_actual: isService
            ? null
            : item.producto_stock_actual !== undefined
              ? item.producto_stock_actual
              : item.stock_actual || 999999,
          discountType: item.discountType || '$',
          discountValue:
            item.discountValue !== undefined ? item.discountValue : parseFloat(item.discount) || '',
          discount: calculatedDiscount,
        }
      }),
    [],
  )

  const loadSaleForEdit = useCallback(
    async (saleId) => {
      if (!saleId) return
      setLoadingSale(true)
      try {
        const response = await api.get(`sales/sales/${saleId}/`)
        const sale = response.data
        setCart(normalizeSaleItems(sale.items || []))
        setDiscount(sale.discount || 0)
        setPaymentMethod(sale.payment_method || '')
        if (sale.payment_method === 'MIXTO' && sale.payment_details) {
          setIsSplitPayment(true)
          setSplitMethod1(sale.payment_details.method_1 || '')
          setSplitAmount1(sale.payment_details.amount_1 || '')
          setSplitMethod2(sale.payment_details.method_2 || '')
          setSplitAmount2(sale.payment_details.amount_2 || '')
        } else {
          setIsSplitPayment(false)
          setSplitMethod1('')
          setSplitAmount1('')
          setSplitMethod2('')
          setSplitAmount2('')
        }
        setEditingSaleId(sale.id)
        setEditingSaleNumber(sale.sale_number || sale.id)
      } catch (error) {
        toast.error(getErrorMessage(error))
        navigate('/new-sale', { replace: true })
      } finally {
        setLoadingSale(false)
      }
    },
    [navigate, normalizeSaleItems, setCart, setDiscount],
  )

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const editId = params.get('edit')
    if (editId) {
      loadSaleForEdit(editId)
    } else {
      if (editingSaleId) {
        setCart([])
        setDiscount('')
        setDiscountType('$')
        setPaymentMethod('')
        setIsSplitPayment(false)
        setSplitMethod1('')
        setSplitAmount1('')
        setSplitMethod2('')
        setSplitAmount2('')
        setAmountPaid('')
      }
      setEditingSaleId(null)
      setEditingSaleNumber(null)
    }
  }, [location.search, loadSaleForEdit]) // eslint-disable-line react-hooks/exhaustive-deps

  // isMobile ahora viene de useMediaQuery — se eliminó el useEffect duplicado
  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(timer)
  }, [search])

  const handlePrintTicket = useCallback(() => {
    if (!lastSale) return

    const branchName = ticketConfigRef.current?.branch_name || 'TU NEGOCIO'
    const headerText = ticketConfigRef.current?.ticket_header || 'BALANCE 360'
    const footerText = ticketConfigRef.current?.ticket_footer || '\u00a1Gracias por su compra!'
    const address = ticketConfigRef.current?.ticket_address
    const cuit = ticketConfigRef.current?.ticket_cuit
    const iibb = ticketConfigRef.current?.ticket_iibb
    const iva = ticketConfigRef.current?.ticket_iva
    const phone = ticketConfigRef.current?.ticket_phone
    const email = ticketConfigRef.current?.ticket_email
    const logoDataUrl =
      ticketConfigRef.current?.ticket_logo || localStorage.getItem('ticket_logo') || ''
    const ticketWidth = ticketConfigRef.current?.ticket_width || '58mm'
    const is58mm = ticketWidth === '58mm'

    // Lógica corregida de descuentos
    const itemsBaseSubtotal = lastSale.items.reduce(
      (acc, item) => acc + parseFloat(item.price) * item.quantity,
      0,
    )
    const itemsDiscountTotal = lastSale.items.reduce(
      (acc, item) => acc + (parseFloat(item.discount) || 0),
      0,
    )
    const globalDiscount = parseFloat(lastSale.discount) || 0
    const totalDiscount = itemsDiscountTotal + globalDiscount
    const finalTotal = parseFloat(lastSale.total)

    const htmlContent = `
      <html>
        <head>
          <title>Ticket de Venta #${lastSale.id}</title>
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
            <div class="info">Fecha: ${new Date(lastSale.date).toLocaleString('es-AR', { hour12: false })}</div>
            <div class="info">Ticket #${lastSale.sale_number || lastSale.id}</div>
            <div class="info">Pago: ${lastSale.payment_method === 'MIXTO' && lastSale.payment_details
        ? `Dividido (${lastSale.payment_details.method_1}: $${Number(lastSale.payment_details.amount_1 || 0).toLocaleString('es-AR')} + ${lastSale.payment_details.method_2}: $${Number(lastSale.payment_details.amount_2 || 0).toLocaleString('es-AR')})`
        : lastSale.payment_method
      }</div>
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
              ${lastSale.items
        .map((item) => {
          const itemPrice = parseFloat(item.price) || 0
          const baseSub = itemPrice * item.quantity
          const descItem = parseFloat(item.discount) || 0
          const itemLabel =
            item.item_type === 'SERVICIO'
              ? item.description || 'Servicio'
              : item.nombre || item.producto_nombre || 'Producto'

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
                      ${descItem > 0
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
            ${totalDiscount > 0
        ? `
            <div class="row">
              <span>Descuento:</span>
              <span>-$${totalDiscount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>`
        : ''
      }
            <div class="row" style="font-weight: bold; font-size: ${is58mm ? '13px' : '14px'}; margin-top: 5px; border-top: 1px solid #000; padding-top: 3px;">
              <span>TOTAL:</span>
              <span>$${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          <div class="footer">
            <p>${footerText}</p>
            <p style="border-top: 1px dashed #000; padding-top: 6px; margin-top: 8px; font-size: ${is58mm ? '8px' : '9px'}; color: #000;">*** Copia Cliente ***</p>
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
  }, [lastSale])

  const [downloadingPDF, setDownloadingPDF] = useState(false)

  const handleDownloadPDF = useCallback(async () => {
    if (!lastSale) return
    setDownloadingPDF(true)

    const branchName = ticketConfigRef.current?.branch_name || 'TU NEGOCIO'
    const headerText = ticketConfigRef.current?.ticket_header || 'BALANCE 360'
    const footerText = ticketConfigRef.current?.ticket_footer || '¡Gracias por su compra!'
    const address = ticketConfigRef.current?.ticket_address
    const cuit = ticketConfigRef.current?.ticket_cuit
    const iibb = ticketConfigRef.current?.ticket_iibb
    const iva = ticketConfigRef.current?.ticket_iva
    const phone = ticketConfigRef.current?.ticket_phone
    const email = ticketConfigRef.current?.ticket_email
    const logoDataUrl =
      ticketConfigRef.current?.ticket_logo || localStorage.getItem('ticket_logo') || ''

    // Lógica corregida de descuentos
    const itemsBaseSubtotal = lastSale.items.reduce(
      (acc, item) => acc + parseFloat(item.price) * item.quantity,
      0,
    )
    const itemsDiscountTotal = lastSale.items.reduce(
      (acc, item) => acc + (parseFloat(item.discount) || 0),
      0,
    )
    const globalDiscount = parseFloat(lastSale.discount) || 0
    const totalDiscount = itemsDiscountTotal + globalDiscount
    const finalTotal = parseFloat(lastSale.total)

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
            <h2 style="font-size: 12px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Comprobante de Venta</h2>
            <p style="font-size: 18px; font-weight: 800; color: #0284c7; margin: 4px 0 8px 0;">#${lastSale.sale_number || lastSale.id}</p>
            <div style="font-size: 10px; color: #475569; display: flex; flex-direction: column; gap: 3px; align-items: flex-end;">
              ${cuit ? `<div><strong>CUIT:</strong> ${cuit}</div>` : ''}
              ${iibb ? `<div><strong>Ingresos Brutos:</strong> ${iibb}</div>` : ''}
              ${iva ? `<div><strong>Cond. IVA:</strong> ${iva}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- Info bar: Date, Payment Method -->
        <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 25px; font-size: 10px; color: #334155;">
          <div>
            <strong>Fecha:</strong> ${new Date(lastSale.date).toLocaleString('es-AR', { hour12: false })}
          </div>
          <div>
            <strong>Método de Pago:</strong> ${lastSale.payment_method === 'MIXTO' && lastSale.payment_details
        ? `Pago Dividido (${lastSale.payment_details.method_1}: $${Number(lastSale.payment_details.amount_1 || 0).toLocaleString('es-AR')} / ${lastSale.payment_details.method_2}: $${Number(lastSale.payment_details.amount_2 || 0).toLocaleString('es-AR')})`
        : lastSale.payment_method
      }
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
            ${lastSale.items
        .map((item) => {
          const itemPrice = parseFloat(item.price) || 0
          const baseSub = itemPrice * item.quantity
          const descItem = parseFloat(item.discount) || 0
          const itemLabel =
            item.item_type === 'SERVICIO'
              ? item.description || 'Servicio'
              : item.nombre || item.producto_nombre || 'Producto'
          const lineTotal = baseSub - descItem
          return `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 10px; text-align: left; vertical-align: middle; font-weight: 500; color: #1e293b;">${itemLabel}</td>
                <td style="padding: 8px 10px; text-align: right; vertical-align: middle; color: #475569;">$${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
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
            ${totalDiscount > 0
        ? `
            <tr>
              <td style="padding: 5px 10px; color: #ef4444;">Descuento Total</td>
              <td style="padding: 5px 10px; text-align: right; font-weight: 600; color: #ef4444;">-$${totalDiscount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            </tr>`
        : ''
      }
            <tr style="border-top: 2px solid #0f172a;">
              <td style="padding: 8px 10px; font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase;">Total</td>
              <td style="padding: 8px 10px; text-align: right; font-size: 14px; font-weight: 800; color: #0284c7;">$${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 15px; font-size: 9px; color: #64748b; white-space: pre-wrap; line-height: 1.6;">
          <p style="margin: 0 0 4px 0;">${footerText}</p>
        </div>
      </div>
    `

    try {
      const html2pdf = await loadHtml2Pdf()
      const element = document.createElement('div')
      element.innerHTML = htmlContent
      const opt = {
        margin: 15,
        filename: `Comprobante_Venta_${lastSale.sale_number || lastSale.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }
      await html2pdf().from(element).set(opt).save()
      toast.success('PDF descargado con éxito')
    } catch (error) {
      console.error(error)
      toast.error('Error al generar el PDF')
    } finally {
      setDownloadingPDF(false)
    }
  }, [lastSale])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const triggerCartPulse = useCallback(() => {
    clearTimeout(cartPulseTimerRef.current)
    setCartPulse(true)
    cartPulseTimerRef.current = setTimeout(() => setCartPulse(false), 450)
  }, [])

  const addToCart = useCallback(
    (product) => {
      const qty = multiplier
      let isStockExceeded = false
      let allowedQty = qty

      setCart((prev) => {
        const exists = prev.find((i) => i.item_type === 'PRODUCTO' && i.product === product.id)
        const currentQtyInCart = exists ? exists.quantity : 0
        const originalQty = exists ? exists.originalQuantity || 0 : 0
        const maxAllowed = product.stock_actual + originalQty

        if (currentQtyInCart + qty > maxAllowed) {
          isStockExceeded = true
          allowedQty = maxAllowed - currentQtyInCart
          if (allowedQty <= 0) {
            return prev
          }
        }

        if (exists) {
          return prev.map((i) =>
            i.item_type === 'PRODUCTO' && i.product === product.id
              ? { ...i, quantity: i.quantity + allowedQty }
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
            price: parseFloat(product.precio_venta),
            quantity: allowedQty,
            stock_actual: product.stock_actual,
            originalQuantity: 0,
            discountType: '$',
            discountValue: '',
          },
        ]
      })

      if (isStockExceeded) {
        if (allowedQty <= 0) {
          toast.warning(
            `No podés agregar más de este producto. Stock disponible: ${product.stock_actual}`,
          )
          setMultiplier(1)
          if (!isMobile) {
            searchInputRef.current?.focus()
          } else {
            searchInputRef.current?.blur()
          }
          return
        } else {
          toast.warning(
            `Solo se agregaron ${allowedQty} unidades. Stock disponible: ${product.stock_actual}`,
          )
        }
      }

      setCartAnimKey((k) => k + 1)
      triggerCartPulse()
      setMultiplier(1)
      if (!isMobile) {
        searchInputRef.current?.focus()
      } else {
        searchInputRef.current?.blur()
      }
    },
    [multiplier, triggerCartPulse, setCart, isMobile],
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

  const updateQuantity = useCallback((id, quantity) => {
    if (quantity === '') {
      setCart((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: '' } : item)))
      return
    }
    const val = parseInt(quantity, 10)
    if (Number.isNaN(val)) return
    let value = Math.max(1, val)

    let isStockExceeded = false
    let maxAllowed = 999999

    setCart((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item && item.item_type === 'PRODUCTO') {
        const stockActual = item.stock_actual !== undefined ? item.stock_actual : 999999
        const originalQty = item.originalQuantity || 0
        maxAllowed = stockActual + originalQty
        if (value > maxAllowed) {
          isStockExceeded = true
          value = maxAllowed
        }
      }
      return prev.map((i) => (i.id === id ? { ...i, quantity: value } : i))
    })

    if (isStockExceeded) {
      toast.warning(`Cantidad limitada al stock disponible (${maxAllowed} unidades).`)
    }
  }, [setCart])

  // cartCount viene de useCart

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    if (!cart.length) {
      toast.warning('El carrito está vacío')
      return
    }
    const invalidItem = cart.find((item) => !item.quantity || parseInt(item.quantity, 10) <= 0)
    if (invalidItem) {
      toast.warning(`La cantidad para el producto "${invalidItem.nombre}" debe ser mayor a 0.`)
      return
    }
    if (!isSplitPayment) {
      if (!paymentMethod || !paymentMethod.trim()) {
        toast.error('Debe seleccionar un método de pago para registrar la venta')
        return
      }
    } else {
      if (!splitMethod1 || !splitMethod2) {
        toast.error('Debe seleccionar ambos métodos de pago para el pago dividido')
        return
      }
      if (splitMethod1 === splitMethod2) {
        toast.error('Los dos métodos de pago deben ser diferentes')
        return
      }
      const a1 = parseFloat(splitAmount1) || 0
      const a2 = parseFloat(splitAmount2) || 0
      if (a1 <= 0 || a2 <= 0) {
        toast.error('El monto asignado a cada método de pago debe ser mayor a 0')
        return
      }
      const sum = Number((a1 + a2).toFixed(2))
      const expTotal = Number(total.toFixed(2))
      if (Math.abs(sum - expTotal) > 0.01) {
        toast.error(
          `La suma de los métodos ($${sum.toLocaleString('es-AR')}) no coincide con el total ($${expTotal.toLocaleString('es-AR')})`,
        )
        return
      }
    }
    setSubmitting(true)
    try {
      const wasEditing = Boolean(editingSaleId)
      const parsedDiscount = parseFloat(discount) || 0
      const finalGlobalDiscount =
        discountType === '%'
          ? Number((subtotal * (parsedDiscount / 100)).toFixed(2)) || 0
          : Number(parsedDiscount.toFixed(2)) || 0

      const payload = {
        payment_method: isSplitPayment ? 'MIXTO' : paymentMethod,
        payment_details: isSplitPayment
          ? {
            method_1: splitMethod1,
            amount_1: Number(parseFloat(splitAmount1).toFixed(2)),
            method_2: splitMethod2,
            amount_2: Number(parseFloat(splitAmount2).toFixed(2)),
          }
          : null,
        discount: finalGlobalDiscount,
        items: cart.map((item) => {
          const baseSub = (parseFloat(item.price) || 0) * item.quantity
          const dv = parseFloat(item.discountValue)
          const descItem =
            !item.discountValue || isNaN(dv)
              ? 0
              : item.discountType === '%'
                ? baseSub * (dv / 100)
                : dv
          return {
            item_type: item.item_type,
            product: item.product,
            description: item.item_type === 'SERVICIO' ? item.description : undefined,
            quantity: item.quantity,
            price: Number((parseFloat(item.price) || 0).toFixed(2)),
            discount: Number(descItem.toFixed(2)) || 0,
          }
        }),
      }

      const response = wasEditing
        ? await api.put(`sales/sales/${editingSaleId}/`, payload)
        : await api.post('sales/sales/', payload)

      const normalizedItems = normalizeSaleItems(response.data.items || cart)
      const snapSubtotal = normalizedItems.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
      )
      const saleSnapshot = {
        id: response.data.id,
        sale_number: response.data.sale_number,
        date: response.data.date,
        items: normalizedItems,
        subtotal: snapSubtotal,
        discount: parseFloat(response.data.discount ?? discount) || 0,
        total: parseFloat(response.data.total ?? total),
        payment_method: response.data.payment_method || (isSplitPayment ? 'MIXTO' : paymentMethod),
        payment_details:
          response.data.payment_details ||
          (isSplitPayment
            ? {
              method_1: splitMethod1,
              amount_1: Number(parseFloat(splitAmount1).toFixed(2)),
              method_2: splitMethod2,
              amount_2: Number(parseFloat(splitAmount2).toFixed(2)),
            }
            : null),
      }

      setLastSale(saleSnapshot)
      setLastSaleWasEdit(wasEditing)
      setShowSuccessModal(true)

      setShowCartModal(false)
      setCart([])
      setDiscount('')
      setDiscountType('$')
      setPaymentMethod('')
      setIsSplitPayment(false)
      setSplitMethod1('')
      setSplitAmount1('')
      setSplitMethod2('')
      setSplitAmount2('')
      setAmountPaid('')
      setEditingSaleId(null)
      setEditingSaleNumber(null)
      navigate('/new-sale', { replace: true })
      toast.success(wasEditing ? 'Venta actualizada con éxito' : 'Venta registrada con éxito')
    } catch (error) {
      console.error(error)
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }, [
    cart,
    editingSaleId,
    discount,
    discountType,
    subtotal,
    total,
    paymentMethod,
    isSplitPayment,
    splitMethod1,
    splitAmount1,
    splitMethod2,
    splitAmount2,
    normalizeSaleItems,
    navigate,
    submitting,
    setCart,
    setDiscount,
    setDiscountType,
  ])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput =
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT' ||
        e.target.isContentEditable
      if (isInput && e.key === '/') return

      if (e.key === 'F2' || e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'F8') {
        e.preventDefault()
        if (cart.length > 0) {
          if (isMobile) {
            setShowCartModal(true)
          } else {
            handleSubmit()
          }
        } else {
          toast.info('El carrito está vacío')
        }
      }
      if (
        e.key === 'Escape' &&
        cart.length > 0 &&
        !showCartModal &&
        !showServiceModal &&
        !showSuccessModal
      ) {
        e.preventDefault()
        setShowClearConfirm(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    cart,
    isMobile,
    showCartModal,
    showServiceModal,
    showSuccessModal,
    discount,
    discountType,
    paymentMethod,
    handleSubmit,
  ])

  return (
    <div className="pos-shell pos-page">
      <div className="catalog-panel">
        <div className="flex-row between">
          <div className="pos-search-wrapper" style={{ position: 'relative', flex: 1 }}>
            <Input
              ref={searchInputRef}
              placeholder="Buscar producto (Presione /)…"
              suffix={!search && <kbd className="search-kbd">/</kbd>}
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
                  if (focusedIndex >= 0 && products[focusedIndex]?.stock_actual > 0) {
                    addToCart(products[focusedIndex])
                    setSearch('')
                  } else if (search.length > 0) {
                    api
                      .get('inventory/products/', { params: { search, page_size: 1 } })
                      .then((res) => {
                        const list = res.data.results || res.data
                        if (list.length === 1 && list[0].stock_actual > 0) {
                          addToCart(list[0])
                          setSearch('')
                        }
                      })
                  }
                }
              }}
              icon={<Search size={18} />}
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
        <div className="muted small mb-2">Catálogo (Más Vendidos)</div>
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
                    Precio
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
                  : products.map((p, i) => (
                    <tr
                      key={p.id}
                      onClick={() => p.stock_actual > 0 && addToCart(p)}
                      className={`pos-catalog-row ${p.stock_actual <= 0 ? 'pos-row-disabled' : ''}`}
                      style={{
                        cursor: p.stock_actual > 0 ? 'pointer' : 'not-allowed',
                        backgroundColor:
                          focusedIndex === i ? 'rgba(14, 165, 233, 0.12)' : undefined,
                      }}
                      onMouseEnter={() => {
                        setFocusedIndex(i)
                        setHoveredProduct(p)
                      }}
                      onMouseLeave={() => {
                        setFocusedIndex((prev) => (prev === i ? -1 : prev))
                        setHoveredProduct(null)
                      }}
                      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                    >
                      <td className="cell-pos-code" data-label="Código">
                        <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                          {p.codigo}
                        </span>
                      </td>
                      <td className="cell-pos-name" data-label="Producto">
                        <div
                          className="pos-product-name"
                          style={{ fontWeight: 600, color: 'var(--text-primary)' }}
                        >
                          {p.nombre}
                        </div>
                        <div className="pos-mobile-meta">
                          <span className="badge badge-neutral pos-mobile-code">#{p.codigo}</span>
                          <span
                            className={`badge pos-mobile-stock ${p.stock_actual > 5
                                ? 'badge-success'
                                : p.stock_actual > 0
                                  ? 'badge-warning'
                                  : 'badge-danger'
                              }`}
                          >
                            {p.stock_actual > 0 ? `Stock: ${p.stock_actual}` : 'Sin stock'}
                          </span>
                        </div>
                      </td>
                      <td
                        className="cell-pos-stock"
                        style={{ textAlign: 'center' }}
                        data-label="Stock"
                      >
                        <span
                          className={`badge ${p.stock_actual > 5
                              ? 'badge-success'
                              : p.stock_actual > 0
                                ? 'badge-warning'
                                : 'badge-danger'
                            }`}
                        >
                          {p.stock_actual}
                        </span>
                      </td>
                      <td
                        className="cell-pos-price"
                        style={{ textAlign: 'right', fontWeight: 'bold' }}
                        data-label="Precio"
                      >
                        <span className="pos-product-price">{formatARS(p.precio_venta)}</span>
                      </td>
                      <td
                        className="cell-pos-action"
                        style={{ textAlign: 'center' }}
                        data-label="Acción"
                      >
                        {p.stock_actual > 0 && <span className="product-action-plus">+</span>}
                      </td>
                    </tr>
                  ))}
                {!loading && fetchError && (
                  <tr>
                    <td colSpan="5" className="pos-empty-cell">
                      <div className="pos-empty">
                        <PackageX size={48} style={{ color: 'var(--danger-400)' }} />
                        <p style={{ fontWeight: 600, color: 'var(--danger-600)' }}>
                          No se pudo conectar con el servidor
                        </p>
                        <p className="muted small">
                          Verificá que el backend esté corriendo en{' '}
                          {import.meta.env.VITE_API_URL || 'localhost:8000'}
                        </p>
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

      <div className="cart-panel">
        <div
          className="card-head pos-desktop-card-head"
          style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div>
            <p className="eyebrow">Ticket activo</p>
            <div className="flex-row gap-sm items-center">
              <h3>Carrito</h3>
              {editingSaleId && (
                <span className="badge badge-warning">
                  Editando #{editingSaleNumber || editingSaleId}
                </span>
              )}
              {loadingSale && <span className="badge badge-neutral">Cargando…</span>}
            </div>
          </div>
          <div className="flex-row items-center gap-sm">
            <div className="badge badge-neutral pos-items-count-badge">
              <ShoppingCart size={15} /> {cartCount} {cartCount === 1 ? 'ítem' : 'ítems'}
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                className="pos-desktop-clear-btn"
                onClick={() => setShowClearConfirm(true)}
                title="Vaciar carrito"
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
              <ShoppingCart size={42} className="muted" />
              <p>Agregá productos o servicios</p>
            </div>
          ) : (
            cart.map((item) => (
              <PosCartItem
                key={item.id}
                item={item}
                onRemove={removeItem}
                onUpdateQuantity={updateQuantity}
                onUpdateDiscount={updateItemDiscount}
                isClearing={isClearingCart}
              />
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="ui-field" style={{ marginBottom: '8px' }}>
            <span className="field-label">Descuento Global</span>
            <div className="flex-row gap-xs">
              <div className="field-control" style={{ flex: 1 }}>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="field-control" style={{ width: '46px', flexShrink: 0 }}>
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
          </div>

          <PaymentSection
            isSplitPayment={isSplitPayment}
            setIsSplitPayment={setIsSplitPayment}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            splitMethod1={splitMethod1}
            setSplitMethod1={setSplitMethod1}
            splitAmount1={splitAmount1}
            setSplitAmount1={setSplitAmount1}
            splitMethod2={splitMethod2}
            setSplitMethod2={setSplitMethod2}
            splitAmount2={splitAmount2}
            setSplitAmount2={setSplitAmount2}
            total={total}
            amountPaid={amountPaid}
            setAmountPaid={setAmountPaid}
          />

          <div className="flex-row between" style={{ marginTop: 12, marginBottom: 12 }}>
            <div className="muted">Total a pagar</div>
            <div className="title-xl">{formatARS(total)}</div>
          </div>
          <Button
            variant="primary"
            fullWidth
            onClick={handleSubmit}
            disabled={!cart.length || submitting}
            icon={<CreditCard size={18} />}
          >
            {submitting ? 'Procesando...' : 'Confirmar venta [F8]'}
          </Button>
        </div>
      </div>

      {isMobile &&
        !showCartModal &&
        createPortal(
          <button
            className={`pos-cart-fab ${cartPulse ? 'pulse' : ''}`}
            onClick={() => setShowCartModal(true)}
            aria-label="Abrir carrito"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="pos-cart-count">{cartCount}</span>}
            <span key={cartAnimKey} className="pos-cart-fly" aria-hidden="true" />
          </button>,
          document.body,
        )}

      {/* Service Modal */}
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
            onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
            placeholder="Ej. Instalación / Reparación"
          />
          <Input
            label="Precio"
            type="number"
            value={serviceForm.price}
            onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
            placeholder="0.00"
          />
        </Modal>
      )}

      {showCartModal &&
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
              aria-label="Carrito de compra"
            >
              {/* Drag Handle Bar */}
              <div className="drawer-handle-bar">
                <span className="drawer-handle-pill" />
              </div>

              {/* Drawer Header */}
              <div className="pos-drawer-header">
                <div className="pos-drawer-title-wrap">
                  <ShoppingCart size={20} className="pos-drawer-icon" />
                  <div className="pos-drawer-title-group">
                    <h3>
                      {editingSaleId
                        ? `Modificar venta #${editingSaleNumber || editingSaleId}`
                        : 'Finalizar compra'}
                    </h3>
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
                      title="Vaciar carrito"
                    >
                      <Trash2 size={15} />
                      <span>Vaciar</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="pos-drawer-close-btn"
                    onClick={() => setShowCartModal(false)}
                    aria-label="Cerrar carrito"
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
                      <ShoppingCart size={44} className="pos-empty-icon" />
                      <p className="pos-empty-text">El carrito está vacío</p>
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
                        <PosCartItem
                          key={item.id}
                          item={item}
                          onRemove={removeItem}
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

                    {/* Section: Payment Method */}
                    <div className="pos-drawer-section">
                      <PaymentSection
                        isSplitPayment={isSplitPayment}
                        setIsSplitPayment={setIsSplitPayment}
                        paymentMethod={paymentMethod}
                        setPaymentMethod={setPaymentMethod}
                        splitMethod1={splitMethod1}
                        setSplitMethod1={setSplitMethod1}
                        splitAmount1={splitAmount1}
                        setSplitAmount1={setSplitAmount1}
                        splitMethod2={splitMethod2}
                        setSplitMethod2={setSplitMethod2}
                        splitAmount2={splitAmount2}
                        setSplitAmount2={setSplitAmount2}
                        total={total}
                        amountPaid={amountPaid}
                        setAmountPaid={setAmountPaid}
                      />
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
                        <span>Total neto</span>
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
                    <span className="pos-docked-label">Total a pagar</span>
                    <span className="pos-docked-amount">{formatARS(total)}</span>
                  </div>
                  {paymentMethod && (
                    <span className="pos-docked-method-badge">
                      {paymentMethod === 'MIXTO' ? '2 Métodos' : paymentMethod}
                    </span>
                  )}
                </div>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={!cart.length || loadingSale || submitting}
                  icon={<CreditCard size={18} />}
                  className="pos-docked-submit-btn"
                >
                  {submitting
                    ? 'Procesando venta...'
                    : editingSaleId
                      ? 'Actualizar venta'
                      : 'Confirmar venta [F8]'}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Success Modal */}
      {showSuccessModal && (
        <Modal
          title={lastSaleWasEdit ? 'Venta actualizada' : 'Venta registrada'}
          onClose={() => {
            setShowSuccessModal(false)
            setLastSaleWasEdit(false)
          }}
          size="sm"
          footer={
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setShowSuccessModal(false)
                setLastSaleWasEdit(false)
              }}
            >
              Nueva venta
            </Button>
          }
        >
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}
            >
              <CreditCard size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">¡Operación exitosa!</h3>
            <p className="text-muted mb-6">
              Venta #{lastSale?.sale_number || lastSale?.id} procesada por{' '}
              {formatARS(lastSale?.total || 0)}.
            </p>
            <div className="flex flex-col gap-sm w-full">
              <Button
                variant="secondary"
                fullWidth
                icon={<Printer size={18} />}
                onClick={handlePrintTicket}
              >
                Imprimir Ticket
              </Button>
              <Button
                variant="secondary"
                fullWidth
                icon={<FileDown size={18} />}
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
              >
                {downloadingPDF ? 'Descargando...' : 'Descargar PDF'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal
        isOpen={showClearConfirm}
        title="Vaciar carrito"
        message="¿Seguro que deseas vaciar el carrito de ventas?"
        confirmLabel="Vaciar"
        variant="danger"
        onConfirm={() => {
          setShowClearConfirm(false)
          setIsClearingCart(true)
          setTimeout(() => {
            clearCart()
            setIsClearingCart(false)
          }, 300)
        }}
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

export default NewSale
