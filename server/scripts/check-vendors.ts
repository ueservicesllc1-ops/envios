import fetch from 'node-fetch';

async function checkVendors() {
  try {
    console.log('🔍 Verificando vendors en Shopify...\n');
    
    const response = await fetch('https://fragrancewholesalerusa.com/collections/all/products.json?limit=250', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    const data = await response.json() as { products: any[] };
    
    const vendors = new Set<string>();
    const arabiyatLike: any[] = [];
    
    data.products.forEach(product => {
      const vendor = product.vendor || '';
      vendors.add(vendor);
      
      // Buscar cualquier cosa que contenga "arabiyat" o "prestige" o "sugar"
      const title = (product.title || '').toLowerCase();
      const vendorLower = vendor.toLowerCase();
      
      if (vendorLower.includes('arab') || title.includes('arabiyat') || 
          title.includes('prestige') || title.includes('sugar')) {
        arabiyatLike.push({
          vendor: vendor,
          title: product.title,
          tags: product.tags,
          product_type: product.product_type
        });
      }
    });
    
    console.log('📊 Todos los vendors encontrados:');
    Array.from(vendors).sort().forEach(v => console.log(`  - ${v}`));
    
    console.log(`\n🔍 Productos que podrían ser Arabiyat (${arabiyatLike.length}):`);
    arabiyatLike.slice(0, 20).forEach(p => {
      console.log(`  Vendor: "${p.vendor}" | Title: "${p.title.substring(0, 60)}"`);
      console.log(`    Tags: ${p.tags?.join(', ') || 'none'}`);
      console.log(`    Type: ${p.product_type || 'none'}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkVendors();







