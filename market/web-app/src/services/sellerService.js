import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, setDoc, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const COLLECTION_NAME = 'sellers';

export const getSellerProfile = async (userId) => {
  if (!isFirebaseConfigured) return null;
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error('Error fetching seller:', error);
  }
  return null;
};

export const createSellerProfile = async (userId, data) => {
  if (!isFirebaseConfigured) return null;
  try {
    const sellerRef = doc(db, COLLECTION_NAME, userId);
    await setDoc(sellerRef, {
      userId,
      storeName: data.storeName || '',
      bio: data.bio || '',
      category: data.category || '',
      country: data.country || '',
      logoUrl: '',
      bannerUrl: '',
      rating: 0,
      totalSales: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error creating seller profile:', error);
    return false;
  }
};

export const updateSellerProfile = async (userId, data) => {
  if (!isFirebaseConfigured) return false;
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating seller profile:', error);
    return false;
  }
};

export const getSellerStats = async (userId) => {
  if (!isFirebaseConfigured) return null;
  // TODO: Implementar agregaciones de órdenes y productos
  return {
    totalRevenue: 0,
    totalOrders: 0,
    totalVisits: 0,
    conversionRate: 0
  };
};
