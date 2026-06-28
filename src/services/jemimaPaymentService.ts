import {
    collection,
    doc,
    getDocs,
    addDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface JemimaPayment {
    id: string;
    amount: number;
    date: Date;
    notes?: string;
}

class JemimaPaymentService {
    private collectionName = 'jemimaPayments';

    async getAll(): Promise<JemimaPayment[]> {
        const snapshot = await getDocs(collection(db, this.collectionName));
        return snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            date: d.data().date?.toDate() || new Date()
        })) as JemimaPayment[];
    }

    async add(amount: number, notes?: string): Promise<string> {
        const docRef = await addDoc(collection(db, this.collectionName), {
            amount,
            notes: notes || '',
            date: Timestamp.now()
        });
        return docRef.id;
    }
}

export const jemimaPaymentService = new JemimaPaymentService();
