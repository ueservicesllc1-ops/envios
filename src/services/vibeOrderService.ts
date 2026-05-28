import {
    collection, doc, addDoc, getDocs, getDoc,
    query, orderBy, where, updateDoc, serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface VibeOrderItem {
    productId: string;
    productName: string;
    productImage?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface VibeOrder {
    id?: string;
    number?: string;
    userId: string;
    userEmail: string;
    userName?: string;
    userPhone?: string;
    items: VibeOrderItem[];
    totalAmount: number;
    shippingCost?: number;
    shippingCity?: string;
    shippingAddress?: string;
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    paymentStatus: 'pending' | 'paid' | 'failed';
    paymentRef?: string; // Reference to vibePayments doc
    notes?: string;
    createdAt?: any;
    updatedAt?: any;
}

const COLLECTION = 'vibeOrders';

export const vibeOrderService = {

    async create(order: Omit<VibeOrder, 'id' | 'number' | 'createdAt' | 'updatedAt'>): Promise<string> {
        // Generate order number
        const count = (await getDocs(collection(db, COLLECTION))).size;
        const number = `VIBE-${String(count + 1).padStart(5, '0')}`;

        const docRef = await addDoc(collection(db, COLLECTION), {
            ...order,
            number,
            status: 'pending',
            paymentStatus: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    },

    async getAll(): Promise<VibeOrder[]> {
        const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as VibeOrder));
    },

    async getByUser(userId: string): Promise<VibeOrder[]> {
        const q = query(
            collection(db, COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as VibeOrder));
    },

    async updateStatus(id: string, status: VibeOrder['status']): Promise<void> {
        await updateDoc(doc(db, COLLECTION, id), {
            status,
            updatedAt: serverTimestamp()
        });
    },

    async updatePaymentStatus(id: string, paymentStatus: VibeOrder['paymentStatus'], paymentRef?: string): Promise<void> {
        await updateDoc(doc(db, COLLECTION, id), {
            paymentStatus,
            ...(paymentRef ? { paymentRef } : {}),
            ...(paymentStatus === 'paid' ? { status: 'confirmed' } : {}),
            updatedAt: serverTimestamp()
        });
    },

    subscribeToAll(callback: (orders: VibeOrder[]) => void) {
        const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
        return onSnapshot(q, snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as VibeOrder)));
        });
    }
};
