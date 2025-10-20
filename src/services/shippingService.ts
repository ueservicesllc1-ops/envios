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
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { shippingAccountingService } from './shippingAccountingService';
import toast from 'react-hot-toast';

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

export interface ShippingPackage {
  id: string;
  trackingNumber?: string;
  recipient: string;
  address: string;
  city: string;
  phone: string;
  weight: number;
  dimensions: string;
  status: 'pending' | 'in-transit' | 'delivered' | 'returned';
  shippingDate: Date;
  deliveryDate?: Date;
  deliveredAt?: Date;
  notes?: string;
  cost: number;
}

export const shippingService = {
  // Crear envío
  async create(pkg: Omit<ShippingPackage, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'shipping'), {
        ...pkg,
        shippingDate: convertToTimestamp(pkg.shippingDate),
        deliveryDate: pkg.deliveryDate ? convertToTimestamp(pkg.deliveryDate) : null,
        deliveredAt: pkg.deliveredAt ? convertToTimestamp(pkg.deliveredAt) : null
      });
      
      // Registrar gasto en contabilidad automáticamente
      try {
        await shippingAccountingService.create({
          trackingNumber: pkg.trackingNumber,
          recipient: pkg.recipient,
          cost: pkg.cost,
          date: pkg.shippingDate,
          status: pkg.status,
          notes: `Gasto de envío - ${pkg.recipient}`
        });
      } catch (accountingError) {
        console.error('Error creating accounting entry:', accountingError);
        // No lanzar error para no interrumpir la creación del envío
      }
      
      toast.success('Envío creado exitosamente');
      return docRef.id;
    } catch (error) {
      console.error('Error creating shipping package:', error);
      toast.error('Error al crear el envío');
      throw error;
    }
  },

  // Actualizar envío
  async update(id: string, pkg: Partial<ShippingPackage>): Promise<void> {
    try {
      const docRef = doc(db, 'shipping', id);
      const updateData: any = { ...pkg };
      if (pkg.shippingDate) {
        updateData.shippingDate = convertToTimestamp(pkg.shippingDate);
      }
      if (pkg.deliveryDate) {
        updateData.deliveryDate = convertToTimestamp(pkg.deliveryDate);
      }
      if (pkg.deliveredAt) {
        updateData.deliveredAt = convertToTimestamp(pkg.deliveredAt);
      }
      await updateDoc(docRef, updateData);
      
      toast.success('Envío actualizado exitosamente');
    } catch (error) {
      console.error('Error updating shipping package:', error);
      toast.error('Error al actualizar el envío');
      throw error;
    }
  },

  // Eliminar envío
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'shipping', id);
      await deleteDoc(docRef);
      
      toast.success('Envío eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting shipping package:', error);
      toast.error('Error al eliminar el envío');
      throw error;
    }
  },

  // Obtener todos los envíos
  async getAll(): Promise<ShippingPackage[]> {
    try {
      const q = query(collection(db, 'shipping'), orderBy('shippingDate', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        shippingDate: convertTimestamp(doc.data().shippingDate),
        deliveryDate: doc.data().deliveryDate ? convertTimestamp(doc.data().deliveryDate) : undefined,
        deliveredAt: doc.data().deliveredAt ? convertTimestamp(doc.data().deliveredAt) : undefined
      })) as ShippingPackage[];
    } catch (error) {
      console.error('Error getting shipping packages:', error);
      toast.error('Error al cargar los envíos');
      throw error;
    }
  },

  // Obtener envío por ID
  async getById(id: string): Promise<ShippingPackage | null> {
    try {
      const docRef = doc(db, 'shipping', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          shippingDate: convertTimestamp(data.shippingDate),
          deliveryDate: data.deliveryDate ? convertTimestamp(data.deliveryDate) : undefined
        } as ShippingPackage;
      }
      return null;
    } catch (error) {
      console.error('Error getting shipping package:', error);
      toast.error('Error al obtener el envío');
      throw error;
    }
  }
};
