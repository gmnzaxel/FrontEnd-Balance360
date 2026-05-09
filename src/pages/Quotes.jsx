import React, { useCallback, useEffect, useMemo, useState, useRef, memo } from 'react';
import useCart from '../hooks/useCart';
import { Search, Trash2, Wrench, PackageX, FileDown, CreditCard } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../utils/errorUtils';
import { formatARS } from '../utils/format';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';

const PAGE_SIZE = 12;

// ─── Sub-componentes memoizados ────────────────────────────────────────────────

const ProductRow = memo(({ product, onAdd }) => {
    const handleClick = useCallback(() => onAdd(product), [product, onAdd]);
    return (
        <tr
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-50)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
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

const CartItem = memo(({ item, onRemove, onUpdatePrice, onUpdateDiscount }) => {
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
                <div className="badge badge-neutral" style={{ fontSize: '0.75rem', padding: '4px 8px', flexShrink: 0 }}>
                    {item.quantity} un.
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

    // ─── Handlers del carrito ───────────────────────────────────────────────────

    const addToCart = useCallback((product) => {
        setCart(prev => {
            const exists = prev.find(i => i.item_type === 'PRODUCTO' && i.product === product.id);
            if (exists) {
                return prev.map(i =>
                    i.item_type === 'PRODUCTO' && i.product === product.id
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                );
            }
            return [...prev, {
                id: `prod-${product.id}`,
                item_type: 'PRODUCTO',
                product: product.id,
                nombre: product.nombre,
                price: parseFloat(product.precio_venta) || 0,
                quantity: 1,
                discountType: '$',
                discountValue: '',
            }];
        });
    }, [setCart]);

    const addService = useCallback(() => {
        if (!serviceForm.description || !serviceForm.price) {
            toast.error('Completa descripción y precio');
            return;
        }
        addServiceItem(serviceForm.description, serviceForm.price);
        setServiceForm({ description: '', price: '' });
        setShowServiceModal(false);
    }, [serviceForm, addServiceItem]);

    const updatePrice = useCallback((id, newPrice) => {
        setCart(prev => prev.map(item =>
            item.id === id ? { ...item, price: newPrice === '' ? '' : parseFloat(newPrice) } : item
        ));
    }, [setCart]);

    const handleClearCart = useCallback(() => {
        if (window.confirm('¿Seguro que deseas vaciar el presupuesto actual?')) {
            clearCart();
            setClientName('');
        }
    }, [clearCart]);

    // ─── Generar / imprimir presupuesto ─────────────────────────────────────────

    const handleGenerateQuote = useCallback(() => {
        if (!cart.length) { toast.warning('El presupuesto está vacío'); return; }

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) return;

        const headerText = ticketConfigRef.current?.ticket_header || 'BALANCE 360';
        const dateStr = new Date().toLocaleString('es-AR', { hour12: false });

        // Calculamos subtotal inline para el ticket (usamos el valor ya memoizado)
        const discountAmount = (() => {
            const dv = parseFloat(discount);
            if (isNaN(dv) || dv <= 0) return 0;
            return discountType === '%' ? subtotal * (dv / 100) : dv;
        })();

        const htmlContent = `
      <html>
        <head>
          <title></title>
          <style>
            @page { margin: 0; }
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0; padding: 10px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .company { font-size: 16px; font-weight: bold; margin-bottom: 5px; white-space: pre-wrap; }
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
            <div class="company">${headerText}</div>
            <div class="info">Validez: ${validityDays} días</div>
            ${clientName ? `<div class="info">Cliente: ${clientName}</div>` : ''}
            <div class="info">Fecha: ${dateStr}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Desc</th>
                <th class="text-right">Cant</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${cart.map(item => {
                  const baseSub = (parseFloat(item.price) || 0) * item.quantity;
                  const dv = parseFloat(item.discountValue);
                  const descItem = !item.discountValue || isNaN(dv) ? 0
                      : item.discountType === '%' ? baseSub * (dv / 100) : dv;
                  const itemTotal = baseSub - descItem;
                  return `
                <tr>
                  <td>${item.nombre} ${descItem > 0 ? `<br><small>Desc: ${item.discountType === '%' ? item.discountValue + '%' : '$' + descItem.toFixed(2)}</small>` : ''}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">$${itemTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="row"><span>Subtotal:</span><span>$${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
            ${discountAmount > 0 ? `<div class="row"><span>Descuento ${discountType === '%' ? `(${discount}%)` : ''}:</span><span>-$${discountAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>` : ''}
            <div class="row" style="font-weight:bold;font-size:14px;margin-top:5px;">
              <span>TOTAL PREVISTO:</span><span>$${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
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
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    }, [cart, discount, discountType, subtotal, total, validityDays, clientName]);

    // ─── Atajos de teclado — con deps correctas para no re-registrar en cada render

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === 'F8') {
                e.preventDefault();
                handleGenerateQuote();
            }
            if (e.key === 'Escape' && !showServiceModal) {
                e.preventDefault();
                handleClearCart();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleGenerateQuote, handleClearCart, showServiceModal]);

    // ─── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="pos-shell">
            {/* ── Panel catálogo ── */}
            <div className="catalog-panel">
                <div className="flex-row between">
                    <Input
                        ref={searchInputRef}
                        placeholder="Buscar producto… [F2]"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={<Search size={18} />}
                    />
                    <Button variant="secondary" icon={<Wrench size={16} />} onClick={() => setShowServiceModal(true)}>
                        + Servicio Libre
                    </Button>
                </div>
                <div className="muted small mb-2">Catálogo</div>
                <div className="flex flex-col gap-0 border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="table-container" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
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
                                    : products.map(p => (
                                        <ProductRow key={p.id} product={p} onAdd={addToCart} />
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
                    <div className="grid two-cols">
                        <Button variant="secondary" onClick={handleClearCart} disabled={!cart.length}>
                            Limpiar todo
                        </Button>
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={handleGenerateQuote}
                            disabled={!cart.length}
                            icon={<CreditCard size={18} />}
                        >
                            Generar presupuesto [F8]
                        </Button>
                    </div>
                </div>
            </div>

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
        </div>
    );
};

export default Quotes;
