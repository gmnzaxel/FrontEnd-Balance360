import api, { API_BASE_URL } from '../api/axios'

export const arcaService = {
  // Configuración fiscal de la empresa
  getFiscalConfig: async () => {
    const res = await api.get('settings/fiscal/')
    return res.data
  },

  updateFiscalConfig: async (data) => {
    const res = await api.patch('settings/fiscal/', data)
    return res.data
  },

  testConnection: async () => {
    const res = await api.post('settings/fiscal/test-connection/')
    return res.data
  },

  // Autorización de comprobante fiscal para una venta
  authorizeSale: async (saleId, payload = {}) => {
    const res = await api.post(`sales/sales/${saleId}/authorize-arca/`, payload)
    return res.data
  },

  // Emisión de Nota de Crédito en ARCA
  emitCreditNote: async (saleId, reason) => {
    const res = await api.post(`sales/sales/${saleId}/credit-note/`, { reason })
    return res.data
  },

  // Descarga / Apertura del PDF Oficial A4
  downloadInvoicePdf: async (saleId, fileName = 'Factura_ARCA.pdf', invoiceId = null) => {
    const params = invoiceId ? { invoice_id: invoiceId } : {}
    const res = await api.get(`sales/sales/${saleId}/invoice-pdf/`, {
      params,
      responseType: 'blob',
    })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    
    // Abrir en pestaña nueva para previsualizar/imprimir directamente en A4
    const newWindow = window.open(url, '_blank')
    if (!newWindow) {
      // Si el navegador bloqueó el popup, forzar descarga como archivo
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
    }
    return url
  },
}

export default arcaService
