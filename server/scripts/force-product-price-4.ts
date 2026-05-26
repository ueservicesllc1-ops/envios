import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

async function forcePrice() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const db = admin.firestore();
  const sku = '6295050835137';
  const newPrice = 4; // Cambiando a 4 como dice el usuario
  
  // 1. Forzar en Master
  const productSnap = await db.collection('products').where('sku', '==', sku).get();
  if (!productSnap.empty) {
    const pId = productSnap.docs[0].id;
    await db.collection('products').doc(pId).update({ salePrice1: newPrice });
    console.log(`✅ Precio maestro de ${sku} actualizado a $${newPrice}`);

    // 2. Forzar en todas las bodegas de ese producto
    const invSnap = await db.collection('inventory').where('productId', '==', pId).get();
    const batch = db.batch();
    invSnap.forEach(docSnap => {
      const qty = docSnap.data().quantity || 0;
      batch.update(docSnap.ref, { 
        unitPrice: newPrice,
        totalPrice: newPrice * qty,
        'product.salePrice1': newPrice
      });
    });
    await batch.commit();
    console.log(`✅ Todas las bodegas sincronizadas a $${newPrice}`);
  }
}

forcePrice().then(() => process.exit(0));
