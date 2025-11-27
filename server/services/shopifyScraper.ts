import fetch from 'node-fetch';
import { uploadImageToB2 } from './b2Service';

const SHOPIFY_STORE = 'fragrancewholesalerusa';
const BASE_URL = `https://${SHOPIFY_STORE}.myshopify.com`;

export interface ShopifyProduct {
  id: string;
  title: string;
  body_html?: string;
  vendor: string;
  product_type?: string;
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
  }>;
  tags?: string[];
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

/**
 * Normaliza el nombre de una marca
 */
function normalizeBrand(brand: string): string {
  if (!brand) return 'General';
  
  // Capitalizar primera letra de cada palabra
  return brand
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

/**
 * Determina la colección basándose en el product_type y tags
 */
function determineCollection(product: ShopifyProduct): string {
  // Solo Arabiyat tiene colecciones definidas
  if (product.vendor.toLowerCase() === 'arabiyat') {
    // Buscar en tags
    if (product.tags) {
      const collectionTags = ['prestige', 'sugar', 'general', "ash'aa"];
      for (const tag of product.tags) {
        const lowerTag = tag.toLowerCase();
        if (collectionTags.some(c => lowerTag.includes(c))) {
          return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
        }
      }
    }
    // Si no encuentra en tags, usar product_type
    if (product.product_type) {
      const lowerType = product.product_type.toLowerCase();
      if (lowerType.includes('prestige')) return 'Prestige';
      if (lowerType.includes('sugar')) return 'Sugar';
      if (lowerType.includes('general')) return 'General';
      if (lowerType.includes("ash'aa") || lowerType.includes('ashaa')) return "Ash'aa";
    }
    return 'General';
  }
  
  // Para otras marcas, usar "General" por defecto
  return 'General';
}

/**
 * Obtiene todos los productos de una colección usando la API pública de Shopify
 */
export async function getProductsFromCollection(
  collectionHandle: string = 'all',
  uploadImages: boolean = false
): Promise<ProcessedPerfume[]> {
  const allProducts: ShopifyProduct[] = [];
  let page = 1;
  let hasMore = true;
  const maxPages = 50; // Límite de seguridad

  console.log(`Obteniendo productos de la colección: ${collectionHandle}`);

  while (hasMore && page <= maxPages) {
    try {
      // Usar la API pública de Shopify
      const url = collectionHandle === 'all'
        ? `${BASE_URL}/products.json?limit=250&page=${page}`
        : `https://fragrancewholesalerusa.com/collections/${collectionHandle}/products.json?page=${page}`;

      console.log(`Obteniendo página ${page}...`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404 || page > 1) {
          hasMore = false;
          break;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as { products: ShopifyProduct[] };

      if (!data.products || data.products.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`Productos obtenidos en página ${page}: ${data.products.length}`);
      allProducts.push(...data.products);

      if (data.products.length < 250) {
        hasMore = false;
      } else {
        page++;
        // Delay de 500ms entre páginas para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Error en página ${page}:`, error);
      if (page === 1) {
        throw error;
      }
      hasMore = false;
    }
  }

  console.log(`Total de productos obtenidos: ${allProducts.length}`);

  // Procesar productos
  const processedPerfumes: ProcessedPerfume[] = [];

  for (let i = 0; i < allProducts.length; i++) {
    const product = allProducts[i];
    try {
      const variant = product.variants[0] || {};
      const image = product.images[0];

      // Normalizar marca
      const brand = normalizeBrand(product.vendor || 'General');
      
      // Determinar colección
      const collection = determineCollection(product);

      // Procesar imagen
      let imageUrl = image?.src || '';
      
      if (uploadImages && imageUrl) {
        try {
          console.log(`Subiendo imagen ${i + 1}/${allProducts.length} para: ${product.title}`);
          const uploadResult = await uploadImageToB2(imageUrl, brand, product.title);
          imageUrl = uploadResult.url;
          
          // Delay de 1.5s entre imágenes para no sobrecargar
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (imageError) {
          console.error(`Error al subir imagen para ${product.title}:`, imageError);
          // Continuar sin imagen si falla
        }
      }

      const perfume: ProcessedPerfume = {
        name: product.title,
        description: product.body_html || '',
        brand: brand,
        collection: collection,
        sku: variant.sku || `SHOP-${product.id}`,
        price: parseFloat(variant.price) || 0,
        originalPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : undefined,
        imageUrl: imageUrl,
        shopifyProductId: product.id.toString(),
        shopifyVariantId: variant.id.toString(),
        isActive: true,
      };

      processedPerfumes.push(perfume);
    } catch (error) {
      console.error(`Error procesando producto ${product.title}:`, error);
      // Continuar con el siguiente producto
    }
  }

  return processedPerfumes;
}

/**
 * Obtiene estadísticas de productos por marca y colección
 */
export async function getProductStats(): Promise<{
  totalProducts: number;
  totalBrands: number;
  totalCollections: number;
  brands: Record<string, number>;
  collections: Record<string, number>;
}> {
  const products = await getProductsFromCollection('all', false);
  
  const brands: Record<string, number> = {};
  const collections: Record<string, number> = {};
  const brandSet = new Set<string>();
  const collectionSet = new Set<string>();

  products.forEach(product => {
    const brand = product.brand;
    const collection = product.collection;

    brands[brand] = (brands[brand] || 0) + 1;
    collections[collection] = (collections[collection] || 0) + 1;
    
    brandSet.add(brand);
    collectionSet.add(collection);
  });

  return {
    totalProducts: products.length,
    totalBrands: brandSet.size,
    totalCollections: collectionSet.size,
    brands,
    collections,
  };
}







