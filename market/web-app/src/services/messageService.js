import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';

const COLLECTION_NAME = 'messages';

export const getUserConversations = async (userId) => {
  if (!isFirebaseConfigured) {
    return []; // Fallback, no rompemos la UI pero en la app real usan mockMessages directamente en el componente
  }
  // Implementación real
  return [];
};

export const sendMessage = async (conversationId, senderId, text) => {
  if (!isFirebaseConfigured) {
    console.log('[Fallback] Mensaje enviado localmente', text);
    return true;
  }
  try {
    await addDoc(collection(db, `${COLLECTION_NAME}/${conversationId}/items`), {
      senderId,
      text,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error al enviar mensaje', error);
    return false;
  }
};
