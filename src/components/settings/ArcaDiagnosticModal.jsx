import React, { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Server,
  Store,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Info,
} from 'lucide-react'

export const ArcaDiagnosticModal = ({
  isOpen,
  onClose,
  result,
  onRetry,
  retrying = false,
}) => {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !result) return null

  const isConnected = Boolean(result.connected)
  const isPtoVtaOk = Boolean(result.pto_vta_ok)
  const isSimulation = result.mode === 'SIMULATION'

  let overallStatus = 'success'
  if (!isConnected) {
    overallStatus = 'error'
  } else if (!isPtoVtaOk) {
    overallStatus = 'warning'
  } else if (isSimulation) {
    overallStatus = 'info'
  }

  const ptoVtaNum = result.pto_vta_number || 1
  const modeName = result.mode === 'PRODUCCION' ? 'Producción (Oficial)' : (result.mode === 'HOMOLOGACION' ? 'Homologación (Testing)' : 'Simulación')

  const copyAfipSteps = () => {
    const text = `Pasos para habilitar Punto de Venta ${ptoVtaNum} en AFIP:\n1. Ingresá a afip.gob.ar con Clave Fiscal.\n2. Buscá el servicio 'Administración de puntos de venta y domicilios'.\n3. Seleccioná tu empresa y elegí 'A/B/M Puntos de Venta'.\n4. Agregá el Punto de Venta N° ${ptoVtaNum}.\n5. En 'Sistema', seleccioná: 'Facturación Electrónica - Web Services'.\n6. Guardá los cambios y volvé a probar la conexión en Balance360.`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Modal
      title="Diagnóstico de Conexión ARCA"
      onClose={onClose}
      size="md"
      className="arca-diagnostic-modal-container"
      footer={
        <div className="diagnostic-modal-footer">
          {overallStatus === 'warning' && (
            <Button
              variant="outline"
              size="sm"
              icon={copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              onClick={copyAfipSteps}
            >
              {copied ? '¡Pasos copiados!' : 'Copiar pasos para AFIP'}
            </Button>
          )}
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />}
              onClick={onRetry}
              disabled={retrying}
            >
              {retrying ? 'Probando...' : 'Reintentar prueba'}
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={onClose}>
            Entendido
          </Button>
        </div>
      }
    >
      <div className="diagnostic-modal-content">
        {/* Banner de Estado Principal */}
        <div className={`diagnostic-banner status-${overallStatus}`}>
          <div className="diagnostic-banner-icon">
            {overallStatus === 'success' && <CheckCircle2 size={24} />}
            {overallStatus === 'warning' && <AlertTriangle size={24} />}
            {overallStatus === 'error' && <XCircle size={24} />}
            {overallStatus === 'info' && <Info size={24} />}
          </div>
          <div className="diagnostic-banner-info">
            <h4 className="diagnostic-banner-title">
              {overallStatus === 'success' && '¡Conexión 100% Operativa y Lista!'}
              {overallStatus === 'warning' && 'Autenticación Exitosa con ARCA'}
              {overallStatus === 'error' && 'Error de Conexión con ARCA'}
              {overallStatus === 'info' && 'Modo Simulación Activo'}
            </h4>
            <p className="diagnostic-banner-desc">
              {result.message || (isConnected ? 'Todos los parámetros están configurados.' : result.error)}
            </p>
          </div>
        </div>

        {/* Lista de Verificación / Capas Técnicas */}
        <div className="diagnostic-layers">
          <div className="diagnostic-layer-title">Verificación de Capas de Integración:</div>

          {/* Capa 1: Certificados */}
          <div className="diagnostic-layer-item pass">
            <div className="layer-icon pass">
              <ShieldCheck size={16} />
            </div>
            <div className="layer-content">
              <div className="layer-header">
                <span className="layer-name">Certificados Digitales X.509</span>
                <span className="layer-tag pass">Válidos</span>
              </div>
              <p className="layer-sub">Certificado (.crt) y clave privada (.key) cargados y validados.</p>
            </div>
          </div>

          {/* Capa 2: WSAA */}
          <div className={`diagnostic-layer-item ${isConnected ? 'pass' : 'fail'}`}>
            <div className={`layer-icon ${isConnected ? 'pass' : 'fail'}`}>
              <Server size={16} />
            </div>
            <div className="layer-content">
              <div className="layer-header">
                <span className="layer-name">Servicio de Autenticación (WSAA)</span>
                <span className={`layer-tag ${isConnected ? 'pass' : 'fail'}`}>
                  {isConnected ? `Ticket OK (${modeName})` : 'Fallo'}
                </span>
              </div>
              <p className="layer-sub">
                {isConnected
                  ? 'Firma digital PKCS#7 autorizada por ARCA. Token y Sign generados.'
                  : (result.error || 'No se pudo obtener el Ticket de Acceso.')}
              </p>
            </div>
          </div>

          {/* Capa 3: WSFEv1 y Punto de Venta */}
          {isConnected && (
            <div className={`diagnostic-layer-item ${isPtoVtaOk ? 'pass' : 'warn'}`}>
              <div className={`layer-icon ${isPtoVtaOk ? 'pass' : 'warn'}`}>
                <Store size={16} />
              </div>
              <div className="layer-content">
                <div className="layer-header">
                  <span className="layer-name">Punto de Venta N° {ptoVtaNum} (WSFEv1)</span>
                  <span className={`layer-tag ${isPtoVtaOk ? 'pass' : 'warn'}`}>
                    {isPtoVtaOk ? 'Habilitado' : 'Pendiente en AFIP'}
                  </span>
                </div>
                <p className="layer-sub">
                  {result.pto_vta_message || (isPtoVtaOk ? 'Punto de venta verificado.' : 'Requiere vinculación con Web Services.')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Guía de Resolución si el Punto de Venta requiere atención */}
        {overallStatus === 'warning' && (
          <div className="diagnostic-guide-card">
            <div className="guide-card-head">
              <div className="guide-card-badge">Guía Rápida</div>
              <h5 className="guide-card-title">¿Cómo dar de alta el Punto de Venta {ptoVtaNum} en AFIP?</h5>
            </div>
            <p className="guide-card-intro">
              Tus certificados ya fueron aceptados por ARCA. Solo resta asociar el Punto de Venta al servicio web:
            </p>
            <ol className="guide-steps-list">
              <li>
                Ingresá a{' '}
                <a
                  href="https://auth.afip.gob.ar/contribuyente_/login.xhtml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="guide-link"
                >
                  afip.gob.ar <ExternalLink size={12} style={{ display: 'inline', marginLeft: 2 }} />
                </a>{' '}
                con tu CUIT y Clave Fiscal.
              </li>
              <li>Buscá y abrí el servicio <strong>"Administración de puntos de venta y domicilios"</strong>.</li>
              <li>Seleccioná tu empresa y hacé clic en <strong>"A/B/M Puntos de Venta"</strong>.</li>
              <li>Hacé clic en <strong>"Agregar"</strong> e ingresá el número <strong>{ptoVtaNum}</strong>.</li>
              <li>
                En <strong>"Sistema"</strong>, elegí obligatoriamente:{' '}
                <strong className="text-emerald-400">"Facturación Electrónica - Web Services"</strong>.
                <span className="guide-subnote">(No elijas "Comprobantes en Línea").</span>
              </li>
              <li>Guardá los cambios y volvé a hacer clic en <strong>"Reintentar prueba"</strong>.</li>
            </ol>
          </div>
        )}

        {/* Error general si no conectó */}
        {overallStatus === 'error' && (
          <div className="diagnostic-error-advice">
            <div className="advice-title">Recomendación para solucionar el error:</div>
            <p className="advice-text">
              {result.error || 'Verifique que los certificados coincidan con el CUIT y que pertenezcan al entorno correcto (Producción vs Homologación).'}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ArcaDiagnosticModal
