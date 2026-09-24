import React from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { formatARS } from '../../utils/format'

const PaymentSection = ({
  isSplitPayment,
  setIsSplitPayment,
  paymentMethod,
  setPaymentMethod,
  splitMethod1,
  setSplitMethod1,
  splitAmount1,
  setSplitAmount1,
  splitMethod2,
  setSplitMethod2,
  splitAmount2,
  setSplitAmount2,
  total,
  amountPaid,
  setAmountPaid,
}) => {
  const a1Num = parseFloat(splitAmount1) || 0
  const a2Num = parseFloat(splitAmount2) || 0
  const splitTotalAssigned = Number((a1Num + a2Num).toFixed(2))
  const splitDiff = Number((total - splitTotalAssigned).toFixed(2))
  const isSplitCovered = Math.abs(splitDiff) <= 0.01 && a1Num > 0 && a2Num > 0

  const pct1 = total > 0 ? Math.min(100, Math.max(0, Math.round((a1Num / total) * 100))) : 50
  const pct2 = total > 0 ? Math.min(100, Math.max(0, 100 - pct1)) : 50

  const paidNum = parseFloat(amountPaid) || 0
  const change = Number((paidNum - total).toFixed(2))
  const isCashCovered = paidNum >= total && total > 0

  // Quick cash bill chips
  const quickBills = [
    { label: 'Exacto', value: total },
    { label: '+$1.000', add: 1000 },
    { label: '+$2.000', add: 2000 },
    { label: '+$5.000', add: 5000 },
    { label: '+$10.000', add: 10000 },
    { label: '+$20.000', add: 20000 },
  ]

  const handleQuickCash = (bill) => {
    if (bill.value !== undefined) {
      setAmountPaid(bill.value > 0 ? bill.value.toString() : '')
    } else if (bill.add !== undefined) {
      const current = parseFloat(amountPaid) || 0
      setAmountPaid((current + bill.add).toString())
    }
  }

  return (
    <div className="pos-payment-box">
      <div className="pos-payment-header">
        <span className="pos-payment-title">Método de pago</span>
        <button
          type="button"
          onClick={() => {
            const next = !isSplitPayment
            setIsSplitPayment(next)
            if (next) {
              setPaymentMethod('MIXTO')
              if (!splitMethod1) setSplitMethod1('EFECTIVO')
              if (!splitMethod2) setSplitMethod2('TRANSFERENCIA')
              if (!splitAmount1 && total > 0) {
                const half = Number((total / 2).toFixed(2))
                setSplitAmount1(half)
                setSplitAmount2(Number((total - half).toFixed(2)))
              }
            } else {
              setPaymentMethod('')
              setSplitMethod1('')
              setSplitAmount1('')
              setSplitMethod2('')
              setSplitAmount2('')
            }
          }}
          className={`pos-payment-toggle ${isSplitPayment ? 'active' : ''}`}
        >
          <ArrowRightLeft size={13} />
          {isSplitPayment ? '2 Métodos (Activo)' : 'Dividir en 2'}
        </button>
      </div>

      {!isSplitPayment ? (
        <div className="pos-single-payment-view">
          <div className="pos-select-wrap">
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value)
                if (e.target.value !== 'EFECTIVO') setAmountPaid('')
              }}
              className="pos-payment-select"
            >
              <option value="" disabled>
                -- Seleccionar método de pago --
              </option>
              <option value="EFECTIVO">💵 Efectivo</option>
              <option value="TRANSFERENCIA">🏦 Transferencia</option>
              <option value="DEBITO">💳 Tarjeta Débito</option>
              <option value="CREDITO">💳 Tarjeta Crédito</option>
              <option value="OTRO">⚡ Otro</option>
            </select>
          </div>

          {paymentMethod === 'EFECTIVO' && (
            <div className="pos-cash-calculator-card">
              <div className="pos-cash-input-row">
                <div className="pos-cash-field">
                  <div className="pos-cash-input-wrap">
                    <span className="pos-currency-symbol">$</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder={total > 0 ? `Paga con... (Total: $${Math.round(total).toLocaleString('es-AR')})` : 'Paga con $'}
                      className="pos-cash-input"
                    />
                    {amountPaid && (
                      <button
                        type="button"
                        onClick={() => setAmountPaid('')}
                        className="pos-cash-clear"
                        title="Limpiar monto"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <div className="pos-cash-vuelto-box">
                  <span className="pos-vuelto-label">
                    {isCashCovered ? 'Vuelto:' : paidNum > 0 ? 'Falta:' : 'Vuelto:'}
                  </span>
                  <div
                    className={`pos-vuelto-amount ${
                      isCashCovered ? 'covered' : paidNum > 0 ? 'lacking' : 'empty'
                    }`}
                  >
                    {isCashCovered
                      ? formatARS(change)
                      : paidNum > 0
                        ? formatARS(total - paidNum)
                        : '$0,00'}
                  </div>
                </div>
              </div>

              {/* Quick Cash Chips en fila horizontal compacta */}
              <div className="pos-quick-bills-grid">
                {quickBills.map((b, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickCash(b)}
                    className="pos-quick-bill-chip"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="pos-split-payment-view">
          {/* Progress / Distribution Bar */}
          <div className="pos-split-progress-box">
            <div className="pos-split-progress-header">
              <span>Distribución del pago</span>
              <span
                key={isSplitCovered ? 'covered' : splitDiff > 0 ? 'lacking' : 'excess'}
                className={`pos-split-status-badge ${
                  isSplitCovered ? 'covered' : splitDiff > 0 ? 'lacking' : 'excess'
                }`}
              >
                {isSplitCovered
                  ? '✓ 100% Cubierto'
                  : splitDiff > 0
                    ? `Falta ${formatARS(splitDiff)}`
                    : `Excede ${formatARS(Math.abs(splitDiff))}`}
              </span>
            </div>
            <div className="pos-split-progress-track">
              <div className="pos-split-fill-1" style={{ width: `${pct1}%` }} />
              <div className="pos-split-fill-2" style={{ width: `${pct2}%` }} />
            </div>
          </div>

          {/* Método 1 */}
          <div className="pos-split-card pos-split-card-1">
            <div className="pos-split-card-header">
              <span className="pos-split-card-title">1° Método ({pct1}%)</span>
              <button
                type="button"
                onClick={() => {
                  const half = Number((total / 2).toFixed(2))
                  setSplitAmount1(half)
                  setSplitAmount2(Number((total - half).toFixed(2)))
                }}
                className="pos-split-action-btn"
              >
                Dividir 50%
              </button>
            </div>
            <div className="pos-split-card-grid">
              <select
                value={splitMethod1}
                onChange={(e) => setSplitMethod1(e.target.value)}
                className="pos-split-select"
              >
                <option value="" disabled>
                  Seleccione método
                </option>
                <option value="EFECTIVO">💵 Efectivo</option>
                <option value="TRANSFERENCIA">🏦 Transferencia</option>
                <option value="DEBITO">💳 Tarjeta Débito</option>
                <option value="CREDITO">💳 Tarjeta Crédito</option>
                <option value="OTRO">⚡ Otro</option>
              </select>
              <div className="pos-split-amount-wrap">
                <span className="pos-currency-symbol">$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={splitAmount1}
                  onChange={(e) => {
                    const val = e.target.value
                    setSplitAmount1(val)
                    const n = parseFloat(val) || 0
                    if (n <= total) {
                      setSplitAmount2(Math.max(0, Number((total - n).toFixed(2))))
                    }
                  }}
                  className="pos-split-amount-input"
                />
              </div>
            </div>
          </div>

          {/* Método 2 */}
          <div className="pos-split-card pos-split-card-2">
            <div className="pos-split-card-header">
              <span className="pos-split-card-title">2° Método ({pct2}%)</span>
              {splitDiff !== 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const m1 = parseFloat(splitAmount1) || 0
                    setSplitAmount2(Math.max(0, Number((total - m1).toFixed(2))))
                  }}
                  className="pos-split-action-btn"
                >
                  Completar restante
                </button>
              )}
            </div>
            <div className="pos-split-card-grid">
              <select
                value={splitMethod2}
                onChange={(e) => setSplitMethod2(e.target.value)}
                className="pos-split-select"
              >
                <option value="" disabled>
                  Seleccione método
                </option>
                <option value="TRANSFERENCIA">🏦 Transferencia</option>
                <option value="EFECTIVO">💵 Efectivo</option>
                <option value="DEBITO">💳 Tarjeta Débito</option>
                <option value="CREDITO">💳 Tarjeta Crédito</option>
                <option value="OTRO">⚡ Otro</option>
              </select>
              <div className="pos-split-amount-wrap">
                <span className="pos-currency-symbol">$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={splitAmount2}
                  onChange={(e) => setSplitAmount2(e.target.value)}
                  className="pos-split-amount-input"
                />
              </div>
            </div>
          </div>

          {/* Resumen Total Asignado */}
          <div className={`pos-split-total-banner ${isSplitCovered ? 'covered' : 'lacking'}`}>
            <span>Total asignado:</span>
            <span className="pos-split-total-value">
              {formatARS(splitTotalAssigned)} / {formatARS(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentSection
