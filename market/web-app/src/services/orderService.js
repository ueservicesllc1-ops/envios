import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

const COLLECTION_NAME = 'orders';

export const createOrder = async (orderData) => {
  if (!isFirebaseConfigured) {
    console.log('[Fallback] Guardando orden en localStorage');
    const existingOrders = JSON.parse(localStorage.getItem('vibe_orders') || '[]');
    const newOrder = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      ...orderData,
      date: new Date().toLocaleDateString('es-ES')
    };
    localStorage.setItem('vibe_orders', JSON.stringify([newOrder, ...existingOrders]));
    return newOrder;
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...orderData,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...orderData };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

export const getUserOrders = async (userId) => {
  if (!isFirebaseConfigured) {
    console.log('[Fallback] Leyendo órdenes de localStorage');
    const orders = JSON.parse(localStorage.getItem('vibe_orders') || '[]');
    // Si queremos filtrar por userId en el mock:
    return orders.filter(o => o.userId === userId || !o.userId);
  }

  try {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date || new Date().toLocaleDateString('es-ES')
    }));
    return orders.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  } catch (error) {
    console.error('Error fetching orders:', error);
    // Ultimate fallback if firestore fails
    return JSON.parse(localStorage.getItem('vibe_orders') || '[]');
  }
};
