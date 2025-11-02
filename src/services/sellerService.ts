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
      const allSellers = await this.getAll();
      // Buscar vendedor cuyo slug generado coincida o cuyo nombre empiece con el slug proporcionado
      const normalizedSlug = name.toLowerCase().trim();
      const foundSeller = allSellers.find(seller => {
        const sellerSlug = seller.slug || generateSlug(seller.name);
        const sellerFirstName = seller.name.trim().split(' ')[0].toLowerCase();
        return sellerSlug === normalizedSlug || 
               sellerFirstName === normalizedSlug || 
               sellerFirstName.startsWith(normalizedSlug) ||
               normalizedSlug.startsWith(sellerFirstName);
      });
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
