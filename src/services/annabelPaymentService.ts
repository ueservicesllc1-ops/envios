import {
    collection,
    getDocs,
    addDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface AnnabelPayment {
    id: string;
    amount: number;
    date: Date;
    notes?: string;
}

class AnnabelPaymentService {
    private collectionName = 'annabelPayments';

    async getAll(): Promise<AnnabelPayment[]> {
        const snapshot = await getDocs(collection(db, this.collectionName));
        return snapshot.docs
            .map(d => ({
                id: d.id,
                ...d.data(),
                date: d.data().date?.toDate() || new Date()
            })) as AnnabelPayment[];
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

export const annabelPaymentService = new AnnabelPaymentService();
