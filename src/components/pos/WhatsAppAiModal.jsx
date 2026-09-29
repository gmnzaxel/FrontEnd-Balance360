import React, { useState } from 'react'
import {
  Sparkles,
  MessageSquareText,
  ArrowRight,
  CheckCircle2,
  Trash2,
  ClipboardPaste,
  Calendar,
  AlertTriangle,
  Layers,
  Plus,
  Minus,
} from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { getErrorMessage } from '../../utils/errorUtils'
import { formatARS } from '../../utils/format'

export default function WhatsAppAiModal({ isOpen, onClose, onApplySale, currentCartCount = 0 }) {
  const [message, setMessage] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('EFECTIVO')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [cartMode, setCartMode] = useState('replace') // 'replace' | 'append'

  if (!isOpen) return null

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText()
        if (text) {
          setMessage(text)
          toast.info('Texto pegado desde el portapapeles')
        }
      }
    } catch {
      // Ignorar si el navegador bloquea lectura de portapapeles
    }
  }

  const handleAnalyze = async () => {
    const trimmed = message.trim()
    if (!trimmed) {
      toast.warning('Por favor escribe o pega el mensaje de la venta')
      return
    }

    setAnalyzing(true)
    setResult(null)
    try {
      const response = await api.post('sales/sales/parse-whatsapp/', { message: trimmed })
      const data = response.data
      setResult(data)
      setSelectedPaymentMethod(data.payment_method || 'EFECTIVO')
      if (data.detected_date) {
        setSelectedDate(data.detected_date)
      }
      toast.success('Mensaje interpretado con éxito por la IA')
    } catch (error) {
      console.error(error)
      toast.error(getErrorMessage(error) || 'Error al procesar el mensaje con IA')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleItemQuantityChange = (index, newQty) => {
    if (!result || !result.items) return
    const q = Math.max(1, parseInt(newQty, 10) || 1)
    const updatedItems = [...result.items]
    const item = { ...updatedItems[index], quantity: q }
    item.line_total = item.quantity * item.price - (item.discount || 0)
    updatedItems[index] = item

    const newSubtotal = updatedItems.reduce((acc, it) => acc + (it.line_total || it.price * it.quantity), 0)
    setResult({
      ...result,
      items: updatedItems,
      total: Math.max(0, newSubtotal - (result.discount || 0)),
    })
  }

  const handleStepQuantity = (index, delta) => {
    if (!result || !result.items) return
    const currentQty = parseInt(result.items[index]?.quantity, 10) || 1
    const targetQty = Math.max(1, currentQty + delta)
    handleItemQuantityChange(index, targetQty)
  }

  const handleItemPriceChange = (index, newPrice) => {
    if (!result || !result.items) return
    const p = Math.max(0, parseFloat(newPrice) || 0)
    const updatedItems = [...result.items]
    const item = { ...updatedItems[index], price: p }
    item.line_total = item.quantity * item.price - (item.discount || 0)
    updatedItems[index] = item

    const newSubtotal = updatedItems.reduce((acc, it) => acc + (it.line_total || it.price * it.quantity), 0)
    setResult({
      ...result,
      items: updatedItems,
      total: Math.max(0, newSubtotal - (result.discount || 0)),
    })
  }

  const handleRemoveItem = (index) => {
    if (!result || !result.items) return
    const updatedItems = result.items.filter((_, idx) => idx !== index)
    const newSubtotal = updatedItems.reduce((acc, it) => acc + (it.line_total || it.price * it.quantity), 0)
    setResult({
      ...result,
      items: updatedItems,
      total: Math.max(0, newSubtotal - (result.discount || 0)),
    })
  }

  const handleConfirmApply = () => {
    if (!result || !result.items || !result.items.length) {
      toast.warning('No hay artículos detectados para cargar')
      return
    }

    onApplySale(
      {
        ...result,
        payment_method: selectedPaymentMethod,
        detected_date: selectedDate,
      },
      cartMode,
    )
    handleClose()
  }

  const handleClose = () => {
    setMessage('')
    setResult(null)
    setAnalyzing(false)
    setCartMode('replace')
    onClose()
  }

  return (
    <Modal
      size="lg"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc',
            }}
          >
            <MessageSquareText size={18} />
          </div>
          <span style={{ fontWeight: 700 }}>Cargar Venta por Mensaje</span>
          <span
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            <Sparkles size={11} /> IA
          </span>
        </div>
      }
      onClose={handleClose}
      footer={
        <div className="whatsapp-modal-footer-wrapper">
          <Button variant="ghost" onClick={handleClose} disabled={analyzing}>
            Cancelar
          </Button>

          {result ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => setResult(null)}>
                Modificar Mensaje
              </Button>
              <Button variant="primary" onClick={handleConfirmApply} icon={<ArrowRight size={16} />}>
                {cartMode === 'append' && currentCartCount > 0 ? 'Sumar al Carrito' : 'Cargar al Carrito del POS'}
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              onClick={handleAnalyze}
              disabled={analyzing || !message.trim()}
              icon={<Sparkles size={16} />}
            >
              {analyzing ? 'Analizando con IA…' : 'Analizar Mensaje'}
            </Button>
          )}
        </div>
      }
    >
      <div className="whatsapp-modal-body">
        {!result ? (
          <>
            <div className="whatsapp-banner-info">
              Pegá el texto o mensaje de la venta (chat, notas o transcripción). La IA identificará en el catálogo productos, servicios, cantidades, precios, fecha y método de pago automáticamente.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Mensaje o texto de la venta:
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary-600, #4f46e5)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 6px',
                  }}
                >
                  <ClipboardPaste size={14} /> Pegar portapapeles
                </button>
              </div>

              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder='Escribí o pegá el mensaje aquí (ej: "2 cerraduras 852 y cerrojo 504 más copia de cada uno, 115.000 en transferencia")'
                className="whatsapp-prompt-textarea"
                disabled={analyzing}
                autoFocus
              />
            </div>
          </>
        ) : (
          /* Vista de Previsualización del Resultado de la IA */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Banner resumen de IA */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <CheckCircle2 size={18} style={{ color: '#8b5cf6', marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {result.summary || 'Interpretación completada con éxito'}
                </div>
                {result.notes && (
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {result.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Opciones de Carrito si ya hay ítems cargados */}
            {currentCartCount > 0 && (
              <div
                style={{
                  background: 'var(--amber-50, #fffbeb)',
                  border: '1px solid var(--amber-200, #fef3c7)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <Layers size={15} /> El carrito tiene {currentCartCount}{' '}
                  {currentCartCount === 1 ? 'artículo cargado' : 'artículos cargados'}:
                </span>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#78350f' }}>
                    <input
                      type="radio"
                      name="cartMode"
                      value="replace"
                      checked={cartMode === 'replace'}
                      onChange={() => setCartMode('replace')}
                    />
                    Reemplazar
                  </label>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#78350f' }}>
                    <input
                      type="radio"
                      name="cartMode"
                      value="append"
                      checked={cartMode === 'append'}
                      onChange={() => setCartMode('append')}
                    />
                    Sumar al carrito
                  </label>
                </div>
              </div>
            )}

            {/* Encabezado de la lista */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Artículos detectados ({result.items.length})
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Podes editar cantidades o precios
              </span>
            </div>

            {/* VISTA DESKTOP: Tabla refinada con scroll adaptativo */}
            <div className="whatsapp-table-desktop whatsapp-table-scroll-container">
              <table className="whatsapp-desktop-table">
                <thead>
                  <tr>
                    <th className="whatsapp-th-qty">Cant.</th>
                    <th className="whatsapp-th-detail">Detalle</th>
                    <th className="whatsapp-th-price">P. Unit</th>
                    <th className="whatsapp-th-subtotal">Subtotal</th>
                    <th className="whatsapp-th-action"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((it, idx) => (
                    <tr key={idx} className="whatsapp-table-row">
                      <td className="whatsapp-td-qty">
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => handleItemQuantityChange(idx, e.target.value)}
                          className="whatsapp-qty-input"
                        />
                      </td>
                      <td className="whatsapp-td-detail">
                        <div className="whatsapp-item-detail-stack">
                          <div className="whatsapp-item-name-row">
                            <span
                              className={`whatsapp-item-badge ${it.item_type === 'SERVICIO' ? 'service' : 'product'
                                }`}
                            >
                              {it.item_type}
                            </span>
                            <span className="whatsapp-item-name-text">{it.nombre}</span>
                          </div>
                          {it.stock_actual !== undefined && it.item_type === 'PRODUCTO' && (
                            <span
                              className={`whatsapp-stock-indicator ${it.stock_actual <= 0 ? 'critical' : ''
                                }`}
                            >
                              {it.stock_actual <= 0 && <AlertTriangle size={12} />}
                              Stock en sistema: {it.stock_actual} un.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whatsapp-td-price">
                        <input
                          type="number"
                          step="any"
                          value={it.price}
                          onChange={(e) => handleItemPriceChange(idx, e.target.value)}
                          className="whatsapp-price-input"
                        />
                      </td>
                      <td className="whatsapp-td-subtotal">
                        {formatARS(it.line_total || it.price * it.quantity)}
                      </td>
                      <td className="whatsapp-td-action">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="whatsapp-item-delete-btn"
                          title="Eliminar este ítem"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* VISTA MOBILE: Tarjetas táctiles adaptadas a celulares */}
            <div className="whatsapp-cards-mobile">
              {result.items.map((it, idx) => (
                <div key={idx} className="whatsapp-mobile-card">
                  <div className="whatsapp-card-head">
                    <div className="whatsapp-card-title">
                      <span
                        className={`whatsapp-item-badge ${it.item_type === 'SERVICIO' ? 'service' : 'product'
                          }`}
                      >
                        {it.item_type}
                      </span>
                      <span>{it.nombre}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        padding: '4px',
                        cursor: 'pointer',
                      }}
                      title="Eliminar ítem"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {it.stock_actual !== undefined && it.item_type === 'PRODUCTO' && (
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: it.stock_actual <= 0 ? '#dc2626' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {it.stock_actual <= 0 && <AlertTriangle size={12} />}
                      Stock en sistema: {it.stock_actual} un.
                    </div>
                  )}

                  <div className="whatsapp-card-controls">
                    {/* Stepper táctil grande */}
                    <div className="whatsapp-stepper">
                      <button
                        type="button"
                        className="whatsapp-stepper-btn"
                        onClick={() => handleStepQuantity(idx, -1)}
                        aria-label="Restar unidad"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        className="whatsapp-stepper-input"
                        value={it.quantity}
                        onChange={(e) => handleItemQuantityChange(idx, e.target.value)}
                      />
                      <button
                        type="button"
                        className="whatsapp-stepper-btn"
                        onClick={() => handleStepQuantity(idx, 1)}
                        aria-label="Sumar unidad"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="whatsapp-price-box">
                      <span>$</span>
                      <input
                        type="number"
                        step="any"
                        className="whatsapp-mobile-price-input"
                        value={it.price}
                        onChange={(e) => handleItemPriceChange(idx, e.target.value)}
                      />
                    </div>

                    <div className="whatsapp-card-subtotal">
                      {formatARS(it.line_total || it.price * it.quantity)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Panel de Método de Pago, Fecha y Total */}
            <div className="whatsapp-summary-panel">
              <div className="whatsapp-summary-meta">
                <div>
                  <label className="whatsapp-meta-label">
                    Método de Pago:
                  </label>
                  <select
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="whatsapp-meta-select"
                  >
                    <option value="TRANSFERENCIA">Transferencia Bancaria / MP</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="DEBITO">Tarjeta de Débito</option>
                    <option value="CREDITO">Tarjeta de Crédito</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="whatsapp-meta-label">
                    <Calendar size={13} /> Fecha de la Venta:
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="whatsapp-meta-date"
                  />
                </div>
              </div>

              <div className="whatsapp-summary-totals">
                {result.discount > 0 && (
                  <span className="whatsapp-discount-badge">
                    Descuento: -{formatARS(result.discount)}
                  </span>
                )}
                <span className="whatsapp-total-label">
                  Total a Facturar:
                </span>
                <span className="whatsapp-total-amount">
                  {formatARS(result.total)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
