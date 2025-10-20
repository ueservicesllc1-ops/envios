import { collection, addDoc, updateDoc, deleteDoc, getDocs, getDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Seller } from '../types';

export const sellerService = {
  // Crear nuevo vendedor
  async create(sellerData: Omit<Seller, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'sellers'), {
        ...sellerData,
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
      const cleanData = Object.fromEntries(
        Object.entries(sellerData).filter(([_, value]) => value !== undefined)
      );
      await updateDoc(sellerRef, cleanData);
    } catch (error) {
      console.error('Error updating seller:', error);
      throw error;
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
  }
};
