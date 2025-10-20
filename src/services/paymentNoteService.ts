import { collection, addDoc, updateDoc, deleteDoc, getDocs, doc, query, orderBy, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface PaymentNoteItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PaymentNote {
  id: string;
  number: string;
  sellerId: string;
  sellerName: string;
  items: PaymentNoteItem[];
  totalAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  notes?: string;
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
      const docRef = await addDoc(collection(db, 'paymentNotes'), {
        ...paymentNoteData,
        createdAt: new Date()
      });
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
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        approvedAt: convertTimestamp(doc.data().approvedAt)
      })) as PaymentNote[];
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
      
      const allNotes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        approvedAt: convertTimestamp(doc.data().approvedAt)
      })) as PaymentNote[];

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
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        approvedAt: convertTimestamp(doc.data().approvedAt)
      })) as PaymentNote[];
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
        return {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: convertTimestamp(docSnap.data().createdAt),
          approvedAt: convertTimestamp(docSnap.data().approvedAt)
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
