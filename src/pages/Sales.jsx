import React, { useEffect, useState, useContext, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
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
  Edit,
  Printer,
  FileDown,
} from 'lucide-react'
import { toast } from 'react-toastify'
import { formatCurrency, formatDate } from '../utils/format'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import Input from '../components/ui/Input'

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
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const [reason, setReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const PAGE_SIZE = 20
  const dateInputRef = useRef(null)
  const searchInputRef = useRef(null)
  const ticketConfigRef = useRef(null)
  const filterMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false)
      }
    }
    const handleEsc = (event) => {
      if (event.key === 'Escape') setShowFilterMenu(false)
    }
    if (showFilterMenu) {
      window.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('touchstart', handleClickOutside)
      window.addEventListener('keydown', handleEsc)
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('touchstart', handleClickOutside)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [showFilterMenu])
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
    api
      .get('settings/')
      .then((res) => {
        ticketConfigRef.current = res.data
      })
      .catch((err) => console.error('Error loading ticket settings', err))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Return to page 1 on filter changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearchTerm, dateFilter, statusFilter])

  useEffect(() => {
    setFocusedIndex(-1)
  }, [sales])

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
  }, [sales, focusedIndex, totalPages, user, isAdmin])

  useEffect(() => {
    fetchSales()
  }, [page, debouncedSearchTerm, dateFilter, statusFilter])

  const fetchSales = async () => {
    setLoading(true)
    try {
      const response = await api.get('sales/sales/', {
        params: {
          page,
          page_size: PAGE_SIZE,
          search: debouncedSearchTerm || undefined,
          date: dateFilter || undefined,
          status: statusFilter,
        },
      })
      const data = response.data
      const results = data.results || data
      setSales(Array.isArray(results) ? results : [])
      if (data.count) {
        setTotalPages(Math.max(1, Math.ceil(data.count / PAGE_SIZE)))
      } else {
        setTotalPages(1)
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al cargar ventas')
    } finally {
      setLoading(false)
    }
  }

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
      const endpoint = actionType === 'anular' ? 'anular' : 'reembolsar'
      await api.post(`sales/sales/${id}/${endpoint}/`, {
        confirm_text: confirmText,
        reason: reason,
      })
      toast.success(`Venta ${actionType === 'anular' ? 'anulada' : 'reembolsada'} con éxito`)
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

  const handleHardDelete = () => {
    if (!selectedSale) return
    setShowConfirmDeleteModal(true)
  }

  const confirmHardDelete = async () => {
    setDeleteLoading(true)
    try {
      await api.delete(`sales/sales/${selectedSale.id}/hard-delete/`)
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

  const canEditSale = (sale) => {
    if (!sale || sale.is_voided || sale.is_refunded) return false
    if (isAdmin) return true
    if (!user) return false
    const currentId = user.user_id || user.id
    return String(sale.user) === String(currentId)
  }

  if (loading) return <div className="p-8 text-center text-muted">Cargando ventas…</div>

  const handlePrintTicket = (sale) => {
    if (!sale) return

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
    const ticketWidth = ticketConfigRef.current?.ticket_width || '58mm'
    const is58mm = ticketWidth === '58mm'

    // Lógica corregida de descuentos
    const itemsBaseSubtotal = sale.items.reduce(
      (acc, item) => acc + parseFloat(item.price) * item.quantity,
      0,
    )
    const itemsDiscountTotal = sale.items.reduce(
      (acc, item) => acc + (parseFloat(item.discount) || 0),
      0,
    )
    const globalDiscount = parseFloat(sale.discount) || 0
    const totalDiscount = itemsDiscountTotal + globalDiscount
    const finalTotal = parseFloat(sale.total)

    const htmlContent = `
      <html>
        <head>
          <title>Ticket de Venta #${sale.sale_number || sale.id}</title>
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
            <div class="info">Fecha: ${new Date(sale.date).toLocaleString('es-AR', { hour12: false })}</div>
            <div class="info">Ticket #${sale.sale_number || sale.id}</div>
            <div class="info">Pago: ${
              sale.payment_method === 'MIXTO' && sale.payment_details
                ? `Dividido (${sale.payment_details.method_1}: $${Number(sale.payment_details.amount_1 || 0).toLocaleString('es-AR')} + ${sale.payment_details.method_2}: $${Number(sale.payment_details.amount_2 || 0).toLocaleString('es-AR')})`
                : sale.payment_method
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
              ${sale.items
                .map((item) => {
                  const itemPrice = parseFloat(item.price) || 0
                  const baseSub = itemPrice * item.quantity
                  const descItem = parseFloat(item.discount) || 0
                  const itemLabel =
                    item.item_type === 'SERVICIO'
                      ? item.description || 'Servicio'
                      : item.producto_nombre || item.nombre || 'Producto'

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
  }

  const handleDownloadTicketPDF = async (sale) => {
    if (!sale) return
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
    const itemsBaseSubtotal = sale.items.reduce(
      (acc, item) => acc + parseFloat(item.price) * item.quantity,
      0,
    )
    const itemsDiscountTotal = sale.items.reduce(
      (acc, item) => acc + (parseFloat(item.discount) || 0),
      0,
    )
    const globalDiscount = parseFloat(sale.discount) || 0
    const totalDiscount = itemsDiscountTotal + globalDiscount
    const finalTotal = parseFloat(sale.total)

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
            <p style="font-size: 18px; font-weight: 800; color: #0284c7; margin: 4px 0 8px 0;">#${sale.sale_number || sale.id}</p>
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
            <strong>Fecha:</strong> ${new Date(sale.date).toLocaleString('es-AR', { hour12: false })}
          </div>
          <div>
            <strong>Método de Pago:</strong> ${
              sale.payment_method === 'MIXTO' && sale.payment_details
                ? `Pago Dividido (${sale.payment_details.method_1}: $${Number(sale.payment_details.amount_1 || 0).toLocaleString('es-AR')} / ${sale.payment_details.method_2}: $${Number(sale.payment_details.amount_2 || 0).toLocaleString('es-AR')})`
                : sale.payment_method
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
            ${sale.items
              .map((item) => {
                const itemPrice = parseFloat(item.price) || 0
                const baseSub = itemPrice * item.quantity
                const descItem = parseFloat(item.discount) || 0
                const itemLabel =
                  item.item_type === 'SERVICIO'
                    ? item.description || 'Servicio'
                    : item.producto_nombre || item.nombre || 'Producto'
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
              <td style="padding: 8px 10px; font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase;">Total</td>
              <td style="padding: 8px 10px; text-align: right; font-size: 14px; font-weight: 800; color: #0284c7;">$${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 15px; font-size: 9px; color: #64748b; white-space: pre-wrap; line-height: 1.6;">
          <p style="margin: 0;">${footerText}</p>
        </div>
      </div>
    `

    try {
      const html2pdf = await loadHtml2Pdf()
      const element = document.createElement('div')
      element.innerHTML = htmlContent
      const opt = {
        margin: 15,
        filename: `Comprobante_Venta_${sale.sale_number || sale.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }
      await html2pdf().from(element).set(opt).save()
    } catch (error) {
      console.error(error)
      toast.error('Error al generar el PDF')
    } finally {
      setDownloadingPDF(false)
    }
  }

  const handleEditSale = (sale) => {
    if (!sale) return
    navigate(`/new-sale?edit=${sale.id}`)
    setSelectedSale(null)
  }

  const handleCloseDetail = () => {
    setSelectedSale(null)
    setShowAdminMenu(false)
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
        <Input
          ref={searchInputRef}
          className="sales-search"
          placeholder="Buscar por ID o vendedor (Presione /)…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search size={16} />}
          suffix={<kbd className="search-kbd">/</kbd>}
        />
        <div className="toolbar-group sales-actions">
          {/* Date Picker using showPicker API */}
          <div className="sales-filter">
            <input
              ref={dateInputRef}
              type="date"
              style={{
                position: 'absolute',
                visibility: 'hidden', // Completely hide it but keep it in DOM
                width: 0,
                height: 0,
                bottom: 0,
                left: 0,
              }}
              onChange={(e) => setDateFilter(e.target.value)}
              value={dateFilter}
            />
            <button
              className={`ui-btn ${dateFilter ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
              onClick={() => {
                if (dateInputRef.current) {
                  try {
                    dateInputRef.current.showPicker()
                  } catch {
                    // Fallback for browsers not supporting showPicker
                    dateInputRef.current.style.visibility = 'visible'
                    dateInputRef.current.focus()
                    dateInputRef.current.click()
                    setTimeout(() => {
                      dateInputRef.current.style.visibility = 'hidden'
                    }, 100)
                  }
                }
              }}
            >
              <Calendar size={16} />
              {dateFilter ? formatDate(dateFilter) : 'Fecha'}
              {dateFilter && (
                <div
                  style={{ marginLeft: 8 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setDateFilter('')
                  }}
                >
                  <X size={14} />
                </div>
              )}
            </button>
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
              {statusFilter === 'ALL'
                ? 'Filtrar'
                : statusFilter === 'COMPLETED'
                  ? 'Completas'
                  : statusFilter === 'VOIDED'
                    ? 'Anuladas'
                    : 'Reembolsadas'}
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
            {sales.map((sale, idx) => (
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
                  {sale.is_voided ? (
                    <span className="badge badge-danger">ANULADA</span>
                  ) : sale.is_refunded ? (
                    <span className="badge badge-warning">REEMBOLSADA</span>
                  ) : (
                    <span className="badge badge-success">COMPLETA</span>
                  )}
                </td>
                <td
                  style={{ textAlign: 'right' }}
                  data-label="Acciones"
                  className="cell-sale-actions"
                >
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
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center p-8 text-muted">
                  Todavía no hay ventas para los filtros aplicados.
                </td>
              </tr>
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
      {selectedSale && !showActionModal && (
        <Modal
          title={`Detalle de venta #${selectedSale.sale_number || selectedSale.id}`}
          onClose={handleCloseDetail}
          size="lg"
          className="sale-detail-modal-container"
          footer={
            isMobile ? (
              <div className="sale-detail-foot-mobile">
                <div className="sale-detail-foot-row">
                  <button
                    onClick={() => handleDownloadTicketPDF(selectedSale)}
                    className="ui-btn ui-btn-secondary"
                    disabled={downloadingPDF}
                  >
                    <FileDown size={14} /> PDF
                  </button>
                  <button
                    onClick={() => handlePrintTicket(selectedSale)}
                    className="ui-btn ui-btn-secondary"
                  >
                    <Printer size={14} /> Ticket
                  </button>
                </div>

                <div className="sale-detail-foot-row">
                  {hasActions && (
                    <div className="sale-detail-admin-wrapper">
                      <button
                        onClick={() => setShowAdminMenu(!showAdminMenu)}
                        className="ui-btn ui-btn-secondary sale-admin-toggle-btn"
                      >
                        <span>Acciones</span>
                        <span style={{ fontSize: '0.65rem' }}>▼</span>
                      </button>
                      {showAdminMenu && (
                        <div className="sale-admin-dropdown-menu">
                          {isAdmin && !selectedSale.is_voided && !selectedSale.is_refunded && (
                            <button
                              onClick={() => {
                                setShowActionModal('reembolsar')
                                setShowAdminMenu(false)
                              }}
                              className="sale-admin-item text-warning"
                            >
                              <RotateCcw size={14} /> Reembolsar venta
                            </button>
                          )}
                          {canEditSale(selectedSale) && (
                            <>
                              <button
                                onClick={() => {
                                  setShowActionModal('anular')
                                  setShowAdminMenu(false)
                                }}
                                className="sale-admin-item text-danger"
                              >
                                <Trash2 size={14} /> Anular venta
                              </button>
                              <button
                                onClick={() => {
                                  handleEditSale(selectedSale)
                                  setShowAdminMenu(false)
                                }}
                                className="sale-admin-item"
                              >
                                <Edit size={14} /> Editar venta
                              </button>
                            </>
                          )}
                          {isAdmin && selectedSale.is_voided && (
                            <button
                              onClick={() => {
                                handleHardDelete()
                                setShowAdminMenu(false)
                              }}
                              className="sale-admin-item text-danger"
                            >
                              <Trash2 size={14} /> Eliminar venta
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    className="ui-btn ui-btn-primary sale-detail-close-btn"
                    onClick={handleCloseDetail}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  gap: '8px',
                }}
              >
                {/* Actions Dropdown for Desktop */}
                {hasActions ? (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowAdminMenu(!showAdminMenu)}
                      className="ui-btn ui-btn-secondary"
                      style={{
                        height: '34px',
                        minHeight: '34px',
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        gap: '6px',
                      }}
                    >
                      <span>Acciones</span>
                      <span style={{ fontSize: '0.65rem' }}>▼</span>
                    </button>
                    {showAdminMenu && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: 0,
                          marginBottom: '6px',
                          background: 'var(--surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          boxShadow: 'var(--shadow-lg)',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          zIndex: 100,
                          minWidth: '160px',
                        }}
                      >
                        {isAdmin && !selectedSale.is_voided && !selectedSale.is_refunded && (
                          <button
                            onClick={() => {
                              setShowActionModal('reembolsar')
                              setShowAdminMenu(false)
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = 'var(--surface-hover)')
                            }
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '8px 12px',
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--warning-text)',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              textAlign: 'left',
                              borderRadius: '6px',
                              fontWeight: 'bold',
                              transition: 'background 0.15s',
                            }}
                          >
                            <RotateCcw size={14} /> Reembolsar
                          </button>
                        )}
                        {canEditSale(selectedSale) && (
                          <>
                            <button
                              onClick={() => {
                                setShowActionModal('anular')
                                setShowAdminMenu(false)
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = 'var(--surface-hover)')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = 'transparent')
                              }
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 12px',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--danger-text)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                transition: 'background 0.15s',
                              }}
                            >
                              <Trash2 size={14} /> Anular
                            </button>
                            <button
                              onClick={() => {
                                handleEditSale(selectedSale)
                                setShowAdminMenu(false)
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = 'var(--surface-hover)')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = 'transparent')
                              }
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 12px',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                transition: 'background 0.15s',
                              }}
                            >
                              <Edit size={14} /> Editar
                            </button>
                          </>
                        )}
                        {isAdmin && selectedSale.is_voided && (
                          <button
                            onClick={() => {
                              handleHardDelete()
                              setShowAdminMenu(false)
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = 'var(--surface-hover)')
                            }
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '8px 12px',
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--danger-text)',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              textAlign: 'left',
                              borderRadius: '6px',
                              fontWeight: 'bold',
                              transition: 'background 0.15s',
                            }}
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div />
                )}

                {/* Secondary Output Actions & Close for Desktop */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '6px',
                    alignItems: 'center',
                  }}
                >
                  <button
                    onClick={() => handleDownloadTicketPDF(selectedSale)}
                    className="ui-btn ui-btn-secondary"
                    disabled={downloadingPDF}
                    style={{
                      height: '34px',
                      minHeight: '34px',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      gap: '6px',
                    }}
                  >
                    <FileDown size={14} /> PDF
                  </button>
                  <button
                    onClick={() => handlePrintTicket(selectedSale)}
                    className="ui-btn ui-btn-secondary"
                    style={{
                      height: '34px',
                      minHeight: '34px',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      gap: '6px',
                    }}
                  >
                    <Printer size={14} /> Ticket
                  </button>
                  <button
                    className="ui-btn ui-btn-primary"
                    onClick={handleCloseDetail}
                    style={{
                      height: '34px',
                      minHeight: '34px',
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )
          }
        >
          <div className="sale-detail-modal stack gap-md">
            {/* Summary Header */}
            <div
              className="sale-detail-summary grid four-cols gap-md p-md"
              style={{
                background: 'var(--surface-muted)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div className="stack gap-xs">
                <span className="eyebrow">Fecha</span>
                <span className="font-medium">{formatDate(selectedSale.date)}</span>
              </div>
              <div className="stack gap-xs">
                <span className="eyebrow">Vendedor</span>
                <div className="flex-row gap-xs items-center">
                  <div className="avatar" style={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                    {selectedSale.user_name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{selectedSale.user_name}</span>
                </div>
              </div>
              <div className="stack gap-xs">
                <span className="eyebrow">Método</span>
                {selectedSale.payment_method === 'MIXTO' && selectedSale.payment_details ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span
                      className="badge badge-primary"
                      style={{ alignSelf: 'flex-start', fontSize: '0.72rem' }}
                    >
                      Pago Dividido
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      • {selectedSale.payment_details.method_1}: $
                      {Number(selectedSale.payment_details.amount_1 || 0).toLocaleString('es-AR')}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      • {selectedSale.payment_details.method_2}: $
                      {Number(selectedSale.payment_details.amount_2 || 0).toLocaleString('es-AR')}
                    </span>
                  </div>
                ) : (
                  <span className="font-medium">{selectedSale.payment_method}</span>
                )}
              </div>
              <div className="stack gap-xs">
                <span className="eyebrow">Estado</span>
                <div>
                  {selectedSale.is_voided ? (
                    <span className="badge badge-danger">ANULADA</span>
                  ) : selectedSale.is_refunded ? (
                    <span className="badge badge-warning">REEMBOLSADA</span>
                  ) : (
                    <span className="badge badge-success">COMPLETADA</span>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="table-container compact sale-detail-items">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: 'right' }}>Cant.</th>
                    <th style={{ textAlign: 'right' }}>Precio</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((item) => {
                    const itemLabel =
                      item.item_type === 'SERVICIO'
                        ? item.description || 'Servicio'
                        : item.producto_nombre || 'Producto'
                    const itemDiscount = parseFloat(item.discount) || 0
                    return (
                      <tr
                        key={item.id}
                        onMouseEnter={() => {
                          if (item.producto_imagen_base64) {
                            setHoveredProduct({
                              nombre: itemLabel,
                              imagen_base64: item.producto_imagen_base64,
                            })
                          }
                        }}
                        onMouseLeave={() => setHoveredProduct(null)}
                        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                      >
                        <td data-label="Producto">
                          {itemLabel}
                          {itemDiscount > 0 && (
                            <>
                              <br />
                              <span className="muted tiny">
                                Desc: -{formatCurrency(itemDiscount)}
                              </span>
                            </>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }} data-label="Cant.">
                          {item.quantity}
                        </td>
                        <td style={{ textAlign: 'right' }} data-label="Precio">
                          {formatCurrency(parseFloat(item.price) || 0)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }} data-label="Total">
                          {formatCurrency(
                            (parseFloat(item.quantity) || 1) * (parseFloat(item.price) || 0) -
                              itemDiscount,
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div
              className="flex-col items-end gap-xs pt-sm"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              {parseFloat(selectedSale.discount) > 0 && (
                <div className="flex-row gap-lg text-sm text-danger-text">
                  <span>Descuento:</span>
                  <span>- {formatCurrency(selectedSale.discount)}</span>
                </div>
              )}
              <div className="flex-row gap-lg text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(selectedSale.total)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Action Modal */}
      {showActionModal && (
        <Modal
          title={showActionModal === 'anular' ? 'Anular venta' : 'Reembolsar venta'}
          onClose={() => {
            setShowActionModal(null)
            setConfirmText('')
            setReason('')
          }}
          size="md"
        >
          <form onSubmit={handleAction}>
            <p className="text-sm text-muted mb-4">
              Para confirmar esta acción irreversible, escribí{' '}
              <strong>{showActionModal === 'anular' ? 'borrar' : 'reembolsar'}</strong> en el campo
              de abajo.
            </p>
            <div className="form-group mb-4">
              <input
                className="input-control w-full"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={showActionModal === 'anular' ? 'borrar' : 'reembolsar'}
                required
                autoFocus
              />
            </div>
            <div className="form-group mb-4">
              <label className="text-sm font-medium mb-1 block">Motivo (opcional)</label>
              <textarea
                className="input-control w-full"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Escribí el motivo (opcional)…"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowActionModal(null)
                  setConfirmText('')
                  setReason('')
                }}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`btn confirm-action ${showActionModal === 'anular' ? 'confirm-danger' : 'confirm-warning'}`}
                style={{ width: 'auto', paddingLeft: '1rem', paddingRight: '1rem' }}
                disabled={actionLoading}
              >
                {actionLoading
                  ? 'Procesando…'
                  : showActionModal === 'anular'
                    ? 'Anular venta'
                    : 'Reembolsar venta'}
              </button>
            </div>
          </form>
        </Modal>
      )}

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
