import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ShoppingCart, Tag, CreditCard, Trash2, Wrench, PackageX } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-toastify';
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
  const [page, setPage] = useState(1);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({ description: '', price: '' });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('inventory/products/');
      const list = response.data.results || response.data;
      setProducts(Array.isArray(list) ? list : []);
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase();
    return products.filter((p) =>
      p.nombre.toLowerCase().includes(term) ||
      p.codigo.toLowerCase().includes(term)
    );
  }, [products, search]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const pageProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      await api.post('sales/sales/', payload);
      toast.success('Venta registrada con éxito');
      setCart([]);
      setDiscount(0);
      setPaymentMethod('EFECTIVO');
    } catch (error) {
      toast.error('Error al registrar venta');
    }
  };

  return (
    <div className="pos-shell">
      <div className="catalog-panel">
        <div className="flex-row between">
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={18} />}
          />
          <Button variant="secondary" icon={<Wrench size={16} />} onClick={() => setShowServiceModal(true)}>
            + Servicio
          </Button>
        </div>
        <div className="muted small">Catálogo</div>
        <div className="catalog-grid">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={140} />)
          ) : (
            pageProducts.map((p) => (
              <button
                key={p.id}
                className={`catalog-card ${p.stock_actual <= 0 ? 'disabled' : ''}`}
                onClick={() => p.stock_actual > 0 && addToCart(p)}
                disabled={p.stock_actual <= 0}
              >
                <div className="muted tiny uppercase">#{p.codigo}</div>
                <div className="title-sm">{p.nombre}</div>
                <div className="muted tiny">Stock: {p.stock_actual}</div>
                <div className="title-lg">{formatARS(p.precio_venta)}</div>
              </button>
            ))
          )}

          {!loading && !pageProducts.length && (
            <div className="empty-state">
              <PackageX size={46} className="muted" />
              <p>No se encontraron productos</p>
            </div>
          )}
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
              <p>Agrega productos o servicios</p>
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
    </div>
  );
};

export default NewSale;
