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
      
      // Obtener solo el inventario principal (Bodega Principal) y Bodega Ecuador
      const { inventoryService } = await import('./inventoryService');
      const allInventory = await inventoryService.getAll();
      
      // Crear un mapa de stock disponible por productId
      // Solo considerar inventario principal y Bodega Ecuador
      const stockMap = new Map<string, number>();
      
      // Incluir TODOS los items del inventario con status 'stock' o 'in-transit' (disponibles para venta)
      // Incluir Bodega Principal y cualquier otra ubicación que NO sea Ecuador
      // También incluir Bodega Ecuador
      allInventory
        .filter(inv => {
          // Considerar items con status 'stock' o 'in-transit' (disponibles para venta)
          return inv.status === 'stock' || inv.status === 'in-transit';
        })
        .forEach(inv => {
          const productId = inv.productId;
          const quantity = inv.quantity || 0;
          
          if (!productId) {
            console.warn('⚠️ Item de inventario sin productId:', {
              id: inv.id,
              location: inv.location,
              quantity: quantity
            });
            return;
          }
          
          const currentStock = stockMap.get(productId) || 0;
          stockMap.set(productId, currentStock + quantity);
          
          // Debug específico para productos con nombre que contenga "KIT KISS"
          if (inv.product?.name && inv.product.name.toUpperCase().includes('KIT KISS')) {
            console.log('🔍 DEBUG KIT KISS EN INVENTARIO:', {
              productId: productId,
              productSku: inv.product?.sku,
              productName: inv.product.name,
              location: inv.location,
              status: inv.status,
              quantity: quantity,
              stockAnterior: currentStock,
              stockAcumulado: currentStock + quantity
            });
          }
        });
      
      console.log('📦 INVENTARIO PRINCIPAL (collection "inventory"):');
      console.log(`   Total items: ${allInventory.length}`);
      console.log(`   Items con status 'stock': ${allInventory.filter(inv => inv.status === 'stock').length}`);
      console.log(`   Items de Bodega Principal: ${allInventory.filter(inv => {
        const location = inv.location?.toLowerCase() || '';
        return (location.includes('principal') || inv.location === 'Bodega Principal') && inv.status === 'stock';
      }).length}`);
      console.log(`   Items de Bodega Ecuador: ${allInventory.filter(inv => {
        const location = inv.location?.toLowerCase() || '';
        return (location.includes('ecuador') || inv.location === 'Ecuador') && inv.status === 'stock';
      }).length}`);
      console.log('📊 STOCK DISPONIBLE POR PRODUCTO (suma de Bodega Principal + Ecuador):');
      const stockEntries = Array.from(stockMap.entries()).slice(0, 10); // Mostrar primeros 10
      stockEntries.forEach(([id, qty]) => {
        console.log(`   ProductId: ${id} → Stock: ${qty}`);
      });
      if (stockMap.size > 10) {
        console.log(`   ... y ${stockMap.size - 10} productos más`);
      }
      
      // Debug específico: buscar productos con "KIT KISS" en el nombre
      const kitKissProducts = allInventory.filter(inv => 
        inv.product?.name && inv.product.name.toUpperCase().includes('KIT KISS')
      );
      if (kitKissProducts.length > 0) {
        console.log('🔍 PRODUCTOS KIT KISS EN INVENTARIO:', kitKissProducts.map(inv => ({
          productId: inv.productId,
          productName: inv.product?.name,
          location: inv.location,
          status: inv.status,
          quantity: inv.quantity,
          stockEnMapa: stockMap.get(inv.productId) || 0
        })));
      } else {
        console.log('⚠️ No se encontraron productos KIT KISS en el inventario');
      }
      
      // Obtener todos los productos del vendedor en la tienda
      const q = query(
        collection(db, 'sellerStore'),
        where('sellerId', '==', sellerId)
      );
      const querySnapshot = await getDocs(q);
      
      console.log('🛒 PRODUCTOS EN LA TIENDA DEL VENDEDOR (collection "sellerStore"):');
      console.log(`   Total productos: ${querySnapshot.docs.length}`);
      
      // Filtrar productos activos y asignar stock disponible
      const products = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          const productId = data.productId;
          let availableStock = stockMap.get(productId) || 0;
          
          // Si no se encontró stock por productId, intentar buscar por SKU del producto
          if (availableStock === 0 && data.product?.sku) {
            const inventoryBySku = allInventory.filter(inv => 
              inv.product?.sku === data.product.sku && (inv.status === 'stock' || inv.status === 'in-transit')
            );
            if (inventoryBySku.length > 0) {
              availableStock = inventoryBySku.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
              console.log(`⚠️ Stock encontrado por SKU para ${data.product?.name}:`, {
                productIdEnTienda: productId,
                productIdEnInventario: inventoryBySku[0].productId,
                sku: data.product.sku,
                stock: availableStock
              });
            }
          }
          
          // Debug: verificar si el producto está en el inventario
          const inventoryItems = allInventory.filter(inv => 
            inv.productId === productId || (data.product?.sku && inv.product?.sku === data.product.sku)
          );
          const inventoryStock = inventoryItems
            .filter(inv => inv.status === 'stock' || inv.status === 'in-transit')
            .reduce((sum, inv) => sum + (inv.quantity || 0), 0);
          
          // Si el stock calculado es diferente al del mapa, usar el calculado
          if (inventoryStock > 0 && availableStock === 0) {
            availableStock = inventoryStock;
            console.log(`✅ Stock corregido para ${data.product?.name}:`, {
              productId: productId,
              stockCalculado: inventoryStock,
              itemsEnInventario: inventoryItems.length
            });
          }
          
          // Debug específico para productos con nombre que contenga "KIT KISS"
          const isKitKiss = data.product?.name && data.product.name.toUpperCase().includes('KIT KISS');
          if (isKitKiss) {
            console.log('🔍 ===== DEBUG KIT KISS EN TIENDA =====');
            console.log('   Producto en sellerStore:', {
              id: doc.id,
              productId: productId,
              productSku: data.product?.sku,
              productName: data.product?.name,
              isActive: data.isActive
            });
            console.log('   Stock disponible calculado:', availableStock);
            console.log('   Items encontrados en inventario principal:', inventoryItems.length);
            if (inventoryItems.length > 0) {
              console.log('   Detalle de items en inventario:');
              inventoryItems.forEach((inv, idx) => {
                console.log(`     ${idx + 1}. ProductId: ${inv.productId}, SKU: ${inv.product?.sku}, Ubicación: ${inv.location}, Status: ${inv.status}, Cantidad: ${inv.quantity}`);
              });
            } else {
              console.log('   ⚠️ NO SE ENCONTRARON ITEMS EN INVENTARIO PRINCIPAL');
              console.log('   Buscando por SKU...');
              const bySku = allInventory.filter(inv => inv.product?.sku === data.product?.sku);
              console.log(`   Items encontrados por SKU: ${bySku.length}`);
              bySku.forEach((inv, idx) => {
                console.log(`     ${idx + 1}. ProductId: ${inv.productId}, SKU: ${inv.product?.sku}, Ubicación: ${inv.location}, Status: ${inv.status}, Cantidad: ${inv.quantity}`);
              });
            }
            console.log('   Stock en mapa:', stockMap.has(productId) ? stockMap.get(productId) : 'NO ENCONTRADO');
            console.log('   Stock calculado manualmente:', inventoryStock);
            console.log('   Stock final asignado:', availableStock);
            console.log('🔍 ====================================');
          }
          
          return {
            id: doc.id,
            ...data,
            availableStock: availableStock, // Agregar stock disponible del inventario principal/Ecuador
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt)
          };
        }) as (StoreProduct & { availableStock: number })[];
      
      // Filtrar solo los activos (mostrar todos, incluso con stock 0) y ordenar por updatedAt
      const activeProducts = products
        .filter(p => p.isActive === true)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      console.log('Productos activos encontrados:', activeProducts.length);
      console.log('Productos con stock > 0:', activeProducts.filter(p => p.availableStock > 0).length);
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
