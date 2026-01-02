import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({ description: '', price: '' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [ticketConfig, setTicketConfig] = useState(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  const [cartPulse, setCartPulse] = useState(false);
  const [cartAnimKey, setCartAnimKey] = useState(0);

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
    // Fetch Ticket Settings
    api.get('core/settings/')
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
        price: parseFloat(product.precio_venta),
        quantity: 1,
      }]);
    }
    setCartAnimKey((k) => k + 1);
    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 450);
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

  const removeItem = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const total = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    return subtotal - (parseFloat(discount) || 0);
  }, [cart, discount]);

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
      const payload = {
        payment_method: paymentMethod,
        discount: parseFloat(discount) || 0,
        items: cart.map((item) => ({
          item_type: item.item_type,
          product: item.product,
          description: item.item_type === 'SERVICIO' ? item.description : undefined,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      const response = await api.post('sales/sales/', payload);

      const saleSnapshot = {
        id: response.data.id,
        sale_number: response.data.sale_number,
        date: response.data.date, // Backend date
        items: [...cart],
        subtotal: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0),
        discount: parseFloat(discount) || 0,
        total: total, // Calculated total from frontend state
        payment_method: paymentMethod,
      };

      setLastSale(saleSnapshot);
      setShowSuccessModal(true);
      setShowCartModal(false);

      // Clear form
      setCart([]);
      setDiscount(0);
      setPaymentMethod('EFECTIVO');
      toast.success('Venta registrada con éxito');
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error));
    }
  };



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
                  products.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => p.stock_actual > 0 && addToCart(p)}
                      className={p.stock_actual <= 0 ? 'pos-row-disabled' : ''}
                      style={{ cursor: p.stock_actual > 0 ? 'pointer' : 'not-allowed' }}
                      onMouseEnter={(e) => {
                        if (p.stock_actual > 0 && window.matchMedia('(hover: hover)').matches) {
                          e.currentTarget.style.backgroundColor = 'var(--primary-50)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (p.stock_actual > 0 && window.matchMedia('(hover: hover)').matches) {
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
          <div className="pagination">
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
            <h3>Carrito</h3>
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
              <div className="flex-row between">
                <div className="quantity-group">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, e.target.value)}
                  />
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
                <div className="text-right">
                  <div className="muted tiny">Unitario {formatARS(item.price)}</div>
                  <div className="title-sm">{formatARS(item.price * item.quantity)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-footer">
          <div className="grid two-cols">
            <Input
              label="Descuento"
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              icon={<Tag size={14} />}
            />
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
            Confirmar venta
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
                <div className="flex-row between">
                  <div className="quantity-group">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, e.target.value)}
                    />
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                  <div className="text-right">
                    <div className="muted tiny">Unitario {formatARS(item.price)}</div>
                    <div className="title-sm">{formatARS(item.price * item.quantity)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-footer">
            <div className="grid two-cols">
              <Input
                label="Descuento"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                icon={<Tag size={14} />}
              />
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
              Confirmar venta
            </Button>
          </div>
        </Modal>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <Modal
          title="Venta registrada"
          onClose={() => setShowSuccessModal(false)}
          size="sm"
          footer={(
            <Button variant="primary" fullWidth onClick={() => setShowSuccessModal(false)}>
              Nueva venta
            </Button>
          )}
        >
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
              <CreditCard size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Venta #{lastSale?.sale_number || lastSale?.id}</h3>
            <p className="text-slate-500 mb-6">La venta se registró correctamente.</p>

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
