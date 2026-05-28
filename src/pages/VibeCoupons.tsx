import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Info, Zap, Star, Users, Tv } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { walletService } from '../services/walletService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export default function VibeCoupons() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [coupons, setCoupons] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'disponibles' | 'usados'>('disponibles');
    const [promoCode, setPromoCode] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        // Real-time listener for the user's wallet to get coupons
        const unsub = onSnapshot(doc(db, 'wallets', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCoupons(data.coupons || []);
            }
        });

        return () => unsub();
    }, [user, navigate]);

    const handleApplyCode = () => {
        if (!promoCode.trim()) return;
        toast.error('Código inválido o expirado.');
        setPromoCode('');
    };

    const handleCopy = (codeText: string) => {
        navigator.clipboard.writeText(codeText);
        toast.success('¡Código copiado al portapapeles!');
    };

    const availableCoupons = coupons.filter(c => c.status === 'available');
    const usedCoupons = coupons.filter(c => c.status !== 'available');

    const displayCoupons = activeTab === 'disponibles' ? availableCoupons : usedCoupons;

    return (
        <div className="min-h-screen bg-[#fcf9f8] text-[#1c1b1b] font-sans pb-24">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 h-16 bg-[#fcf9f8] shadow-sm">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors active:scale-95">
                        <ArrowLeft className="w-6 h-6 text-[#a04100]" />
                    </button>
                    <h1 className="font-bold text-xl text-[#ff6b00]">Mis Cupones</h1>
                </div>
                <button onClick={() => navigate('/vibe-market')} className="p-2 hover:bg-gray-200 rounded-full">
                    <ShoppingBag className="w-6 h-6 text-[#a04100]" />
                </button>
            </header>

            <main className="pt-20 px-4 max-w-2xl mx-auto">
                {/* Promo Code Input */}
                <section className="mb-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e2bfb0]">
                        <p className="font-bold text-xs text-[#5a4136] mb-2 uppercase tracking-wider">¿Tienes un código?</p>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={promoCode}
                                onChange={e => setPromoCode(e.target.value)}
                                placeholder="Ingresa tu código aquí"
                                className="flex-grow bg-[#fcf9f8] border border-[#8e7164] px-4 py-2 rounded-lg focus:ring-1 focus:ring-[#ff6b00] focus:border-[#ff6b00] text-sm outline-none uppercase"
                            />
                            <button onClick={handleApplyCode} className="bg-[#ff6b00] text-white px-6 py-2 rounded-lg font-bold text-xs hover:opacity-90 active:scale-95 transition-all">
                                APLICAR
                            </button>
                        </div>
                    </div>
                </section>

                {/* Tab System */}
                <nav className="flex border-b border-[#e2bfb0] mb-4">
                    <button 
                        onClick={() => setActiveTab('disponibles')}
                        className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'disponibles' ? 'border-b-[3px] border-[#ff6b00] text-[#a04100]' : 'text-[#5a4136]'}`}
                    >
                        Disponibles ({availableCoupons.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('usados')}
                        className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'usados' ? 'border-b-[3px] border-[#ff6b00] text-[#a04100]' : 'text-[#5a4136]'}`}
                    >
                        Usados/Vencidos
                    </button>
                </nav>

                {/* Coupons List */}
                <div className="space-y-4">
                    {displayCoupons.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50 grayscale">
                            <Star className="w-16 h-16 mb-4" />
                            <p className="font-bold text-lg text-[#5a4136]">No tienes cupones aquí</p>
                            <p className="text-sm text-[#5a4136]">Participa en la ruleta o en Lives para ganar premios.</p>
                        </div>
                    ) : (
                        displayCoupons.map((coupon, idx) => (
                            <div key={idx} className="relative bg-white border border-[#e2bfb0] rounded-xl overflow-hidden flex items-stretch shadow-sm">
                                {/* Left Side (Discount) */}
                                <div className={`w-24 flex flex-col items-center justify-center p-2 shrink-0 ${coupon.type === 'shipping' ? 'bg-[#00b050]' : 'bg-[#ff6b00]'} text-white`}>
                                    <span className="font-black text-3xl leading-none">
                                        {coupon.type === 'shipping' ? 'ENVÍO' : `${coupon.value}%`}
                                    </span>
                                    <span className="font-bold text-[10px] uppercase mt-1">
                                        {coupon.type === 'shipping' ? 'GRATIS' : 'OFF'}
                                    </span>
                                </div>
                                
                                {/* Right Side (Details) */}
                                <div className="flex-grow p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-[#1c1b1b] leading-tight">{coupon.name}</h3>
                                            <p className="text-sm text-[#5a4136] mt-1">Válido en la tienda Vibe</p>
                                        </div>
                                        {coupon.type === 'shipping' ? (
                                            <Zap className="w-5 h-5 text-[#00b050]" />
                                        ) : (
                                            <Info className="w-5 h-5 text-[#ff6b00]" />
                                        )}
                                    </div>
                                    <div className="mt-4 flex justify-between items-center">
                                        <p className="font-bold text-xs text-[#bb000f]">Premio de la Ruleta</p>
                                        <button 
                                            onClick={() => handleCopy(`VIBE-${coupon.value || 'FREE'}`)}
                                            className="bg-gray-100 text-gray-800 border border-gray-300 px-4 py-1.5 rounded-full font-bold text-[11px] hover:bg-gray-200 active:scale-95 transition-transform"
                                        >
                                            COPIAR CÓDIGO
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Dashed Divider */}
                                <div className="absolute left-24 top-0 bottom-0 w-[1px] border-l-2 border-dashed border-[#e2bfb0]"></div>
                            </div>
                        ))
                    )}
                </div>

                {/* Earn More Section */}
                <section className="mt-10">
                    <h2 className="font-bold text-xl text-[#1c1b1b] mb-4">Gana más beneficios</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Referral Card */}
                        <div 
                            onClick={() => navigate('/vibe-referrals')}
                            className="relative group rounded-xl overflow-hidden h-32 flex items-end p-4 cursor-pointer hover:shadow-lg transition-all"
                        >
                            <div className="absolute inset-0 bg-blue-600 group-hover:scale-105 transition-transform duration-500"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            <div className="relative z-10 text-white flex items-center gap-3 w-full">
                                <Users className="w-10 h-10 shrink-0" />
                                <div>
                                    <p className="font-bold text-xs text-blue-200 uppercase mb-0.5">Refiere amigos</p>
                                    <h4 className="font-bold text-sm leading-tight">Obtén 500 Vibe Points extra</h4>
                                </div>
                            </div>
                        </div>

                        {/* Live Stream Card */}
                        <div 
                            onClick={() => navigate('/vibe')}
                            className="relative group rounded-xl overflow-hidden h-32 flex items-end p-4 cursor-pointer hover:shadow-lg transition-all"
                        >
                            <div className="absolute inset-0 bg-[#e32322] group-hover:scale-105 transition-transform duration-500"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            <div className="relative z-10 text-white flex items-center gap-3 w-full">
                                <Tv className="w-10 h-10 shrink-0" />
                                <div>
                                    <p className="font-bold text-xs text-red-200 uppercase mb-0.5">Mira en Vivo</p>
                                    <h4 className="font-bold text-sm leading-tight">Cupones exclusivos en Live</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
