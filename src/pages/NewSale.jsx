import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Plus, Trash, Search, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const NewSale = () => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [cart, setCart] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');

    // Reset products when search term changes
    useEffect(() => {
        setProducts([]);
        setPage(1);
        setHasMore(true);
    }, [searchTerm]);

    useEffect(() => {
        const fetchProducts = async () => {
            if (loading || !hasMore) return;
            setLoading(true);
            try {
                const response = await api.get(`inventory/products/?search=${searchTerm}&page=${page}`);
                const newProducts = response.data.results;

                setProducts(prev => {
                    // Filter duplicates just in case
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNew = newProducts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueNew];
                });

                setHasMore(!!response.data.next);
                setLoading(false);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            fetchProducts();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, page]);

    const handleScroll = (e) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !loading) {
            setPage(prev => prev + 1);
        }
    };

    const addToCart = (product) => {
        const existing = cart.find(item => item.product === product.id);
        if (existing) {
            setCart(cart.map(item =>
                item.product === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCart([...cart, {
                product: product.id,
                nombre: product.nombre,
                price: parseFloat(product.precio_venta),
                quantity: 1
            }]);
        }
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product !== productId));
    };

    const updateQuantity = (productId, qty) => {
        const quantity = parseInt(qty);
        if (isNaN(quantity) || quantity < 1) return;
        setCart(cart.map(item =>
            item.product === productId ? { ...item, quantity } : item
        ));
    };

    const calculateTotal = () => {
        const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        return subtotal - discount;
    };

    const handleSubmit = async () => {
        if (cart.length === 0) {
            toast.warning("El carrito está vacío");
            return;
        }
        try {
            const payload = {
                payment_method: paymentMethod,
                discount: parseFloat(discount),
                items: cart.map(item => ({
                    product: item.product,
                    quantity: item.quantity,
                    price: item.price
                }))
            };
            await api.post('sales/sales/', payload);
            toast.success("Venta registrada con éxito");
            setCart([]);
            setDiscount(0);
            setPaymentMethod('EFECTIVO');
        } catch (error) {
            toast.error("Error al registrar venta");
            console.error(error);
        }
    };

    return (
        <div className="pos-layout">
            <div className="pos-products">
                <div className="pos-search">
                    <Search size={20} className="text-muted" />
                    <input
                        type="text"
                        placeholder="Buscar producto por nombre o código..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>
                <div
                    className="pos-grid"
                    onScroll={handleScroll}
                    style={{ position: 'relative' }}
                >
                    {products.map(p => (
                        <button
                            key={p.id}
                            className="product-card"
                            onClick={() => addToCart(p)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    addToCart(p);
                                }
                            }}
                            type="button"
                            aria-label={`Agregar ${p.nombre} al carrito, precio ${formatCurrency(p.precio_venta)}`}
                            disabled={p.stock_actual <= 0}
                        >
                            <div style={{ width: '100%', textAlign: 'left' }}>
                                <h4 className="pc-title">{p.nombre}</h4>
                                <p className="pc-stock">Stock: {p.stock_actual}</p>
                            </div>
                            <div style={{ marginTop: 'auto', width: '100%', textAlign: 'left' }}>
                                {p.bajo_stock && <span className="badge badge-danger" style={{ fontSize: '0.65rem', marginBottom: '0.25rem' }}>Bajo Stock</span>}
                                {p.stock_actual <= 0 && <span className="badge badge-neutral" style={{ fontSize: '0.65rem', marginBottom: '0.25rem' }}>Sin Stock</span>}
                                <div className="pc-price">{formatCurrency(p.precio_venta)}</div>
                            </div>
                        </button>
                    ))}
                    {loading && <div className="loading-spinner">Cargando...</div>}
                </div>
            </div>

            <div className="card pos-cart">
                <div className="cart-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShoppingCart size={20} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Carrito Actual</h3>
                    </div>
                </div>

                <div className="cart-items">
                    {cart.length === 0 ? (
                        <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)', flexDirection: 'column', gap: '1rem' }}>
                            <ShoppingCart size={48} opacity={0.2} />
                            <p>Agrega productos</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.product} className="cart-item">
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '500' }}>{item.nombre}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{formatCurrency(item.price)} x {item.quantity}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="number"
                                        className="input-control"
                                        style={{ width: '60px', padding: '0.25rem', textAlign: 'center' }}
                                        value={item.quantity}
                                        onChange={e => updateQuantity(item.product, e.target.value)}
                                        min="1"
                                    />
                                    <button onClick={() => removeFromCart(item.product)} className="btn-icon danger">
                                        <Trash size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="cart-total-section">
                    <div className="input-group">
                        <label className="input-label">Descuento (ARS)</label>
                        <input
                            type="number"
                            className="input-control"
                            value={discount}
                            onChange={e => setDiscount(e.target.value)}
                            min="0"
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Método de Pago</label>
                        <select className="select-control" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="DEBITO">Débito</option>
                            <option value="CREDITO">Crédito</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                            <option value="MERCADOPAGO">MercadoPago</option>
                            <option value="OTRO">Otro</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: '500' }}>Total</span>
                        <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary-600)' }}>
                            {formatCurrency(calculateTotal())}
                        </span>
                    </div>

                    <button className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} onClick={handleSubmit}>
                        Confirmar Venta
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewSale;
