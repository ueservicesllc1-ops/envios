import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export interface EntryNoteExpense {
  id: string;
  noteNumber: string;
  supplier: string;
  totalCost: number;
  date: Date;
  status: 'pending' | 'approved' | 'rejected';
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

export const entryNoteAccountingService = {
  // Crear gasto de nota de entrada
  async create(expense: Omit<EntryNoteExpense, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'entryNoteExpenses'), {
        ...expense,
        date: convertToTimestamp(expense.date),
        createdAt: convertToTimestamp(new Date())
      });
      
      toast.success('Gasto de nota de entrada registrado correctamente');
      return docRef.id;
    } catch (error) {
      console.error('Error creating entry note expense:', error);
      toast.error('Error al registrar el gasto de nota de entrada');
      throw error;
    }
  },

  // Obtener todos los gastos de notas de entrada
  async getAll(): Promise<EntryNoteExpense[]> {
    try {
      const q = query(collection(db, 'entryNoteExpenses'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: convertTimestamp(doc.data().date),
        createdAt: convertTimestamp(doc.data().createdAt)
      })) as EntryNoteExpense[];
    } catch (error) {
      console.error('Error getting entry note expenses:', error);
      toast.error('Error al cargar gastos de notas de entrada');
      throw error;
    }
  },

  // Obtener total de gastos de notas de entrada
  async getTotalExpenses(): Promise<number> {
    try {
      const expenses = await this.getAll();
      return expenses.reduce((sum, expense) => sum + expense.totalCost, 0);
    } catch (error) {
      console.error('Error getting total expenses:', error);
      return 0;
    }
  }
};
