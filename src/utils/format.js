export const formatCurrency = (value) => new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
}).format(value || 0);

export const formatARS = formatCurrency;

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('es-AR', { hour12: false });
};
