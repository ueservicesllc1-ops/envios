import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    updateDoc,
    doc,
    Timestamp,
    orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Coupon {
    id: string;
    userId: string;
    code: string;
    amount: number; // Monto del descuento en dólares
    minPurchase: number; // Compra mínima requerida
    used: boolean;
    usedAt?: Timestamp;
    orderId?: string;
    createdAt: Timestamp;
    expiresAt: Timestamp;
    type: 'reward' | 'promotional'; // reward = del juego, promotional = otros
}

export interface RewardPrize {
    amount: 100 | 50 | 20;
    coupons: {
        amount: number;
        minPurchase: number;
    }[];
}

// Configuración de premios
const REWARD_PRIZES: RewardPrize[] = [
    {
        amount: 100,
        coupons: [
            { amount: 5, minPurchase: 50 },
            { amount: 10, minPurchase: 100 },
            { amount: 15, minPurchase: 150 },
            { amount: 20, minPurchase: 200 },
            { amount: 25, minPurchase: 250 },
            { amount: 25, minPurchase: 250 }
        ]
    },
    {
        amount: 50,
        coupons: [
            { amount: 5, minPurchase: 50 },
            { amount: 10, minPurchase: 100 },
            { amount: 15, minPurchase: 150 },
            { amount: 20, minPurchase: 200 }
        ]
    },
    {
        amount: 20,
        coupons: [
            { amount: 5, minPurchase: 50 },
            { amount: 5, minPurchase: 50 },
            { amount: 10, minPurchase: 100 }
        ]
    }
];

export const couponService = {
    // Generar código único de cupón
    generateCouponCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'CE-'; // Compras Express
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },

    // Crear cupones de recompensa para un usuario
    async createRewardCoupons(userId: string, prizeAmount: 100 | 50 | 20): Promise<Coupon[]> {
        try {
            const prize = REWARD_PRIZES.find(p => p.amount === prizeAmount);
            if (!prize) throw new Error('Prize not found');

            const createdCoupons: Coupon[] = [];
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 días de validez

            for (const couponConfig of prize.coupons) {
                const couponData = {
                    userId,
                    code: this.generateCouponCode(),
                    amount: couponConfig.amount,
                    minPurchase: couponConfig.minPurchase,
                    used: false,
                    createdAt: Timestamp.now(),
                    expiresAt: Timestamp.fromDate(expiresAt),
                    type: 'reward' as const
                };

                const docRef = await addDoc(collection(db, 'coupons'), couponData);
                createdCoupons.push({
                    id: docRef.id,
                    ...couponData
                });
            }

            return createdCoupons;
        } catch (error) {
            console.error('Error creating reward coupons:', error);
            throw error;
        }
    },

    // Obtener cupones disponibles de un usuario
    async getUserCoupons(userId: string): Promise<Coupon[]> {
        try {
            const couponsRef = collection(db, 'coupons');
            const q = query(
                couponsRef,
                where('userId', '==', userId),
                where('used', '==', false)
            );

            const snapshot = await getDocs(q);
            const coupons: Coupon[] = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                // Verificar si no está expirado
                if (data.expiresAt.toDate() > new Date()) {
                    coupons.push({
                        id: doc.id,
                        ...data
                    } as Coupon);
                }
            });

            // Ordenar por fecha de creación descendente en memoria
            return coupons.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        } catch (error) {
            console.error('Error getting user coupons:', error);
            return [];
        }
    },

    // Obtener cupones aplicables para un monto de compra
    async getApplicableCoupons(userId: string, purchaseAmount: number): Promise<Coupon[]> {
        try {
            const allCoupons = await this.getUserCoupons(userId);
            return allCoupons.filter(coupon =>
                coupon.minPurchase <= purchaseAmount
            ).sort((a, b) => b.amount - a.amount); // Mayor descuento primero
        } catch (error) {
            console.error('Error getting applicable coupons:', error);
            return [];
        }
    },

    // Marcar cupón como usado
    async useCoupon(couponId: string, orderId: string): Promise<void> {
        try {
            const couponRef = doc(db, 'coupons', couponId);
            await updateDoc(couponRef, {
                used: true,
                usedAt: Timestamp.now(),
                orderId
            });
        } catch (error) {
            console.error('Error using coupon:', error);
            throw error;
        }
    },

    // Obtener total de cupones disponibles (valor en dólares)
    async getUserCouponsValue(userId: string): Promise<number> {
        try {
            const coupons = await this.getUserCoupons(userId);
            return coupons.reduce((total, coupon) => total + coupon.amount, 0);
        } catch (error) {
            console.error('Error getting coupons value:', error);
            return 0;
        }
    },

    // Verificar si el usuario ya jugó alguna vez
    async hasPlayedEver(userId: string): Promise<boolean> {
        try {
            const couponsRef = collection(db, 'coupons');
            const q = query(
                couponsRef,
                where('userId', '==', userId),
                where('type', '==', 'reward')
            );

            const snapshot = await getDocs(q);
            return !snapshot.empty;
        } catch (error) {
            console.error('Error checking if played:', error);
            return false;
        }
    },

    // Configuración de premios disponibles
    getPrizeConfig: (prizeAmount: 100 | 50 | 20) => {
        return REWARD_PRIZES.find(p => p.amount === prizeAmount);
    }
};
