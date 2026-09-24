import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useCart from '../hooks/useCart'

describe('Hook useCart (Lógica de Carrito y Cálculos)', () => {
  it('inicializa con carrito vacío y valores por defecto', () => {
    const { result } = renderHook(() =>
      useCart({ cartKey: 'test_cart', discountKey: 'test_disc', discountTypeKey: 'test_type' }),
    )

    expect(result.current.cart).toEqual([])
    expect(result.current.subtotal).toBe(0)
    expect(result.current.total).toBe(0)
    expect(result.current.cartCount).toBe(0)
    expect(result.current.discount).toBe('')
    expect(result.current.discountType).toBe('$')
  })

  it('permite agregar un servicio y calcula subtotales', () => {
    const { result } = renderHook(() =>
      useCart({ cartKey: 'test_cart_2', discountKey: 'test_disc_2', discountTypeKey: 'test_type_2' }),
    )

    act(() => {
      result.current.addServiceItem('Instalación de Red', 5000)
    })

    expect(result.current.cart.length).toBe(1)
    expect(result.current.cart[0].item_type).toBe('SERVICIO')
    expect(result.current.cart[0].price).toBe(5000)
    expect(result.current.subtotal).toBe(5000)
    expect(result.current.total).toBe(5000)
    expect(result.current.cartCount).toBe(1)
  })

  it('aplica descuento fijo ($) por ítem', () => {
    const { result } = renderHook(() =>
      useCart({ cartKey: 'test_cart_3', discountKey: 'test_disc_3', discountTypeKey: 'test_type_3' }),
    )

    act(() => {
      result.current.setCart([
        {
          id: 1,
          nombre: 'Mouse Inalámbrico',
          price: 2000,
          quantity: 2,
          discountValue: '500',
          discountType: '$',
        },
      ])
    })

    // Subtotal base: 2000 * 2 = 4000. Descuento: 500. Total = 3500.
    expect(result.current.subtotal).toBe(3500)
    expect(result.current.total).toBe(3500)
    expect(result.current.cartCount).toBe(2)
  })

  it('aplica descuento porcentual (%) por ítem', () => {
    const { result } = renderHook(() =>
      useCart({ cartKey: 'test_cart_4', discountKey: 'test_disc_4', discountTypeKey: 'test_type_4' }),
    )

    act(() => {
      result.current.setCart([
        {
          id: 2,
          nombre: 'Teclado Mecánico',
          price: 10000,
          quantity: 1,
          discountValue: '10',
          discountType: '%',
        },
      ])
    })

    // Subtotal base: 10000. Descuento 10% = 1000. Subtotal neto = 9000.
    expect(result.current.subtotal).toBe(9000)
    expect(result.current.total).toBe(9000)
  })

  it('aplica descuento global acumulativo (porcentaje sobre subtotal neto)', () => {
    const { result } = renderHook(() =>
      useCart({ cartKey: 'test_cart_5', discountKey: 'test_disc_5', discountTypeKey: 'test_type_5' }),
    )

    act(() => {
      result.current.setCart([
        {
          id: 3,
          nombre: 'Monitor 24',
          price: 50000,
          quantity: 1,
          discountValue: '',
          discountType: '$',
        },
      ])
      result.current.setDiscount('10')
      result.current.setDiscountType('%')
    })

    // Subtotal: 50000. Descuento global 10% = 5000. Total = 45000.
    expect(result.current.subtotal).toBe(50000)
    expect(result.current.total).toBe(45000)
  })

  it('elimina ítems y vacía el carrito correctamente', () => {
    const { result } = renderHook(() =>
      useCart({ cartKey: 'test_cart_6', discountKey: 'test_disc_6', discountTypeKey: 'test_type_6' }),
    )

    act(() => {
      result.current.setCart([
        { id: 'item-1', nombre: 'Cable HDMI', price: 1500, quantity: 1 },
        { id: 'item-2', nombre: 'Adaptador USB', price: 1000, quantity: 1 },
      ])
    })

    expect(result.current.cart.length).toBe(2)

    act(() => {
      result.current.removeItem('item-1')
    })

    expect(result.current.cart.length).toBe(1)
    expect(result.current.cart[0].id).toBe('item-2')
    expect(result.current.subtotal).toBe(1000)

    act(() => {
      result.current.clearCart()
    })

    expect(result.current.cart).toEqual([])
    expect(result.current.subtotal).toBe(0)
    expect(result.current.total).toBe(0)
    expect(result.current.discount).toBe('')
  })
})
