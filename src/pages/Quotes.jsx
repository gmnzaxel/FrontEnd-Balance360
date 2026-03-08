import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    const [cart, setCart] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [validityDays, setValidityDays] = useState(15);
    const [clientName, setClientName] = useState('');
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

    const removeItem = (id) => {
        setCart(cart.filter((item) => item.id !== id));
    };

    const total = useMemo(() => {
        const subtotal = cart.reduce((acc, item) => acc + ((parseFloat(item.price) || 0) * item.quantity), 0);
        return subtotal - (parseFloat(discount) || 0);
    }, [cart, discount]);

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
        const subtotal = cart.reduce((acc, item) => acc + ((parseFloat(item.price) || 0) * item.quantity), 0);
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
              ${cart.map(item => `
                <tr>
                  <td>${item.nombre}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">$${((parseFloat(item.price) || 0) * item.quantity).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="row">
              <span>Subtotal:</span>
              <span>$${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            ${discount > 0 ? `
            <div class="row">
              <span>Descuento:</span>
              <span>-$${parseFloat(discount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
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
            setDiscount(0);
            setClientName('');
        }
    }

    return (
        <div className="pos-shell">
            <div className="catalog-panel">
                <div className="flex-row between">
                    <Input
                        placeholder="Buscar producto…"
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
                                <div className="quantity-group" style={{ flexShrink: 0 }}>
                                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateQuantity(item.id, e.target.value)}
                                    />
                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                </div>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-500)' }}>$</span>
                                    <input
                                        type="number"
                                        value={item.price}
                                        onChange={(e) => updatePrice(item.id, e.target.value)}
                                        className="ui-input"
                                        style={{ paddingLeft: '24px', paddingRight: '8px', height: '36px', width: '100%', textAlign: 'right' }}
                                        placeholder="Precio"
                                    />
                                </div>
                            </div>
                            <div className="text-right mt-1">
                                <div className="title-sm">{formatARS((parseFloat(item.price) || 0) * item.quantity)}</div>
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
                        <Input
                            label="Descuento extra ($)"
                            type="number"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                            icon={<Tag size={14} />}
                        />
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
                            onClick={handlePrintQuote}
                            disabled={!cart.length}
                            icon={<Printer size={18} />}
                        >
                            Imprimir XML
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
