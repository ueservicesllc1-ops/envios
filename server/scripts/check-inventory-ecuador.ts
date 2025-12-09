import { returnService } from '../../src/services/returnService';
import { exitNoteService } from '../../src/services/exitNoteService';
import { sellerService } from '../../src/services/sellerService';
import { inventoryService } from '../../src/services/inventoryService';
import { productService } from '../../src/services/productService';

// Script para verificar el stock de células madres en Bodega Ecuador
async function checkInventoryEcuador() {
  const productSKU = '685674959047';
  
  console.log('🔍 Verificando inventario de células madres (SKU: 685674959047) en Bodega Ecuador...\n');
  
  try {
    // 1. Buscar el producto por SKU
    const products = await productService.getAll();
    const product = products.find(p => p.sku === productSKU);
    
    if (!product) {
      console.log(`❌ No se encontró producto con SKU: ${productSKU}`);
      return;
    }
    
    console.log(`✅ Producto encontrado: ${product.name} (SKU: ${product.sku})\n`);
    
    // 2. Buscar vendedor Vilma
    const sellers = await sellerService.getAll();
    const vilmaSeller = sellers.find(s => s.name?.toLowerCase().includes('vilma'));
    
    if (!vilmaSeller) {
      console.log('❌ No se encontró vendedor Vilma');
      return;
    }
    
    console.log(`✅ Vendedor Vilma encontrado: ${vilmaSeller.name} (ID: ${vilmaSeller.id})\n`);
    
    // 3. Obtener devoluciones de Vilma
    console.log('📦 Buscando devoluciones de Vilma...');
    const vilmaReturns = await returnService.getBySeller(vilmaSeller.id);
    console.log(`📋 Devoluciones de Vilma encontradas: ${vilmaReturns.length}`);
    
    const returnsWithProduct = vilmaReturns.filter(returnItem => {
      return returnItem.items?.some((item: any) => 
        item.productId === product.id || item.product?.id === product.id
      );
    });
    
    console.log(`📦 Devoluciones de Vilma con células madres: ${returnsWithProduct.length}\n`);
    
    returnsWithProduct.forEach((ret, idx) => {
      console.log(`\n📄 Devolución ${idx + 1}:`);
      console.log(`   ID: ${ret.id}`);
      console.log(`   Estado: ${ret.status}`);
      console.log(`   Fecha: ${ret.createdAt}`);
      console.log(`   Items:`);
      ret.items?.forEach((item: any) => {
        if (item.productId === product.id || item.product?.id === product.id) {
          console.log(`     - ${item.product?.name || 'Producto'} (SKU: ${item.product?.sku || 'N/A'})`);
          console.log(`       Cantidad: ${item.quantity}`);
          console.log(`       Precio unitario: $${item.unitPrice || 0}`);
        }
      });
      console.log(`   Total: $${ret.totalValue || 0}`);
    });
    
    // 4. Obtener todas las notas de salida
    console.log('\n\n📦 Buscando notas de salida de Ecuador...');
    const allExitNotes = await exitNoteService.getAll();
    
    // Filtrar notas de salida de Ecuador (NS-ECU-)
    const ecuadorExitNotes = allExitNotes.filter(note => 
      note.number?.includes('ECU') || note.number?.startsWith('NS-ECU-')
    );
    
    console.log(`📋 Notas de salida de Ecuador encontradas: ${ecuadorExitNotes.length}`);
    
    // Buscar notas con el producto
    const exitNotesWithProduct = ecuadorExitNotes.filter(note => {
      return note.items?.some((item: any) => 
        item.productId === product.id || item.product?.id === product.id
      );
    });
    
    console.log(`📦 Notas de salida de Ecuador con células madres: ${exitNotesWithProduct.length}\n`);
    
    exitNotesWithProduct.forEach((note, idx) => {
      console.log(`\n📄 Nota de salida ${idx + 1}:`);
      console.log(`   Número: ${note.number}`);
      console.log(`   Vendedor: ${note.seller}`);
      console.log(`   Estado: ${note.status}`);
      console.log(`   Fecha: ${note.date}`);
      console.log(`   Items:`);
      note.items?.forEach((item: any) => {
        if (item.productId === product.id || item.product?.id === product.id) {
          console.log(`     - ${item.product?.name || 'Producto'} (SKU: ${item.product?.sku || 'N/A'})`);
          console.log(`       Cantidad: ${item.quantity}`);
          console.log(`       Precio unitario: $${item.unitPrice || 0}`);
        }
      });
      console.log(`   Total: $${note.totalPrice || 0}`);
    });
    
    // 5. Obtener inventario de Bodega Ecuador
    console.log('\n\n📦 Verificando inventario actual de Bodega Ecuador...');
    const allInventory = await inventoryService.getAll();
    
    const ecuadorInventory = allInventory.filter(inv => 
      inv.location?.toLowerCase().includes('ecuador') || inv.location === 'Ecuador'
    );
    
    const productInventory = ecuadorInventory.find(inv => 
      inv.productId === product.id
    );
    
    if (productInventory) {
      console.log(`\n✅ Inventario actual en Bodega Ecuador:`);
      console.log(`   Producto: ${productInventory.product?.name || 'N/A'}`);
      console.log(`   SKU: ${productInventory.product?.sku || 'N/A'}`);
      console.log(`   Cantidad: ${productInventory.quantity || 0}`);
      console.log(`   Ubicación: ${productInventory.location || 'N/A'}`);
      console.log(`   Estado: ${productInventory.status || 'N/A'}`);
    } else {
      console.log(`\n⚠️ No se encontró inventario del producto en Bodega Ecuador`);
    }
    
    // 6. Calcular balance
    console.log('\n\n💰 CALCULANDO BALANCE:\n');
    console.log('ENTRADAS (Devoluciones aprobadas de Vilma):');
    let totalReturns = 0;
    returnsWithProduct.forEach(ret => {
      if (ret.status === 'approved') {
        ret.items?.forEach((item: any) => {
          if (item.productId === product.id || item.product?.id === product.id) {
            console.log(`   +${item.quantity} unidades (Devolución ${ret.id})`);
            totalReturns += item.quantity || 0;
          }
        });
      }
    });
    console.log(`   Total devoluciones: +${totalReturns} unidades`);
    
    console.log('\nSALIDAS (Notas de salida de Ecuador):');
    let totalExits = 0;
    exitNotesWithProduct.forEach(note => {
      note.items?.forEach((item: any) => {
        if (item.productId === product.id || item.product?.id === product.id) {
          console.log(`   -${item.quantity} unidades (Nota ${note.number} - ${note.seller})`);
          totalExits += item.quantity || 0;
        }
      });
    });
    console.log(`   Total salidas: -${totalExits} unidades`);
    
    const expectedStock = totalReturns - totalExits;
    const actualStock = productInventory?.quantity || 0;
    
    console.log(`\n📊 RESULTADO:`);
    console.log(`   Stock esperado: ${expectedStock} unidades`);
    console.log(`   Stock actual: ${actualStock} unidades`);
    console.log(`   Diferencia: ${actualStock - expectedStock} unidades`);
    
    if (actualStock !== expectedStock) {
      console.log(`\n⚠️ ⚠️ ⚠️ HAY UNA DISCREPANCIA ⚠️ ⚠️ ⚠️`);
      console.log(`   El stock actual no coincide con el calculado`);
    } else {
      console.log(`\n✅ El stock coincide correctamente`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar el script
checkInventoryEcuador().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error ejecutando verificación:', error);
  process.exit(1);
});



