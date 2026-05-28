import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, MessageCircle, Share2, ShoppingBag, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { liveSessionService, LiveSession, LiveChatMessage } from '../services/liveSessionService';
import toast from 'react-hot-toast';

export default function VibeLiveShopping() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe to Active Session
  useEffect(() => {
    const unsub = liveSessionService.subscribeToActiveSession((s) => {
      setSession(s);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to Chat when session is loaded
  useEffect(() => {
    if (!session?.id) return;
    
    // Simulate updating view count (increment by 1 when we join)
    // In a real app we'd use Firestore increment, but we keep it simple here
    
    const unsub = liveSessionService.subscribeToChat(session.id, (msgs) => {
      setMessages(msgs);
      if (chatContainerRef.current) {
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        }, 100);
      }
    });
    return () => unsub();
  }, [session?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !session?.id) return;
    
    if (!user) {
        toast.error('Debes iniciar sesión para chatear');
        navigate('/login');
        return;
    }

    await liveSessionService.sendMessage(session.id, user.uid, user.displayName || 'Usuario', chatInput.trim(), 'message');
    setChatInput('');
  };

  const handleSimulatePurchase = async () => {
    if (!user || !session?.id) return;
    await liveSessionService.sendMessage(session.id, user.uid, user.displayName || 'Usuario', '', 'purchase');
    toast.success('¡Compra simulada registrada!');
  };

  // Find the featured product from the session products array
  const featuredProduct = session?.products?.find(p => p.id === session.featuredProductId) || null;

  if (loading) {
      return (
          <div className="fixed inset-0 bg-black flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
      );
  }

  if (!session) {
      return (
          <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white px-4">
              <AlertCircle className="w-16 h-16 text-gray-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">No hay Lives activos</h2>
              <p className="text-gray-400 text-center mb-8">Vuelve más tarde o inicia tu propia transmisión.</p>
              <Link to="/vibe-host" className="bg-[#ff6b00] text-white font-bold py-3 px-8 rounded-full">
                  Transmitir Ahora
              </Link>
              <Link to="/feed" className="mt-4 text-gray-400 font-bold">Volver al Feed</Link>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col md:flex-row">
      {/* Video Area */}
      <div className="relative flex-1 bg-[url('https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=60')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />
        
        {/* Top Navigation */}
        <div className="absolute top-0 left-0 w-full z-20 pt-safe bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex justify-between items-center px-4 h-16">
            <div className="w-8" />
            <div className="flex gap-4 font-bold text-lg drop-shadow-md">
              <span className="text-white relative">
                LIVE
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-white rounded-full"></div>
              </span>
              <Link to="/feed" className="text-white/60 hover:text-white transition-colors">Para ti</Link>
            </div>
            <div className="w-8" />
          </div>
        </div>

        {/* Header */}
        <div className="absolute top-16 left-0 right-0 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-red-500 bg-black overflow-hidden flex items-center justify-center">
              <img src={`https://ui-avatars.com/api/?name=${session.sellerName}`} alt="Avatar" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{session.sellerName}</p>
              <p className="text-[10px] text-gray-300">{session.viewersCount} viéndolo</p>
            </div>
            <button className="bg-red-500 px-3 py-1 text-xs font-bold rounded-full ml-2 hover:bg-red-600 transition-colors">Seguir</button>
          </div>
          <Link to="/feed" className="w-8 h-8 flex items-center justify-center bg-black/40 rounded-full backdrop-blur">
            <X className="w-5 h-5" />
          </Link>
        </div>

        {/* Title */}
        <div className="absolute top-32 left-4 z-10">
            <h2 className="text-white font-bold text-lg drop-shadow-md">{session.title}</h2>
        </div>

        {/* Right Actions (Mobile) */}
        <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10 md:hidden">
          <button className="flex flex-col items-center gap-1"><Heart className="w-8 h-8 hover:text-red-500 transition-colors fill-none" /> <span className="text-xs font-bold">12k</span></button>
          <button className="flex flex-col items-center gap-1"><Share2 className="w-8 h-8" /> <span className="text-xs font-bold">Compartir</span></button>
        </div>

        {/* Chat Overlay (Mobile) */}
        <div className="absolute bottom-24 left-4 right-16 top-1/2 flex flex-col justify-end z-10 pointer-events-none md:hidden">
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
                                <p className="text-white text-[11px] font-bold">{msg.userName} acaba de comprar!</p>
                            </div>
                        ) : (
                            <div className="bg-black/40 backdrop-blur px-3 py-1.5 rounded-xl self-start max-w-[85%]">
                                <span className="text-gray-300 text-[10px] font-bold">{msg.userName}</span>
                                <p className="text-white text-xs">{msg.text}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Chat Input (Mobile) */}
        <div className="absolute bottom-4 left-4 right-4 z-10 md:hidden">
            <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                <input 
                    type="text" 
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Di algo..." 
                    className="flex-1 bg-black/40 backdrop-blur border border-white/20 text-white placeholder-gray-300 rounded-full py-2.5 px-4 focus:outline-none text-sm"
                />
            </form>
        </div>

        {/* Featured Product Banner */}
        {featuredProduct && (
            <div className="absolute bottom-[90px] left-4 right-20 md:bottom-6 md:right-4 bg-white/90 backdrop-blur-md border border-white/20 rounded-xl p-2 flex gap-3 items-center z-10 text-black shadow-2xl animate-slide-up">
                <img src={featuredProduct.imageUrl} className="w-14 h-14 rounded-lg object-cover bg-gray-100" alt={featuredProduct.name} />
                <div className="flex-1">
                    <p className="font-bold text-xs line-clamp-2 leading-tight">{featuredProduct.name}</p>
                    <p className="text-red-600 font-black text-sm mt-0.5">${Number(featuredProduct.salePrice1 || featuredProduct.originalPrice).toFixed(2)}</p>
                </div>
                <button 
                    onClick={() => {
                        window.location.href = `/product/${featuredProduct.id}`;
                    }}
                    className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center font-bold hover:bg-red-700 transition-all active:scale-95 shadow-md"
                >
                    <ShoppingBag className="w-4 h-4" />
                </button>
            </div>
        )}
      </div>

      {/* Chat Area (Desktop right side) */}
      <div className="hidden md:flex w-96 bg-gray-900 border-l border-gray-800 flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-bold">Chat en vivo</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
              <div key={msg.id || i} className="text-sm">
                  <span className={`font-bold ${msg.type === 'purchase' ? 'text-green-400' : 'text-blue-400'}`}>
                      {msg.userName}: 
                  </span> 
                  <span className={`ml-1 ${msg.type === 'purchase' ? 'text-green-400 font-bold' : 'text-white'}`}>
                      {msg.type === 'purchase' ? '¡Comprado! 🎉' : msg.text}
                  </span>
              </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-800">
          <form onSubmit={handleSendMessage} className="bg-gray-800 rounded-full px-4 py-2 flex items-center">
            <input 
                type="text" 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Di algo..." 
                className="bg-transparent w-full focus:outline-none text-sm text-white" 
            />
          </form>
        </div>
      </div>
    </div>
  );
}
