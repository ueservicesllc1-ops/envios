
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account key not found at:', serviceAccountPath);
    process.exit(1);
}
const serviceAccount = require(serviceAccountPath);

// Initialize only if not already initialized
try {
    initializeApp({
        credential: cert(serviceAccount)
    });
} catch (e) {
    // Ignore if already initialized
}

const db = getFirestore();

async function fixInventory() {
    console.log('Iniciando corrección de inventario...');

    try {
        // 1. Buscar la última nota de salida pendiente para Bodega Ecuador
        const notesSnapshot = await db.collection('exitNotes')
            .where('sellerId', '==', 'bodega-ecuador')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (notesSnapshot.empty) {
            console.log('No se encontraron notas pendientes para Bodega Ecuador.');
            return;
        }

        const lastNote = notesSnapshot.docs[0];
        const noteData = lastNote.data();
        console.log(`Encontrada nota: ${noteData.number} (${lastNote.id})`);
        console.log(`Fecha: ${noteData.createdAt.toDate()}`);
        console.log(`Items: ${noteData.items.length}`);

        // 2. Revertir inventario en Bodega Ecuador
        console.log('Revirtiendo stock en Bodega Ecuador...');

        for (const item of noteData.items) {
            // Buscar el item en el inventario de Bodega Ecuador
            const snapshot = await db.collection('inventory')
                .where('productId', '==', item.productId)
                .where('location', '==', 'Bodega Ecuador')
                .get();

            if (!snapshot.empty) {
                const inventoryDoc = snapshot.docs[0];
                const currentQty = inventoryDoc.data().quantity || 0;
                const newQty = Math.max(0, currentQty - item.quantity);

                await inventoryDoc.ref.update({ quantity: newQty });
                console.log(` - ${item.product.name}: ${currentQty} -> ${newQty}`);
            } else {
                console.log(` - ${item.product.name}: No encontrado en Bodega Ecuador (OK)`);
            }
        }

        console.log('Corrección completada exitosamente.');

    } catch (error) {
        console.error('Error durante la corrección:', error);
    }
}

fixInventory().then(() => process.exit());
