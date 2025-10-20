import { productService } from '../services/productService';

export const addSampleProducts = async () => {
  const sampleProducts = [
    {
      name: 'Laptop HP Pavilion',
      description: 'Laptop HP Pavilion 15 pulgadas, 8GB RAM, 256GB SSD',
      category: 'Electrónicos',
      sku: 'HP-PAV-001',
      cost: 450.00,
      salePrice1: 550.00,
      salePrice2: 500.00,
      barcode: '1234567890123'
    },
    {
      name: 'Mouse Inalámbrico Logitech',
      description: 'Mouse inalámbrico Logitech M705 con receptor USB',
      category: 'Accesorios',
      sku: 'LOG-M705-001',
      cost: 25.00,
      salePrice1: 35.00,
      salePrice2: 30.00,
      barcode: '1234567890124'
    },
    {
      name: 'Teclado Mecánico RGB',
      description: 'Teclado mecánico con retroiluminación RGB, switches azules',
      category: 'Accesorios',
      sku: 'TEC-RGB-001',
      cost: 80.00,
      salePrice1: 120.00,
      salePrice2: 100.00,
      barcode: '1234567890125'
    },
    {
      name: 'Monitor Samsung 24"',
      description: 'Monitor Samsung 24 pulgadas Full HD, 75Hz',
      category: 'Monitores',
      sku: 'SAM-24-001',
      cost: 180.00,
      salePrice1: 250.00,
      salePrice2: 220.00,
      barcode: '1234567890126'
    },
    {
      name: 'Auriculares Gaming',
      description: 'Auriculares gaming con micrófono, 7.1 surround',
      category: 'Audio',
      sku: 'AUD-GAM-001',
      cost: 60.00,
      salePrice1: 90.00,
      salePrice2: 75.00,
      barcode: '1234567890127'
    },
    {
      name: 'Zapatos Deportivos Nike Air Max',
      description: 'Zapatos deportivos Nike Air Max para running y entrenamiento',
      category: 'ZAPATOS',
      sku: 'NIKE-AIR-001',
      cost: 80.00,
      salePrice1: 120.00,
      salePrice2: 100.00,
      barcode: '1234567890128'
    },
    {
      name: 'Zapatos Casual Adidas Stan Smith',
      description: 'Zapatos casuales Adidas Stan Smith clásicos blancos',
      category: 'ZAPATOS',
      sku: 'ADIDAS-STAN-001',
      cost: 60.00,
      salePrice1: 90.00,
      salePrice2: 75.00,
      barcode: '1234567890129'
    },
    {
      name: 'Vitamina C 1000mg',
      description: 'Vitamina C 1000mg con zinc, 60 cápsulas',
      category: 'VITAMINAS',
      sku: 'VIT-C-1000-001',
      cost: 15.00,
      salePrice1: 25.00,
      salePrice2: 20.00,
      barcode: '1234567890130'
    },
    {
      name: 'Multivitamínico Completo',
      description: 'Multivitamínico con 12 vitaminas y minerales esenciales',
      category: 'VITAMINAS',
      sku: 'MULTI-VIT-001',
      cost: 20.00,
      salePrice1: 35.00,
      salePrice2: 30.00,
      barcode: '1234567890131'
    }
  ];

  try {
    console.log('Agregando productos de ejemplo...');
    
    for (const product of sampleProducts) {
      try {
        const id = await productService.create(product);
        console.log(`✅ Producto creado: ${product.name} (ID: ${id})`);
      } catch (error) {
        console.log(`❌ Error creando ${product.name}:`, error);
      }
    }
    
    console.log('🎉 Productos de ejemplo agregados exitosamente');
  } catch (error) {
    console.error('Error agregando productos:', error);
  }
};
