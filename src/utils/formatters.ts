// Utilidades para formateo seguro de números y fechas

export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '$0';
  }
  return `$${value.toLocaleString()}`;
};

export const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString();
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

export const safeToLocaleString = (value: number | undefined | null, fallback: string = '0'): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return fallback;
  }
  return value.toLocaleString();
};
