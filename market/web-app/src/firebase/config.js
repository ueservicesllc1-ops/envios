import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCn5b43XaNvTg56ErYYazHaCLc8Ntbx2tw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "envios-aaf94.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "envios-aaf94",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "envios-aaf94.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "301889994673",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:301889994673:web:4bf140b88c095b54890790"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
