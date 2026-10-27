/**
 * Crea/actualiza un asesor del POS y configura posSettings por defecto.
 *
 * Uso:
 *   $env:FIREBASE_SERVICE_ACCOUNT = Get-Content serviceAccount.json -Raw
 *   npx ts-node --transpile-only --project server/tsconfig.json server/scripts/create-pos-staff.ts "Maria Perez" 1234 advisor
 *
 * Roles: advisor | manager | owner
 */
import { adminDb } from '../services/firebaseAdmin';
import { hashPin } from '../routes/pos';

async function main() {
    const [name, pin, role = 'advisor'] = process.argv.slice(2);
    if (!name || !/^\d{4,8}$/.test(pin || '') || !['advisor', 'manager', 'owner'].includes(role)) {
        console.error('Uso: create-pos-staff.ts "<Nombre>" <PIN 4-8 dígitos> [advisor|manager|owner]');
        process.exit(1);
    }
    const db = adminDb();
    const id = name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    await db.collection('pos_staff').doc(id).set(
        { name, role, pinHash: hashPin(pin), active: true, failedAttempts: 0 },
        { merge: true }
    );

    const settingsRef = db.collection('settings').doc('posSettings');
    if (!(await settingsRef.get()).exists) {
        await settingsRef.set({
            location: 'Bodega Principal',
            priceField: 'salePrice1',
            requireRegisteredDevice: false,
            maxDiscountByRole: { advisor: 5, manager: 15, owner: 100 },
        });
        console.log('✅ settings/posSettings creado con valores por defecto');
    }
    console.log(`✅ Asesor "${name}" (${role}) guardado con id: ${id}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
