import * as admin from 'firebase-admin';

// Inicializar Firebase Admin
// Se asume que las credenciales están configuradas en las variables de entorno de Railway
// o que se proporciona un archivo serviceAccount.json
try {
    if (!admin.apps.length) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : null;

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('✅ Firebase Admin inicializado correctamente');
        } else {
            console.warn('⚠️ No se encontró FIREBASE_SERVICE_ACCOUNT. Las notificaciones push no funcionarán.');
        }
    }
} catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error);
}

export const notificationService = {
    /**
     * Envía una notificación push a una lista de tokens
     */
    async sendPushNotification(tokens: string[], title: string, body: string, data?: any) {
        if (!admin.apps.length) {
            console.error('❌ Firebase Admin no está inicializado.');
            return { success: false, error: 'Firebase Admin not initialized' };
        }

        if (!tokens || tokens.length === 0) {
            return { success: false, error: 'No tokens provided' };
        }

        const message = {
            notification: {
                title,
                body,
            },
            data: data || {},
            tokens: tokens,
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`✅ Notificaciones enviadas: ${response.successCount} exitosas, ${response.failureCount} fallidas`);
            return {
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount
            };
        } catch (error: any) {
            console.error('❌ Error enviando notificaciones push:', error);
            return { success: false, error: error.message };
        }
    }
};
