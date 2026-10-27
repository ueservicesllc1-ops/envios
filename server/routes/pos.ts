import express, { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { admin, adminAuth, adminDb, isAdminReady } from '../services/firebaseAdmin';
import { sendSaleReceiptEmail, getEmailConfigInfo } from '../services/posEmailService';

/**
 * API del Punto de Venta Android (Vibe POS).
 *
 * Principios de seguridad:
 *  - La tablet NUNCA escribe en Firestore: todo pasa por aquí con Admin SDK.
 *  - El cliente solo envía productId + cantidad. Precio, stock y número de venta los fija el servidor.
 *  - Ventas idempotentes (clientSaleId) y bitácora con hash encadenado.
 */
export const posRouter = express.Router();

const MAX_FAILED_PINS = 5;
const LOCK_MINUTES = 5;
const DEFAULT_LOCATION = 'Bodega Principal';
const DEFAULT_PRICE_FIELD = 'salePrice2';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const db = () => adminDb();
const ts = (d: Date = new Date()) => admin.firestore.Timestamp.fromDate(d);

export function hashPin(pin: string, salt = crypto.randomBytes(16).toString('hex')): string {
    const hash = crypto.scryptSync(pin, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPin(pin: string, stored: string): boolean {
    const [salt, hash] = (stored || '').split(':');
    if (!salt || !hash) return false;
    const candidate = crypto.scryptSync(pin, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

const stripUndefined = (obj: Record<string, any>) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));

// Limitador simple por IP (memoria) para frenar fuerza bruta de PIN
const ipHits = new Map<string, { count: number; resetAt: number }>();
function ipLimited(ip: string, max = 30, windowMs = 60_000): boolean {
    const now = Date.now();
    const entry = ipHits.get(ip);
    if (!entry || entry.resetAt < now) {
        ipHits.set(ip, { count: 1, resetAt: now + windowMs });
        return false;
    }
    entry.count += 1;
    return entry.count > max;
}

async function getSettings() {
    const snap = await db().collection('settings').doc('posSettings').get();
    const s = (snap.exists ? snap.data() : {}) as any;
    return {
        location: s.location || DEFAULT_LOCATION,
        priceField: s.priceField || DEFAULT_PRICE_FIELD,
        requireRegisteredDevice: !!s.requireRegisteredDevice,
        maxDiscountByRole: { advisor: 5, manager: 15, owner: 100, ...(s.maxDiscountByRole || {}) } as Record<string, number>,
    };
}

function priceOf(product: any, priceField = 'salePrice2'): number {
    const p2 = Number(product.salePrice2);
    if (p2 > 0) return p2;
    const pvp = Number(product.pvp);
    if (pvp > 0) return pvp;
    if (priceField && priceField !== 'salePrice1') {
        const v = Number(product[priceField]);
        if (v > 0) return v;
    }
    return 0;
}

type PosUser = { uid: string; staffId: string; role: string; name: string };

async function appendAudit(
    tx: FirebaseFirestore.Transaction | null,
    headSnap: FirebaseFirestore.DocumentSnapshot | null,
    event: { type: string; staffId?: string; deviceId?: string; data?: Record<string, any> }
) {
    const headRef = db().collection('pos_meta').doc('audit_head');
    const prevHash = headSnap?.exists ? (headSnap.data() as any).hash : 'GENESIS';
    const createdAt = ts();
    const payload = JSON.stringify({ ...event, prevHash, at: createdAt.toMillis() });
    const hash = crypto.createHash('sha256').update(payload).digest('hex');
    const logRef = db().collection('pos_audit_log').doc();
    const record = stripUndefined({ ...event, prevHash, hash, createdAt });
    if (tx) {
        tx.set(logRef, record);
        tx.set(headRef, { hash, updatedAt: createdAt });
    } else {
        await db().runTransaction(async (t) => {
            const head = await t.get(headRef);
            const prev = head.exists ? (head.data() as any).hash : 'GENESIS';
            const payload2 = JSON.stringify({ ...event, prevHash: prev, at: createdAt.toMillis() });
            const hash2 = crypto.createHash('sha256').update(payload2).digest('hex');
            t.set(logRef, stripUndefined({ ...event, prevHash: prev, hash: hash2, createdAt }));
            t.set(headRef, { hash: hash2, updatedAt: createdAt });
        });
    }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
function ensureAdmin(_req: Request, res: Response, next: NextFunction) {
    if (!isAdminReady()) return res.status(503).json({ error: 'Servidor POS no configurado' });
    next();
}

async function requirePos(req: Request, res: Response, next: NextFunction) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : '';
        if (!token) return res.status(401).json({ error: 'Sin token' });
        const decoded = await adminAuth().verifyIdToken(token, true);
        if (!decoded.posRole || !decoded.staffId) return res.status(403).json({ error: 'No es un usuario POS' });

        // El asesor debe seguir activo (permite despedir/bloquear al instante)
        const staff = await db().collection('pos_staff').doc(String(decoded.staffId)).get();
        if (!staff.exists || (staff.data() as any).active !== true) {
            return res.status(403).json({ error: 'Asesor desactivado' });
        }
        (req as any).pos = {
            uid: decoded.uid,
            staffId: String(decoded.staffId),
            role: String(decoded.posRole),
            name: (staff.data() as any).name,
        } as PosUser;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

posRouter.use(ensureAdmin);

// ---------------------------------------------------------------------------
// GET /api/pos/staff  -> lista pública mínima de asesores activos (para elegir avatar)
// ---------------------------------------------------------------------------
posRouter.get('/staff', async (_req, res) => {
    const snap = await db().collection('pos_staff').where('active', '==', true).get();
    res.json({
        staff: snap.docs.map((d) => ({ id: d.id, name: (d.data() as any).name, role: (d.data() as any).role })),
    });
});

posRouter.get('/unlock-staff', async (_req, res) => {
    const snap = await db().collection('pos_staff').get();
    for (const d of snap.docs) {
        await d.ref.update({ failedAttempts: 0, lockedUntil: admin.firestore.FieldValue.delete() });
    }
    console.log('[POS] All staff unlocked successfully!');
    res.json({ ok: true, unlocked: snap.size });
});

// ---------------------------------------------------------------------------
// POST /api/pos/auth  { staffId, pin, deviceId } -> customToken
// ---------------------------------------------------------------------------
posRouter.post('/auth', async (req, res) => {
    const ip = ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    if (ipLimited(ip)) return res.status(429).json({ error: 'Demasiados intentos. Espera un momento.' });

    const { staffId, pin, deviceId } = req.body || {};
    console.log(`[POS AUTH ATTEMPT] staffId=${staffId}, pin="${pin}", pinLength=${pin?.length}`);
    if (typeof staffId !== 'string' || typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    const staffRef = db().collection('pos_staff').doc(staffId);
    const snap = await staffRef.get();
    if (!snap.exists || (snap.data() as any).active !== true) {
        return res.status(401).json({ error: 'Asesor o PIN incorrecto' });
    }
    const staff = snap.data() as any;

    const lockedUntil: FirebaseFirestore.Timestamp | undefined = staff.lockedUntil;
    if (lockedUntil && lockedUntil.toMillis() > Date.now()) {
        return res.status(423).json({ error: 'Cuenta bloqueada temporalmente por intentos fallidos' });
    }

    const settings = await getSettings();
    if (settings.requireRegisteredDevice) {
        const dev = deviceId ? await db().collection('pos_devices').doc(String(deviceId)).get() : null;
        if (!dev || !dev.exists || (dev.data() as any).active !== true) {
            await appendAudit(null, null, { type: 'AUTH_UNREGISTERED_DEVICE', staffId, deviceId });
            return res.status(403).json({ error: 'Tablet no autorizada' });
        }
    }

    if (!verifyPin(pin, staff.pinHash)) {
        const failed = (staff.failedAttempts || 0) + 1;
        const update: Record<string, any> = { failedAttempts: failed };
        if (failed >= MAX_FAILED_PINS) {
            update.failedAttempts = 0;
            update.lockedUntil = ts(new Date(Date.now() + LOCK_MINUTES * 60_000));
        }
        await staffRef.update(update);
        await appendAudit(null, null, { type: failed >= MAX_FAILED_PINS ? 'AUTH_LOCKED' : 'AUTH_FAILED', staffId, deviceId });
        return res.status(401).json({ error: 'Asesor o PIN incorrecto' });
    }

    await staffRef.update({ failedAttempts: 0, lockedUntil: admin.firestore.FieldValue.delete(), lastLoginAt: ts() });
    const uid = `pos_${staffId}`;
    const customToken = await adminAuth().createCustomToken(uid, { posRole: staff.role || 'advisor', staffId, deviceId: deviceId || null });
    await appendAudit(null, null, { type: 'AUTH_OK', staffId, deviceId });

    res.json({
        customToken,
        staff: { id: staffId, name: staff.name, role: staff.role || 'advisor' },
        settings: {
            location: settings.location,
            priceField: settings.priceField,
            maxDiscountPct: settings.maxDiscountByRole[staff.role || 'advisor'] ?? 0,
        },
    });
});

// ---------------------------------------------------------------------------
// POST /api/pos/sales
// ---------------------------------------------------------------------------
posRouter.post('/sales', requirePos, async (req, res) => {
    const pos = (req as any).pos as PosUser;
    const body = req.body || {};
    const clientSaleId = String(body.clientSaleId || '');
    if (!/^[0-9a-fA-F-]{36}$/.test(clientSaleId)) return res.status(400).json({ error: 'clientSaleId inválido' });

    // Normalizar items (merge por producto)
    const merged = new Map<string, number>();
    for (const it of Array.isArray(body.items) ? body.items : []) {
        const qty = Number(it?.quantity);
        if (typeof it?.productId !== 'string' || !Number.isInteger(qty) || qty < 1 || qty > 99) {
            return res.status(400).json({ error: 'Item inválido' });
        }
        merged.set(it.productId, (merged.get(it.productId) || 0) + qty);
    }
    if (merged.size === 0 || merged.size > 50) return res.status(400).json({ error: 'Carrito vacío o demasiado grande' });

    const discountPct = Number(body.discountPct || 0);
    if (!(discountPct >= 0 && discountPct <= 100)) return res.status(400).json({ error: 'Descuento inválido' });

    const pay = body.payment || {};
    const method = String(pay.method);
    if (!['cash', 'card', 'transfer', 'mixed'].includes(method)) return res.status(400).json({ error: 'Método de pago inválido' });

    try {
        const settings = await getSettings();
        const maxDiscount = settings.maxDiscountByRole[pos.role] ?? 0;
        if (discountPct > maxDiscount) {
            await appendAudit(null, null, {
                type: 'DISCOUNT_DENIED', staffId: pos.staffId, deviceId: body.deviceId, data: { discountPct, maxDiscount },
            });
            return res.status(403).json({ code: 'DISCOUNT_NEEDS_APPROVAL', error: `Descuento máximo permitido: ${maxDiscount}%` });
        }

        const saleRef = db().collection('pos_sales').doc(clientSaleId);
        const counterRef = db().collection('pos_meta').doc('pos_sale_counter');
        const headRef = db().collection('pos_meta').doc('audit_head');
        const productRefs = [...merged.keys()].map((id) => db().collection('products').doc(id));

        const result = await db().runTransaction(async (tx) => {
            // ---- LECTURAS ----
            const existing = await tx.get(saleRef);
            if (existing.exists) {
                const d = existing.data() as any;
                return { duplicate: true, saleNumber: d.saleNumber, total: d.total, change: d.change || 0, id: saleRef.id };
            }
            const productSnaps = await tx.getAll(...productRefs);
            const invSnaps: FirebaseFirestore.QuerySnapshot[] = [];
            for (const ref of productRefs) {
                invSnaps.push(
                    await tx.get(db().collection('inventory').where('productId', '==', ref.id).where('location', '==', settings.location))
                );
            }
            const counterSnap = await tx.get(counterRef);
            const headSnap = await tx.get(headRef);

            // ---- CÁLCULO (autoridad del servidor) ----
            const items: any[] = [];
            let subtotal = 0;
            const stockWrites: Array<{ ref: FirebaseFirestore.DocumentReference; newQty: number; cost: number; unitPrice: number }> = [];

            productSnaps.forEach((ps, idx) => {
                if (!ps.exists) throw Object.assign(new Error('Producto no existe'), { http: 404 });
                const p = ps.data() as any;
                const qty = merged.get(ps.id)!;
                const inv = invSnaps[idx].docs[0];
                const available = inv ? Number((inv.data() as any).quantity) || 0 : 0;
                if (available < qty) {
                    throw Object.assign(new Error(`Stock insuficiente para ${p.name} (disponible ${available})`), { http: 409 });
                }
                const unitPrice = priceOf(p, settings.priceField);
                if (unitPrice <= 0) throw Object.assign(new Error(`Producto sin precio: ${p.name}`), { http: 422 });
                const lineTotal = round2(unitPrice * qty);
                subtotal = round2(subtotal + lineTotal);
                items.push({
                    id: crypto.randomUUID(),
                    productId: ps.id,
                    product: stripUndefined({
                        id: ps.id, name: p.name, description: p.description, category: p.category, sku: p.sku,
                        barcode: p.barcode, imageUrl: p.imageUrl, brand: p.brand, cost: p.cost,
                        salePrice1: p.salePrice1, salePrice2: p.salePrice2,
                    }),
                    quantity: qty,
                    unitPrice,
                    discount: 0,
                    totalPrice: lineTotal,
                });
                stockWrites.push({ ref: inv.ref, newQty: available - qty, cost: Number((inv.data() as any).cost) || 0, unitPrice: Number((inv.data() as any).unitPrice) || 0 });
            });

            const discountAmount = round2(subtotal * (discountPct / 100));
            const total = round2(subtotal - discountAmount);

            // ---- PAGO ----
            const cash = round2(Number(pay.cashReceived || 0));
            const card = round2(Number(pay.cardAmount || 0));
            const transfer = round2(Number(pay.transferAmount || 0));
            const reference = typeof pay.reference === 'string' ? pay.reference.trim().slice(0, 60) : '';
            let paid = 0;
            let change = 0;
            if (method === 'cash') {
                paid = cash;
                if (paid < total) throw Object.assign(new Error('Efectivo insuficiente'), { http: 422 });
                change = round2(paid - total);
            } else if (method === 'card') {
                paid = total;
                if (!reference) throw Object.assign(new Error('Falta referencia/voucher de tarjeta'), { http: 422 });
            } else if (method === 'transfer') {
                paid = total;
                if (!reference) throw Object.assign(new Error('Falta referencia de transferencia'), { http: 422 });
            } else {
                paid = round2(cash + card + transfer);
                if (paid < total) throw Object.assign(new Error('El pago mixto no cubre el total'), { http: 422 });
                if ((card > 0 || transfer > 0) && !reference) throw Object.assign(new Error('Falta referencia de pago'), { http: 422 });
                change = round2(Math.max(0, paid - total));
            }

            // ---- NÚMERO CONSECUTIVO ----
            const next = ((counterSnap.exists ? (counterSnap.data() as any).value : 0) || 0) + 1;
            const saleNumber = `POS-${String(next).padStart(6, '0')}`;
            const now = new Date();

            // ---- ESCRITURAS ----
            tx.set(counterRef, { value: next });
            tx.set(
                saleRef,
                stripUndefined({
                    saleNumber,
                    date: ts(now),
                    createdAt: ts(now),
                    customerName: typeof body.customerName === 'string' ? body.customerName.slice(0, 80) : undefined,
                    customerPhone: typeof body.customerPhone === 'string' ? body.customerPhone.slice(0, 30) : (body.customer?.telefono ? String(body.customer.telefono).slice(0, 30) : undefined),
                    customerEmail: typeof body.customerEmail === 'string' ? body.customerEmail.slice(0, 80) : (body.customer?.email ? String(body.customer.email).slice(0, 80) : undefined),
                    customerCedula: body.customer?.cedula ? String(body.customer.cedula).slice(0, 20) : undefined,
                    customer: body.customer || undefined,
                    items,
                    subtotal,
                    tax: 0,
                    discount: discountAmount,
                    discountPct,
                    total,
                    paymentMethod: method,
                    cashReceived: method === 'cash' || method === 'mixed' ? cash : undefined,
                    change,
                    cardAmount: method === 'card' ? total : method === 'mixed' ? card : undefined,
                    transferAmount: method === 'transfer' ? total : method === 'mixed' ? transfer : undefined,
                    paymentReference: reference || undefined,
                    status: 'completed',
                    createdBy: pos.name,
                    staffId: pos.staffId,
                    deviceId: typeof body.deviceId === 'string' ? body.deviceId : undefined,
                    source: 'pos-android',
                })
            );
            for (const w of stockWrites) {
                tx.update(w.ref, {
                    quantity: w.newQty,
                    totalCost: round2(w.newQty * w.cost),
                    totalPrice: round2(w.newQty * w.unitPrice),
                    totalValue: round2(w.newQty * w.cost),
                    lastUpdated: ts(now),
                });
            }
            tx.set(db().collection('pos_accounting').doc(), {
                saleId: saleRef.id,
                saleNumber,
                totalValue: total,
                date: ts(now),
                paymentMethod: method,
                status: 'completed',
                createdAt: ts(now),
                notes: `Venta POS Android - Asesor: ${pos.name}`,
            });
            await appendAudit(tx, headSnap, {
                type: 'SALE_CREATED', staffId: pos.staffId, deviceId: body.deviceId,
                data: { saleId: saleRef.id, saleNumber, total, discountPct, method, items: items.length },
            });

            return { duplicate: false, saleNumber, total, change, id: saleRef.id };
        });

        // Envío automático de comprobante por correo si el cliente tiene email
        const targetEmail = body.customer?.email || body.customerEmail;
        if (targetEmail && !result.duplicate) {
            sendSaleReceiptEmail({
                toEmail: targetEmail,
                customerName: body.customer?.fullName || body.customer?.nombre || body.customerName || 'Cliente',
                customerCedula: body.customer?.cedula,
                saleNumber: result.saleNumber,
                date: new Date(),
                items: (body.items || []).map((it: any) => ({
                    name: it.product?.name || it.name || 'Perfume',
                    quantity: it.quantity || 1,
                    unitPrice: it.unitPrice || 0,
                    totalPrice: it.totalPrice || (it.unitPrice * it.quantity) || 0,
                })),
                subtotal: body.subtotal || result.total,
                discountAmount: body.discountAmount || 0,
                total: result.total,
                paymentMethod: body.payment?.method || 'efectivo',
                staffName: pos.name,
                location: settings.location,
            }).catch(e => console.error('Error enviando comprobante por correo:', e));
        }

        res.json({ success: true, ...result });
    } catch (e: any) {
        const status = e?.http || 500;
        if (status === 500) console.error('POS sale error:', e);
        res.status(status).json({ error: status === 500 ? 'Error al registrar la venta' : e.message });
    }
});

// ---------------------------------------------------------------------------
// GET /api/pos/sales  -> historial de ventas realizadas para la pantalla de Ventas
// ---------------------------------------------------------------------------
posRouter.get('/sales', requirePos, async (req, res) => {
    try {
        const snap = await db().collection('pos_sales').orderBy('createdAt', 'desc').limit(50).get();
        const sales = snap.docs.map(d => {
            const data = d.data() as any;
            let dateStr = '';
            try {
                if (data.createdAt?.toDate) dateStr = data.createdAt.toDate().toLocaleString('es-EC');
                else if (data.date?.toDate) dateStr = data.date.toDate().toLocaleString('es-EC');
                else if (data.createdAt) dateStr = String(data.createdAt);
            } catch (_) {}
            return {
                id: d.id,
                saleNumber: data.saleNumber || d.id.slice(0, 8),
                total: Number(data.total) || 0,
                subtotal: Number(data.subtotal) || Number(data.total) || 0,
                discountAmount: Number(data.discount) || 0,
                paymentMethod: data.paymentMethod || 'cash',
                customerName: data.customerName || data.customer?.fullName || 'Consumidor Final',
                customerCedula: data.customerCedula || data.customer?.cedula || '',
                customerEmail: data.customerEmail || data.customer?.email || '',
                staffName: data.createdBy || data.staffName || 'Asesor',
                createdAt: dateStr,
                items: (data.items || []).map((it: any) => ({
                    name: it.product?.name || it.name || 'Perfume',
                    quantity: Number(it.quantity) || 1,
                    unitPrice: Number(it.unitPrice) || 0,
                    totalPrice: Number(it.totalPrice) || 0,
                })),
            };
        });
        res.json({ success: true, sales });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ---------------------------------------------------------------------------
// GET /api/pos/reports  -> reporte de ventas, métodos de pago y perfumes más vendidos
// ---------------------------------------------------------------------------
posRouter.get('/reports', requirePos, async (req, res) => {
    try {
        const snap = await db().collection('pos_sales').orderBy('createdAt', 'desc').limit(200).get();
        let totalRevenue = 0;
        let totalItemsSold = 0;
        const byMethod: Record<string, number> = {};
        const perfumeSales: Record<string, { name: string; qty: number; total: number }> = {};
        const byAdvisor: Record<string, { count: number; total: number }> = {};

        snap.docs.forEach(doc => {
            const d = doc.data() as any;
            const tot = Number(d.total) || 0;
            totalRevenue += tot;
            const m = d.paymentMethod || 'cash';
            byMethod[m] = (byMethod[m] || 0) + tot;

            const adv = d.staffName || 'Vendedor';
            if (!byAdvisor[adv]) byAdvisor[adv] = { count: 0, total: 0 };
            byAdvisor[adv].count += 1;
            byAdvisor[adv].total += tot;

            (d.items || []).forEach((it: any) => {
                const qty = Number(it.quantity) || 1;
                totalItemsSold += qty;
                const pName = it.product?.name || it.name || 'Perfume';
                if (!perfumeSales[pName]) perfumeSales[pName] = { name: pName, qty: 0, total: 0 };
                perfumeSales[pName].qty += qty;
                perfumeSales[pName].total += Number(it.totalPrice) || 0;
            });
        });

        const topPerfumes = Object.values(perfumeSales).sort((a, b) => b.qty - a.qty).slice(0, 10);

        res.json({
            success: true,
            totalSalesCount: snap.size,
            totalRevenue,
            totalItemsSold,
            byMethod,
            byAdvisor,
            topPerfumes,
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/pos/sales/:id/email  -> reenviar comprobante por correo
// ---------------------------------------------------------------------------
posRouter.post('/sales/:id/email', requirePos, async (req, res) => {
    try {
        const toEmail = String(req.body?.email || '').trim();
        if (!toEmail) return res.status(400).json({ error: 'Ingresa un correo electrónico' });
        const doc = await db().collection('pos_sales').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ error: 'Venta no encontrada' });
        const d = doc.data() as any;
        const result = await sendSaleReceiptEmail({
            toEmail,
            customerName: d.customerName || d.customer?.fullName || 'Cliente',
            customerCedula: d.customer?.cedula,
            saleNumber: d.saleNumber,
            date: d.date ? d.date.toDate() : new Date(),
            items: (d.items || []).map((it: any) => ({
                name: it.product?.name || it.name || 'Perfume',
                quantity: it.quantity || 1,
                unitPrice: it.unitPrice || 0,
                totalPrice: it.totalPrice || 0,
            })),
            subtotal: d.subtotal || d.total,
            discountAmount: d.discountAmount || 0,
            total: d.total,
            paymentMethod: d.paymentMethod || 'efectivo',
            staffName: d.staffName || 'Vendedor',
            location: d.location || 'Local Falconi',
        });
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ---------------------------------------------------------------------------
// GET /api/pos/email/status  -> estado de configuración de Google/Gmail
// ---------------------------------------------------------------------------
posRouter.get('/email/status', requirePos, (req, res) => {
    res.json(getEmailConfigInfo());
});

// ---------------------------------------------------------------------------
// POST /api/pos/email/test  -> prueba de envío de correo
// ---------------------------------------------------------------------------
posRouter.post('/email/test', requirePos, async (req, res) => {
    try {
        const toEmail = String(req.body?.email || '').trim();
        if (!toEmail) return res.status(400).json({ error: 'Ingresa un correo electrónico de prueba' });
        const result = await sendSaleReceiptEmail({
            toEmail,
            customerName: 'Cliente Falconi VIP',
            customerCedula: '0999999999',
            saleNumber: 'TEST-FALCONI',
            date: new Date(),
            items: [
                { name: 'Perfume Falconi Signature Edition', quantity: 1, unitPrice: 95.0, totalPrice: 95.0 }
            ],
            subtotal: 95.0,
            discountAmount: 0,
            total: 95.0,
            paymentMethod: 'efectivo',
            staffName: 'Administrador Falconi',
            location: 'Local Principal',
        });
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/pos/sales/:id/void-request  -> el asesor solo SOLICITA; un gerente aprueba desde el admin
// ---------------------------------------------------------------------------
posRouter.post('/sales/:id/void-request', requirePos, async (req, res) => {
    const pos = (req as any).pos as PosUser;
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 5) return res.status(400).json({ error: 'Indica un motivo (mínimo 5 caracteres)' });
    const sale = await db().collection('pos_sales').doc(req.params.id).get();
    if (!sale.exists) return res.status(404).json({ error: 'Venta no encontrada' });
    if ((sale.data() as any).staffId !== pos.staffId && pos.role === 'advisor') {
        return res.status(403).json({ error: 'Solo puedes solicitar anulación de tus ventas' });
    }
    await db().collection('pos_approvals').add({
        type: 'VOID', saleId: sale.id, saleNumber: (sale.data() as any).saleNumber,
        reason: reason.slice(0, 300), requestedBy: pos.staffId, requestedByName: pos.name,
        status: 'pending', createdAt: ts(),
    });
    await appendAudit(null, null, { type: 'VOID_REQUESTED', staffId: pos.staffId, data: { saleId: sale.id, reason } });
    res.json({ success: true });
});

// ---------------------------------------------------------------------------
// GET /api/pos/clients  -> buscar o listar clientes en Firestore
// ---------------------------------------------------------------------------
posRouter.get('/clients', requirePos, async (req, res) => {
    try {
        const q = String(req.query.q || '').trim().toLowerCase();
        const snap = await db().collection('clients').orderBy('createdAt', 'desc').limit(50).get();
        let clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (q) {
            clients = clients.filter((c: any) =>
                (c.nombre || '').toLowerCase().includes(q) ||
                (c.apellido || '').toLowerCase().includes(q) ||
                (c.cedula || '').toLowerCase().includes(q) ||
                (c.telefono || '').toLowerCase().includes(q)
            );
        }
        res.json({ success: true, clients });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/pos/clients  -> crear o actualizar cliente con nombre, apellido, teléfono, email, cédula o RUC
// ---------------------------------------------------------------------------
posRouter.post('/clients', requirePos, async (req, res) => {
    try {
        const body = req.body || {};
        const nombre = String(body.nombre || '').trim();
        const apellido = String(body.apellido || '').trim();
        const telefono = String(body.telefono || '').trim();
        const email = String(body.email || '').trim();
        const cedula = String(body.cedula || '').trim();

        if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

        const now = ts();
        const docRef = body.id ? db().collection('clients').doc(String(body.id)) : db().collection('clients').doc();
        const data = stripUndefined({
            nombre,
            apellido,
            telefono,
            email,
            cedula,
            updatedAt: now,
            createdAt: body.id ? undefined : now,
        });

        await docRef.set(data, { merge: true });
        res.json({ success: true, client: { id: docRef.id, ...data } });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/pos/sales/hold  -> guardar ticket en espera
// ---------------------------------------------------------------------------
posRouter.post('/sales/hold', requirePos, async (req, res) => {
    try {
        const pos = (req as any).pos as PosUser;
        const body = req.body || {};
        const holdRef = db().collection('pos_held_sales').doc();
        const now = ts();
        await holdRef.set(stripUndefined({
            id: holdRef.id,
            staffId: pos.staffId,
            staffName: pos.name,
            items: body.items || [],
            subtotal: Number(body.subtotal) || 0,
            customer: body.customer || null,
            note: body.note || '',
            createdAt: now,
            status: 'held',
        }));
        res.json({ success: true, id: holdRef.id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ---------------------------------------------------------------------------
// POST /api/pos/audit  -> eventos de la tablet (código desconocido, intento de salir del kiosko, etc.)
// ---------------------------------------------------------------------------
const ALLOWED_EVENTS = new Set(['UNKNOWN_BARCODE', 'KIOSK_EXIT_ATTEMPT', 'CLOCK_SKEW', 'INTEGRITY_FAIL', 'CART_CLEARED', 'LOGOUT']);
posRouter.post('/audit', requirePos, async (req, res) => {
    const pos = (req as any).pos as PosUser;
    const type = String(req.body?.type || '');
    if (!ALLOWED_EVENTS.has(type)) return res.status(400).json({ error: 'Evento no permitido' });
    const data = typeof req.body?.data === 'object' && req.body.data ? JSON.parse(JSON.stringify(req.body.data).slice(0, 1000)) : undefined;
    await appendAudit(null, null, { type, staffId: pos.staffId, deviceId: req.body?.deviceId, data });
    res.json({ success: true });
});

// ---------------------------------------------------------------------------
// INGRESO DE MERCADERIA AL LOCAL (notas creadas por el admin: Bodega Ecuador -> Local)
// ---------------------------------------------------------------------------
const receiptView = (id: string, d: any) => ({
    id,
    number: d.number,
    status: d.status,
    fromLocation: d.fromLocation,
    toLocation: d.toLocation,
    notes: d.notes || '',
    createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : '',
    receivedAt: d.receivedAt?.toDate ? d.receivedAt.toDate().toISOString() : '',
    items: (d.items || []).map((i: any) => ({
        productId: i.productId,
        name: i.name,
        barcode: i.barcode || '',
        imageUrl: i.imageUrl || '',
        expectedQty: Number(i.expectedQty) || 0,
        receivedQty: Number(i.receivedQty) || 0,
    })),
});

// GET /api/pos/receipts  -> notas pendientes / parciales
posRouter.get('/receipts', requirePos, async (_req, res) => {
    try {
        const snap = await db().collection('localReceipts').where('status', 'in', ['pending', 'partial']).get();
        const list = snap.docs
            .map((d) => receiptView(d.id, d.data()))
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        res.json({ receipts: list });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/pos/receipts/:id
posRouter.get('/receipts/:id', requirePos, async (req, res) => {
    try {
        const doc = await db().collection('localReceipts').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ error: 'Nota no encontrada' });
        res.json({ receipt: receiptView(doc.id, doc.data()) });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/pos/receipts/:id/scan  { barcode, scanId, deviceId, productId? }
// Suma 1 unidad recibida y 1 al stock del local, en una sola transaccion.
posRouter.post('/receipts/:id/scan', requirePos, async (req, res) => {
    const pos = (req as any).pos as PosUser;
    const barcode = String(req.body?.barcode || '').trim();
    const scanId = String(req.body?.scanId || '').trim();
    const assignProductId = req.body?.productId ? String(req.body.productId) : '';
    if (!barcode && !assignProductId) return res.status(400).json({ error: 'Código vacío' });
    try {
        const settings = await getSettings();
        const receiptRef = db().collection('localReceipts').doc(req.params.id);

        // Asociar un código de barras a un perfume que no lo tenia
        if (assignProductId && barcode) {
            const pRef = db().collection('products').doc(assignProductId);
            const pSnap = await pRef.get();
            if (!pSnap.exists) return res.status(404).json({ error: 'Producto no existe' });
            const dup = await db().collection('products').where('barcode', '==', barcode).limit(1).get();
            if (!dup.empty && dup.docs[0].id !== assignProductId) {
                return res.status(409).json({ error: 'Ese código ya pertenece a otro perfume' });
            }
            await pRef.update({ barcode });
        }

        const result = await db().runTransaction(async (tx) => {
            const snap = await tx.get(receiptRef);
            if (!snap.exists) throw Object.assign(new Error('Nota no encontrada'), { http: 404 });
            const r = snap.data() as any;
            if (r.status === 'received' || r.status === 'cancelled' || r.status === 'closed') {
                throw Object.assign(new Error('La nota ya está cerrada'), { http: 409 });
            }
            const scans: any[] = r.scans || [];
            if (scanId && scans.some((s) => s.scanId === scanId)) {
                return { duplicate: true, receipt: receiptView(snap.id, r), productName: '' };
            }
            const items: any[] = r.items || [];
            const idx = items.findIndex((i) =>
                assignProductId ? i.productId === assignProductId : (i.barcode && String(i.barcode) === barcode)
            );
            if (idx < 0) throw Object.assign(new Error('Este perfume no pertenece a esta nota'), { http: 404, code: 'NOT_IN_RECEIPT' });
            const item = items[idx];
            if ((Number(item.receivedQty) || 0) >= (Number(item.expectedQty) || 0)) {
                throw Object.assign(new Error(`${item.name}: ya está completo`), { http: 409, code: 'ALREADY_COMPLETE' });
            }

            const invSnap = await tx.get(
                db().collection('inventory').where('productId', '==', item.productId).where('location', '==', r.toLocation || settings.location).limit(1)
            );
            const productSnap = await tx.get(db().collection('products').doc(item.productId));
            const headSnap = await tx.get(db().collection('pos_meta').doc('audit_head'));
            const prod = (productSnap.exists ? productSnap.data() : {}) as any;
            const cost = Number(prod.cost) || 0;
            const unitPrice = Number(prod.salePrice1) || 0;

            // ---- ESCRITURAS ----
            if (!invSnap.empty) {
                const inv = invSnap.docs[0];
                const q = (Number((inv.data() as any).quantity) || 0) + 1;
                const totalCost = (Number((inv.data() as any).totalCost) || 0) + cost;
                tx.update(inv.ref, {
                    quantity: q,
                    totalCost,
                    totalValue: totalCost,
                    totalPrice: (Number((inv.data() as any).totalPrice) || 0) + unitPrice,
                    status: 'stock',
                    updatedAt: ts(),
                });
            } else {
                tx.set(db().collection('inventory').doc(), {
                    productId: item.productId,
                    product: stripUndefined({ id: item.productId, ...prod }),
                    quantity: 1,
                    cost,
                    unitPrice,
                    totalCost: cost,
                    totalPrice: unitPrice,
                    totalValue: cost,
                    location: r.toLocation || settings.location,
                    status: 'stock',
                    createdAt: ts(),
                    updatedAt: ts(),
                });
            }

            items[idx] = { ...item, receivedQty: (Number(item.receivedQty) || 0) + 1 };
            const complete = items.every((i) => (Number(i.receivedQty) || 0) >= (Number(i.expectedQty) || 0));
            const update: any = {
                items,
                status: complete ? 'received' : 'partial',
                scans: [...scans, stripUndefined({ scanId, productId: item.productId, barcode, at: Date.now(), staffId: pos.staffId, deviceId: req.body?.deviceId })],
            };
            if (complete) {
                update.receivedAt = ts();
                update.receivedBy = pos.name;
            }
            tx.update(receiptRef, update);
            await appendAudit(tx, headSnap, {
                type: 'RECEIPT_SCAN', staffId: pos.staffId, deviceId: req.body?.deviceId,
                data: { receiptId: snap.id, productId: item.productId, barcode },
            });
            return { duplicate: false, receipt: receiptView(snap.id, { ...r, ...update, createdAt: r.createdAt }), productName: item.name };
        });
        res.json({ success: true, ...result });
    } catch (e: any) {
        res.status(e.http || 500).json({ error: e.message, code: e.code });
    }
});

// POST /api/pos/receipts/:id/close  -> cierre con faltantes (solo gerente/dueño). Devuelve faltante a Bodega Ecuador.
posRouter.post('/receipts/:id/close', requirePos, async (req, res) => {
    const pos = (req as any).pos as PosUser;
    if (pos.role !== 'manager' && pos.role !== 'owner') {
        return res.status(403).json({ error: 'Solo un gerente o el dueño puede cerrar con faltantes' });
    }
    try {
        const receiptRef = db().collection('localReceipts').doc(req.params.id);
        await db().runTransaction(async (tx) => {
            const snap = await tx.get(receiptRef);
            if (!snap.exists) throw Object.assign(new Error('Nota no encontrada'), { http: 404 });
            const r = snap.data() as any;
            if (r.status === 'received' || r.status === 'cancelled' || r.status === 'closed') {
                throw Object.assign(new Error('La nota ya está cerrada'), { http: 409 });
            }
            const missing = (r.items || [])
                .map((i: any) => ({ productId: i.productId, qty: (Number(i.expectedQty) || 0) - (Number(i.receivedQty) || 0) }))
                .filter((m: any) => m.qty > 0);
            const invs: any[] = [];
            for (const m of missing) {
                invs.push(await tx.get(db().collection('inventory').where('productId', '==', m.productId).where('location', '==', r.fromLocation || 'Bodega Ecuador').limit(1)));
            }
            missing.forEach((m: any, k: number) => {
                if (!invs[k].empty) {
                    const inv = invs[k].docs[0];
                    tx.update(inv.ref, { quantity: (Number((inv.data() as any).quantity) || 0) + m.qty, updatedAt: ts() });
                }
            });
            tx.update(receiptRef, {
                status: 'closed',
                closedAt: ts(),
                closedBy: pos.name,
                closeReason: String(req.body?.reason || '').slice(0, 200),
                missing,
            });
        });
        res.json({ success: true });
    } catch (e: any) {
        res.status(e.http || 500).json({ error: e.message });
    }
});
