import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCn5b43XaNvTg56ErYYazHaCLc8Ntbx2tw",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "envios-aaf94.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "envios-aaf94",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "envios-aaf94.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "301889994673",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:301889994673:web:4bf140b88c095b54890790",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-QCM8ZVYE36"
};

// Configuración del dominio personalizado
export const DOMAIN_CONFIG = {
  production: process.env.REACT_APP_DOMAIN_PRODUCTION || "https://enviosec.store",
  development: process.env.REACT_APP_DOMAIN_DEVELOPMENT || "http://localhost:3000"
};

// Obtener la URL base según el entorno
export const getBaseUrl = () => {
  return process.env.NODE_ENV === 'production'
    ? DOMAIN_CONFIG.production
    : DOMAIN_CONFIG.development;
};

// Obtener el dominio actual
export const getCurrentDomain = () => {
  return window.location.origin;
};

// Verificar si estamos en producción
export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
