import React, { useState, useEffect } from 'react';
import { Coins, Gift, TrendingUp, ChevronRight, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { walletService } from '../services/walletService';
import toast from 'react-hot-toast';

export default function VibeRewards() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canSpin, setCanSpin] = useState(false);

  useEffect(() => {
    async function fetchWallet() {
      if (user) {
        try {
            const wallet = await walletService.getWallet(user.uid);
            setPoints(wallet.points);
            
            const spinStatus = await walletService.canSpinToday(user.uid);
            setCanSpin(spinStatus);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
      }
    }
    fetchWallet();
  }, [user]);

  const handleRedeem = async () => {
    if (!user) return;
    
    if (points >= 500) {
      try {
          await walletService.deductPoints(user.uid, 500);
          setPoints(prev => prev - 500);
          toast.success('¡Has canjeado 500 puntos por $5 de descuento!');
      } catch (error) {
          toast.error('Error al canjear puntos');
      }
    } else {
      toast.error('No tienes suficientes puntos (mínimo 500)');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-safe">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 pt-12 pb-8 px-4 text-white text-center rounded-b-[40px] shadow-lg">
        <h1 className="text-lg font-medium opacity-90 mb-2">Mis Vibe Puntos</h1>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Coins className="w-10 h-10 text-yellow-300 fill-yellow-300 animate-pulse" />
          <span className="text-5xl font-black tracking-tight">
              {loading ? '...' : points.toLocaleString()}
          </span>
        </div>
        <p className="text-sm opacity-90 mb-6 font-medium">¡Equivale a ${(points / 100).toFixed(2)} en descuentos reales!</p>
        <button 
          onClick={() => navigate('/redeem')}
          className="bg-white text-blue-600 font-bold px-8 py-3 rounded-full shadow-lg hover:bg-gray-50 transition-all active:scale-95"
        >
          Canjear Puntos
        </button>
      </div>

      <div className="p-4 max-w-lg mx-auto w-full -mt-6 z-10 space-y-4">
        
        {/* ROULETTE BANNER */}
        <div 
            onClick={() => navigate('/vibe-roulette')}
            className="bg-gradient-to-r from-[#ff6b00] to-[#e32322] rounded-2xl shadow-lg p-5 flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
        >
            <div className="text-white">
                <h2 className="font-black text-xl flex items-center gap-2">
                    <RotateCcw className="w-5 h-5" /> Ruleta de la Suerte
                </h2>
                <p className="text-sm text-white/90 font-medium mt-1">
                    {canSpin ? '¡Tienes 1 giro gratis esperando!' : 'Vuelve mañana para tu giro diario.'}
                </p>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <ChevronRight className="w-6 h-6 text-white" />
            </div>
        </div>

        {/* COUPONS BANNER */}
        <div 
            onClick={() => navigate('/coupons')}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Gift className="w-5 h-5 text-[#ff6b00]" />
                </div>
                <div>
                    <h2 className="font-black text-gray-900">Mis Cupones</h2>
                    <p className="text-xs text-gray-500 font-medium">Revisa tus premios y descuentos</p>
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>

        {/* MISSIONS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-black text-gray-900 mb-4 text-lg">Misiones Diarias</h2>
          
          <div className="space-y-4">
            <Link to="/referrals" className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl hover:bg-blue-50 transition-colors">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner">
                <Gift className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-gray-900">Invita a un amigo</h3>
                <p className="text-xs text-gray-600 font-medium">Gana 500 puntos por cada referido</p>
              </div>
              <span className="text-sm font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-md">+500</span>
            </Link>

            <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-gray-900">Explorador</h3>
                <p className="text-xs text-gray-600 font-medium">Mira 5 videos del Feed (3/5)</p>
              </div>
              <span className="text-sm font-black text-indigo-600 bg-indigo-100 px-2 py-1 rounded-md">+10</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-orange-50/50 rounded-xl cursor-pointer hover:bg-orange-50 transition-colors">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner">
                <Coins className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-gray-900">Comprador Fiel</h3>
                <p className="text-xs text-gray-600 font-medium">Realiza tu primera compra del mes</p>
              </div>
              <span className="text-sm font-black text-orange-600 bg-orange-100 px-2 py-1 rounded-md">+200</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
