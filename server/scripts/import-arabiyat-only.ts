import fetch from 'node-fetch';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch, Timestamp, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCn5b43XaNvTg56ErYYazHaCLc8Ntbx2tw",
  authDomain: "envios-aaf94.firebaseapp.com",
  projectId: "envios-aaf94",
  storageBucket: "envios-aaf94.firebasestorage.app",
  messagingSenderId: "301889994673",
  appId: "1:301889994673:web:4bf140b88c095b54890790"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function normalizeBrand(brand: string): string {
  if (!brand) return 'General';
  // Normalizar específicamente para Arabiyat
  const normalized = brand
    .toLowerCase()
    .trim();
  
  if (normalized === 'arabiyat') {
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
    // Primero verificar el vendor directamente
    if (vendor.includes('prestige')) {
      return 'Prestige';
    }
    if (vendor.includes('sugar')) {
      return 'Sugar';
    }
    // Buscar en tags primero
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
    
    // Buscar en el título del producto
    const title = product.title?.toLowerCase() || '';
    if (title.includes('prestige')) return 'Prestige';
    if (title.includes('sugar')) return 'Sugar';
    if (title.includes("ash'aa") || title.includes('ashaa')) return "Ash'aa";
    
    return 'General';
  }
  
  return 'General';
}

async function importArabiyat() {
  try {
    console.log('🚀 Importando solo productos Arabiyat...');
    
    // Primero eliminar Arabiyat existentes
    console.log('🗑️  Eliminando productos Arabiyat existentes...');
    const q = query(collection(db, 'perfumes'), where('brand', '==', 'Arabiyat'));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`✅ ${snapshot.docs.length} productos Arabiyat eliminados`);
    
    // Obtener todos los productos
    const allProducts: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      try {
        const url = `https://fragrancewholesalerusa.com/collections/all/products.json?limit=250&page=${page}`;
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

        allProducts.push(...data.products);
        console.log(`✅ ${data.products.length} productos obtenidos`);

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
    console.log('🔍 Filtrando productos Arabiyat...\n');

    // Filtrar solo Arabiyat (viene como "Arabiyat Prestige" o "Arabiyat Sugar")
    const arabiyatProducts = allProducts.filter(p => {
      const vendor = (p.vendor || '').toLowerCase().trim();
      return vendor.includes('arabiyat');
    });

    console.log(`✅ Productos Arabiyat encontrados: ${arabiyatProducts.length}`);

    // Procesar productos
    const perfumesToImport: any[] = [];
    const now = new Date();
    const collections = new Set<string>();

    for (const product of arabiyatProducts) {
      try {
        const variant = product.variants[0] || {};
        const image = product.images[0];
        const brand = normalizeBrand(product.vendor || '');
        const collection = determineCollection(product);

        collections.add(collection);

        const perfumeData: any = {
          name: product.title,
          description: product.body_html || '',
          brand: brand,
          collection: collection,
          sku: variant.sku || `SHOP-${product.id}`,
          price: parseFloat(variant.price) || 0,
          imageUrl: image?.src || '',
          isActive: true
        };

        if (variant.compare_at_price) {
          perfumeData.originalPrice = parseFloat(variant.compare_at_price);
        }

        perfumesToImport.push(perfumeData);
      } catch (error) {
        console.error(`❌ Error procesando ${product.title}:`, error);
      }
    }

    console.log(`\n📊 Colecciones encontradas: ${Array.from(collections).join(', ')}`);
    console.log(`💾 Guardando ${perfumesToImport.length} perfumes Arabiyat...`);

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

    console.log(`\n🎉 ¡${perfumesToImport.length} perfumes Arabiyat importados exitosamente!`);
    console.log(`📊 Colecciones: ${Array.from(collections).join(', ')}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

importArabiyat();

