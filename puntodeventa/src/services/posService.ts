import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  increment 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PosProduct, PosSale, PosCustomer, PosCartItem } from '../types/pos';

export const posClientService = {
  /**
   * Carga catálogo completo de productos con existencias en Bodega Principal / Local
   */
  async getCatalogProducts(): Promise<PosProduct[]> {
    try {
      // 1. Obtener productos activos
      const prodCol = collection(db, 'products');
      const prodSnap = await getDocs(prodCol);

      // 2. Obtener inventario de Bodega Principal / Babahoyo
      const invCol = collection(db, 'inventory');
      const invSnap = await getDocs(invCol);
      
      const stockMap = new Map<string, number>();
      invSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const pid = data.productId;
        const loc = (data.location || '').toLowerCase();
        const qty = Number(data.quantity) || 0;
        
        // Sumar existencias de tienda/bodega principal
        if (loc.includes('principal') || loc.includes('babahoyo') || loc.includes('local') || loc.includes('tienda') || loc.includes('ecuador')) {
          stockMap.set(pid, (stockMap.get(pid) || 0) + qty);
        }
      });

      const products: PosProduct[] = [];
      prodSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const pid = docSnap.id;
        const stock = stockMap.get(pid) || Number(data.stock) || 0;

        const p1 = Number(data.salePrice1) || Number(data.price) || 0;
        const p2 = Number(data.salePrice2) || Number(data.pvp) || p1;
        const pvp = Number(data.pvp) || p2;

        products.push({
          id: pid,
          name: data.name || data.perfumeName || 'Producto sin nombre',
          sku: data.sku || data.barcode || pid.slice(-6).toUpperCase(),
          barcode: data.barcode || data.sku || '',
          brand: data.brand || 'Falconi',
          category: data.category || 'Perfumería',
          salePrice1: p1 > 0 ? p1 : p2,
          salePrice2: p2 > 0 ? p2 : p1,
          pvp: pvp > 0 ? pvp : p2,
          imageUrl: data.imageUrl || (Array.isArray(data.images) && data.images[0]) || '/icons/icon.svg',
          perfumeName: data.perfumeName,
          totalStock: stock
        });
      });

      // Ordenar: primero los que tienen stock, luego alfabéticamente
      return products.sort((a, b) => {
        if ((b.totalStock || 0) > 0 && (a.totalStock || 0) <= 0) return 1;
        if ((a.totalStock || 0) > 0 && (b.totalStock || 0) <= 0) return -1;
        return a.name.localeCompare(b.name);
      });
    } catch (err) {
      console.error('Error fetching POS catalog:', err);
      return [];
    }
  },

  /**
   * Generar número consecutivo de venta POS-000001
   */
  async generateSaleNumber(): Promise<string> {
    try {
      const q = query(collection(db, 'pos_sales'), orderBy('createdAt', 'desc'), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        return 'POS-000001';
      }
      const last = snap.docs[0].data();
      const lastNumStr = last.saleNumber || '';
      const match = lastNumStr.match(/POS-(\d+)/);
      if (match) {
        const nextNum = parseInt(match[1], 10) + 1;
        return `POS-${nextNum.toString().padStart(6, '0')}`;
      }
      return `POS-${Date.now().toString().slice(-6)}`;
    } catch {
      return `POS-${Date.now().toString().slice(-6)}`;
    }
  },

  /**
   * Procesar y registrar venta en Firestore
   */
  async processSale(saleData: Omit<PosSale, 'id' | 'saleNumber'>): Promise<string> {
    const saleNumber = await this.generateSaleNumber();
    const now = new Date();

    const cleanItems = saleData.items.map(item => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productSku: item.product.sku,
      productBrand: item.product.brand || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      totalPrice: item.totalPrice
    }));

    // 1. Guardar en pos_sales
    const saleDocRef = await addDoc(collection(db, 'pos_sales'), {
      saleNumber,
      date: Timestamp.fromDate(now),
      customerName: saleData.customerName || 'Consumidor Final',
      customerPhone: saleData.customerPhone || '',
      customerEmail: saleData.customerEmail || '',
      customerAddress: saleData.customerAddress || '',
      items: cleanItems,
      subtotal: saleData.subtotal,
      discount: saleData.discount,
      tax: saleData.tax,
      total: saleData.total,
      paymentMethod: saleData.paymentMethod,
      cashReceived: saleData.cashReceived || 0,
      change: saleData.change || 0,
      cardAmount: saleData.cardAmount || 0,
      transferAmount: saleData.transferAmount || 0,
      status: 'completed',
      createdBy: saleData.createdBy || 'Asesor Falconi',
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });

    // 2. Descontar stock en inventario
    for (const item of saleData.items) {
      try {
        const invQuery = query(
          collection(db, 'inventory'), 
          where('productId', '==', item.productId),
          limit(1)
        );
        const invSnap = await getDocs(invQuery);
        if (!invSnap.empty) {
          const invDoc = invSnap.docs[0];
          await updateDoc(doc(db, 'inventory', invDoc.id), {
            quantity: increment(-item.quantity),
            updatedAt: Timestamp.fromDate(now)
          });
        }
      } catch (stockErr) {
        console.warn(`Error descontando stock para ${item.productId}:`, stockErr);
      }
    }

    // 3. Registrar asiento contable en pos_accounting
    try {
      await addDoc(collection(db, 'pos_accounting'), {
        date: Timestamp.fromDate(now),
        type: 'income',
        category: 'POS_SALE',
        amount: saleData.total,
        referenceId: saleDocRef.id,
        saleNumber,
        paymentMethod: saleData.paymentMethod,
        notes: `Venta POS - Cliente: ${saleData.customerName || 'Consumidor Final'}`,
        createdAt: Timestamp.fromDate(now)
      });
    } catch (accErr) {
      console.warn('Error registrando asiento contable:', accErr);
    }

    // 4. Registrar o actualizar cliente
    if (saleData.customerPhone && saleData.customerPhone.trim().length > 4) {
      try {
        const clientQuery = query(
          collection(db, 'pos_customers'),
          where('phone', '==', saleData.customerPhone.trim()),
          limit(1)
        );
        const clientSnap = await getDocs(clientQuery);
        if (!clientSnap.empty) {
          const clientDoc = clientSnap.docs[0];
          await updateDoc(doc(db, 'pos_customers', clientDoc.id), {
            totalPurchases: increment(saleData.total),
            lastPurchaseDate: Timestamp.fromDate(now)
          });
        } else {
          await addDoc(collection(db, 'pos_customers'), {
            name: saleData.customerName || 'Cliente',
            phone: saleData.customerPhone.trim(),
            email: saleData.customerEmail || '',
            totalPurchases: saleData.total,
            lastPurchaseDate: Timestamp.fromDate(now),
            isActive: true,
            createdAt: Timestamp.fromDate(now)
          });
        }
      } catch (clientErr) {
        console.warn('Error actualizando cliente:', clientErr);
      }
    }

    return saleDocRef.id;
  },

  /**
   * Obtener últimas ventas del POS
   */
  async getRecentSales(limitCount = 30): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'pos_sales'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.toDate ? d.data().date.toDate() : new Date()
      }));
    } catch (err) {
      console.error('Error fetching recent sales:', err);
      return [];
    }
  },

  /**
   * Buscar clientes por teléfono o nombre
   */
  async searchCustomers(term: string): Promise<PosCustomer[]> {
    if (!term || term.trim().length < 2) return [];
    try {
      const cleanTerm = term.trim().toLowerCase();
      const col = collection(db, 'pos_customers');
      const snap = await getDocs(col);
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as PosCustomer))
        .filter(c => 
          (c.name && c.name.toLowerCase().includes(cleanTerm)) ||
          (c.phone && c.phone.includes(cleanTerm))
        )
        .slice(0, 8);
    } catch {
      return [];
    }
  }
};
