import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { SellerInventoryItem } from '../types';

class SellerInventoryService {
  private collectionName = 'sellerInventory';

  async getAll(): Promise<SellerInventoryItem[]> {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastDeliveryDate: doc.data().lastDeliveryDate?.toDate() || new Date()
      })) as SellerInventoryItem[];
    } catch (error) {
      console.error('Error getting seller inventory:', error);
      throw error;
    }
  }

  async getBySeller(sellerId: string): Promise<SellerInventoryItem[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('sellerId', '==', sellerId)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastDeliveryDate: doc.data().lastDeliveryDate?.toDate() || new Date()
      })) as SellerInventoryItem[];
      
      // Ordenar por fecha de entrega en el cliente
      return items.sort((a, b) => b.lastDeliveryDate.getTime() - a.lastDeliveryDate.getTime());
    } catch (error) {
      console.error('Error getting seller inventory by seller:', error);
      throw error;
    }
  }

  // Alias para compatibilidad
  async getSellerInventory(sellerId: string): Promise<SellerInventoryItem[]> {
    return this.getBySeller(sellerId);
  }

  async create(data: Omit<SellerInventoryItem, 'id' | 'lastDeliveryDate'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        lastDeliveryDate: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating seller inventory item:', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<Omit<SellerInventoryItem, 'id' | 'lastDeliveryDate'>>): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, id), data);
    } catch (error) {
      console.error('Error updating seller inventory item:', error);
      throw error;
    }
  }

  async updateQuantity(id: string, newQuantity: number): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, id), {
        quantity: newQuantity
      });
    } catch (error) {
      console.error('Error updating seller inventory quantity:', error);
      throw error;
    }
  }

  async updateStatus(id: string, status: 'stock' | 'in-transit' | 'delivered'): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, id), {
        status: status
      });
    } catch (error) {
      console.error('Error updating seller inventory status:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
    } catch (error) {
      console.error('Error deleting seller inventory item:', error);
      throw error;
    }
  }

  // Método para agregar productos al inventario del vendedor cuando se entrega
  async addToSellerInventory(
    sellerId: string, 
    productId: string, 
    product: any, 
    quantity: number
  ): Promise<void> {
    try {
      // Verificar si ya existe el producto en el inventario del vendedor
      const existingItems = await this.getBySeller(sellerId);
      const existingItem = existingItems.find(item => item.productId === productId);

      if (existingItem) {
        // Actualizar cantidad existente
        const newQuantity = existingItem.quantity + quantity;
        const newTotalValue = existingItem.unitPrice * newQuantity;
        await this.update(existingItem.id, {
          quantity: newQuantity,
          totalValue: newTotalValue
        });
      } else {
        // Crear nuevo item en el inventario del vendedor
        const unitPrice = product.salePrice1; // Usar precio de venta 1 por defecto
        await this.create({
          sellerId,
          productId,
          product,
          quantity,
          unitPrice,
          totalValue: unitPrice * quantity,
          status: 'delivered'
        });
      }
    } catch (error) {
      console.error('Error adding to seller inventory:', error);
      throw error;
    }
  }
}

export const sellerInventoryService = new SellerInventoryService();
export type { SellerInventoryItem };