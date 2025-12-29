import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export const fixFiveBelowImages = async () => {
    try {
        toast.loading('Actualizando imágenes de Five Below...');

        const productsCollection = collection(db, 'products');
        const q = query(productsCollection, where("origin", "==", "fivebelow"));
        const querySnapshot = await getDocs(q);

        let updatedCount = 0;

        for (const docSnapshot of querySnapshot.docs) {
            const product = docSnapshot.data();
            const currentImageUrl = product.imageUrl || '';

            // Si ya tiene el proxy, saltarla
            if (currentImageUrl.includes('wsrv.nl')) {
                continue;
            }

            // Si es una URL de Five Below, envolverla con el proxy
            if (currentImageUrl.includes('fbres.fivebelow.com')) {
                const proxiedUrl = `https://wsrv.nl/?url=${currentImageUrl}`;

                await updateDoc(doc(db, 'products', docSnapshot.id), {
                    imageUrl: proxiedUrl
                });

                updatedCount++;
                console.log(`✅ Actualizada imagen: ${product.name}`);
            }
        }

        toast.dismiss();
        if (updatedCount > 0) {
            toast.success(`✅ ${updatedCount} imágenes de Five Below actualizadas`);
        } else {
            toast('No se encontraron imágenes de Five Below para actualizar', { icon: 'ℹ️' });
        }

        return updatedCount;
    } catch (error) {
        console.error('Error updating Five Below images:', error);
        toast.dismiss();
        toast.error('Error al actualizar imágenes de Five Below');
        return 0;
    }
};
