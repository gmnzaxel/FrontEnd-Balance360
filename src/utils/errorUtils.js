const FIELD_LABELS = {
  customer_doc_number: 'Número de Documento',
  customer_doc_type: 'Tipo de Documento',
  customer_name: 'Nombre o Razón Social',
  customer_iva_condition: 'Condición frente al IVA',
  customer_address: 'Domicilio Fiscal',
  voucher_type: 'Tipo de Comprobante',
  payment_method: 'Método de Pago',
  payment_details: 'Detalles de Pago Dividido',
  items: 'Productos o Servicios',
  quantity: 'Cantidad',
  price: 'Precio',
  discount: 'Descuento',
  certificate_crt: 'Certificado Digital (.crt)',
  private_key: 'Clave Privada (.key)',
  punto_venta: 'Punto de Venta',
  cuit: 'CUIT de la Empresa',
  razon_social: 'Razón Social',
  iibb: 'Ingresos Brutos',
  domicilio_comercial: 'Domicilio Comercial',
  ticket_header: 'Encabezado del Ticket',
  ticket_footer: 'Pie del Ticket',
  branch_name: 'Nombre de Sucursal',
}

/**
 * Filtra y traduce excepciones crudas de red, sockets o protocolos técnicos
 * para que el usuario reciba un mensaje comprensible, profesional y accionable.
 */
export const sanitizeTechnicalMessage = (rawMsg) => {
  if (!rawMsg || typeof rawMsg !== 'string') return ''

  const str = rawMsg.trim()

  if (
    str.includes('HTTPSConnectionPool') ||
    str.includes('Max retries exceeded') ||
    str.includes('Failed to establish a new connection') ||
    str.includes('Connection refused')
  ) {
    return 'No se pudo conectar con los servidores de ARCA / AFIP. Verifique su conexión o intente más tarde (los servicios fiscales pueden estar en mantenimiento momentáneo).'
  }

  if (str.includes('DH_KEY_TOO_SMALL') || str.includes('dh key too small')) {
    return 'Error de protocolo seguro SSL con ARCA. El servidor requiere parámetros de cifrado compatibles.'
  }

  if (str.includes('Read timed out') || str.includes('ConnectTimeout')) {
    return 'Tiempo de espera agotado al conectar con ARCA. Los servidores de AFIP están experimentando alta latencia. Por favor, reintente en unos instantes.'
  }

  if (str.includes('10015') || str.toLowerCase().includes('punto de venta no se encuentra habilitado')) {
    const ptoMatch = str.match(/punto de venta\s*(?:n°?\s*)?(\d+)/i)
    const ptoTxt = ptoMatch ? ` N° ${ptoMatch[1]}` : ''
    return `El Punto de Venta${ptoTxt} no se encuentra habilitado en AFIP para Facturación Electrónica - Web Services. Verifique en Configuración o en el portal de AFIP.`
  }

  if (str.includes('10016')) {
    return 'Desfase en la numeración del comprobante. El número solicitado no corresponde al próximo autorizado por AFIP.'
  }

  if (str.includes('cms.cert.untrusted') || str.includes('Certificado no emitido por AC de confianza')) {
    return 'El certificado digital no fue emitido por la Autoridad Certificante de ARCA para este entorno. Verifique si corresponde a Producción o Pruebas.'
  }

  if (str.includes('cms.cert.expired') || str.toLowerCase().includes('certificado expirado')) {
    return 'El certificado digital de ARCA ha vencido. Por favor, genere y renueve el certificado en el portal de AFIP.'
  }

  if (
    str.toLowerCase().includes('computador no esta autorizado') ||
    str.toLowerCase().includes('computador no autorizado') ||
    str.toLowerCase().includes('relacion no existe')
  ) {
    return 'El certificado digital aún no tiene vinculado el servicio de Facturación Electrónica (wsfe). Debe delegarlo en el Administrador de Relaciones de Clave Fiscal en AFIP.'
  }

  return str
}

export const getErrorMessage = (error) => {
  if (!error) return 'Ocurrió un error inesperado.'

  // Si ya es un string
  if (typeof error === 'string') {
    return sanitizeTechnicalMessage(error)
  }

  if (!error.response) {
    if (error.message === 'Network Error') {
      return 'Error de conexión. Verifique su conexión a internet o el estado del servidor.'
    }
    return sanitizeTechnicalMessage(error.message) || 'Ocurrió un error inesperado.'
  }

  const { status, data } = error.response

  const formatValue = (value) => {
    if (Array.isArray(value)) {
      const first = value[0]
      if (typeof first === 'string') return sanitizeTechnicalMessage(first)
      if (first && typeof first === 'object') {
        const firstKey = Object.keys(first)[0]
        if (firstKey) {
          const inner = first[firstKey]
          const innerMsg = Array.isArray(inner) ? inner[0] : inner
          return `${FIELD_LABELS[firstKey] || firstKey}: ${sanitizeTechnicalMessage(innerMsg)}`
        }
      }
    }
    if (value && typeof value === 'object') {
      const firstKey = Object.keys(value)[0]
      if (firstKey) {
        const inner = value[firstKey]
        const innerMsg = Array.isArray(inner) ? inner[0] : inner
        return `${FIELD_LABELS[firstKey] || firstKey}: ${sanitizeTechnicalMessage(innerMsg)}`
      }
    }
    return sanitizeTechnicalMessage(String(value))
  }

  // 403 Forbidden
  if (status === 403) {
    const detail = data?.detail || data?.message || data?.error
    if (detail && detail !== 'You do not have permission to perform this action.') {
      return sanitizeTechnicalMessage(detail)
    }
    return 'No tienes permisos suficientes para realizar esta acción.'
  }

  // 401 Unauthorized
  if (status === 401) {
    return 'Sesión expirada o credenciales inválidas. Por favor, vuelva a iniciar sesión.'
  }

  // 404 Not Found
  if (status === 404) {
    const detail = data?.detail || data?.error
    if (detail) return sanitizeTechnicalMessage(detail)
    return 'El recurso solicitado no fue encontrado.'
  }

  // 500+ Server Errors
  if (status >= 500) {
    const serverErr = data?.error || data?.detail
    if (serverErr) {
      return sanitizeTechnicalMessage(serverErr)
    }
    return 'El servidor experimentó un error temporal. Por favor, intente nuevamente.'
  }

  // 400 Bad Request (Validation / Business Logic Errors)
  if (status === 400) {
    if (typeof data === 'string') return sanitizeTechnicalMessage(data)

    if (typeof data === 'object') {
      // Prioridad a error general
      if (data.error) return sanitizeTechnicalMessage(data.error)
      if (data.detail) return sanitizeTechnicalMessage(data.detail)
      if (data.message) return sanitizeTechnicalMessage(data.message)
      if (data.arca) return sanitizeTechnicalMessage(data.arca)

      if (Array.isArray(data.items)) {
        const firstItem = data.items[0]
        const message = formatValue(firstItem)
        return `Ítems: ${message}`
      }

      // Extraer primer error de campo con nombre legible en español
      const firstKey = Object.keys(data)[0]
      if (firstKey) {
        const firstError = data[firstKey]
        const errorMsg = formatValue(firstError)
        const label = FIELD_LABELS[firstKey] || (firstKey.charAt(0).toUpperCase() + firstKey.slice(1))
        return `${label}: ${errorMsg}`
      }
    }
    return 'Datos inválidos. Por favor, revise los campos del formulario.'
  }

  return 'Ocurrió un error al procesar la solicitud.'
}

export default getErrorMessage
