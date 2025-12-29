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
import { PointOfSale, POSItem } from '../types';
import { inventoryService } from './inventoryService';
import { productService } from './productService';
import toast from 'react-hot-toast';

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
    if (timestamp && timestamp.toDate) {
        return timestamp.toDate();
    }
    return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

export const posService = {
    // Generar número de venta
    async generateSaleNumber(): Promise<string> {
        try {
            const salesQuery = query(
                collection(db, 'pos_sales'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            const salesSnapshot = await getDocs(salesQuery);

            if (salesSnapshot.empty) {
                return 'POS-000001';
            }

            const lastSale = salesSnapshot.docs[0].data();
            const lastNumber = parseInt(lastSale.saleNumber.split('-')[1]);
            const newNumber = lastNumber + 1;

            return `POS-${newNumber.toString().padStart(6, '0')}`;
        } catch (error) {
            console.error('Error generating sale number:', error);
            return `POS-${Date.now().toString().slice(-6)}`;
        }
    },

    // Crear venta
    async createSale(sale: Omit<PointOfSale, 'id' | 'saleNumber' | 'createdAt'>): Promise<string> {
        try {
            const saleNumber = await this.generateSaleNumber();
            const now = new Date();

            // Validar stock antes de crear la venta
            for (const item of sale.items) {
                const inventoryItem = await inventoryService.getByProductIdAndLocation(
                    item.productId,
                    'Bodega Principal'
                );

                if (!inventoryItem || inventoryItem.quantity < item.quantity) {
                    throw new Error(`Stock insuficiente para ${item.product.name}`);
                }
            }

            // Limpiar campos undefined que Firebase no acepta
            const cleanSale = Object.fromEntries(
                Object.entries(sale).filter(([_, v]) => v !== undefined)
            );

            // Crear la venta
            const docRef = await addDoc(collection(db, 'pos_sales'), {
                ...cleanSale,
                saleNumber,
                date: convertToTimestamp(sale.date),
                createdAt: convertToTimestamp(now)
            });

            // Descontar del inventario
            // Descontar del inventario
            for (const item of sale.items) {
                await inventoryService.removeStock(
                    item.productId,
                    item.quantity,
                    'Bodega Principal'
                );
            }

            // Crear asiento contable
            await this.createAccountingEntry(docRef.id, sale);

            toast.success(`Venta ${saleNumber} creada exitosamente`);
            return docRef.id;
        } catch (error) {
            console.error('Error creating POS sale:', error);
            toast.error(error instanceof Error ? error.message : 'Error al crear la venta');
            throw error;
        }
    },

    // Obtener venta por ID
    async getSaleById(id: string): Promise<PointOfSale | null> {
        try {
            const docRef = doc(db, 'pos_sales', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                    date: convertTimestamp(data.date),
                    createdAt: convertTimestamp(data.createdAt)
                } as PointOfSale;
            }
            return null;
        } catch (error) {
            console.error('Error getting sale:', error);
            throw error;
        }
    },

    // Obtener todas las ventas
    async getAll(): Promise<PointOfSale[]> {
        try {
            const q = query(collection(db, 'pos_sales'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: convertTimestamp(doc.data().date),
                createdAt: convertTimestamp(doc.data().createdAt)
            })) as PointOfSale[];
        } catch (error) {
            console.error('Error getting all sales:', error);
            throw error;
        }
    },

    // Obtener ventas por rango de fechas
    async getSalesByDateRange(startDate: Date, endDate: Date): Promise<PointOfSale[]> {
        try {
            const q = query(
                collection(db, 'pos_sales'),
                where('date', '>=', convertToTimestamp(startDate)),
                where('date', '<=', convertToTimestamp(endDate)),
                orderBy('date', 'desc')
            );
            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: convertTimestamp(doc.data().date),
                createdAt: convertTimestamp(doc.data().createdAt)
            })) as PointOfSale[];
        } catch (error) {
            console.error('Error getting sales by date range:', error);
            throw error;
        }
    },

    // Obtener ventas del día
    async getTodaySales(): Promise<PointOfSale[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.getSalesByDateRange(today, tomorrow);
    },

    // Cancelar venta y revertir inventario
    async cancelSale(id: string, reason: string): Promise<void> {
        try {
            const sale = await this.getSaleById(id);
            if (!sale) {
                throw new Error('Venta no encontrada');
            }

            if (sale.status === 'cancelled') {
                throw new Error('La venta ya está cancelada');
            }

            // Revertir inventario
            for (const item of sale.items) {
                await inventoryService.addStock(
                    item.productId,
                    item.quantity,
                    item.product.cost || 0,
                    item.unitPrice,
                    'Bodega Principal'
                );
            }

            // Actualizar estado de la venta
            await updateDoc(doc(db, 'pos_sales', id), {
                status: 'cancelled',
                notes: `${sale.notes || ''}\nCancelada: ${reason}`
            });

            toast.success('Venta cancelada y stock revertido');
        } catch (error) {
            console.error('Error cancelling sale:', error);
            toast.error(error instanceof Error ? error.message : 'Error al cancelar la venta');
            throw error;
        }
    },

    // Crear asiento contable para la venta
    async createAccountingEntry(saleId: string, sale: Omit<PointOfSale, 'id' | 'saleNumber' | 'createdAt'>): Promise<void> {
        try {
            await addDoc(collection(db, 'pos_accounting'), {
                saleId,
                saleNumber: (await this.getSaleById(saleId))?.saleNumber || 'N/A',
                totalValue: sale.total,
                date: convertToTimestamp(sale.date),
                paymentMethod: sale.paymentMethod,
                status: sale.status,
                createdAt: convertToTimestamp(new Date()),
                notes: `Venta POS - Cliente: ${sale.customerName || 'Público General'}`
            });
        } catch (error) {
            console.error('Error creating accounting entry:', error);
            // No lanzar error para no bloquear la venta
        }
    },

    // Obtener reporte de ventas diarias
    async getDailySalesReport(date: Date = new Date()) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const sales = await this.getSalesByDateRange(startOfDay, endOfDay);

        const totalSales = sales.filter(s => s.status === 'completed').length;
        const totalRevenue = sales
            .filter(s => s.status === 'completed')
            .reduce((sum, sale) => sum + sale.total, 0);
        const totalCash = sales
            .filter(s => s.status === 'completed' && (s.paymentMethod === 'cash' || s.paymentMethod === 'mixed'))
            .reduce((sum, sale) => sum + (sale.cashReceived || sale.total), 0);
        const totalCard = sales
            .filter(s => s.status === 'completed' && (s.paymentMethod === 'card' || s.paymentMethod === 'mixed'))
            .reduce((sum, sale) => sum + (sale.cardAmount || sale.total), 0);
        const totalTransfer = sales
            .filter(s => s.status === 'completed' && (s.paymentMethod === 'transfer' || s.paymentMethod === 'mixed'))
            .reduce((sum, sale) => sum + (sale.transferAmount || sale.total), 0);

        return {
            date,
            totalSales,
            totalRevenue,
            totalCash,
            totalCard,
            totalTransfer,
            sales
        };
    }
};
