import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  orderBy,
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

      // Verificar que el vendedor tiene suficiente inventario real (restando lo ya devuelto)
      const sellerInventory = await sellerInventoryService.getBySeller(returnData.sellerId);
      for (const item of returnData.items) {
        // Encontrar todos los items de este producto (puede haber varias entradas)
        const productItems = sellerInventory.filter(inv => inv.productId === item.productId);
        const totalAvailable = productItems.reduce((sum, inv) => sum + (inv.quantity - (inv.returnedQuantity || 0)), 0);
        
        if (totalAvailable < item.quantity) {
          throw new Error(`Inventario insuficiente para ${item.product.name}. Realmente disponible: ${totalAvailable}, Solicitado: ${item.quantity}`);
        }
      }

      // 5. Crear nota de devolución y ejecutar todo en un BATCH atómico
      // Esto evita que el inventario se marque como devuelto si algo falla al final
      const batch = writeBatch(db);
      const returnRef = doc(collection(db, 'returns'));
      
      const returnNote: Return = {
        ...returnData,
        id: returnRef.id,
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: 'admin',
        createdAt: returnData.createdAt || new Date()
      };

      // Agregar la nota de devolución al batch
      batch.set(returnRef, {
        ...returnNote,
        createdAt: convertToTimestamp(returnNote.createdAt),
        approvedAt: convertToTimestamp(returnNote.approvedAt!)
      });

      // 1. Marcar productos como devueltos en el inventario del vendedor en el batch
      // Nota: MarkAsReturned debe soportar opcionalmente un batch para ser atómico
      // Como markAsReturned no soporta batch, lo haremos manual aquí para el SellerInventory
      for (const item of returnData.items) {
        // Encontrar cada item de este producto
        const sellerItems = sellerInventory.filter(inv => inv.productId === item.productId);
        let remainingToReturn = item.quantity;
        
        for (const inv of sellerItems) {
          if (remainingToReturn <= 0) break;
          const availableInItem = inv.quantity - (inv.returnedQuantity || 0);
          const amountToReturnFromThis = Math.min(remainingToReturn, availableInItem);
          
          if (amountToReturnFromThis > 0) {
            const invRef = doc(db, 'sellerInventory', inv.id);
            batch.update(invRef, {
              returnedQuantity: (inv.returnedQuantity || 0) + amountToReturnFromThis,
              returnedDate: serverTimestamp()
            });
            remainingToReturn -= amountToReturnFromThis;
          }
        }
      }

      // 2. Agregar productos a la bodega Ecuador en el batch
      // Nota: Similar a lo anterior, hacemos la lógica de inventoryService aquí pero en batch
      for (const item of returnData.items) {
        const productItems = await inventoryService.getAll(); // Para buscar el item en bodega
        const bodegaItem = productItems.find((inv: any) => 
          inv.productId === item.productId && inv.location === 'Bodega Ecuador'
        );

        if (bodegaItem) {
          const bodegaRef = doc(db, 'inventory', bodegaItem.id);
          batch.update(bodegaRef, {
            quantity: bodegaItem.quantity + item.quantity,
            totalCost: bodegaItem.totalCost + (item.product.cost * item.quantity),
            totalPrice: bodegaItem.totalPrice + (item.unitPrice * item.quantity),
            totalValue: bodegaItem.totalCost + (item.product.cost * item.quantity), // Simplificado
            lastUpdated: serverTimestamp()
          });
        } else {
          // Si no existe en la bodega, crear un nuevo registro
          const newBodegaRef = doc(collection(db, 'inventory'));
          batch.set(newBodegaRef, {
            productId: item.productId,
            product: item.product,
            quantity: item.quantity,
            cost: item.product.cost || 0,
            unitPrice: item.unitPrice,
            totalCost: (item.product.cost || 0) * item.quantity,
            totalPrice: item.unitPrice * item.quantity,
            totalValue: (item.product.cost || 0) * item.quantity,
            location: 'Bodega Ecuador',
            status: 'stock',
            lastUpdated: serverTimestamp()
          });
        }
      }

      // 3. Reducir deuda del vendedor en el batch
      const seller = await sellerService.getById(returnData.sellerId);
      if (seller) {
        const sellerRef = doc(db, 'sellers', seller.id);
        const currentDebt = seller.totalDebt || 0;
        batch.update(sellerRef, {
          totalDebt: Math.max(0, currentDebt - returnData.totalValue)
        });
      }

      // 4. Ejecutar el batch
      await batch.commit();
      
      toast.success('Nota de devolución creada exitosamente (Manejo Atómico).');
      return returnRef.id;
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
          item.quantity,
          true // force = true
        );
      }

      // 3. Remover productos de la bodega Ecuador
      for (const item of returnDoc.items) {
        await inventoryService.reduceStock(
          item.productId,
          item.quantity,
          true // force = true
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



