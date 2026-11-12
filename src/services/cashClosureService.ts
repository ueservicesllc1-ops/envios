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
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { CashClosure, PointOfSale } from '../types';
import toast from 'react-hot-toast';

const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp || Date.now());
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

export const cashClosureService = {
  // Generar número consecutivo de cierre
  async generateClosureNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    try {
      const q = query(
        collection(db, 'cash_closures'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const todayClosures = snapshot.docs.filter(d => {
        const num = d.data().closureNumber || '';
        return num.includes(dateStr);
      });
      const seq = (todayClosures.length + 1).toString().padStart(2, '0');
      return `CIERRE-${dateStr}-${seq}`;
    } catch (e) {
      return `CIERRE-${dateStr}-${Date.now().toString().slice(-4)}`;
    }
  },

  // Obtener ventas pendientes de cierre (completadas y sin closureId)
  // También incluye el efectivo dejado en caja por el último cierre (carry-forward)
  async getPendingSales(): Promise<{
    sales: PointOfSale[];
    totalSales: number;
    expectedCash: number;
    totalTransfer: number;
    totalCard: number;
    salesCount: number;
    carryForwardCash: number;       // efectivo que quedó en caja del cierre anterior
    lastClosureNumber: string | null; // número del cierre que dejó ese saldo
  }> {
    try {
      // ── 1. Ventas sin cierre ────────────────────────────────────────────────
      const q = query(
        collection(db, 'pos_sales'),
        where('status', '==', 'completed')
      );
      const snapshot = await getDocs(q);

      const allCompleted = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        date: convertTimestamp(docSnap.data().date),
        createdAt: convertTimestamp(docSnap.data().createdAt)
      })) as PointOfSale[];

      allCompleted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Filtrar las que aún no tienen closureId asignado
      const pending = allCompleted.filter(s => !(s as any).closureId);

      let totalSales = 0;
      let expectedCash = 0;
      let totalTransfer = 0;
      let totalCard = 0;

      for (const s of pending) {
        const tot = Number(s.total) || 0;
        totalSales += tot;
        if (s.paymentMethod === 'cash') {
          expectedCash += tot;
        } else if (s.paymentMethod === 'transfer') {
          totalTransfer += tot;
        } else if (s.paymentMethod === 'card') {
          totalCard += tot;
        } else if (s.paymentMethod === 'mixed') {
          expectedCash += Number(s.cashReceived) || 0;
          totalCard += Number(s.cardAmount) || 0;
          totalTransfer += Number(s.transferAmount) || 0;
        }
      }

      // ── 2. Efectivo carry-forward del último cierre ────────────────────────
      let carryForwardCash = 0;
      let lastClosureNumber: string | null = null;
      try {
        const closuresQ = query(
          collection(db, 'cash_closures'),
          orderBy('createdAt', 'desc')
        );
        const closuresSnap = await getDocs(closuresQ);
        if (!closuresSnap.empty) {
          const lastData = closuresSnap.docs[0].data();
          carryForwardCash = Number(lastData.cashKeptInRegister) || 0;
          lastClosureNumber = lastData.closureNumber || null;
        }
      } catch (_) {
        // Si no hay cierres previos simplemente no hay carry-forward
      }

      return {
        sales: pending,
        totalSales,
        expectedCash,
        totalTransfer,
        totalCard,
        salesCount: pending.length,
        carryForwardCash,
        lastClosureNumber
      };
    } catch (error) {
      console.error('Error fetching pending sales for closure:', error);
      throw error;
    }
  },

  // Crear y guardar un cierre de caja
  async createClosure(data: {
    sellerName: string;
    totalSales: number;
    expectedCash: number;        // cash de ventas nuevas únicamente
    totalTransfer: number;
    totalCard: number;
    amountToDeposit: number;
    cashKeptInRegister: number;
    cashCounted: number;
    difference: number;
    depositReference?: string;
    salesIds: string[];
    notes?: string;
    customDate?: Date;
    carryForwardCash?: number;   // saldo en caja del cierre anterior
    lastClosureNumber?: string | null;
  }): Promise<string> {
    try {
      const closureNumber = await this.generateClosureNumber();
      const now = data.customDate || new Date();
      const batch = writeBatch(db);

      const closureRef = doc(collection(db, 'cash_closures'));

      const closureDocData: any = {
        closureNumber,
        date: convertToTimestamp(now),
        createdAt: convertToTimestamp(now),
        sellerName: data.sellerName || 'Vendedora',
        totalSales: Number(data.totalSales) || 0,
        expectedCash: Number(data.expectedCash) || 0,
        totalTransfer: Number(data.totalTransfer) || 0,
        totalCard: Number(data.totalCard) || 0,
        carryForwardCash: Number(data.carryForwardCash) || 0,
        lastClosureNumber: data.lastClosureNumber || null,
        amountToDeposit: Number(data.amountToDeposit) || 0,
        cashKeptInRegister: Number(data.cashKeptInRegister) || 0,
        cashCounted: Number(data.cashCounted) || 0,
        difference: Number(data.difference) || 0,
        depositReference: data.depositReference?.trim() || '',
        salesIds: data.salesIds || [],
        salesCount: data.salesIds?.length || 0,
        notes: data.notes?.trim() || '',
        status: 'closed'
      };

      batch.set(closureRef, closureDocData);

      // Actualizar cada venta para vincularla a este cierre
      for (const saleId of data.salesIds) {
        const saleRef = doc(db, 'pos_sales', saleId);
        batch.update(saleRef, {
          closureId: closureRef.id,
          closureNumber: closureNumber,
          closedAt: convertToTimestamp(now)
        });
      }

      await batch.commit();
      toast.success(`✓ Cierre de caja ${closureNumber} registrado exitosamente`);
      return closureRef.id;
    } catch (error) {
      console.error('Error creating cash closure:', error);
      toast.error('Error al guardar el cierre de caja');
      throw error;
    }
  },

  // Obtener todos los cierres
  async getAllClosures(): Promise<CashClosure[]> {
    try {
      const q = query(
        collection(db, 'cash_closures'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        date: convertTimestamp(d.data().date),
        createdAt: convertTimestamp(d.data().createdAt)
      })) as CashClosure[];
    } catch (error) {
      console.error('Error getting cash closures:', error);
      throw error;
    }
  },

  // Modificar cierre de caja (para admin)
  async updateClosure(id: string, updates: Partial<CashClosure>): Promise<void> {
    try {
      const docRef = doc(db, 'cash_closures', id);
      const cleanUpdates: any = {};
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined) {
          if (v instanceof Date) {
            cleanUpdates[k] = convertToTimestamp(v);
          } else {
            cleanUpdates[k] = v;
          }
        }
      }
      cleanUpdates.updatedAt = Timestamp.now();
      await updateDoc(docRef, cleanUpdates);
      toast.success('Cierre de caja actualizado');
    } catch (error) {
      console.error('Error updating cash closure:', error);
      toast.error('Error al actualizar cierre de caja');
      throw error;
    }
  }
};
