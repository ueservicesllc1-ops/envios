import fetch from 'node-fetch';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCn5b43XaNvTg56ErYYazHaCLc8Ntbx2tw",
  authDomain: "envios-aaf94.firebaseapp.com",
  projectId: "envios-aaf94",
  storageBucket: "envios-aaf94.firebasestorage.app",
  messagingSenderId: "301889994673",
  appId: "1:301889994673:web:4bf140b88c095b54890790"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Perfume {
  id: string;
  name: string;
  description?: string;
  descriptionEs?: string;
  descriptionEn?: string;
  [key: string]: any;
}

// Función para limpiar HTML y extraer solo el texto
const cleanHtml = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, ' ') // Remover tags HTML
    .replace(/\s+/g, ' ') // Normalizar espacios
    .trim();
};

// Función para traducir texto usando Google Translate API gratuita
const translateText = async (text: string, targetLang: 'es' | 'en'): Promise<string> => {
  try {
    if (!text || text.trim().length === 0) {
      return '';
    }

    // Limpiar HTML para la traducción
    const cleanText = cleanHtml(text);
    
    if (cleanText.length === 0) {
      return text; // Si no hay texto después de limpiar, devolver original
    }

    // Si el texto es muy largo, dividirlo en partes
    const maxLength = 5000;
    if (cleanText.length > maxLength) {
      console.log(`  ⚠️  Texto muy largo (${cleanText.length} caracteres), dividiendo...`);
      const parts = [];
      for (let i = 0; i < cleanText.length; i += maxLength) {
        parts.push(cleanText.substring(i, i + maxLength));
      }
      const translatedParts = await Promise.all(
        parts.map(part => translateTextPart(part, targetLang))
      );
      return translatedParts.join(' ');
    }

    return await translateTextPart(cleanText, targetLang);
  } catch (error: any) {
    console.error(`  ❌ Error traduciendo: ${error.message}`);
    // Si falla la traducción, devolver el texto original
    return text;
  }
};

// Función auxiliar para traducir una parte del texto
const translateTextPart = async (text: string, targetLang: 'es' | 'en'): Promise<string> => {
  try {
    // Usar la API gratuita de Google Translate (sin API key, limitada pero funcional)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    const data: any = await response.json();
    
    if (data && data[0] && Array.isArray(data[0])) {
      const translated = data[0].map((item: any[]) => item[0]).join('');
      return translated || text;
    }
    
    return text;
  } catch (error: any) {
    console.error(`  ❌ Error en traducción: ${error.message}`);
    return text;
  }
};

// Función principal
const translatePerfumeDescriptions = async () => {
  try {
    console.log('🚀 Iniciando traducción de descripciones de perfumes...\n');

    // Obtener todos los perfumes
    const perfumesSnapshot = await getDocs(collection(db, 'perfumes'));
    
    if (perfumesSnapshot.empty) {
      console.log('❌ No se encontraron perfumes');
      return;
    }

    console.log(`📦 Total de perfumes encontrados: ${perfumesSnapshot.size}\n`);

    let translated = 0;
    let skipped = 0;
    let errors = 0;

    // Procesar cada perfume
    for (const docSnap of perfumesSnapshot.docs) {
      const perfume = { id: docSnap.id, ...docSnap.data() } as Perfume;
      
      console.log(`\n📝 Procesando: ${perfume.name || perfume.id}`);

      try {
        const updates: any = {};

        // Si tiene descripción original pero no tiene descriptionEs, traducir a español
        if (perfume.description && !perfume.descriptionEs) {
          console.log('  → Traduciendo descripción a español...');
          const descriptionEs = await translateText(perfume.description, 'es');
          updates.descriptionEs = descriptionEs;
          translated++;
          
          // Pequeño delay para evitar rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else if (perfume.descriptionEs) {
          console.log('  ✓ Ya tiene descripción en español');
        }

        // Si tiene descripción original pero no tiene descriptionEn, guardar como descriptionEn
        if (perfume.description && !perfume.descriptionEn) {
          updates.descriptionEn = perfume.description; // La original ya está en inglés
          console.log('  ✓ Guardando descripción original como inglés');
        } else if (perfume.descriptionEn) {
          console.log('  ✓ Ya tiene descripción en inglés');
        }

        // Si no tiene descripción original pero tiene alguna traducción, saltar
        if (!perfume.description && (perfume.descriptionEs || perfume.descriptionEn)) {
          console.log('  ⏭️  Saltando (sin descripción original)');
          skipped++;
          continue;
        }

        // Si no tiene descripción en absoluto, saltar
        if (!perfume.description) {
          console.log('  ⏭️  Saltando (sin descripción)');
          skipped++;
          continue;
        }

        // Actualizar en Firestore si hay cambios
        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'perfumes', perfume.id), updates);
          console.log('  ✅ Actualizado en Firestore');
        } else {
          console.log('  ⏭️  Sin cambios necesarios');
          skipped++;
        }

      } catch (error: any) {
        console.error(`  ❌ Error procesando perfume ${perfume.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n\n📊 Resumen:');
    console.log(`  ✅ Traducidos: ${translated}`);
    console.log(`  ⏭️  Saltados: ${skipped}`);
    console.log(`  ❌ Errores: ${errors}`);
    console.log('\n🎉 Proceso completado!');

  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  }
};

// Ejecutar
translatePerfumeDescriptions()
  .then(() => {
    console.log('\n✅ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el script:', error);
    process.exit(1);
  });

