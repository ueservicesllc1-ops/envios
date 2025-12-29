import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export const updateWalgreensImages = async () => {
    try {
        toast.loading('Actualizando imágenes de Walgreens...');

        const productsCollection = collection(db, 'products');
        const q = query(productsCollection, where("origin", "==", "walgreens"));
        const querySnapshot = await getDocs(q);

        let updatedCount = 0;

        for (const docSnapshot of querySnapshot.docs) {
            const product = docSnapshot.data();
            const currentImageUrl = product.imageUrl || '';

            // Si la URL ya tiene el proxy, saltarla
            if (currentImageUrl.includes('wsrv.nl')) {
                continue;
            }

            // Si es una URL de Walgreens, envolverla con el proxy
            if (currentImageUrl.includes('pics.walgreens.com')) {
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
            toast.success(`✅ ${updatedCount} imágenes de Walgreens actualizadas`);
        } else {
            toast('No se encontraron imágenes de Walgreens para actualizar', { icon: 'ℹ️' });
        }

        return updatedCount;
    } catch (error) {
        console.error('Error updating Walgreens images:', error);
        toast.dismiss();
        toast.error('Error al actualizar imágenes de Walgreens');
        return 0;
    }
};
