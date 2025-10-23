import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs, 
  query, 
  orderBy,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

export interface SoldProduct {
  id: string;
  sellerId: string;
  sellerName?: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    category: string;
    salePrice1: number;
    salePrice2: number;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  saleDate: Date;
  notes?: string;
  createdAt: Date;
  paymentType: 'credit' | 'cash';
  status: 'pending' | 'paid' | 'rejected';
  paymentNoteId?: string;
}

export const soldProductService = {
  // Crear producto vendido
  async create(soldProduct: Omit<SoldProduct, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'soldProducts'), {
        ...soldProduct,
        saleDate: convertToTimestamp(soldProduct.saleDate),
        createdAt: convertToTimestamp(soldProduct.createdAt)
      });
      
      toast.success('Venta registrada exitosamente');
      return docRef.id;
    } catch (error) {
      console.error('Error creating sold product:', error);
      toast.error('Error al registrar la venta');
      throw error;
    }
  },

  // Actualizar producto vendido
  async update(id: string, soldProduct: Partial<SoldProduct>): Promise<void> {
    try {
      const docRef = doc(db, 'soldProducts', id);
      const updateData: any = { ...soldProduct };
      if (soldProduct.saleDate) {
        updateData.saleDate = convertToTimestamp(soldProduct.saleDate);
      }
      if (soldProduct.createdAt) {
        updateData.createdAt = convertToTimestamp(soldProduct.createdAt);
      }
      await updateDoc(docRef, updateData);
      
      toast.success('Venta actualizada exitosamente');
    } catch (error) {
      console.error('Error updating sold product:', error);
      toast.error('Error al actualizar la venta');
      throw error;
    }
  },

  // Eliminar producto vendido
  async delete(id: string, deletedBy?: string): Promise<void> {
    try {
      // Primero obtener los datos de la venta antes de eliminar
      const saleData = await this.getById(id);
      
      if (!saleData) {
        throw new Error('Venta no encontrada');
      }

      // Registrar la eliminación si se proporciona información del usuario
      if (deletedBy) {
        const { deletedSaleService } = await import('./deletedSaleService');
        
        const deletedSaleRecord = {
          originalSaleId: id,
          sellerId: saleData.sellerId,
          sellerName: saleData.sellerName || 'Vendedor',
          productId: saleData.productId,
          productName: saleData.product.name,
          productSku: saleData.product.sku,
          quantity: saleData.quantity,
          unitPrice: saleData.unitPrice,
          totalPrice: saleData.totalPrice,
          originalSaleDate: saleData.saleDate,
          deletedAt: new Date(),
          deletedBy: deletedBy,
          originalPaymentType: saleData.paymentType,
          originalStatus: saleData.status
        };

        await deletedSaleService.create(deletedSaleRecord);
      }

      // Eliminar la venta
      const docRef = doc(db, 'soldProducts', id);
      await deleteDoc(docRef);
      
      toast.success('Venta eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting sold product:', error);
      toast.error('Error al eliminar la venta');
      throw error;
    }
  },

  // Obtener todas las ventas
  async getAll(): Promise<SoldProduct[]> {
    try {
      const q = query(collection(db, 'soldProducts'), orderBy('saleDate', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        saleDate: convertTimestamp(doc.data().saleDate),
        createdAt: convertTimestamp(doc.data().createdAt)
      })) as SoldProduct[];
    } catch (error) {
      console.error('Error getting sold products:', error);
      toast.error('Error al cargar las ventas');
      throw error;
    }
  },

  // Obtener ventas por vendedor
  async getBySeller(sellerId: string): Promise<SoldProduct[]> {
    try {
      // Obtener todas las ventas y filtrar por vendedor
      const q = query(collection(db, 'soldProducts'), orderBy('saleDate', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const allSales = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        saleDate: convertTimestamp(doc.data().saleDate),
        createdAt: convertTimestamp(doc.data().createdAt)
      })) as SoldProduct[];

      // Filtrar por sellerId en el cliente
      return allSales.filter(sale => sale.sellerId === sellerId);
    } catch (error) {
      console.error('Error getting sold products by seller:', error);
      toast.error('Error al cargar las ventas del vendedor');
      throw error;
    }
  },

  // Obtener venta por ID
  async getById(id: string): Promise<SoldProduct | null> {
    try {
      const docRef = doc(db, 'soldProducts', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          saleDate: convertTimestamp(data.saleDate),
          createdAt: convertTimestamp(data.createdAt)
        } as SoldProduct;
      }
      return null;
    } catch (error) {
      console.error('Error getting sold product:', error);
      toast.error('Error al obtener la venta');
      throw error;
    }
  }
};
