import {
    collection,
    getDocs,
    addDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface VilmaPayment {
    id: string;
    amount: number;
    date: Date;
    notes?: string;
}

class VilmaPaymentService {
    private collectionName = 'vilmaPayments';

    async getAll(): Promise<VilmaPayment[]> {
        const snapshot = await getDocs(collection(db, this.collectionName));
        return snapshot.docs
            .map(d => ({
                id: d.id,
                ...d.data(),
                date: d.data().date?.toDate() || new Date()
            })) as VilmaPayment[];
    }

    async addPayment(amount: number, notes?: string): Promise<string> {
        const docRef = await addDoc(collection(db, this.collectionName), {
            amount,
            date: Timestamp.now(),
            notes: notes || ''
        });
        return docRef.id;
    }
}

export const vilmaPaymentService = new VilmaPaymentService();
