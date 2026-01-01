import emailjs from '@emailjs/browser';
import emailTemplates from '../config/emailTemplates.json';

// ⚠️ SEGURIDAD: En producción, estas credenciales vienen de variables de entorno
// Configuración de EmailJS
const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID || 'service_k2tpxk9';
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'JhsiNDk9q-qtGkbf_';

// Inicializar EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

interface EmailParams {
    to_email: string;
    to_name: string;
    [key: string]: any;
}

export interface CompraExitosaParams {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    securityCode: string;
    totalAmount: number;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    deliveryAddress: string;
    estimatedDate: string;
}

class EmailService {
    /**
     * Enviar email genérico usando una plantilla
     */
    async sendEmail(templateType: keyof typeof emailTemplates, params: EmailParams) {
        try {
            const template = emailTemplates[templateType];
            if (!template) {
                throw new Error(`Template ${templateType} no encontrado`);
            }

            // Preparar parámetros para EmailJS
            const emailParams = {
                ...params,
                subject: this.replaceVariables(template.subject, params)
            };

            const response = await emailjs.send(
                EMAILJS_SERVICE_ID,
                template.templateId,
                emailParams
            );

            console.log('Email enviado exitosamente:', response);
            return { success: true, response };
        } catch (error) {
            console.error('Error enviando email:', error);
            return { success: false, error };
        }
    }

    /**
     * Enviar email de compra exitosa
     */
    async sendCompraExitosa(data: CompraExitosaParams) {
        // Formatear lista de items para el email
        const itemsHTML = data.items.map(item => `
            <div style='padding: 10px; border-bottom: 1px solid #e5e7eb;'>
                <p style='margin: 0;'><strong>${item.name}</strong></p>
                <p style='margin: 5px 0; color: #666; font-size: 14px;'>
                    Cantidad: ${item.quantity} x $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}
                </p>
            </div>
        `).join('');

        const emailParams: EmailParams = {
            to_email: data.customerEmail,
            to_name: data.customerName,
            customerName: data.customerName,
            orderNumber: data.orderNumber,
            securityCode: data.securityCode,
            totalAmount: data.totalAmount.toFixed(2),
            items: itemsHTML,
            deliveryAddress: data.deliveryAddress,
            estimatedDate: data.estimatedDate
        };

        return await this.sendEmail('compra_exitosa', emailParams);
    }

    /**
     * Enviar email de pedido confirmado
     */
    async sendPedidoConfirmado(customerEmail: string, customerName: string, orderNumber: string) {
        const emailParams: EmailParams = {
            to_email: customerEmail,
            to_name: customerName,
            customerName,
            orderNumber,
            confirmationDate: new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        };

        return await this.sendEmail('pedido_confirmado', emailParams);
    }

    /**
     * Enviar email de pedido enviado
     */
    async sendPedidoEnviado(
        customerEmail: string,
        customerName: string,
        orderNumber: string,
        trackingNumber: string,
        carrier: string = 'DHL',
        estimatedArrival: string
    ) {
        const emailParams: EmailParams = {
            to_email: customerEmail,
            to_name: customerName,
            customerName,
            orderNumber,
            trackingNumber,
            carrier,
            estimatedArrival
        };

        return await this.sendEmail('pedido_enviado', emailParams);
    }

    /**
     * Enviar email de pedido entregado
     */
    async sendPedidoEntregado(customerEmail: string, customerName: string, orderNumber: string) {
        const emailParams: EmailParams = {
            to_email: customerEmail,
            to_name: customerName,
            customerName,
            orderNumber,
            deliveryDate: new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        return await this.sendEmail('pedido_entregado', emailParams);
    }

    /**
     * Enviar email de cambio de estado
     */
    async sendCambioEstado(
        customerEmail: string,
        customerName: string,
        orderNumber: string,
        newStatus: string,
        statusMessage: string
    ) {
        const emailParams: EmailParams = {
            to_email: customerEmail,
            to_name: customerName,
            customerName,
            orderNumber,
            newStatus,
            statusMessage,
            updateDate: new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        return await this.sendEmail('cambio_estado', emailParams);
    }

    /**
     * Reemplazar variables en strings de plantillas
     */
    private replaceVariables(template: string, params: any): string {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }
}

export const emailService = new EmailService();
export default emailService;
