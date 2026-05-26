/**
 * Construye la URL completa de una imagen
 * Si la imagen viene del proxy de B2 (empieza con /api/b2/image), construye la URL completa hacia el backend Node.js
 * Si es una URL externa, la retorna tal cual
 */
export function getImageUrl(imageUrl) {
  if (!imageUrl) {
    return 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=600';
  }

  // Si ya es una URL completa (http:// o https://), retornarla tal cual
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Si es un path del proxy de B2 o relativo
  if (imageUrl.startsWith('/api/b2/image') || imageUrl.startsWith('/')) {
    return `${backendUrl}${imageUrl}`;
  }

  // Por defecto, retornar la URL tal cual
  return imageUrl;
}
