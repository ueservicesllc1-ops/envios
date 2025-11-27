import fetch from 'node-fetch';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch, Timestamp } from 'firebase/firestore';

// Configuración
const SHOPIFY_STORE = 'fragrancewholesalerusa';
const BASE_URL = `https://${SHOPIFY_STORE}.myshopify.com`;

const B2_CONFIG = {
  endpoint: 'https://s3.us-east-005.backblazeb2.com',
  bucketName: 'perfumes',
  region: 'us-east-005',
  accessKeyId: '005c2b526be0baa0000000023',
  secretAccessKey: 'K005kwUzyotWkrAdUKemICdsxbYaLP4',
};

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
const s3Client = new S3Client({
  endpoint: B2_CONFIG.endpoint,
  region: B2_CONFIG.region,
  credentials: {
    accessKeyId: B2_CONFIG.accessKeyId,
    secretAccessKey: B2_CONFIG.secretAccessKey,
  },
  forcePathStyle: true,
});

function normalizeBrand(brand: string): string {
  if (!brand) return 'General';
  return brand
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

function determineCollection(product: any): string {
  if (product.vendor?.toLowerCase() === 'arabiyat') {
    if (product.tags) {
      const collectionTags = ['prestige', 'sugar', 'general', "ash'aa"];
      for (const tag of product.tags) {
        const lowerTag = tag.toLowerCase();
        if (collectionTags.some(c => lowerTag.includes(c))) {
          return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
        }
      }
    }
    if (product.product_type) {
      const lowerType = product.product_type.toLowerCase();
      if (lowerType.includes('prestige')) return 'Prestige';
      if (lowerType.includes('sugar')) return 'Sugar';
      if (lowerType.includes('general')) return 'General';
      if (lowerType.includes("ash'aa") || lowerType.includes('ashaa')) return "Ash'aa";
    }
    return 'General';
  }
  return 'General';
}

async function uploadImageToB2(imageUrl: string, brand: string, productName: string): Promise<string> {
  try {
    const cleanUrl = imageUrl.split('?')[0];
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://fragrancewholesalerusa.com/'
      }
    });

    if (!response.ok) throw new Error(`Error descargando: ${response.statusText}`);
    const imageBuffer = await response.buffer();
    if (imageBuffer.length < 100) throw new Error('Imagen inválida');

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.includes('webp') ? 'webp' :
                     contentType.includes('png') ? 'png' : 'jpg';

    const normalizedBrand = brand.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const normalizedProduct = productName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
    const fileName = `${normalizedBrand}-${normalizedProduct}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;
    const key = `perfumes/${normalizedBrand}/${fileName}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: B2_CONFIG.bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
      CacheControl: 'max-age=31536000',
    }));

    return `/api/b2/image?path=${encodeURIComponent(key)}`;
  } catch (error) {
    console.error(`Error subiendo imagen para ${productName}:`, error);
    return imageUrl; // Retornar URL original si falla
  }
}

async function importPerfumes() {
  try {
    console.log('🚀 Iniciando importación...');
    
    // Obtener productos
    const allProducts: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 50) {
      try {
        // Intentar con la URL de la colección directamente
        const url = page === 1 
          ? `https://fragrancewholesalerusa.com/collections/all/products.json?limit=250`
          : `https://fragrancewholesalerusa.com/collections/all/products.json?limit=250&page=${page}`;
        
        console.log(`📄 Página ${page}: ${url}`);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://fragrancewholesalerusa.com/'
          }
        });

        console.log(`Status: ${response.status}`);

        if (!response.ok) {
          const text = await response.text();
          console.log(`Response text: ${text.substring(0, 200)}`);
          if (response.status === 404 || page > 1) {
            hasMore = false;
            break;
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as { products: any[] };
        console.log(`Data keys: ${Object.keys(data).join(', ')}`);
        
        if (!data.products || data.products.length === 0) {
          console.log('No hay más productos');
          hasMore = false;
          break;
        }

        console.log(`✅ ${data.products.length} productos en página ${page}`);
        allProducts.push(...data.products);

        if (data.products.length < 250) {
          hasMore = false;
        } else {
          page++;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        console.error(`❌ Error en página ${page}:`, error.message);
        if (page === 1) {
          console.error('Error completo:', error);
          throw error;
        }
        hasMore = false;
      }
    }

    console.log(`\n📦 Total: ${allProducts.length} productos`);
    console.log('🖼️  Subiendo imágenes y procesando...\n');

    // Procesar productos
    const perfumesToImport: any[] = [];
    const now = new Date();

    for (let i = 0; i < allProducts.length; i++) {
      const product = allProducts[i];
      try {
        const variant = product.variants[0] || {};
        const image = product.images[0];
        const brand = normalizeBrand(product.vendor || 'General');
        const collection = determineCollection(product);

        let imageUrl = image?.src || '';
        if (imageUrl) {
          process.stdout.write(`\r🖼️  Imagen ${i + 1}/${allProducts.length}: ${product.title.substring(0, 40)}...`);
          imageUrl = await uploadImageToB2(imageUrl, brand, product.title);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

      const perfumeData: any = {
        name: product.title,
        description: product.body_html || '',
        brand: brand,
        collection: collection,
        sku: variant.sku || `SHOP-${product.id}`,
        price: parseFloat(variant.price) || 0,
        imageUrl: imageUrl,
        isActive: true
      };

      // Solo agregar originalPrice si existe
      if (variant.compare_at_price) {
        perfumeData.originalPrice = parseFloat(variant.compare_at_price);
      }

      perfumesToImport.push(perfumeData);
      } catch (error) {
        console.error(`\n❌ Error procesando ${product.title}:`, error);
      }
    }

    console.log(`\n\n💾 Guardando ${perfumesToImport.length} perfumes en Firestore...`);

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
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

importPerfumes();

