import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export const cleanAllFiveBelowProducts = async () => {
    try {
        toast.loading('Eliminando TODOS los productos de Five Below...');
        const productsCollection = collection(db, 'products');
        const querySnapshot = await getDocs(productsCollection);

        let deletedCount = 0;

        for (const docSnapshot of querySnapshot.docs) {
            const product = docSnapshot.data();

            // Eliminar si es de Five Below (independientemente de la imagen)
            if (product.origin === 'fivebelow') {
                await deleteDoc(doc(db, 'products', docSnapshot.id));
                deletedCount++;
                console.log(`🗑️ Eliminado Five Below: ${product.name || 'Sin nombre'}`);
            }

            // También eliminar si tiene una URL de Five Below en la imagen (por si origin no está set)
            const imageUrl = product.imageUrl || '';
            if (imageUrl.includes('fbres.fivebelow.com')) {
                await deleteDoc(doc(db, 'products', docSnapshot.id));
                deletedCount++;
                console.log(`🗑️ Eliminado por URL FB: ${product.name || 'Sin nombre'}`);
            }
        }

        toast.dismiss();
        if (deletedCount > 0) {
            toast.success(`✅ ${deletedCount} productos de Five Below eliminados`);
        } else {
            toast('No se encontraron productos de Five Below', { icon: 'ℹ️' });
        }

        return deletedCount;
    } catch (error) {
        console.error('Error cleaning Five Below products:', error);
        toast.dismiss();
        toast.error('Error al eliminar productos de Five Below');
        return 0;
    }
};
