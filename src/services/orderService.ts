import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  location?: string;
  status: 'stock' | 'out_of_stock';
}

export interface Order {
  id?: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  items: OrderItem[];
  totalAmount: number;
  totalItems: number;
  totalQuantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  approvedItems?: OrderItem[]; // Items aprobados por el administrador
}

// Convertir Timestamp de Firebase a Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

export const orderService = {
  // Crear un nuevo pedido
  async create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const orderData = {
        ...order,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Obtener todos los pedidos
  async getAll(): Promise<Order[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      
      const orders = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt)
        } as Order;
      });
      
      // Ordenar por fecha de creación (más reciente primero)
      return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting orders:', error);
      throw error;
    }
  },

  // Obtener pedidos por vendedor
  async getBySeller(sellerId: string): Promise<Order[]> {
    try {
      const q = query(
        collection(db, 'orders'),
        where('sellerId', '==', sellerId)
      );
      const querySnapshot = await getDocs(q);
      
      const orders = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt)
        } as Order;
      });
      
      // Ordenar por fecha de creación (más reciente primero)
      return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting orders by seller:', error);
      throw error;
    }
  },

  // Obtener un pedido por ID
  async getById(orderId: string): Promise<Order | null> {
    try {
      const docRef = doc(db, 'orders', orderId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt)
        } as Order;
      }
      return null;
    } catch (error) {
      console.error('Error getting order by ID:', error);
      throw error;
    }
  },

  // Actualizar estado del pedido
  async updateStatus(orderId: string, status: Order['status'], notes?: string, approvedItems?: OrderItem[]): Promise<void> {
    try {
      const docRef = doc(db, 'orders', orderId);
      const updateData: any = {
        status,
        notes: notes || '',
        updatedAt: Timestamp.now()
      };
      
      // Si se proporcionan items aprobados, agregarlos al documento
      if (approvedItems) {
        updateData.approvedItems = approvedItems;
      }
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  // Eliminar pedido
  async delete(orderId: string): Promise<void> {
    try {
      const docRef = doc(db, 'orders', orderId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  }
};
