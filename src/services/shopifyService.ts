import toast from 'react-hot-toast';
import { getApiUrl } from '../config/api.config';

// Configuración de Shopify
const SHOPIFY_STORE = 'fragrancewholesalerusa';

export interface ShopifyProduct {
  id: string;
  title: string;
  body_html?: string;
  vendor: string; // Marca
  product_type?: string; // Tipo/Colección
  images: Array<{
    id: string;
    src: string;
    alt?: string;
  }>;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    compare_at_price?: string;
    sku?: string;
    inventory_quantity?: number;
  }>;
  tags?: string[];
}

export interface ShopifyCollection {
  id: string;
  title: string;
  handle: string;
}

export interface ProcessedPerfume {
  name: string;
  description: string;
  brand: string;
  collection: string;
  sku: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  shopifyProductId: string;
  shopifyVariantId: string;
  isActive: boolean;
}

export const shopifyService = {
  /**
   * Obtiene productos de Shopify usando el backend API
   * El backend hace el scraping y sube las imágenes a B2
   */
  async getProductsFromCollection(
    collectionHandle: string = 'all',
    uploadImages: boolean = true
  ): Promise<ProcessedPerfume[]> {
    try {
      console.log('Obteniendo productos de Shopify vía backend API...');
      toast.loading('Obteniendo productos de Shopify...', { id: 'shopify-import' });

      const response = await fetch(getApiUrl('/api/shopify/import'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection: collectionHandle,
          uploadImages: uploadImages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al importar productos');
      }

      console.log(`Productos obtenidos: ${data.count}`);
      toast.success(`${data.count} productos obtenidos exitosamente`, { id: 'shopify-import' });

      return data.perfumes || [];
    } catch (error: any) {
      console.error('Error al obtener productos de Shopify:', error);
      toast.error(error.message || 'Error al obtener productos de Shopify', { id: 'shopify-import' });
      throw error;
    }
  },

  /**
   * Obtiene estadísticas de productos (marcas, colecciones, etc.)
   */
  async getStats(): Promise<{
    totalProducts: number;
    totalBrands: number;
    totalCollections: number;
    brands: Record<string, number>;
    collections: Record<string, number>;
  }> {
    try {
      const response = await fetch(getApiUrl('/api/shopify/stats'));

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  },

  /**
   * Convierte un ProcessedPerfume (del backend) al formato que espera perfumeService
   * Ya viene procesado del backend, así que solo retornamos el objeto
   */
  convertShopifyToPerfume(processedPerfume: ProcessedPerfume): Omit<ProcessedPerfume, 'shopifyProductId' | 'shopifyVariantId'> {
    // El backend ya procesa todo, solo retornamos el objeto sin los IDs de Shopify
    const { shopifyProductId, shopifyVariantId, ...perfume } = processedPerfume;
    return perfume;
  },

  /**
   * Sube una imagen desde una URL a B2 a través del backend
   */
  async uploadImageFromUrl(url: string, brand: string, name: string): Promise<string> {
    try {
      const response = await fetch(getApiUrl('/api/b2/upload-from-url'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, brand, name }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }
};

