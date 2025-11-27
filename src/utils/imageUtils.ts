import { getApiUrl } from '../config/api.config';

/**
 * Construye la URL completa de una imagen
 * Si la imagen viene del proxy de B2 (empieza con /api/b2/image), construye la URL completa
 * Si es una URL externa, la retorna tal cual
 */
export function getImageUrl(imageUrl?: string): string {
  if (!imageUrl) {
    return '';
  }

  // Si ya es una URL completa (http:// o https://), retornarla tal cual
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Si es un path del proxy de B2, construir la URL completa
  if (imageUrl.startsWith('/api/b2/image')) {
    return getApiUrl(imageUrl);
  }

  // Si es un path relativo, asumir que es del proxy de B2
  if (imageUrl.startsWith('/')) {
    return getApiUrl(imageUrl);
  }

  // Por defecto, retornar la URL tal cual
  return imageUrl;
}







