import api from '../api/axios'

const ENDPOINT = 'sales/sales/'

export const salesService = {
  /**
   * Obtiene el listado paginado y filtrado de ventas.
   * @param {Object} params - Parámetros de consulta (page, page_size, search, status, etc.)
   * @param {AbortSignal} [signal] - Opcional señal de cancelación para AbortController
   */
  getAll: async (params = {}, signal) => {
    const response = await api.get(ENDPOINT, { params, signal })
    return response.data
  },

  /**
   * Obtiene el detalle de una venta por ID.
   * @param {number|string} id
   */
  getById: async (id) => {
    const response = await api.get(`${ENDPOINT}${id}/`)
    return response.data
  },

  /**
   * Registra una nueva venta o factura.
   * @param {Object} data
   */
  create: async (data) => {
    const response = await api.post(ENDPOINT, data)
    return response.data
  },

  /**
   * Actualiza parcialmente una venta (si está en modo borrador o edición permitida).
   * @param {number|string} id
   * @param {Object} data
   */
  update: async (id, data) => {
    const response = await api.patch(`${ENDPOINT}${id}/`, data)
    return response.data
  },

  /**
   * Anula una venta interna.
   * @param {number|string} id
   * @param {Object} payload - { confirm_text, reason }
   */
  anular: async (id, payload) => {
    const response = await api.post(`${ENDPOINT}${id}/anular/`, payload)
    return response.data
  },

  /**
   * Procesa el reembolso de una venta.
   * @param {number|string} id
   * @param {Object} payload - { confirm_text, reason }
   */
  reembolsar: async (id, payload) => {
    const response = await api.post(`${ENDPOINT}${id}/reembolsar/`, payload)
    return response.data
  },

  /**
   * Eliminación física definitiva de la venta (Solo Administrador).
   * @param {number|string} id
   */
  hardDelete: async (id) => {
    const response = await api.delete(`${ENDPOINT}${id}/hard-delete/`)
    return response.data
  },

  /**
   * Obtiene la configuración de tickets y sucursales.
   */
  getSettings: async () => {
    const response = await api.get('settings/')
    return response.data
  },

  /**
   * Consulta los datos fiscales y razón social de un contribuyente por CUIT.
   * @param {string} cuit
   */
  lookupCuit: async (cuit) => {
    const response = await api.get(`${ENDPOINT}lookup-cuit/`, {
      params: { cuit },
    })
    return response.data
  },
}

export default salesService

