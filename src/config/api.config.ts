// Configuración de la API del backend
export const API_CONFIG = {
  // En desarrollo, el servidor corre en puerto 5000
  // En producción, usar la URL del servidor desplegado
  baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000',
};

export const getApiUrl = (endpoint: string) => {
  return `${API_CONFIG.baseUrl}${endpoint}`;
};







