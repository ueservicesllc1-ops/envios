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
import { ExitNote } from '../types';
import { exitNoteAccountingService } from './exitNoteAccountingService';
import { sellerInventoryService } from './sellerInventoryService';
import { productService } from './productService';
import toast from 'react-hot-toast';

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);


export const exitNoteService = {
  // Crear nota de salida
  async create(note: Omit<ExitNote, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'exitNotes'), {
        ...note,
        date: convertToTimestamp(note.date),
        createdAt: convertToTimestamp(note.createdAt)
      });
      
      // Registrar venta en contabilidad automáticamente
      try {
        await exitNoteAccountingService.create({
          noteNumber: note.number,
          sellerName: note.seller,
          totalValue: note.totalPrice,
          date: note.date,
          status: note.status,
          notes: `Venta a vendedor - ${note.seller}`
        });
      } catch (accountingError) {
        console.error('Error creating accounting entry:', accountingError);
        // No lanzar error para no interrumpir la creación de la nota
      }
      
      toast.success('Nota de salida creada exitosamente');
      return docRef.id;
    } catch (error) {
      console.error('Error creating exit note:', error);
      toast.error('Error al crear la nota de salida');
      throw error;
    }
  },

  // Actualizar nota de salida
  async update(id: string, note: Partial<ExitNote>): Promise<void> {
    try {
      const docRef = doc(db, 'exitNotes', id);
      const updateData: any = { ...note };
      if (note.date) {
        updateData.date = convertToTimestamp(note.date);
      }
      if (note.createdAt) {
        updateData.createdAt = convertToTimestamp(note.createdAt);
      }
      if (note.receivedAt) {
        updateData.receivedAt = convertToTimestamp(note.receivedAt);
      }
      await updateDoc(docRef, updateData);
      
      // Si se marca como entregada, actualizar inventario del vendedor
      if (note.status === 'delivered') {
        try {
          // Obtener la nota de salida completa
          const noteDoc = await getDoc(docRef);
          if (noteDoc.exists()) {
            const noteData = noteDoc.data();
            
            // Agregar productos al inventario del vendedor
            for (const item of noteData.items) {
              const product = await productService.getById(item.productId);
              if (product) {
                await sellerInventoryService.addToSellerInventory(
                  noteData.sellerId,
                  item.productId,
                  product,
                  item.quantity
                );
              }
            }
          }
        } catch (inventoryError) {
          console.error('Error updating seller inventory:', inventoryError);
          // No lanzar error aquí para no interrumpir la actualización de la nota
        }
      }
      
      toast.success('Nota de salida actualizada exitosamente');
    } catch (error) {
      console.error('Error updating exit note:', error);
      toast.error('Error al actualizar la nota de salida');
      throw error;
    }
  },

  // Eliminar nota de salida
  async delete(id: string): Promise<void> {
    try {
      // Primero obtener la nota de salida para devolver productos al inventario
      const exitNote = await this.getById(id);
      if (!exitNote) {
        throw new Error('Nota de salida no encontrada');
      }

      // Devolver productos al inventario
      const { inventoryService } = await import('./inventoryService');
      for (const item of exitNote.items) {
        // Obtener el producto para calcular el costo unitario
        const product = await productService.getById(item.productId);
        if (product) {
          // Agregar stock de vuelta al inventario
          await inventoryService.updateStockAfterEntry(
            item.productId,
            item.quantity,
            product.cost,
            product.salePrice1
          );
        }
      }

      // Eliminar la nota de salida
      const docRef = doc(db, 'exitNotes', id);
      await deleteDoc(docRef);
      
      // Eliminar entrada de contabilidad asociada
      try {
        await exitNoteAccountingService.deleteByExitNoteId(id);
      } catch (error) {
        console.warn('No se pudo eliminar la entrada de contabilidad:', error);
      }

      // Eliminar el paquete de envío asociado si existe
      if (exitNote.shippingId) {
        try {
          const { shippingService } = await import('./shippingService');
          await shippingService.delete(exitNote.shippingId);
          console.log('Paquete de envío eliminado:', exitNote.shippingId);
        } catch (error) {
          console.warn('No se pudo eliminar el paquete de envío:', error);
        }
      }
      
      toast.success('Nota de salida eliminada exitosamente y productos devueltos al inventario');
    } catch (error) {
      console.error('Error deleting exit note:', error);
      toast.error('Error al eliminar la nota de salida');
      throw error;
    }
  },

  // Obtener todas las notas de salida
  async getAll(): Promise<ExitNote[]> {
    try {
      const q = query(collection(db, 'exitNotes'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: convertTimestamp(doc.data().date),
        receivedAt: doc.data().receivedAt ? convertTimestamp(doc.data().receivedAt) : undefined,
        createdAt: convertTimestamp(doc.data().createdAt)
      })) as ExitNote[];
    } catch (error) {
      console.error('Error getting exit notes:', error);
      toast.error('Error al cargar las notas de salida');
      throw error;
    }
  },

  // Obtener notas de salida por vendedor
  async getBySeller(sellerId: string): Promise<ExitNote[]> {
    try {
      // Por ahora, obtener todas las notas y filtrar en el cliente
      // para evitar el error de índice compuesto
      const q = query(collection(db, 'exitNotes'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const allNotes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: convertTimestamp(doc.data().date),
        createdAt: convertTimestamp(doc.data().createdAt)
      })) as ExitNote[];

      // Filtrar por sellerId en el cliente
      return allNotes.filter(note => note.sellerId === sellerId);
    } catch (error) {
      console.error('Error getting exit notes by seller:', error);
      toast.error('Error al cargar las notas de salida del vendedor');
      throw error;
    }
  },

  // Obtener nota de salida por ID
  async getById(id: string): Promise<ExitNote | null> {
    try {
      const docRef = doc(db, 'exitNotes', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          date: convertTimestamp(data.date),
          createdAt: convertTimestamp(data.createdAt)
        } as ExitNote;
      }
      return null;
    } catch (error) {
      console.error('Error getting exit note:', error);
      toast.error('Error al obtener la nota de salida');
      throw error;
    }
  }
};
