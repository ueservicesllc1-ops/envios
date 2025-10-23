import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDocs, 
  query, 
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { InventoryItem, Product } from '../types';
import toast from 'react-hot-toast';

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

export const inventoryService = {
  // Crear item de inventario
  async create(item: Omit<InventoryItem, 'id' | 'lastUpdated'>): Promise<string> {
    try {
      const now = new Date();
      const docRef = await addDoc(collection(db, 'inventory'), {
        ...item,
        lastUpdated: convertToTimestamp(now)
      });
      
      toast.success('Item de inventario creado exitosamente');
      return docRef.id;
    } catch (error) {
      console.error('Error creating inventory item:', error);
      toast.error('Error al crear el item de inventario');
      throw error;
    }
  },

  // Actualizar item de inventario
  async update(id: string, item: Partial<InventoryItem>): Promise<void> {
    try {
      const docRef = doc(db, 'inventory', id);
      
      // Filtrar campos undefined para evitar errores de Firebase
      const cleanItem = Object.fromEntries(
        Object.entries(item).filter(([_, value]) => value !== undefined)
      );
      
      // Asegurar que status tenga un valor por defecto si no está definido
      if (!cleanItem.status) {
        cleanItem.status = 'stock';
      }
      
      await updateDoc(docRef, {
        ...cleanItem,
        lastUpdated: convertToTimestamp(new Date())
      });
      
      toast.success('Inventario actualizado exitosamente');
    } catch (error) {
      console.error('Error updating inventory item:', error);
      toast.error('Error al actualizar el inventario');
      throw error;
    }
  },

  // Obtener inventario por producto
  async getByProductId(productId: string): Promise<InventoryItem | null> {
    try {
      const q = query(collection(db, 'inventory'), where('productId', '==', productId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastUpdated: convertTimestamp(data.lastUpdated)
        } as InventoryItem;
      }
      return null;
    } catch (error) {
      console.error('Error getting inventory by product:', error);
      toast.error('Error al obtener el inventario');
      throw error;
    }
  },

  // Obtener todo el inventario
  async getAll(): Promise<InventoryItem[]> {
    try {
      const q = query(collection(db, 'inventory'), orderBy('lastUpdated', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastUpdated: convertTimestamp(doc.data().lastUpdated)
      })) as InventoryItem[];
    } catch (error) {
      console.error('Error getting inventory:', error);
      toast.error('Error al cargar el inventario');
      throw error;
    }
  },

  // Actualizar stock después de entrada
  async updateStockAfterEntry(productId: string, quantity: number, cost: number, unitPrice: number): Promise<void> {
    try {
      // Obtener el producto para usar su salePrice1
      const { productService } = await import('./productService');
      const product = await productService.getById(productId);
      const actualUnitPrice = product?.salePrice1 || unitPrice; // Usar salePrice1 del producto
      
      const existingItem = await this.getByProductId(productId);
      
      if (existingItem) {
        // Actualizar stock existente
        const newQuantity = existingItem.quantity + quantity;
        const newTotalCost = existingItem.totalCost + (cost * quantity);
        const newTotalPrice = existingItem.totalPrice + (actualUnitPrice * quantity);
        const newTotalValue = newTotalCost; // Valor total basado en costo
        
        await this.update(existingItem.id, {
          quantity: newQuantity,
          totalCost: newTotalCost,
          totalPrice: newTotalPrice,
          totalValue: newTotalValue,
          cost: newTotalCost / newQuantity, // Costo promedio
          unitPrice: actualUnitPrice // Usar siempre salePrice1
        });
      } else {
        // Crear nuevo item de inventario
        await this.create({
          productId,
          product: product || {} as Product,
          quantity,
          cost,
          unitPrice: actualUnitPrice, // Usar salePrice1 del producto
          totalCost: cost * quantity,
          totalPrice: actualUnitPrice * quantity,
          totalValue: cost * quantity,
          location: 'Bodega Principal',
          status: 'stock' // Estado inicial
        });
      }
      
      toast.success('Stock actualizado exitosamente');
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Error al actualizar el stock');
      throw error;
    }
  },

  // Actualizar stock después de salida (pasa a estado in-transit)
  async updateStockAfterExit(productId: string, quantity: number, exitNoteId?: string, sellerId?: string): Promise<void> {
    try {
      const existingItem = await this.getByProductId(productId);
      
      if (existingItem && existingItem.quantity >= quantity) {
        const newQuantity = existingItem.quantity - quantity;
        const newTotalCost = (existingItem.totalCost / existingItem.quantity) * newQuantity;
        const newTotalPrice = (existingItem.totalPrice / existingItem.quantity) * newQuantity;
        const newTotalValue = newTotalCost;
        
        await this.update(existingItem.id, {
          quantity: newQuantity,
          totalCost: newTotalCost,
          totalPrice: newTotalPrice,
          totalValue: newTotalValue,
          status: 'in-transit',
          sellerId: sellerId,
          exitNoteId: exitNoteId
        });
        
        toast.success('Stock actualizado exitosamente');
      } else {
        throw new Error('Stock insuficiente');
      }
    } catch (error) {
      console.error('Error updating stock after exit:', error);
      toast.error('Error al actualizar el stock');
      throw error;
    }
  },

  // Actualizar estado a entregado cuando se marca el envío como delivered
  async updateStatusToDelivered(exitNoteId: string): Promise<void> {
    try {
      const inventoryQuery = query(
        collection(db, 'inventory'),
        where('exitNoteId', '==', exitNoteId)
      );
      const inventorySnapshot = await getDocs(inventoryQuery);
      
      if (!inventorySnapshot.empty) {
        const inventoryDoc = inventorySnapshot.docs[0];
        
        await updateDoc(doc(db, 'inventory', inventoryDoc.id), {
          status: 'delivered',
          lastUpdated: convertToTimestamp(new Date())
        });
      }
    } catch (error) {
      console.error('Error updating inventory status to delivered:', error);
      throw error;
    }
  },

  // Agregar stock (alias para updateStockAfterEntry)
  async addStock(productId: string, quantity: number, cost: number, unitPrice: number, location: string): Promise<void> {
    return this.updateStockAfterEntry(productId, quantity, cost, unitPrice);
  },

  // Remover stock del inventario
  async removeStock(productId: string, quantity: number): Promise<void> {
    try {
      const existingItem = await this.getByProductId(productId);
      
      if (existingItem && existingItem.quantity >= quantity) {
        const newQuantity = existingItem.quantity - quantity;
        const newTotalCost = (existingItem.totalCost / existingItem.quantity) * newQuantity;
        const newTotalPrice = (existingItem.totalPrice / existingItem.quantity) * newQuantity;
        const newTotalValue = newTotalCost;
        
        await this.update(existingItem.id, {
          quantity: newQuantity,
          totalCost: newTotalCost,
          totalPrice: newTotalPrice,
          totalValue: newTotalValue
        });
        
        toast.success('Stock removido exitosamente');
      } else {
        throw new Error('Stock insuficiente para remover');
      }
    } catch (error) {
      console.error('Error removing stock:', error);
      toast.error('Error al remover stock');
      throw error;
    }
  },

  // Eliminar item de inventario
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'inventory', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  },

  // Regenerar inventario completo desde notas de entrada
  async regenerateInventory(): Promise<void> {
    try {
      console.log('Iniciando regeneración del inventario...');
      
      // Limpiar inventario actual
      const currentInventory = await this.getAll();
      console.log(`Eliminando ${currentInventory.length} items del inventario actual`);
      
      // Eliminar todos los items del inventario actual
      for (const item of currentInventory) {
        await this.delete(item.id);
      }
      
      // Obtener todas las notas de entrada
      const { entryNoteService } = await import('./entryNoteService');
      const entryNotes = await entryNoteService.getAll();
      console.log(`Procesando ${entryNotes.length} notas de entrada`);
      
      // Procesar cada nota de entrada
      for (const note of entryNotes) {
        console.log(`Procesando nota de entrada: ${note.number}`);
        for (const item of note.items) {
          await this.updateStockAfterEntry(
            item.productId,
            item.quantity,
            item.cost,
            item.unitPrice
          );
        }
      }
      
      // Obtener todas las notas de salida válidas (no eliminadas)
      const { exitNoteService } = await import('./exitNoteService');
      const exitNotes = await exitNoteService.getAll();
      console.log(`Procesando ${exitNotes.length} notas de salida`);
      
      // Restar stock de las notas de salida
      for (const note of exitNotes) {
        console.log(`Procesando nota de salida: ${note.number}`);
        for (const item of note.items) {
          await this.removeStock(item.productId, item.quantity);
        }
      }
      
      console.log('Inventario regenerado exitosamente');
      toast.success('Inventario regenerado exitosamente desde las notas de entrada');
    } catch (error) {
      console.error('Error regenerating inventory:', error);
      toast.error('Error al regenerar el inventario');
      throw error;
    }
  }
};
