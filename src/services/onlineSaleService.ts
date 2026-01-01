import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { inventoryService } from './inventoryService';
import { onlineSaleAccountingService } from './onlineSaleAccountingService';
import toast from 'react-hot-toast';

export interface OnlineSale {
  id: string;
  number: string;
  items: OnlineSaleItem[];
  totalAmount: number;
  shippingCost?: number; // Costo de envío
  shippingWeight?: number; // Peso total en libras
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'arrived_ecuador' | 'delivered' | 'cancelled';
  paymentMethod: 'cash' | 'card' | 'transfer' | 'banco_pichincha' | 'paypal';
  paypalTransactionId?: string; // ID de transacción de PayPal
  receiptUrl?: string; // URL del recibo de transferencia/depósito
  notes?: string;
  createdAt: Date;
  confirmedAt?: Date;
  processingAt?: Date;
  shippedAt?: Date;
  arrivedEcuadorAt?: Date;
  deliveredAt?: Date;
  // Tracking detallado
  trackingStage?: 'order_received' | 'preparing' | 'airport_departure' | 'airport_arrival' | 'customs' | 'warehouse_ecuador' | 'ready_pickup' | 'delivered';
  trackingHistory?: TrackingEvent[];
  notificationSent?: boolean; // Si ya se envió notificación de llegada a Ecuador
  securityCode?: string; // Código de seguridad para retiro
}

export interface TrackingEvent {
  stage: string;
  timestamp: Date;
  description: string;
}

export interface OnlineSaleItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  location: string; // Bodega USA o Bodega Ecuador
  imageUrl?: string; // URL de la imagen del producto
  origin?: string; // Nuevo: origen del producto
  salePrice1?: number; // Nuevo: precio 1
  salePrice2?: number; // Nuevo: precio 2
}

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

// Utilidad para limpiar objetos de valores undefined (Firebase no los soporta)
const cleanData = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => cleanData(v));
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof Timestamp)) {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanData(v)])
    );
  }
  return obj;
};

export const onlineSaleService = {
  // Crear venta en línea
  async create(sale: Omit<OnlineSale, 'id'>): Promise<string> {
    try {
      const cleanedSale = cleanData({
        ...sale,
        createdAt: convertToTimestamp(sale.createdAt),
        confirmedAt: sale.confirmedAt ? convertToTimestamp(sale.confirmedAt) : null,
        processingAt: sale.processingAt ? convertToTimestamp(sale.processingAt) : null,
        shippedAt: sale.shippedAt ? convertToTimestamp(sale.shippedAt) : null,
        arrivedEcuadorAt: sale.arrivedEcuadorAt ? convertToTimestamp(sale.arrivedEcuadorAt) : null,
        deliveredAt: sale.deliveredAt ? convertToTimestamp(sale.deliveredAt) : null
      });

      const docRef = await addDoc(collection(db, 'onlineSales'), cleanedSale);

      // Actualizar inventario para cada producto
      for (const item of sale.items) {
        const isFBorWG = item.origin === 'fivebelow' || item.origin === 'walgreens';
        const isSpecialPrice = item.salePrice2 === -10 || item.salePrice1 === -10;

        if (isFBorWG || isSpecialPrice) {
          // Para productos bajo pedido, validamos si hay stock antes de intentar restarlo
          // para evitar el Error/Toast de "Stock insuficiente" del servicio de inventario.
          const currentInv = await inventoryService.getByProductId(item.productId);
          if (!currentInv || currentInv.quantity < item.quantity) {
            console.log(`📦 Producto bajo pedido (${item.productName}) sin stock físico suficiente, continuando venta sin reducir inventario.`);
            continue; // Saltamos la reducción para este item
          }
        }

        try {
          await inventoryService.updateStockAfterExit(
            item.productId,
            item.quantity,
            docRef.id,
            undefined, // No hay sellerId para ventas en línea
            undefined, // location
            true // silent: true para no mostrar notificaciones al cliente
          );
        } catch (error: any) {
          // Si por alguna razón falla el stock en un producto normal, lo relanzamos
          throw error;
        }
      }

      // Crear entrada de contabilidad
      try {
        await onlineSaleAccountingService.create({
          saleNumber: sale.number,
          saleId: docRef.id,
          totalValue: sale.totalAmount,
          date: sale.createdAt,
          status: sale.status,
          notes: sale.notes
        }, true); // silent: true
      } catch (accountingError) {
        console.error('Error creating accounting entry:', accountingError);
        // No lanzar error para no interrumpir la creación de la venta
      }

      return docRef.id;
    } catch (error) {
      console.error('Error creating online sale:', error);
      toast.error('Error al registrar la venta');
      throw error;
    }
  },

  // Obtener todas las ventas en línea
  async getAll(): Promise<OnlineSale[]> {
    try {
      const q = query(collection(db, 'onlineSales'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        confirmedAt: doc.data().confirmedAt ? convertTimestamp(doc.data().confirmedAt) : undefined,
        processingAt: doc.data().processingAt ? convertTimestamp(doc.data().processingAt) : undefined,
        shippedAt: doc.data().shippedAt ? convertTimestamp(doc.data().shippedAt) : undefined,
        arrivedEcuadorAt: doc.data().arrivedEcuadorAt ? convertTimestamp(doc.data().arrivedEcuadorAt) : undefined,
        deliveredAt: doc.data().deliveredAt ? convertTimestamp(doc.data().deliveredAt) : undefined
      })) as OnlineSale[];
    } catch (error) {
      console.error('Error getting online sales:', error);
      toast.error('Error al cargar las ventas en línea');
      throw error;
    }
  },

  // Obtener ventas por estado
  async getByStatus(status: OnlineSale['status']): Promise<OnlineSale[]> {
    try {
      const q = query(
        collection(db, 'onlineSales'),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        confirmedAt: doc.data().confirmedAt ? convertTimestamp(doc.data().confirmedAt) : undefined,
        processingAt: doc.data().processingAt ? convertTimestamp(doc.data().processingAt) : undefined,
        shippedAt: doc.data().shippedAt ? convertTimestamp(doc.data().shippedAt) : undefined,
        arrivedEcuadorAt: doc.data().arrivedEcuadorAt ? convertTimestamp(doc.data().arrivedEcuadorAt) : undefined,
        deliveredAt: doc.data().deliveredAt ? convertTimestamp(doc.data().deliveredAt) : undefined
      })) as OnlineSale[];
    } catch (error) {
      console.error('Error getting online sales by status:', error);
      toast.error('Error al cargar las ventas');
      throw error;
    }
  },

  // Actualizar estado de venta
  async updateStatus(id: string, status: OnlineSale['status']): Promise<void> {
    try {
      const docRef = doc(db, 'onlineSales', id);
      const updateData: any = { status };

      if (status === 'confirmed') updateData.confirmedAt = Timestamp.now();
      if (status === 'processing') updateData.processingAt = Timestamp.now();
      if (status === 'shipped') updateData.shippedAt = Timestamp.now();
      if (status === 'arrived_ecuador') updateData.arrivedEcuadorAt = Timestamp.now();
      if (status === 'delivered') updateData.deliveredAt = Timestamp.now();

      await updateDoc(docRef, updateData);
      toast.success(`Pedido actualizado a ${status}`);
    } catch (error) {
      console.error('Error updating sale status:', error);
      toast.error('Error al actualizar el estado');
      throw error;
    }
  },

  // Eliminar venta y devolver stock al inventario
  async delete(id: string): Promise<void> {
    try {
      // Primero obtener los detalles de la venta
      const sales = await this.getAll();
      const sale = sales.find(s => s.id === id);

      if (!sale) {
        throw new Error('Venta no encontrada');
      }

      // ⚠️ IMPORTANTE: Verificar si ya está cancelado
      if (sale.status === 'cancelled') {
        toast('Este pedido ya fue cancelado anteriormente', { icon: 'ℹ️' });
        return; // No devolver stock de nuevo
      }

      console.log(`🗑️ Eliminando pedido ${sale.number} y devolviendo stock...`);

      // Devolver el stock al inventario para cada producto
      for (const item of sale.items) {
        try {
          console.log(`  📦 Devolviendo ${item.quantity}x ${item.productName} (ID: ${item.productId})`);
          await inventoryService.returnStockAfterDelete(
            item.productId,
            item.quantity,
            true // silent: true
          );
        } catch (inventoryError) {
          console.error(`Error devolviendo stock del producto ${item.productId}:`, inventoryError);
          // Continuar con los demás productos
        }
      }

      // Marcar como cancelado
      const docRef = doc(db, 'onlineSales', id);
      await updateDoc(docRef, { status: 'cancelled' });

      console.log(`✅ Pedido ${sale.number} cancelado y stock devuelto`);
      toast.success('Pedido cancelado y stock devuelto al inventario');
    } catch (error) {
      console.error('Error deleting online sale:', error);
      toast.error('Error al eliminar el pedido');
      throw error;
    }
  },

  // Actualizar tracking stage del pedido
  async updateTracking(
    id: string,
    newStage: 'order_received' | 'preparing' | 'airport_departure' | 'airport_arrival' | 'customs' | 'warehouse_ecuador' | 'ready_pickup' | 'delivered',
    description: string
  ): Promise<void> {
    try {
      const sales = await this.getAll();
      const sale = sales.find(s => s.id === id);

      if (!sale) {
        throw new Error('Pedido no encontrado');
      }

      // Crear evento de tracking
      const trackingEvent: TrackingEvent = {
        stage: newStage,
        timestamp: new Date(),
        description
      };

      // Agregar al historial
      const currentHistory = sale.trackingHistory || [];
      const updatedHistory = [...currentHistory, trackingEvent];

      const docRef = doc(db, 'onlineSales', id);
      const updateData: any = {
        trackingStage: newStage,
        trackingHistory: updatedHistory.map(event => ({
          ...event,
          timestamp: convertToTimestamp(event.timestamp)
        }))
      };

      // Si llega a bodega Ecuador o está listo, enviar notificación
      if ((newStage === 'warehouse_ecuador' || newStage === 'ready_pickup') && !sale.notificationSent) {
        updateData.notificationSent = true;

        // Importar dinámicamente el servicio de notificaciones
        const { notificationService } = await import('./notificationService');

        await notificationService.notifyReadyForPickup(
          sale.id,
          sale.number,
          sale.customerEmail || '',
          sale.customerName,
          sale.customerPhone
        );
      }

      // Actualizar en Firebase
      await updateDoc(docRef, updateData);

      toast.success(`Tracking actualizado: ${description}`);
    } catch (error) {
      console.error('Error updating tracking:', error);
      toast.error('Error al actualizar tracking');
      throw error;
    }
  },

  // Actualizar items de una venta (y ajustar inventario)
  async updateSaleItems(saleId: string, newItems: OnlineSaleItem[], newTotal: number): Promise<void> {
    try {
      // Obtener venta actual directamente para asegurar datos frescos
      const docRef = doc(db, 'onlineSales', saleId);
      const sales = await this.getAll(); // Usar getAll (cacheado por firebase) o getDoc directo. Usaremos getAll por consistencia con el servicio.
      const currentSale = sales.find(s => s.id === saleId);

      if (!currentSale) throw new Error('Venta no encontrada');

      // 1. Manejar devoluciones (Items eliminados o cantidad reducida)
      for (const originalItem of currentSale.items) {
        const newItem = newItems.find(i => i.productId === originalItem.productId);

        if (!newItem) {
          // Item eliminado -> Devolver todo el stock
          await inventoryService.returnStockAfterDelete(originalItem.productId, originalItem.quantity, true);
        } else if (newItem.quantity < originalItem.quantity) {
          // Cantidad reducida -> Devolver diferencia
          const diff = originalItem.quantity - newItem.quantity;
          await inventoryService.returnStockAfterDelete(originalItem.productId, diff, true);
        }
      }

      // 2. Manejar salidas adicionales (Cantidad aumentada)
      for (const newItem of newItems) {
        const originalItem = currentSale.items.find(i => i.productId === newItem.productId);

        if (originalItem && newItem.quantity > originalItem.quantity) {
          const diff = newItem.quantity - originalItem.quantity;
          // updateStockAfterExit reduce el stock
          await inventoryService.updateStockAfterExit(newItem.productId, diff, saleId, undefined, undefined, true);
        }
        // Nota: No manejamos items totalmente nuevos aquí sin buscador, asumimos edición de existentes.
      }

      // 3. Actualizar documento
      await updateDoc(docRef, {
        items: newItems,
        totalAmount: newTotal
      });

      toast.success('Pedido actualizado y stock ajustado');
    } catch (error) {
      console.error('Error updating sale items:', error);
      toast.error('Error al actualizar el pedido');
      throw error;
    }
  },

  // Suscribirse a pedidos de un usuario en tiempo real
  subscribeToUserOrders(email: string, callback: (sales: OnlineSale[]) => void): () => void {
    const q = query(
      collection(db, 'onlineSales'),
      where('customerEmail', '==', email),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const sales = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        confirmedAt: doc.data().confirmedAt ? convertTimestamp(doc.data().confirmedAt) : undefined,
        processingAt: doc.data().processingAt ? convertTimestamp(doc.data().processingAt) : undefined,
        shippedAt: doc.data().shippedAt ? convertTimestamp(doc.data().shippedAt) : undefined,
        arrivedEcuadorAt: doc.data().arrivedEcuadorAt ? convertTimestamp(doc.data().arrivedEcuadorAt) : undefined,
        deliveredAt: doc.data().deliveredAt ? convertTimestamp(doc.data().deliveredAt) : undefined
      })) as OnlineSale[];

      callback(sales);
    });
  }
};

