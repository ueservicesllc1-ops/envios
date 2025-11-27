import { collection, addDoc, updateDoc, deleteDoc, getDocs, doc, query, orderBy, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface PaymentNoteItem {
  productId?: string;
  productName?: string;
  sku?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  description: string;
  amount: number;
}

export interface PaymentNote {
  id: string;
  number: string;
  sellerId?: string;
  sellerName?: string;
  customerId?: string;
  customerName?: string;
  sourceType: 'seller' | 'customer';
  items: PaymentNoteItem[];
  totalAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  paymentDate?: Date;
  reference?: string;
  notes?: string;
  paymentMethod: 'cash' | 'bank_deposit';
  receiptImageUrl?: string;
  createdBy?: string;
}

const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return timestamp;
};

export const paymentNoteService = {
  async create(paymentNoteData: Omit<PaymentNote, 'id' | 'createdAt'>): Promise<string> {
    try {
      // Filtrar campos undefined para evitar errores de Firestore
      const cleanData: any = {
        ...paymentNoteData,
        sourceType: paymentNoteData.sourceType ?? 'seller',
        createdAt: new Date()
      };
      
      // Remover campos undefined
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key];
        }
      });
      
      const docRef = await addDoc(collection(db, 'paymentNotes'), cleanData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating payment note:', error);
      throw error;
    }
  },

  async getAll(): Promise<PaymentNote[]> {
    try {
      const q = query(collection(db, 'paymentNotes'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const sourceType = (data.sourceType as 'seller' | 'customer') ?? 'seller';

        return {
          id: doc.id,
          ...data,
          sourceType,
          createdAt: convertTimestamp(data.createdAt),
          approvedAt: convertTimestamp(data.approvedAt),
          paymentDate: convertTimestamp(data.paymentDate)
        } as PaymentNote;
      });
    } catch (error) {
      console.error('Error getting payment notes:', error);
      throw error;
    }
  },

  async getBySeller(sellerId: string): Promise<PaymentNote[]> {
    try {
      // Obtener todas las notas y filtrar en el cliente para evitar índice compuesto
      const q = query(collection(db, 'paymentNotes'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const allNotes = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const sourceType = (data.sourceType as 'seller' | 'customer') ?? 'seller';

        return {
          id: doc.id,
          ...data,
          sourceType,
          createdAt: convertTimestamp(data.createdAt),
          approvedAt: convertTimestamp(data.approvedAt),
          paymentDate: convertTimestamp(data.paymentDate)
        } as PaymentNote;
      });

      // Filtrar por sellerId en el cliente
      return allNotes.filter(note => note.sellerId === sellerId);
    } catch (error) {
      console.error('Error getting payment notes by seller:', error);
      throw error;
    }
  },

  async getPending(): Promise<PaymentNote[]> {
    try {
      const q = query(
        collection(db, 'paymentNotes'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const sourceType = (data.sourceType as 'seller' | 'customer') ?? 'seller';

        return {
          id: doc.id,
          ...data,
          sourceType,
          createdAt: convertTimestamp(data.createdAt),
          approvedAt: convertTimestamp(data.approvedAt),
          paymentDate: convertTimestamp(data.paymentDate)
        } as PaymentNote;
      });
    } catch (error) {
      console.error('Error getting pending payment notes:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<PaymentNote | null> {
    try {
      const docRef = doc(db, 'paymentNotes', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const sourceType = (data.sourceType as 'seller' | 'customer') ?? 'seller';

        return {
          id: docSnap.id,
          ...data,
          sourceType,
          createdAt: convertTimestamp(data.createdAt),
          approvedAt: convertTimestamp(data.approvedAt),
          paymentDate: convertTimestamp(data.paymentDate)
        } as PaymentNote;
      }
      return null;
    } catch (error) {
      console.error('Error getting payment note by ID:', error);
      throw error;
    }
  },

  async update(id: string, paymentNoteData: Partial<PaymentNote>): Promise<void> {
    try {
      const docRef = doc(db, 'paymentNotes', id);
      const cleanData = Object.fromEntries(
        Object.entries(paymentNoteData).filter(([_, value]) => value !== undefined)
      );
      await updateDoc(docRef, cleanData);
    } catch (error) {
      console.error('Error updating payment note:', error);
      throw error;
    }
  },

  async approve(id: string, approvedBy: string): Promise<void> {
    try {
      const docRef = doc(db, 'paymentNotes', id);
      await updateDoc(docRef, {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: approvedBy
      });
    } catch (error) {
      console.error('Error approving payment note:', error);
      throw error;
    }
  },

  async reject(id: string, approvedBy: string): Promise<void> {
    try {
      const docRef = doc(db, 'paymentNotes', id);
      await updateDoc(docRef, {
        status: 'rejected',
        approvedAt: new Date(),
        approvedBy: approvedBy
      });
    } catch (error) {
      console.error('Error rejecting payment note:', error);
      throw error;
    }
  },

  async updateStatus(id: string, status: 'pending' | 'approved' | 'rejected', approvedBy?: string): Promise<void> {
    try {
      const updateData: any = { status };
      
      if (status === 'approved') {
        updateData.approvedAt = new Date();
        if (approvedBy) {
          updateData.approvedBy = approvedBy;
        }
      }
      
      await updateDoc(doc(db, 'paymentNotes', id), updateData);
    } catch (error) {
      console.error('Error updating payment note status:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'paymentNotes', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting payment note:', error);
      throw error;
    }
  }
};
