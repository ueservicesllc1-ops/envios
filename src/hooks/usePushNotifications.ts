import { useEffect } from 'react';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { sellerService } from '../services/sellerService';

export const usePushNotifications = (sellerId: string | null) => {
    useEffect(() => {
        if (!Capacitor.isNativePlatform() || !sellerId) return;

        const registerPush = async () => {
            try {
                // Solicitar permisos
                let permStatus = await PushNotifications.checkPermissions();

                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                }

                if (permStatus.receive !== 'granted') {
                    console.warn('⚠️ Permisos de notificación push no otorgados');
                    return;
                }

                // Registrar para notificaciones
                await PushNotifications.register();

                // Listener para el token
                PushNotifications.addListener('registration', async (token: Token) => {
                    console.log('✅ Token FCM generado:', token.value);

                    // Obtener vendedor actual para actualizar tokens
                    const seller = await sellerService.getById(sellerId);
                    if (seller) {
                        const existingTokens = seller.fcmTokens || [];
                        if (!existingTokens.includes(token.value)) {
                            await sellerService.update(sellerId, {
                                fcmTokens: [...existingTokens, token.value]
                            });
                            console.log('✅ Token guardado en Firestore');
                        }
                    }
                });

                // Listener para errores de registro
                PushNotifications.addListener('registrationError', (error: any) => {
                    console.error('❌ Error registrando notificaciones:', error);
                });

                // Listener para cuando llega una notificación (app abierta)
                PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    console.log('🔔 Notificación recibida:', notification);
                });

                // Listener para cuando el usuario toca la notificación
                PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                    console.log('👆 Acción realizada en notificación:', action);
                });

            } catch (error) {
                console.error('❌ Error en el flujo de Push Notifications:', error);
            }
        };

        registerPush();

        // Limpiar listeners al desmontar
        return () => {
            PushNotifications.removeAllListeners();
        };
    }, [sellerId]);
};
