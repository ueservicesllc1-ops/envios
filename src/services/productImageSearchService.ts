import { getApiUrl } from '../config/api.config';

export interface ProductImageResult {
  url: string;
  title?: string;
  source: string;
  thumb?: string;
}

export interface SuggestedProductInfo {
  name?: string;
  brand?: string;
  category?: string;
  description?: string;
}

export interface ImageSearchResponse {
  images: ProductImageResult[];
  productInfo?: SuggestedProductInfo;
}

class ProductImageSearchService {
  /**
   * Busca imágenes e información de un producto por código de barras y/o nombre
   */
  async searchImages(query?: string, barcode?: string): Promise<ImageSearchResponse> {
    const cleanQuery = (query || '').trim();
    const cleanBarcode = (barcode || '').trim();

    if (!cleanQuery && !cleanBarcode) {
      return { images: [] };
    }

    const images: ProductImageResult[] = [];
    let productInfo: SuggestedProductInfo | undefined;

    // 1. Intentar consultar el backend si está disponible (timeout de 3.5s)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const params = new URLSearchParams();
      if (cleanQuery) params.append('q', cleanQuery);
      if (cleanBarcode) params.append('barcode', cleanBarcode);

      const backendUrl = getApiUrl(`/api/search-product-images?${params.toString()}`);
      const res = await fetch(backendUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.images && Array.isArray(data.images)) {
          data.images.forEach((img: any) => {
            const url = typeof img === 'string' ? img : img.url;
            if (url && !images.some(existing => existing.url === url)) {
              images.push({
                url,
                title: img.title || cleanQuery || cleanBarcode,
                source: img.source || 'Web Search',
                thumb: img.thumb || url
              });
            }
          });
        }
        if (data.productInfo) {
          productInfo = data.productInfo;
        }
      }
    } catch {
      // Backend offline o timeout; continuamos con las APIs públicas directas sin error
    }

    // 2. Si hay código de barras, consultar Open Food Facts y Open Beauty Facts directamente (CORS habilitado)
    if (cleanBarcode) {
      try {
        const offPromise = fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`)
          .then(r => r.json())
          .catch(() => null);

        const obfPromise = fetch(`https://world.openbeautyfacts.org/api/v0/product/${encodeURIComponent(cleanBarcode)}.json`)
          .then(r => r.json())
          .catch(() => null);

        const [offData, obfData] = await Promise.all([offPromise, obfPromise]);

        const offProduct = offData?.product || obfData?.product;
        if (offProduct) {
          if (!productInfo) {
            productInfo = {
              name: offProduct.product_name || offProduct.generic_name || undefined,
              brand: offProduct.brands || undefined,
              category: offProduct.categories?.split(',')?.[0]?.trim() || undefined,
              description: offProduct.generic_name || undefined
            };
          }

          // Imágenes principales
          const candidateUrls = [
            offProduct.image_url,
            offProduct.image_front_url,
            offProduct.image_front_large_url,
            offProduct.image_small_url,
            offProduct.image_packaging_url
          ].filter(Boolean);

          candidateUrls.forEach(url => {
            if (url && !images.some(item => item.url === url)) {
              images.push({
                url,
                title: offProduct.product_name || 'Producto detectado',
                source: 'Código de Barras (UPC/EAN)',
                thumb: url
              });
            }
          });

          // Imágenes seleccionadas si las hay
          if (offProduct.selected_images?.front?.display) {
            Object.values(offProduct.selected_images.front.display).forEach((url: any) => {
              if (url && typeof url === 'string' && !images.some(item => item.url === url)) {
                images.push({
                  url,
                  title: offProduct.product_name || 'Frontal',
                  source: 'Catálogo de Barras',
                  thumb: url
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn('Error en búsqueda por código de barras:', err);
      }
    }

    // 3. Búsqueda por nombre de producto en Open Food Facts (para snacks, bebidas, comestibles, cosméticos)
    const searchTerm = cleanQuery || productInfo?.name || '';
    if (searchTerm && images.length < 6) {
      try {
        const offSearchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerm)}&search_simple=1&action=process&json=1&page_size=8`;
        const res = await fetch(offSearchUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.products && Array.isArray(data.products)) {
            data.products.forEach((p: any) => {
              const img = p.image_url || p.image_front_url;
              if (img && !images.some(existing => existing.url === img)) {
                images.push({
                  url: img,
                  title: p.product_name || searchTerm,
                  source: 'Open Product DB',
                  thumb: p.image_small_url || img
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn('Error en búsqueda textual OpenFoodFacts:', err);
      }
    }

    // 4. Búsqueda en Wikimedia Commons (para electrónica, ropa, perfumes, herramientas, marcas)
    if (searchTerm && images.length < 6) {
      try {
        const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchTerm)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=500&format=json&origin=*`;
        const res = await fetch(wikiUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.query?.pages) {
            Object.values(data.query.pages).forEach((page: any) => {
              const info = page.imageinfo?.[0];
              if (info) {
                const url = info.thumburl || info.url;
                if (url && !images.some(existing => existing.url === url)) {
                  images.push({
                    url,
                    title: page.title?.replace('File:', '') || searchTerm,
                    source: 'Web Wikimedia',
                    thumb: info.thumburl || url
                  });
                }
              }
            });
          }
        }
      } catch (err) {
        console.warn('Error en búsqueda Wikimedia:', err);
      }
    }

    return {
      images: images.filter(img => img.url && img.url.startsWith('http')),
      productInfo
    };
  }
}

export const productImageSearchService = new ProductImageSearchService();
