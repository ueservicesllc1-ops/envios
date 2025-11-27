import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Firebase config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCn5b43XaNvTg56ErYYazHaCLc8Ntbx2tw",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "envios-aaf94.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "envios-aaf94",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "envios-aaf94.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "301889994673",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:301889994673:web:4bf140b88c095b54890790",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-QCM8ZVYE36"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Perfume {
  id: string;
  price: number;
  originalPrice?: number;
}

async function updatePerfumePrices() {
  console.log('🚀 Iniciando actualización de precios de perfumes...');
  
  try {
    const perfumesRef = collection(db, 'perfumes');
    const querySnapshot = await getDocs(perfumesRef);
    
    console.log(`📦 Total perfumes encontrados: ${querySnapshot.size}`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      const perfume = {
        id: docSnap.id,
        price: data.price || 0,
        originalPrice: data.originalPrice
      } as Perfume;
      
      if (perfume.price <= 0) {
        console.log(`⚠️  Saltando perfume ${perfume.id}: precio inválido`);
        skipped++;
        continue;
      }
      
      // Calcular precio original con 20% de descuento
      // Si precio_venta = precio_original * 0.80
      // Entonces precio_original = precio_venta / 0.80 = precio_venta * 1.25
      const newOriginalPrice = Math.round(perfume.price * 1.25 * 100) / 100; // Redondear a 2 decimales
      
      // Solo actualizar si el precio original es diferente o no existe
      if (perfume.originalPrice !== newOriginalPrice) {
        const perfumeRef = doc(db, 'perfumes', perfume.id);
        await updateDoc(perfumeRef, {
          originalPrice: newOriginalPrice,
          updatedAt: Timestamp.now()
        });
        
        console.log(`✅ ${perfume.id}: $${perfume.price} → Original: $${newOriginalPrice} (Descuento: 20%)`);
        updated++;
      } else {
        skipped++;
      }
    }
    
    console.log(`\n🎉 Actualización completada!`);
    console.log(`✅ Actualizados: ${updated}`);
    console.log(`⏭️  Omitidos: ${skipped}`);
    console.log(`📊 Total: ${querySnapshot.size}`);
  } catch (error) {
    console.error('❌ Error actualizando precios:', error);
    throw error;
  }
}

updatePerfumePrices()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  });







