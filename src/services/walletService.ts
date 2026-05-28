import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface WalletInfo {
    points: number;
    lastSpinDate?: any; // To check if they spun today
    coupons?: any[]; // Array of won coupons
}

export const walletService = {
    // Get wallet info for a user
    async getWallet(userId: string): Promise<WalletInfo> {
        const docRef = doc(db, 'wallets', userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data() as WalletInfo;
        } else {
            // Create default wallet
            const defaultWallet = { points: 0, coupons: [] };
            await setDoc(docRef, defaultWallet);
            return defaultWallet;
        }
    },

    // Add points to a user's wallet
    async addPoints(userId: string, amount: number) {
        const docRef = doc(db, 'wallets', userId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            await setDoc(docRef, { points: amount, coupons: [] });
        } else {
            await updateDoc(docRef, {
                points: increment(amount)
            });
        }
    },

    // Add a coupon to the user's wallet
    async addCoupon(userId: string, coupon: any) {
        const docRef = doc(db, 'wallets', userId);
        const docSnap = await getDoc(docRef);
        
        const couponWithDate = {
            ...coupon,
            wonAt: new Date().toISOString(),
            status: 'available' // available, used, expired
        };

        if (!docSnap.exists()) {
            await setDoc(docRef, { points: 0, coupons: [couponWithDate] });
        } else {
            const data = docSnap.data();
            const existingCoupons = data.coupons || [];
            await updateDoc(docRef, {
                coupons: [couponWithDate, ...existingCoupons]
            });
        }
    },

    // Deduct points from a user's wallet
    async deductPoints(userId: string, amount: number) {
        const docRef = doc(db, 'wallets', userId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists() || docSnap.data().points < amount) {
            throw new Error("Puntos insuficientes");
        }
        
        await updateDoc(docRef, {
            points: increment(-amount)
        });
    },

    // Check if the user can spin the wheel today
    async canSpinToday(userId: string): Promise<boolean> {
        const wallet = await this.getWallet(userId);
        if (!wallet.lastSpinDate) return true;
        
        const lastSpin = wallet.lastSpinDate.toDate ? wallet.lastSpinDate.toDate() : new Date(wallet.lastSpinDate);
        const today = new Date();
        
        return lastSpin.getDate() !== today.getDate() || 
               lastSpin.getMonth() !== today.getMonth() || 
               lastSpin.getFullYear() !== today.getFullYear();
    },

    // Record that the user spun the wheel
    async recordSpin(userId: string) {
        const docRef = doc(db, 'wallets', userId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            await setDoc(docRef, { points: 0, coupons: [], lastSpinDate: serverTimestamp() });
        } else {
            await updateDoc(docRef, {
                lastSpinDate: serverTimestamp()
            });
        }
    }
};
