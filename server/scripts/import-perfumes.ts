import { getProductsFromCollection } from '../services/shopifyScraper';
import { perfumeService } from '../../src/services/perfumeService';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Inicializar Firebase
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

async function importPerfumes() {
  try {
    console.log('🚀 Iniciando importación de perfumes...');
    
    // Obtener productos de Shopify (con upload de imágenes)
    console.log('📦 Obteniendo productos de Shopify...');
    const processedPerfumes = await getProductsFromCollection('all', true);
    
    if (processedPerfumes.length === 0) {
      console.log('❌ No se encontraron productos');
      return;
    }

    console.log(`✅ ${processedPerfumes.length} productos obtenidos`);
    console.log('💾 Guardando en Firestore...');

    // Convertir a formato para Firestore
    const perfumesToImport = processedPerfumes.map(perfume => {
      const { shopifyProductId, shopifyVariantId, ...perfumeData } = perfume;
      return perfumeData;
    });

    // Guardar en Firestore usando el servicio
    // Necesitamos usar writeBatch directamente aquí
    const { writeBatch, collection, doc, Timestamp } = await import('firebase/firestore');
    const batch = writeBatch(db);
    const now = new Date();
    const BATCH_SIZE = 500;

    for (let i = 0; i < perfumesToImport.length; i += BATCH_SIZE) {
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
      console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} guardado: ${batchPerfumes.length} perfumes`);
    }

    console.log(`🎉 ¡${perfumesToImport.length} perfumes importados exitosamente!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

importPerfumes();











