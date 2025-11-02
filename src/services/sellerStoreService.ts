import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export interface StoreProduct {
  id: string;
  sellerId: string;
  productId: string;
  product: any;
  salePrice: number; // Precio de venta que el vendedor pone
  description?: string; // Descripción opcional
  isActive: boolean; // Si está visible en la tienda
  availableStock?: number; // Stock disponible del inventario del vendedor
  createdAt: Date;
  updatedAt: Date;
}

const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

export const sellerStoreService = {
  // Agregar producto a la tienda
  async addProductToStore(
    sellerId: string,
    productId: string,
    product: any,
    salePrice: number,
    description?: string
  ): Promise<string> {
    try {
      console.log('Agregando producto a la tienda:', {
        sellerId,
        productId,
        productName: product?.name,
        salePrice,
        description
      });

      // Verificar si el producto ya existe en la tienda
      const existingQuery = query(
        collection(db, 'sellerStore'),
        where('sellerId', '==', sellerId),
        where('productId', '==', productId)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        // Actualizar producto existente
        const existingDoc = existingDocs.docs[0];
        const updateData = {
          salePrice: Number(salePrice),
          description: description || '',
          isActive: true,
          product: product, // Actualizar también el objeto producto por si cambió
          updatedAt: convertToTimestamp(new Date())
        };
        console.log('Actualizando producto existente:', existingDoc.id, updateData);
        await updateDoc(doc(db, 'sellerStore', existingDoc.id), updateData);
        toast.success('Producto actualizado en la tienda');
        return existingDoc.id;
      } else {
        // Crear nuevo producto en la tienda
        const newProductData = {
          sellerId,
          productId,
          product,
          salePrice: Number(salePrice),
          description: description || '',
          isActive: true,
          createdAt: convertToTimestamp(new Date()),
          updatedAt: convertToTimestamp(new Date())
        };
        console.log('Creando nuevo producto en la tienda:', newProductData);
        const docRef = await addDoc(collection(db, 'sellerStore'), newProductData);
        console.log('Producto creado con ID:', docRef.id);
        toast.success('Producto agregado a la tienda');
        return docRef.id;
      }
    } catch (error) {
      console.error('Error adding product to store:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error('Error al agregar producto a la tienda');
      throw error;
    }
  },

  // Obtener todos los productos de la tienda de un vendedor
  async getStoreProducts(sellerId: string): Promise<StoreProduct[]> {
    try {
      const q = query(
        collection(db, 'sellerStore'),
        where('sellerId', '==', sellerId)
      );
      const querySnapshot = await getDocs(q);
      
      const products = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        updatedAt: convertTimestamp(doc.data().updatedAt)
      })) as StoreProduct[];
      
      // Ordenar por updatedAt en memoria
      return products.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('Error getting store products:', error);
      toast.error('Error al cargar productos de la tienda');
      throw error;
    }
  },

  // Obtener productos activos de la tienda (para vista pública)
  async getActiveStoreProducts(sellerId: string): Promise<StoreProduct[]> {
    try {
      console.log('Obteniendo productos activos para vendedor:', sellerId);
      
      // Obtener inventario del vendedor para verificar stock
      const { sellerInventoryService } = await import('./sellerInventoryService');
      const sellerInventory = await sellerInventoryService.getBySeller(sellerId);
      
      // Crear un mapa de stock disponible por productId
      const stockMap = new Map<string, number>();
      sellerInventory
        .filter(item => item.status === 'stock' && item.quantity > 0)
        .forEach(item => {
          const currentStock = stockMap.get(item.productId) || 0;
          stockMap.set(item.productId, currentStock + item.quantity);
        });
      
      console.log('Stock disponible:', Array.from(stockMap.entries()).map(([id, qty]) => ({ productId: id, quantity: qty })));
      
      // Primero obtener todos los productos del vendedor
      const q = query(
        collection(db, 'sellerStore'),
        where('sellerId', '==', sellerId)
      );
      const querySnapshot = await getDocs(q);
      
      console.log('Total productos encontrados en tienda:', querySnapshot.docs.length);
      
      // Filtrar productos activos que tengan stock disponible
      const products = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          const availableStock = stockMap.get(data.productId) || 0;
          
          console.log('Producto encontrado:', {
            id: doc.id,
            productId: data.productId,
            productName: data.product?.name,
            salePrice: data.salePrice,
            isActive: data.isActive,
            stockDisponible: availableStock
          });
          
          return {
            id: doc.id,
            ...data,
            availableStock, // Agregar stock disponible
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt)
          };
        }) as (StoreProduct & { availableStock: number })[];
      
      // Filtrar solo los activos que tengan stock disponible y ordenar por updatedAt
      const activeProducts = products
        .filter(p => p.isActive === true && p.availableStock > 0)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      console.log('Productos activos con stock:', activeProducts.length);
      return activeProducts as StoreProduct[];
    } catch (error) {
      console.error('Error getting active store products:', error);
      console.error('Error details:', error);
      return [];
    }
  },

  // Actualizar producto de la tienda
  async updateStoreProduct(
    productId: string,
    data: Partial<Omit<StoreProduct, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'sellerStore', productId);
      const updateData: any = { ...data };
      updateData.updatedAt = convertToTimestamp(new Date());
      
      await updateDoc(docRef, updateData);
      toast.success('Producto actualizado');
    } catch (error) {
      console.error('Error updating store product:', error);
      toast.error('Error al actualizar producto');
      throw error;
    }
  },

  // Eliminar producto de la tienda
  async removeProductFromStore(productId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'sellerStore', productId));
      toast.success('Producto eliminado de la tienda');
    } catch (error) {
      console.error('Error removing product from store:', error);
      toast.error('Error al eliminar producto');
      throw error;
    }
  },

  // Toggle activo/inactivo
  async toggleProductActive(productId: string, isActive: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, 'sellerStore', productId), {
        isActive,
        updatedAt: convertToTimestamp(new Date())
      });
    } catch (error) {
      console.error('Error toggling product active:', error);
      throw error;
    }
  },

  // Obtener producto por ID (para vista pública)
  async getStoreProductById(productId: string): Promise<StoreProduct | null> {
    try {
      const docRef = doc(db, 'sellerStore', productId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt)
        } as StoreProduct;
      }
      return null;
    } catch (error) {
      console.error('Error getting store product:', error);
      return null;
    }
  }
};
