import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface VibeConfig {
  fakeDiscountPercentage: number;
}

const CONFIG_DOC = 'vibeConfig/main';

export const vibeConfigService = {
  async getConfig(): Promise<VibeConfig> {
    try {
      const docRef = doc(db, CONFIG_DOC);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as VibeConfig;
      }
      return { fakeDiscountPercentage: 0 };
    } catch (error) {
      console.error('Error getting vibe config:', error);
      return { fakeDiscountPercentage: 0 };
    }
  },

  async setConfig(config: Partial<VibeConfig>): Promise<void> {
    try {
      const docRef = doc(db, CONFIG_DOC);
      await setDoc(docRef, config, { merge: true });
    } catch (error) {
      console.error('Error setting vibe config:', error);
      throw error;
    }
  }
};
