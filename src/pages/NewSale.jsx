import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Plus, Trash, Search } from 'lucide-react';

const NewSale = () => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
    const [discount, setDiscount] = useState(0);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await api.get(`inventory/products/?search=${searchTerm}`);
                setProducts(response.data.results || response.data);
            } catch (error) {
                console.error(error);
            }
        };
        const delayDebounceFn = setTimeout(() => {
            fetchProducts();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

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
        if (qty < 1) return;
        setCart(cart.map(item =>
            item.product === productId ? { ...item, quantity: parseInt(qty) } : item
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
        <div className="new-sale-page">
            <div className="product-selector">
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="product-list">
                    {products.map(p => (
                        <div key={p.id} className="product-card" onClick={() => addToCart(p)}>
                            <div className="p-info">
                                <strong>{p.nombre}</strong>
                                <span>{p.codigo}</span>
                            </div>
                            <div className="p-price">${p.precio_venta}</div>
                            <div className={`stock-badge ${p.bajo_stock ? 'low' : ''}`}>
                                Stock: {p.stock_actual}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="cart-panel">
                <h3>Nueva Venta</h3>
                <div className="cart-items">
                    {cart.map(item => (
                        <div key={item.product} className="cart-item">
                            <div className="item-details">
                                <span>{item.nombre}</span>
                                <small>${item.price}</small>
                            </div>
                            <div className="item-actions">
                                <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={e => updateQuantity(item.product, e.target.value)}
                                    min="1"
                                />
                                <button onClick={() => removeFromCart(item.product)} className="btn-danger-icon">
                                    <Trash size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="cart-summary">
                    <div className="form-group">
                        <label>Método de Pago</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="DEBITO">Débito</option>
                            <option value="CREDITO">Crédito</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                            <option value="MERCADOPAGO">MercadoPago</option>
                            <option value="OTRO">Otro</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Descuento</label>
                        <input
                            type="number"
                            value={discount}
                            onChange={e => setDiscount(e.target.value)}
                        />
                    </div>
                    <div className="total-display">
                        <span>Total:</span>
                        <strong>${calculateTotal().toFixed(2)}</strong>
                    </div>
                    <button className="btn-primary full-width" onClick={handleSubmit}>
                        Confirmar Venta
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewSale;
