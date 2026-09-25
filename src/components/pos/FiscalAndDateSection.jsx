import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react'
import { salesService } from '../../services/salesService'
import { toast } from 'react-toastify'

// Cálculo de dígito verificador y CUIT completo a partir de DNI (7 u 8 dígitos)
function computeCuitFromDni(dniDigits, prefix = '20') {
  const clean = String(dniDigits || '').replace(/\D/g, '').padStart(8, '0')
  if (clean.length !== 8) return null

  let basePrefix = prefix
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  let base = `${basePrefix}${clean}`
  let sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(base[i], 10) * multipliers[i]
  }
  let mod = sum % 11
  let verif = 11 - mod
  if (verif === 11) {
    verif = 0
  } else if (verif === 10) {
    basePrefix = '23'
    base = `${basePrefix}${clean}`
    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(base[i], 10) * multipliers[i]
    }
    mod = sum % 11
    verif = 11 - mod
    if (verif === 11) verif = 0
  }
  return `${basePrefix}${clean}${verif}`
}

function formatCuitDisplay(cuit) {
  if (!cuit || cuit.length !== 11) return cuit
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`
}

const FiscalAndDateSection = ({
  isArcaInvoice,
  setIsArcaInvoice,
  voucherType,
  setVoucherType,
  customerIvaCondition = 'CONSUMIDOR_FINAL',
  setCustomerIvaCondition,
  customerDocType,
  setCustomerDocType,
  customerDocNumber,
  setCustomerDocNumber,
  customerName,
  setCustomerName,
  customerAddress,
  setCustomerAddress,
}) => {
  const [isLookingUpCuit, setIsLookingUpCuit] = useState(false)
  const [cuitLookupSuccess, setCuitLookupSuccess] = useState(false)
  const [showAddressField, setShowAddressField] = useState(Boolean(customerAddress))
  const lastLookedUpCuitRef = useRef('')

  // Sugerencias de CUIT si el usuario escribe un DNI (7 u 8 dígitos)
  const cleanDoc = String(customerDocNumber || '').replace(/\D/g, '')
  const suggestedCuits = useMemo(() => {
    if (cleanDoc.length === 7 || cleanDoc.length === 8) {
      const c20 = computeCuitFromDni(cleanDoc, '20')
      const c27 = computeCuitFromDni(cleanDoc, '27')
      return { cuit20: c20, cuit27: c27 }
    }
    return null
  }, [cleanDoc])

  const handleApplyCuit = (cuit) => {
    if (!cuit) return
    setCustomerDocType('80')
    setCustomerDocNumber(cuit)
  }

  // Búsqueda automática de Razón Social al ingresar 11 dígitos de CUIT
  useEffect(() => {
    if (cleanDoc.length === 11 && cleanDoc !== lastLookedUpCuitRef.current) {
      lastLookedUpCuitRef.current = cleanDoc
      const timer = setTimeout(async () => {
        setIsLookingUpCuit(true)
        setCuitLookupSuccess(false)
        try {
          const res = await salesService.lookupCuit(cleanDoc)
          if (res.found && res.name) {
            setCustomerName(res.name)
            if (res.address && !customerAddress) {
              setCustomerAddress(res.address)
              setShowAddressField(true)
            }
            if (res.iva_condition && setCustomerIvaCondition) {
              setCustomerIvaCondition(res.iva_condition)
            }
            setCuitLookupSuccess(true)
            toast.success(`ARCA: ${res.name}`, { toastId: 'cuit-lookup', autoClose: 2000 })
          } else {
            setCuitLookupSuccess(false)
          }
        } catch (err) {
          console.warn('Lookup CUIT error:', err)
        } finally {
          setIsLookingUpCuit(false)
        }
      }, 350)
      return () => clearTimeout(timer)
    } else if (cleanDoc.length !== 11) {
      setCuitLookupSuccess(false)
    }
  }, [cleanDoc, customerAddress, setCustomerAddress, setCustomerIvaCondition, setCustomerName])

  return (
    <div>
      {/* ─── Bloque Facturación ARCA (Limpio, compacto y elegante) ───────── */}
      <div className={`pos-cfg-card ${isArcaInvoice ? 'active' : ''}`}>
        <div className="pos-cfg-header">
          <div className="pos-cfg-title-group">
            <div className="pos-cfg-icon-box">
              <ShieldCheck size={16} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="pos-cfg-title">Facturación ARCA</span>
              <span className="pos-cfg-badge">Oficial</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsArcaInvoice(!isArcaInvoice)}
            className={`pos-cfg-switch ${isArcaInvoice ? 'active' : ''}`}
            aria-label="Alternar facturación ARCA"
          >
            <span className="pos-cfg-switch-dot" />
            {isArcaInvoice ? 'Activada' : 'Desactivada'}
          </button>
        </div>

        {isArcaInvoice && (
          <div className="pos-cfg-body">
            {/* Selector de Comprobante (C / B / A) */}
            <div className="pos-segmented-control">
              <button
                type="button"
                className={`pos-segmented-btn ${voucherType === 11 ? 'active' : ''}`}
                onClick={() => {
                  setVoucherType(11)
                }}
              >
                Factura C
              </button>
              <button
                type="button"
                className={`pos-segmented-btn ${voucherType === 6 ? 'active' : ''}`}
                onClick={() => {
                  setVoucherType(6)
                }}
              >
                Factura B
              </button>
              <button
                type="button"
                className={`pos-segmented-btn ${voucherType === 1 ? 'active' : ''}`}
                onClick={() => {
                  setVoucherType(1)
                  setCustomerDocType('80')
                  if (setCustomerIvaCondition && (!customerIvaCondition || customerIvaCondition === 'CONSUMIDOR_FINAL')) {
                    setCustomerIvaCondition('RESPONSABLE_INSCRIPTO')
                  }
                }}
              >
                Factura A
              </button>
            </div>

            {/* Documento (DNI o CUIT) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span className="pos-cfg-label">
                  {voucherType === 1
                    ? 'CUIT Receptor (Obligatorio)'
                    : customerDocType === '80'
                    ? 'CUIT del Cliente'
                    : 'DNI o CUIT (Opcional)'}
                </span>
                {isLookingUpCuit && (
                  <span style={{ fontSize: '0.65rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Buscando CUIT...
                  </span>
                )}
                {cuitLookupSuccess && (
                  <span style={{ fontSize: '0.65rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                    <CheckCircle2 size={11} /> CUIT verificado
                  </span>
                )}
              </div>
              <input
                type="text"
                className="pos-cfg-input"
                placeholder={voucherType === 1 ? 'Ej: 30712345678 (11 dígitos)' : 'Consumidor Final (o número)'}
                value={customerDocNumber}
                onChange={(e) => {
                  const val = e.target.value
                  setCustomerDocNumber(val)
                  const clean = val.replace(/\D/g, '')
                  if (clean.length === 11) {
                    setCustomerDocType('80') // CUIT
                  } else if (clean.length <= 8 && voucherType !== 1) {
                    setCustomerDocType('96') // DNI
                  }
                }}
              />
            </div>

            {/* Sugerencia CUIT discreta si ingresó un DNI */}
            {suggestedCuits && voucherType !== 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#94a3b8' }}>
                <span>¿Convertir a CUIT?</span>
                <button
                  type="button"
                  onClick={() => handleApplyCuit(suggestedCuits.cuit20)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#818cf8',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.68rem',
                    textDecoration: 'underline',
                  }}
                  title="Aplicar CUIT 20"
                >
                  {formatCuitDisplay(suggestedCuits.cuit20)}
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => handleApplyCuit(suggestedCuits.cuit27)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#818cf8',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.68rem',
                    textDecoration: 'underline',
                  }}
                  title="Aplicar CUIT 27"
                >
                  {formatCuitDisplay(suggestedCuits.cuit27)}
                </button>
              </div>
            )}

            {/* Condición frente al IVA (Seleccionable siempre para cualquier comprobante) */}
            <div>
              <span className="pos-cfg-label">Condición frente al IVA del Cliente</span>
              <select
                className="pos-cfg-input"
                value={customerIvaCondition}
                onChange={(e) => setCustomerIvaCondition && setCustomerIvaCondition(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                <option value="MONOTRIBUTO">Responsable Monotributo</option>
                <option value="RESPONSABLE_INSCRIPTO">IVA Responsable Inscripto</option>
                <option value="EXENTO">IVA Exento</option>
              </select>
            </div>

            {/* Razón Social / Nombre: SIEMPRE visible para que el usuario pueda escribirlo o editarlo */}
            <div>
              <span className="pos-cfg-label">
                {voucherType === 1 ? 'Razón Social (Obligatoria)' : 'Nombre / Razón Social'}
              </span>
              <input
                type="text"
                className="pos-cfg-input"
                placeholder={voucherType === 1 ? 'Nombre de la empresa o titular' : 'Ej: Juan Pérez (o Consumidor Final)'}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            {/* Domicilio Comercial colapsable / sutil */}
            {voucherType === 1 && (
              <div>
                {!showAddressField ? (
                  <button
                    type="button"
                    onClick={() => setShowAddressField(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary, #94a3b8)',
                      fontSize: '0.68rem',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    + Agregar domicilio fiscal (opcional)
                  </button>
                ) : (
                  <div>
                    <span className="pos-cfg-label">Domicilio fiscal (opcional)</span>
                    <input
                      type="text"
                      className="pos-cfg-input"
                      placeholder="Calle y número, localidad"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default FiscalAndDateSection
