import { db, isFirebaseConfigured } from '../lib/firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const COLLECTION = 'customers';

export const createUserProfile = async (user, additionalData = {}) => {
  if (!isFirebaseConfigured) return null;
  if (!user) return;

  const userRef = doc(db, COLLECTION, user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { email, displayName } = user;
    try {
      await setDoc(userRef, {
        uid: user.uid,
        email,
        displayName: displayName || additionalData.displayName || '',
        role: additionalData.role || 'buyer',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return await getUserProfile(user.uid);
    } catch (error) {
      console.error('Error creating user profile', error);
    }
  }
  return snapshot.data();
};

export const getUserProfile = async (uid) => {
  if (!isFirebaseConfigured) return null;
  try {
    const docRef = doc(db, COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.error('Error fetching user profile', error);
  }
  return null;
};

export const updateUserProfile = async (uid, data) => {
  if (!isFirebaseConfigured) return null;
  try {
    const docRef = doc(db, COLLECTION, uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating user profile', error);
    return false;
  }
};
