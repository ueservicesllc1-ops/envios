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

      // Determinar ubicación basada en el número de nota
      const isEcuadorNote = exitNote.number?.includes('ECU') || exitNote.number?.startsWith('NS-ECU-');
      const location = isEcuadorNote ? 'Bodega Ecuador' : 'Bodega Principal';

      for (const item of exitNote.items) {
        // Obtener el producto para calcular el costo unitario
        const product = await productService.getById(item.productId);
        if (product) {
          // Agregar stock de vuelta al inventario
          await inventoryService.updateStockAfterEntry(
            item.productId,
            item.quantity,
            product.cost,
            product.salePrice1,
            location
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
  },

  // Cambiar vendedor de una nota de salida
  async changeSeller(
    noteId: string,
    newSellerId: string,
    newSeller: { id: string; name: string; email: string; address?: string; city?: string; phone?: string; priceType?: string }
  ): Promise<void> {
    try {
      // Obtener la nota de salida actual
      const currentNote = await this.getById(noteId);
      if (!currentNote) {
        throw new Error('Nota de salida no encontrada');
      }

      const oldSellerId = currentNote.sellerId;

      // Obtener todos los productos para actualizar precios
      const allProducts = await productService.getAll();
      const productMap = new Map(allProducts.map(p => [p.id, p]));

      // Actualizar precios de los items según el nuevo vendedor
      const updatedItems = currentNote.items.map(item => {
        const product = productMap.get(item.productId);
        if (!product) return item;

        // Calcular nuevo precio según el tipo de precio del vendedor
        const newUnitPrice = newSeller.priceType === 'price2'
          ? product.salePrice2
          : product.salePrice1;

        return {
          ...item,
          unitPrice: newUnitPrice,
          totalPrice: item.quantity * newUnitPrice
        };
      });

      // Recalcular precio total
      const newTotalPrice = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);

      // Actualizar la nota de salida
      await this.update(noteId, {
        sellerId: newSellerId,
        seller: newSeller.name,
        customer: newSeller.name,
        items: updatedItems,
        totalPrice: newTotalPrice
      });

      // Actualizar el paquete de envío asociado si existe
      if (currentNote.shippingId) {
        const { shippingService } = await import('./shippingService');
        await shippingService.update(currentNote.shippingId, {
          recipient: newSeller.name,
          sellerId: newSellerId,
          address: newSeller.address || 'Dirección no especificada',
          city: newSeller.city || 'Ciudad no especificada',
          phone: newSeller.phone || 'Teléfono no especificado'
        });
      }

      // Transferir productos del inventario del vendedor anterior al nuevo
      // 1. Obtener productos del inventario del vendedor anterior
      const oldSellerInventory = await sellerInventoryService.getBySeller(oldSellerId);

      // 2. Para cada producto de la nota, transferirlo al nuevo vendedor
      for (const noteItem of currentNote.items) {
        const product = productMap.get(noteItem.productId);
        if (!product) continue;

        // Buscar items en el inventario del vendedor anterior que correspondan a este producto
        const oldItems = oldSellerInventory.filter(item => item.productId === noteItem.productId);

        // Calcular cantidad total a transferir
        let quantityToTransfer = noteItem.quantity;

        // Si hay items en el inventario anterior, eliminarlos
        for (const oldItem of oldItems) {
          if (quantityToTransfer > 0) {
            const quantityToRemove = Math.min(oldItem.quantity, quantityToTransfer);

            if (quantityToRemove === oldItem.quantity) {
              // Eliminar completamente el item
              await sellerInventoryService.delete(oldItem.id);
            } else {
              // Reducir la cantidad del item
              await sellerInventoryService.updateQuantity(
                oldItem.id,
                oldItem.quantity - quantityToRemove
              );
            }

            quantityToTransfer -= quantityToRemove;
          }
        }

        // Agregar al inventario del nuevo vendedor con el nuevo precio
        // Usar el precio del nuevo vendedor
        const newUnitPrice = newSeller.priceType === 'price2'
          ? product.salePrice2
          : product.salePrice1;

        await sellerInventoryService.addToSellerInventory(
          newSellerId,
          noteItem.productId,
          product,
          noteItem.quantity,
          newUnitPrice // Pasar el precio unitario correcto
        );
      }

      // Actualizar entrada de contabilidad si existe
      try {
        const { exitNoteAccountingService } = await import('./exitNoteAccountingService');
        const accountingEntries = await exitNoteAccountingService.getByNoteNumber(currentNote.number);
        if (accountingEntries.length > 0) {
          for (const entry of accountingEntries) {
            await exitNoteAccountingService.update(entry.id, {
              sellerName: newSeller.name,
              totalValue: newTotalPrice
            });
          }
        }
      } catch (accountingError) {
        console.warn('No se pudo actualizar la entrada de contabilidad:', accountingError);
      }

      toast.success(`Vendedor cambiado de ${currentNote.seller} a ${newSeller.name} exitosamente`);
    } catch (error) {
      console.error('Error changing seller:', error);
      toast.error('Error al cambiar el vendedor');
      throw error;
    }
  }
};
