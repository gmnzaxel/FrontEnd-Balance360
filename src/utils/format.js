export const formatCurrency = (value) => {
  const num = Number(value) || 0
  const hasDecimals = num % 1 !== 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num)
}

export const formatARS = formatCurrency

export const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('es-AR', { hour12: false })
}

export const formatDateOnly = (dateString) => {
  if (!dateString) return '-'
  const parts = String(dateString).split('T')[0].split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
  }
  return new Date(dateString).toLocaleDateString('es-AR')
}
