import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Eye, RotateCcw, Trash2, AlertCircle, X, Search, Calendar, Filter, Edit, Printer, FileDown } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';

const loadHtml2Pdf = () => {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) {
      resolve(window.html2pdf);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => resolve(window.html2pdf);
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

const Sales = () => {
    const { user, isAdmin } = useContext(AuthContext);
    const navigate = useNavigate();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showActionModal, setShowActionModal] = useState(null); // 'anular' or 'reembolsar'
    const [confirmText, setConfirmText] = useState('');
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const [reason, setReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const PAGE_SIZE = 20;
    const dateInputRef = useRef(null);
    const searchInputRef = useRef(null);
    const ticketConfigRef = useRef(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [downloadingPDF, setDownloadingPDF] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 640px)');
        const handleChange = (event) => setIsMobile(event.matches);
        setIsMobile(media.matches);
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        api.get('settings/')
            .then(res => { ticketConfigRef.current = res.data; })
            .catch(err => console.error('Error loading ticket settings', err));
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Return to page 1 on filter changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearchTerm, dateFilter, statusFilter]);

    useEffect(() => {
        setFocusedIndex(-1);
    }, [sales]);

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
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex(i => Math.min(sales.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex(i => Math.max(0, i - 1));
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setPage((p) => Math.max(1, p - 1));
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setPage((p) => Math.min(totalPages, p + 1));
            } else if (focusedIndex >= 0 && focusedIndex < sales.length) {
                const activeSale = sales[focusedIndex];
                if (e.key === 'Enter') {
                    e.preventDefault();
                    setSelectedSale(activeSale);
                } else if (e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                    if (canEditSale(activeSale)) handleEditSale(activeSale);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [sales, focusedIndex, totalPages, user, isAdmin]);

    useEffect(() => {
        fetchSales();
    }, [page, debouncedSearchTerm, dateFilter, statusFilter]);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const response = await api.get('sales/sales/', {
                params: {
                    page,
                    page_size: PAGE_SIZE,
                    search: debouncedSearchTerm || undefined,
                    date: dateFilter || undefined,
                    status: statusFilter
                }
            });
            const data = response.data;
            const results = data.results || data;
            setSales(Array.isArray(results) ? results : []);
            if (data.count) {
                setTotalPages(Math.max(1, Math.ceil(data.count / PAGE_SIZE)));
            } else {
                setTotalPages(1);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar ventas");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (e) => {
        e.preventDefault();
        const actionType = showActionModal;
        const id = selectedSale.id;

        const expectedText = actionType === 'anular' ? 'borrar' : 'reembolsar';
        if (confirmText !== expectedText) {
            toast.error(`Debe escribir '${expectedText}' para confirmar.`);
            return;
        }

        setActionLoading(true);
        try {
            const endpoint = actionType === 'anular' ? 'anular' : 'reembolsar';
            await api.post(`sales/sales/${id}/${endpoint}/`, {
                confirm_text: confirmText,
                reason: reason
            });
            toast.success(`Venta ${actionType === 'anular' ? 'anulada' : 'reembolsada'} con éxito`);
            setShowActionModal(null);
            setConfirmText('');
            setReason('');
            setSelectedSale(null);
            fetchSales();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || "Error al procesar la acción");
        } finally {
            setActionLoading(false);
        }
    };

    const handleHardDelete = () => {
        if (!selectedSale) return;
        setShowConfirmDeleteModal(true);
    };

    const confirmHardDelete = async () => {
        setDeleteLoading(true);
        try {
            await api.delete(`sales/sales/${selectedSale.id}/hard-delete/`);
            toast.success('Venta eliminada definitivamente');
            setShowConfirmDeleteModal(false);
            setShowActionModal(null);
            setSelectedSale(null);
            fetchSales();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo eliminar la venta');
        } finally {
            setDeleteLoading(false);
        }
    };

    const canEditSale = (sale) => {
        if (!sale || sale.is_voided || sale.is_refunded) return false;
        if (isAdmin) return true;
        if (!user) return false;
        const currentId = user.user_id || user.id;
        return String(sale.user) === String(currentId);
    };

    if (loading) return <div className="p-8 text-center text-muted">Cargando ventas…</div>;

    const handlePrintTicket = (sale) => {
        if (!sale) return;
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) {
            toast.error('El navegador bloqueó la ventana emergente de impresión. Por favor, habilita los pop-ups para este sitio.');
            return;
        }

        const branchName = ticketConfigRef.current?.branch_name || 'TU NEGOCIO';
        const headerText = ticketConfigRef.current?.ticket_header || 'BALANCE 360';
        const footerText = ticketConfigRef.current?.ticket_footer || '¡Gracias por su compra!';
        const address = ticketConfigRef.current?.ticket_address;
        const cuit = ticketConfigRef.current?.ticket_cuit;
        const iibb = ticketConfigRef.current?.ticket_iibb;
        const iva = ticketConfigRef.current?.ticket_iva;
        const phone = ticketConfigRef.current?.ticket_phone;
        const email = ticketConfigRef.current?.ticket_email;
        const logoDataUrl = ticketConfigRef.current?.ticket_logo || localStorage.getItem('ticket_logo') || '';

        // Lógica corregida de descuentos
        const itemsBaseSubtotal = sale.items.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
        const itemsDiscountTotal = sale.items.reduce((acc, item) => acc + (parseFloat(item.discount) || 0), 0);
        const globalDiscount = parseFloat(sale.discount) || 0;
        const totalDiscount = itemsDiscountTotal + globalDiscount;
        const finalTotal = parseFloat(sale.total);

        const htmlContent = `
      <html>
        <head>
          <title>Ticket de Venta #${sale.sale_number || sale.id}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 0.5cm; }
            }
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0; padding: 10px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .branch-title { font-size: 16px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 3px; display: inline-block; margin-bottom: 8px; }
            .company { font-size: 11px; color: #333; margin-bottom: 5px; white-space: pre-wrap; }
            .info { font-size: 10px; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th { text-align: left; border-bottom: 1px solid #000; }
            td { padding: 4px 0; }
            .text-right { text-align: right; }
            .totals { border-top: 1px dashed #000; padding-top: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display:flex;align-items:center;justify-content:center;gap:12px;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px;">
              ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" style="max-height:44px;max-width:60px;object-fit:contain;flex-shrink:0;" />` : ''}
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
            <div class="info">Pago: ${sale.payment_method}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 55%;">Producto</th>
                <th class="text-right" style="width: 15%;">Cant</th>
                <th class="text-right" style="width: 30%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(item => {
                  const itemPrice = parseFloat(item.price) || 0;
                  const baseSub = itemPrice * item.quantity;
                  const descItem = parseFloat(item.discount) || 0;
                  const itemLabel = item.item_type === 'SERVICIO' ? (item.description || 'Servicio') : (item.producto_nombre || item.nombre || 'Producto');
                  return `
                <tr>
                  <td>
                    <div style="font-weight: bold;">${itemLabel}</div>
                    ${descItem > 0 ? `
                      <div style="font-size: 10px; color: #555; margin-top: 2px;">
                        Precio: $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        ${item.quantity > 1 ? ` x ${item.quantity} un.` : ''}
                        <span style="color: #c2410c; font-weight: bold; margin-left: 6px;">(Desc. -$${descItem.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>
                      </div>
                    ` : `
                      <div style="font-size: 10px; color: #555; margin-top: 2px;">
                        Precio: $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    `}
                  </td>
                  <td class="text-right" style="vertical-align: top;">${item.quantity}</td>
                  <td class="text-right" style="vertical-align: top;">$${(baseSub - descItem).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="row">
              <span>Subtotal:</span>
              <span>$${itemsBaseSubtotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            ${totalDiscount > 0 ? `
            <div class="row">
              <span>Descuento:</span>
              <span>-$${totalDiscount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>` : ''}
            <div class="row" style="font-weight: bold; font-size: 14px; margin-top: 5px;">
              <span>TOTAL:</span>
              <span>$${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          <div class="footer">
            <p>${footerText}</p>
            <p>*** Copia Cliente ***</p>
          </div>
        </body>
      </html>
    `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.onafterprint = () => {
                printWindow.close();
            };
            // Fallback si no dispara onafterprint
            setTimeout(() => {
                try { printWindow.close(); } catch (e) {}
            }, 2000);
        }, 300);
    };


    const handleDownloadTicketPDF = async (sale) => {
        if (!sale) return;
        setDownloadingPDF(true);

        const branchName = ticketConfigRef.current?.branch_name || 'TU NEGOCIO';
        const headerText = ticketConfigRef.current?.ticket_header || 'BALANCE 360';
        const footerText = ticketConfigRef.current?.ticket_footer || '¡Gracias por su compra!';
        const address = ticketConfigRef.current?.ticket_address;
        const cuit = ticketConfigRef.current?.ticket_cuit;
        const iibb = ticketConfigRef.current?.ticket_iibb;
        const iva = ticketConfigRef.current?.ticket_iva;
        const phone = ticketConfigRef.current?.ticket_phone;
        const email = ticketConfigRef.current?.ticket_email;
        const logoDataUrl = ticketConfigRef.current?.ticket_logo || localStorage.getItem('ticket_logo') || '';

        // Lógica corregida de descuentos
        const itemsBaseSubtotal = sale.items.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
        const itemsDiscountTotal = sale.items.reduce((acc, item) => acc + (parseFloat(item.discount) || 0), 0);
        const globalDiscount = parseFloat(sale.discount) || 0;
        const totalDiscount = itemsDiscountTotal + globalDiscount;
        const finalTotal = parseFloat(sale.total);

        const htmlContent = `
      <div style="font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0; padding: 15px; font-size: 12px; box-sizing: border-box; background: white; color: black;">
        <div style="text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px;">
            ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" style="max-height:44px;max-width:60px;object-fit:contain;flex-shrink:0;" />` : ''}
            <div style="font-size: 16px; font-weight: bold; text-transform: uppercase;">${branchName}</div>
          </div>
          <div style="font-size: 11px; color: #333; margin-bottom: 5px; white-space: pre-wrap;">${headerText}</div>
          ${address ? `<div style="font-size: 10px; color: #555;">Dirección: ${address}</div>` : ''}
          ${cuit ? `<div style="font-size: 10px; color: #555;">CUIT: ${cuit}</div>` : ''}
          ${iibb ? `<div style="font-size: 10px; color: #555;">IIBB: ${iibb}</div>` : ''}
          ${iva ? `<div style="font-size: 10px; color: #555;">IVA: ${iva}</div>` : ''}
          ${phone ? `<div style="font-size: 10px; color: #555;">Tel: ${phone}</div>` : ''}
          ${email ? `<div style="font-size: 10px; color: #555;">Email: ${email}</div>` : ''}
          <div style="font-size: 10px; margin-bottom: 5px; marginTop: 5px;">Fecha: ${new Date(sale.date).toLocaleString('es-AR', { hour12: false })}</div>
          <div style="font-size: 10px; margin-bottom: 5px;">Ticket #${sale.sale_number || sale.id}</div>
          <div style="font-size: 10px; margin-bottom: 5px;">Pago: ${sale.payment_method}</div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
          <thead>
            <tr>
              <th style="text-align: left; border-bottom: 1px solid #000; width: 55%;">Producto</th>
              <th style="text-align: right; border-bottom: 1px solid #000; width: 15%;">Cant</th>
              <th style="text-align: right; border-bottom: 1px solid #000; width: 30%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map(item => {
                const itemPrice = parseFloat(item.price) || 0;
                const baseSub = itemPrice * item.quantity;
                const descItem = parseFloat(item.discount) || 0;
                const itemLabel = item.item_type === 'SERVICIO' ? (item.description || 'Servicio') : (item.producto_nombre || item.nombre || 'Producto');
                return `
              <tr>
                <td style="padding: 4px 0;">
                  <div style="font-weight: bold;">${itemLabel}</div>
                  ${descItem > 0 ? `
                    <div style="font-size: 10px; color: #555; margin-top: 2px;">
                      Precio: $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      ${item.quantity > 1 ? ` x ${item.quantity} un.` : ''}
                      <span style="color: #c2410c; font-weight: bold; margin-left: 6px;">(Desc. -$${descItem.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>
                    </div>
                  ` : `
                    <div style="font-size: 10px; color: #555; margin-top: 2px;">
                      Precio: $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  `}
                </td>
                <td style="padding: 4px 0; text-align: right; vertical-align: top;">${item.quantity}</td>
                <td style="padding: 4px 0; text-align: right; vertical-align: top;">$${(baseSub - descItem).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>

        <div style="border-top: 1px dashed #000; padding-top: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Subtotal:</span>
            <span>$${itemsBaseSubtotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
          ${totalDiscount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Descuento:</span>
            <span>-$${totalDiscount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-weight: bold; font-size: 14px; margin-top: 5px;">
            <span>TOTAL:</span>
            <span>$${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 10px; white-space: pre-wrap;">
          <p>${footerText}</p>
          <p>*** Copia Cliente ***</p>
        </div>
      </div>
    `;

        try {
            const html2pdf = await loadHtml2Pdf();
            const element = document.createElement('div');
            element.innerHTML = htmlContent;
            const opt = {
                margin:       0,
                filename:     `Ticket_Venta_${sale.sale_number || sale.id}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 3, useCORS: true, logging: false },
                jsPDF:        { unit: 'mm', format: [80, 220], orientation: 'portrait' }
            };
            await html2pdf().from(element).set(opt).save();
            toast.success('PDF descargado con éxito');
        } catch (error) {
            console.error(error);
            toast.error('Error al generar el PDF');
        } finally {
            setDownloadingPDF(false);
        }
    };

    const handleEditSale = (sale) => {
        if (!sale) return;
        navigate(`/new-sale?edit=${sale.id}`);
        setSelectedSale(null);
    };

    const handleCloseDetail = () => {
        setSelectedSale(null);
        setShowAdminMenu(false);
    };

    const hasActions = selectedSale && (
        (isAdmin && !selectedSale.is_voided && !selectedSale.is_refunded) ||
        canEditSale(selectedSale) ||
        (isAdmin && selectedSale.is_voided)
    );

    return (
        <div className="sales-page page">
            <div className="page-header">
                <div className="page-header-title">
                    <p className="eyebrow">Ventas</p>
                    <h2 className="page-heading">Ventas</h2>
                    <p className="page-subtitle">Registrá, revisá y administrá las operaciones del negocio.</p>
                </div>
            </div>

            {/* Header / Toolbar */}
            <div className="card page-toolbar sales-toolbar">
                <div className="toolbar-group sales-search">
                    <Search size={18} className="sales-search-icon" />
                    <input
                        ref={searchInputRef}
                        className="input-control sales-search-input"
                        placeholder="Buscar por ID o vendedor…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
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
                                left: 0
                            }}
                            onChange={(e) => setDateFilter(e.target.value)}
                            value={dateFilter}
                        />
                        <button
                            className={`ui-btn ${dateFilter ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                            onClick={() => {
                                if (dateInputRef.current) {
                                    try {
                                        dateInputRef.current.showPicker();
                                    } catch (err) {
                                        // Fallback for browsers not supporting showPicker
                                        dateInputRef.current.style.visibility = 'visible';
                                        dateInputRef.current.focus();
                                        dateInputRef.current.click();
                                        setTimeout(() => { dateInputRef.current.style.visibility = 'hidden'; }, 100);
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
                                        e.stopPropagation();
                                        setDateFilter('');
                                    }}
                                >
                                    <X size={14} />
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Status Filter Dropdown */}
                    <div className="sales-filter">
                        <button
                            className={`ui-btn ${statusFilter !== 'ALL' ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                        >
                            <Filter size={16} />
                            {statusFilter === 'ALL' ? 'Filtrar' :
                                statusFilter === 'COMPLETED' ? 'Completas' :
                                    statusFilter === 'VOIDED' ? 'Anuladas' : 'Reembolsadas'}
                        </button>

                        {showFilterMenu && (
                            <div className="user-dropdown" style={{ top: '110%', right: 0, minWidth: '160px', zIndex: 50 }}>
                                <button className={`dropdown-item ${statusFilter === 'ALL' ? 'font-bold' : ''}`} onClick={() => { setStatusFilter('ALL'); setShowFilterMenu(false); }}>
                                    Todas
                                </button>
                                <button className={`dropdown-item ${statusFilter === 'COMPLETED' ? 'font-bold' : ''}`} onClick={() => { setStatusFilter('COMPLETED'); setShowFilterMenu(false); }}>
                                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Completadas
                                </button>
                                <button className={`dropdown-item ${statusFilter === 'VOIDED' ? 'font-bold' : ''}`} onClick={() => { setStatusFilter('VOIDED'); setShowFilterMenu(false); }}>
                                    <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Anuladas
                                </button>
                                <button className={`dropdown-item ${statusFilter === 'REFUNDED' ? 'font-bold' : ''}`} onClick={() => { setStatusFilter('REFUNDED'); setShowFilterMenu(false); }}>
                                    <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span> Reembolsadas
                                </button>
                            </div>
                        )}

                        {/* Click outside closer helper could go here or generic window listener,
                            but for simplicity we assume user clicks option or toggles. */}
                        {showFilterMenu && (
                            <div
                                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                                onClick={() => setShowFilterMenu(false)}
                            />
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
                                    backgroundColor: focusedIndex === idx ? 'rgba(14, 165, 233, 0.12)' : undefined
                                }}
                                onMouseEnter={() => setFocusedIndex(idx)}
                            >
                                <td className="font-bold text-muted" data-label="ID">#{sale.sale_number || sale.id}</td>
                                <td data-label="Fecha">{formatDate(sale.date)}</td>
                                <td data-label="Vendedor">
                                    <div className="flex items-center gap-1">
                                        <div className="seller-avatar" title={sale.user_name}>
                                            {sale.user_name?.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium">{sale.user_name}</span>
                                    </div>
                                </td>
                                <td data-label="Método">{sale.payment_method}</td>
                                <td className="font-bold" data-label="Total">{formatCurrency(sale.total)}</td>
                                <td data-label="Estado">
                                    {sale.is_voided ? (
                                        <span className="badge badge-danger">ANULADA</span>
                                    ) : sale.is_refunded ? (
                                        <span className="badge badge-warning">REEMBOLSADA</span>
                                    ) : (
                                        <span className="badge badge-success">COMPLETA</span>
                                    )}
                                </td>
                                <td style={{ textAlign: 'right' }} data-label="Acciones">
                                    <button className="btn-icon" onClick={() => setSelectedSale(sale)} title="Ver detalle">
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {sales.length === 0 && (
                            <tr>
                                <td colSpan="7" className="text-center p-8 text-muted">Todavía no hay ventas para los filtros aplicados.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                    <button
                        className="ui-btn ui-btn-ghost"
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Anterior
                    </button>
                    <span className="muted small">Página {page} de {totalPages}</span>
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
                    footer={isMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                            {/* Acciones Dropdown */}
                            {hasActions && (
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <button
                                        onClick={() => setShowAdminMenu(!showAdminMenu)}
                                        className="ui-btn ui-btn-secondary"
                                        style={{ height: '38px', minHeight: '38px', width: '100%', padding: '8px 16px', fontSize: '0.85rem', gap: '6px', justifyContent: 'center' }}
                                    >
                                        <span>Acciones de administrador</span>
                                        <span style={{ fontSize: '0.65rem' }}>▼</span>
                                    </button>
                                    {showAdminMenu && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '100%',
                                            left: 0,
                                            right: 0,
                                            marginBottom: '6px',
                                            background: 'var(--surface-elevated)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: '8px',
                                            boxShadow: 'var(--shadow-lg)',
                                            padding: '6px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            zIndex: 100
                                        }}>
                                            {isAdmin && !selectedSale.is_voided && !selectedSale.is_refunded && (
                                                <button
                                                    onClick={() => { setShowActionModal('reembolsar'); setShowAdminMenu(false); }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: 'var(--warning-text)', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontWeight: 'bold', transition: 'background 0.15s' }}
                                                >
                                                    <RotateCcw size={14} /> Reembolsar venta
                                                </button>
                                            )}
                                            {canEditSale(selectedSale) && (
                                                <>
                                                    <button
                                                        onClick={() => { setShowActionModal('anular'); setShowAdminMenu(false); }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: 'var(--danger-text)', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontWeight: 'bold', transition: 'background 0.15s' }}
                                                    >
                                                        <Trash2 size={14} /> Anular venta
                                                    </button>
                                                    <button
                                                        onClick={() => { handleEditSale(selectedSale); setShowAdminMenu(false); }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontWeight: 'bold', transition: 'background 0.15s' }}
                                                    >
                                                        <Edit size={14} /> Editar venta
                                                    </button>
                                                </>
                                            )}
                                            {isAdmin && selectedSale.is_voided && (
                                                <button
                                                    onClick={() => { handleHardDelete(); setShowAdminMenu(false); }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: 'var(--danger-text)', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontWeight: 'bold', transition: 'background 0.15s' }}
                                                >
                                                    <Trash2 size={14} /> Eliminar venta
                                                 </button>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             )}
                            {/* Mobile action buttons stacked */}
                            <button
                                onClick={() => handleDownloadTicketPDF(selectedSale)}
                                className="ui-btn ui-btn-secondary"
                                disabled={downloadingPDF}
                                style={{ height: '38px', minHeight: '38px', width: '100%', padding: '8px 16px', fontSize: '0.85rem', gap: '6px', justifyContent: 'center' }}
                            >
                                <FileDown size={14} /> Descargar PDF
                            </button>
                            <button
                                onClick={() => handlePrintTicket(selectedSale)}
                                className="ui-btn ui-btn-secondary"
                                style={{ height: '38px', minHeight: '38px', width: '100%', padding: '8px 16px', fontSize: '0.85rem', gap: '6px', justifyContent: 'center' }}
                            >
                                <Printer size={14} /> Imprimir Ticket
                            </button>
                            <button 
                                className="ui-btn ui-btn-primary" 
                                onClick={handleCloseDetail}
                                style={{ height: '38px', minHeight: '38px', width: '100%', padding: '8px 16px', fontSize: '0.85rem', justifyContent: 'center' }}
                            >
                                Cerrar
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                            {/* Actions Dropdown for Desktop */}
                            {hasActions ? (
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setShowAdminMenu(!showAdminMenu)}
                                        className="ui-btn ui-btn-secondary"
                                        style={{ height: '34px', minHeight: '34px', padding: '6px 12px', fontSize: '0.8rem', gap: '6px' }}
                                    >
                                    <span>Acciones</span>
                                    <span style={{ fontSize: '0.65rem' }}>▼</span>
                                </button>
                                {showAdminMenu && (
                                    <div style={{
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
                                        minWidth: '160px'
                                    }}>
                                        {isAdmin && !selectedSale.is_voided && !selectedSale.is_refunded && (
                                            <button
                                                onClick={() => { setShowActionModal('reembolsar'); setShowAdminMenu(false); }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: 'var(--warning-text)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontWeight: 'bold', transition: 'background 0.15s' }}
                                            >
                                                <RotateCcw size={14} /> Reembolsar
                                            </button>
                                        )}
                                        {canEditSale(selectedSale) && (
                                            <>
                                                <button
                                                    onClick={() => { setShowActionModal('anular'); setShowAdminMenu(false); }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: 'var(--danger-text)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontWeight: 'bold', transition: 'background 0.15s' }}
                                                >
                                                    <Trash2 size={14} /> Anular
                                                </button>
                                                <button
                                                    onClick={() => { handleEditSale(selectedSale); setShowAdminMenu(false); }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontWeight: 'bold', transition: 'background 0.15s' }}
                                                >
                                                    <Edit size={14} /> Editar
                                                </button>
                                            </>
                                        )}
                                        {isAdmin && selectedSale.is_voided && (
                                            <button
                                                onClick={() => { handleHardDelete(); setShowAdminMenu(false); }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: 'var(--danger-text)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontWeight: 'bold', transition: 'background 0.15s' }}
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
                            <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', alignItems: 'center' }}>
                                <button
                                    onClick={() => handleDownloadTicketPDF(selectedSale)}
                                    className="ui-btn ui-btn-secondary"
                                    disabled={downloadingPDF}
                                    style={{ height: '34px', minHeight: '34px', padding: '6px 12px', fontSize: '0.8rem', gap: '6px' }}
                                >
                                    <FileDown size={14} /> PDF
                                </button>
                                <button
                                    onClick={() => handlePrintTicket(selectedSale)}
                                    className="ui-btn ui-btn-secondary"
                                    style={{ height: '34px', minHeight: '34px', padding: '6px 12px', fontSize: '0.8rem', gap: '6px' }}
                                >
                                    <Printer size={14} /> Ticket
                                </button>
                                <button 
                                    className="ui-btn ui-btn-primary" 
                                    onClick={handleCloseDetail}
                                    style={{ height: '34px', minHeight: '34px', padding: '6px 12px', fontSize: '0.85rem' }}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    )}
                >
                    <div className="sale-detail-modal stack gap-md">
                        {/* Summary Header */}
                        <div className="sale-detail-summary grid four-cols gap-md p-md" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
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
                                <span className="font-medium">{selectedSale.payment_method}</span>
                            </div>
                            <div className="stack gap-xs">
                                <span className="eyebrow">Estado</span>
                                <div>
                                    {selectedSale.is_voided ? <span className="badge badge-danger">ANULADA</span> :
                                        selectedSale.is_refunded ? <span className="badge badge-warning">REEMBOLSADA</span> :
                                            <span className="badge badge-success">COMPLETADA</span>}
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
                                    {selectedSale.items.map(item => {
                                        const itemLabel = item.item_type === 'SERVICIO'
                                            ? (item.description || 'Servicio')
                                            : (item.producto_nombre || 'Producto');
                                        const itemDiscount = parseFloat(item.discount) || 0;
                                        return (
                                            <tr key={item.id}>
                                                <td data-label="Producto">
                                                    {itemLabel}
                                                    {itemDiscount > 0 && <><br /><span className="muted tiny">Desc: -{formatCurrency(itemDiscount)}</span></>}
                                                </td>
                                                <td style={{ textAlign: 'right' }} data-label="Cant.">{item.quantity}</td>
                                                <td style={{ textAlign: 'right' }} data-label="Precio">{formatCurrency(parseFloat(item.price) || 0)}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }} data-label="Total">{formatCurrency((parseFloat(item.quantity) || 1) * (parseFloat(item.price) || 0) - itemDiscount)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex-col items-end gap-xs pt-sm" style={{ borderTop: '1px solid var(--border-subtle)' }}>
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
                    onClose={() => { setShowActionModal(null); setConfirmText(''); setReason(''); }}
                    size="md"
                >
                    <form onSubmit={handleAction}>
                        <p className="text-sm text-muted mb-4">
                            Para confirmar esta acción irreversible, escribí <strong>{showActionModal === 'anular' ? 'borrar' : 'reembolsar'}</strong> en el campo de abajo.
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
                                onClick={() => { setShowActionModal(null); setConfirmText(''); setReason(''); }}
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
                                {actionLoading ? 'Procesando…' : (showActionModal === 'anular' ? 'Anular venta' : 'Reembolsar venta')}
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
        </div>
    );
};

export default Sales;
