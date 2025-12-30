import React, { useEffect, useState } from 'react';
import { Ticket, Check, X, AlertCircle } from 'lucide-react';
import { couponService, type Coupon } from '../services/couponService';
import { useAuth } from '../hooks/useAuth';

interface CouponSelectorProps {
    subtotal: number;
    onCouponApplied: (coupon: Coupon | null) => void;
    appliedCoupon: Coupon | null;
}

const CouponSelector: React.FC<CouponSelectorProps> = ({ subtotal, onCouponApplied, appliedCoupon }) => {
    const { user } = useAuth();
    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCoupons = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const coupons = await couponService.getApplicableCoupons(user.uid, subtotal);
                setAvailableCoupons(coupons);
            } catch (error) {
                console.error('Error loading coupons:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCoupons();
    }, [user, subtotal]);

    const handleApplyCoupon = (coupon: Coupon) => {
        if (appliedCoupon?.id === coupon.id) {
            onCouponApplied(null);
        } else {
            onCouponApplied(coupon);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg p-4 border border-gray-200 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-sm font-medium">Inicia sesión para ver tus cupones</p>
                </div>
            </div>
        );
    }

    if (availableCoupons.length === 0) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600">
                    <Ticket className="h-5 w-5" />
                    <p className="text-sm">No tienes cupones disponibles para este monto</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3">
                <div className="flex items-center gap-2 text-white">
                    <Ticket className="h-5 w-5" />
                    <h3 className="font-bold">Cupones Disponibles</h3>
                    <span className="bg-white text-indigo-600 px-2 py-0.5 rounded-full text-xs font-bold ml-auto">
                        {availableCoupons.length}
                    </span>
                </div>
            </div>

            <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
                {availableCoupons.map((coupon) => {
                    const isApplied = appliedCoupon?.id === coupon.id;
                    const canApply = subtotal >= coupon.minPurchase;

                    return (
                        <button
                            key={coupon.id}
                            onClick={() => canApply && handleApplyCoupon(coupon)}
                            disabled={!canApply}
                            className={`w-full transition-all ${isApplied
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg scale-105'
                                    : canApply
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg hover:scale-105'
                                        : 'bg-gray-300 cursor-not-allowed opacity-60'
                                } rounded-xl p-4 text-left`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-white font-black text-xl">${coupon.amount} OFF</p>
                                        {isApplied && (
                                            <div className="bg-white text-green-600 rounded-full p-1">
                                                <Check className="h-4 w-4" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-white text-xs opacity-90 mt-1">
                                        Compra mínima: ${coupon.minPurchase}
                                    </p>
                                    {!canApply && (
                                        <p className="text-red-200 text-xs mt-1 flex items-center gap-1">
                                            <X className="h-3 w-3" />
                                            Necesitas ${(coupon.minPurchase - subtotal).toFixed(2)} más
                                        </p>
                                    )}
                                </div>
                                <div className="bg-amber-400 text-gray-900 px-3 py-1 rounded-lg text-xs font-mono font-bold">
                                    {coupon.code}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {appliedCoupon && (
                <div className="bg-green-50 border-t border-green-200 p-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-700">
                            <Check className="h-5 w-5" />
                            <span className="text-sm font-medium">
                                Cupón aplicado: ${appliedCoupon.amount} de descuento
                            </span>
                        </div>
                        <button
                            onClick={() => onCouponApplied(null)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                            Remover
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouponSelector;
