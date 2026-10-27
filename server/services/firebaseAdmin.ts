import * as adminModule from 'firebase-admin';

const admin = (adminModule as any).default || adminModule;

/**
 * Inicialización única de Firebase Admin para los servicios del servidor.
 * Usa la misma variable FIREBASE_SERVICE_ACCOUNT que notificationService.
 */
const getApps = () => admin.apps || (admin as any).default?.apps || [];

if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (raw) {
        try {
            admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
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
