import { collection, addDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

const walgreensData = [
    { "name": "Walgreens Vitamin D3 125 mcg (100 days) - 100 units", "price": "11.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/647561/450.jpg" },
    { "name": "Centrum Silver Women 50+, Multivitamin & Multimineral Tablets - 100 units", "price": "15.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/642358/450.jpg" },
    { "name": "Centrum Silver Men 50+, Multivitamin & Multimineral Tablets - 100 units", "price": "15.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/638465/450.jpg" },
    { "name": "Nature Made Vitamin D3 2000 IU (50 mcg) Softgels - 90 ea", "price": "12.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/226753/450.jpg" },
    { "name": "Nature Made Vitamin D3 5000 IU (125 mcg) Softgels - 90 units", "price": "25.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/253583/450.jpg" },
    { "name": "Nature's Bounty Optimal Solutions Hair, Skin & Nails Gummies with Biotin - 80 units", "price": "9.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/506347/450.jpg" },
    { "name": "Nature Made Vitamin D3 5000 IU (125 mcg) Gummies Strawberry, Peach & Mango - 80 units", "price": "21.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/620716/450.jpg" },
    { "name": "Nature Made Vitamin D3 2000 IU (50 mcg) Gummies - 90 units", "price": "15.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/410603/450.jpg" },
    { "name": "Nature Made Vitamin D3 1000 IU (25 mcg) Softgels - 180 ea", "price": "18.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/344274/450.jpg" },
    { "name": "Walgreens Vitamin D3 50 mcg (2000 IU) Softgels - 75 ea", "price": "7.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/649960/450.jpg" },
    { "name": "Walgreens Vitamin D3 25 mcg Softgels - 100 ea", "price": "8.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/649958/450.jpg" },
    { "name": "Nature Made Vitamin D3 2000 IU (50 mcg) Tablets - 220 ea", "price": "24.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/344277/450.jpg" },
    { "name": "Nature Made Vitamin D3 2000 IU (50 mcg) Softgels - 250 ea", "price": "27.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/338905/450.jpg" },
    { "name": "Nature Made Vitamin D3 2000 IU (50 mcg) Tablets - 100 ea", "price": "14.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/338900/450.jpg" },
    { "name": "Nature Made Vitamin D3 2000 IU (50 mcg) Tablets - 400 ea", "price": "29.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/406340/450.jpg" },
    { "name": "Nature Made Vitamin D3 1000 IU (25 mcg) Tablets - 100 ea", "price": "12.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/149037/450.jpg" },
    { "name": "Nature's Bounty Super Strength Vitamin D3 2000 IU Softgels - 150 ea", "price": "18.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/216149/450.jpg" },
    { "name": "Nature's Bounty Super Strength D3 - 2000iu - 350 ea", "price": "29.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/485096/450.jpg" },
    { "name": "Nature Made Vitamin D3 5000 IU Per Serving + K2 Gummies - 50 ea", "price": "22.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/658021/450.jpg" },
    { "name": "Nature's Bounty Zinc 50 mg Caplets - 100 ea", "price": "8.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/17690/450.jpg" },
    { "name": "Nature's Bounty Optimal Solutions Extra Strength Hair, Skin & Nails Softgels - 150 ea", "price": "21.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/390378/450.jpg" },
    { "name": "Nature's Bounty Iron, 65mg, Tablets - 100 ea", "price": "7.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/314834/450.jpg" },
    { "name": "Nature's Bounty CoQ10 200 mg Gummies Peach Mango - 60 ea", "price": "19.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/570998/450.jpg" },
    { "name": "PreserVision AREDS 2 Formula Eye Vitamin & Mineral Supplement Softgels - 120 ea", "price": "39.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/499643/450.jpg" },
    { "name": "Walgreens Melatonin Gummies 5 mg Strawberry - 90 units", "price": "13.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/672874/450.jpg" },
    { "name": "Nature's Bounty Optimal Solutions Hair, Skin & Nails with Collagen - 80 units", "price": "11.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/608307/450.jpg" },
    { "name": "Force Factor Amazing Ashwa Ashwagandha Tablets - 120 units", "price": "24.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/654298/450.jpg" },
    { "name": "Osteo Bi-Flex Advanced Triple Strength - 120 units", "price": "47.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/142552/450.jpg" },
    { "name": "OLLY Sleep Blackberry Zen - 50 units", "price": "15.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/572095/450.jpg" },
    { "name": "OLLY Women's Multi Blissful Berry - 90 units", "price": "15.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/572087/450.jpg" },
    { "name": "Osteo Bi-Flex Glucosamine and Vitamin D3 Tablets - 60 ea", "price": "37.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/446757/450.jpg" },
    { "name": "Osteo Bi-Flex Triple Strength Joint Health - 80 units", "price": "35.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/142553/450.jpg" },
    { "name": "Natrol 5-HTP Time Release 200 mg - 30 ea", "price": "24.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/350833/450.jpg" },
    { "name": "Osteo Bi-Flex Glucosamine Chondroitin plus Joint Shield - 40 ea", "price": "23.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/68217/450.jpg" },
    { "name": "Nature Made For Her Multivitamin Tablets - 90 units", "price": "14.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/54699/450.jpg" },
    { "name": "Nature Made Multivitamin + Omega-3 Gummies - 80 units", "price": "18.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/599667/450.jpg" },
    { "name": "Walgreens Men's 50+ Multivitamin Tablets - 200 units", "price": "18.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/607123/450.jpg" },
    { "name": "Nature's Bounty Women's Multi Gummies Raspberry - 80 units", "price": "12.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/575834/450.jpg" },
    { "name": "Walgreens Men's Multivitamin Tablets - 200 units", "price": "18.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/607126/450.jpg" },
    { "name": "Walgreens Adult Multivitamin Tablets - 200 units", "price": "15.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/607303/450.jpg" },
    { "name": "Walgreens Adult 50+ Multivitamin Tablets - 400 ea", "price": "29.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/599647/450.jpg" },
    { "name": "One A Day Women's Multi-Vitamin Gummy - 80 ea", "price": "11.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/637517/450.jpg" },
    { "name": "Vitafusion MultiVites Gummy Vitamins - 150 ea", "price": "16.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/240293/450.jpg" },
    { "name": "Walgreens Free & Pure Organic Women's Multivitamin Gummies - 90 ea", "price": "14.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/648508/450.jpg" },
    { "name": "Walgreens Women's 50+ Multivitamin Tablets - 200 ea", "price": "18.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/607304/450.jpg" },
    { "name": "Walgreens Free & Pure One Daily Women's Multivitamin Tablets - 200 ea", "price": "17.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/616231/450.jpg" },
    { "name": "Walgreens Multivitamin Adults 50+ Tablets - 220 ea", "price": "19.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/613098/450.jpg" },
    { "name": "Centrum Multivitamin For Adults 50 Plus - 125 ea", "price": "14.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/638109/450.jpg" },
    { "name": "One A Day Men's 50+ Multivitamin Tablets - 100 ea", "price": "16.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/6332048/450.jpg" },
    { "name": "Geritol Liquid Vitamin and Iron Supplement - 12 oz", "price": "12.99", "imageUrl": "https://wsrv.nl/?url=https://pics.walgreens.com/prodimg/6112604/450.jpg" }
];

export const importWalgreensProducts = async () => {
    try {
        toast.loading(`Importando productos de Walgreens...`);
        const productsCollection = collection(db, 'products');
        let importedCount = 0;
        let updatedCount = 0;

        for (const item of walgreensData) {
            try {
                // Verificar si el producto ya existe por nombre
                const q = query(productsCollection, where("name", "==", item.name));
                const querySnapshot = await getDocs(q);

                // El precio scraped ya incluye descuentos de Walgreens (BOGO, 50% off, etc.)
                // Lo usamos como precio de venta real
                const scrapedPrice = parseFloat(item.price);

                // Precio de venta = precio scraped (ya tiene los descuentos de Walgreens)
                const salePrice = scrapedPrice;

                // Costo estimado: 60% del precio de venta (margen 40%)
                const estimatedCost = parseFloat((salePrice * 0.60).toFixed(2));

                const productData = {
                    description: `Producto importado de Walgreens USA - Vitaminas y Suplementos.`,
                    category: 'Vitaminas',
                    origin: 'walgreens',
                    cost: estimatedCost,
                    salePrice1: salePrice,
                    salePrice2: salePrice,
                    // No establecemos originalPrice para que no se muestre tachado
                    weight: 0.30,
                    updatedAt: serverTimestamp()
                };

                // Generar SKU único
                const sku = `WG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                if (!querySnapshot.empty) {
                    // Actualizar existente
                    const docRef = querySnapshot.docs[0].ref;
                    await updateDoc(docRef, productData);
                    updatedCount++;
                } else {
                    // Crear nuevo
                    await addDoc(productsCollection, {
                        name: item.name,
                        ...productData,
                        sku: sku,
                        imageUrl: item.imageUrl,
                        images: [],
                        createdAt: serverTimestamp()
                    });
                    importedCount++;
                }
            } catch (itemError) {
                console.error(`Error processing item ${item.name}:`, itemError);
            }
        }

        toast.dismiss();
        if (importedCount > 0 || updatedCount > 0) {
            toast.success(`Importación de Walgreens: ${importedCount} nuevos, ${updatedCount} actualizados.`);
        } else {
            toast('No hubo cambios en los productos.', { icon: 'ℹ️' });
        }
    } catch (error) {
        console.error('Error importing Walgreens products:', error);
        toast.dismiss();
        toast.error('Error al importar productos de Walgreens.');
    }
};
