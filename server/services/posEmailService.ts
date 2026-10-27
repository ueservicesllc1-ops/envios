import nodemailer from 'nodemailer';

export interface SaleReceiptData {
    toEmail: string;
    customerName: string;
    customerCedula?: string;
    saleNumber: string;
    date: Date;
    items: Array<{ name: string; quantity: number; unitPrice: number; totalPrice: number }>;
    subtotal: number;
    discountAmount?: number;
    total: number;
    paymentMethod: string;
    staffName: string;
    location: string;
}

function getTransporter() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user.trim(),
            pass: pass.trim().replace(/\s+/g, ''), // elimina espacios si pegan "abcd efgh ijkl mnop"
        },
    });
}

export function isEmailConfigured(): boolean {
    return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export function getEmailConfigInfo() {
    const user = process.env.GMAIL_USER || '';
    const configured = isEmailConfigured();
    return {
        configured,
        user: configured ? user.replace(/(.{2})(.*)(@.*)/, '$1***$3') : 'No configurado',
        instructionsUrl: 'https://myaccount.google.com/apppasswords',
    };
}

export async function sendSaleReceiptEmail(data: SaleReceiptData): Promise<{ success: boolean; message: string }> {
    const transporter = getTransporter();
    if (!transporter) {
        console.warn('⚠️ No se envió correo: GMAIL_USER o GMAIL_APP_PASSWORD no están configurados en .env');
        return {
            success: false,
            message: 'Credenciales de Gmail no configuradas en el servidor (.env)',
        };
    }

    if (!data.toEmail || !data.toEmail.includes('@')) {
        return { success: false, message: 'Dirección de correo inválida' };
    }

    const itemsHtml = data.items
        .map(
            (it) => `
        <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 10px 8px; font-size: 13px; color: #1e293b; font-weight: 500;">${it.name}</td>
            <td style="padding: 10px 8px; font-size: 13px; color: #64748b; text-align: center;">${it.quantity}</td>
            <td style="padding: 10px 8px; font-size: 13px; color: #64748b; text-align: right;">$${it.unitPrice.toFixed(2)}</td>
            <td style="padding: 10px 8px; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">$${it.totalPrice.toFixed(2)}</td>
        </tr>
    `
        )
        .join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Comprobante de Compra - Falconi Perfumes</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
            
            <!-- HEADER CON COLOR DORADO LUXURY -->
            <div style="background: linear-gradient(135deg, #141518 0%, #262118 100%); padding: 30px 24px; text-align: center; border-bottom: 3px solid #b38a19;">
                <h1 style="color: #dfbd5d; font-size: 24px; margin: 0; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">Falconi Perfumes</h1>
                <p style="color: #94a3b8; font-size: 12px; margin: 6px 0 0 0; letter-spacing: 1px;">ALTA PERFUMERÍA EXCLUSIVA</p>
            </div>

            <!-- CUERPO DEL RECIBO -->
            <div style="padding: 24px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <span style="background-color: #e6f4ea; color: #1e7e34; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block;">
                        ✓ Compra Exitosa
                    </span>
                    <h2 style="color: #0f172a; font-size: 18px; margin: 10px 0 4px 0;">Comprobante Digital</h2>
                    <p style="color: #64748b; font-size: 13px; margin: 0;">Ticket: <strong style="color: #b38a19;">${data.saleNumber}</strong></p>
                </div>

                <!-- DATOS DEL CLIENTE Y TIENDA -->
                <div style="background-color: #f8fafc; border-radius: 10px; padding: 14px; margin-bottom: 20px; font-size: 12px; color: #475569; border: 1px solid #edf2f7;">
                    <table style="width: 100%;">
                        <tr>
                            <td style="padding: 3px 0;"><strong>Cliente:</strong> ${data.customerName}</td>
                            <td style="padding: 3px 0; text-align: right;"><strong>Fecha:</strong> ${new Date(data.date).toLocaleDateString('es-EC', { dateStyle: 'medium', timeStyle: 'short' } as any)}</td>
                        </tr>
                        ${data.customerCedula ? `<tr><td style="padding: 3px 0;" colspan="2"><strong>Cédula/RUC:</strong> ${data.customerCedula}</td></tr>` : ''}
                        <tr>
                            <td style="padding: 3px 0;"><strong>Atendido por:</strong> ${data.staffName}</td>
                            <td style="padding: 3px 0; text-align: right;"><strong>Ubicación:</strong> ${data.location}</td>
                        </tr>
                    </table>
                </div>

                <!-- TABLA DE PRODUCTOS -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #f1f5f9; text-align: left;">
                            <th style="padding: 8px; font-size: 11px; text-transform: uppercase; color: #64748b;">Producto</th>
                            <th style="padding: 8px; font-size: 11px; text-transform: uppercase; color: #64748b; text-align: center;">Cant.</th>
                            <th style="padding: 8px; font-size: 11px; text-transform: uppercase; color: #64748b; text-align: right;">Precio</th>
                            <th style="padding: 8px; font-size: 11px; text-transform: uppercase; color: #64748b; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <!-- TOTALES -->
                <div style="border-top: 2px solid #e2e8f0; padding-top: 14px; margin-bottom: 24px;">
                    <table style="width: 100%; font-size: 13px;">
                        <tr>
                            <td style="padding: 4px 0; color: #64748b;">Subtotal:</td>
                            <td style="padding: 4px 0; text-align: right; color: #0f172a; font-weight: 500;">$${data.subtotal.toFixed(2)}</td>
                        </tr>
                        ${data.discountAmount && data.discountAmount > 0 ? `
                        <tr>
                            <td style="padding: 4px 0; color: #dc2626;">Descuento:</td>
                            <td style="padding: 4px 0; text-align: right; color: #dc2626; font-weight: 500;">-$${data.discountAmount.toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        <tr style="font-size: 16px;">
                            <td style="padding: 8px 0 4px 0; color: #0f172a; font-weight: 700;">TOTAL PAGADO:</td>
                            <td style="padding: 8px 0 4px 0; text-align: right; color: #b38a19; font-weight: 800; font-size: 20px;">$${data.total.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0; color: #64748b; font-size: 12px;">Método de Pago:</td>
                            <td style="padding: 2px 0; text-align: right; color: #64748b; font-size: 12px; text-transform: capitalize;">${data.paymentMethod}</td>
                        </tr>
                    </table>
                </div>

                <!-- MENSAJE DE AGRADECIMIENTO -->
                <div style="text-align: center; padding: 16px 0; border-top: 1px dashed #cbd5e1;">
                    <p style="color: #0f172a; font-weight: 600; font-size: 13px; margin: 0 0 4px 0;">¡Gracias por preferir Falconi Perfumes!</p>
                    <p style="color: #94a3b8; font-size: 11px; margin: 0;">Garantía de originalidad y distinción en cada fragancia.</p>
                </div>
            </div>

            <!-- FOOTER -->
            <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 10px; color: #94a3b8;">
                Este es un comprobante de venta digital emitido en punto de venta oficial Falconi Perfumes.
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"Falconi Perfumes" <${process.env.GMAIL_USER}>`,
            to: data.toEmail,
            subject: `✨ Comprobante de Compra ${data.saleNumber} - Falconi Perfumes`,
            html,
        });
        console.log(`✉️ Correo de venta enviado a ${data.toEmail} (ID: ${info.messageId})`);
        return { success: true, message: `Correo enviado exitosamente a ${data.toEmail}` };
    } catch (e: any) {
        console.error('❌ Error enviando correo:', e);
        return { success: false, message: `Error al enviar correo: ${e.message}` };
    }
}
