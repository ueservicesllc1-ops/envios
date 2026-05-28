import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Star, Lock, Truck, Gift, Headphones } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { walletService } from '../services/walletService';
import toast from 'react-hot-toast';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const REWARDS_CATALOG = [
    {
        id: 'r_coupon_20',
        name: 'Cupón 20% Descuento',
        cost: 500,
        type: 'coupon',
        value: 20,
        image: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400&q=80',
        popular: true
    },
    {
        id: 'r_shipping_1mo',
        name: 'Envío Gratis Ilimitado (1 Mes)',
        cost: 800,
        type: 'shipping',
        value: 0,
        icon: Truck,
        color: '#00b050'
    },
    {
        id: 'r_gift_10',
        name: 'Tarjeta Regalo $10',
        cost: 1000,
        type: 'giftcard',
        value: 10,
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80'
    },
    {
        id: 'r_mystery',
        name: 'Caja Sorpresa Premium',
        cost: 1200,
        type: 'mystery',
        value: 0,
        image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80'
    },
    {
        id: 'r_earbuds',
        name: 'Earbuds ShopVibe Pro',
        cost: 5000,
        type: 'physical',
        value: 0,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80',
        lockedMsg: 'Nivel 5 Requerido'
    }
];

export default function VibeRedeem() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [points, setPoints] = useState(0);
    const [activeFilter, setActiveFilter] = useState('Todos');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const unsub = onSnapshot(doc(db, 'wallets', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setPoints(docSnap.data().points || 0);
            }
        });

        return () => unsub();
    }, [user, navigate]);

    const handleRedeem = async (reward: any) => {
        if (points < reward.cost) {
            toast.error('No tienes suficientes Vibe Points.');
            return;
        }

        const confirm = window.confirm(`¿Seguro que deseas canjear ${reward.cost} puntos por ${reward.name}?`);
        if (!confirm) return;

        try {
            // Deduct points
            await walletService.deductPoints(user!.uid, reward.cost);
            
            // Generate coupon for user's wallet
            const newCoupon = {
                id: `cpn_${Date.now()}`,
                name: reward.name,
                type: reward.type,
                value: reward.value
            };
            
            await walletService.addCoupon(user!.uid, newCoupon);
            toast.success(`¡Canje exitoso! ${reward.name} añadido a tus cupones.`, { icon: '🎉' });
            
            // Redirect to coupons to see it
            setTimeout(() => {
                navigate('/coupons');
            }, 1500);

        } catch (error) {
            console.error(error);
            toast.error('Error al procesar el canje.');
        }
    };

    const filters = ['Todos', 'Cupones', 'Regalos Físicos', 'Envíos'];

    const filteredRewards = REWARDS_CATALOG.filter(r => {
        if (activeFilter === 'Todos') return true;
        if (activeFilter === 'Cupones' && r.type === 'coupon') return true;
        if (activeFilter === 'Regalos Físicos' && (r.type === 'physical' || r.type === 'mystery')) return true;
        if (activeFilter === 'Envíos' && r.type === 'shipping') return true;
        return false;
    });

    return (
        <div className="min-h-screen bg-[#fcf9f8] text-[#1c1b1b] font-sans pb-24">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 h-16 bg-[#fcf9f8] border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors active:scale-95">
                        <ArrowLeft className="w-6 h-6 text-[#a04100]" />
                    </button>
                    <h1 className="font-bold text-xl text-[#a04100]">Canjear Premios</h1>
                </div>
                <button className="p-2 hover:bg-gray-200 rounded-full transition-colors active:scale-95">
                    <Bell className="w-6 h-6 text-[#a04100]" />
                </button>
            </header>

            {/* Points Sticky Banner */}
            <div className="sticky top-16 z-40 bg-[#ff6b00] px-4 py-3 shadow-md flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-white" />
                    <span className="font-bold text-xs uppercase tracking-wider">TU SALDO</span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="font-black text-2xl">{points.toLocaleString()}</span>
                    <span className="text-xs font-medium opacity-80">vibe points</span>
                </div>
            </div>

            <main className="max-w-4xl mx-auto pt-4">
                {/* Filter Tags */}
                <div className="px-4 py-2 flex gap-2 overflow-x-auto hide-scrollbar mb-4">
                    {filters.map(filter => (
                        <button 
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`whitespace-nowrap rounded-full px-4 py-1.5 font-bold text-xs transition-all ${
                                activeFilter === filter 
                                    ? 'bg-[#ff6b00] text-white shadow-sm' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Reward Grid */}
                <section className="px-4 grid grid-cols-2 gap-3 md:gap-4">
                    {filteredRewards.map((reward) => {
                        const isLocked = points < reward.cost || reward.lockedMsg;

                        return (
                            <article 
                                key={reward.id} 
                                className={`bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col group transition-all shadow-sm ${isLocked ? 'opacity-75 grayscale-[0.5]' : 'hover:shadow-lg hover:border-orange-300'}`}
                            >
                                {/* Image / Icon Area */}
                                <div className="relative aspect-square bg-gray-100 flex items-center justify-center">
                                    {isLocked && (
                                        <div className="absolute inset-0 z-10 bg-black/10 backdrop-blur-[2px] flex items-center justify-center">
                                            <div className="bg-gray-900/90 text-white px-3 py-1.5 rounded-full flex items-center gap-1">
                                                <Lock className="w-4 h-4" />
                                                <span className="font-bold text-[10px]">{reward.lockedMsg || 'Puntos insuficientes'}</span>
                                            </div>
                                        </div>
                                    )}

                                    {reward.popular && (
                                        <div className="absolute top-2 right-2 z-10 bg-red-600 text-white px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">
                                            POPULAR
                                        </div>
                                    )}

                                        {reward.image ? (
                                            <img src={reward.image} alt={reward.name} className="w-full h-full object-cover" />
                                        ) : (
                                            reward.icon && React.createElement(reward.icon, { className: "w-16 h-16", style: { color: reward.color } })
                                        )}
                                </div>

                                {/* Details Area */}
                                <div className="p-3 flex flex-col flex-grow">
                                    <h3 className="font-bold text-sm line-clamp-2 mb-1 text-gray-900 leading-tight">{reward.name}</h3>
                                    <div className="mt-auto">
                                        <div className="flex items-center gap-1 text-[#a04100] mb-2">
                                            <Star className="w-4 h-4 fill-[#a04100]" />
                                            <span className="font-black text-lg">{reward.cost.toLocaleString()}</span>
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleRedeem(reward)}
                                            disabled={!!isLocked}
                                            className={`w-full py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                                                isLocked 
                                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                                    : 'bg-[#ff6b00] text-white hover:bg-orange-600 active:scale-95 shadow-md'
                                            }`}
                                        >
                                            {isLocked ? 'Bloqueado' : 'Canjear'}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>
            </main>
        </div>
    );
}
