import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export interface Notification {
    id?: string;
    orderId: string;
    orderNumber: string;
    customerEmail: string;
    customerName?: string;
    customerPhone?: string;
    type: 'ready_for_pickup' | 'status_update' | 'order_confirmed';
    message: string;
    sentAt: Date;
    status: 'sent' | 'failed';
}

export const notificationService = {
    // Enviar notificación cuando el pedido está listo para retirar
    async notifyReadyForPickup(
        orderId: string,
        orderNumber: string,
        customerEmail: string,
        customerName?: string,
        customerPhone?: string
    ): Promise<void> {
        try {
            const message = `¡Hola ${customerName || 'Cliente'}!

Tu pedido #${orderNumber} ha llegado a nuestra bodega en Ecuador y está listo para retirar.

📍 Dirección: Bodega Envíos Ecuador
⏰ Horario: Lunes a Viernes 9am - 6pm

¡Gracias por tu compra!
- Equipo Envíos Ecuador`;

            // Guardar notificación en Firestore
            const notification: Omit<Notification, 'id'> = {
                orderId,
                orderNumber,
                customerEmail,
                customerName,
                customerPhone,
                type: 'ready_for_pickup',
                message,
                sentAt: new Date(),
                status: 'sent'
            };

            await addDoc(collection(db, 'notifications'), {
                ...notification,
                sentAt: Timestamp.fromDate(notification.sentAt)
            });

            // En producción, aquí enviarías el email/SMS real
            // Por ahora, solo mostramos un toast
            console.log('📧 Notificación enviada:', {
                to: customerEmail,
                message
            });

            toast.success(`Notificación enviada a ${customerEmail}`);
        } catch (error) {
            console.error('Error sending notification:', error);
            toast.error('Error al enviar notificación');
            throw error;
        }
    },

    // Enviar notificación de cambio de estado
    async notifyStatusUpdate(
        orderId: string,
        orderNumber: string,
        customerEmail: string,
        newStage: string,
        stageDescription: string,
        customerName?: string
    ): Promise<void> {
        try {
            const message = `¡Hola ${customerName || 'Cliente'}!

Tu pedido #${orderNumber} ha sido actualizado:

📦 Nuevo estado: ${stageDescription}

Puedes rastrear tu pedido en cualquier momento desde tu cuenta.

- Equipo Envíos Ecuador`;

            const notification: Omit<Notification, 'id'> = {
                orderId,
                orderNumber,
                customerEmail,
                customerName,
                type: 'status_update',
                message,
                sentAt: new Date(),
                status: 'sent'
            };

            await addDoc(collection(db, 'notifications'), {
                ...notification,
                sentAt: Timestamp.fromDate(notification.sentAt)
            });

            console.log('📧 Notificación de actualización enviada:', {
                to: customerEmail,
                stage: newStage,
                message
            });

            toast.success(`Notificación enviada a ${customerEmail}`);
        } catch (error) {
            console.error('Error sending status update notification:', error);
            // No lanzar error para no bloquear la actualización de estado
        }
    },

    // Obtener todas las notificaciones (para futuro panel de admin)
    async getAll(): Promise<Notification[]> {
        // Implementar si necesitas un panel de notificaciones
        return [];
    }
};
