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
    Timestamp,
    limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { CashRegister } from '../types';
import toast from 'react-hot-toast';

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
    if (timestamp && timestamp.toDate) {
        return timestamp.toDate();
    }
    return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

export const cashRegisterService = {
    // Generar número de caja
    async generateRegisterNumber(): Promise<string> {
        try {
            const registersQuery = query(
                collection(db, 'cash_registers'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            const registersSnapshot = await getDocs(registersQuery);

            if (registersSnapshot.empty) {
                return 'CAJA-000001';
            }

            const lastRegister = registersSnapshot.docs[0].data();
            const lastNumber = parseInt(lastRegister.registerNumber.split('-')[1]);
            const newNumber = lastNumber + 1;

            return `CAJA-${newNumber.toString().padStart(6, '0')}`;
        } catch (error) {
            console.error('Error generating register number:', error);
            return `CAJA-${Date.now().toString().slice(-6)}`;
        }
    },

    // Abrir caja
    async openRegister(initialCash: number, openedBy: string): Promise<string> {
        try {
            // Verificar si ya hay una caja abierta
            const currentRegister = await this.getCurrentRegister();
            if (currentRegister) {
                throw new Error('Ya existe una caja abierta. Por favor ciérrela antes de abrir una nueva.');
            }

            const registerNumber = await this.generateRegisterNumber();
            const now = new Date();

            const docRef = await addDoc(collection(db, 'cash_registers'), {
                registerNumber,
                openedAt: convertToTimestamp(now),
                openedBy,
                initialCash,
                totalSales: 0,
                totalCash: 0,
                totalCard: 0,
                totalTransfer: 0,
                expectedCash: initialCash,
                salesCount: 0,
                status: 'open',
                createdAt: convertToTimestamp(now)
            });

            toast.success(`Caja ${registerNumber} abierta exitosamente`);
            return docRef.id;
        } catch (error) {
            console.error('Error opening register:', error);
            toast.error(error instanceof Error ? error.message : 'Error al abrir la caja');
            throw error;
        }
    },

    // Cerrar caja
    async closeRegister(id: string, finalCash: number, closedBy: string, notes?: string): Promise<void> {
        try {
            const register = await this.getRegisterById(id);
            if (!register) {
                throw new Error('Caja no encontrada');
            }

            if (register.status === 'closed') {
                throw new Error('La caja ya está cerrada');
            }

            const cashDifference = finalCash - register.expectedCash;

            await updateDoc(doc(db, 'cash_registers', id), {
                closedAt: convertToTimestamp(new Date()),
                closedBy,
                finalCash,
                cashDifference,
                status: 'closed',
                notes: notes || ''
            });

            const message = cashDifference === 0
                ? 'Caja cerrada correctamente. Cuadre perfecto!'
                : `Caja cerrada. Diferencia: $${Math.abs(cashDifference).toFixed(2)} ${cashDifference > 0 ? 'sobrante' : 'faltante'}`;

            toast.success(message);
        } catch (error) {
            console.error('Error closing register:', error);
            toast.error(error instanceof Error ? error.message : 'Error al cerrar la caja');
            throw error;
        }
    },

    // Obtener caja actual (abierta)
    async getCurrentRegister(): Promise<CashRegister | null> {
        try {
            const q = query(
                collection(db, 'cash_registers'),
                where('status', '==', 'open'),
                orderBy('openedAt', 'desc'),
                limit(1)
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
                openedAt: convertTimestamp(data.openedAt),
                closedAt: data.closedAt ? convertTimestamp(data.closedAt) : undefined,
                createdAt: convertTimestamp(data.createdAt)
            } as CashRegister;
        } catch (error) {
            console.error('Error getting current register:', error);
            return null;
        }
    },

    // Obtener caja por ID
    async getRegisterById(id: string): Promise<CashRegister | null> {
        try {
            const docRef = doc(db, 'cash_registers', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                    openedAt: convertTimestamp(data.openedAt),
                    closedAt: data.closedAt ? convertTimestamp(data.closedAt) : undefined,
                    createdAt: convertTimestamp(data.createdAt)
                } as CashRegister;
            }
            return null;
        } catch (error) {
            console.error('Error getting register:', error);
            throw error;
        }
    },

    // Obtener todas las cajas
    async getAll(): Promise<CashRegister[]> {
        try {
            const q = query(collection(db, 'cash_registers'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                openedAt: convertTimestamp(doc.data().openedAt),
                closedAt: doc.data().closedAt ? convertTimestamp(doc.data().closedAt) : undefined,
                createdAt: convertTimestamp(doc.data().createdAt)
            })) as CashRegister[];
        } catch (error) {
            console.error('Error getting all registers:', error);
            throw error;
        }
    },

    // Agregar venta a la caja actual
    async addSaleToRegister(saleTotal: number, paymentMethod: string, cashAmount?: number, cardAmount?: number, transferAmount?: number): Promise<void> {
        try {
            const currentRegister = await this.getCurrentRegister();
            if (!currentRegister) {
                console.warn('No hay caja abierta, no se registrará en caja');
                return;
            }

            const updates: any = {
                totalSales: currentRegister.totalSales + saleTotal,
                salesCount: currentRegister.salesCount + 1
            };

            if (paymentMethod === 'cash') {
                updates.totalCash = currentRegister.totalCash + saleTotal;
                updates.expectedCash = currentRegister.initialCash + updates.totalCash;
            } else if (paymentMethod === 'card') {
                updates.totalCard = currentRegister.totalCard + saleTotal;
            } else if (paymentMethod === 'transfer') {
                updates.totalTransfer = currentRegister.totalTransfer + saleTotal;
            } else if (paymentMethod === 'mixed') {
                updates.totalCash = currentRegister.totalCash + (cashAmount || 0);
                updates.totalCard = currentRegister.totalCard + (cardAmount || 0);
                updates.totalTransfer = currentRegister.totalTransfer + (transferAmount || 0);
                updates.expectedCash = currentRegister.initialCash + updates.totalCash;
            }

            await updateDoc(doc(db, 'cash_registers', currentRegister.id), updates);
        } catch (error) {
            console.error('Error adding sale to register:', error);
            // No lanzar error para no bloquear la venta
        }
    }
};
