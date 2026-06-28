import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface BodegaLuisItem {
    id: string;
    productId: string;
    productName: string;
    sku: string;
    imageUrl?: string;
    quantity: number;
    cost: number;
    unitPrice: number;
    totalValue: number;
    location: 'Bodega Luis';
    status: 'stock' | 'in-transit' | 'delivered';
    addedAt: Date;
    updatedAt: Date;
}

class BodegaLuisInventoryService {
    private collectionName = 'bodegaLuisInventory';

    async getAll(): Promise<BodegaLuisItem[]> {
        const snapshot = await getDocs(collection(db, this.collectionName));
        return snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            location: 'Bodega Luis' as const,
            status: d.data().status || 'stock',
            addedAt: d.data().addedAt?.toDate() || new Date(),
            updatedAt: d.data().updatedAt?.toDate() || new Date(),
        })) as BodegaLuisItem[];
    }

    async getInStock(): Promise<BodegaLuisItem[]> {
        const all = await this.getAll();
        return all.filter(item => item.quantity > 0);
    }

    async addStock(
        productId: string,
        productName: string,
        sku: string,
        imageUrl: string,
        quantity: number,
        cost: number,
        unitPrice: number
    ): Promise<string> {
        const existing = await this.getAll();
        const found = existing.find(i => i.productId === productId && i.status === 'stock');

        if (found) {
            const newQty = found.quantity + quantity;
            await updateDoc(doc(db, this.collectionName, found.id), {
                quantity: newQty,
                totalValue: unitPrice * newQty,
                unitPrice,
                cost,
                updatedAt: Timestamp.now()
            });
            return found.id;
        }

        const docRef = await addDoc(collection(db, this.collectionName), {
            productId,
            productName,
            sku,
            imageUrl: imageUrl || '',
            quantity,
            cost,
            unitPrice,
            totalValue: unitPrice * quantity,
            location: 'Bodega Luis',
            status: 'stock',
            addedAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        return docRef.id;
    }

    async removeStock(productId: string, quantity: number): Promise<void> {
        const all = await this.getAll();
        const found = all.find(i => i.productId === productId && i.status === 'stock');
        if (!found) throw new Error('Producto no encontrado en Bodega Luis');

        const newQty = Math.max(0, found.quantity - quantity);
        if (newQty === 0) {
            await deleteDoc(doc(db, this.collectionName, found.id));
        } else {
            await updateDoc(doc(db, this.collectionName, found.id), {
                quantity: newQty,
                totalValue: found.unitPrice * newQty,
                updatedAt: Timestamp.now()
            });
        }
    }

    async updateQuantity(id: string, newQuantity: number, unitPrice: number): Promise<void> {
        await updateDoc(doc(db, this.collectionName, id), {
            quantity: newQuantity,
            totalValue: unitPrice * newQuantity,
            updatedAt: Timestamp.now()
        });
    }

    async remove(id: string): Promise<void> {
        await deleteDoc(doc(db, this.collectionName, id));
    }
}

export const bodegaLuisInventoryService = new BodegaLuisInventoryService();
