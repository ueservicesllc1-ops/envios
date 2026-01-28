import React, { useState } from 'react';
import { Gift, X, Sparkles, Ticket, Star, Trophy, Award } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { couponService } from '../services/couponService';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

interface RewardGameModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RewardGameModal: React.FC<RewardGameModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [selectedBox, setSelectedBox] = useState<number | null>(null);
    const [isRevealing, setIsRevealing] = useState(false);
    const [prize, setPrize] = useState<100 | 50 | 20 | null>(null);
    const [showPrize, setShowPrize] = useState(false);
    const [coupons, setCoupons] = useState<any[]>([]);
    const [hoveredBox, setHoveredBox] = useState<number | null>(null);

    // Determinar premio aleatorio
    const getRandomPrize = (): 100 | 50 | 20 => {
        const random = Math.random();
        if (random < 0.15) return 100; // 15% probabilidad
        if (random < 0.4) return 50; // 25% probabilidad
        return 20; // 60% probabilidad
    };

    // Confetti effect cuando gana
    const fireConfetti = () => {
        const duration = 3000;
        const end = Date.now() + duration;

        const colors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#95E1D3'];

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    };

    const handleBoxClick = async (boxIndex: number) => {
        if (selectedBox !== null || !user) return;

        setSelectedBox(boxIndex);
        setIsRevealing(true);

        // Simular suspense con animación
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Determinar premio
        const wonPrize = getRandomPrize();
        setPrize(wonPrize);

        // Crear cupones
        try {
            const createdCoupons = await couponService.createRewardCoupons(user.uid, wonPrize);
            setCoupons(createdCoupons);

            // Confetti espectacular
            fireConfetti();

            setShowPrize(true);
            toast.success(`Felicidades! Ganaste $${wonPrize} en cupones`, {
                duration: 5000
            });
        } catch (error) {
            console.error('Error creating coupons:', error);
            toast.error('Error al crear cupones');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-2xl max-w-3xl w-full relative overflow-hidden transform transition-all animate-scaleIn">
                {/* Efectos de fondo animados */}
                <div className="absolute inset-0 overflow-hidden opacity-20">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-blue-400 rounded-full filter blur-3xl animate-float"></div>
                    <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-400 rounded-full filter blur-3xl animate-float-delayed"></div>

                    {/* Estrellas brillantes */}
                    {[...Array(15)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-twinkle"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`
                            }}
                        >
                            <Star className="h-3 w-3 text-yellow-300 fill-current" />
                        </div>
                    ))}
                </div>

                {/* Contenido */}
                <div className="relative p-4 md:p-12">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 md:mb-8">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Trophy className="h-10 w-10 md:h-12 md:w-12 text-yellow-400 animate-pulse" />
                                <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-yellow-300 absolute -top-1 -right-1 animate-spin-slow" />
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-4xl font-black text-white drop-shadow-lg leading-tight">
                                    ¡Regalo de Bienvenida!
                                </h2>
                                <p className="text-yellow-300 text-xs md:text-sm font-medium mt-1 flex items-center gap-2">
                                    <Award className="h-3 w-3 md:h-4 md:w-4" />
                                    Gana hasta $100 en cupones
                                </p>
                            </div>
                        </div>
                        {!showPrize && (
                            <button
                                onClick={onClose}
                                className="text-white hover:bg-white hover:bg-opacity-20 p-1 md:p-2 rounded-full transition-all hover:rotate-90 duration-300"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        )}
                    </div>

                    {!showPrize ? (
                        <>
                            {/* Instrucciones */}
                            <div className="bg-white bg-opacity-15 backdrop-blur-xl rounded-2xl p-4 mb-6 md:p-6 md:mb-10 border border-white border-opacity-30 shadow-xl">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Gift className="h-5 w-5 md:h-6 md:w-6 text-yellow-300" />
                                    <p className="text-white text-lg md:text-xl font-bold text-center">
                                        Elige una caja de regalo
                                    </p>
                                </div>
                                <p className="text-white text-xs md:text-sm opacity-90 text-center">
                                    Recibirás cupones de descuento divididos estratégicamente
                                </p>
                                <p className="text-yellow-300 font-bold text-center mt-2 text-xs md:text-sm">
                                    Oportunidad única de bienvenida
                                </p>
                            </div>

                            {/* Cajas de regalo */}
                            <div className="grid grid-cols-3 gap-4 mb-6 md:gap-8 md:mb-10">
                                {[0, 1, 2].map((boxIndex) => (
                                    <button
                                        key={boxIndex}
                                        onClick={() => handleBoxClick(boxIndex)}
                                        onMouseEnter={() => setHoveredBox(boxIndex)}
                                        onMouseLeave={() => setHoveredBox(null)}
                                        disabled={selectedBox !== null}
                                        className={`aspect-square rounded-2xl md:rounded-3xl flex flex-col items-center justify-center transition-all duration-500 transform relative ${selectedBox === null
                                            ? 'hover:scale-125 cursor-pointer bg-gradient-to-br from-amber-400 to-orange-600 hover:shadow-2xl hover:shadow-orange-500/50'
                                            : selectedBox === boxIndex
                                                ? 'scale-125 bg-gradient-to-br from-emerald-400 to-green-600 animate-wiggle shadow-2xl shadow-green-500/50'
                                                : 'scale-75 opacity-30 bg-gray-600'
                                            } ${isRevealing && selectedBox === boxIndex ? 'animate-shake' : ''}`}
                                    >
                                        {/* Brillo en hover */}
                                        {hoveredBox === boxIndex && selectedBox === null && (
                                            <div className="absolute inset-0 bg-white opacity-20 rounded-2xl md:rounded-3xl animate-pulse"></div>
                                        )}

                                        <Gift className={`h-12 w-12 md:h-24 md:w-24 text-white drop-shadow-xl ${selectedBox === boxIndex && isRevealing ? 'animate-bounce' : ''
                                            } ${hoveredBox === boxIndex && selectedBox === null ? 'animate-wiggle' : ''}`} />

                                        {selectedBox === null && (
                                            <div className="mt-1 md:mt-3 text-white font-bold text-xs md:text-lg">
                                                Caja {boxIndex + 1}
                                            </div>
                                        )}

                                        {/* Sparkles alrededor */}
                                        {(hoveredBox === boxIndex || selectedBox === boxIndex) && selectedBox === null && (
                                            <>
                                                <div className="absolute -top-2 -left-2 animate-ping">
                                                    <Sparkles className="h-4 w-4 md:h-6 md:w-6 text-yellow-300" />
                                                </div>
                                                <div className="absolute -top-2 -right-2 animate-ping delay-100">
                                                    <Sparkles className="h-4 w-4 md:h-6 md:w-6 text-amber-300" />
                                                </div>
                                                <div className="absolute -bottom-2 -left-2 animate-ping delay-200">
                                                    <Sparkles className="h-4 w-4 md:h-6 md:w-6 text-orange-300" />
                                                </div>
                                                <div className="absolute -bottom-2 -right-2 animate-ping delay-300">
                                                    <Sparkles className="h-4 w-4 md:h-6 md:w-6 text-yellow-200" />
                                                </div>
                                            </>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {isRevealing && (
                                <div className="text-center animate-bounce">
                                    <div className="inline-flex items-center gap-3 bg-white bg-opacity-30 backdrop-blur-md px-8 py-4 rounded-full shadow-xl">
                                        <div className="animate-spin rounded-full h-6 w-6 border-4 border-white border-t-transparent"></div>
                                        <span className="text-white font-bold text-lg">Abriendo tu sorpresa...</span>
                                        <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Mostrar premio */}
                            <div className="text-center space-y-8">
                                <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 rounded-3xl p-10 animate-scaleIn shadow-2xl border-4 border-yellow-300">
                                    <div className="relative inline-block">
                                        <div className="text-8xl font-black text-white mb-4 animate-bounce drop-shadow-2xl">
                                            ${prize}
                                        </div>
                                        {/* Efectos alrededor del número */}
                                        <Trophy className="absolute -top-6 left-1/2 transform -translate-x-1/2 h-12 w-12 text-yellow-200 animate-pulse" />
                                        <Star className="absolute -bottom-2 -left-2 h-8 w-8 text-yellow-200 fill-current animate-ping" />
                                        <Star className="absolute -bottom-2 -right-2 h-8 w-8 text-yellow-200 fill-current animate-ping delay-300" />
                                    </div>
                                    <div className="flex items-center justify-center gap-2 mb-3">
                                        <Award className="h-8 w-8 text-white" />
                                        <p className="text-3xl font-bold text-white animate-pulse">
                                            FELICIDADES
                                        </p>
                                        <Award className="h-8 w-8 text-white" />
                                    </div>
                                    <p className="text-white text-lg font-medium">
                                        Has ganado cupones por un valor de ${prize}
                                    </p>
                                </div>

                                {/* Lista de cupones */}
                                <div className="bg-white bg-opacity-15 backdrop-blur-xl rounded-2xl p-8 max-h-80 overflow-y-auto border border-white border-opacity-20">
                                    <div className="flex items-center justify-center gap-2 mb-6">
                                        <Ticket className="h-6 w-6 text-yellow-300" />
                                        <h3 className="text-white font-bold text-xl">Tus Cupones de Descuento</h3>
                                        <Ticket className="h-6 w-6 text-yellow-300" />
                                    </div>
                                    <div className="space-y-4">
                                        {coupons.map((coupon, index) => (
                                            <div
                                                key={coupon.id}
                                                className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 flex items-center justify-between animate-slideInLeft hover:scale-105 transition-transform shadow-lg border border-white border-opacity-20"
                                                style={{ animationDelay: `${index * 150}ms` }}
                                            >
                                                <div className="text-left">
                                                    <p className="text-white font-black text-2xl">${coupon.amount} OFF</p>
                                                    <p className="text-yellow-200 text-sm font-medium mt-1 flex items-center gap-1">
                                                        <Ticket className="h-4 w-4" />
                                                        Compra mínima: ${coupon.minPurchase}
                                                    </p>
                                                </div>
                                                <div className="bg-amber-400 text-gray-900 px-4 py-2 rounded-xl text-sm font-mono font-black shadow-md">
                                                    {coupon.code}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-center gap-2 mt-6">
                                        <Sparkles className="h-4 w-4 text-yellow-300" />
                                        <p className="text-yellow-200 text-center text-sm font-medium animate-pulse">
                                            Los cupones se aplicarán automáticamente en el checkout
                                        </p>
                                        <Sparkles className="h-4 w-4 text-yellow-300" />
                                    </div>
                                </div>

                                {/* Botón cerrar */}
                                <button
                                    onClick={onClose}
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-lg py-5 rounded-2xl hover:from-amber-600 hover:to-orange-700 transition-all transform hover:scale-105 shadow-2xl hover:shadow-orange-500/50 flex items-center justify-center gap-3"
                                >
                                    <Gift className="h-6 w-6" />
                                    Empezar a Comprar
                                    <Sparkles className="h-6 w-6" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.3); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.4s ease-out forwards;
        }
        .animate-wiggle {
          animation: wiggle 0.5s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 4s linear infinite;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 8s ease-in-out infinite;
        }
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-500 { animation-delay: 0.5s; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default RewardGameModal;
