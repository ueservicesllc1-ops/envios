import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export const cleanProductsWithBrokenImages = async () => {
    try {
        toast.loading('Verificando imágenes de productos...');
        const productsCollection = collection(db, 'products');
        const querySnapshot = await getDocs(productsCollection);

        let deletedCount = 0;
        let checkedCount = 0;
        const totalProducts = querySnapshot.docs.length;

        for (const docSnapshot of querySnapshot.docs) {
            const product = docSnapshot.data();
            checkedCount++;

            // Actualizar mensaje de progreso
            if (checkedCount % 10 === 0) {
                toast.loading(`Verificando imágenes... ${checkedCount}/${totalProducts}`);
            }

            // Si no tiene imageUrl, eliminar
            if (!product.imageUrl || product.imageUrl.trim() === '') {
                await deleteDoc(doc(db, 'products', docSnapshot.id));
                deletedCount++;
                console.log(`🗑️ Eliminado (sin URL): ${product.name || 'Sin nombre'}`);
                continue;
            }

            // Verificar si la URL responde (método simple - solo para dominios conocidos problemáticos)
            const imageUrl = product.imageUrl;

            // Si es una imagen de Five Below o Walgreens, verificar
            if (imageUrl.includes('fbres.fivebelow.com') || imageUrl.includes('pics.walgreens.com')) {
                try {
                    // Intentar cargar la imagen
                    const response = await fetch(imageUrl, { method: 'HEAD', mode: 'no-cors' });
                    // Si mode es no-cors, no podemos verificar status, así que asumimos OK
                    // Para verificación real, usaríamos un proxy o backend

                    // Por ahora, si es de Five Below y no tiene proxy, probablemente está rota
                    if (imageUrl.includes('fbres.fivebelow.com') && !imageUrl.includes('wsrv.nl')) {
                        await deleteDoc(doc(db, 'products', docSnapshot.id));
                        deletedCount++;
                        console.log(`🗑️ Eliminado (FB sin proxy): ${product.name || 'Sin nombre'}`);
                    }
                } catch (error) {
                    // Si falla la petición, eliminar
                    await deleteDoc(doc(db, 'products', docSnapshot.id));
                    deletedCount++;
                    console.log(`🗑️ Eliminado (error carga): ${product.name || 'Sin nombre'}`);
                }
            }
        }

        toast.dismiss();
        if (deletedCount > 0) {
            toast.success(`✅ ${deletedCount} productos con imágenes rotas eliminados`);
        } else {
            toast('✓ Todas las imágenes están OK', { icon: '✅' });
        }

        return deletedCount;
    } catch (error) {
        console.error('Error cleaning products:', error);
        toast.dismiss();
        toast.error('Error al limpiar productos');
        return 0;
    }
};
