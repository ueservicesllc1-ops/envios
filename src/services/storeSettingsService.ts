import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export interface HeroSlide {
    id: string;
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    backgroundColor: string;
    imageUrl: string;
    enabled: boolean;
}

export interface PromoBanner {
    text: string;
    subtext: string;
    backgroundColor: string;
    textColor: string;
    enabled: boolean;
}

export interface InfoBanner {
    icon: string;
    title: string;
    description: string;
    borderColor: string;
    iconBgColor: string;
    iconColor: string;
    imageUrl?: string;
    enabled: boolean;
}

export interface AdvertisingBanner {
    id: string;
    imageUrl: string;
    enabled: boolean;
}

export interface StoreSettings {
    heroSlides: HeroSlide[];
    promoBanner: PromoBanner;
    infoBanners: InfoBanner[];
    advertisingBanners: AdvertisingBanner[];
}

const DEFAULT_SETTINGS: StoreSettings = {
    heroSlides: [
        {
            id: 'slide-1',
            title: 'ENVÍOS RÁPIDOS',
            subtitle: 'Tus compras de USA en Ecuador',
            buttonText: 'Ver tarifas',
            buttonLink: '#tarifas',
            backgroundColor: 'from-blue-900 to-blue-800',
            imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80',
            enabled: true
        },
        {
            id: 'slide-2',
            title: 'Lo nuevo en Perfumes',
            subtitle: 'Fragancias importadas al mejor precio.',
            buttonText: 'Comprar ahora',
            buttonLink: '#perfumes',
            backgroundColor: 'from-blue-900 to-blue-900',
            imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80',
            enabled: true
        },
        {
            id: 'slide-3',
            title: 'Envío Gratis',
            subtitle: 'En compras superiores a $100',
            buttonText: 'Ver productos elegibles',
            buttonLink: '#productos',
            backgroundColor: 'from-purple-800 to-indigo-900',
            imageUrl: '',
            enabled: true
        }
    ],
    promoBanner: {
        text: '🎁 ¡Bono por registro de $20 Dólares!*',
        subtext: '*Este bono se usará para pagos de envíos y se deducirá 20% de este bono por cada envío hasta alcanzar el total.',
        backgroundColor: '#fbbf24',
        textColor: '#1e3a8a',
        enabled: true
    },
    infoBanners: [
        {
            icon: 'Truck',
            title: 'Envío Seguro',
            description: 'Protección completa de tus productos desde USA hasta tu puerta en Ecuador.',
            borderColor: 'blue-600',
            iconBgColor: 'bg-blue-100',
            iconColor: 'text-blue-600',
            enabled: true
        },
        {
            icon: 'DollarSign',
            title: 'Precios de Oferta en USA',
            description: 'Aprovecha los mejores precios y descuentos directos desde Estados Unidos.',
            borderColor: 'yellow-500',
            iconBgColor: 'bg-yellow-100',
            iconColor: 'text-yellow-600',
            enabled: true
        },
        {
            icon: 'Clock',
            title: 'Envíos de 7 a 15 Días',
            description: 'Recibe tus compras en tiempo récord con nuestro servicio express.',
            borderColor: 'purple-600',
            iconBgColor: 'bg-purple-100',
            iconColor: 'text-purple-600',
            enabled: true
        },
        {
            icon: 'Users',
            title: '+200 Clientes Satisfechos',
            description: 'Únete a nuestra comunidad de clientes felices que confían en nosotros.',
            borderColor: 'green-500',
            iconBgColor: 'bg-green-100',
            iconColor: 'text-green-600',
            enabled: true
        }
    ],
    advertisingBanners: Array.from({ length: 12 }, (_, i) => ({
        id: `ad-banner-${i + 1}`,
        imageUrl: '',
        enabled: false
    }))
};

export const storeSettingsService = {
    async getSettings(): Promise<StoreSettings> {
        try {
            const docRef = doc(db, 'settings', 'storeSettings');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data() as StoreSettings;
            }

            // Si no existen configuraciones, devolver y guardar las predeterminadas
            await this.saveSettings(DEFAULT_SETTINGS);
            return DEFAULT_SETTINGS;
        } catch (error) {
            console.error('Error loading store settings:', error);
            return DEFAULT_SETTINGS;
        }
    },

    async saveSettings(settings: StoreSettings): Promise<void> {
        try {
            const docRef = doc(db, 'settings', 'storeSettings');
            await setDoc(docRef, settings);
            toast.success('✅ Configuración guardada exitosamente');
        } catch (error) {
            console.error('Error saving store settings:', error);
            toast.error('Error al guardar la configuración');
            throw error;
        }
    },

    async resetToDefaults(): Promise<void> {
        try {
            await this.saveSettings(DEFAULT_SETTINGS);
            toast.success('✅ Configuración restablecida a valores predeterminados');
        } catch (error) {
            console.error('Error resetting store settings:', error);
            toast.error('Error al restablecer la configuración');
            throw error;
        }
    }
};
