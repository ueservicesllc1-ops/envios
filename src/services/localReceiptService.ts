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

  // Crea la nota de envío SIN descontar de Bodega Ecuador (se descuenta solo al escanear en tienda)
  async create(
    items: Array<{ productId: string; name: string; barcode?: string; imageUrl?: string; quantity: number }>,
    notes?: string
  ): Promise<string> {
    try {
      const toLocation = await this.getPosLocation();

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
      toast.success('Envío a local registrado. Los productos siguen en Bodega Ecuador hasta que se escaneen en tienda.');
      return ref.id;
    } catch (error) {
      console.error('Error creating local receipt:', error);
      toast.error('Error al crear el ingreso a local');
      throw error;
    }
  },

  // Cancela una nota pendiente (el stock nunca se descontó de Bodega Ecuador)
  async cancel(receipt: LocalReceipt): Promise<void> {
    if (receipt.status !== 'pending') {
      toast.error('Solo se pueden cancelar notas pendientes');
      return;
    }
    await updateDoc(doc(db, 'localReceipts', receipt.id), { status: 'cancelled', cancelledAt: Timestamp.now() });
    toast.success('Nota de envío cancelada');
  },

  // Edita una nota existente (los productos siguen en Bodega Ecuador hasta que se escaneen)
  async update(
    originalReceipt: LocalReceipt,
    newItems: Array<{ productId: string; name: string; barcode?: string; imageUrl?: string; quantity: number }>,
    newNotes?: string
  ): Promise<void> {
    if (originalReceipt.status !== 'pending' && originalReceipt.status !== 'partial') {
      toast.error('Solo se pueden editar notas pendientes o en recepción');
      return;
    }

    const oldMap = new Map<string, LocalReceiptItem>();
    (originalReceipt.items || []).forEach(it => oldMap.set(it.productId, it));

    const newMap = new Map<string, typeof newItems[0]>();
    newItems.forEach(it => newMap.set(it.productId, it));

    // Validar que no se reduzca por debajo de lo ya recibido
    oldMap.forEach((oldIt, prodId) => {
      const newIt = newMap.get(prodId);
      const newQty = newIt ? newIt.quantity : 0;
      if (newQty < (oldIt.receivedQty || 0)) {
        const msg = `No se puede reducir "${oldIt.name}" a ${newQty} porque ya se recibieron ${oldIt.receivedQty}`;
        toast.error(msg);
        throw new Error(msg);
      }
    });

    // Construir la nueva lista de items manteniendo receivedQty
    const finalItems: LocalReceiptItem[] = newItems.map(ni => {
      const existing = oldMap.get(ni.productId);
      return {
        productId: ni.productId,
        name: ni.name,
        barcode: ni.barcode || '',
        imageUrl: ni.imageUrl || '',
        expectedQty: ni.quantity,
        receivedQty: existing ? (existing.receivedQty || 0) : 0
      };
    });

    const isAllComplete = finalItems.length > 0 && finalItems.every(i => (i.receivedQty || 0) >= (i.expectedQty || 0));
    const hasAnyReceived = finalItems.some(i => (i.receivedQty || 0) > 0);
    const newStatus = isAllComplete ? 'received' : hasAnyReceived ? 'partial' : 'pending';

    await updateDoc(doc(db, 'localReceipts', originalReceipt.id), {
      items: finalItems,
      notes: newNotes !== undefined ? newNotes : (originalReceipt.notes || ''),
      status: newStatus,
      updatedAt: Timestamp.now()
    });

    toast.success(`Nota ${originalReceipt.number} actualizada correctamente`);
  }
};
