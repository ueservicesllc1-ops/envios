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

export interface ShippingExpense {
  id: string;
  packageNumber: number;
  trackingNumber?: string;
  recipient: string;
  cost: number;
  date: Date;
  status: 'pending' | 'in-transit' | 'delivered' | 'returned';
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

export const shippingAccountingService = {
  // Crear gasto de paquetería
  async create(expense: Omit<ShippingExpense, 'id' | 'packageNumber' | 'createdAt'>): Promise<string> {
    try {
      // Obtener el siguiente número de paquete
      const nextNumber = await this.getNextPackageNumber();
      
      const docRef = await addDoc(collection(db, 'shippingExpenses'), {
        ...expense,
        packageNumber: nextNumber,
        date: convertToTimestamp(expense.date),
        createdAt: convertToTimestamp(new Date())
      });
      
      toast.success('Gasto de paquetería registrado correctamente');
      return docRef.id;
    } catch (error) {
      console.error('Error creating shipping expense:', error);
      toast.error('Error al registrar el gasto de paquetería');
      throw error;
    }
  },

  // Obtener todos los gastos de paquetería
  async getAll(): Promise<ShippingExpense[]> {
    try {
      const q = query(collection(db, 'shippingExpenses'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: convertTimestamp(doc.data().date),
        createdAt: convertTimestamp(doc.data().createdAt)
      })) as ShippingExpense[];
    } catch (error) {
      console.error('Error getting shipping expenses:', error);
      toast.error('Error al cargar gastos de paquetería');
      throw error;
    }
  },

  // Obtener el siguiente número de paquete
  async getNextPackageNumber(): Promise<number> {
    try {
      const expenses = await this.getAll();
      if (expenses.length === 0) return 1;
      
      const maxNumber = Math.max(...expenses.map(expense => expense.packageNumber));
      return maxNumber + 1;
    } catch (error) {
      console.error('Error getting next package number:', error);
      return 1;
    }
  },

  // Obtener total de gastos de paquetería
  async getTotalExpenses(): Promise<number> {
    try {
      const expenses = await this.getAll();
      return expenses.reduce((sum, expense) => sum + expense.cost, 0);
    } catch (error) {
      console.error('Error getting total expenses:', error);
      return 0;
    }
  },

  // Eliminar gasto de paquetería por ID de envío
  async deleteByShippingId(shippingId: string): Promise<void> {
    try {
      // Buscar la entrada de contabilidad por trackingNumber o ID
      const q = query(
        collection(db, 'shippingExpenses'),
        where('trackingNumber', '==', shippingId)
      );
      const querySnapshot = await getDocs(q);
      
      // Eliminar todas las entradas encontradas
      for (const docSnapshot of querySnapshot.docs) {
        await deleteDoc(doc(db, 'shippingExpenses', docSnapshot.id));
        console.log('Gasto de paquetería eliminado:', docSnapshot.id);
      }
    } catch (error) {
      console.error('Error deleting shipping expense by shipping ID:', error);
      throw error;
    }
  }
};
