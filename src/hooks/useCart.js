import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Hook compartido de carrito para NewSale y Quotes.
 * Centraliza: estado, persistencia en localStorage (con debounce),
 * cálculos de subtotal/total/cartCount y mutadores comunes.
 *
 * @param {object} keys - Claves de localStorage
 * @param {string} keys.cartKey       - Clave para el array del carrito
 * @param {string} keys.discountKey   - Clave para el descuento global
 * @param {string} keys.discountTypeKey - Clave para el tipo de descuento ('$' | '%')
 */
const useCart = ({
    cartKey       = 'cart',
    discountKey   = 'discount',
    discountTypeKey = 'discountType',
} = {}) => {

    // ─── Estado ─────────────────────────────────────────────────────────────────

    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem(cartKey);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [discount, setDiscount] = useState(
        () => localStorage.getItem(discountKey) || ''
    );
    const [discountType, setDiscountType] = useState(
        () => localStorage.getItem(discountTypeKey) || '$'
    );

    // ─── Persistencia ────────────────────────────────────────────────────────────
    // El carrito se persiste inmediatamente (cambio estructural).
    // Descuento con debounce de 500ms — es un campo de texto que cambia en cada tecla.

    useEffect(() => {
        localStorage.setItem(cartKey, JSON.stringify(cart));
    }, [cart, cartKey]);

    useEffect(() => {
        const t = setTimeout(() => {
            localStorage.setItem(discountKey, discount);
            localStorage.setItem(discountTypeKey, discountType);
        }, 500);
        return () => clearTimeout(t);
    }, [discount, discountKey, discountType, discountTypeKey]);

    // ─── Cálculos ────────────────────────────────────────────────────────────────

    const subtotal = useMemo(() => cart.reduce((acc, item) => {
        const baseSub = (parseFloat(item.price) || 0) * item.quantity;
        const dv = parseFloat(item.discountValue);
        const descItem = !item.discountValue || isNaN(dv)
            ? 0
            : item.discountType === '%' ? Math.round(baseSub * (dv / 100)) : Math.round(dv);
        return acc + Math.round(baseSub - descItem);
    }, 0), [cart]);

    const total = useMemo(() => {
        if (!discount) return Math.round(subtotal);
        const dv = parseFloat(discount);
        if (isNaN(dv) || dv <= 0) return Math.round(subtotal);
        const descTotal = discountType === '%' ? Math.round(subtotal * (dv / 100)) : Math.round(dv);
        return Math.max(0, Math.round(subtotal - descTotal));
    }, [subtotal, discount, discountType]);

    const cartCount = useMemo(
        () => cart.reduce((acc, item) => acc + item.quantity, 0),
        [cart]
    );

    // ─── Mutadores ───────────────────────────────────────────────────────────────

    const removeItem = useCallback((id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    }, []);

    const updateItemDiscount = useCallback((id, value, type) => {
        setCart(prev => prev.map(item =>
            item.id === id ? { ...item, discountValue: value, discountType: type } : item
        ));
    }, []);

    /**
     * Agrega un ítem de tipo SERVICIO al carrito.
     * @param {string} description
     * @param {number|string} price
     */
    const addServiceItem = useCallback((description, price) => {
        setCart(prev => [...prev, {
            id: `svc-${Date.now()}`,
            item_type: 'SERVICIO',
            description,
            nombre: `[Servicio] ${description}`,
            price: parseFloat(price) || 0,
            quantity: 1,
            product: null,
            discountType: '$',
            discountValue: '',
        }]);
    }, []);

    /**
     * Vacía el carrito y resetea descuento global.
     */
    const clearCart = useCallback(() => {
        setCart([]);
        setDiscount('');
        setDiscountType('$');
    }, []);

    return {
        // Estado
        cart, setCart,
        discount, setDiscount,
        discountType, setDiscountType,
        // Calculados
        subtotal, total, cartCount,
        // Mutadores
        removeItem, updateItemDiscount, addServiceItem, clearCart,
    };
};

export default useCart;
