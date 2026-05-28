import {
    collection, doc, addDoc, getDocs,
    query, orderBy, where, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export type VibePaymentMethod = 'paypal' | 'banco_pichincha' | 'banco_guayaquil' | 'transferencia' | 'efectivo' | 'card';

export interface VibePayment {
    id?: string;
    number?: string;
    orderId: string;
    orderNumber?: string;
    userId: string;
    userEmail: string;
    userName?: string;
    amount: number;
    paymentMethod: VibePaymentMethod;
    status: 'pending' | 'confirmed' | 'rejected';
    receiptUrl?: string;           // URL de comprobante subido
    transactionId?: string;        // ID de transacción PayPal, etc.
    notes?: string;
    confirmedBy?: string;          // email del admin que confirmó
    confirmedAt?: any;
    createdAt?: any;
}

const COLLECTION = 'vibePayments';

export const vibePaymentService = {

    async create(payment: Omit<VibePayment, 'id' | 'number' | 'createdAt'>): Promise<string> {
        const count = (await getDocs(collection(db, COLLECTION))).size;
        const number = `VP-${String(count + 1).padStart(5, '0')}`;

        const docRef = await addDoc(collection(db, COLLECTION), {
            ...payment,
            number,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        return docRef.id;
    },

    async getAll(): Promise<VibePayment[]> {
        const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as VibePayment));
    },

    async getByUser(userId: string): Promise<VibePayment[]> {
        const q = query(
            collection(db, COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as VibePayment));
    },

    async confirm(id: string, adminEmail: string): Promise<void> {
        await updateDoc(doc(db, COLLECTION, id), {
            status: 'confirmed',
            confirmedBy: adminEmail,
            confirmedAt: serverTimestamp()
        });
    },

    async reject(id: string): Promise<void> {
        await updateDoc(doc(db, COLLECTION, id), {
            status: 'rejected'
        });
    }
};
