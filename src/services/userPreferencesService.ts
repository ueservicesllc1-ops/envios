import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface UserPreferences {
    viewedCategories: { [category: string]: number }; // Categoría -> Contador de vistas
    viewedProducts: string[]; // IDs de productos vistos recientemente
    lastViewedAt: any;
    savedAddresses?: SavedAddress[];
    profile?: {
        phone?: string;
        identityCard?: string;
    };
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
    },

    // Guardar una nueva dirección
    async saveAddress(userId: string, address: SavedAddress) {
        if (!userId) return;
        try {
            const userRef = doc(db, 'userPreferences', userId);
            const userDoc = await getDoc(userRef);

            let addresses: SavedAddress[] = [];
            if (userDoc.exists()) {
                const data = userDoc.data() as UserPreferences;
                addresses = data.savedAddresses || [];
            }

            // Si es default, quitar default a las otras
            if (address.isDefault) {
                addresses = addresses.map(addr => ({ ...addr, isDefault: false }));
            }

            // Añadir o actualizar si tiene ID y ya existe
            const existingIndex = addresses.findIndex(a => a.id === address.id);
            if (existingIndex >= 0) {
                addresses[existingIndex] = address;
            } else {
                addresses.push(address);
            }

            // Si es la primera, hacerla default
            if (addresses.length === 1) {
                addresses[0].isDefault = true;
            }

            await setDoc(userRef, { savedAddresses: addresses }, { merge: true });
        } catch (error) {
            console.error('Error saving address:', error);
            throw error;
        }
    },

    // Obtener direcciones
    async getAddresses(userId: string): Promise<SavedAddress[]> {
        if (!userId) return [];
        const prefs = await this.getUserPreferences(userId);
        return prefs?.savedAddresses || [];
    },

    // Eliminar dirección
    async deleteAddress(userId: string, addressId: string) {
        if (!userId) return;
        try {
            const userRef = doc(db, 'userPreferences', userId);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) return;

            const data = userDoc.data() as UserPreferences;
            const addresses = (data.savedAddresses || []).filter(a => a.id !== addressId);

            await updateDoc(userRef, { savedAddresses: addresses });
        } catch (error) {
            console.error('Error deleting address:', error);
            throw error;
        }
    },

    // Actualizar perfil
    async updateProfile(userId: string, profile: { phone?: string; identityCard?: string }) {
        if (!userId) return;
        const userRef = doc(db, 'userPreferences', userId);
        await setDoc(userRef, { profile }, { merge: true });
    }
};

export interface SavedAddress {
    id: string;
    alias: string;
    fullName: string;
    phone: string;
    province: string;
    city: string;
    address: string;
    reference?: string;
    identityCard?: string;
    isDefault: boolean;
}
