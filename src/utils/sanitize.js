/**
 * Utilidad de sanitización para prevenir DOM-based XSS (CWE-79).
 * Convierte caracteres reservados de HTML en sus entidades seguras correspondientes.
 *
 * @param {string|number|null|undefined} unsafe - Texto o valor a codificar.
 * @returns {string} Texto seguro para inserción en plantillas HTML de impresión.
 */
export const escapeHtml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Valida que una URL o Data URL sea una imagen segura para evitar inyecciones javascript: o HTML en tags <img src="..." />.
 * @param {string|null|undefined} url
 * @returns {string} URL segura o cadena vacía si es inválida/insegura
 */
export const safeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  const allowedPrefixes = [
    'data:image/png;base64,',
    'data:image/jpeg;base64,',
    'data:image/jpg;base64,',
    'data:image/webp;base64,',
    'data:image/gif;base64,',
  ]
  if (allowedPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    return trimmed
  }
  return ''
}

export default escapeHtml
