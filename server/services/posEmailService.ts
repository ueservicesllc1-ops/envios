import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

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

    // Resolver ruta del logo oficial para adjuntarlo como imagen incrustada (CID)
    const possibleLogoPaths = [
        path.join(process.cwd(), 'puntodeventa/public/logo_falconi.png'),
        path.join(process.cwd(), 'public/logo_falconi.png'),
        path.join(process.cwd(), 'build/logo_falconi.png'),
        path.join(__dirname, '../../puntodeventa/public/logo_falconi.png'),
        path.join(__dirname, '../public/logo_falconi.png'),
    ];
    const resolvedLogoPath = possibleLogoPaths.find((p) => fs.existsSync(p));

    const attachments: Array<{ filename: string; path: string; cid: string }> = [];
    if (resolvedLogoPath) {
        attachments.push({
            filename: 'logo_falconi.png',
            path: resolvedLogoPath,
            cid: 'logo_falconi',
        });
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
        <title>Comprobante de Compra - Falconi Parfums</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
            
            <!-- HEADER CON LOGO OFICIAL Y COLOR DORADO LUXURY -->
            <div style="background: linear-gradient(135deg, #141518 0%, #262118 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #b38a19;">
                ${resolvedLogoPath ? `
                <img src="cid:logo_falconi" alt="Falconi Parfums" width="94" height="94" style="display: block; margin: 0 auto 12px auto; max-width: 94px; height: auto; border: 0;" />
                ` : ''}
                <h1 style="color: #dfbd5d; font-size: 24px; margin: 0; letter-spacing: 3px; text-transform: uppercase; font-weight: 800; font-family: 'Cinzel', Georgia, serif;">Falconi Parfums</h1>
                <p style="color: #94a3b8; font-size: 11px; margin: 6px 0 0 0; letter-spacing: 2px; text-transform: uppercase;">Alta Perfumería Exclusiva &bull; Recibo Oficial</p>
            </div>

            <!-- CUERPO DEL RECIBO -->
            <div style="padding: 24px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <span style="background-color: #e6f4ea; color: #1e7e34; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-block;">
                        ✓ Compra Exitosa
                    </span>
                    <h2 style="color: #0f172a; font-size: 18px; margin: 12px 0 4px 0; font-weight: 800;">Comprobante Digital</h2>
                    <p style="color: #64748b; font-size: 13px; margin: 0;">Ticket: <strong style="color: #b38a19;">${data.saleNumber}</strong></p>
                </div>

                <!-- DATOS DEL CLIENTE Y TIENDA -->
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; font-size: 12px; color: #475569; border: 1px solid #edf2f7;">
                    <table style="width: 100%;">
                        <tr>
                            <td style="padding: 4px 0;"><strong>Cliente:</strong> ${data.customerName}</td>
                            <td style="padding: 4px 0; text-align: right;"><strong>Fecha:</strong> ${new Date(data.date).toLocaleString('es-EC')}</td>
                        </tr>
                        ${data.customerCedula ? `<tr><td style="padding: 4px 0;" colspan="2"><strong>Cédula/RUC:</strong> ${data.customerCedula}</td></tr>` : ''}
                        <tr>
                            <td style="padding: 4px 0;"><strong>Atendido por:</strong> ${data.staffName}</td>
                            <td style="padding: 4px 0; text-align: right;"><strong>Ubicación:</strong> ${data.location}</td>
                        </tr>
                    </table>
                </div>

                <!-- TABLA DE PRODUCTOS -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #f1f5f9; text-align: left;">
                            <th style="padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #64748b;">Producto</th>
                            <th style="padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #64748b; text-align: center;">Cant.</th>
                            <th style="padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #64748b; text-align: right;">Precio</th>
                            <th style="padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #64748b; text-align: right;">Total</th>
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
                            <td style="padding: 8px 0 4px 0; text-align: right; color: #b38a19; font-weight: 800; font-size: 22px;">$${data.total.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0; color: #64748b; font-size: 12px;">Método de Pago:</td>
                            <td style="padding: 2px 0; text-align: right; color: #64748b; font-size: 12px; text-transform: capitalize;">${data.paymentMethod}</td>
                        </tr>
                    </table>
                </div>

                <!-- MENSAJE DE AGRADECIMIENTO -->
                <div style="text-align: center; padding: 18px 0; border-top: 1px dashed #cbd5e1;">
                    <p style="color: #0f172a; font-weight: 700; font-size: 14px; margin: 0 0 4px 0;">¡Gracias por preferir Falconi Parfums!</p>
                    <p style="color: #94a3b8; font-size: 11px; margin: 0;">Garantía de originalidad y distinción en cada fragancia.</p>
                </div>
            </div>

            <!-- FOOTER -->
            <div style="background-color: #f1f5f9; padding: 14px; text-align: center; font-size: 10px; color: #94a3b8;">
                Este es un comprobante de venta digital emitido en punto de venta oficial Falconi Parfums.
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"Falconi Parfums" <${process.env.GMAIL_USER}>`,
            to: data.toEmail,
            subject: `✨ Comprobante de Compra ${data.saleNumber} - Falconi Parfums`,
            html,
            attachments,
        });
        console.log(`✉️ Correo de venta enviado a ${data.toEmail} (ID: ${info.messageId})`);
        return { success: true, message: `Correo enviado exitosamente a ${data.toEmail}` };
    } catch (e: any) {
        console.error('❌ Error enviando correo:', e);
        return { success: false, message: `Error al enviar correo: ${e.message}` };
    }
}

// ---------------------------------------------------------------------------
// DIFUSIÓN MASIVA DE PROMOCIONES Y ÚLTIMOS PERFUMES A CLIENTES
// ---------------------------------------------------------------------------
export interface BroadcastProduct {
    id?: string;
    name: string;
    brand: string;
    price: number;
    imageUrl?: string;
}

export interface BroadcastPromoData {
    toEmail: string;
    customerName: string;
    campaignType: 'new_arrivals' | 'custom_promo' | 'random_selection';
    subject: string;
    headline: string;
    messageText: string;
    discountBadge?: string;
    products: BroadcastProduct[];
    storeLocation?: string;
}

export async function sendBroadcastPromoEmail(data: BroadcastPromoData): Promise<{ success: boolean; message: string }> {
    const transporter = getTransporter();
    if (!transporter) {
        return { success: false, message: 'Credenciales de Gmail no configuradas en el servidor' };
    }
    if (!data.toEmail || !data.toEmail.includes('@')) {
        return { success: false, message: 'Dirección de correo inválida' };
    }

    const possibleLogoPaths = [
        path.join(process.cwd(), 'puntodeventa/public/logo_falconi.png'),
        path.join(process.cwd(), 'public/logo_falconi.png'),
        path.join(process.cwd(), 'build/logo_falconi.png'),
        path.join(__dirname, '../../puntodeventa/public/logo_falconi.png'),
        path.join(__dirname, '../public/logo_falconi.png'),
    ];
    const resolvedLogoPath = possibleLogoPaths.find((p) => fs.existsSync(p));
    const attachments: Array<{ filename: string; path: string; cid: string }> = [];
    if (resolvedLogoPath) {
        attachments.push({
            filename: 'logo_falconi.png',
            path: resolvedLogoPath,
            cid: 'logo_falconi',
        });
    }

    // Generar cartas de productos
    const productsCardsHtml = (data.products || []).slice(0, 8).map((p) => `
        <td style="width: 50%; padding: 8px; vertical-align: top;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: center;">
                ${p.imageUrl ? `
                <img src="${p.imageUrl}" alt="${p.name}" width="120" style="max-height: 120px; max-width: 100%; object-fit: contain; margin: 0 auto 8px auto; display: block;" />
                ` : ''}
                <div style="font-size: 10px; font-weight: 700; color: #b38a19; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">
                    ${p.brand}
                </div>
                <div style="font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1.3; margin-bottom: 6px; min-height: 32px;">
                    ${p.name}
                </div>
                <div style="font-size: 15px; font-weight: 800; color: #784909;">
                    $${p.price.toFixed(2)}
                </div>
            </div>
        </td>
    `);

    // Organizar en filas de 2 productos
    const rowsHtml: string[] = [];
    for (let i = 0; i < productsCardsHtml.length; i += 2) {
        rowsHtml.push(`
            <tr>
                ${productsCardsHtml[i]}
                ${productsCardsHtml[i + 1] ? productsCardsHtml[i + 1] : '<td style="width: 50%;"></td>'}
            </tr>
        `);
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${data.subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
            
            <!-- HEADER CON LOGO OFICIAL -->
            <div style="background: linear-gradient(135deg, #141518 0%, #262118 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #b38a19;">
                ${resolvedLogoPath ? `
                <img src="cid:logo_falconi" alt="Falconi Parfums" width="94" height="94" style="display: block; margin: 0 auto 12px auto; max-width: 94px; height: auto; border: 0;" />
                ` : ''}
                <h1 style="color: #dfbd5d; font-size: 24px; margin: 0; letter-spacing: 3px; text-transform: uppercase; font-weight: 800; font-family: 'Cinzel', Georgia, serif;">Falconi Parfums</h1>
                <p style="color: #94a3b8; font-size: 11px; margin: 6px 0 0 0; letter-spacing: 2px; text-transform: uppercase;">Alta Perfumería Exclusiva &bull; Colección Oficial</p>
            </div>

            <!-- HERO PROMO -->
            <div style="padding: 28px 24px 16px 24px; text-align: center;">
                ${data.discountBadge ? `
                <div style="display: inline-block; background-color: #fef3c7; border: 1px solid #f59e0b; color: #78350f; font-size: 11px; font-weight: 800; padding: 5px 16px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                    ✨ ${data.discountBadge}
                </div>
                ` : ''}
                <h2 style="color: #0f172a; font-size: 22px; margin: 0 0 10px 0; font-weight: 800; line-height: 1.25;">
                    ${data.headline}
                </h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 auto 16px auto; max-width: 480px;">
                    Estimado(a) <strong>${data.customerName || 'Cliente'}</strong>: ${data.messageText}
                </p>
            </div>

            <!-- PRODUCTOS DESTACADOS -->
            ${rowsHtml.length > 0 ? `
            <div style="padding: 0 16px 20px 16px;">
                <div style="text-align: center; margin-bottom: 14px;">
                    <span style="font-size: 12px; font-weight: 800; color: #784909; text-transform: uppercase; letter-spacing: 1.5px;">
                        ${data.campaignType === 'new_arrivals' ? '✨ Recién Llegados a Nuestra Tienda Local' : '💎 Fragancias Seleccionadas'}
                    </span>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <tbody>
                        ${rowsHtml.join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <!-- INVITACIÓN A LA TIENDA -->
            <div style="padding: 22px 24px; background-color: #fdfcf9; border-top: 1px solid #f1ece1; border-bottom: 1px solid #f1ece1; text-align: center;">
                <p style="color: #0f172a; font-weight: 700; font-size: 13px; margin: 0 0 4px 0;">
                    📍 Visítanos en nuestra Tienda Física
                </p>
                <p style="color: #64748b; font-size: 12px; margin: 0 0 14px 0;">
                    Ven a probar estas fragancias exclusivas en persona. ¡Te esperamos para brindarte la mejor asesoría olfativa!
                </p>
                <a href="https://wa.me/5939997523665" style="display: inline-block; background-color: #25D366; color: #ffffff; padding: 11px 24px; border-radius: 25px; text-decoration: none; font-weight: 700; font-size: 13px; box-shadow: 0 4px 12px rgba(37,211,102,0.3);">
                    Contactar por WhatsApp
                </a>
            </div>

            <!-- FOOTER -->
            <div style="background-color: #141518; padding: 20px 24px; text-align: center;">
                <p style="color: #dfbd5d; font-weight: 700; font-size: 12px; margin: 0 0 4px 0; letter-spacing: 1px;">FALCONI PARFUMS</p>
                <p style="color: #94a3b8; font-size: 10px; margin: 0 0 8px 0;">Garantía de originalidad y distinción en cada fragancia.</p>
                <p style="color: #64748b; font-size: 9px; margin: 0;">Recibes este correo porque eres un cliente registrado en nuestro Punto de Venta.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
            from: `"Falconi Parfums" <${process.env.GMAIL_USER}>`,
            to: data.toEmail,
            subject: data.subject,
            html,
            attachments,
        });
        return { success: true, message: `Correo de difusión enviado a ${data.toEmail}` };
    } catch (e: any) {
        console.error(`❌ Error enviando difusión a ${data.toEmail}:`, e);
        return { success: false, message: e.message };
    }
}
