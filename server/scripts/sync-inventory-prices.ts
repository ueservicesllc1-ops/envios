import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Cargar .env desde la raíz del proyecto
dotenv.config({ path: resolve(__dirname, '../../.env') });

async function syncPrices() {
  console.log('🚀 Iniciando sincronización de precios (MODO ADMIN)...');

  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountVar) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT not found in environment variables');
    }

    const serviceAccount = JSON.parse(serviceAccountVar);

    // Inicializar Admin SDK si no está inicializado
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    const db = admin.firestore();

    // 1. Obtener todos los productos actualizados
    const productsSnap = await db.collection('products').get();
    const productsMap = new Map<string, any>();
    
    productsSnap.forEach(docSnap => {
      const data = docSnap.data();
      // Asegurarse de que las fechas sean objetos Date o Timestamps válidos si es necesario
      productsMap.set(docSnap.id, { id: docSnap.id, ...data });
    });
    console.log(`📦 Encontrados ${productsMap.size} productos maestros.`);

    // 2. Actualizar la colección "inventory"
    const inventorySnap = await db.collection('inventory').get();
    console.log(`\n📋 Procesando ${inventorySnap.size} registros en inventario general...`);

    let invUpdated = 0;
    const invBatchSize = 500;
    let invBatch = db.batch();
    let currentInvCount = 0;

    for (const docSnap of inventorySnap.docs) {
      const data = docSnap.data();
      const productId = data.productId;
      
      const masterProduct = productsMap.get(productId);
      if (masterProduct) {
        const qty = data.quantity || 0;
        const newUnitPrice = masterProduct.salePrice1 || 0;
        
        invBatch.update(docSnap.ref, {
          unitPrice: newUnitPrice,
          totalPrice: newUnitPrice * qty,
          product: masterProduct,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        invUpdated++;
        currentInvCount++;

        if (currentInvCount >= invBatchSize) {
          await invBatch.commit();
          invBatch = db.batch();
          currentInvCount = 0;
          console.log(`... lote de ${invUpdated} registros guardado.`);
        }
      }
    }
    if (currentInvCount > 0) {
      await invBatch.commit();
    }
    console.log(`✅ Inventario general actualizado: ${invUpdated} registros corregidos.`);

    // 3. Sincronizar vendedores para el inventario de vendedores
    const sellersSnap = await db.collection('sellers').get();
    const sellersMap = new Map<string, any>();
    sellersSnap.forEach(docSnap => {
      sellersMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
    });

    // 4. Actualizar la colección "seller_inventory"
    const sellerInvSnap = await db.collection('seller_inventory').get();
    console.log(`\n👨‍💼 Procesando ${sellerInvSnap.size} registros en inventario de vendedores...`);

    let selUpdated = 0;
    let selBatch = db.batch();
    let currentSelCount = 0;

    for (const docSnap of sellerInvSnap.docs) {
      const data = docSnap.data();
      const productId = data.productId;
      const sellerId = data.sellerId;
      
      const masterProduct = productsMap.get(productId);
      const seller = sellersMap.get(sellerId);
      
      if (masterProduct) {
        const qty = data.quantity || 0;
        let newUnitPrice = masterProduct.salePrice1 || 0;
        if (seller && seller.priceType === 'price2') {
           newUnitPrice = masterProduct.salePrice2 || 0;
        }

        selBatch.update(docSnap.ref, {
          unitPrice: newUnitPrice,
          totalValue: newUnitPrice * qty,
          product: masterProduct
        });

        selUpdated++;
        currentSelCount++;

        if (currentSelCount >= invBatchSize) {
          await selBatch.commit();
          selBatch = db.batch();
          currentSelCount = 0;
          console.log(`... lote de ${selUpdated} registros guardado.`);
        }
      }
    }
    
    if (currentSelCount > 0) {
      await selBatch.commit();
    }
    
    console.log(`✅ Inventario de vendedores actualizado: ${selUpdated} registros corregidos.`);
    console.log(`\n🎉 Sincronización completada con éxito!`);
  } catch (error) {
    console.error('❌ Error sincronizando inventarios:', error);
    process.exit(1);
  }
}

syncPrices()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
