import React, { useCallback, useEffect, useMemo, useState, useRef, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useMediaQuery from '../hooks/useMediaQuery';
import useCart from '../hooks/useCart';
import { Search, ShoppingCart, Tag, CreditCard, Trash2, Wrench, PackageX, Printer, FileDown } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../utils/errorUtils';
import { formatARS } from '../utils/format';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
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

const PAGE_SIZE = 12;

const NewSale = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(() => localStorage.getItem('pos_payment') || 'EFECTIVO');

  // ─── Hook de carrito compartido ─────────────────────────────────────────────
  const {
    cart, setCart,
    discount, setDiscount,
    discountType, setDiscountType,
    subtotal, total, cartCount,
    removeItem, updateItemDiscount, addServiceItem, clearCart,
  } = useCart({
    cartKey: 'pos_cart',
    discountKey: 'pos_discount',
    discountTypeKey: 'pos_discount_type',
  });

  const searchInputRef = useRef(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({ description: '', price: '' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const ticketConfigRef = useRef(null);
  const cartPulseTimerRef = useRef(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [cartPulse, setCartPulse] = useState(false);
  const [cartAnimKey, setCartAnimKey] = useState(0);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [editingSaleNumber, setEditingSaleNumber] = useState(null);
  const [loadingSale, setLoadingSale] = useState(false);
  const [lastSaleWasEdit, setLastSaleWasEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [multiplier, setMultiplier] = useState(1);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearingCart, setIsClearingCart] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const response = await api.get('inventory/products/', {
        params: {
          page,
          page_size: PAGE_SIZE,
          search: debouncedSearch || undefined
        }
      });
      const payload = response.data;
      const list = payload?.results || payload;
      setProducts(Array.isArray(list) ? list : []);
      setTotalCount(payload?.count || (Array.isArray(list) ? list.length : 0));
    } catch (error) {
      setFetchError(true);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem('pos_payment', paymentMethod), 500);
    return () => clearTimeout(t);
  }, [paymentMethod]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Settings se carga una sola vez al montar
  useEffect(() => {
    api.get('settings/')
      .then(res => { ticketConfigRef.current = res.data; })
      .catch(err => console.error('Error loading ticket settings', err));
  }, []);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [products]);

  const normalizeSaleItems = useCallback((items = []) => (
    items.map((item) => {
      const isService = item.item_type === 'SERVICIO';
      const description = item.description || 'Servicio';
      
      let calculatedDiscount = 0;
      if (item.discount !== undefined) {
        calculatedDiscount = parseFloat(item.discount) || 0;
      } else if (item.discountValue) {
        const val = parseFloat(item.discountValue);
        if (!isNaN(val)) {
          const base = parseFloat(item.price) || 0;
          const qty = parseInt(item.quantity, 10) || 1;
          calculatedDiscount = item.discountType === '%' ? (base * qty * (val / 100)) : val;
        }
      }

      return {
        id: `sale-${item.id || Math.random().toString(36).slice(2)}`,
        item_type: item.item_type,
        product: isService ? null : item.product,
        description: isService ? description : undefined,
        nombre: isService ? `[Servicio] ${description}` : (item.producto_nombre || item.nombre || 'Producto'),
        price: parseFloat(item.price),
        quantity: item.quantity,
        discountType: item.discountType || '$',
        discountValue: item.discountValue !== undefined ? item.discountValue : (parseFloat(item.discount) || ''),
        discount: calculatedDiscount
      };
    })
  ), []);

  const loadSaleForEdit = useCallback(async (saleId) => {
    if (!saleId) return;
    setLoadingSale(true);
    try {
      const response = await api.get(`sales/sales/${saleId}/`);
      const sale = response.data;
      setCart(normalizeSaleItems(sale.items || []));
      setDiscount(sale.discount || 0);
      setPaymentMethod(sale.payment_method || 'EFECTIVO');
      setEditingSaleId(sale.id);
      setEditingSaleNumber(sale.sale_number || sale.id);
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate('/new-sale', { replace: true });
    } finally {
      setLoadingSale(false);
    }
  }, [navigate, normalizeSaleItems]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    if (editId) {
      loadSaleForEdit(editId);
    } else {
      if (editingSaleId) {
        setCart([]);
        setDiscount('');
        setDiscountType('$');
        setPaymentMethod('EFECTIVO');
        setAmountPaid('');
      }
      setEditingSaleId(null);
      setEditingSaleNumber(null);
    }
  }, [location.search, loadSaleForEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  // isMobile ahora viene de useMediaQuery — se eliminó el useEffect duplicado
  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handlePrintTicket = useCallback(() => {
    if (!lastSale) return;

    const branchName = ticketConfigRef.current?.branch_name || 'TU NEGOCIO';
    const headerText = ticketConfigRef.current?.ticket_header || 'BALANCE 360';
    const footerText = ticketConfigRef.current?.ticket_footer || '\u00a1Gracias por su compra!';
    const address = ticketConfigRef.current?.ticket_address;
    const cuit = ticketConfigRef.current?.ticket_cuit;
    const iibb = ticketConfigRef.current?.ticket_iibb;
    const iva = ticketConfigRef.current?.ticket_iva;
    const phone = ticketConfigRef.current?.ticket_phone;
    const email = ticketConfigRef.current?.ticket_email;
    const logoDataUrl = ticketConfigRef.current?.ticket_logo || localStorage.getItem('ticket_logo') || '';
    const ticketWidth = ticketConfigRef.current?.ticket_width || '58mm';
    const is58mm = ticketWidth === '58mm';

    // Lógica corregida de descuentos
    const itemsBaseSubtotal = lastSale.items.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
    const itemsDiscountTotal = lastSale.items.reduce((acc, item) => acc + (parseFloat(item.discount) || 0), 0);
    const globalDiscount = parseFloat(lastSale.discount) || 0;
    const totalDiscount = itemsDiscountTotal + globalDiscount;
    const finalTotal = parseFloat(lastSale.total);

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
            <div class="info">Pago: ${lastSale.payment_method}</div>
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
              ${lastSale.items.map(item => {
                const itemPrice = parseFloat(item.price) || 0;
                const baseSub = itemPrice * item.quantity;
                const descItem = parseFloat(item.discount) || 0;
                const itemLabel = item.item_type === 'SERVICIO' ? (item.description || 'Servicio') : (item.nombre || item.producto_nombre || 'Producto');
                
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
                `;
                } else {
                    return `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 4px 0;">
                      <div style="font-weight: bold;">${itemLabel}</div>
                      ${descItem > 0 ? `
                        <div style="font-size: 10px; color: #000; margin-top: 2px;">
                          Precio: $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          ${item.quantity > 1 ? ` x ${item.quantity} un.` : ''}
                          <span style="font-weight: bold; margin-left: 6px; text-decoration: underline;">(Desc. -$${descItem.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>
                        </div>
                      ` : `
                        <div style="font-size: 10px; color: #000; margin-top: 2px;">
                          Precio: $${itemPrice.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      `}
                    </td>
                    <td class="text-right" style="vertical-align: top; padding: 4px 0;">${item.quantity}</td>
                    <td class="text-right" style="vertical-align: top; padding: 4px 0;">$${(baseSub - descItem).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                  </tr>
                `;
                }
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
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 300);
  }, [lastSale]);

  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = useCallback(async () => {
    if (!lastSale) return;
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
    const itemsBaseSubtotal = lastSale.items.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
    const itemsDiscountTotal = lastSale.items.reduce((acc, item) => acc + (parseFloat(item.discount) || 0), 0);
    const globalDiscount = parseFloat(lastSale.discount) || 0;
    const totalDiscount = itemsDiscountTotal + globalDiscount;
    const finalTotal = parseFloat(lastSale.total);

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
          <div style="font-size: 10px; margin-bottom: 5px; margin-top: 5px;">Fecha: ${new Date(lastSale.date).toLocaleString('es-AR', { hour12: false })}</div>
          <div style="font-size: 10px; margin-bottom: 5px;">Ticket #${lastSale.sale_number || lastSale.id}</div>
          <div style="font-size: 10px; margin-bottom: 5px;">Pago: ${lastSale.payment_method}</div>
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
             ${lastSale.items.map(item => {
               const baseSub = (parseFloat(item.price) || 0) * item.quantity;
               const descItem = parseFloat(item.discount) || 0;
               const itemLabel = item.item_type === 'SERVICIO' ? (item.description || 'Servicio') : (item.nombre || item.producto_nombre || 'Producto');
               return `
               <tr>
                 <td style="padding: 4px 0;">
                   <div style="font-weight: bold;">${itemLabel}</div>
                   ${descItem > 0 ? `
                     <div style="font-size: 10px; color: #555; margin-top: 2px;">
                       Precio: $${(parseFloat(item.price) || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                       ${item.quantity > 1 ? ` x ${item.quantity} un.` : ''}
                       <span style="color: #c2410c; font-weight: bold; margin-left: 6px;">(Desc. -$${descItem.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>
                     </div>
                   ` : item.quantity > 1 ? `
                     <div style="font-size: 10px; color: #555; margin-top: 2px;">
                       Precio: $${(parseFloat(item.price) || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} x ${item.quantity} un.
                     </div>
                   ` : ''}
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
          <p style="border-top: 1px dashed #000; padding-top: 6px; margin-top: 8px; font-size: 9px; color: #555;">*** Copia Cliente ***</p>
        </div>
      </div>
    `;

    try {
      const html2pdf = await loadHtml2Pdf();
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      const opt = {
        margin:       0,
        filename:     `Ticket_Venta_${lastSale.sale_number || lastSale.id}.pdf`,
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
  }, [lastSale]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const triggerCartPulse = useCallback(() => {
    clearTimeout(cartPulseTimerRef.current);
    setCartPulse(true);
    cartPulseTimerRef.current = setTimeout(() => setCartPulse(false), 450);
  }, []);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const qty = multiplier;
      const exists = prev.find(i => i.item_type === 'PRODUCTO' && i.product === product.id);
      if (exists) {
        return prev.map(i =>
          i.item_type === 'PRODUCTO' && i.product === product.id
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }
      return [...prev, {
        id: `prod-${product.id}`,
        item_type: 'PRODUCTO',
        product: product.id,
        nombre: product.nombre,
        price: parseFloat(product.precio_venta),
        quantity: qty,
        discountType: '$',
        discountValue: ''
      }];
    });
    setCartAnimKey(k => k + 1);
    triggerCartPulse();
    setMultiplier(1);
    searchInputRef.current?.focus();
  }, [multiplier, triggerCartPulse]);

  const addService = useCallback(() => {
    if (!serviceForm.description || !serviceForm.price) {
      toast.error('Completa descripción y precio');
      return;
    }
    addServiceItem(serviceForm.description, serviceForm.price);
    setServiceForm({ description: '', price: '' });
    setShowServiceModal(false);
    setCartAnimKey(k => k + 1);
    triggerCartPulse();
  }, [serviceForm, addServiceItem, triggerCartPulse]);

  const updateQuantity = useCallback((id, quantity) => {
    if (quantity === '') {
      setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: '' } : item));
      return;
    }
    const val = parseInt(quantity, 10);
    if (Number.isNaN(val)) return;
    const value = Math.max(1, val);
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: value } : item));
  }, []);

  // cartCount viene de useCart

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (!cart.length) {
      toast.warning('El carrito está vacío');
      return;
    }
    setSubmitting(true);
    try {
      const wasEditing = Boolean(editingSaleId);
      const finalGlobalDiscount = discountType === '%'
        ? Math.round(subtotal * (parseFloat(discount) / 100)) || 0
        : Math.round(parseFloat(discount)) || 0;

      const payload = {
        payment_method: paymentMethod,
        discount: finalGlobalDiscount,
        items: cart.map(item => {
          const baseSub = (parseFloat(item.price) || 0) * item.quantity;
          const dv = parseFloat(item.discountValue);
          const descItem = !item.discountValue || isNaN(dv) ? 0
            : item.discountType === '%' ? baseSub * (dv / 100) : dv;
          return {
            item_type: item.item_type,
            product: item.product,
            description: item.item_type === 'SERVICIO' ? item.description : undefined,
            quantity: item.quantity,
            price: Math.round(parseFloat(item.price)) || 0,
            discount: Math.round(descItem) || 0
          };
        }),
      };

      const response = wasEditing
        ? await api.put(`sales/sales/${editingSaleId}/`, payload)
        : await api.post('sales/sales/', payload);

      const normalizedItems = normalizeSaleItems(response.data.items || cart);
      const snapSubtotal = normalizedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const saleSnapshot = {
        id: response.data.id,
        sale_number: response.data.sale_number,
        date: response.data.date,
        items: normalizedItems,
        subtotal: snapSubtotal,
        discount: parseFloat(response.data.discount ?? discount) || 0,
        total: parseFloat(response.data.total ?? total),
        payment_method: response.data.payment_method || paymentMethod,
      };

      setLastSale(saleSnapshot);
      setLastSaleWasEdit(wasEditing);
      setShowSuccessModal(true);

      setShowCartModal(false);
      setCart([]);
      setDiscount('');
      setDiscountType('$');
      setPaymentMethod('EFECTIVO');
      setAmountPaid('');
      setEditingSaleId(null);
      setEditingSaleNumber(null);
      navigate('/new-sale', { replace: true });
      toast.success(wasEditing ? 'Venta actualizada con éxito' : 'Venta registrada con éxito');
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }, [cart, editingSaleId, discount, discountType, subtotal, total, paymentMethod, normalizeSaleItems, navigate, submitting]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable;
      if (isInput && e.key === '/') return;

      if (e.key === 'F2' || e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) {
          if (isMobile) {
            setShowCartModal(true);
          } else {
            handleSubmit();
          }
        } else {
          toast.info('El carrito está vacío');
        }
      }
      if (e.key === 'Escape' && cart.length > 0 && !showCartModal && !showServiceModal && !showSuccessModal) {
        e.preventDefault();
        setShowClearConfirm(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isMobile, showCartModal, showServiceModal, showSuccessModal, discount, discountType, paymentMethod, handleSubmit]);



  return (
    <div className="pos-shell">
      <div className="catalog-panel">
        <div className="flex-row between">
          <div style={{ position: 'relative', flex: 1, marginRight: '16px' }}>
            <Input
              ref={searchInputRef}
              placeholder="Buscar producto (Presione /)…"
              suffix={!search && <kbd className="search-kbd">/</kbd>}
              value={search}
              onChange={(e) => {
                 let val = e.target.value;
                 const match = val.match(/^(\d+)\*(.*)$/);
                 if (match) {
                     setMultiplier(parseInt(match[1], 10));
                     val = match[2];
                 }
                 setSearch(val);
              }}
              onKeyDown={(e) => {
                 if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setFocusedIndex(i => Math.min(products.length - 1, i + 1));
                 } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setFocusedIndex(i => Math.max(0, i - 1));
                 } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (focusedIndex >= 0 && products[focusedIndex]?.stock_actual > 0) {
                        addToCart(products[focusedIndex]);
                    } else if (search.length > 0) {
                        api.get('inventory/products/', { params: { search, page_size: 1 } })
                           .then(res => {
                               const list = res.data.results || res.data;
                               if (list.length === 1 && list[0].stock_actual > 0) {
                                   addToCart(list[0]);
                               }
                           });
                    }
                 }
              }}
              icon={<Search size={18} />}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); searchInputRef.current?.focus(); }}
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
                onMouseEnter={e => e.currentTarget.style.color = 'var(--slate-700)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--slate-400)'}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            {multiplier > 1 && (
               <span className="badge badge-primary" style={{ position: 'absolute', right: '12px', top: '10px' }}>
                  {multiplier}x
               </span>
            )}
          </div>
          <Button variant="secondary" icon={<Wrench size={16} />} onClick={() => setShowServiceModal(true)}>
            + Servicio
          </Button>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '1rem' }}>💡</span>
          <span>Tip: Podés escribir <code>cantidad*</code> (ej: <code>5*coca</code>) en el buscador para cargar múltiples unidades.</span>
        </div>
        <div className="muted small mb-2">Catálogo (Más Vendidos)</div>
        <div className="pos-table-wrapper">
          <div className="table-container">
            <table className="styled-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Código</th>
                  <th>Producto</th>
                  <th className="text-center" style={{ width: '80px', textAlign: 'center' }}>Stock</th>
                  <th className="text-right" style={{ width: '120px', textAlign: 'right' }}>Precio</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan="5">
                        <Skeleton height={20} />
                      </td>
                    </tr>
                  ))
                ) : (
                  products.map((p, i) => (
                    <tr
                      key={p.id}
                      onClick={() => p.stock_actual > 0 && addToCart(p)}
                      className={p.stock_actual <= 0 ? 'pos-row-disabled' : ''}
                      style={{ 
                        cursor: p.stock_actual > 0 ? 'pointer' : 'not-allowed',
                        backgroundColor: focusedIndex === i ? 'rgba(14, 165, 233, 0.12)' : undefined
                      }}
                      onMouseEnter={() => setFocusedIndex(i)}
                      onMouseLeave={() => setFocusedIndex((prev) => prev === i ? -1 : prev)}
                    >
                      <td data-label="Código">
                        <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>{p.codigo}</span>
                      </td>
                      <td data-label="Producto">
                        <div style={{ fontWeight: 600, color: 'var(--slate-700)' }}>{p.nombre}</div>
                      </td>
                      <td style={{ textAlign: 'center' }} data-label="Stock">
                        <span className={`badge ${p.stock_actual > 5 ? 'badge-success' : p.stock_actual > 0 ? 'badge-warning' : 'badge-danger'}`}>
                          {p.stock_actual}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }} data-label="Precio">
                        {formatARS(p.precio_venta)}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--primary-600)' }} data-label="Acción">
                        {p.stock_actual > 0 && <span>+</span>}
                      </td>
                    </tr>
                  ))
                )}
                {!loading && fetchError && (
                  <tr>
                    <td colSpan="5" className="pos-empty-cell">
                      <div className="pos-empty">
                        <PackageX size={48} style={{ color: 'var(--danger-400)' }} />
                        <p style={{ fontWeight: 600, color: 'var(--danger-600)' }}>No se pudo conectar con el servidor</p>
                        <p className="muted small">Verificá que el backend esté corriendo en {import.meta.env.VITE_API_URL || 'localhost:8000'}</p>
                        <button
                          onClick={fetchProducts}
                          style={{ marginTop: '12px', padding: '6px 16px', borderRadius: '6px', background: 'var(--primary-600)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
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
            <Button variant="ghost" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
            <span className="muted small">Página {page} de {totalPages}</span>
            <Button variant="ghost" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
          </div>
        )}
      </div>

      <div className="cart-panel">
        <div className="card-head" style={{ padding: '14px 16px', borderBottom: '1px solid var(--slate-200)' }}>
          <div>
            <p className="eyebrow">Ticket activo</p>
            <div className="flex-row gap-sm items-center">
              <h3>Carrito</h3>
              {editingSaleId && (
                <span className="badge badge-warning">Editando #{editingSaleNumber || editingSaleId}</span>
              )}
              {loadingSale && (
                <span className="badge badge-neutral">Cargando…</span>
              )}
            </div>
          </div>
          <div className="badge badge-neutral">
            <ShoppingCart size={16} /> {cart.length} items
          </div>
        </div>

        <div className="cart-body">
          {!cart.length && (
            <div className="empty-state">
              <ShoppingCart size={42} className="muted" />
              <p>Agregá productos o servicios</p>
            </div>
          )}
          {cart.map((item) => (
            <div key={item.id} className={`cart-item ${isClearingCart ? 'clearing' : ''}`}>
              <div className="flex-row between">
                <div>
                  <p className="title-sm">{item.nombre}</p>
                  {item.item_type === 'SERVICIO' && <span className="badge badge-warning">Servicio</span>}
                </div>
                <button className="ghost-icon" onClick={() => removeItem(item.id)} aria-label="Eliminar">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex-row between items-center">
                <div className="quantity-stepper flex-row items-center" style={{ gap: '2px', background: 'var(--surface-muted)', borderRadius: '6px', padding: '1px', border: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, (parseInt(item.quantity, 10) || 1) - 1)}
                    disabled={(parseInt(item.quantity, 10) || 1) <= 1}
                    className="stepper-btn"
                    style={{ border: 'none', background: 'transparent', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '0.8rem' }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="stepper-input"
                    style={{ width: '24px', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-primary)', outline: 'none', padding: 0 }}
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, (parseInt(item.quantity, 10) || 0) + 1)}
                    className="stepper-btn"
                    style={{ border: 'none', background: 'transparent', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '0.8rem' }}
                  >
                    +
                  </button>
                </div>
                <div className="flex-row items-center gap-xs">
                  <span className="muted tiny">Desc.</span>
                  <div className="field-control">
                    <input
                      type="number"
                      style={{ width: '90px', padding: '4px 6px', height: '28px', fontSize: '0.8rem' }}
                      value={item.discountValue || ''}
                      onChange={(e) => updateItemDiscount(item.id, e.target.value, item.discountType)}
                      placeholder="0"
                    />
                  </div>
                  <div className="field-control">
                    <select
                      style={{ width: '40px', padding: '0 4px', height: '28px', fontSize: '0.8rem', outline: 'none' }}
                      value={item.discountType || '$'}
                      onChange={(e) => updateItemDiscount(item.id, item.discountValue || '', e.target.value)}
                    >
                      <option value="$">$</option>
                      <option value="%">%</option>
                    </select>
                  </div>
                </div>
                <div className="text-right">
                  <div className="muted tiny">Unitario {formatARS(item.price)}</div>
                  <div className="title-sm">
                    {formatARS((item.price * item.quantity) - (
                      item.discountValue ? (item.discountType === '%' ? (item.price * item.quantity * parseFloat(item.discountValue) / 100) : parseFloat(item.discountValue)) : 0
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-footer">
          <div className="grid two-cols">
            <div className="ui-field">
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
                <div className="field-control">
                  <select style={{ width: '60px', paddingLeft: '8px', paddingRight: '8px' }} value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                     <option value="$">$</option>
                     <option value="%">%</option>
                  </select>
                </div>
              </div>
            </div>
             <Select
              label="Método de pago"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                if (e.target.value !== 'EFECTIVO') setAmountPaid('');
              }}
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="DEBITO">Tarjeta Débito</option>
              <option value="CREDITO">Tarjeta Crédito</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="MERCADOPAGO">MercadoPago</option>
              <option value="OTRO">Otro</option>
            </Select>
          </div>

          {paymentMethod === 'EFECTIVO' && (
            <div className="cash-calculator" style={{ background: 'var(--surface-muted)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginTop: '12px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <span className="field-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Paga con</span>
                <div style={{ position: 'relative', marginTop: '4px' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>$</span>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    style={{ paddingLeft: '24px', height: '36px', width: '100%', fontSize: '0.9rem', outline: 'none', border: '1px solid var(--border-subtle)', borderRadius: '6px', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              <div style={{ textAlign: 'right', flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Vuelto a entregar</span>
                <div className="title-md mt-1" style={{ color: (parseFloat(amountPaid) >= total) ? 'var(--success-text)' : 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.25rem' }}>
                  {parseFloat(amountPaid) >= total 
                    ? formatARS(parseFloat(amountPaid) - total) 
                    : (amountPaid ? 'Falta cubrir' : '$0,00')}
                </div>
              </div>
            </div>
          )}

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

      {isMobile && (
        <button
          className={`pos-cart-fab ${cartPulse ? 'pulse' : ''}`}
          onClick={() => setShowCartModal(true)}
          aria-label="Abrir carrito"
        >
          <ShoppingCart size={20} />
          {cartCount > 0 && <span className="pos-cart-count">{cartCount}</span>}
          <span key={cartAnimKey} className="pos-cart-fly" aria-hidden="true" />
        </button>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <Modal
          title="Agregar servicio"
          onClose={() => setShowServiceModal(false)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setShowServiceModal(false)}>Cancelar</Button>
              <Button variant="primary" onClick={addService}>Agregar</Button>
            </>
          )}
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

      {showCartModal && (
        <Modal
          title="Finalizar compra"
          onClose={() => setShowCartModal(false)}
          size="md"
        >
          <div className="cart-modal-content">
            <div className="cart-body">
              {!cart.length && (
                <div className="empty-state">
                  <ShoppingCart size={42} className="muted" />
                  <p>Agregá productos o servicios</p>
                </div>
              )}
              {cart.map((item) => (
                <div key={item.id} className={`cart-item ${isClearingCart ? 'clearing' : ''}`}>
                  <div className="flex-row between">
                    <div>
                      <p className="title-sm">{item.nombre}</p>
                      {item.item_type === 'SERVICIO' && <span className="badge badge-warning">Servicio</span>}
                    </div>
                    <button className="ghost-icon" onClick={() => removeItem(item.id)} aria-label="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex-col gap-xs mt-2" style={{ width: '100%' }}>
                    <div className="flex-row between items-center gap-sm">
                      <div className="quantity-stepper flex-row items-center" style={{ gap: '2px', background: 'var(--surface-muted)', borderRadius: '6px', padding: '1px', border: '1px solid var(--border-subtle)' }}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, (parseInt(item.quantity, 10) || 1) - 1)}
                          disabled={(parseInt(item.quantity, 10) || 1) <= 1}
                          className="stepper-btn"
                          style={{ border: 'none', background: 'transparent', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '0.8rem' }}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                          className="stepper-input"
                          style={{ width: '24px', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-primary)', outline: 'none', padding: 0 }}
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, (parseInt(item.quantity, 10) || 0) + 1)}
                          className="stepper-btn"
                          style={{ border: 'none', background: 'transparent', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '0.8rem' }}
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="muted tiny" style={{ fontSize: '0.7rem' }}>Unitario {formatARS(item.price)}</div>
                        <div className="title-sm" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          {formatARS((item.price * item.quantity) - (
                            item.discountValue ? (item.discountType === '%' ? (item.price * item.quantity * parseFloat(item.discountValue) / 100) : parseFloat(item.discountValue)) : 0
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex-row items-center gap-xs mt-2" style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '8px' }}>
                      <span className="muted tiny">Desc.</span>
                      <div className="field-control" style={{ flex: 1 }}>
                        <input
                          type="number"
                          style={{ width: '100%', padding: '4px 6px', height: '28px', fontSize: '0.8rem' }}
                          value={item.discountValue || ''}
                          onChange={(e) => updateItemDiscount(item.id, e.target.value, item.discountType)}
                          placeholder="0"
                        />
                      </div>
                      <div className="field-control">
                        <select
                          style={{ width: '50px', padding: '0 4px', height: '28px', fontSize: '0.8rem', outline: 'none' }}
                          value={item.discountType || '$'}
                          onChange={(e) => updateItemDiscount(item.id, item.discountValue || '', e.target.value)}
                        >
                          <option value="$">$</option>
                          <option value="%">%</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div className="grid two-cols">
                <div className="ui-field">
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
                    <div className="field-control">
                      <select style={{ width: '60px', paddingLeft: '8px', paddingRight: '8px' }} value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                        <option value="$">$</option>
                        <option value="%">%</option>
                      </select>
                    </div>
                  </div>
                </div>
                 <Select
                  label="Método de pago"
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (e.target.value !== 'EFECTIVO') setAmountPaid('');
                  }}
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="DEBITO">Tarjeta Débito</option>
                  <option value="CREDITO">Tarjeta Crédito</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="MERCADOPAGO">MercadoPago</option>
                  <option value="OTRO">Otro</option>
                </Select>
              </div>

              {paymentMethod === 'EFECTIVO' && (
                <div className="cash-calculator" style={{ background: 'var(--surface-muted)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginTop: '12px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <span className="field-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Paga con</span>
                    <div style={{ position: 'relative', marginTop: '4px' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>$</span>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder="0.00"
                        style={{ paddingLeft: '24px', height: '36px', width: '100%', fontSize: '0.9rem', outline: 'none', border: '1px solid var(--border-subtle)', borderRadius: '6px', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 1 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Vuelto a entregar</span>
                    <div className="title-md mt-1" style={{ color: (parseFloat(amountPaid) >= total) ? 'var(--success-text)' : 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.25rem' }}>
                      {parseFloat(amountPaid) >= total 
                        ? formatARS(parseFloat(amountPaid) - total) 
                        : (amountPaid ? 'Falta cubrir' : '$0,00')}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-row between" style={{ marginTop: 12, marginBottom: 12 }}>
                <div className="muted">Total a pagar</div>
                <div className="title-xl">{formatARS(total)}</div>
              </div>
              <Button
                variant="primary"
                fullWidth
                onClick={handleSubmit}
                disabled={!cart.length || loadingSale || submitting}
                icon={<CreditCard size={18} />}
              >
                {submitting ? 'Procesando...' : (editingSaleId ? 'Actualizar venta' : 'Confirmar venta')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <Modal
          title={lastSaleWasEdit ? 'Venta actualizada' : 'Venta registrada'}
          onClose={() => { setShowSuccessModal(false); setLastSaleWasEdit(false); }}
          size="sm"
          footer={(
            <Button variant="primary" fullWidth onClick={() => { setShowSuccessModal(false); setLastSaleWasEdit(false); }}>
              Nueva venta
            </Button>
          )}
        >
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
              <CreditCard size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">
              ¡Operación exitosa!
            </h3>
            <p className="text-muted mb-6">
              Venta #{lastSale?.sale_number || lastSale?.id} procesada por {formatARS(lastSale?.total || 0)}.
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
          setShowClearConfirm(false);
          setIsClearingCart(true);
          setTimeout(() => {
            clearCart();
            setIsClearingCart(false);
          }, 300);
        }}
        onClose={() => setShowClearConfirm(false)}
      />
    </div>
  );
};

export default NewSale;
