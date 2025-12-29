import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export const cleanProductsWithoutImages = async () => {
    try {
        toast.loading('Limpiando productos sin imágenes...');
        const productsCollection = collection(db, 'products');
        const querySnapshot = await getDocs(productsCollection);

        let deletedCount = 0;

        for (const docSnapshot of querySnapshot.docs) {
            const product = docSnapshot.data();

            // Eliminar si no tiene imageUrl o si está vacío
            if (!product.imageUrl || product.imageUrl.trim() === '') {
                await deleteDoc(doc(db, 'products', docSnapshot.id));
                deletedCount++;
                console.log(`🗑️ Eliminado: ${product.name || 'Sin nombre'}`);
            }
        }

        toast.dismiss();
        if (deletedCount > 0) {
            toast.success(`✅ ${deletedCount} productos sin imágenes eliminados`);
        } else {
            toast('✓ Todos los productos tienen imágenes', { icon: '✅' });
        }

        return deletedCount;
    } catch (error) {
        console.error('Error cleaning products:', error);
        toast.dismiss();
        toast.error('Error al limpiar productos');
        return 0;
    }
};
