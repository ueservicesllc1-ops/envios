import fetch from 'node-fetch';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch, Timestamp } from 'firebase/firestore';

// Configuración
const SHOPIFY_STORE = 'fragrancewholesalerusa';

const firebaseConfig = {
  apiKey: "AIzaSyCn5b43XaNvTg56ErYYazHaCLc8Ntbx2tw",
  authDomain: "envios-aaf94.firebaseapp.com",
  projectId: "envios-aaf94",
  storageBucket: "envios-aaf94.firebasestorage.app",
  messagingSenderId: "301889994673",
  appId: "1:301889994673:web:4bf140b88c095b54890790"
};

// Inicializar
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Marcas que tienes (configura estas)
const MARCAS_PERMITIDAS = [
  'Lattafa',
  'Armaf',
  'Arabiyat',
  'Eyfel',
  'Maison Alhambra',
  'Nandita',
  'Al Rehab',
  'Bharara',
  'Ard Al Zaafaran',
  'Afnan',
  'Tumi',
  'French Avenue',
  'Al Haramain',
  'Rasasi',
  'Risala',
  'Grandeur',
  'Dumont',
  'Versace',
  'Hamidi',
  'Khadlaj',
  'Anfar',
  'Christian Siriano',
  'Zimaya',
  'Atralia',
  'Banana Republic',
  'Jo Milano',
  'Flavia'
];

function normalizeBrand(brand: string): string {
  if (!brand) return 'General';
  
  const lowerBrand = brand.toLowerCase().trim();
  
  // Normalizar Arabiyat (viene como "Arabiyat Prestige" o "Arabiyat Sugar")
  if (lowerBrand.includes('arabiyat')) {
    return 'Arabiyat';
  }
  
  return brand
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

function determineCollection(product: any): string {
  const vendor = (product.vendor || '').toLowerCase().trim();
  
  // Arabiyat viene como "Arabiyat Prestige" o "Arabiyat Sugar" en el vendor
  if (vendor.includes('arabiyat')) {
    if (vendor.includes('prestige')) {
      return 'Prestige';
    }
    if (vendor.includes('sugar')) {
      return 'Sugar';
    }
    
    // Si no está en el vendor, buscar en tags
    if (product.tags && Array.isArray(product.tags)) {
      for (const tag of product.tags) {
        const lowerTag = tag.toLowerCase();
        if (lowerTag.includes('prestige')) return 'Prestige';
        if (lowerTag.includes('sugar')) return 'Sugar';
        if (lowerTag.includes("ash'aa") || lowerTag.includes('ashaa')) return "Ash'aa";
        if (lowerTag.includes('general')) return 'General';
      }
    }
    
    // Buscar en product_type
    if (product.product_type) {
      const lowerType = product.product_type.toLowerCase();
      if (lowerType.includes('prestige')) return 'Prestige';
      if (lowerType.includes('sugar')) return 'Sugar';
      if (lowerType.includes("ash'aa") || lowerType.includes('ashaa')) return "Ash'aa";
      if (lowerType.includes('general')) return 'General';
    }
    
    // Buscar en el título
    const title = (product.title || '').toLowerCase();
    if (title.includes('prestige')) return 'Prestige';
    if (title.includes('sugar')) return 'Sugar';
    if (title.includes("ash'aa") || title.includes('ashaa')) return "Ash'aa";
    
    return 'General';
  }
  
  return 'General';
}

async function importPerfumes() {
  try {
    console.log('🚀 Iniciando importación rápida (solo datos, sin imágenes)...');
    console.log(`📋 Marcas permitidas: ${MARCAS_PERMITIDAS.length}`);
    
    // Obtener productos
    const allProducts: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 50) {
      try {
        const url = page === 1 
          ? `https://fragrancewholesalerusa.com/collections/all/products.json?limit=250`
          : `https://fragrancewholesalerusa.com/collections/all/products.json?limit=250&page=${page}`;
        
        console.log(`📄 Página ${page}...`);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://fragrancewholesalerusa.com/'
          }
        });

        if (!response.ok) {
          if (response.status === 404 || page > 1) {
            hasMore = false;
            break;
          }
          throw new Error(`Error ${response.status}`);
        }

        const data = await response.json() as { products: any[] };
        if (!data.products || data.products.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`✅ ${data.products.length} productos en página ${page}`);
        allProducts.push(...data.products);

        if (data.products.length < 250) {
          hasMore = false;
        } else {
          page++;
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error: any) {
        console.error(`❌ Error en página ${page}:`, error.message);
        if (page === 1) throw error;
        hasMore = false;
      }
    }

    console.log(`\n📦 Total productos obtenidos: ${allProducts.length}`);
    console.log('🔍 Filtrando por marcas permitidas...\n');

    // Procesar y filtrar productos
    const perfumesToImport: any[] = [];
    const now = new Date();
    const marcasEncontradas = new Set<string>();

    for (const product of allProducts) {
      try {
        const variant = product.variants[0] || {};
        const image = product.images[0];
        const brand = normalizeBrand(product.vendor || 'General');
        const collection = determineCollection(product);

        // Filtrar por marcas permitidas (después de normalizar)
        if (!MARCAS_PERMITIDAS.includes(brand)) {
          continue;
        }

        marcasEncontradas.add(brand);

        // Usar URL original de Shopify por ahora (sin subir a B2)
        const imageUrl = image?.src || '';

        perfumesToImport.push({
          name: product.title,
          description: product.body_html || '',
          brand: brand,
          collection: collection,
          sku: variant.sku || `SHOP-${product.id}`,
          price: parseFloat(variant.price) || 0,
          imageUrl: imageUrl,
          isActive: true
        });

        // Agregar originalPrice solo si existe
        if (variant.compare_at_price) {
          perfumesToImport[perfumesToImport.length - 1].originalPrice = parseFloat(variant.compare_at_price);
        }
      } catch (error) {
        console.error(`❌ Error procesando ${product.title}:`, error);
      }
    }

    console.log(`✅ Productos filtrados: ${perfumesToImport.length}`);
    console.log(`📊 Marcas encontradas: ${Array.from(marcasEncontradas).join(', ')}\n`);

    if (perfumesToImport.length === 0) {
      console.log('❌ No se encontraron productos de las marcas permitidas');
      process.exit(0);
    }

    console.log(`💾 Guardando ${perfumesToImport.length} perfumes en Firestore...`);

    // Guardar en Firestore
    const BATCH_SIZE = 500;
    for (let i = 0; i < perfumesToImport.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchPerfumes = perfumesToImport.slice(i, i + BATCH_SIZE);
      
      for (const perfume of batchPerfumes) {
        const docRef = doc(collection(db, 'perfumes'));
        batch.set(docRef, {
          ...perfume,
          createdAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now)
        });
      }
      
      await batch.commit();
      console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchPerfumes.length} perfumes guardados`);
    }

    console.log(`\n🎉 ¡${perfumesToImport.length} perfumes importados exitosamente!`);
    console.log(`📊 Marcas: ${Array.from(marcasEncontradas).join(', ')}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

importPerfumes();

