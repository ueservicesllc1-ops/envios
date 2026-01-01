import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export interface OnlineSaleAccounting {
  id: string;
  saleNumber: string;
  saleId: string;
  totalValue: number;
  date: Date;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'arrived_ecuador' | 'delivered' | 'cancelled';
  notes?: string;
  createdAt: Date;
}

const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

export const onlineSaleAccountingService = {
  // Crear entrada de contabilidad para venta en línea
  async create(sale: Omit<OnlineSaleAccounting, 'id' | 'createdAt'>, silent: boolean = false): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'onlineSaleAccounting'), {
        ...sale,
        date: convertToTimestamp(sale.date),
        createdAt: convertToTimestamp(new Date())
      });

      if (!silent) toast.success('Venta en línea registrada en contabilidad');
      return docRef.id;
    } catch (error) {
      console.error('Error creating online sale accounting:', error);
      if (!silent) toast.error('Error al registrar la venta en contabilidad');
      throw error;
    }
  },

  // Obtener todas las ventas en línea para contabilidad
  async getAll(): Promise<OnlineSaleAccounting[]> {
    try {
      const q = query(collection(db, 'onlineSaleAccounting'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: convertTimestamp(doc.data().date),
        createdAt: convertTimestamp(doc.data().createdAt)
      })) as OnlineSaleAccounting[];
    } catch (error) {
      console.error('Error getting online sale accounting:', error);
      toast.error('Error al cargar ventas en línea');
      throw error;
    }
  },

  // Obtener total de ventas en línea
  async getTotalSales(): Promise<number> {
    try {
      const sales = await this.getAll();
      return sales.reduce((sum, sale) => sum + sale.totalValue, 0);
    } catch (error) {
      console.error('Error getting total online sales:', error);
      return 0;
    }
  },

  // Eliminar entrada por ID de venta
  async deleteBySaleId(saleId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'onlineSaleAccounting'),
        where('saleId', '==', saleId)
      );
      const querySnapshot = await getDocs(q);

      for (const docSnapshot of querySnapshot.docs) {
        await deleteDoc(doc(db, 'onlineSaleAccounting', docSnapshot.id));
      }
    } catch (error) {
      console.error('Error deleting online sale accounting:', error);
      throw error;
    }
  }
};












