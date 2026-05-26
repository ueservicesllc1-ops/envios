import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const requireEnvVar = (value, name) => {
  if (!value) {
    console.warn(`[Vibe Market] Missing Firebase environment variable: ${name}. App will fallback to mock data.`);
    return false;
  }
  return true;
};

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

const isFirebaseConfigured = 
  requireEnvVar(apiKey, 'VITE_FIREBASE_API_KEY') && 
  requireEnvVar(authDomain, 'VITE_FIREBASE_AUTH_DOMAIN') && 
  requireEnvVar(projectId, 'VITE_FIREBASE_PROJECT_ID');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('[Vibe Market] Firebase initialized successfully.');
  } catch (error) {
    console.error('[Vibe Market] Error initializing Firebase:', error);
  }
}

export { app, db, auth, isFirebaseConfigured };
