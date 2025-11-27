import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export interface PerfumeSettings {
  allowedBrands: string[]; // Marcas permitidas en la tienda
  globalDiscountPercentage?: number; // Descuento global para todos los perfumes (0-99)
  couponCode?: string; // Código del cupón de descuento adicional
  couponDiscountPercentage?: number; // Porcentaje de descuento del cupón (0-99)
  couponActive?: boolean; // Si el cupón está activo
}

const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

export const perfumeSettingsService = {
  // Obtener configuración de perfumes
  async getSettings(): Promise<PerfumeSettings> {
    try {
      const docRef = doc(db, 'settings', 'perfumes');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          allowedBrands: data.allowedBrands || [],
          globalDiscountPercentage: data.globalDiscountPercentage || 0,
          couponCode: data.couponCode || '',
          couponDiscountPercentage: data.couponDiscountPercentage || 0,
          couponActive: data.couponActive || false
        };
      }

      // Retornar configuración por defecto
      return {
        allowedBrands: [],
        globalDiscountPercentage: 0,
        couponCode: '',
        couponDiscountPercentage: 0,
        couponActive: false
      };
    } catch (error) {
      console.error('Error getting perfume settings:', error);
      return {
        allowedBrands: [],
        globalDiscountPercentage: 0,
        couponCode: '',
        couponDiscountPercentage: 0,
        couponActive: false
      };
    }
  },

  // Guardar configuración de perfumes
  async saveSettings(settings: PerfumeSettings): Promise<void> {
    try {
      const docRef = doc(db, 'settings', 'perfumes');
      await setDoc(docRef, {
        ...settings,
        updatedAt: Timestamp.now()
      }, { merge: true });

      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving perfume settings:', error);
      toast.error('Error al guardar la configuración');
      throw error;
    }
  }
};

