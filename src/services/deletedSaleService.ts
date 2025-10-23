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
import toast from 'react-hot-toast';

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

export interface DeletedSale {
  id: string;
  originalSaleId: string;
  sellerId: string;
  sellerName: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  originalSaleDate: Date;
  deletedAt: Date;
  deletedBy: string; // Email del vendedor que eliminó
  reason?: string;
  originalPaymentType: 'credit' | 'cash';
  originalStatus: 'pending' | 'paid' | 'rejected';
}

export const deletedSaleService = {
  // Registrar eliminación de venta
  async create(deletedSale: Omit<DeletedSale, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'deletedSales'), {
        ...deletedSale,
        originalSaleDate: convertToTimestamp(deletedSale.originalSaleDate),
        deletedAt: convertToTimestamp(deletedSale.deletedAt)
      });
      
      console.log('Eliminación de venta registrada:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating deleted sale record:', error);
      throw error;
    }
  },

  // Obtener todas las eliminaciones
  async getAll(): Promise<DeletedSale[]> {
    try {
      const q = query(collection(db, 'deletedSales'), orderBy('deletedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        originalSaleDate: convertTimestamp(doc.data().originalSaleDate),
        deletedAt: convertTimestamp(doc.data().deletedAt)
      })) as DeletedSale[];
    } catch (error) {
      console.error('Error getting deleted sales:', error);
      throw error;
    }
  },

  // Obtener eliminaciones por vendedor
  async getBySeller(sellerId: string): Promise<DeletedSale[]> {
    try {
      const q = query(
        collection(db, 'deletedSales'),
        where('sellerId', '==', sellerId),
        orderBy('deletedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        originalSaleDate: convertTimestamp(doc.data().originalSaleDate),
        deletedAt: convertTimestamp(doc.data().deletedAt)
      })) as DeletedSale[];
    } catch (error) {
      console.error('Error getting deleted sales by seller:', error);
      throw error;
    }
  }
};
