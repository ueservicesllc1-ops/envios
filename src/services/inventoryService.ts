import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
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
      await updateDoc(docRef, {
        ...item,
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
      const existingItem = await this.getByProductId(productId);
      
      if (existingItem) {
        // Actualizar stock existente
        const newQuantity = existingItem.quantity + quantity;
        const newTotalCost = existingItem.totalCost + (cost * quantity);
        const newTotalPrice = existingItem.totalPrice + (unitPrice * quantity);
        const newTotalValue = newTotalCost; // Valor total basado en costo
        
        await this.update(existingItem.id, {
          quantity: newQuantity,
          totalCost: newTotalCost,
          totalPrice: newTotalPrice,
          totalValue: newTotalValue,
          cost: newTotalCost / newQuantity, // Costo promedio
          unitPrice: newTotalPrice / newQuantity // Precio promedio
        });
      } else {
        // Crear nuevo item de inventario
        await this.create({
          productId,
          product: {} as Product, // Se llenará cuando se obtenga el inventario
          quantity,
          cost,
          unitPrice,
          totalCost: cost * quantity,
          totalPrice: unitPrice * quantity,
          totalValue: cost * quantity,
          location: 'Bodega Principal'
        });
      }
      
      toast.success('Stock actualizado exitosamente');
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Error al actualizar el stock');
      throw error;
    }
  },

  // Actualizar stock después de salida
  async updateStockAfterExit(productId: string, quantity: number): Promise<void> {
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

  // Agregar stock (alias para updateStockAfterEntry)
  async addStock(productId: string, quantity: number, cost: number, unitPrice: number, location: string): Promise<void> {
    return this.updateStockAfterEntry(productId, quantity, cost, unitPrice);
  }
};
