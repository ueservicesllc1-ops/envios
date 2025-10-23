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
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { shippingAccountingService } from './shippingAccountingService';
import { inventoryService } from './inventoryService';
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
  sellerId?: string; // ID del vendedor asociado
  items?: any[]; // Productos asociados al paquete
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
      
      // Si se marca como entregado, actualizar la nota de salida correspondiente
      if (pkg.status === 'delivered') {
        await this.updateExitNoteStatus(id);
      }
      
      toast.success('Envío actualizado exitosamente');
    } catch (error) {
      console.error('Error updating shipping package:', error);
      toast.error('Error al actualizar el envío');
      throw error;
    }
  },

  // Actualizar el estado de la nota de salida cuando el paquete se entrega
  async updateExitNoteStatus(shippingId: string): Promise<void> {
    try {
      // Buscar la nota de salida que corresponde a este envío
      const exitNotesQuery = query(
        collection(db, 'exitNotes'),
        where('shippingId', '==', shippingId)
      );
      const exitNotesSnapshot = await getDocs(exitNotesQuery);
      
      if (!exitNotesSnapshot.empty) {
        const exitNoteDoc = exitNotesSnapshot.docs[0];
        const exitNoteRef = doc(db, 'exitNotes', exitNoteDoc.id);
        
        // Actualizar el estado de la nota de salida a 'delivered'
        await updateDoc(exitNoteRef, {
          status: 'delivered',
          deliveredAt: Timestamp.now()
        });
        
        // Actualizar el inventario del vendedor: cambiar productos de "in-transit" a "stock"
        const exitNoteData = exitNoteDoc.data();
        if (exitNoteData.sellerId) {
          try {
            const { sellerInventoryService } = await import('./sellerInventoryService');
            for (const item of exitNoteData.items) {
              await sellerInventoryService.updateStatusToDelivered(
                exitNoteData.sellerId,
                item.productId,
                item.quantity
              );
            }
            console.log('Inventario del vendedor actualizado a stock:', exitNoteData.sellerId);
          } catch (error) {
            console.error('Error updating seller inventory:', error);
          }
        }
        
        console.log('Nota de salida actualizada a entregada:', exitNoteDoc.id);
      }
    } catch (error) {
      console.error('Error updating exit note status:', error);
      // No lanzar error para no interrumpir la actualización del envío
    }
  },

  // Eliminar envío
  async delete(id: string): Promise<void> {
    try {
      // Eliminar entrada de contabilidad asociada
      try {
        await shippingAccountingService.deleteByShippingId(id);
      } catch (error) {
        console.warn('No se pudo eliminar la entrada de contabilidad:', error);
      }

      const docRef = doc(db, 'shipping', id);
      await deleteDoc(docRef);
      
      toast.success('Envío eliminado exitosamente y entrada de contabilidad actualizada');
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
  },

  // Limpiar paquetes de envío huérfanos (sin nota de salida asociada)
  async cleanOrphanedPackages(): Promise<void> {
    try {
      console.log('Limpiando paquetes de envío huérfanos...');
      
      // Obtener todos los paquetes de envío
      const allPackages = await this.getAll();
      
      // Obtener todas las notas de salida
      const { exitNoteService } = await import('./exitNoteService');
      const allExitNotes = await exitNoteService.getAll();
      
      // Crear un set de shippingIds que están asociados a notas de salida
      const associatedShippingIds = new Set(
        allExitNotes
          .filter(note => note.shippingId)
          .map(note => note.shippingId)
      );
      
      // Encontrar paquetes huérfanos
      const orphanedPackages = allPackages.filter(pkg => 
        !associatedShippingIds.has(pkg.id)
      );
      
      console.log(`Encontrados ${orphanedPackages.length} paquetes huérfanos`);
      
      // Eliminar paquetes huérfanos
      for (const pkg of orphanedPackages) {
        await this.delete(pkg.id);
        console.log(`Eliminado paquete huérfano: ${pkg.id}`);
      }
      
      console.log(`Limpieza completada: ${orphanedPackages.length} paquetes eliminados`);
    } catch (error) {
      console.error('Error limpiando paquetes huérfanos:', error);
      throw error;
    }
  }
};
