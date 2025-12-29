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
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Product } from '../types';
import toast from 'react-hot-toast';

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

export const productService = {
  // Crear producto
  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = new Date();
      // Filtrar campos undefined (Firestore no los acepta)
      const productData: any = {};
      Object.keys(product).forEach(key => {
        const value = (product as any)[key];
        if (value !== undefined) {
          productData[key] = value;
        }
      });

      const docRef = await addDoc(collection(db, 'products'), {
        ...productData,
        createdAt: convertToTimestamp(now),
        updatedAt: convertToTimestamp(now)
      });

      toast.success('Producto creado exitosamente');
      return docRef.id;
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Error al crear el producto');
      throw error;
    }
  },

  // Actualizar producto
  async update(id: string, product: Partial<Product>): Promise<void> {
    try {
      const docRef = doc(db, 'products', id);
      // Filtrar campos undefined (Firestore no los acepta)
      const updateData: any = {};
      Object.keys(product).forEach(key => {
        const value = (product as any)[key];
        if (value !== undefined) {
          updateData[key] = value;
        }
      });

      await updateDoc(docRef, {
        ...updateData,
        updatedAt: convertToTimestamp(new Date())
      });

      toast.success('Producto actualizado exitosamente');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Error al actualizar el producto');
      throw error;
    }
  },

  // Eliminar producto
  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Producto eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar el producto');
      throw error;
    }
  },

  // Obtener producto por ID
  async getById(id: string): Promise<Product | null> {
    try {
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt)
        } as Product;
      }
      return null;
    } catch (error) {
      console.error('Error getting product:', error);
      toast.error('Error al obtener el producto');
      throw error;
    }
  },

  // Obtener todos los productos
  async getAll(): Promise<Product[]> {
    try {
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        updatedAt: convertTimestamp(doc.data().updatedAt)
      })) as Product[];
    } catch (error) {
      console.error('Error getting products:', error);
      toast.error('Error al cargar los productos');
      throw error;
    }
  },

  // Buscar producto por SKU en la base de datos
  async getBySku(sku: string): Promise<Product | null> {
    try {
      const q = query(
        collection(db, 'products'),
        where('sku', '==', sku)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt)
        } as Product;
      }
      return null;
    } catch (error) {
      console.error('Error searching product by SKU:', error);
      throw error;
    }
  },

  // Deshacer consolidación
  async unconsolidate(parentId: string): Promise<void> {
    try {
      const parentRef = doc(db, 'products', parentId);
      const parentSnap = await getDoc(parentRef);

      if (!parentSnap.exists()) throw new Error('Producto no encontrado');

      const parentData = parentSnap.data() as Product;

      // Batch para atomicidad
      const batch = writeBatch(db);

      // 1. Limpiar hijos (si existen en la lista)
      if (parentData.consolidatedProducts && parentData.consolidatedProducts.length > 0) {
        parentData.consolidatedProducts.forEach(childId => {
          const childRef = doc(db, 'products', childId);
          batch.update(childRef, {
            parentConsolidatedId: deleteField()
          });
        });
      }

      // 2. Limpiar padre
      batch.update(parentRef, {
        isConsolidated: false,
        consolidatedProducts: []
      });

      await batch.commit();
      toast.success('Consolidación deshecha correctamente');
    } catch (error) {
      console.error('Error undoing consolidation:', error);
      toast.error('Error al deshacer consolidación');
      throw error;
    }
  }
};
