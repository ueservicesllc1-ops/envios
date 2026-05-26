import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

async function checkProduct() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const db = admin.firestore();
  const sku = '6295050835137';
  
  console.log(`🔍 Buscando Producto Maestro con SKU: ${sku}`);
  const productSnap = await db.collection('products').where('sku', '==', sku).get();
  
  if (productSnap.empty) {
    console.log('❌ No se encontró el producto maestro.');
  } else {
    const p = productSnap.docs[0].data();
    console.log('✅ Producto Maestro encontrado:');
    console.log(`   Nombre: ${p.name}`);
    console.log(`   salePrice1 (Precio Venta): $${p.salePrice1}`);
  }

  console.log(`\n📦 Buscando en Inventario (Bodegas):`);
  const invSnap = await db.collection('inventory').where('productId', '==', productSnap.docs[0]?.id || '---').get();
  
  invSnap.forEach(docSnap => {
    const data = docSnap.data();
    console.log(`   📍 Ubicación: ${data.location}`);
    console.log(`   💰 unitPrice en inventario: $${data.unitPrice}`);
    console.log(`   📉 Cantidad: ${data.quantity}`);
  });
}

checkProduct().then(() => process.exit(0));
