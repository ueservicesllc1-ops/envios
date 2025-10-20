import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ExitNote, ExitNoteItem, Product } from '../types';
import { productService } from './productService';

export interface SellerInventoryItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number; // Precio que se le dio al vendedor
  totalValue: number;
  lastDeliveryDate: Date;
}

export const sellerInventoryService = {
  // Obtener inventario del vendedor basado en notas de salida
  async getSellerInventory(sellerId: string): Promise<SellerInventoryItem[]> {
    try {
      // Obtener todas las notas de salida del vendedor
      const q = query(
        collection(db, 'exitNotes'),
        where('sellerId', '==', sellerId),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const exitNotes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as ExitNote[];

      // Obtener todos los productos para tener la información completa
      const allProducts = await productService.getAll();
      
      // Agrupar productos por ID y calcular totales
      const inventoryMap = new Map<string, SellerInventoryItem>();

      exitNotes.forEach(note => {
        note.items.forEach(item => {
          const product = allProducts.find(p => p.id === item.productId);
          if (!product) return;

          const key = item.productId;
          if (inventoryMap.has(key)) {
            const existing = inventoryMap.get(key)!;
            existing.quantity += item.quantity;
            existing.totalValue += item.totalPrice;
            // Actualizar fecha de última entrega si es más reciente
            if (note.date > existing.lastDeliveryDate) {
              existing.lastDeliveryDate = note.date;
            }
          } else {
            inventoryMap.set(key, {
              productId: item.productId,
              product: product,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalValue: item.totalPrice,
              lastDeliveryDate: note.date
            });
          }
        });
      });

      return Array.from(inventoryMap.values()).sort((a, b) => b.totalValue - a.totalValue);
    } catch (error) {
      console.error('Error getting seller inventory:', error);
      throw error;
    }
  },

  // Calcular valor total del inventario del vendedor
  async getTotalInventoryValue(sellerId: string): Promise<number> {
    try {
      const inventory = await this.getSellerInventory(sellerId);
      return inventory.reduce((total, item) => total + item.totalValue, 0);
    } catch (error) {
      console.error('Error calculating total inventory value:', error);
      return 0;
    }
  },

  // Obtener cantidad total de productos en inventario
  async getTotalInventoryQuantity(sellerId: string): Promise<number> {
    try {
      const inventory = await this.getSellerInventory(sellerId);
      return inventory.reduce((total, item) => total + item.quantity, 0);
    } catch (error) {
      console.error('Error calculating total inventory quantity:', error);
      return 0;
    }
  }
};
