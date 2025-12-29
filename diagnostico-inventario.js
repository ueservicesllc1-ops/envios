// Script de Diagnóstico de Inventario
// Ejecutar en la consola del navegador (F12)

async function diagnosticarInventario() {
    console.log('🔍 DIAGNÓSTICO DE INVENTARIO - INICIANDO...\n');

    // 1. Obtener inventario actual
    const inventory = await window.inventoryService.getAll();
    const usaStock = inventory.filter(i => i.location === 'Bodega USA');

    console.log(`📦 INVENTARIO BODEGA USA: ${usaStock.length} productos`);
    console.log('─'.repeat(80));

    // 2. Obtener todas las exit notes
    const { exitNoteService } = await import('./services/exitNoteService');
    const exitNotes = await exitNoteService.getAll();

    console.log(`📋 NOTAS DE SALIDA: ${exitNotes.length} notas encontradas\n`);

    // 3. Analizar cada producto en Bodega USA
    for (const item of usaStock) {
        const productId = item.productId;
        const currentStock = item.quantity;

        // Buscar en exit notes
        let totalInExitNotes = 0;
        const relatedExitNotes = [];

        for (const note of exitNotes) {
            for (const noteItem of note.items) {
                if (noteItem.productId === productId) {
                    totalInExitNotes += noteItem.quantity;
                    relatedExitNotes.push({
                        number: note.number,
                        quantity: noteItem.quantity,
                        date: note.date,
                        destination: note.destination
                    });
                }
            }
        }

        if (totalInExitNotes > 0) {
            console.log(`\n⚠️ DISCREPANCIA ENCONTRADA:`);
            console.log(`   Producto ID: ${productId}`);
            console.log(`   Stock Actual (Bodega USA): ${currentStock}`);
            console.log(`   Total en Notas de Salida: ${totalInExitNotes}`);
            console.log(`   Stock Esperado: ${currentStock - totalInExitNotes}`);
            console.log(`   Notas de Salida relacionadas:`);
            relatedExitNotes.forEach(note => {
                console.log(`      - ${note.number}: ${note.quantity} unidades, Destino: ${note.destination}, Fecha: ${new Date(note.date).toLocaleDateString()}`);
            });
        }
    }

    console.log('\n' + '─'.repeat(80));
    console.log('✅ DIAGNÓSTICO COMPLETADO\n');

    // 4. Resumen
    const productosConDiscrepancia = usaStock.filter(item => {
        let totalInExitNotes = 0;
        for (const note of exitNotes) {
            for (const noteItem of note.items) {
                if (noteItem.productId === item.productId) {
                    totalInExitNotes += noteItem.quantity;
                }
            }
        }
        return totalInExitNotes > 0;
    });

    console.log(`📊 RESUMEN:`);
    console.log(`   Total productos en Bodega USA: ${usaStock.length}`);
    console.log(`   Productos con discrepancia: ${productosConDiscrepancia.length}`);
    console.log(`   Notas de salida totales: ${exitNotes.length}`);
}

// Ejecutar diagnóstico
diagnosticarInventario();
