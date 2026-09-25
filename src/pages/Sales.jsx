import React, { useEffect, useState, useContext, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import salesService from '../services/salesService'
import { AuthContext } from '../context/AuthContext'
import {
  Eye,
  RotateCcw,
  Trash2,
  AlertCircle,
  X,
  Search,
  Calendar,
  Filter,
  CreditCard,
  Loader2,
  Edit,
  Printer,
  FileDown,
  FileText,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'react-toastify'
import { formatCurrency, formatDate, formatDateOnly } from '../utils/format'
import ConfirmModal from '../components/ui/ConfirmModal'
import Input from '../components/ui/Input'
import arcaService from '../services/arcaService'
import SaleDetailModal from '../components/sales/SaleDetailModal'
import SaleActionModal from '../components/sales/SaleActionModal'
import { printSaleThermalTicket, downloadSaleReceiptPdf } from '../utils/ticketGenerator'

const Sales = () => {
  const { user, isAdmin } = useContext(AuthContext)
  const navigate = useNavigate()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState(null)
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showActionModal, setShowActionModal] = useState(null) // 'anular' or 'reembolsar'
  const [confirmText, setConfirmText] = useState('')
  const [reason, setReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [datePreset, setDatePreset] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showPaymentMenu, setShowPaymentMenu] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const PAGE_SIZE = 20
  const dateInputRef = useRef(null)
  const searchInputRef = useRef(null)
  const ticketConfigRef = useRef(null)
  const filterMenuRef = useRef(null)
  const paymentMenuRef = useRef(null)
  const abortControllerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false)
      }
      if (paymentMenuRef.current && !paymentMenuRef.current.contains(event.target)) {
        setShowPaymentMenu(false)
      }
    }
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setShowFilterMenu(false)
        setShowPaymentMenu(false)
      }
    }
    if (showFilterMenu || showPaymentMenu) {
      window.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('touchstart', handleClickOutside)
      window.addEventListener('keydown', handleEsc)
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('touchstart', handleClickOutside)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [showFilterMenu, showPaymentMenu])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [hoveredProduct, setHoveredProduct] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const handleChange = (event) => setIsMobile(event.matches)
    setIsMobile(media.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    salesService
      .getSettings()
      .then((data) => {
        ticketConfigRef.current = data
      })
      .catch((err) => console.error('Error loading ticket settings', err))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 200)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Return to page 1 on filter changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearchTerm, dateFilter, startDate, endDate, statusFilter, paymentMethodFilter])

  const formatDateLocal = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const applyDatePreset = (presetKey) => {
    setDatePreset(presetKey)
    const now = new Date()

    if (presetKey === 'ALL') {
      setDateFilter('')
      setStartDate('')
      setEndDate('')
    } else if (presetKey === 'TODAY') {
      const today = formatDateLocal(now)
      setDateFilter(today)
      setStartDate(today)
      setEndDate(today)
    } else if (presetKey === 'YESTERDAY') {
      const yesterdayDate = new Date(now)
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterday = formatDateLocal(yesterdayDate)
      setDateFilter(yesterday)
      setStartDate(yesterday)
      setEndDate(yesterday)
    } else if (presetKey === 'LAST_7_DAYS') {
      const past7 = new Date(now)
      past7.setDate(past7.getDate() - 6)
      setDateFilter('')
      setStartDate(formatDateLocal(past7))
      setEndDate(formatDateLocal(now))
    } else if (presetKey === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      setDateFilter('')
      setStartDate(formatDateLocal(firstDay))
      setEndDate(formatDateLocal(now))
    }
  }

  const handleCustomDateChange = (val) => {
    if (!val) {
      setDatePreset('ALL')
      setDateFilter('')
      setStartDate('')
      setEndDate('')
    } else {
      setDatePreset('CUSTOM')
      setDateFilter(val)
      setStartDate(val)
      setEndDate(val)
    }
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setDebouncedSearchTerm('')
    searchInputRef.current?.focus()
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setDebouncedSearchTerm(searchTerm)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setSearchTerm('')
      setDebouncedSearchTerm('')
      searchInputRef.current?.blur()
    }
  }

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setDebouncedSearchTerm('')
    setDateFilter('')
    setStartDate('')
    setEndDate('')
    setDatePreset('ALL')
    setStatusFilter('ALL')
    setPaymentMethodFilter('ALL')
    setPage(1)
  }

  const hasActiveFilters = Boolean(
    searchTerm ||
      debouncedSearchTerm ||
      datePreset !== 'ALL' ||
      dateFilter ||
      startDate ||
      statusFilter !== 'ALL' ||
      paymentMethodFilter !== 'ALL',
  )

  useEffect(() => {
    setFocusedIndex(-1)
  }, [sales])

  const canEditSale = useCallback(
    (sale) => {
      if (!sale || sale.is_voided || sale.is_refunded) return false
      if (sale.is_fiscal || sale.electronic_invoice?.status === 'APPROVED') return false
      if (isAdmin) return true
      if (!user) return false
      const currentId = user.user_id || user.id
      return String(sale.user) === String(currentId)
    },
    [isAdmin, user],
  )

  const handleEditSale = useCallback(
    (sale) => {
      if (!sale) return
      navigate(`/new-sale?edit=${sale.id}`)
      setSelectedSale(null)
    },
    [navigate],
  )

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
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((i) => Math.min(sales.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((i) => Math.max(0, i - 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setPage((p) => Math.max(1, p - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setPage((p) => Math.min(totalPages, p + 1))
      } else if (focusedIndex >= 0 && focusedIndex < sales.length) {
        const activeSale = sales[focusedIndex]
        if (e.key === 'Enter') {
          e.preventDefault()
          setSelectedSale(activeSale)
        } else if (e.key === 'e' || e.key === 'E') {
          e.preventDefault()
          if (canEditSale(activeSale)) handleEditSale(activeSale)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sales, focusedIndex, totalPages, canEditSale, handleEditSale])

  const fetchSales = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearchTerm.trim() || undefined,
        status: statusFilter,
        payment_method: paymentMethodFilter !== 'ALL' ? paymentMethodFilter : undefined,
      }
      if (startDate && endDate) {
        if (startDate === endDate) {
          params.date = startDate
        } else {
          params.start_date = startDate
          params.end_date = endDate
        }
      } else if (dateFilter) {
        params.date = dateFilter
      }

      const data = await salesService.getAll(params, controller.signal)
      const results = data.results || data
      setSales(Array.isArray(results) ? results : [])
      if (data.count !== undefined) {
        setTotalPages(Math.max(1, Math.ceil(data.count / PAGE_SIZE)))
      } else {
        setTotalPages(1)
      }
    } catch (error) {
      if (
        error?.name === 'AbortError' ||
        error?.name === 'CanceledError' ||
        error?.code === 'ERR_CANCELED' ||
        api.isCancel?.(error)
      ) {
        return
      }
      console.error(error)
      toast.error('Error al cargar ventas')
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false)
      }
    }
  }, [page, debouncedSearchTerm, dateFilter, startDate, endDate, statusFilter, paymentMethodFilter])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  const handleAction = async (e) => {
    e.preventDefault()
    const actionType = showActionModal
    const id = selectedSale.id

    const expectedText = actionType === 'anular' ? 'borrar' : 'reembolsar'
    if (confirmText !== expectedText) {
      toast.error(`Debe escribir '${expectedText}' para confirmar.`)
      return
    }

    setActionLoading(true)
    try {
      if (actionType === 'anular' && selectedSale?.electronic_invoice?.status === 'APPROVED') {
        // Venta fiscal con ARCA: debe emitirse Nota de Crédito
        await arcaService.emitCreditNote(id, reason || 'Anulación de venta y emisión de Nota de Crédito')
        toast.success('Nota de Crédito emitida en ARCA y venta anulada con éxito.')
      } else {
        const payload = { confirm_text: confirmText, reason }
        if (actionType === 'anular') {
          await salesService.anular(id, payload)
        } else {
          await salesService.reembolsar(id, payload)
        }
        toast.success(`Venta ${actionType === 'anular' ? 'anulada' : 'reembolsada'} con éxito`)
      }
      setShowActionModal(null)
      setConfirmText('')
      setReason('')
      setSelectedSale(null)
      fetchSales()
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.error || 'Error al procesar la acción')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadOfficialArcaPDF = async (sale, invoiceId = null, voucherLabel = null) => {
    if (!sale?.id) return
    const targetInv =
      invoiceId && sale.electronic_invoices
        ? sale.electronic_invoices.find((i) => i.id === invoiceId)
        : sale.electronic_invoice
    const letter = targetInv?.voucher_letter || 'B'
    const number = targetInv?.formatted_number || sale.id
    const isCreditNote = [2, 3, 7, 8, 12, 13].includes(targetInv?.voucher_type)
    const prefix = voucherLabel || (isCreditNote ? 'NC' : 'Factura')
    try {
      await arcaService.downloadInvoicePdf(sale.id, `${prefix}_${letter}_${number}.pdf`, invoiceId)
    } catch {
      toast.error('Error al generar PDF oficial de ARCA')
    }
  }

  const handleAuthorizeArcaRetroactive = async (sale) => {
    if (!sale?.id) return
    try {
      toast.info('Solicitando autorización a ARCA...', { toastId: 'arca-authorizing' })
      await arcaService.authorizeSale(sale.id)
      toast.success('Factura autorizada exitosamente en ARCA.', { toastId: 'arca-success' })
      fetchSales()
      setSelectedSale(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al autorizar factura en ARCA')
    }
  }

  const handleHardDelete = () => {
    if (!selectedSale) return
    setShowConfirmDeleteModal(true)
  }

  const confirmHardDelete = async () => {
    setDeleteLoading(true)
    try {
      await salesService.hardDelete(selectedSale.id)
      toast.success('Venta eliminada definitivamente')
      setShowConfirmDeleteModal(false)
      setShowActionModal(null)
      setSelectedSale(null)
      fetchSales()
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo eliminar la venta')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handlePrintTicket = (sale) => {
    printSaleThermalTicket(sale, ticketConfigRef.current)
  }

  const handleDownloadTicketPDF = async (sale) => {
    setDownloadingPDF(true)
    try {
      await downloadSaleReceiptPdf(sale, ticketConfigRef.current)
    } finally {
      setDownloadingPDF(false)
    }
  }

  const handleCloseDetail = () => {
    setSelectedSale(null)
  }
  const hasActions =
    selectedSale &&
    ((isAdmin && !selectedSale.is_voided && !selectedSale.is_refunded) ||
      canEditSale(selectedSale) ||
      (isAdmin && selectedSale.is_voided))

  return (
    <div className="sales-page page">
      <div className="page-header">
        <div className="page-header-title">
          <p className="eyebrow">Ventas</p>
          <h2 className="page-heading">Ventas</h2>
          <p className="page-subtitle">
            Registrá, revisá y administrá las operaciones del negocio.
          </p>
        </div>
      </div>

      {/* Header / Toolbar */}
      <div className="card page-toolbar sales-toolbar">
        <div className="sales-search-container">
          <Input
            ref={searchInputRef}
            className="sales-search"
            placeholder="Buscar por ID (#), vendedor, producto o servicio…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            icon={<Search size={16} />}
            suffix={
              searchTerm ? (
                <div className="sales-search-suffix-group">
                  {loading && <Loader2 size={14} className="sales-search-spinner" />}
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={handleClearSearch}
                    title="Borrar búsqueda (Esc)"
                    aria-label="Borrar búsqueda"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <kbd className="search-kbd">/</kbd>
              )
            }
          />
        </div>

        {/* Quick Date Presets */}
        <div className="sales-quick-presets" role="group" aria-label="Filtros rápidos de fecha">
          <button
            type="button"
            className={`preset-chip ${datePreset === 'ALL' ? 'active' : ''}`}
            onClick={() => applyDatePreset('ALL')}
          >
            Todas
          </button>
          <button
            type="button"
            className={`preset-chip ${datePreset === 'TODAY' ? 'active' : ''}`}
            onClick={() => applyDatePreset('TODAY')}
          >
            Hoy
          </button>
          <button
            type="button"
            className={`preset-chip ${datePreset === 'YESTERDAY' ? 'active' : ''}`}
            onClick={() => applyDatePreset('YESTERDAY')}
          >
            Ayer
          </button>
          <button
            type="button"
            className={`preset-chip ${datePreset === 'LAST_7_DAYS' ? 'active' : ''}`}
            onClick={() => applyDatePreset('LAST_7_DAYS')}
          >
            7 días
          </button>
          <button
            type="button"
            className={`preset-chip ${datePreset === 'THIS_MONTH' ? 'active' : ''}`}
            onClick={() => applyDatePreset('THIS_MONTH')}
          >
            Este Mes
          </button>
        </div>

        <div className="toolbar-group sales-actions">
          {/* Date Picker using showPicker API */}
          <div className="sales-filter">
            <input
              ref={dateInputRef}
              type="date"
              style={{
                position: 'absolute',
                visibility: 'hidden',
                width: 0,
                height: 0,
                bottom: 0,
                left: 0,
              }}
              onChange={(e) => handleCustomDateChange(e.target.value)}
              value={datePreset === 'CUSTOM' ? dateFilter || startDate : ''}
            />
            <button
              className={`ui-btn ${datePreset === 'CUSTOM' ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
              onClick={() => {
                if (dateInputRef.current) {
                  try {
                    dateInputRef.current.showPicker()
                  } catch {
                    dateInputRef.current.style.visibility = 'visible'
                    dateInputRef.current.focus()
                    dateInputRef.current.click()
                    setTimeout(() => {
                      dateInputRef.current.style.visibility = 'hidden'
                    }, 100)
                  }
                }
              }}
              title="Filtrar por fecha específica"
            >
              <Calendar size={16} />
              <span>
                {datePreset === 'CUSTOM' && (dateFilter || startDate)
                  ? formatDateOnly(dateFilter || startDate)
                  : 'Fecha'}
              </span>
              {datePreset === 'CUSTOM' && (
                <span
                  style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    applyDatePreset('ALL')
                  }}
                  title="Quitar filtro de fecha"
                >
                  <X size={13} />
                </span>
              )}
            </button>
          </div>

          {/* Payment Method Filter Dropdown */}
          <div className="sales-filter" ref={paymentMenuRef}>
            <button
              className={`ui-btn ${paymentMethodFilter !== 'ALL' ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
              onClick={() => setShowPaymentMenu(!showPaymentMenu)}
              aria-haspopup="true"
              aria-expanded={showPaymentMenu}
              title="Filtrar por método de pago"
            >
              <CreditCard size={16} />
              <span>
                {paymentMethodFilter === 'ALL'
                  ? 'Método'
                  : paymentMethodFilter === 'EFECTIVO'
                    ? 'Efectivo'
                    : paymentMethodFilter === 'DEBITO'
                      ? 'Débito'
                      : paymentMethodFilter === 'CREDITO'
                        ? 'Crédito'
                        : paymentMethodFilter === 'TRANSFERENCIA'
                          ? 'Transferencia'
                          : 'Pago Dividido'}
              </span>
            </button>

            {showPaymentMenu && (
              <div className="sales-filter-dropdown">
                <button
                  className={`dropdown-item ${paymentMethodFilter === 'ALL' ? 'active font-bold' : ''}`}
                  onClick={() => {
                    setPaymentMethodFilter('ALL')
                    setShowPaymentMenu(false)
                  }}
                >
                  Todos los métodos
                </button>
                <button
                  className={`dropdown-item ${paymentMethodFilter === 'EFECTIVO' ? 'active font-bold' : ''}`}
                  onClick={() => {
                    setPaymentMethodFilter('EFECTIVO')
                    setShowPaymentMenu(false)
                  }}
                >
                  Efectivo
                </button>
                <button
                  className={`dropdown-item ${paymentMethodFilter === 'DEBITO' ? 'active font-bold' : ''}`}
                  onClick={() => {
                    setPaymentMethodFilter('DEBITO')
                    setShowPaymentMenu(false)
                  }}
                >
                  Débito
                </button>
                <button
                  className={`dropdown-item ${paymentMethodFilter === 'CREDITO' ? 'active font-bold' : ''}`}
                  onClick={() => {
                    setPaymentMethodFilter('CREDITO')
                    setShowPaymentMenu(false)
                  }}
                >
                  Crédito
                </button>
                <button
                  className={`dropdown-item ${paymentMethodFilter === 'TRANSFERENCIA' ? 'active font-bold' : ''}`}
                  onClick={() => {
                    setPaymentMethodFilter('TRANSFERENCIA')
                    setShowPaymentMenu(false)
                  }}
                >
                  Transferencia
                </button>
                <button
                  className={`dropdown-item ${paymentMethodFilter === 'MIXTO' ? 'active font-bold' : ''}`}
                  onClick={() => {
                    setPaymentMethodFilter('MIXTO')
                    setShowPaymentMenu(false)
                  }}
                >
                  Pago Dividido
                </button>
              </div>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className="sales-filter" ref={filterMenuRef}>
            <button
              className={`ui-btn ${statusFilter !== 'ALL' ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              aria-haspopup="true"
              aria-expanded={showFilterMenu}
            >
              <Filter size={16} />
              <span>
                {statusFilter === 'ALL'
                  ? 'Estado'
                  : statusFilter === 'COMPLETED'
                    ? 'Completas'
                    : statusFilter === 'VOIDED'
                      ? 'Anuladas'
                      : 'Reembolsadas'}
              </span>
            </button>

            {showFilterMenu && (
              <div className="sales-filter-dropdown">
                <button
                  className={`dropdown-item ${statusFilter === 'ALL' ? 'active font-bold' : ''}`}
                  onClick={() => {
                    setStatusFilter('ALL')
                    setShowFilterMenu(false)
                  }}
                >
                  Todas
                </button>
                <button
                  className={`dropdown-item ${statusFilter === 'COMPLETED' ? 'active font-bold' : ''}`}
                  onClick={() => {
                    setStatusFilter('COMPLETED')
                    setShowFilterMenu(false)
                  }}
                >
                  <span className="filter-dot bg-green-500"></span> Completadas
                </button>
                <button
                  className={`dropdown-item ${statusFilter === 'VOIDED' ? 'active font-bold' : ''}`}
                  onClick={() => {
                    setStatusFilter('VOIDED')
                    setShowFilterMenu(false)
                  }}
                >
                  <span className="filter-dot bg-red-500"></span> Anuladas
                </button>
                <button
                  className={`dropdown-item ${statusFilter === 'REFUNDED' ? 'active font-bold' : ''}`}
                  onClick={() => {
                    setStatusFilter('REFUNDED')
                    setShowFilterMenu(false)
                  }}
                >
                  <span className="filter-dot bg-yellow-500"></span> Reembolsadas
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active filters summary bar */}
      {hasActiveFilters && (
        <div className="sales-active-filters-bar">
          <span className="active-filters-label">Filtros activos:</span>
          {debouncedSearchTerm && (
            <span className="filter-chip">
              Búsqueda: <strong>"{debouncedSearchTerm}"</strong>
              <button
                type="button"
                onClick={handleClearSearch}
                className="filter-chip-remove"
                title="Quitar filtro de búsqueda"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {datePreset !== 'ALL' && (
            <span className="filter-chip">
              Fecha:{' '}
              <strong>
                {datePreset === 'TODAY'
                  ? `Hoy (${formatDateOnly(startDate)})`
                  : datePreset === 'YESTERDAY'
                    ? `Ayer (${formatDateOnly(startDate)})`
                    : datePreset === 'LAST_7_DAYS'
                      ? `7 días (${formatDateOnly(startDate)} a ${formatDateOnly(endDate)})`
                      : datePreset === 'THIS_MONTH'
                        ? `Este mes (${formatDateOnly(startDate)} a ${formatDateOnly(endDate)})`
                        : `${formatDateOnly(startDate || dateFilter)}`}
              </strong>
              <button
                type="button"
                onClick={() => applyDatePreset('ALL')}
                className="filter-chip-remove"
                title="Quitar filtro de fecha"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {paymentMethodFilter !== 'ALL' && (
            <span className="filter-chip">
              Método:{' '}
              <strong>
                {paymentMethodFilter === 'EFECTIVO'
                  ? 'Efectivo'
                  : paymentMethodFilter === 'DEBITO'
                    ? 'Débito'
                    : paymentMethodFilter === 'CREDITO'
                      ? 'Crédito'
                      : paymentMethodFilter === 'TRANSFERENCIA'
                        ? 'Transferencia'
                        : 'Pago Dividido'}
              </strong>
              <button
                type="button"
                onClick={() => setPaymentMethodFilter('ALL')}
                className="filter-chip-remove"
                title="Quitar filtro de método"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {statusFilter !== 'ALL' && (
            <span className="filter-chip">
              Estado:{' '}
              <strong>
                {statusFilter === 'COMPLETED'
                  ? 'Completadas'
                  : statusFilter === 'VOIDED'
                    ? 'Anuladas'
                    : 'Reembolsadas'}
              </strong>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className="filter-chip-remove"
                title="Quitar filtro de estado"
              >
                <X size={12} />
              </button>
            </span>
          )}
          <button
            type="button"
            className="clear-all-filters-btn"
            onClick={handleClearAllFilters}
          >
            Limpiar filtros
          </button>
        </div>
      )}

      <div className="table-container shadow-sm">
        <table className="styled-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Vendedor</th>
              <th>Método</th>
              <th>Total</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center p-8 text-muted">
                  Cargando ventas…
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center p-8 text-muted">
                  Todavía no hay ventas para los filtros aplicados.
                </td>
              </tr>
            ) : (
              sales.map((sale, idx) => (
                <tr
                  key={sale.id}
                  className={sale.is_voided || sale.is_refunded ? 'row-muted opacity-60' : ''}
                  onClick={() => setSelectedSale(sale)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: focusedIndex === idx ? 'rgba(14, 165, 233, 0.12)' : undefined,
                    '--delay': `${idx * 25}ms`,
                  }}
                  onMouseEnter={() => setFocusedIndex(idx)}
                >
                  <td className="font-bold text-muted cell-sale-id" data-label="ID">
                    <span className="sale-id-badge">#{sale.sale_number || sale.id}</span>
                    <span className="sale-date-mobile muted tiny">{formatDate(sale.date)}</span>
                  </td>
                  <td className="cell-sale-date" data-label="Fecha">
                    {formatDate(sale.date)}
                  </td>
                  <td className="cell-sale-seller" data-label="Vendedor">
                    <div className="flex items-center gap-1">
                      <div className="seller-avatar" title={sale.user_name}>
                        {sale.user_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{sale.user_name}</span>
                    </div>
                  </td>
                  <td className="cell-sale-method" data-label="Método">
                    {sale.payment_method === 'MIXTO' ? (
                      <span
                        className="badge sale-badge-mixto"
                        style={{
                          backgroundColor: 'rgba(99, 102, 241, 0.15)',
                          color: 'var(--primary-300, #a5b4fc)',
                          border: '1px solid rgba(99, 102, 241, 0.35)',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          cursor: 'help',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title={
                          sale.payment_details?.method_1 && sale.payment_details?.method_2
                            ? `${sale.payment_details.method_1}: $${Number(sale.payment_details.amount_1).toLocaleString('es-AR')} | ${sale.payment_details.method_2}: $${Number(sale.payment_details.amount_2).toLocaleString('es-AR')}`
                            : 'Pago dividido en 2 métodos'
                        }
                      >
                        2 Métodos
                      </span>
                    ) : (
                      sale.payment_method
                    )}
                  </td>
                  <td className="font-bold cell-sale-total" data-label="Total">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="cell-sale-status" data-label="Estado">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                      {sale.is_voided ? (
                        <span className="badge badge-danger">ANULADA</span>
                      ) : sale.is_refunded ? (
                        <span className="badge badge-warning">REEMBOLSADA</span>
                      ) : (
                        <span className="badge badge-success">COMPLETA</span>
                      )}
                      {sale.electronic_invoice?.status === 'APPROVED' && (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(37, 99, 235, 0.1)',
                            color: '#2563eb',
                            border: '1px solid rgba(37, 99, 235, 0.25)',
                            fontSize: '0.68rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <ShieldCheck size={11} />
                          {sale.electronic_invoice.voucher_letter} #{sale.electronic_invoice.formatted_number}
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    style={{ textAlign: 'right' }}
                    data-label="Acciones"
                    className="cell-sale-actions"
                  >
                    <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                      {sale.electronic_invoice?.status === 'APPROVED' && (
                        <button
                          className="btn-icon"
                          style={{ color: '#2563eb' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadOfficialArcaPDF(sale)
                          }}
                          title="Descargar / Imprimir Factura Oficial A4"
                          aria-label={`Factura A4 venta #${sale.sale_number || sale.id}`}
                        >
                          <FileText size={18} />
                        </button>
                      )}
                      <button
                        className="btn-icon sale-view-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedSale(sale)
                        }}
                        title="Ver detalle"
                        aria-label={`Ver detalle de venta #${sale.sale_number || sale.id}`}
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="ui-btn ui-btn-ghost"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className="muted small">
            Página {page} de {totalPages}
          </span>
          <button
            className="ui-btn ui-btn-ghost"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Sale Detail Modal */}
      <SaleDetailModal
        selectedSale={!showActionModal ? selectedSale : null}
        onClose={handleCloseDetail}
        isMobile={isMobile}
        isAdmin={isAdmin}
        hasActions={hasActions}
        downloadingPDF={downloadingPDF}
        handleDownloadOfficialArcaPDF={handleDownloadOfficialArcaPDF}
        handleDownloadTicketPDF={handleDownloadTicketPDF}
        handlePrintTicket={handlePrintTicket}
        setShowActionModal={setShowActionModal}
        handleAuthorizeArcaRetroactive={handleAuthorizeArcaRetroactive}
        canEditSale={canEditSale}
        handleEditSale={handleEditSale}
        handleHardDelete={handleHardDelete}
        setHoveredProduct={setHoveredProduct}
        setMousePos={setMousePos}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
      />

      {/* Confirmation Action Modal */}
      <SaleActionModal
        actionType={showActionModal}
        onClose={() => {
          setShowActionModal(null)
          setConfirmText('')
          setReason('')
        }}
        confirmText={confirmText}
        setConfirmText={setConfirmText}
        reason={reason}
        setReason={setReason}
        onSubmit={handleAction}
        actionLoading={actionLoading}
      />

      {showConfirmDeleteModal && (
        <ConfirmModal
          isOpen={showConfirmDeleteModal}
          onClose={() => setShowConfirmDeleteModal(false)}
          onConfirm={confirmHardDelete}
          title="Eliminar venta definitivamente"
          message="¿Estás seguro de que deseas eliminar definitivamente esta venta anulada? Esta acción no se puede deshacer y borrará todos los movimientos asociados."
          confirmLabel="Eliminar definitivamente"
          cancelLabel="Cancelar"
          variant="danger"
          loading={deleteLoading}
        />
      )}

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

export default Sales
