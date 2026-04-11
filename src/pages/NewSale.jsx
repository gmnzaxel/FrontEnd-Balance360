import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Tag, CreditCard, Trash2, Wrench, PackageX } from 'lucide-react';
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

const PAGE_SIZE = 12;

const NewSale = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [cart, setCart] = useState(() => {
    try { const saved = localStorage.getItem('pos_cart'); return saved ? JSON.parse(saved) : []; }
    catch { return []; }
  });
  const [discount, setDiscount] = useState(() => localStorage.getItem('pos_discount') || '');
  const [discountType, setDiscountType] = useState(() => localStorage.getItem('pos_discount_type') || '$');
  const [paymentMethod, setPaymentMethod] = useState(() => localStorage.getItem('pos_payment') || 'EFECTIVO');
  
  const searchInputRef = useRef(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({ description: '', price: '' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [ticketConfig, setTicketConfig] = useState(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  const [cartPulse, setCartPulse] = useState(false);
  const [cartAnimKey, setCartAnimKey] = useState(0);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [editingSaleNumber, setEditingSaleNumber] = useState(null);
  const [loadingSale, setLoadingSale] = useState(false);
  const [lastSaleWasEdit, setLastSaleWasEdit] = useState(false);
  
  const [multiplier, setMultiplier] = useState(1);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');

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

  useEffect(() => { localStorage.setItem('pos_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('pos_discount', discount); }, [discount]);
  useEffect(() => { localStorage.setItem('pos_discount_type', discountType); }, [discountType]);
  useEffect(() => { localStorage.setItem('pos_payment', paymentMethod); }, [paymentMethod]);

  useEffect(() => {
    fetchProducts();
    // Fetch Ticket Settings
    api.get('settings/')
      .then(res => setTicketConfig(res.data))
      .catch(err => console.error("Error loading ticket settings", err));
  }, [fetchProducts]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [products]);

  const normalizeSaleItems = useCallback((items = []) => (
    items.map((item) => {
      const isService = item.item_type === 'SERVICIO';
      const description = item.description || 'Servicio';
      return {
        id: `sale-${item.id || Math.random().toString(36).slice(2)}`,
        item_type: item.item_type,
        product: isService ? null : item.product,
        description: isService ? description : undefined,
        nombre: isService ? `[Servicio] ${description}` : (item.producto_nombre || item.nombre || 'Producto'),
        price: parseFloat(item.price),
        quantity: item.quantity,
        discountType: '$',
        discountValue: parseFloat(item.discount) || ''
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
      }
      setEditingSaleId(null);
      setEditingSaleNumber(null);
    }
  }, [location.search, loadSaleForEdit, editingSaleId]);

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

  /* 
     Re-inserting correctly the handlePrintTicket function 
     and removing the accidental comment/broken code 
  */
  const handlePrintTicket = () => {
    if (!lastSale) return;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const headerText = ticketConfig?.ticket_header || 'BALANCE 360';
    const footerText = ticketConfig?.ticket_footer || '¡Gracias por su compra!';

    const htmlContent = `
      <html>
        <head>
          <title>Ticket de Venta #${lastSale.id}</title>
          <style>
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
            <div class="info">Fecha: ${new Date(lastSale.date).toLocaleString('es-AR', { hour12: false })}</div>
            <div class="info">Ticket #${lastSale.id}</div>
            <div class="info">Pago: ${lastSale.payment_method}</div>
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
              ${lastSale.items.map(item => `
                <tr>
                  <td>${item.nombre || item.description}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">$${(item.price * item.quantity).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="row">
              <span>Subtotal:</span>
              <span>$${lastSale.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            ${lastSale.discount > 0 ? `
            <div class="row">
              <span>Descuento:</span>
              <span>-$${lastSale.discount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>` : ''}
            <div class="row" style="font-weight: bold; font-size: 14px; margin-top: 5px;">
              <span>TOTAL:</span>
              <span>$${lastSale.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
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
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const addToCart = (product) => {
    const qty = multiplier;
    const exists = cart.find((item) => item.item_type === 'PRODUCTO' && item.product === product.id);
    if (exists) {
      setCart(cart.map((item) =>
        item.item_type === 'PRODUCTO' && item.product === product.id
          ? { ...item, quantity: item.quantity + qty }
          : item
      ));
    } else {
      setCart([...cart, {
        id: `prod-${product.id}`,
        item_type: 'PRODUCTO',
        product: product.id,
        nombre: product.nombre,
        price: parseFloat(product.precio_venta),
        quantity: qty,
        discountType: '$',
        discountValue: ''
      }]);
    }
    setCartAnimKey((k) => k + 1);
    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 450);
    setMultiplier(1);
    setSearch('');
    searchInputRef.current?.focus();
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
      price: parseFloat(serviceForm.price),
      quantity: 1,
      product: null,
      discountType: '$',
      discountValue: ''
    }]);
    setServiceForm({ description: '', price: '' });
    setShowServiceModal(false);
    setCartAnimKey((k) => k + 1);
    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 450);
  };

  const updateQuantity = (id, quantity) => {
    if (!quantity || Number.isNaN(quantity)) return;
    const value = Math.max(1, parseInt(quantity, 10));
    setCart(cart.map((item) => item.id === id ? { ...item, quantity: value } : item));
  };

  const updateItemDiscount = (id, value, type) => {
    setCart(cart.map((item) => item.id === id ? { ...item, discountValue: value, discountType: type } : item));
  };

  const removeItem = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const getSubtotalWithItemDiscounts = () => {
    return cart.reduce((acc, item) => {
      const baseSub = item.price * item.quantity;
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
        if (window.confirm('¿Vaciar el carrito actual?')) {
          setCart([]);
          setDiscount('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isMobile, showCartModal, showServiceModal, showSuccessModal, discount, discountType, paymentMethod]);

  const cartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  );

  const handleSubmit = async () => {
    if (!cart.length) {
      toast.warning('El carrito está vacío');
      return;
    }

    try {
      const wasEditing = Boolean(editingSaleId);
      const subtotalBase = getSubtotalWithItemDiscounts();
      const finalGlobalDiscount = discountType === '%' 
        ? parseFloat((subtotalBase * (parseFloat(discount) / 100)).toFixed(2)) || 0
        : parseFloat(discount) || 0;

      const payload = {
        payment_method: paymentMethod,
        discount: finalGlobalDiscount,
        items: cart.map((item) => {
          const baseSub = item.price * item.quantity;
          let descItem = 0;
          if (item.discountValue) {
            if (item.discountType === '%') {
              descItem = baseSub * (parseFloat(item.discountValue) / 100);
            } else {
              descItem = parseFloat(item.discountValue) || 0;
            }
          }
          return {
            item_type: item.item_type,
            product: item.product,
            description: item.item_type === 'SERVICIO' ? item.description : undefined,
            quantity: item.quantity,
            price: item.price,
            discount: parseFloat(descItem.toFixed(2)) || 0
          };
        }),
      };

      const response = wasEditing
        ? await api.put(`sales/sales/${editingSaleId}/`, payload)
        : await api.post('sales/sales/', payload);

      const normalizedItems = normalizeSaleItems(response.data.items || cart);
      const subtotal = normalizedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const saleSnapshot = {
        id: response.data.id,
        sale_number: response.data.sale_number,
        date: response.data.date, // Backend date
        items: normalizedItems,
        subtotal,
        discount: parseFloat(response.data.discount ?? discount) || 0,
        total: parseFloat(response.data.total ?? total),
        payment_method: response.data.payment_method || paymentMethod,
      };

      setLastSale(saleSnapshot);
      setLastSaleWasEdit(wasEditing);
      setShowSuccessModal(true);
      setShowCartModal(false);

      // Clear form
      setCart([]);
      setDiscount('');
      setDiscountType('$');
      setPaymentMethod('EFECTIVO');
      setEditingSaleId(null);
      setEditingSaleNumber(null);
      navigate('/new-sale', { replace: true });
      toast.success(wasEditing ? 'Venta actualizada con éxito' : 'Venta registrada con éxito');
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error));
    }
  };



  return (
    <div className="pos-shell">
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
        <div className="muted small mb-2">Catálogo (Más Vendidos)</div>
        <div className="flex flex-col gap-0 border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="table-container" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
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
                        backgroundColor: focusedIndex === i ? 'rgba(14, 165, 233, 0.12)' : 'transparent'
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
                {!loading && !products.length && (
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
            <div key={item.id} className="cart-item">
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
                <div className="badge badge-neutral" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                  {item.quantity} un.
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
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="DEBITO">Tarjeta Débito</option>
              <option value="CREDITO">Tarjeta Crédito</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="MERCADOPAGO">MercadoPago</option>
              <option value="OTRO">Otro</option>
            </Select>
          </div>

          <div className="flex-row between" style={{ marginTop: 12, marginBottom: 12 }}>
            <div className="muted">Total a pagar</div>
            <div className="title-xl">{formatARS(total)}</div>
          </div>
          <Button
            variant="primary"
            fullWidth
            onClick={handleSubmit}
            disabled={!cart.length}
            icon={<CreditCard size={18} />}
          >
            Confirmar venta [F8]
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
                <div key={item.id} className="cart-item">
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
                    <div className="badge badge-neutral" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                      {item.quantity} un.
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
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="DEBITO">Tarjeta Débito</option>
                  <option value="CREDITO">Tarjeta Crédito</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="MERCADOPAGO">MercadoPago</option>
                  <option value="OTRO">Otro</option>
                </Select>
              </div>

              <div className="flex-row between" style={{ marginTop: 12, marginBottom: 12 }}>
                <div className="muted">Total a pagar</div>
                <div className="title-xl">{formatARS(total)}</div>
              </div>
              <Button
                variant="primary"
                fullWidth
                onClick={handleSubmit}
                disabled={!cart.length || loadingSale}
                icon={<CreditCard size={18} />}
              >
                {editingSaleId ? 'Actualizar venta' : 'Confirmar venta'}
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
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
              <CreditCard size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              ¡Operación exitosa!
            </h3>
            <p className="text-slate-600 mb-6">
              Venta #{lastSale?.sale_number || lastSale?.id} procesada por {formatARS(lastSale?.total || 0)}.
            </p>
            <Button
              variant="secondary"
              fullWidth
              icon={<span style={{ fontSize: 18 }}>🖨️</span>} // Using emoji as simple icon fallback or lucide Printer
              onClick={handlePrintTicket}
            >
              Imprimir Ticket
            </Button>
          </div>
        </Modal>
      )}


    </div>
  );
};

export default NewSale;
