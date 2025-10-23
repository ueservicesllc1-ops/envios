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

export interface ExitNoteSale {
  id: string;
  noteNumber: string;
  sellerName: string;
  totalValue: number;
  date: Date;
  status: 'pending' | 'in-transit' | 'delivered' | 'received' | 'cancelled';
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

export const exitNoteAccountingService = {
  // Crear venta de nota de salida
  async create(sale: Omit<ExitNoteSale, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'exitNoteSales'), {
        ...sale,
        date: convertToTimestamp(sale.date),
        createdAt: convertToTimestamp(new Date())
      });
      
      toast.success('Venta de nota de salida registrada correctamente');
      return docRef.id;
    } catch (error) {
      console.error('Error creating exit note sale:', error);
      toast.error('Error al registrar la venta de nota de salida');
      throw error;
    }
  },

  // Obtener todas las ventas de notas de salida
  async getAll(): Promise<ExitNoteSale[]> {
    try {
      const q = query(collection(db, 'exitNoteSales'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: convertTimestamp(doc.data().date),
        createdAt: convertTimestamp(doc.data().createdAt)
      })) as ExitNoteSale[];
    } catch (error) {
      console.error('Error getting exit note sales:', error);
      toast.error('Error al cargar ventas de notas de salida');
      throw error;
    }
  },

  // Obtener total de ventas de notas de salida
  async getTotalSales(): Promise<number> {
    try {
      const sales = await this.getAll();
      return sales.reduce((sum, sale) => sum + sale.totalValue, 0);
    } catch (error) {
      console.error('Error getting total sales:', error);
      return 0;
    }
  },

  // Eliminar venta por ID de nota de salida
  async deleteByExitNoteId(exitNoteId: string): Promise<void> {
    try {
      // Buscar la entrada de contabilidad por noteNumber (que debería coincidir con el ID de la nota)
      const q = query(
        collection(db, 'exitNoteSales'),
        where('noteNumber', '==', exitNoteId)
      );
      const querySnapshot = await getDocs(q);
      
      // Eliminar todas las entradas encontradas
      for (const docSnapshot of querySnapshot.docs) {
        await deleteDoc(doc(db, 'exitNoteSales', docSnapshot.id));
        console.log('Entrada de contabilidad eliminada:', docSnapshot.id);
      }
    } catch (error) {
      console.error('Error deleting accounting entry by exit note ID:', error);
      throw error;
    }
  }
};
