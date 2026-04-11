import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Search, ShoppingCart, Tag, Printer, Trash2, Wrench, PackageX, FileDown } from 'lucide-react';
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

const Quotes = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [cart, setCart] = useState(() => {
        try { const saved = localStorage.getItem('quote_cart'); return saved ? JSON.parse(saved) : []; }
        catch { return []; }
    });
    const [discount, setDiscount] = useState(() => localStorage.getItem('quote_discount') || '');
    const [discountType, setDiscountType] = useState(() => localStorage.getItem('quote_discount_type') || '$');
    const [validityDays, setValidityDays] = useState(15);
    const [clientName, setClientName] = useState(() => localStorage.getItem('quote_client') || '');
    
    const searchInputRef = useRef(null);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [serviceForm, setServiceForm] = useState({ description: '', price: '' });
    const [ticketConfig, setTicketConfig] = useState(null);
    const [showCartModal, setShowCartModal] = useState(false);
    const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
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
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch]);

    useEffect(() => {
        fetchProducts();
        api.get('settings/')
            .then(res => setTicketConfig(res.data))
            .catch(err => console.error("Error loading ticket settings", err));
    }, [fetchProducts]);

    useEffect(() => { localStorage.setItem('quote_cart', JSON.stringify(cart)); }, [cart]);
    useEffect(() => { localStorage.setItem('quote_discount', discount); }, [discount]);
    useEffect(() => { localStorage.setItem('quote_discount_type', discountType); }, [discountType]);
    useEffect(() => { localStorage.setItem('quote_client', clientName); }, [clientName]);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 768px)');
        const handler = (e) => setIsMobile(e.matches);
        media.addEventListener('change', handler);
        return () => media.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        setPage(1);
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 250);
        return () => clearTimeout(timer);
    }, [search]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const addToCart = (product) => {
        const exists = cart.find((item) => item.item_type === 'PRODUCTO' && item.product === product.id);
        if (exists) {
            setCart(cart.map((item) =>
                item.item_type === 'PRODUCTO' && item.product === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                id: `prod-${product.id}`,
                item_type: 'PRODUCTO',
                product: product.id,
                nombre: product.nombre,
                price: parseFloat(product.precio_venta) || 0,
                quantity: 1,
                discountType: '$',
                discountValue: '',
            }]);
        }
    };

    const addService = () => {
        if (!serviceForm.description || !serviceForm.price) {
            toast.error('Completa descripción y precio');
            return;
        }
        setCart([...cart, {
            id: `svc-${Date.now()}`,
            item_type: 'SERVICIO',
            description: serviceForm.description,
            nombre: `[Servicio] ${serviceForm.description}`,
            price: parseFloat(serviceForm.price) || 0,
            quantity: 1,
            product: null,
            discountType: '$',
            discountValue: '',
        }]);
        setServiceForm({ description: '', price: '' });
        setShowServiceModal(false);
    };

    const updateQuantity = (id, quantity) => {
        if (!quantity || Number.isNaN(quantity)) return;
        const value = Math.max(1, parseInt(quantity, 10));
        setCart(cart.map((item) => item.id === id ? { ...item, quantity: value } : item));
    };

    const updatePrice = (id, newPrice) => {
        const priceToSet = newPrice === '' ? '' : parseFloat(newPrice);
        setCart(cart.map((item) => item.id === id ? { ...item, price: priceToSet } : item));
    };

    const updateItemDiscount = (id, value, type) => {
        setCart(cart.map((item) => item.id === id ? { ...item, discountValue: value, discountType: type } : item));
    };

    const removeItem = (id) => {
        setCart(cart.filter((item) => item.id !== id));
    };

    const getSubtotalWithItemDiscounts = () => {
        return cart.reduce((acc, item) => {
            const baseSub = (parseFloat(item.price) || 0) * item.quantity;
            let descItem = 0;
            if (item.discountValue) {
                if (item.discountType === '%') {
                    descItem = baseSub * (parseFloat(item.discountValue) / 100);
                } else {
                    descItem = parseFloat(item.discountValue) || 0;
                }
            }
            return acc + (baseSub - descItem);
        }, 0);
    };

    const total = useMemo(() => {
        const subtotal = getSubtotalWithItemDiscounts();
        let descTotal = 0;
        if (discount) {
            if (discountType === '%') {
                descTotal = subtotal * (parseFloat(discount) / 100);
            } else {
                descTotal = parseFloat(discount) || 0;
            }
        }
        return Math.max(0, subtotal - descTotal);
    }, [cart, discount, discountType]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === 'F8') {
                e.preventDefault();
                if (cart.length > 0) {
                    handleGenerateQuote();
                } else {
                    toast.info('El carrito está vacío');
                }
            }
            if (e.key === 'Escape' && cart.length > 0 && !showCartModal && !showServiceModal) {
                e.preventDefault();
                if (window.confirm('¿Vaciar el presupuesto actual?')) {
                    setCart([]);
                    setDiscount('');
                    setClientName('');
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    const cartCount = useMemo(
        () => cart.reduce((acc, item) => acc + item.quantity, 0),
        [cart]
    );

    const handlePrintQuote = () => {
        if (!cart.length) {
            toast.warning('El presupuesto está vacío');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) return;

        const headerText = ticketConfig?.ticket_header || 'BALANCE 360';
        const subtotal = getSubtotalWithItemDiscounts();
        const dateStr = new Date().toLocaleString('es-AR', { hour12: false });

        const htmlContent = `
      <html>
        <head>
          <title></title>
          <style>
            @page { margin: 0; }
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0; padding: 10px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .company { font-size: 16px; font-weight: bold; margin-bottom: 5px; white-space: pre-wrap; }
            .title { font-size: 14px; font-weight: bold; margin: 10px 0; border: 1px solid #000; padding: 4px; }
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
                  let descItem = 0;
                  if (item.discountValue) {
                      if (item.discountType === '%') {
                          descItem = baseSub * (parseFloat(item.discountValue) / 100);
                      } else {
                          descItem = parseFloat(item.discountValue) || 0;
                      }
                  }
                  const itemTotal = baseSub - descItem;
                  return `
                <tr>
                  <td>${item.nombre} ${descItem > 0 ? `<br><small>Desc: ${item.discountType === '%' ? item.discountValue + '%' : '$' + parseFloat(descItem).toFixed(2)}</small>` : ''}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">$${itemTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="row">
              <span>Subtotal:</span>
              <span>$${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            ${parseFloat(discount) > 0 ? `
            <div class="row">
              <span>Descuento ${discountType === '%' ? `(${discount}%)` : ''}:</span>
              <span>-${discountType === '%' 
                 ? '$' + (subtotal * (parseFloat(discount) / 100)).toLocaleString('es-AR', { minimumFractionDigits: 2 })
                 : '$' + parseFloat(discount).toLocaleString('es-AR', { minimumFractionDigits: 2 })
              }</span>
            </div>` : ''}
            <div class="row" style="font-weight: bold; font-size: 14px; margin-top: 5px;">
              <span>TOTAL PREVISTO:</span>
              <span>$${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
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
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const handleClearCart = () => {
        if (window.confirm("¿Seguro que deseas vaciar el presupuesto actual?")) {
            setCart([]);
            setDiscount('');
            setDiscountType('$');
            setClientName('');
        }
    }

    return (
        <div className="pos-shell">
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
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan="4">
                                                <Skeleton height={20} />
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    products.map((p) => (
                                        <tr
                                            key={p.id}
                                            onClick={() => addToCart(p)}
                                            style={{ cursor: 'pointer' }}
                                            onMouseEnter={(e) => {
                                                if (window.matchMedia('(hover: hover)').matches) {
                                                    e.currentTarget.style.backgroundColor = 'var(--primary-50)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (window.matchMedia('(hover: hover)').matches) {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            }}
                                        >
                                            <td data-label="Código">
                                                <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>{p.codigo}</span>
                                            </td>
                                            <td data-label="Producto">
                                                <div style={{ fontWeight: 600, color: 'var(--slate-700)' }}>{p.nombre}</div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }} data-label="Precio Base">
                                                {formatARS(p.precio_venta)}
                                            </td>
                                            <td style={{ textAlign: 'center', color: 'var(--primary-600)' }} data-label="Acción">
                                                <span>+</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                {!loading && !products.length && (
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
                        <Button variant="ghost" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                        <span className="muted small">Página {page} de {totalPages}</span>
                        <Button variant="ghost" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
                    </div>
                )}
            </div>

            <div className="cart-panel">
                <div className="card-head" style={{ padding: '14px 16px', borderBottom: '1px solid var(--slate-200)' }}>
                    <div>
                        <p className="eyebrow">Armado de</p>
                        <div className="flex-row gap-sm items-center">
                            <h3>Presupuesto</h3>
                        </div>
                    </div>
                    <div className="badge badge-neutral">
                        {cartCount} items
                    </div>
                </div>

                <div className="cart-body">
                    {!cart.length && (
                        <div className="empty-state">
                            <FileDown size={42} className="muted" />
                            <p>Agregá productos o servicios al presupuesto</p>
                        </div>
                    )}
                    {cart.map((item) => (
                        <div key={item.id} className="cart-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                            <div className="flex-row between" style={{ marginBottom: '8px' }}>
                                <div>
                                    <p className="title-sm">{item.nombre}</p>
                                </div>
                                <button className="ghost-icon" onClick={() => removeItem(item.id)} aria-label="Eliminar" style={{ color: 'var(--danger-500)' }}>
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
                                        onChange={(e) => updatePrice(item.id, e.target.value)}
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
                                  {(() => {
                                      const base = (parseFloat(item.price) || 0) * item.quantity;
                                      const dvs = parseFloat(item.discountValue);
                                      const desc = isNaN(dvs) ? 0 : (item.discountType === '%' ? base * (dvs/100) : dvs);
                                      return <div className="title-sm">{formatARS(base - desc)}</div>;
                                  })()}
                                </div>
                            </div>
                        </div>
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
                              <select style={{ width: '60px', paddingLeft: '8px', paddingRight: '8px' }} value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
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
                        <Button
                            variant="secondary"
                            onClick={handleClearCart}
                            disabled={!cart.length}
                        >
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
                        label="Precio base"
                        type="number"
                        value={serviceForm.price}
                        onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                        placeholder="0.00"
                    />
                </Modal>
            )}
        </div>
    );
};

export default Quotes;
