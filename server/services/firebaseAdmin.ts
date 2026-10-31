import * as adminModule from 'firebase-admin';

import { SERVICE_ACCOUNT_KEY } from '../config/serviceAccountKey';

const admin = (adminModule as any).default || adminModule;

/**
 * Inicialización única de Firebase Admin para los servicios del servidor.
 * Prioriza process.env.FIREBASE_SERVICE_ACCOUNT y usa SERVICE_ACCOUNT_KEY como fallback.
 */
const getApps = () => admin.apps || (admin as any).default?.apps || [];

if (!getApps().length) {
    let serviceAccount: any = null;
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (raw) {
        try {
            serviceAccount = JSON.parse(raw);
        } catch (e) {
            console.error('Error parseando FIREBASE_SERVICE_ACCOUNT env:', e);
        }
    }
    if (!serviceAccount) {
        serviceAccount = SERVICE_ACCOUNT_KEY;
    }

    if (serviceAccount) {
        try {
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            console.log('✅ Firebase Admin inicializado correctamente');
        } catch (e) {
            console.error('Error inicializando admin:', e);
        }
    } else {
        console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT no definido.');
    }
}

export const isAdminReady = () => getApps().length > 0;
export const adminAuth = () => admin.auth();
export const adminDb = () => admin.firestore();
export { admin };
