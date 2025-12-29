import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { POSCustomer } from '../types';
import toast from 'react-hot-toast';

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
    if (timestamp && timestamp.toDate) {
        return timestamp.toDate();
    }
    return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

export const posCustomerService = {
    // Crear cliente
    async create(customer: Omit<POSCustomer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const now = new Date();

            // Limpiar campos undefined
            const cleanCustomer = Object.fromEntries(
                Object.entries(customer).filter(([_, v]) => v !== undefined)
            );

            const docRef = await addDoc(collection(db, 'pos_customers'), {
                ...cleanCustomer,
                createdAt: convertToTimestamp(now),
                updatedAt: convertToTimestamp(now)
            });

            toast.success('Cliente creado exitosamente');
            return docRef.id;
        } catch (error) {
            console.error('Error creating customer:', error);
            toast.error('Error al crear el cliente');
            throw error;
        }
    },

    // Actualizar cliente
    async update(id: string, customer: Partial<POSCustomer>): Promise<void> {
        try {
            await updateDoc(doc(db, 'pos_customers', id), {
                ...customer,
                updatedAt: convertToTimestamp(new Date())
            });

            toast.success('Cliente actualizado exitosamente');
        } catch (error) {
            console.error('Error updating customer:', error);
            toast.error('Error al actualizar el cliente');
            throw error;
        }
    },

    // Obtener cliente por ID
    async getById(id: string): Promise<POSCustomer | null> {
        try {
            const docRef = doc(db, 'pos_customers', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                    lastPurchaseDate: data.lastPurchaseDate ? convertTimestamp(data.lastPurchaseDate) : undefined,
                    createdAt: convertTimestamp(data.createdAt),
                    updatedAt: convertTimestamp(data.updatedAt)
                } as POSCustomer;
            }
            return null;
        } catch (error) {
            console.error('Error getting customer:', error);
            throw error;
        }
    },

    // Obtener todos los clientes
    async getAll(): Promise<POSCustomer[]> {
        try {
            const q = query(
                collection(db, 'pos_customers'),
                where('isActive', '==', true),
                orderBy('name', 'asc')
            );
            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                lastPurchaseDate: doc.data().lastPurchaseDate ? convertTimestamp(doc.data().lastPurchaseDate) : undefined,
                createdAt: convertTimestamp(doc.data().createdAt),
                updatedAt: convertTimestamp(doc.data().updatedAt)
            })) as POSCustomer[];
        } catch (error) {
            console.error('Error getting all customers:', error);
            throw error;
        }
    },

    // Buscar por teléfono
    async searchByPhone(phone: string): Promise<POSCustomer | null> {
        try {
            const q = query(
                collection(db, 'pos_customers'),
                where('phone', '==', phone),
                where('isActive', '==', true)
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return null;
            }

            const doc = querySnapshot.docs[0];
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                lastPurchaseDate: data.lastPurchaseDate ? convertTimestamp(data.lastPurchaseDate) : undefined,
                createdAt: convertTimestamp(data.createdAt),
                updatedAt: convertTimestamp(data.updatedAt)
            } as POSCustomer;
        } catch (error) {
            console.error('Error searching customer by phone:', error);
            throw error;
        }
    },

    // Actualizar historial de compras
    async updatePurchaseHistory(id: string, purchaseAmount: number): Promise<void> {
        try {
            const customer = await this.getById(id);
            if (!customer) return;

            await updateDoc(doc(db, 'pos_customers', id), {
                totalPurchases: customer.totalPurchases + purchaseAmount,
                lastPurchaseDate: convertToTimestamp(new Date()),
                updatedAt: convertToTimestamp(new Date())
            });
        } catch (error) {
            console.error('Error updating purchase history:', error);
            // No lanzar error para no bloquear la venta
        }
    }
};
