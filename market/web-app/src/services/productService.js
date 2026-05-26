import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, doc, getDoc, query, limit, addDoc, updateDoc, deleteDoc, where, serverTimestamp } from 'firebase/firestore';
import { mockProducts } from '../data/mockProducts';
import { getImageUrl } from '../utils/imageUtils';

// La colección real en tu base de datos es "products" (que es la bodega de Ecuador)
const COLLECTION_NAME = 'products'; 

// === Lectura Pública (Marketplace) ===
export const getProducts = async () => {
  if (!isFirebaseConfigured) {
    return mockProducts;
  }
  
  try {
    // Solo traemos los productos de Bodega Ecuador (los que tienen origin = 'local')
    const q = query(collection(db, COLLECTION_NAME), where('origin', '==', 'local'), limit(50));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return mockProducts; 
    }

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Mapeamos salePrice1 o originalPrice si existen, si no buscamos price o precio
        price: data.salePrice1 || data.originalPrice || data.price || data.precio || 0,
        title: data.name || data.title || data.nombre || 'Producto',
        image: getImageUrl(data.imageUrl || data.image || data.imagen || data.images?.[0])
      };
    });
  } catch (error) {
    console.error('[ProductService] Error fetching products:', error);
    return mockProducts;
  }
};

export const getProductById = async (id) => {
  if (!isFirebaseConfigured) {
    return mockProducts.find(p => p.id === id) || null;
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        price: data.salePrice1 || data.originalPrice || data.price || data.precio || 0,
        title: data.name || data.title || data.nombre || 'Producto',
        image: getImageUrl(data.imageUrl || data.image || data.imagen || data.images?.[0])
      };
    }
    return mockProducts.find(p => p.id === id) || null;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return mockProducts.find(p => p.id === id) || null;
  }
};

// === Gestión del Vendedor (CRUD) ===

export const getProductsBySeller = async (sellerUserId) => {
  if (!isFirebaseConfigured) return [];
  try {
    const q = query(collection(db, COLLECTION_NAME), where('sellerUserId', '==', sellerUserId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching seller products:', error);
    return [];
  }
};

export const createProduct = async (productData) => {
  if (!isFirebaseConfigured) throw new Error('Firebase no configurado');
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...productData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateProduct = async (productId, updates) => {
  if (!isFirebaseConfigured) throw new Error('Firebase no configurado');
  const docRef = doc(db, COLLECTION_NAME, productId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  return true;
};

export const deleteProduct = async (productId) => {
  if (!isFirebaseConfigured) throw new Error('Firebase no configurado');
  const docRef = doc(db, COLLECTION_NAME, productId);
  await deleteDoc(docRef);
  return true;
};
