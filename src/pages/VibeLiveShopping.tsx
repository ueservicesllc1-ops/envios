import React, { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, Share2, ShoppingBag, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function VibeLiveShopping() {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLiveProduct() {
      try {
        const q = query(
          collection(db, 'products'),
          where('origin', '==', 'local'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setProduct({ id: doc.id, ...doc.data() });
        }
      } catch (error) {
        console.error("Error loading product for live shopping:", error);
      } finally {
        setLoading(false);
      }
    }
    loadLiveProduct();
  }, []);

  const title = product?.name || 'Cargador Rápido Inalámbrico Pro';
  const price = product?.salePrice1 || product?.originalPrice || product?.salePrice || 29.99;
  const image = product?.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80';

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col md:flex-row">
      {/* Video Area (Mobile full screen, Desktop left side) */}
      <div className="relative flex-1 bg-[url('https://images.unsplash.com/photo-1516280440502-3c467ea303ee?w=800&auto=format&fit=crop&q=60')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />
        
        {/* Top Navigation (TikTok Style) */}
        <div className="absolute top-0 left-0 w-full z-20 pt-safe bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex justify-between items-center px-4 h-16">
            <div className="w-8" /> {/* Spacer */}
            <div className="flex gap-4 font-bold text-lg drop-shadow-md">
              <span className="text-white relative">
                LIVE
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-white rounded-full"></div>
              </span>
              <Link to="/feed" className="text-white/60 hover:text-white transition-colors">Para ti</Link>
            </div>
            <div className="w-8" /> {/* Spacer */}
          </div>
        </div>

        {/* Header - moved down slightly */}
        <div className="absolute top-16 left-0 right-0 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-blue-600 bg-black overflow-hidden flex items-center justify-center">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop&q=60" alt="Avatar" />
            </div>
            <div>
              <p className="font-bold text-sm">Gabriel Tech</p>
              <p className="text-xs text-gray-300">15.2K viéndolo</p>
            </div>
            <button className="bg-blue-600 px-3 py-1 text-xs font-bold rounded-full ml-2 hover:bg-blue-700 transition-colors">Seguir</button>
          </div>
          <Link to="/feed" className="w-8 h-8 flex items-center justify-center bg-black/40 rounded-full backdrop-blur">
            <X className="w-5 h-5" />
          </Link>
        </div>

        {/* Live Badge */}
        <div className="absolute top-32 left-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 z-10">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> EN VIVO
        </div>

        {/* Right Actions (Mobile) */}
        <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10 md:hidden">
          <button className="flex flex-col items-center gap-1"><Heart className="w-8 h-8 hover:text-red-500 transition-colors fill-none" /> <span className="text-xs font-bold">12k</span></button>
          <button className="flex flex-col items-center gap-1"><MessageCircle className="w-8 h-8" /> <span className="text-xs font-bold">342</span></button>
          <button className="flex flex-col items-center gap-1"><Share2 className="w-8 h-8" /> <span className="text-xs font-bold">Compartir</span></button>
        </div>

        {/* Bottom Product Banner */}
        <div className="absolute bottom-6 left-4 right-20 md:right-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex gap-3 items-center z-10">
          {loading ? (
            <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
          ) : (
            <img src={image} className="w-14 h-14 rounded-lg object-cover bg-white" alt={title} />
          )}
          <div className="flex-1">
            <p className="font-bold text-sm line-clamp-1">{title}</p>
            <p className="text-blue-400 font-bold">${Number(price).toFixed(2)}</p>
          </div>
          <button 
            onClick={() => {
              if (product) {
                // Connect with existing cart flow if needed, or redirect to detail
                window.location.href = `/product/${product.id}`;
              }
            }}
            className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center font-bold hover:bg-gray-100 transition-all"
          >
            <ShoppingBag className="w-5 h-5 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Chat Area (Desktop right side, Mobile hidden) */}
      <div className="hidden md:flex w-96 bg-gray-900 border-l border-gray-800 flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-bold">Chat en vivo</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-sm"><span className="font-bold text-blue-400">Ana M:</span> ¿Tienen garantía?</div>
          <div className="text-sm"><span className="font-bold text-green-400">Pedro J:</span> ¡Comprado! 🎉</div>
          <div className="text-sm"><span className="font-bold text-yellow-400">Sara L:</span> Muestren el color azul por favor</div>
        </div>
        <div className="p-4 border-t border-gray-800">
          <div className="bg-gray-800 rounded-full px-4 py-2 flex items-center">
            <input type="text" placeholder="Di algo..." className="bg-transparent w-full focus:outline-none text-sm text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
