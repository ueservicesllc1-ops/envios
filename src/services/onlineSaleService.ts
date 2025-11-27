import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  orderBy,
  where,
  Timestamp 
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
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: 'cash' | 'card' | 'transfer' | 'banco_pichincha' | 'paypal';
  receiptUrl?: string; // URL del recibo de transferencia/depósito
  notes?: string;
  createdAt: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface OnlineSaleItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  location: string; // Bodega USA o Bodega Ecuador
}

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

export const onlineSaleService = {
  // Crear venta en línea
  async create(sale: Omit<OnlineSale, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'onlineSales'), {
        ...sale,
        createdAt: convertToTimestamp(sale.createdAt),
        confirmedAt: sale.confirmedAt ? convertToTimestamp(sale.confirmedAt) : undefined,
        shippedAt: sale.shippedAt ? convertToTimestamp(sale.shippedAt) : undefined,
        deliveredAt: sale.deliveredAt ? convertToTimestamp(sale.deliveredAt) : undefined
      });
      
      // Actualizar inventario para cada producto
      for (const item of sale.items) {
        await inventoryService.updateStockAfterExit(
          item.productId,
          item.quantity,
          docRef.id,
          undefined // No hay sellerId para ventas en línea
        );
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
        });
      } catch (accountingError) {
        console.error('Error creating accounting entry:', accountingError);
        // No lanzar error para no interrumpir la creación de la venta
      }
      
      toast.success('Venta registrada exitosamente');
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
        shippedAt: doc.data().shippedAt ? convertTimestamp(doc.data().shippedAt) : undefined,
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
        shippedAt: doc.data().shippedAt ? convertTimestamp(doc.data().shippedAt) : undefined,
        deliveredAt: doc.data().deliveredAt ? convertTimestamp(doc.data().deliveredAt) : undefined
      })) as OnlineSale[];
    } catch (error) {
      console.error('Error getting online sales by status:', error);
      toast.error('Error al cargar las ventas');
      throw error;
    }
  }
};

