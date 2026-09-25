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
  FileCheck,
  FileText,
  CalendarClock,
  ShieldCheck,
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
import PosCartItem from '../components/pos/PosCartItem'
import PaymentSection from '../components/pos/PaymentSection'
import FiscalAndDateSection from '../components/pos/FiscalAndDateSection'
import SaleSuccessModal from '../components/pos/SaleSuccessModal'
import ServiceModal from '../components/pos/ServiceModal'
import { printSaleThermalTicket, downloadSaleReceiptPdf } from '../utils/ticketGenerator'

const PAGE_SIZE = 12

function formatHeaderDate(isoString) {
  if (!isoString) return 'Hoy'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return 'Hoy'
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month} ${hours}:${mins}`
  } catch {
    return 'Hoy'
  }
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

  // ─── Facturación ARCA y Fecha Retroactiva ─────────────────────────────────
  const [isCustomDate, setIsCustomDate] = useState(false)
  const [saleCustomDate, setSaleCustomDate] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [isArcaInvoice, setIsArcaInvoice] = useState(false)
  const [voucherType, setVoucherType] = useState(11) // 11: Factura C (primera opción por defecto), 6: Factura B, 1: Factura A
  const [customerDocType, setCustomerDocType] = useState('96') // 96: DNI, 80: CUIT, 99: Sin Identificar
  const [customerDocNumber, setCustomerDocNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerIvaCondition, setCustomerIvaCondition] = useState('CONSUMIDOR_FINAL')
  const [customerAddress, setCustomerAddress] = useState('')
  const [downloadingArcaPDF, setDownloadingArcaPDF] = useState(false)

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
    printSaleThermalTicket(lastSale, ticketConfigRef.current)
  }, [lastSale])

  const [downloadingPDF, setDownloadingPDF] = useState(false)

  const handleDownloadPDF = useCallback(async () => {
    if (!lastSale) return
    setDownloadingPDF(true)
    try {
      await downloadSaleReceiptPdf(lastSale, ticketConfigRef.current)
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
    // Validación para Factura A
    if (isArcaInvoice && Number(voucherType) === 1) {
      const cleanCuit = customerDocNumber.replace(/\D/g, '')
      if (cleanCuit.length !== 11) {
        toast.error('Para emitir Factura A, el CUIT del cliente debe contener 11 dígitos válidos.')
        return
      }
      if (!customerName.trim()) {
        toast.error('Para emitir Factura A, la Razón Social del cliente es obligatoria.')
        return
      }
    }

    // Validación de Tope RG 4444 para Consumidor Final sin identificar
    if (isArcaInvoice && customerIvaCondition === 'CONSUMIDOR_FINAL') {
      const cleanDoc = customerDocNumber.replace(/\D/g, '')
      const isCash = (!isSplitPayment && paymentMethod === 'EFECTIVO') || (isSplitPayment && (splitMethod1 === 'EFECTIVO' || splitMethod2 === 'EFECTIVO'))
      const rg4444Limit = isCash ? 344488 : 688976
      if (cleanDoc.length === 0 && total >= rg4444Limit) {
        toast.error(
          `Para ventas a Consumidor Final desde $${rg4444Limit.toLocaleString('es-AR')}, ARCA exige identificar al cliente con DNI o CUIT (RG 4444).`,
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
        ...(isCustomDate && saleCustomDate
          ? { date: new Date(saleCustomDate).toISOString() }
          : {}),
        ...(isArcaInvoice
          ? {
            emit_arca_invoice: true,
            voucher_type: Number(voucherType),
            customer_doc_type: customerDocType,
            customer_doc_number: customerDocNumber.trim(),
            customer_name: customerName.trim() || 'Consumidor Final',
            customer_iva_condition: customerIvaCondition,
            customer_address: customerAddress.trim(),
          }
          : {}),
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
        electronic_invoice: response.data.electronic_invoice,
        is_fiscal: response.data.is_fiscal,
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
      setIsCustomDate(false)
      setIsArcaInvoice(false)
      setVoucherType(11)
      setCustomerDocNumber('')
      setCustomerName('')
      setCustomerAddress('')
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
    customerAddress,
    customerDocNumber,
    customerDocType,
    customerIvaCondition,
    customerName,
    isArcaInvoice,
    isCustomDate,
    saleCustomDate,
    voucherType,
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
          style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}
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
            {/* Selector de Fecha de Venta */}
            <button
              type="button"
              className={`pos-header-date-btn ${isCustomDate ? 'active' : ''}`}
              onClick={() => {
                if (!isCustomDate) {
                  const now = new Date()
                  const tzOffset = now.getTimezoneOffset() * 60000
                  const localIso = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16)
                  setSaleCustomDate(localIso)
                  setIsCustomDate(true)
                } else {
                  setIsCustomDate(false)
                  setSaleCustomDate('')
                }
              }}
              title={isCustomDate ? 'Fecha personalizada activa. Clic para volver a hoy' : 'Clic para asignar fecha y hora personalizada'}
            >
              <CalendarClock size={14} />
              <span>{isCustomDate && saleCustomDate ? formatHeaderDate(saleCustomDate) : 'Hoy'}</span>
            </button>

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

        {/* Barra de Edición de Fecha Personalizada en Desktop */}
        {isCustomDate && (
          <div className="pos-desktop-custom-date-bar">
            <div className="flex-row items-center gap-xs">
              <CalendarClock size={13} style={{ color: 'var(--color-primary-400, #818cf8)' }} />
              <span className="small muted">Fecha de la venta:</span>
            </div>
            <div className="flex-row items-center gap-xs">
              <input
                type="datetime-local"
                value={saleCustomDate}
                onChange={(e) => setSaleCustomDate(e.target.value)}
                className="pos-header-datetime-input"
              />
              <button
                type="button"
                className="pos-header-date-reset-btn"
                onClick={() => {
                  setIsCustomDate(false)
                  setSaleCustomDate('')
                }}
                title="Restablecer a fecha y hora actual"
              >
                Volver a Hoy
              </button>
            </div>
          </div>
        )}

        {/* ─── APARTADO 1: Productos del Carrito (Scroll Vertical Independiente) ─── */}
        <div className={`pos-desktop-cart-items-section ${!cart.length ? 'is-empty' : ''}`}>
          {!cart.length ? (
            <div className="empty-state">
              <ShoppingCart size={42} className="muted" />
              <p>Agregá productos o servicios</p>
            </div>
          ) : (
            <div className="pos-desktop-cart-items-list">
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

        {/* ─── APARTADO 2: Opciones y Ajustes de Venta (Scroll Vertical Independiente) ─── */}
        {cart.length > 0 && (
          <>
            <div className="pos-desktop-config-header">
              <span>Ajustes, Pago y Facturación</span>
            </div>

            <div className="pos-desktop-cart-config-section">
              <div className="ui-field" style={{ marginBottom: 0 }}>
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

              <FiscalAndDateSection
                isArcaInvoice={isArcaInvoice}
                setIsArcaInvoice={setIsArcaInvoice}
                voucherType={voucherType}
                setVoucherType={setVoucherType}
                customerIvaCondition={customerIvaCondition}
                setCustomerIvaCondition={setCustomerIvaCondition}
                customerDocType={customerDocType}
                setCustomerDocType={setCustomerDocType}
                customerDocNumber={customerDocNumber}
                setCustomerDocNumber={setCustomerDocNumber}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerAddress={customerAddress}
                setCustomerAddress={setCustomerAddress}
                total={total}
                paymentMethod={isSplitPayment ? 'MIXTO' : paymentMethod}
              />
            </div>
          </>
        )}

        {/* ─── Pie Fijo / Docked Footer (Siempre visible al 100%) ─── */}
        <div className="pos-desktop-docked-footer">
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
              ? 'Procesando...'
              : editingSaleId
                ? 'Actualizar venta'
                : 'Confirmar venta [F8]'}
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
      <ServiceModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        serviceForm={serviceForm}
        setServiceForm={setServiceForm}
        onAdd={addService}
      />

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
                  <button
                    type="button"
                    className={`pos-header-date-btn ${isCustomDate ? 'active' : ''}`}
                    onClick={() => {
                      if (!isCustomDate) {
                        const now = new Date()
                        const tzOffset = now.getTimezoneOffset() * 60000
                        const localIso = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16)
                        setSaleCustomDate(localIso)
                        setIsCustomDate(true)
                      } else {
                        setIsCustomDate(false)
                        setSaleCustomDate('')
                      }
                    }}
                    title="Fecha de la venta"
                  >
                    <CalendarClock size={13} />
                    <span>{isCustomDate && saleCustomDate ? formatHeaderDate(saleCustomDate) : 'Hoy'}</span>
                  </button>

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

              {/* Barra de Edición de Fecha Personalizada en Mobile Drawer */}
              {isCustomDate && (
                <div className="pos-desktop-custom-date-bar">
                  <div className="flex-row items-center gap-xs">
                    <CalendarClock size={13} style={{ color: 'var(--color-primary-400, #818cf8)' }} />
                    <span className="small muted">Fecha de venta:</span>
                  </div>
                  <div className="flex-row items-center gap-xs">
                    <input
                      type="datetime-local"
                      value={saleCustomDate}
                      onChange={(e) => setSaleCustomDate(e.target.value)}
                      className="pos-header-datetime-input"
                    />
                    <button
                      type="button"
                      className="pos-header-date-reset-btn"
                      onClick={() => {
                        setIsCustomDate(false)
                        setSaleCustomDate('')
                      }}
                      title="Restablecer a fecha y hora actual"
                    >
                      Hoy
                    </button>
                  </div>
                </div>
              )}

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

                    <FiscalAndDateSection
                      isArcaInvoice={isArcaInvoice}
                      setIsArcaInvoice={setIsArcaInvoice}
                      voucherType={voucherType}
                      setVoucherType={setVoucherType}
                      customerIvaCondition={customerIvaCondition}
                      setCustomerIvaCondition={setCustomerIvaCondition}
                      customerDocType={customerDocType}
                      setCustomerDocType={setCustomerDocType}
                      customerDocNumber={customerDocNumber}
                      setCustomerDocNumber={setCustomerDocNumber}
                      customerName={customerName}
                      setCustomerName={setCustomerName}
                      customerAddress={customerAddress}
                      setCustomerAddress={setCustomerAddress}
                      total={total}
                      paymentMethod={isSplitPayment ? 'MIXTO' : paymentMethod}
                    />

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
      <SaleSuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false)
          setLastSaleWasEdit(false)
        }}
        lastSale={lastSale}
        lastSaleWasEdit={lastSaleWasEdit}
        onNewSale={() => {
          setShowSuccessModal(false)
          setLastSaleWasEdit(false)
        }}
        onPrintTicket={handlePrintTicket}
        onDownloadPDF={handleDownloadPDF}
        downloadingPDF={downloadingPDF}
        downloadingArcaPDF={downloadingArcaPDF}
        setDownloadingArcaPDF={setDownloadingArcaPDF}
      />

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
