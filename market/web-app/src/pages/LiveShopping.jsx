import { X, Heart, MessageCircle, Share2, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockProducts } from '../data/mockProducts';

export default function LiveShopping() {
  const item = mockProducts[0];

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col md:flex-row">
      {/* Video Area (Mobile full screen, Desktop left side) */}
      <div className="relative flex-1 bg-[url('https://images.unsplash.com/photo-1516280440502-3c467ea303ee?w=800&auto=format&fit=crop&q=60')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary bg-black overflow-hidden">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop&q=60" />
            </div>
            <div>
              <p className="font-bold text-sm">Gabriel Tech</p>
              <p className="text-xs text-gray-300">15.2K viéndolo</p>
            </div>
            <button className="bg-primary px-3 py-1 text-xs font-bold rounded-full ml-2">Seguir</button>
          </div>
          <Link to="/" className="w-8 h-8 flex items-center justify-center bg-black/40 rounded-full backdrop-blur">
            <X className="w-5 h-5" />
          </Link>
        </div>

        {/* Live Badge */}
        <div className="absolute top-20 left-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 z-10">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> EN VIVO
        </div>

        {/* Right Actions (Mobile) */}
        <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10 md:hidden">
          <button className="flex flex-col items-center gap-1"><Heart className="w-8 h-8" /> <span className="text-xs font-bold">12k</span></button>
          <button className="flex flex-col items-center gap-1"><MessageCircle className="w-8 h-8" /> <span className="text-xs font-bold">342</span></button>
          <button className="flex flex-col items-center gap-1"><Share2 className="w-8 h-8" /> <span className="text-xs font-bold">Share</span></button>
        </div>

        {/* Bottom Product Banner */}
        <div className="absolute bottom-6 left-4 right-20 md:right-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex gap-3 items-center z-10">
          <img src={item.image} className="w-14 h-14 rounded-lg object-cover bg-white" />
          <div className="flex-1">
            <p className="font-bold text-sm line-clamp-1">{item.title}</p>
            <p className="text-primary font-bold">${item.price.toFixed(2)}</p>
          </div>
          <button className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center font-bold">
            <ShoppingBag className="w-5 h-5" />
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
            <input type="text" placeholder="Di algo..." className="bg-transparent w-full focus:outline-none text-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}