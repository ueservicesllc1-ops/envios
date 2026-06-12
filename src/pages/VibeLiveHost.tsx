import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, RefreshCw, Sparkles, X, Wifi, Play, StopCircle, MessageCircle, Heart, Share2, Tag, ChevronDown, Check, ShoppingCart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { liveSessionService, LiveSession, LiveChatMessage } from '../services/liveSessionService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export default function VibeLiveHost() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    // Status: 'setup' -> 'countdown' -> 'live' -> 'ended'
    const [streamStatus, setStreamStatus] = useState<'setup' | 'countdown' | 'live' | 'ended'>('setup');
    const [countdown, setCountdown] = useState(3);
    
    // Setup state
    const [title, setTitle] = useState('');
    const [sellerProducts, setSellerProducts] = useState<any[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
    const [isPublic, setIsPublic] = useState(true);
    const [commentsOn, setCommentsOn] = useState(true);
    
    // Live state
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [session, setSession] = useState<LiveSession | null>(null);
    const [messages, setMessages] = useState<LiveChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [showProductsModal, setShowProductsModal] = useState(false);
    
    // Video refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    // 1. Load Seller Products and Start Camera on mount
    useEffect(() => {
        if (!user) {
            toast.error('Debes iniciar sesión');
            navigate('/login');
            return;
        }

        async function init() {
            // Load products from vitrina
            try {
                const q = query(collection(db, 'products'), where('origin', '==', 'local'));
                const snap = await getDocs(q);
                const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // In a real app we filter by sellerId. For demo, we just take local products.
                setSellerProducts(prods.slice(0, 10));
            } catch (error) {
                console.error('Error loading products', error);
            }

            // Start Webcam
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                mediaStreamRef.current = stream;
            } catch (err) {
                console.error("Error accessing camera:", err);
                toast.error("No se pudo acceder a la cámara. Verifica los permisos.");
            }
        }
        init();

        return () => {
            // Cleanup camera on unmount
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [user, navigate]);

    // 2. Chat Auto-scroll
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // 3. Listen to Active Session and Chat
    useEffect(() => {
        if (!sessionId) return;
        
        const unsubSession = liveSessionService.subscribeToSession(sessionId, (s) => {
            setSession(s);
            if (s?.status === 'ended') {
                setStreamStatus('ended');
            }
        });

        const unsubChat = liveSessionService.subscribeToChat(sessionId, (msgs) => {
            setMessages(msgs);
        });

        return () => {
            unsubSession();
            unsubChat();
        };
    }, [sessionId]);


    const handleToggleProduct = (prod: any) => {
        if (selectedProducts.find(p => p.id === prod.id)) {
            setSelectedProducts(selectedProducts.filter(p => p.id !== prod.id));
        } else {
            setSelectedProducts([...selectedProducts, prod]);
        }
    };

    const handleGoLive = async () => {
        if (!title.trim()) {
            toast.error('Ingresa un título para el Live');
            return;
        }
        if (selectedProducts.length === 0) {
            toast.error('Selecciona al menos un producto para vender');
            return;
        }

        // Create Session in DB
        try {
            const sid = await liveSessionService.createSession({
                sellerId: user!.uid,
                sellerName: user!.displayName || 'Vendedor',
                title,
                status: 'preparing',
                featuredProductId: null,
                viewersCount: 0,
                startedAt: new Date(),
                products: selectedProducts
            });
            setSessionId(sid);
            
            // Start countdown UI
            setStreamStatus('countdown');
            let count = 3;
            const timer = setInterval(async () => {
                count--;
                setCountdown(count);
                if (count === 0) {
                    clearInterval(timer);
                    setStreamStatus('live');
                    await liveSessionService.updateSession(sid, { status: 'active', startedAt: new Date() });
                    liveSessionService.sendMessage(sid, 'system', 'Sistema', 'El Live ha comenzado', 'system');
                }
            }, 1000);
            
        } catch (error) {
            console.error(error);
            toast.error('Error al iniciar transmisión');
        }
    };

    const handleEndStream = async () => {
        if (sessionId) {
            await liveSessionService.updateSession(sessionId, { status: 'ended', endedAt: new Date() });
        }
        setStreamStatus('ended');
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !sessionId || !user) return;
        
        await liveSessionService.sendMessage(sessionId, user.uid, user.displayName || 'Host', chatInput.trim(), 'message');
        setChatInput('');
    };

    const handlePinProduct = async (productId: string) => {
        if (!sessionId) return;
        await liveSessionService.updateSession(sessionId, { featuredProductId: productId });
        const prod = selectedProducts.find(p => p.id === productId);
        toast.success(`Fijaste: ${prod?.name}`);
        setShowProductsModal(false);
    };

    // --- RENDERS --- //

    // 1. SETUP SCREEN
    if (streamStatus === 'setup') {
        return (
            <div className="min-h-screen bg-[#fcf9f8] text-[#1c1b1b] flex flex-col font-sans">
                {/* Header */}
                <header className="fixed top-0 w-full z-50 bg-[#fcf9f8] flex justify-between items-center px-4 h-16">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate('/vibe-market')} className="p-2 hover:bg-gray-200 rounded-full">
                            <X className="w-6 h-6 text-[#a04100]" />
                        </button>
                        <h1 className="font-bold text-2xl text-[#a04100]">Go Live</h1>
                    </div>
                </header>

                <main className="flex-grow pt-16 pb-32">
                    {/* Camera Preview */}
                    <section className="relative w-full aspect-[9/16] md:aspect-video bg-black overflow-hidden shadow-lg md:rounded-xl md:max-w-4xl md:mx-auto md:mt-4">
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover transform scale-x-[-1]" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                        
                        <div className="absolute top-4 left-4">
                            <span className="bg-[#ff6b00] text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                <Camera className="w-3 h-3" /> PREVIEW
                            </span>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                            <div className="flex gap-2">
                                <button className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white active:scale-90 transition-transform">
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                                <button className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white active:scale-90 transition-transform">
                                    <Sparkles className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs font-bold border border-white/20 flex items-center gap-2">
                                <Wifi className="w-4 h-4 text-green-400" /> Excelente
                            </div>
                        </div>
                    </section>

                    {/* Controls */}
                    <section className="px-4 mt-6 max-w-4xl mx-auto space-y-6">
                        <div className="space-y-2">
                            <label className="font-bold text-lg">Título del Live</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                                    placeholder="Ej. ¡Venta Flash de Verano! 🔥" 
                                    className="w-full bg-white border border-[#8e7164] px-4 py-4 rounded-xl focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00]"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">{title.length}/60</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="font-bold text-lg">Productos ({selectedProducts.length})</h2>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
                                {sellerProducts.map(prod => {
                                    const isSelected = selectedProducts.find(p => p.id === prod.id);
                                    return (
                                        <div 
                                            key={prod.id} 
                                            onClick={() => handleToggleProduct(prod)}
                                            className={`relative shrink-0 w-32 cursor-pointer border-2 rounded-xl overflow-hidden transition-all snap-start ${isSelected ? 'border-[#ff6b00]' : 'border-gray-200'}`}
                                        >
                                            <div className="aspect-square relative bg-gray-100">
                                                <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 bg-[#ff6b00] text-white p-1 rounded-full">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2 bg-white">
                                                <p className="font-bold text-xs line-clamp-1">{prod.name}</p>
                                                <p className="text-[#bb000f] font-bold text-xs">${(prod.salePrice1 || prod.originalPrice || 0).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                </main>

                <div className="fixed bottom-0 w-full z-50 bg-white shadow-lg border-t border-gray-200 p-4">
                    <div className="max-w-4xl mx-auto">
                        <button 
                            onClick={handleGoLive}
                            className="w-full bg-[#ff6b00] text-white py-4 rounded-xl font-bold text-xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
                        >
                            <Play className="w-6 h-6 fill-white" /> Go Live
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 2. COUNTDOWN OVERLAY
    if (streamStatus === 'countdown') {
        return (
            <div className="fixed inset-0 z-[100] bg-[#a04100] flex flex-col items-center justify-center text-white">
                <div className="relative">
                    <div className="absolute inset-0 bg-white/20 animate-ping rounded-full"></div>
                    <Camera className="w-24 h-24 mb-4 relative z-10" />
                </div>
                <h2 className="text-4xl font-black">Empezando en {countdown}...</h2>
            </div>
        );
    }

    // 3. LIVE & ENDED SCREENS (Using same video background)
    return (
        <div className="fixed inset-0 bg-black flex flex-col">
            {/* Camera Background */}
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] ${streamStatus === 'ended' ? 'blur-xl opacity-40' : ''}`} 
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none"></div>

            {streamStatus === 'live' && session && (
                <>
                    {/* Header Top */}
                    <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex items-center justify-between z-10">
                        <div className="flex items-center gap-2 bg-black/40 rounded-full pr-3 backdrop-blur-sm">
                            <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} className="w-8 h-8 rounded-full border border-white" alt="Avatar" />
                            <div>
                                <p className="text-white text-xs font-bold leading-none">{session.title}</p>
                                <p className="text-gray-300 text-[10px]">{session.viewersCount} viéndolo</p>
                            </div>
                        </div>
                        <button onClick={handleEndStream} className="bg-red-500/80 backdrop-blur text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 active:scale-90">
                            <StopCircle className="w-4 h-4" /> Terminar
                        </button>
                    </div>

                    <div className="absolute top-16 left-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 z-10">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> EN VIVO
                    </div>

                    {/* Chat Area */}
                    <div className="absolute bottom-20 left-4 right-16 top-1/2 flex flex-col justify-end z-10 pointer-events-none">
                        <div 
                            ref={chatContainerRef}
                            className="overflow-y-auto max-h-64 space-y-3 pb-2 hide-scrollbar pointer-events-auto"
                        >
                            {messages.map((msg, i) => (
                                <div key={msg.id || i} className="flex flex-col">
                                    {msg.type === 'system' ? (
                                        <div className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-xl self-start">
                                            <p className="text-yellow-300 text-xs font-bold">{msg.text}</p>
                                        </div>
                                    ) : msg.type === 'purchase' ? (
                                        <div className="bg-green-500/80 backdrop-blur px-3 py-1.5 rounded-xl self-start flex items-center gap-1 border border-green-400">
                                            <Sparkles className="w-3 h-3 text-white" />
                                            <p className="text-white text-xs font-bold">{msg.userName} acaba de comprar!</p>
                                        </div>
                                    ) : (
                                        <div className="bg-black/40 backdrop-blur px-3 py-1.5 rounded-xl self-start max-w-[85%]">
                                            <span className="text-gray-300 text-[10px] font-bold">{msg.userName}</span>
                                            <p className="text-white text-sm">{msg.text}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Action Bar */}
                    <div className="absolute right-4 bottom-24 flex flex-col gap-4 z-10">
                        <button onClick={() => setShowProductsModal(true)} className="w-10 h-10 bg-black/40 backdrop-blur rounded-full flex flex-col items-center justify-center text-white active:scale-90 border border-white/20 relative">
                            <Tag className="w-5 h-5" />
                            <div className="absolute -top-2 -right-2 bg-red-500 text-[9px] font-bold px-1.5 rounded-full">{selectedProducts.length}</div>
                        </button>
                    </div>

                    {/* Bottom Input Area */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-10 flex gap-2 items-center">
                        <form onSubmit={handleSendMessage} className="flex-1">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    placeholder="Di algo..." 
                                    className="w-full bg-black/40 backdrop-blur border border-white/20 text-white placeholder-gray-400 rounded-full py-2 px-4 focus:outline-none text-sm"
                                />
                            </div>
                        </form>
                    </div>

                    {/* Products Modal Overlay */}
                    {showProductsModal && (
                        <div className="absolute inset-0 z-50 flex flex-col justify-end">
                            <div className="absolute inset-0 bg-black/50" onClick={() => setShowProductsModal(false)}></div>
                            <div className="bg-white rounded-t-2xl p-4 pb-8 z-10 h-[60vh] flex flex-col animate-slide-up">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg">Tus Productos</h3>
                                    <button onClick={() => setShowProductsModal(false)}><ChevronDown className="w-6 h-6" /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3">
                                    {selectedProducts.map(prod => (
                                        <div key={prod.id} className="flex gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                            <img src={prod.imageUrl} alt={prod.name} className="w-16 h-16 rounded-lg object-cover" />
                                            <div className="flex-1 flex flex-col justify-center">
                                                <p className="font-bold text-sm line-clamp-1">{prod.name}</p>
                                                <p className="text-red-600 font-bold">${Number(prod.salePrice1 || prod.originalPrice).toFixed(2)}</p>
                                            </div>
                                            <div className="flex items-center justify-center px-2">
                                                <button 
                                                    onClick={() => handlePinProduct(prod.id)}
                                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${session.featuredProductId === prod.id ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800'}`}
                                                >
                                                    {session.featuredProductId === prod.id ? 'Fijado' : 'Fijar'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ENDED SCREEN (Stitch Design: resumen_de_analytics_post_live_shopvibe) */}
            {streamStatus === 'ended' && (
                <div className="absolute inset-0 z-50 bg-[#fcf9f8] overflow-y-auto text-[#1c1b1b] font-sans pb-24">
                    {/* TopAppBar */}
                    <header className="sticky top-0 w-full z-50 flex justify-between items-center px-4 h-16 bg-[#fcf9f8] border-b border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2">
                            <button onClick={() => navigate('/vibe-market')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors active:scale-95">
                                <X className="w-6 h-6 text-[#a04100]" />
                            </button>
                            <h1 className="font-bold text-xl text-[#a04100]">Resumen del Live</h1>
                        </div>
                        <button onClick={() => navigate('/vibe-market')} className="bg-[#ff6b00] text-white px-4 py-1.5 rounded-xl font-bold text-sm active:scale-95 transition-transform shadow-md">
                            LISTO
                        </button>
                    </header>

                    <main className="p-4 max-w-2xl mx-auto space-y-6 mt-4">
                        {/* Performance Summary Section */}
                        <section className="grid grid-cols-2 gap-3">
                            {/* Total Sales - Hero Card */}
                            <div className="col-span-2 bg-white border border-gray-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                                <p className="font-bold text-xs text-gray-500 mb-1 tracking-wider uppercase">Ventas Totales Estimadas</p>
                                <p className="font-black text-4xl text-[#ff6b00]">$1,245.00</p>
                                <div className="flex items-center gap-1 mt-2 text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                    <Sparkles className="w-3 h-3" />
                                    <span className="font-bold text-[10px] uppercase">¡Excelente transmisión!</span>
                                </div>
                            </div>
                            
                            {/* Orders Card */}
                            <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <ShoppingCart className="w-5 h-5 text-gray-400" />
                                    <span className="font-bold text-xs text-green-600">8.5% conv.</span>
                                </div>
                                <p className="font-black text-3xl text-gray-900">34</p>
                                <p className="font-bold text-xs text-gray-500 mt-1">Pedidos Totales</p>
                            </div>
                            
                            {/* Followers Card */}
                            <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <Heart className="w-5 h-5 text-gray-400" />
                                    <span className="font-bold text-xs text-[#a04100]">Peak: {session?.viewersCount || 120}</span>
                                </div>
                                <p className="font-black text-3xl text-gray-900">{session?.viewersCount || 120}</p>
                                <p className="font-bold text-xs text-gray-500 mt-1">Espectadores</p>
                            </div>
                        </section>

                        {/* Engagement Metrics Section */}
                        <section className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2">
                            <div className="min-w-[120px] bg-white border border-gray-200 p-4 rounded-2xl text-center shadow-sm">
                                <MessageCircle className="w-6 h-6 text-[#ff6b00] mx-auto mb-2" />
                                <p className="font-black text-xl">{messages.length}</p>
                                <p className="font-bold text-[10px] text-gray-500 uppercase mt-1">Mensajes</p>
                            </div>
                            <div className="min-w-[120px] bg-white border border-gray-200 p-4 rounded-2xl text-center shadow-sm">
                                <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
                                <p className="font-black text-xl">1.2k</p>
                                <p className="font-bold text-[10px] text-gray-500 uppercase mt-1">Me Gusta</p>
                            </div>
                            <div className="min-w-[120px] bg-white border border-gray-200 p-4 rounded-2xl text-center shadow-sm">
                                <Share2 className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                <p className="font-black text-xl">42</p>
                                <p className="font-bold text-[10px] text-gray-500 uppercase mt-1">Compartidos</p>
                            </div>
                        </section>

                        {/* Actionable Insights Section */}
                        <section className="bg-orange-50 p-5 rounded-2xl border border-orange-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-5 h-5 text-[#ff6b00]" />
                                <h3 className="font-bold text-lg text-[#572000]">Insights para tu próximo Live</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff6b00] mt-2 flex-shrink-0"></div>
                                    <p className="text-sm text-[#5a4136] leading-relaxed">
                                        La audiencia llegó a su pico durante los primeros 10 minutos. Considera mostrar tus mejores productos al inicio.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff6b00] mt-2 flex-shrink-0"></div>
                                    <p className="text-sm text-[#5a4136] leading-relaxed">
                                        Fijar los productos en pantalla aumentó la interacción en el chat en un 40%.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </main>

                    {/* Bottom Action Bar */}
                    <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 p-4 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-50">
                        <button className="w-full bg-[#ff6b00] text-white h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md">
                            <Share2 className="w-5 h-5" /> Compartir Resultados
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
