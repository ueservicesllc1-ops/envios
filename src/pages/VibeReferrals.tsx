import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VibeReferrals() {
  const code = 'VIBE-XYZ99';

  const copyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      toast.success('Código copiado al portapapeles');
    } else {
      toast.error('No se pudo copiar el código');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-safe">
      <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-30 flex items-center gap-3">
        <Link to="/rewards" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-900" />
        </Link>
        <h1 className="font-bold text-lg text-gray-900">Invita y Gana</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto w-full">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white text-center mb-6 shadow-lg shadow-blue-500/20">
          <h2 className="text-2xl font-black mb-2">¡Gana $5.00!</h2>
          <p className="text-sm opacity-90 mb-6">Por cada amigo que haga su primera compra con tu enlace, ambos ganan $5.00 en puntos Vibe.</p>
          
          <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm flex items-center justify-between mb-4">
            <span className="font-mono text-lg font-bold tracking-wider">{code}</span>
            <button onClick={copyCode} className="bg-white text-blue-600 p-2 rounded flex items-center gap-1 text-sm font-bold hover:bg-gray-100 transition-colors">
              <Copy className="w-4 h-4" /> Copiar
            </button>
          </div>
          
          <button onClick={copyCode} className="w-full bg-white text-gray-900 font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <Share2 className="w-5 h-5" /> Compartir Enlace
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" /> Mis Referidos (0)
          </h3>
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Aún no tienes referidos activos.</p>
            <p className="text-xs mt-1">¡Comparte tu código para empezar!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
