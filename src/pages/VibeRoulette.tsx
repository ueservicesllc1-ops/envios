import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Coins, Tag, Truck, RotateCcw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { walletService } from '../services/walletService';
import toast from 'react-hot-toast';

const PRIZES = [
    { id: 1, name: '500 Vibe', type: 'points', value: 500, color: '#FF6B00', icon: Coins },
    { id: 2, name: '10% OFF', type: 'coupon', value: 10, color: '#E32322', icon: Tag },
    { id: 3, name: 'Envío Gratis', type: 'shipping', value: 0, color: '#00B050', icon: Truck },
    { id: 4, name: 'Caja Misteriosa', type: 'box', value: 0, color: '#FF6B00', icon: Gift },
    { id: 5, name: '5% OFF', type: 'coupon', value: 5, color: '#E32322', icon: Tag },
    { id: 6, name: '100 Vibe', type: 'points', value: 100, color: '#00B050', icon: Coins },
];

export default function VibeRoulette() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [points, setPoints] = useState(0);
    const [canSpin, setCanSpin] = useState(false);
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [wonPrize, setWonPrize] = useState<any>(null);

    useEffect(() => {
        async function loadData() {
            if (user) {
                const wallet = await walletService.getWallet(user.uid);
                setPoints(wallet.points);
                const can = await walletService.canSpinToday(user.uid);
                setCanSpin(can);
            }
        }
        loadData();
    }, [user]);

    const handleSpin = async () => {
        if (!user) {
            toast.error('Debes iniciar sesión para girar');
            navigate('/login');
            return;
        }
        if (!canSpin) {
            toast.error('Ya utilizaste tu giro diario. Vuelve mañana.');
            return;
        }

        setIsSpinning(true);

        // Pick a random prize
        const prizeIndex = Math.floor(Math.random() * PRIZES.length);
        const prize = PRIZES[prizeIndex];
        
        // Calculate rotation
        // Each segment is 60 degrees. Segment 1 starts at top.
        // We need to rotate the wheel backwards so the chosen segment lands on top (0 degrees).
        const segmentAngle = 60;
        // The wheel starts with Segment 1 at 0 deg, Segment 2 at 60 deg, etc.
        // If we want Segment 2 (index 1) at top, we rotate -60 (or 300).
        // Plus 5 full rotations (1800 deg).
        const targetRotation = 1800 - (prizeIndex * segmentAngle);
        
        // Add a random offset within the segment (-20 to +20 degrees)
        const offset = Math.floor(Math.random() * 40) - 20;
        const finalRotation = rotation + 1800 + targetRotation + offset;

        setRotation(finalRotation);

        setTimeout(async () => {
            setWonPrize(prize);
            setShowModal(true);
            setIsSpinning(false);
            
            // Record spin
            await walletService.recordSpin(user.uid);
            setCanSpin(false);

            // Give prize
            if (prize.type === 'points') {
                await walletService.addPoints(user.uid, prize.value);
                setPoints(prev => prev + prize.value);
            } else if (prize.type === 'coupon' || prize.type === 'shipping') {
                await walletService.addCoupon(user.uid, prize);
            }
        }, 4000);
    };

    return (
        <div className="min-h-screen bg-[#fcf9f8] flex flex-col font-sans overflow-hidden pb-20">
            {/* Header */}
            <header className="w-full top-0 z-50 sticky px-4 py-3 flex justify-between items-center bg-[#fcf9f8]">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full">
                        <ArrowLeft className="w-6 h-6 text-[#a04100]" />
                    </button>
                    <h1 className="font-bold text-2xl text-[#a04100]">ShopVibe</h1>
                </div>
                <div className="flex items-center gap-2 bg-[#ffdbcc] px-4 py-1.5 rounded-full border border-[#ff6b00]">
                    <Coins className="w-5 h-5 text-[#a04100]" />
                    <span className="font-bold text-sm text-[#351000]">{points} Puntos</span>
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center py-6 px-4 gap-6">
                <div className="text-center space-y-2">
                    <h2 className="font-bold text-2xl text-[#1c1b1b]">¡Prueba tu Suerte!</h2>
                    <div className="inline-flex items-center gap-2 px-4 py-1 bg-gray-200 rounded-full">
                        <span className="font-bold text-sm text-gray-700">
                            {canSpin ? '1 giro disponible hoy' : 'Vuelve mañana para girar'}
                        </span>
                    </div>
                </div>

                {/* WHEEL CONTAINER */}
                <div className="relative w-full max-w-[340px] aspect-square flex items-center justify-center mt-4">
                    {/* Outer Glow */}
                    <div className="absolute inset-0 bg-[#ff6b00]/20 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
                    
                    {/* Indicator Needle */}
                    <div className="absolute -top-4 z-30 flex flex-col items-center">
                        <div className="w-8 h-8 bg-[#ff6b00] rotate-45 rounded-sm shadow-md"></div>
                        <div className="w-2 h-4 bg-[#a04100] rounded-b-full -mt-2"></div>
                    </div>

                    {/* Wheel Frame */}
                    <div className="relative w-full h-full rounded-full border-[8px] border-[#ff6b00] bg-white shadow-2xl z-10 flex items-center justify-center overflow-hidden">
                        {/* Wheel Segments */}
                        <div 
                            className="absolute inset-0"
                            style={{ 
                                transform: `rotate(${rotation}deg)`,
                                transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)' : 'none'
                            }}
                        >
                            <div className="absolute inset-0 flex items-center justify-center">
                                {PRIZES.map((prize, index) => (
                                    <div 
                                        key={prize.id}
                                        className="absolute top-0 w-full h-1/2 flex justify-center origin-bottom"
                                        style={{ transform: `rotate(${index * 60}deg)` }}
                                    >
                                        <div 
                                            className="w-full h-full border-r-2 border-white flex flex-col items-center pt-8 text-white"
                                            style={{ backgroundColor: prize.color }}
                                        >
                                            <span className="font-bold text-[10px] uppercase">{prize.name}</span>
                                            <prize.icon className="w-6 h-6 mt-1" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Center Cap */}
                        <div className="relative z-20 w-16 h-16 rounded-full bg-white border-4 border-[#ff6b00] shadow-xl flex items-center justify-center">
                            <RotateCcw className="w-8 h-8 text-[#a04100]" />
                        </div>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="w-full flex flex-col gap-4 items-center mt-6">
                    <button 
                        onClick={handleSpin}
                        disabled={isSpinning || !canSpin}
                        className={`w-full max-w-[280px] font-bold py-4 rounded-xl shadow-lg transition-transform uppercase tracking-wider flex items-center justify-center gap-2 ${
                            canSpin ? 'bg-[#ff6b00] text-white active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        <span>{isSpinning ? 'Girando...' : 'Girar Gratis'}</span>
                    </button>
                    {!canSpin && <p className="text-sm text-gray-500">Próximo giro gratis en 24h</p>}
                </div>

                {/* Social Proof Ticker */}
                <div className="w-full bg-gray-200 overflow-hidden py-2 rounded-lg mt-8 relative">
                    <div className="flex animate-[scroll_20s_linear_infinite] whitespace-nowrap gap-8 items-center px-4">
                        <div className="flex items-center gap-2">
                            <span className="font-bold">@carla_m</span>
                            <span className="text-gray-600 text-sm">ganó Caja Misteriosa</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold">@javi_88</span>
                            <span className="text-gray-600 text-sm">ganó 500 Vibe Points</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold">@mariana.l</span>
                            <span className="text-gray-600 text-sm">ganó 10% Descuento</span>
                        </div>
                        {/* Duplicate for seamless loop */}
                        <div className="flex items-center gap-2">
                            <span className="font-bold">@carla_m</span>
                            <span className="text-gray-600 text-sm">ganó Caja Misteriosa</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal for Result */}
            {showModal && wonPrize && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-[320px] p-8 flex flex-col items-center text-center gap-4 relative animate-slide-up">
                        <div className="w-20 h-20 rounded-full bg-[#ff6b00]/20 flex items-center justify-center">
                            <wonPrize.icon className="w-10 h-10 text-[#ff6b00] animate-bounce" />
                        </div>
                        <h3 className="font-bold text-2xl text-[#a04100]">¡Felicidades!</h3>
                        <p className="text-gray-700">
                            Has ganado <span className="font-bold">{wonPrize.name}</span>. 
                            {wonPrize.type === 'points' ? ' Se ha añadido a tu cuenta.' : ' Revisa tus cupones.'}
                        </p>
                        <button 
                            className="w-full bg-[#a04100] text-white font-bold py-3 mt-4 rounded-lg active:scale-95 transition-transform"
                            onClick={() => setShowModal(false)}
                        >
                            ¡Genial!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
