import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

async function findDuplicates() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const db = admin.firestore();
  const sku = '6295050835137';
  
  console.log(`🔍 Buscando TODOS los productos con SKU: ${sku}`);
  const productSnap = await db.collection('products').where('sku', '==', sku).get();
  
  productSnap.forEach(doc => {
    const p = doc.data();
    console.log(`- ID: ${doc.id}`);
    console.log(`  Nombre: ${p.name}`);
    console.log(`  salePrice1: $${p.salePrice1}`);
  });
}

findDuplicates().then(() => process.exit(0));
