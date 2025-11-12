// Utilidades para formateo seguro de números y fechas

const decimalOptions: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
};

export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '$0.00';
  }
  return `$${value.toLocaleString('en-US', decimalOptions)}`;
};

export const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00';
  }
  return value.toLocaleString('en-US', decimalOptions);
};

export const formatDate = (date: Date | undefined | null): string => {
  if (!date) {
    return 'Sin fecha';
  }
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const safeToLocaleString = (
  value: number | undefined | null,
  fallback: string = '0.00'
): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return fallback;
  }
  return value.toLocaleString('en-US', decimalOptions);
};
