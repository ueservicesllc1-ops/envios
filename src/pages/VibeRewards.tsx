import React, { useState } from 'react';
import { Coins, Gift, TrendingUp, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function VibeRewards() {
  const [points, setPoints] = useState(2450);

  const handleRedeem = () => {
    if (points >= 500) {
      setPoints(prev => prev - 500);
      toast.success('¡Has canjeado 500 puntos por $5 de descuento!');
    } else {
      toast.error('No tienes suficientes puntos (mínimo 500)');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-safe">
      <div className="bg-blue-600 pt-12 pb-6 px-4 text-white text-center rounded-b-3xl shadow-md">
        <h1 className="text-lg font-medium opacity-90 mb-2">Mis Vibe Puntos</h1>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Coins className="w-8 h-8 text-yellow-300 fill-yellow-300 animate-bounce" />
          <span className="text-4xl font-extrabold">{points.toLocaleString()}</span>
        </div>
        <p className="text-sm opacity-90 mb-4">¡Equivale a ${(points / 100).toFixed(2)} en descuentos!</p>
        <button 
          onClick={handleRedeem}
          disabled={points < 500}
          className="bg-white text-blue-600 font-bold px-6 py-2.5 rounded-full shadow-lg shadow-black/10 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Canjear Puntos
        </button>
      </div>

      <div className="p-4 max-w-lg mx-auto w-full -mt-4 z-10">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <h2 className="font-bold text-gray-900 mb-4">Gana más puntos</h2>
          
          <div className="space-y-4">
            <Link to="/referrals" className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-lg hover:bg-blue-50 transition-colors">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-gray-900">Invita a un amigo</h3>
                <p className="text-xs text-gray-600">Gana 500 puntos por cada referido</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

            <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-lg cursor-pointer hover:bg-indigo-50 transition-colors">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-gray-900">Misión Diaria</h3>
                <p className="text-xs text-gray-600">Explora 5 productos (3/5)</p>
              </div>
              <span className="text-sm font-bold text-indigo-600">+10 pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
