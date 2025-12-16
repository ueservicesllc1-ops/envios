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
import { Return } from '../types';
import { sellerInventoryService } from './sellerInventoryService';
import { inventoryService } from './inventoryService';
import { sellerService } from './sellerService';
import toast from 'react-hot-toast';

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

export const returnService = {
  // Crear solicitud de devolución
  async create(returnData: Omit<Return, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'returns'), {
        ...returnData,
        createdAt: convertToTimestamp(returnData.createdAt)
      });
      
      toast.success('Solicitud de devolución creada exitosamente');
      return docRef.id;
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('Error al crear la solicitud de devolución');
      throw error;
    }
  },

  // Actualizar devolución
  async update(id: string, returnData: Partial<Return>): Promise<void> {
    try {
      const docRef = doc(db, 'returns', id);
      const updateData: any = { ...returnData };
      
      if (returnData.createdAt) {
        updateData.createdAt = convertToTimestamp(returnData.createdAt);
      }
      if (returnData.approvedAt) {
        updateData.approvedAt = convertToTimestamp(returnData.approvedAt);
      }
      if (returnData.rejectedAt) {
        updateData.rejectedAt = convertToTimestamp(returnData.rejectedAt);
      }
      
      await updateDoc(docRef, updateData);
      toast.success('Devolución actualizada exitosamente');
    } catch (error) {
      console.error('Error updating return:', error);
      toast.error('Error al actualizar la devolución');
      throw error;
    }
  },

  // Aprobar devolución
  async approve(id: string, approvedBy: string): Promise<void> {
    try {
      const returnDoc = await this.getById(id);
      if (!returnDoc) {
        throw new Error('Devolución no encontrada');
      }

      if (returnDoc.status !== 'pending') {
        throw new Error('Solo se pueden aprobar devoluciones pendientes');
      }

      // Marcar productos como devueltos en el inventario del vendedor (no remover)
      for (const item of returnDoc.items) {
        await sellerInventoryService.markAsReturned(
          returnDoc.sellerId,
          item.productId,
          item.quantity
        );
      }

      // Agregar productos a la bodega Ecuador
      for (const item of returnDoc.items) {
        const product = item.product;
        await inventoryService.updateStockAfterEntry(
          item.productId,
          item.quantity,
          product.cost || 0,
          item.unitPrice
        );

        // Actualizar la ubicación a Ecuador
        const inventoryItem = await inventoryService.getByProductId(item.productId);
        if (inventoryItem) {
          await inventoryService.update(inventoryItem.id, {
            location: 'Bodega Ecuador'
          });
        }
      }

      // Actualizar estado de la devolución
      await this.update(id, {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy
      });

      toast.success('Devolución aprobada y productos movidos a bodega Ecuador');
    } catch (error) {
      console.error('Error approving return:', error);
      toast.error('Error al aprobar la devolución');
      throw error;
    }
  },

  // Rechazar devolución
  async reject(id: string, rejectedBy: string, rejectionReason?: string): Promise<void> {
    try {
      const returnDoc = await this.getById(id);
      if (!returnDoc) {
        throw new Error('Devolución no encontrada');
      }

      if (returnDoc.status !== 'pending') {
        throw new Error('Solo se pueden rechazar devoluciones pendientes');
      }

      await this.update(id, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason
      });

      toast.success('Devolución rechazada');
    } catch (error) {
      console.error('Error rejecting return:', error);
      toast.error('Error al rechazar la devolución');
      throw error;
    }
  },

  // Eliminar devolución
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'returns', id);
      await deleteDoc(docRef);
      toast.success('Devolución eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting return:', error);
      toast.error('Error al eliminar la devolución');
      throw error;
    }
  },

  // Obtener todas las devoluciones
  async getAll(): Promise<Return[]> {
    try {
      const q = query(collection(db, 'returns'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        approvedAt: doc.data().approvedAt ? convertTimestamp(doc.data().approvedAt) : undefined,
        rejectedAt: doc.data().rejectedAt ? convertTimestamp(doc.data().rejectedAt) : undefined
      })) as Return[];
    } catch (error) {
      console.error('Error getting returns:', error);
      toast.error('Error al cargar las devoluciones');
      throw error;
    }
  },

  // Obtener devoluciones por vendedor
  async getBySeller(sellerId: string): Promise<Return[]> {
    try {
      // Obtener todas las devoluciones y filtrar en el cliente
      // para evitar el error de índice compuesto
      const q = query(collection(db, 'returns'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const allReturns = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        approvedAt: doc.data().approvedAt ? convertTimestamp(doc.data().approvedAt) : undefined,
        rejectedAt: doc.data().rejectedAt ? convertTimestamp(doc.data().rejectedAt) : undefined
      })) as Return[];

      // Filtrar por sellerId en el cliente
      return allReturns.filter(returnItem => returnItem.sellerId === sellerId);
    } catch (error) {
      console.error('Error getting returns by seller:', error);
      toast.error('Error al cargar las devoluciones del vendedor');
      throw error;
    }
  },

  // Obtener devoluciones pendientes
  async getPending(): Promise<Return[]> {
    try {
      const q = query(
        collection(db, 'returns'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        approvedAt: doc.data().approvedAt ? convertTimestamp(doc.data().approvedAt) : undefined,
        rejectedAt: doc.data().rejectedAt ? convertTimestamp(doc.data().rejectedAt) : undefined
      })) as Return[];
    } catch (error) {
      console.error('Error getting pending returns:', error);
      toast.error('Error al cargar las devoluciones pendientes');
      throw error;
    }
  },

  // Obtener devolución por ID
  async getById(id: string): Promise<Return | null> {
    try {
      const docRef = doc(db, 'returns', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          approvedAt: data.approvedAt ? convertTimestamp(data.approvedAt) : undefined,
          rejectedAt: data.rejectedAt ? convertTimestamp(data.rejectedAt) : undefined
        } as Return;
      }
      return null;
    } catch (error) {
      console.error('Error getting return:', error);
      toast.error('Error al obtener la devolución');
      throw error;
    }
  },

  // Crear nota de devolución directamente como admin (aprobada automáticamente)
  async createAdminReturn(returnData: Omit<Return, 'id' | 'status' | 'approvedAt' | 'approvedBy'>): Promise<string> {
    try {
      // Validar que hay items
      if (!returnData.items || returnData.items.length === 0) {
        throw new Error('La nota de devolución debe tener al menos un producto');
      }

      // Verificar que el vendedor tiene suficiente inventario
      const sellerInventory = await sellerInventoryService.getBySeller(returnData.sellerId);
      for (const item of returnData.items) {
        const inventoryItem = sellerInventory.find(inv => inv.productId === item.productId);
        if (!inventoryItem || inventoryItem.quantity < item.quantity) {
          throw new Error(`Inventario insuficiente para ${item.product.name}. Disponible: ${inventoryItem?.quantity || 0}, Solicitado: ${item.quantity}`);
        }
      }

      // 1. Marcar productos como devueltos en el inventario del vendedor (no remover)
      for (const item of returnData.items) {
        await sellerInventoryService.markAsReturned(
          returnData.sellerId,
          item.productId,
          item.quantity
        );
      }

      // 2. Agregar productos a la bodega Ecuador
      for (const item of returnData.items) {
        const product = item.product;
        await inventoryService.updateStockAfterEntry(
          item.productId,
          item.quantity,
          product.cost || 0,
          item.unitPrice
        );

        // Actualizar la ubicación a Ecuador
        const inventoryItem = await inventoryService.getByProductId(item.productId);
        if (inventoryItem) {
          await inventoryService.update(inventoryItem.id, {
            location: 'Bodega Ecuador'
          });
        }
      }

      // 3. Reducir la deuda del vendedor
      const seller = await sellerService.getById(returnData.sellerId);
      if (seller) {
        const currentDebt = seller.totalDebt || 0;
        const newDebt = Math.max(0, currentDebt - returnData.totalValue);
        await sellerService.update(returnData.sellerId, {
          totalDebt: newDebt
        });
      }

      // 4. Crear la nota de devolución con status 'approved'
      const returnNote: Omit<Return, 'id'> = {
        ...returnData,
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: 'admin',
        createdAt: returnData.createdAt || new Date()
      };

      const docRef = await addDoc(collection(db, 'returns'), {
        ...returnNote,
        createdAt: convertToTimestamp(returnNote.createdAt),
        approvedAt: convertToTimestamp(returnNote.approvedAt!)
      });
      
      toast.success('Nota de devolución creada exitosamente. Productos movidos a Bodega Ecuador y deuda actualizada.');
      return docRef.id;
    } catch (error: any) {
      console.error('Error creating admin return:', error);
      toast.error(error.message || 'Error al crear la nota de devolución');
      throw error;
    }
  },

  // Restaurar/Revertir una nota de devolución (deshacer todos los cambios)
  async restoreReturn(id: string): Promise<void> {
    try {
      // 1. Obtener la nota de devolución
      const returnDoc = await this.getById(id);
      if (!returnDoc) {
        throw new Error('Nota de devolución no encontrada');
      }

      // Solo se pueden restaurar devoluciones aprobadas
      if (returnDoc.status !== 'approved') {
        throw new Error('Solo se pueden restaurar devoluciones aprobadas');
      }

      // 2. Desmarcar productos como devueltos en el inventario del vendedor
      for (const item of returnDoc.items) {
        await sellerInventoryService.unmarkAsReturned(
          returnDoc.sellerId,
          item.productId,
          item.quantity
        );
      }

      // 3. Remover productos de la bodega Ecuador
      for (const item of returnDoc.items) {
        await inventoryService.reduceStock(
          item.productId,
          item.quantity
        );
      }

      // 4. Incrementar la deuda del vendedor (revertir la reducción)
      const seller = await sellerService.getById(returnDoc.sellerId);
      if (seller) {
        const currentDebt = seller.totalDebt || 0;
        const newDebt = currentDebt + returnDoc.totalValue;
        await sellerService.update(returnDoc.sellerId, {
          totalDebt: newDebt
        });
      }

      // 5. Eliminar la nota de devolución
      await this.delete(id);

      toast.success('Nota de devolución restaurada exitosamente. Todos los cambios han sido revertidos.');
    } catch (error: any) {
      console.error('Error restoring return:', error);
      toast.error(error.message || 'Error al restaurar la nota de devolución');
      throw error;
    }
  }
};



