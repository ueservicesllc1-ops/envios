import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, HelpCircle, CheckCircle } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import toast from 'react-hot-toast';

// Mock variants (In a real app, these come from Firebase Product Data)
const MOCK_VARIANTS = [
    { id: 'v1', color: 'Orange', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', active: true },
    { id: 'v2', color: 'Black', image: 'https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=400&q=80', active: false },
    { id: 'v3', color: 'White', image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&q=80', active: false },
    { id: 'v4', color: 'Blue', image: 'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=400&q=80', active: false }
];

export default function VibeAR() {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const [activeVariant, setActiveVariant] = useState(MOCK_VARIANTS[0]);
    const [gridTransform, setGridTransform] = useState('rotateX(60deg)');
    const [flash, setFlash] = useState(false);

    // Start Camera
    useEffect(() => {
        let stream: MediaStream | null = null;
        async function startCamera() {
            try {
                // Try facingMode environment (rear camera on mobile)
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                toast.error('No se pudo acceder a la cámara');
            }
        }
        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Grid Tracking Effect (Mouse Movement Simulation)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const moveX = (e.clientX - window.innerWidth / 2) / 50;
            const moveY = (e.clientY - window.innerHeight / 2) / 50;
            setGridTransform(`rotateX(60deg) translateX(${moveX}px) translateY(${moveY}px)`);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const capturePhoto = () => {
        setFlash(true);
        if ('vibrate' in navigator) navigator.vibrate(50);
        setTimeout(() => {
            setFlash(false);
            toast.success('¡Foto guardada en tu galería!');
        }, 300);
    };

    const handleAddToCart = () => {
        // Mock product object since we didn't fetch the real one yet
        const productToAdd = {
            id: productId || 'ar-product',
            name: `Zapatos ${activeVariant.color}`,
            price: 189.00,
            imageUrl: activeVariant.image,
            quantity: 1
        };
        addToCart(productToAdd as any, 'product');
        toast.success('Añadido al carrito desde AR');
        // Vibrate if possible
        if ('vibrate' in navigator) navigator.vibrate(100);
    };

    return (
        <div className="fixed inset-0 bg-black overflow-hidden select-none z-[100] font-sans text-white">
            {/* Flash Effect */}
            {flash && <div className="absolute inset-0 bg-white z-[200] animate-pulse"></div>}

            {/* Live Camera Feed */}
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover z-0"
            />
            
            {/* If camera fails, fallback dark gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60 z-0 pointer-events-none"></div>

            {/* AR Tracking Visuals */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                {/* Floor Grid */}
                <div 
                    className="absolute bottom-0 left-0 right-0 h-1/2 w-full opacity-30 border-t border-white/20"
                    style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.2) 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                        perspective: '1000px',
                        transform: gridTransform,
                        transition: 'transform 0.1s ease-out'
                    }}
                ></div>

                {/* Target Reticle */}
                <div className="relative w-48 h-48 border border-white/20 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#ea580c] rounded-full animate-ping"></div>
                    {/* Scanning Line */}
                    <div className="absolute top-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#ea580c]/50 to-transparent animate-[bounce_3s_infinite]"></div>
                </div>

                {/* Virtual Product Overlay */}
                <div className="absolute transform translate-y-32 scale-125 opacity-90 drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] animate-[float_4s_ease-in-out_infinite]">
                    <img src={activeVariant.image} className="w-64 h-auto object-contain drop-shadow-xl filter contrast-125 saturate-150" alt="AR Overlay" />
                </div>
            </div>

            {/* UI Overlay Layer */}
            <div className="relative z-20 flex flex-col h-full pointer-events-none">
                
                {/* Top Header */}
                <header className="w-full bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center px-4 h-20 pt-safe pointer-events-auto">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md active:scale-95 transition-transform border border-white/10">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-lg text-[#ffb693] tracking-wide">ShopVibe</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 animate-pulse">AR Engine Active</span>
                    </div>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md active:scale-95 transition-transform border border-white/10">
                        <HelpCircle className="w-5 h-5 text-white/80" />
                    </button>
                </header>

                {/* Floating Badges */}
                <div className="mt-12 px-4 flex flex-col gap-3 items-end pointer-events-auto">
                    {/* Price Badge */}
                    <div className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-xl p-3 flex flex-col items-end shadow-lg animate-slide-up" style={{animationDelay: '0.1s'}}>
                        <span className="font-bold text-[10px] text-white/60 uppercase tracking-wider">Current Price</span>
                        <span className="font-black text-xl text-[#ea580c]">$189.00</span>
                    </div>
                    {/* Fit Score Badge */}
                    <div className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-xl p-3 flex flex-col items-end shadow-lg animate-slide-up" style={{animationDelay: '0.2s'}}>
                        <span className="font-bold text-[10px] text-white/60 uppercase tracking-wider">Fit Score</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="font-bold text-white text-sm">98% Match</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Controls */}
                <div className="mt-auto pb-8 pt-12 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-auto">
                    
                    {/* Capture Button */}
                    <div className="flex justify-center mb-6">
                        <button onClick={capturePhoto} className="relative group">
                            <div className="w-16 h-16 rounded-full border-[3px] border-white/40 flex items-center justify-center active:scale-90 transition-transform">
                                <div className="w-[52px] h-[52px] rounded-full bg-white group-active:bg-gray-300 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.5)]"></div>
                            </div>
                        </button>
                    </div>

                    {/* Variants Carousel */}
                    <div className="px-4 mb-6">
                        <div className="flex items-center gap-3 overflow-x-auto pb-4 hide-scrollbar">
                            {MOCK_VARIANTS.map(variant => {
                                const isActive = activeVariant.id === variant.id;
                                return (
                                    <button 
                                        key={variant.id}
                                        onClick={() => setActiveVariant(variant)}
                                        className={`flex-shrink-0 w-20 h-20 rounded-2xl p-1.5 transition-all duration-300 ${isActive ? 'border-2 border-[#ea580c] bg-white/10 backdrop-blur-md scale-105' : 'border border-white/20 bg-black/50 opacity-60 hover:opacity-100 backdrop-blur-sm'}`}
                                    >
                                        <div className="w-full h-full bg-white rounded-xl overflow-hidden relative">
                                            <img src={variant.image} alt={variant.color} className="w-full h-full object-cover" />
                                            {isActive && (
                                                <div className="absolute bottom-0 w-full bg-[#ea580c] py-0.5 text-center">
                                                    <span className="text-[9px] font-bold text-white tracking-wider">ACTIVE</span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Add to Cart CTA */}
                    <div className="px-4">
                        <button 
                            onClick={handleAddToCart}
                            className="w-full bg-gradient-to-r from-[#ff6b00] to-[#e32322] text-white font-black text-lg py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-[0_8px_30px_rgba(255,107,0,0.4)]"
                        >
                            <ShoppingCart className="w-6 h-6" />
                            AÑADIR AL CARRITO
                        </button>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="fixed bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                    <span className="font-bold text-[9px] text-white/50 tracking-[0.2em] uppercase">Stability High • tracking locked</span>
                </div>
            </div>
            
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) scale(1.25); }
                    50% { transform: translateY(-15px) scale(1.25); }
                }
            `}</style>
        </div>
    );
}
