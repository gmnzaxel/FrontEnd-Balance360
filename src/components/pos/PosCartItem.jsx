import React from 'react'
import { Trash2 } from 'lucide-react'
import { formatARS } from '../../utils/format'

const PosCartItem = React.memo(
  ({
    item,
    onRemove,
    onUpdateQuantity,
    onUpdateDiscount,
    onUpdatePrice,
    editablePrice = false,
    isClearing,
  }) => {
    const qty = parseInt(item.quantity, 10) || 1
    const price = parseFloat(item.price) || 0
    const sub = price * qty
    const dv = parseFloat(item.discountValue)
    const discountAmount =
      !item.discountValue || isNaN(dv)
        ? 0
        : item.discountType === '%'
          ? sub * (dv / 100)
          : dv
    const itemTotal = Math.max(0, sub - discountAmount)

    return (
      <div className={`pos-cart-item ${isClearing ? 'clearing' : ''}`}>
        <div className="pos-item-header">
          <div className="pos-item-info">
            <span className="pos-item-name" title={item.nombre}>
              {item.nombre}
            </span>
            {qty > 1 && (
              <span className="pos-item-unit-tag">
                ({formatARS(price)} c/u)
              </span>
            )}
            {item.item_type === 'SERVICIO' && (
              <span className="pos-item-badge">Servicio</span>
            )}
          </div>
          <button
            type="button"
            className="pos-item-delete"
            onClick={() => onRemove(item.id)}
            aria-label="Eliminar ítem"
            title="Eliminar"
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div className="pos-item-controls-row">
          {/* Stepper de cantidad */}
          <div className="pos-stepper-wrap">
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.id, qty - 1)}
              disabled={qty <= 1}
              className="pos-stepper-btn"
              aria-label="Disminuir cantidad"
            >
              -
            </button>
            <input
              type="number"
              value={item.quantity}
              onChange={(e) =>
                onUpdateQuantity(
                  item.id,
                  e.target.value === '' ? '' : parseInt(e.target.value, 10),
                )
              }
              className="pos-stepper-input"
              aria-label="Cantidad"
            />
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.id, qty + 1)}
              className="pos-stepper-btn"
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>

          {/* Precio unitario editable (para cotizaciones / presupuestos) */}
          {editablePrice && onUpdatePrice && (
            <div className="quote-item-price-edit-wrap" title="Precio unitario (haga clic para editar)">
              <span className="quote-price-symbol">$</span>
              <input
                type="number"
                value={item.price}
                onChange={(e) => onUpdatePrice(item.id, e.target.value)}
                className="quote-price-input"
                placeholder="0.00"
                aria-label="Precio unitario"
              />
            </div>
          )}

          {/* Descuento unitario */}
          <div className="pos-item-discount-wrap">
            <span className="pos-discount-label" title="Imp. Bonificación / Descuento unitario">Bonif:</span>
            <input
              type="number"
              className="pos-discount-input"
              value={item.discountValue ?? ''}
              style={{
                width: `${Math.max(2.2, (String(item.discountValue ?? '').length || 1) + 0.4)}ch`,
              }}
              onChange={(e) =>
                onUpdateDiscount(item.id, e.target.value, item.discountType || '$')
              }
              placeholder="0"
              min="0"
              step="any"
              aria-label="Descuento unitario"
            />
            <button
              type="button"
              className="pos-discount-type-btn"
              onClick={() =>
                onUpdateDiscount(
                  item.id,
                  item.discountValue || '',
                  (item.discountType || '$') === '$' ? '%' : '$',
                )
              }
              title="Cambiar tipo de descuento ($ / %)"
              aria-label="Tipo de descuento"
            >
              {item.discountType || '$'}
            </button>
          </div>

          {/* Subtotal */}
          <div className="pos-item-price-wrap">
            {discountAmount > 0 && (
              <span className="pos-item-original-price" title="Precio original sin descuento">
                {formatARS(sub)}
              </span>
            )}
            <span className="pos-item-subtotal">{formatARS(itemTotal)}</span>
          </div>
        </div>
      </div>
    )
  },
)

PosCartItem.displayName = 'PosCartItem'

export default PosCartItem
