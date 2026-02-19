import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface AnnabelInventoryItem {
    id: string;
    productId: string;
    productName: string;
    sku: string;
    imageUrl?: string;
    quantity: number;
    unitPrice: number;
    totalValue: number;
    status: 'inventario' | 'vendido' | 'devuelto';
    transferredAt: Date;
    soldAt?: Date;
}

class AnnabelInventoryService {
    private collectionName = 'annabelInventory';

    async getAll(): Promise<AnnabelInventoryItem[]> {
        const snapshot = await getDocs(collection(db, this.collectionName));
        return snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            status: d.data().status || 'inventario',
            transferredAt: d.data().transferredAt?.toDate() || new Date(),
            soldAt: d.data().soldAt?.toDate() || null
        })) as AnnabelInventoryItem[];
    }

    async addProduct(product: any, quantity: number, unitPrice: number): Promise<string> {
        const existing = await this.getAll();
        const found = existing.find(i => i.productId === product.id && i.status === 'inventario');

        if (found) {
            const newQty = found.quantity + quantity;
            await updateDoc(doc(db, this.collectionName, found.id), {
                quantity: newQty,
                totalValue: unitPrice * newQty,
                unitPrice: unitPrice
            });
            return found.id;
        }

        const docRef = await addDoc(collection(db, this.collectionName), {
            productId: product.id,
            productName: product.name || '',
            sku: product.sku || '',
            imageUrl: product.imageUrl || '',
            quantity,
            unitPrice,
            totalValue: unitPrice * quantity,
            status: 'inventario',
            transferredAt: Timestamp.now()
        });
        return docRef.id;
    }

    async markAsSold(id: string): Promise<void> {
        await updateDoc(doc(db, this.collectionName, id), {
            status: 'vendido',
            soldAt: Timestamp.now()
        });
    }

    async markAsReturned(id: string): Promise<void> {
        await updateDoc(doc(db, this.collectionName, id), {
            status: 'devuelto'
        });
    }

    async updateQuantity(id: string, newQuantity: number, unitPrice: number): Promise<void> {
        await updateDoc(doc(db, this.collectionName, id), {
            quantity: newQuantity,
            totalValue: unitPrice * newQuantity
        });
    }

    async remove(id: string): Promise<void> {
        await deleteDoc(doc(db, this.collectionName, id));
    }
}

export const annabelInventoryService = new AnnabelInventoryService();
