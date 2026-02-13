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

  // Actualizar el estado de productos específicos a "delivered" cuando el paquete se entrega
  async updateStatusToDelivered(sellerId: string, productId: string, quantity: number): Promise<void> {
    try {
      // Buscar el item del vendedor que corresponde a este producto
      const q = query(
        collection(db, this.collectionName),
        where('sellerId', '==', sellerId),
        where('productId', '==', productId)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const itemDoc = querySnapshot.docs[0];
        const itemData = itemDoc.data();

        // Verificar que la cantidad coincida (para evitar actualizar items incorrectos)
        if (itemData.quantity >= quantity) {
          await updateDoc(doc(db, this.collectionName, itemDoc.id), {
            status: 'delivered'
          });
          console.log(`Producto ${productId} actualizado a delivered para vendedor ${sellerId}`);
        }
      }
    } catch (error) {
      console.error('Error updating seller inventory status to delivered:', error);
      throw error;
    }
  }

  // Método para agregar productos al inventario del vendedor cuando se entrega
  async addToSellerInventory(
    sellerId: string,
    productId: string,
    product: any,
    quantity: number,
    unitPrice?: number // Precio unitario opcional (si no se proporciona, usa salePrice1)
  ): Promise<void> {
    try {
      // Verificar si ya existe el producto en el inventario del vendedor
      const existingItems = await this.getBySeller(sellerId);
      const existingItem = existingItems.find(item => item.productId === productId);

      const priceToUse = unitPrice || product.salePrice1 || 0;

      if (existingItem) {
        // Actualizar cantidad existente y precio si es necesario
        const newQuantity = existingItem.quantity + quantity;
        // Si se proporciona un nuevo precio, actualizarlo; de lo contrario, mantener el precio existente
        const finalUnitPrice = unitPrice !== undefined ? unitPrice : existingItem.unitPrice;
        const newTotalValue = finalUnitPrice * newQuantity;
        await this.update(existingItem.id, {
          quantity: newQuantity,
          unitPrice: finalUnitPrice,
          totalValue: newTotalValue
        });
      } else {
        // Crear nuevo item en el inventario del vendedor
        await this.create({
          sellerId,
          productId,
          product,
          quantity,
          unitPrice: priceToUse,
          totalValue: priceToUse * quantity,
          status: 'in-transit' // Estado inicial cuando se crea la nota de salida
        });
      }
    } catch (error) {
      console.error('Error adding to seller inventory:', error);
      throw error;
    }
  }

  async removeFromSellerInventory(sellerId: string, productId: string, quantity: number, allowPartial: boolean = false): Promise<void> {
    try {
      let remaining = quantity;
      const items = await this.getBySeller(sellerId);
      const relevantItems = items.filter(item => item.productId === productId);

      for (const item of relevantItems) {
        if (remaining <= 0) break;

        if (item.quantity > remaining) {
          const newQuantity = item.quantity - remaining;
          await this.update(item.id, {
            quantity: newQuantity,
            totalValue: (item.unitPrice || 0) * newQuantity
          });
          remaining = 0;
        } else {
          await this.delete(item.id);
          remaining -= item.quantity;
        }
      }

      if (remaining > 0 && !allowPartial) {
        throw new Error('Inventario del vendedor insuficiente para remover la cantidad solicitada');
      }
    } catch (error) {
      console.error('Error removing from seller inventory:', error);
      throw error;
    }
  }

  // Marcar productos como devueltos (en lugar de removerlos)
  async markAsReturned(sellerId: string, productId: string, quantity: number): Promise<void> {
    try {
      let remaining = quantity;
      const items = await this.getBySeller(sellerId);
      const relevantItems = items.filter(item => item.productId === productId && (item.quantity - (item.returnedQuantity || 0)) > 0);

      for (const item of relevantItems) {
        if (remaining <= 0) break;

        const availableQuantity = item.quantity - (item.returnedQuantity || 0);
        const quantityToMark = Math.min(remaining, availableQuantity);
        const newReturnedQuantity = (item.returnedQuantity || 0) + quantityToMark;

        await this.update(item.id, {
          returnedQuantity: newReturnedQuantity
        });

        remaining -= quantityToMark;
      }

      if (remaining > 0) {
        throw new Error('Inventario del vendedor insuficiente para marcar como devuelto la cantidad solicitada');
      }
    } catch (error) {
      console.error('Error marking as returned:', error);
      throw error;
    }
  }

  // Desmarcar productos como devueltos (revertir markAsReturned)
  async unmarkAsReturned(sellerId: string, productId: string, quantity: number): Promise<void> {
    try {
      let remaining = quantity;
      const items = await this.getBySeller(sellerId);
      const relevantItems = items.filter(item => item.productId === productId && (item.returnedQuantity || 0) > 0);

      for (const item of relevantItems) {
        if (remaining <= 0) break;

        const returnedQuantity = item.returnedQuantity || 0;
        const quantityToUnmark = Math.min(remaining, returnedQuantity);
        const newReturnedQuantity = returnedQuantity - quantityToUnmark;

        await this.update(item.id, {
          returnedQuantity: newReturnedQuantity
        });

        remaining -= quantityToUnmark;
      }

      if (remaining > 0) {
        throw new Error('No hay suficientes productos marcados como devueltos para desmarcar la cantidad solicitada');
      }
    } catch (error) {
      console.error('Error unmarking as returned:', error);
      throw error;
    }
  }
}

export const sellerInventoryService = new SellerInventoryService();
export type { SellerInventoryItem };