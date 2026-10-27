import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../firebase/config';
import { inventoryService } from './inventoryService';

export type LocalReceiptStatus = 'pending' | 'partial' | 'received' | 'closed' | 'cancelled';

export interface LocalReceiptItem {
  productId: string;
  name: string;
  barcode: string;
  imageUrl?: string;
  expectedQty: number;
  receivedQty: number;
}

export interface LocalReceipt {
  id: string;
  number: string;
  status: LocalReceiptStatus;
  fromLocation: string;
  toLocation: string;
  items: LocalReceiptItem[];
  notes?: string;
  createdAt: Date;
  receivedAt?: Date;
  receivedBy?: string;
  closedBy?: string;
  closeReason?: string;
}

const FROM_LOCATION = 'Bodega Ecuador';
const toDate = (t: any): Date | undefined => (t?.toDate ? t.toDate() : t ? new Date(t) : undefined);

export const localReceiptService = {
  async getPosLocation(): Promise<string> {
    try {
      const snap = await getDoc(doc(db, 'settings', 'posSettings'));
      return (snap.exists() && (snap.data() as any).location) || 'Bodega Principal';
    } catch {
      return 'Bodega Principal';
    }
  },

  async getAll(): Promise<LocalReceipt[]> {
    const snap = await getDocs(query(collection(db, 'localReceipts'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => {
      const data: any = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: toDate(data.createdAt) || new Date(),
        receivedAt: toDate(data.receivedAt)
      } as LocalReceipt;
    });
  },

  // Crea la nota y descuenta de Bodega Ecuador (queda "en tránsito" hasta que el local escanee)
  async create(
    items: Array<{ productId: string; name: string; barcode?: string; imageUrl?: string; quantity: number }>,
    notes?: string
  ): Promise<string> {
    try {
      const toLocation = await this.getPosLocation();
      const removed: Array<{ productId: string; quantity: number }> = [];
      try {
        for (const it of items) {
          await inventoryService.removeStock(it.productId, it.quantity, FROM_LOCATION, true);
          removed.push({ productId: it.productId, quantity: it.quantity });
        }
      } catch (err) {
        // Revertir lo ya descontado
        for (const r of removed) {
          const stock = await inventoryService.getByProductIdAndLocation(r.productId, FROM_LOCATION);
          if (stock) await inventoryService.update(stock.id, { quantity: stock.quantity + r.quantity }, true);
        }
        throw err;
      }

      const ref = await addDoc(collection(db, 'localReceipts'), {
        number: `NI-LOC-${Date.now()}`,
        status: 'pending',
        fromLocation: FROM_LOCATION,
        toLocation,
        notes: notes || '',
        items: items.map(i => ({
          productId: i.productId,
          name: i.name,
          barcode: i.barcode || '',
          imageUrl: i.imageUrl || '',
          expectedQty: i.quantity,
          receivedQty: 0
        })),
        scans: [],
        createdAt: Timestamp.now()
      });
      toast.success('Ingreso a local creado. Pendiente de recibir en el punto de venta.');
      return ref.id;
    } catch (error) {
      console.error('Error creating local receipt:', error);
      toast.error('Error al crear el ingreso a local');
      throw error;
    }
  },

  // Cancela una nota sin recibir nada y devuelve el stock a Bodega Ecuador
  async cancel(receipt: LocalReceipt): Promise<void> {
    if (receipt.status !== 'pending') {
      toast.error('Solo se pueden cancelar notas sin escaneos');
      return;
    }
    for (const it of receipt.items) {
      const stock = await inventoryService.getByProductIdAndLocation(it.productId, FROM_LOCATION);
      if (stock) {
        await inventoryService.update(stock.id, { quantity: stock.quantity + it.expectedQty }, true);
      } else {
        await inventoryService.addStock(it.productId, it.expectedQty, 0, 0, FROM_LOCATION);
      }
    }
    await updateDoc(doc(db, 'localReceipts', receipt.id), { status: 'cancelled', cancelledAt: Timestamp.now() });
    toast.success('Ingreso cancelado y stock devuelto a Bodega Ecuador');
  }
};
