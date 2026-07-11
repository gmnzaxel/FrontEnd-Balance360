import React, { useCallback, useEffect, useMemo, useState, useRef, memo } from 'react';
import useCart from '../hooks/useCart';
import useMediaQuery from '../hooks/useMediaQuery';
import { Search, Trash2, Wrench, PackageX, FileDown, CreditCard, Printer, ShoppingCart } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../utils/errorUtils';
import { formatARS } from '../utils/format';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
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

// ─── Sub-componentes memoizados ────────────────────────────────────────────────

const ProductRow = memo(({ product, onAdd, isFocused, onMouseEnter }) => {
    const handleClick = useCallback(() => onAdd(product), [product, onAdd]);
    return (
        <tr
            onClick={handleClick}
            style={{ 
                cursor: 'pointer',
                backgroundColor: isFocused ? 'rgba(14, 165, 233, 0.12)' : undefined
            }}
            onMouseEnter={onMouseEnter}
        >
            <td data-label="Código">
                <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>{product.codigo}</span>
            </td>
            <td data-label="Producto">
                <div style={{ fontWeight: 600, color: 'var(--slate-700)' }}>{product.nombre}</div>
            </td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }} data-label="Precio Base">
                {formatARS(product.precio_venta)}
            </td>
            <td style={{ textAlign: 'center', color: 'var(--primary-600)' }} data-label="Acción">
                <span>+</span>
            </td>
        </tr>
    );
});

const CartItem = memo(({ item, onRemove, onUpdatePrice, onUpdateDiscount, onUpdateQuantity }) => {
    const base = (parseFloat(item.price) || 0) * item.quantity;
    const dvs = parseFloat(item.discountValue);
    const desc = isNaN(dvs) ? 0 : (item.discountType === '%' ? base * (dvs / 100) : dvs);
    const lineTotal = base - desc;

    return (
        <div className="cart-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="flex-row between" style={{ marginBottom: '8px' }}>
                <p className="title-sm">{item.nombre}</p>
                <button
                    className="ghost-icon"
                    onClick={() => onRemove(item.id)}
                    aria-label="Eliminar"
                    style={{ color: 'var(--danger-500)' }}
                >
                    <Trash2 size={16} />
                </button>
            </div>
            <div className="flex-row between items-center gap-sm">
                <div className="quantity-stepper flex-row items-center" style={{ gap: '2px', background: 'var(--surface-muted)', borderRadius: '6px', padding: '1px', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, (parseInt(item.quantity, 10) || 1) - 1)}
                    disabled={(parseInt(item.quantity, 10) || 1) <= 1}
                    className="stepper-btn"
                    style={{ border: 'none', background: 'transparent', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '0.8rem' }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onUpdateQuantity(item.id, e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="stepper-input"
                    style={{ width: '24px', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-primary)', outline: 'none', padding: 0 }}
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, (parseInt(item.quantity, 10) || 0) + 1)}
                    className="stepper-btn"
                    style={{ border: 'none', background: 'transparent', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '0.8rem' }}
                  >
                    +
                  </button>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-500)' }}>$</span>
                    <input
                        type="number"
                        value={item.price}
                        onChange={(e) => onUpdatePrice(item.id, e.target.value)}
                        className="input-control"
                        style={{ paddingLeft: '24px', paddingRight: '8px', height: '36px', width: '100%', textAlign: 'right' }}
                        placeholder="Precio"
                    />
                </div>
            </div>
            <div className="flex-row between items-center mt-2">
                <div className="flex-row items-center gap-xs">
                    <span className="muted tiny">Desc.</span>
                    <div className="field-control">
                        <input
                            type="number"
                            style={{ width: '90px', padding: '4px 6px', height: '28px', fontSize: '0.8rem' }}
                            value={item.discountValue || ''}
                            onChange={(e) => onUpdateDiscount(item.id, e.target.value, item.discountType)}
                            placeholder="0"
                        />
                    </div>
                    <div className="field-control">
                        <select
                            style={{ width: '40px', padding: '0 4px', height: '28px', fontSize: '0.8rem', outline: 'none' }}
                            value={item.discountType || '$'}
                            onChange={(e) => onUpdateDiscount(item.id, item.discountValue || '', e.target.value)}
                        >
                            <option value="$">$</option>
                            <option value="%">%</option>
                        </select>
                    </div>
                </div>
                <div className="text-right">
                    <div className="title-sm">{formatARS(lineTotal)}</div>
                </div>
            </div>
        </div>
    );
});

// ─── Componente principal ───────────────────────────────────────────────────────

const Quotes = () => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [showCartModal, setShowCartModal] = useState(false);
    const [cartPulse, setCartPulse] = useState(false);
    const [cartAnimKey, setCartAnimKey] = useState(0);
    const cartPulseTimerRef = useRef(null);
    const [multiplier, setMultiplier] = useState(1);

    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [products, setProducts]           = useState([]);
    const [loading, setLoading]             = useState(false);
    const [fetchError, setFetchError]       = useState(false);
    const [search, setSearch]               = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage]                   = useState(1);
    const [totalCount, setTotalCount]       = useState(0);

    const [validityDays, setValidityDays]   = useState(15);
    const [clientName, setClientName]       = useState(() => localStorage.getItem('quote_client') || '');

    const searchInputRef  = useRef(null);
    const ticketConfigRef = useRef(null);

    const [showServiceModal, setShowServiceModal] = useState(false);
    const [serviceForm, setServiceForm]           = useState({ description: '', price: '' });
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // ─── Hook de carrito compartido ─────────────────────────────────────────────
    const {
        cart, setCart,
        discount, setDiscount,
        discountType, setDiscountType,
        subtotal, total, cartCount,
        removeItem, updateItemDiscount, addServiceItem, clearCart,
    } = useCart({
        cartKey: 'quote_cart',
        discountKey: 'quote_discount',
        discountTypeKey: 'quote_discount_type',
    });

    // Persistencia de clientName con debounce
    useEffect(() => {
        const t = setTimeout(() => localStorage.setItem('quote_client', clientName), 500);
        return () => clearTimeout(t);
    }, [clientName]);

    // ─── Fetch de productos ─────────────────────────────────────────────────────

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setFetchError(false);
        try {
            const response = await api.get('inventory/products/', {
                params: { page, page_size: PAGE_SIZE, search: debouncedSearch || undefined }
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

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    // Settings solo se carga una vez al montar
    useEffect(() => {
        api.get('settings/')
            .then(res => { ticketConfigRef.current = res.data; })
            .catch(err => console.error('Error loading ticket settings', err));
    }, []);

    // ─── Debounce de búsqueda ───────────────────────────────────────────────────

    useEffect(() => { setPage(1); }, [search]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 250);
        return () => clearTimeout(timer);
    }, [search]);

    // ─── Cálculos de paginación ─────────────────────────────────────────────────

    const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

    const triggerCartPulse = useCallback(() => {
        clearTimeout(cartPulseTimerRef.current);
        setCartPulse(true);
        cartPulseTimerRef.current = setTimeout(() => setCartPulse(false), 450);
    }, []);

    // ─── Handlers del carrito ───────────────────────────────────────────────────

    const addToCart = useCallback((product) => {
        const qty = multiplier;
        setCart(prev => {
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
                price: parseFloat(product.precio_venta) || 0,
                quantity: qty,
                discountType: '$',
                discountValue: '',
            }];
        });
        setMultiplier(1);
        setCartAnimKey(k => k + 1);
        triggerCartPulse();
    }, [setCart, triggerCartPulse, multiplier]);

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

    const updatePrice = useCallback((id, newPrice) => {
        setCart(prev => prev.map(item =>
            item.id === id ? { ...item, price: newPrice === '' ? '' : parseFloat(newPrice) } : item
        ));
    }, [setCart]);

    const updateQuantity = useCallback((id, quantity) => {
        if (quantity === '') {
            setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: '' } : item));
            return;
        }
        const val = parseInt(quantity, 10);
        if (Number.isNaN(val)) return;
        const value = Math.max(1, val);
        setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: value } : item));
    }, [setCart]);

    const handleClearCart = useCallback(() => {
        setShowClearConfirm(true);
    }, []);

    const confirmClearCart = useCallback(() => {
        setShowClearConfirm(false);
        clearCart();
        setClientName('');
    }, [clearCart]);

    // ─── Generar / imprimir presupuesto ─────────────────────────────────────────

    const handleGenerateQuote = useCallback(() => {
        if (!cart.length) { toast.warning('El presupuesto está vacío'); return; }

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) {
            toast.error('El navegador bloqueó la ventana emergente de impresión. Por favor, habilita los pop-ups para este sitio.');
            return;
        }

        const branchName = ticketConfigRef.current?.branch_name || 'TU NEGOCIO';
        const headerText = ticketConfigRef.current?.ticket_header || 'BALANCE 360';
        const address = ticketConfigRef.current?.ticket_address;
        const cuit = ticketConfigRef.current?.ticket_cuit;
        const iibb = ticketConfigRef.current?.ticket_iibb;
        const iva = ticketConfigRef.current?.ticket_iva;
        const phone = ticketConfigRef.current?.ticket_phone;
        const email = ticketConfigRef.current?.ticket_email;
        const dateStr = new Date().toLocaleString('es-AR', { hour12: false });
        const logoDataUrl = ticketConfigRef.current?.ticket_logo || localStorage.getItem('ticket_logo') || '';

        // Lógica corregida de descuentos para presupuesto
        const itemsBaseSubtotal = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
        const itemsDiscountTotal = cart.reduce((acc, item) => {
            const baseSub = (parseFloat(item.price) || 0) * item.quantity;
            const dv = parseFloat(item.discountValue);
            const descItem = !item.discountValue || isNaN(dv) ? 0
                : item.discountType === '%' ? baseSub * (dv / 100) : dv;
            return acc + descItem;
        }, 0);
        const globalDiscount = (() => {
            const currentSub = itemsBaseSubtotal - itemsDiscountTotal;
            const dv = parseFloat(discount);
            if (isNaN(dv) || dv <= 0) return 0;
            return discountType === '%' ? currentSub * (dv / 100) : dv;
        })();
        const totalDiscount = itemsDiscountTotal + globalDiscount;
        const finalTotal = itemsBaseSubtotal - totalDiscount;

        const htmlContent = `
      <html>
        <head>
          <title>Presupuesto${clientName ? ` - ${clientName}` : ''}</title>
          <meta charset="UTF-8">
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 0.5cm; }
            }
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0; padding: 10px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .branch-title { font-size: 16px; font-weight: bold; text-transform: uppercase; }
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
            <div class="info">Validez: ${validityDays} días</div>
            ${clientName ? `<div class="info">Cliente: ${clientName}</div>` : ''}
            <div class="info">Fecha: ${dateStr}</div>
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
               ${cart.map(item => {
                  const baseSub = (parseFloat(item.price) || 0) * item.quantity;
                  const dv = parseFloat(item.discountValue);
                  const descItem = !item.discountValue || isNaN(dv) ? 0
                      : item.discountType === '%' ? baseSub * (dv / 100) : dv;
                  return `
                <tr>
                  <td>
                    <div style="font-weight: bold;">${item.nombre}</div>
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
                  <td class="text-right" style="vertical-align: top;">${item.quantity}</td>
                  <td class="text-right" style="vertical-align: top;">$${(baseSub - descItem).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="row"><span>Subtotal:</span><span>$${itemsBaseSubtotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
            ${totalDiscount > 0 ? `<div class="row"><span>Descuento:</span><span>-$${totalDiscount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>` : ''}
            <div class="row" style="font-weight:bold;font-size:14px;margin-top:5px;">
              <span>TOTAL PREVISTO:</span><span>$${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          </div>
          <div class="footer">
            <p>Los precios pueden estar sujetos a modificaciones sin previo aviso luego de su expiración.</p>
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
            // Fallback
            setTimeout(() => {
                try { printWindow.close(); } catch (e) {}
            }, 2000);
        }, 300);
    }, [cart, discount, discountType, subtotal, total, validityDays, clientName]);

    const [downloadingPDF, setDownloadingPDF] = useState(false);

    const handleDownloadQuotePDF = useCallback(async () => {
        if (!cart.length) { toast.warning('El presupuesto está vacío'); return; }
        setDownloadingPDF(true);

        const branchName = ticketConfigRef.current?.branch_name || 'TU NEGOCIO';
        const headerText = ticketConfigRef.current?.ticket_header || 'BALANCE 360';
        const address = ticketConfigRef.current?.ticket_address;
        const cuit = ticketConfigRef.current?.ticket_cuit;
        const iibb = ticketConfigRef.current?.ticket_iibb;
        const iva = ticketConfigRef.current?.ticket_iva;
        const phone = ticketConfigRef.current?.ticket_phone;
        const email = ticketConfigRef.current?.ticket_email;
        const dateStr = new Date().toLocaleString('es-AR', { hour12: false });
        const logoDataUrl = ticketConfigRef.current?.ticket_logo || localStorage.getItem('ticket_logo') || '';

        // Lógica corregida de descuentos para presupuesto en PDF
        const itemsBaseSubtotal = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
        const itemsDiscountTotal = cart.reduce((acc, item) => {
            const baseSub = (parseFloat(item.price) || 0) * item.quantity;
            const dv = parseFloat(item.discountValue);
            const descItem = !item.discountValue || isNaN(dv) ? 0
                : item.discountType === '%' ? baseSub * (dv / 100) : dv;
            return acc + descItem;
        }, 0);
        const globalDiscount = (() => {
            const currentSub = itemsBaseSubtotal - itemsDiscountTotal;
            const dv = parseFloat(discount);
            if (isNaN(dv) || dv <= 0) return 0;
            return discountType === '%' ? currentSub * (dv / 100) : dv;
        })();
        const totalDiscount = itemsDiscountTotal + globalDiscount;
        const finalTotal = itemsBaseSubtotal - totalDiscount;

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
          <div style="font-size: 10px; margin-bottom: 5px; margin-top: 5px;">Validez: ${validityDays} días</div>
          ${clientName ? `<div style="font-size: 10px; margin-bottom: 5px;">Cliente: ${clientName}</div>` : ''}
          <div style="font-size: 10px; margin-bottom: 5px;">Fecha: ${dateStr}</div>
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
            ${cart.map(item => {
                const baseSub = (parseFloat(item.price) || 0) * item.quantity;
                const dv = parseFloat(item.discountValue);
                const descItem = !item.discountValue || isNaN(dv) ? 0
                    : item.discountType === '%' ? baseSub * (dv / 100) : dv;
                return `
              <tr>
                <td style="padding: 4px 0;">
                  <div style="font-weight: bold;">${item.nombre}</div>
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
            <span>TOTAL PREVISTO:</span>
            <span>$${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 10px; white-space: pre-wrap;">
          <p>Los precios pueden estar sujetos a modificaciones sin previo aviso luego de su expiración.</p>
        </div>
      </div>
    `;

        try {
            const html2pdf = await loadHtml2Pdf();
            const element = document.createElement('div');
            element.innerHTML = htmlContent;
            const opt = {
                margin:       0,
                filename:     `Presupuesto_${clientName ? clientName.replace(/\s+/g, '_') : 'Cliente'}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 3, useCORS: true, logging: false },
                jsPDF:        { unit: 'mm', format: [80, 220], orientation: 'portrait' }
            };
            await html2pdf().from(element).set(opt).save();
            toast.success('Presupuesto PDF descargado con éxito');
        } catch (error) {
            console.error(error);
            toast.error('Error al generar el PDF');
        } finally {
            setDownloadingPDF(false);
        }
    }, [cart, discount, discountType, subtotal, total, validityDays, clientName]);

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

            if (e.key === 'F2') {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === 'F8') {
                e.preventDefault();
                handleGenerateQuote();
            } else if (e.key === 'Escape' && !showServiceModal) {
                e.preventDefault();
                handleClearCart();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex(i => Math.min(products.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex(i => Math.max(0, i - 1));
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setPage(p => Math.max(1, p - 1));
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setPage(p => Math.min(totalPages, p + 1));
            } else if (e.key === 'Enter') {
                if (focusedIndex >= 0 && focusedIndex < products.length) {
                    e.preventDefault();
                    addToCart(products[focusedIndex]);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleGenerateQuote, handleClearCart, showServiceModal, products, focusedIndex, totalPages, addToCart]);

    // ─── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="pos-shell">
            {/* ── Panel catálogo ── */}
            <div className="catalog-panel">
                <div className="flex-row between">
                    <div style={{ position: 'relative', flex: 1, marginRight: '16px' }}>
                        <Input
                            ref={searchInputRef}
                            placeholder="Buscar producto… [F2]"
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
                        + Servicio Libre
                    </Button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '1rem' }}>💡</span>
                  <span>Tip: Podés escribir <code>cantidad*</code> (ej: <code>5*coca</code>) en el buscador para cargar múltiples unidades.</span>
                </div>
                <div className="muted small mb-2">Catálogo</div>
                <div className="pos-table-wrapper">
                    <div className="table-container">
                        <table className="styled-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '80px' }}>Código</th>
                                    <th>Producto</th>
                                    <th className="text-right" style={{ width: '120px', textAlign: 'right' }}>Precio Base</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading
                                    ? Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i}><td colSpan="4"><Skeleton height={20} /></td></tr>
                                    ))
                                    : products.map((p, idx) => (
                                        <ProductRow 
                                            key={p.id} 
                                            product={p} 
                                            onAdd={addToCart} 
                                            isFocused={focusedIndex === idx}
                                            onMouseEnter={() => setFocusedIndex(idx)}
                                        />
                                    ))
                                }
                                {!loading && fetchError && (
                                    <tr>
                                        <td colSpan="4" className="pos-empty-cell">
                                            <div className="pos-empty">
                                                <PackageX size={48} style={{ color: 'var(--danger-400)' }} />
                                                <p style={{ fontWeight: 600, color: 'var(--danger-600)' }}>No se pudo conectar con el servidor</p>
                                                <p className="muted small">Verificá que el backend esté corriendo</p>
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
                                        <td colSpan="4" className="pos-empty-cell">
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
                        <Button variant="ghost" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
                        <span className="muted small">Página {page} de {totalPages}</span>
                        <Button variant="ghost" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente</Button>
                    </div>
                )}
            </div>

            {/* ── Panel carrito ── */}
            {!isMobile && (
                <div className="cart-panel">
                    <div className="card-head" style={{ padding: '14px 16px', borderBottom: '1px solid var(--slate-200)' }}>
                        <div>
                            <p className="eyebrow">Armado de</p>
                            <div className="flex-row gap-sm items-center">
                                <h3>Presupuesto</h3>
                            </div>
                        </div>
                        <div className="badge badge-neutral">{cartCount} items</div>
                    </div>

                    <div className="cart-body">
                        {!cart.length && (
                            <div className="empty-state">
                                <FileDown size={42} className="muted" />
                                <p>Agregá productos o servicios al presupuesto</p>
                            </div>
                        )}
                        {cart.map(item => (
                            <CartItem
                                key={item.id}
                                item={item}
                                onRemove={removeItem}
                                onUpdatePrice={updatePrice}
                                onUpdateDiscount={updateItemDiscount}
                                onUpdateQuantity={updateQuantity}
                            />
                        ))}
                    </div>

                    <div className="cart-footer">
                        <Input
                            placeholder="Nombre del cliente (Opcional)"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            style={{ marginBottom: '12px' }}
                        />
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
                                        <select
                                            style={{ width: '60px', paddingLeft: '8px', paddingRight: '8px' }}
                                            value={discountType}
                                            onChange={(e) => setDiscountType(e.target.value)}
                                        >
                                            <option value="$">$</option>
                                            <option value="%">%</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <Select
                                label="Validez (Días)"
                                value={validityDays}
                                onChange={(e) => setValidityDays(e.target.value)}
                            >
                                <option value="1">1 Día</option>
                                <option value="7">7 Días</option>
                                <option value="15">15 Días</option>
                                <option value="30">30 Días</option>
                            </Select>
                        </div>
                        <div className="flex-row between" style={{ marginTop: 12, marginBottom: 12 }}>
                            <div className="muted">Total Presupuestado</div>
                            <div className="title-xl text-primary">{formatARS(total)}</div>
                        </div>
                        <div className="stack gap-sm" style={{ marginTop: 12 }}>
                            <div className="grid two-cols gap-sm">
                                <Button variant="secondary" onClick={handleClearCart} disabled={!cart.length} fullWidth>
                                    Limpiar todo
                                </Button>
                                <Button
                                    variant="primary"
                                    fullWidth
                                    onClick={handleGenerateQuote}
                                    disabled={!cart.length}
                                    icon={<Printer size={18} />}
                                >
                                    Imprimir
                                </Button>
                            </div>
                            <Button
                                variant="secondary"
                                fullWidth
                                onClick={handleDownloadQuotePDF}
                                disabled={!cart.length || downloadingPDF}
                                icon={<FileDown size={18} />}
                            >
                                {downloadingPDF ? 'Descargando...' : 'Descargar PDF'}
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
                        onChange={(e) => setServiceForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Ej. Instalación / Reparación"
                    />
                    <Input
                        label="Precio base"
                        type="number"
                        value={serviceForm.price}
                        onChange={(e) => setServiceForm(f => ({ ...f, price: e.target.value }))}
                        placeholder="0.00"
                    />
                </Modal>
            )}

            {/* FAB móvil */}
            {isMobile && (
                <button
                    className={`pos-cart-fab ${cartPulse ? 'pulse' : ''}`}
                    onClick={() => setShowCartModal(true)}
                    aria-label="Abrir presupuesto"
                >
                    <ShoppingCart size={20} />
                    {cartCount > 0 && <span className="pos-cart-count">{cartCount}</span>}
                    <span key={cartAnimKey} className="pos-cart-fly" aria-hidden="true" />
                </button>
            )}

            {/* Carrito Móvil Modal */}
            {showCartModal && (
                <Modal
                    title="Armar presupuesto"
                    onClose={() => setShowCartModal(false)}
                    size="md"
                >
                    <div className="cart-modal-content">
                        <div className="cart-body">
                            {!cart.length && (
                                <div className="empty-state">
                                    <FileDown size={42} className="muted" />
                                    <p>Agregá productos o servicios al presupuesto</p>
                                </div>
                            )}
                            {cart.map(item => (
                                <CartItem
                                    key={item.id}
                                    item={item}
                                    onRemove={removeItem}
                                    onUpdatePrice={updatePrice}
                                    onUpdateDiscount={updateItemDiscount}
                                    onUpdateQuantity={updateQuantity}
                                />
                            ))}
                        </div>

                        <div className="cart-footer">
                            <Input
                                placeholder="Nombre del cliente (Opcional)"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                style={{ marginBottom: '12px' }}
                            />
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
                                            <select
                                                style={{ width: '60px', paddingLeft: '8px', paddingRight: '8px' }}
                                                value={discountType}
                                                onChange={(e) => setDiscountType(e.target.value)}
                                            >
                                                <option value="$">$</option>
                                                <option value="%">%</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <Select
                                    label="Validez (Días)"
                                    value={validityDays}
                                    onChange={(e) => setValidityDays(e.target.value)}
                                >
                                    <option value="1">1 Día</option>
                                    <option value="7">7 Días</option>
                                    <option value="15">15 Días</option>
                                    <option value="30">30 Días</option>
                                </Select>
                            </div>
                            <div className="flex-row between" style={{ marginTop: 12, marginBottom: 12 }}>
                                <div className="muted">Total Presupuestado</div>
                                <div className="title-xl text-primary">{formatARS(total)}</div>
                            </div>
                            <div className="stack gap-sm" style={{ marginTop: 12 }}>
                                <div className="grid two-cols gap-sm">
                                    <Button variant="secondary" onClick={handleClearCart} disabled={!cart.length} fullWidth>
                                        Limpiar todo
                                    </Button>
                                    <Button
                                        variant="primary"
                                        fullWidth
                                        onClick={handleGenerateQuote}
                                        disabled={!cart.length}
                                        icon={<Printer size={18} />}
                                    >
                                        Imprimir
                                    </Button>
                                </div>
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    onClick={handleDownloadQuotePDF}
                                    disabled={!cart.length || downloadingPDF}
                                    icon={<FileDown size={18} />}
                                >
                                    {downloadingPDF ? 'Descargando...' : 'Descargar PDF'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Modal>
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
        </div>
    );
};

export default Quotes;
