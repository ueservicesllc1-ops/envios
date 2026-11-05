// Configuración de la API del backend
const getResolvedBaseUrl = (): string => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Si no es localhost, usar el backend de producción en Railway
    if (
      host !== 'localhost' &&
      host !== '127.0.0.1' &&
      !host.startsWith('192.168.') &&
      !host.startsWith('10.')
    ) {
      return window.location.origin;
    }
  }
  return 'http://localhost:5000';
};

export const API_CONFIG = {
  get baseUrl() {
    return getResolvedBaseUrl();
  }
};

export const getApiUrl = (endpoint: string) => {
  const base = API_CONFIG.baseUrl.replace(/\/+$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};
