import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs, 
  query, 
  orderBy,
  where,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Perfume } from '../types';
import toast from 'react-hot-toast';

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

export const perfumeService = {
  // Crear perfume
  async create(perfume: Omit<Perfume, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = new Date();
      
      const docRef = await addDoc(collection(db, 'perfumes'), {
        ...perfume,
        createdAt: convertToTimestamp(now),
        updatedAt: convertToTimestamp(now)
      });
      
      toast.success('Perfume creado exitosamente');
      return docRef.id;
    } catch (error) {
      console.error('Error creating perfume:', error);
      toast.error('Error al crear el perfume');
      throw error;
    }
  },

  // Actualizar perfume
  async update(id: string, perfume: Partial<Perfume>): Promise<void> {
    try {
      const docRef = doc(db, 'perfumes', id);
      
      await updateDoc(docRef, {
        ...perfume,
        updatedAt: convertToTimestamp(new Date())
      });
      
      toast.success('Perfume actualizado exitosamente');
    } catch (error) {
      console.error('Error updating perfume:', error);
      toast.error('Error al actualizar el perfume');
      throw error;
    }
  },

  // Eliminar perfume
  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'perfumes', id));
      toast.success('Perfume eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting perfume:', error);
      toast.error('Error al eliminar el perfume');
      throw error;
    }
  },

  // Obtener perfume por ID
  async getById(id: string): Promise<Perfume | null> {
    try {
      const docRef = doc(db, 'perfumes', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt)
        } as Perfume;
      }
      return null;
    } catch (error) {
      console.error('Error getting perfume:', error);
      toast.error('Error al obtener el perfume');
      throw error;
    }
  },

  // Obtener todos los perfumes
  async getAll(): Promise<Perfume[]> {
    try {
      const q = query(collection(db, 'perfumes'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        updatedAt: convertTimestamp(doc.data().updatedAt)
      })) as Perfume[];
    } catch (error) {
      console.error('Error getting perfumes:', error);
      toast.error('Error al cargar los perfumes');
      throw error;
    }
  },

  // Obtener perfumes activos (para la tienda)
  // Filtra por isActive y por marcas permitidas en settings
  async getActive(): Promise<Perfume[]> {
    try {
      // Obtener configuración de marcas permitidas
      const { perfumeSettingsService } = await import('./perfumeSettingsService');
      const settings = await perfumeSettingsService.getSettings();
      const allowedBrands = settings.allowedBrands;

      // Simplificar la consulta para evitar índice compuesto
      // Primero obtener todos y filtrar por isActive en memoria
      const q = query(collection(db, 'perfumes'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt)
          } as Perfume;
        })
        .filter(perfume => {
          // Filtrar por isActive
          if (perfume.isActive !== true) return false;
          
          // Si hay marcas permitidas configuradas, filtrar por ellas
          // Si no hay marcas configuradas, mostrar todas (comportamiento por defecto)
          if (allowedBrands.length > 0) {
            return allowedBrands.includes(perfume.brand);
          }
          
          return true;
        })
        .sort((a, b) => {
          // Ordenar por marca y luego por fecha
          if (a.brand !== b.brand) {
            return a.brand.localeCompare(b.brand);
          }
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
    } catch (error) {
      console.error('Error getting active perfumes:', error);
      toast.error('Error al cargar los perfumes activos');
      throw error;
    }
  },

  // Obtener perfumes por marca
  async getByBrand(brand: string): Promise<Perfume[]> {
    try {
      const q = query(
        collection(db, 'perfumes'),
        where('brand', '==', brand),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        updatedAt: convertTimestamp(doc.data().updatedAt)
      })) as Perfume[];
    } catch (error) {
      console.error('Error getting perfumes by brand:', error);
      toast.error('Error al cargar los perfumes por marca');
      throw error;
    }
  },

  // Obtener perfumes por colección
  async getByCollection(collectionName: string): Promise<Perfume[]> {
    try {
      const q = query(
        collection(db, 'perfumes'),
        where('collection', '==', collectionName),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt)
        } as Perfume;
      });
    } catch (error) {
      console.error('Error getting perfumes by collection:', error);
      toast.error('Error al cargar los perfumes por colección');
      throw error;
    }
  },

  // Crear múltiples perfumes (para importación masiva)
  // Usa writeBatch para mejor rendimiento (máximo 500 operaciones por batch)
  async createBatch(perfumes: Omit<Perfume, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<string[]> {
    try {
      const now = new Date();
      const ids: string[] = [];
      const BATCH_SIZE = 500; // Firestore limita a 500 operaciones por batch
      
      // Procesar en lotes de 500
      for (let i = 0; i < perfumes.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const batchPerfumes = perfumes.slice(i, i + BATCH_SIZE);
        
        for (const perfume of batchPerfumes) {
          const docRef = doc(collection(db, 'perfumes'));
          ids.push(docRef.id);
          
          batch.set(docRef, {
            ...perfume,
            createdAt: convertToTimestamp(now),
            updatedAt: convertToTimestamp(now)
          });
        }
        
        await batch.commit();
        console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} completado: ${batchPerfumes.length} perfumes`);
      }
      
      toast.success(`${perfumes.length} perfumes creados exitosamente`);
      return ids;
    } catch (error) {
      console.error('Error creating perfumes batch:', error);
      toast.error('Error al crear los perfumes');
      throw error;
    }
  }
};

