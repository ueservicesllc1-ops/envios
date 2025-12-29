import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface UserPreferences {
    viewedCategories: { [category: string]: number }; // Categoría -> Contador de vistas
    viewedProducts: string[]; // IDs de productos vistos recientemente
    lastViewedAt: any;
}

export const userService = {
    // Registrar vista de un producto y actualizar preferencias
    async logProductView(userId: string, productId: string, category: string) {
        if (!userId || !productId) return;

        try {
            const userRef = doc(db, 'userPreferences', userId);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const data = userDoc.data() as UserPreferences;

                // Actualizar contador de categoría
                const currentCategoryCount = data.viewedCategories?.[category] || 0;

                // Actualizar lista de productos vistos (mantener últimos 20)
                let viewedProducts = data.viewedProducts || [];
                viewedProducts = [productId, ...viewedProducts.filter(id => id !== productId)].slice(0, 20);

                await updateDoc(userRef, {
                    [`viewedCategories.${category}`]: currentCategoryCount + 1,
                    viewedProducts: viewedProducts,
                    lastViewedAt: serverTimestamp()
                });
            } else {
                // Crear documento si no existe
                await setDoc(userRef, {
                    viewedCategories: { [category]: 1 },
                    viewedProducts: [productId],
                    lastViewedAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error logging product view:', error);
            // No bloquear la UI por errores de tracking
        }
    },

    // Obtener preferencias del usuario
    async getUserPreferences(userId: string): Promise<UserPreferences | null> {
        if (!userId) return null;

        try {
            const userRef = doc(db, 'userPreferences', userId);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                return userDoc.data() as UserPreferences;
            }
            return null;
        } catch (error) {
            console.error('Error getting user preferences:', error);
            return null;
        }
    }
};
