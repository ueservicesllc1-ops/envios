import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export interface CityShipping {
    city: string;
    cost: number;
    active: boolean;
}

export const shippingSettingsService = {
    // Referencia al documento único de configuración de envíos
    docRef: doc(db, 'settings', 'shipping_costs'),

    // Obtener todas las ciudades y sus costos
    async getShippingCosts(): Promise<CityShipping[]> {
        try {
            const docSnap = await getDoc(this.docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return data.cities || [];
            }
            return [];
        } catch (error) {
            console.error('Error getting shipping costs:', error);
            throw error;
        }
    },

    // Guardar o actualizar la lista completa
    async saveShippingCosts(cities: CityShipping[]): Promise<void> {
        try {
            await setDoc(this.docRef, { cities }, { merge: true });
            toast.success('Costos de envío actualizados');
        } catch (error) {
            console.error('Error saving shipping costs:', error);
            toast.error('Error al guardar los costos de envío');
            throw error;
        }
    },

    // Cargar ciudades principales de Ecuador por defecto
    async loadDefaultEcuadorCities(): Promise<CityShipping[]> {
        const defaultCities: CityShipping[] = [
            { city: 'Guayaquil', cost: 3, active: true },
            { city: 'Babahoyo', cost: 2, active: true },
            { city: 'Quevedo', cost: 3, active: true },
            { city: 'Quito', cost: 5, active: true },
            { city: 'Cuenca', cost: 5, active: true },
            { city: 'Machala', cost: 5, active: true },
            { city: 'Manta', cost: 5, active: true },
            { city: 'Portoviejo', cost: 5, active: true },
            { city: 'Santo Domingo', cost: 5, active: true },
            { city: 'Ambato', cost: 5, active: true },
            { city: 'Riobamba', cost: 5, active: true },
            { city: 'Loja', cost: 5, active: true },
            { city: 'Esmeraldas', cost: 5, active: true },
            { city: 'Ibarra', cost: 5, active: true },
            { city: 'Milagro', cost: 4, active: true },
            { city: 'Daule', cost: 4, active: true },
            { city: 'Durán', cost: 3, active: true }
        ];

        try {
            await setDoc(this.docRef, { cities: defaultCities }, { merge: true });
            toast.success('Ciudades de Ecuador cargadas por defecto');
            return defaultCities;
        } catch (error) {
            console.error('Error loading default cities:', error);
            toast.error('Error al cargar ciudades por defecto');
            throw error;
        }
    }
};
