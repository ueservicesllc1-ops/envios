import { collection, addDoc, updateDoc, deleteDoc, getDocs, getDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Seller } from '../types';

// Función para generar un slug único desde el nombre
export function generateSlug(name: string): string {
  // Obtener el primer nombre (primera palabra)
  const firstName = name.trim().split(' ')[0].toLowerCase();
  
  // Remover acentos y caracteres especiales
  return firstName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
    .replace(/[^a-z0-9]/g, '') // Remover caracteres no alfanuméricos
    .toLowerCase();
}

// Función para generar un slug único verificando que no exista
async function generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
  let baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const q = query(
      collection(db, 'sellers'),
      where('slug', '==', slug)
    );
    const snapshot = await getDocs(q);
    
    // Verificar si existe y no es el mismo vendedor
    const exists = snapshot.docs.some(doc => doc.id !== excludeId);
    
    if (!exists) {
      return slug;
    }
    
    // Si existe, agregar un número
    slug = `${baseSlug}${counter}`;
    counter++;
  }
}

export const sellerService = {
  // Crear nuevo vendedor
  async create(sellerData: Omit<Seller, 'id' | 'createdAt'>): Promise<string> {
    try {
      // Generar slug único si no existe
      const slug = sellerData.slug || await generateUniqueSlug(sellerData.name);
      
      const docRef = await addDoc(collection(db, 'sellers'), {
        ...sellerData,
        slug,
        createdAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating seller:', error);
      throw error;
    }
  },

  // Obtener todos los vendedores
  async getAll(): Promise<Seller[]> {
    try {
      const q = query(collection(db, 'sellers'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastDeliveryDate: doc.data().lastDeliveryDate?.toDate() || undefined
      })) as Seller[];
    } catch (error) {
      console.error('Error getting sellers:', error);
      throw error;
    }
  },

  // Obtener vendedor por ID
  async getById(id: string): Promise<Seller | null> {
    try {
      const sellerRef = doc(db, 'sellers', id);
      const sellerSnap = await getDoc(sellerRef);
      
      if (sellerSnap.exists()) {
        return {
          id: sellerSnap.id,
          ...sellerSnap.data(),
          createdAt: sellerSnap.data().createdAt?.toDate() || new Date(),
          lastDeliveryDate: sellerSnap.data().lastDeliveryDate?.toDate() || undefined
        } as Seller;
      }
      return null;
    } catch (error) {
      console.error('Error getting seller by ID:', error);
      throw error;
    }
  },

  // Actualizar vendedor
  async update(id: string, sellerData: Partial<Seller>): Promise<void> {
    try {
      const sellerRef = doc(db, 'sellers', id);
      // Filtrar campos undefined para evitar errores de Firebase
      let cleanData = Object.fromEntries(
        Object.entries(sellerData).filter(([_, value]) => value !== undefined)
      );
      
      // Si se actualiza el nombre, generar nuevo slug si no existe
      if (sellerData.name && !cleanData.slug) {
        const currentSeller = await this.getById(id);
        if (currentSeller) {
          cleanData.slug = await generateUniqueSlug(sellerData.name, id);
        }
      }
      
      await updateDoc(sellerRef, cleanData);
    } catch (error) {
      console.error('Error updating seller:', error);
      throw error;
    }
  },

  // Obtener vendedor por slug
  async getBySlug(slug: string): Promise<Seller | null> {
    try {
      const q = query(
        collection(db, 'sellers'),
        where('slug', '==', slug)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          lastDeliveryDate: doc.data().lastDeliveryDate?.toDate() || undefined
        } as Seller;
      }
      return null;
    } catch (error) {
      console.error('Error getting seller by slug:', error);
      throw error;
    }
  },

  // Buscar vendedor por nombre (fallback si no hay slug)
  async getByName(name: string): Promise<Seller | null> {
    try {
      console.log('🔍 Buscando vendedor por nombre:', name);
      const allSellers = await this.getAll();
      console.log('📋 Total vendedores:', allSellers.length);
      
      // Buscar vendedor cuyo slug generado coincida o cuyo nombre empiece con el slug proporcionado
      const normalizedSlug = name.toLowerCase().trim();
      console.log('🔍 Slug normalizado para búsqueda:', normalizedSlug);
      
      // Log de todos los vendedores para debug
      console.log('📋 Vendedores a revisar:', allSellers.map(s => ({
        name: s.name,
        slug: s.slug || generateSlug(s.name),
        firstName: s.name.trim().split(' ')[0].toLowerCase()
      })));
      
      const foundSeller = allSellers.find(seller => {
        const sellerSlug = seller.slug || generateSlug(seller.name);
        const sellerFirstName = seller.name.trim().split(' ')[0].toLowerCase();
        const sellerNameLower = seller.name.toLowerCase();
        
        // Pruebas múltiples de coincidencia
        const exactSlugMatch = sellerSlug === normalizedSlug;
        const exactFirstNameMatch = sellerFirstName === normalizedSlug;
        const firstNameStarts = sellerFirstName.startsWith(normalizedSlug);
        const slugStarts = normalizedSlug.startsWith(sellerFirstName);
        const nameContains = sellerNameLower.includes(normalizedSlug);
        const slugContains = sellerSlug.includes(normalizedSlug);
        // Permitir que "luis" encuentre "luisuf" (el slug contiene el término de búsqueda)
        const searchContainsSlug = normalizedSlug.length >= 3 && sellerSlug.includes(normalizedSlug);
        const searchContainsFirstName = normalizedSlug.length >= 3 && sellerFirstName.includes(normalizedSlug);
        
        const matches = exactSlugMatch || 
               exactFirstNameMatch || 
               firstNameStarts ||
               slugStarts ||
               nameContains ||
               slugContains ||
               searchContainsSlug ||
               searchContainsFirstName;
        
        if (matches) {
          console.log('✅ Coincidencia encontrada:', {
            name: seller.name,
            slug: sellerSlug,
            firstName: sellerFirstName,
            searchSlug: normalizedSlug,
            matches: {
              exactSlug: exactSlugMatch,
              exactFirstName: exactFirstNameMatch,
              firstNameStarts,
              slugStarts,
              nameContains,
              slugContains
            }
          });
        }
        
        return matches;
      });
      
      if (foundSeller) {
        console.log('✅ Vendedor encontrado por nombre:', foundSeller.name);
      } else {
        console.log('❌ No se encontró vendedor con nombre/slug:', normalizedSlug);
      }
      
      return foundSeller || null;
    } catch (error) {
      console.error('Error getting seller by name:', error);
      return null;
    }
  },

  // Eliminar vendedor
  async delete(id: string): Promise<void> {
    try {
      const sellerRef = doc(db, 'sellers', id);
      await deleteDoc(sellerRef);
    } catch (error) {
      console.error('Error deleting seller:', error);
      throw error;
    }
  },

  // Generar slugs para vendedores que no lo tengan
  async generateMissingSlugs(): Promise<number> {
    try {
      const allSellers = await this.getAll();
      let count = 0;

      for (const seller of allSellers) {
        if (!seller.slug) {
          const slug = await generateUniqueSlug(seller.name, seller.id);
          await this.update(seller.id, { slug });
          count++;
        }
      }

      return count;
    } catch (error) {
      console.error('Error generating missing slugs:', error);
      throw error;
    }
  }
};
