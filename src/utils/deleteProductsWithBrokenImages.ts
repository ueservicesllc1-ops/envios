import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export const deleteProductsWithBrokenImages = async () => {
    try {
        toast.loading('Eliminando productos con imágenes rotas...');
        const productsCollection = collection(db, 'products');
        const querySnapshot = await getDocs(productsCollection);

        let deletedCount = 0;
        let checkedCount = 0;
        const totalProducts = querySnapshot.docs.length;

        for (const docSnapshot of querySnapshot.docs) {
            const product = docSnapshot.data();
            checkedCount++;

            // Actualizar progreso cada 10 productos
            if (checkedCount % 10 === 0) {
                toast.loading(`Verificando... ${checkedCount}/${totalProducts}`);
            }

            const imageUrl = product.imageUrl || '';

            // Si no tiene imageUrl, eliminar
            if (!imageUrl || imageUrl.trim() === '') {
                await deleteDoc(doc(db, 'products', docSnapshot.id));
                deletedCount++;
                console.log(`🗑️ Eliminado (sin URL): ${product.name || 'Sin nombre'}`);
                continue;
            }

            // Si es de Five Below sin proxy, probablemente está roto - eliminar
            if (imageUrl.includes('fbres.fivebelow.com') && !imageUrl.includes('wsrv.nl')) {
                await deleteDoc(doc(db, 'products', docSnapshot.id));
                deletedCount++;
                console.log(`🗑️ Eliminado (FB sin proxy): ${product.name || 'Sin nombre'}`);
                continue;
            }

            // Si es una URL local que no existe (no empieza con http)
            if (!imageUrl.startsWith('http')) {
                await deleteDoc(doc(db, 'products', docSnapshot.id));
                deletedCount++;
                console.log(`🗑️ Eliminado (URL inválida): ${product.name || 'Sin nombre'}`);
            }
        }

        toast.dismiss();
        if (deletedCount > 0) {
            toast.success(`✅ ${deletedCount} productos con imágenes rotas eliminados`);
        } else {
            toast('✓ No se encontraron productos con imágenes rotas', { icon: '✅' });
        }

        return deletedCount;
    } catch (error) {
        console.error('Error cleaning products:', error);
        toast.dismiss();
        toast.error('Error al limpiar productos');
        return 0;
    }
};
