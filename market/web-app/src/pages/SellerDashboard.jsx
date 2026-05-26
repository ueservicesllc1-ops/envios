import { useState, useEffect } from 'react';
import { DollarSign, Package, TrendingUp, Users, Store, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createSellerProfile, getSellerStats } from '../services/sellerService';
import { updateUserProfile } from '../services/userService';
import { Link } from 'react-router-dom';

export default function SellerDashboard() {
  const { user, userProfile } = useAuth();
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, totalVisits: 0, conversionRate: 0 });

  useEffect(() => {
    if (userProfile?.role === 'seller') {
      getSellerStats(user.uid).then(res => {
        if (res) setStats(res);
      });
    }
  }, [user, userProfile]);

  if (userProfile?.role !== 'seller') {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-500 mb-8">Esta área es exclusivamente para vendedores autorizados de UEServices. Las cuentas de vendedor se gestionan internamente.</p>
          <Link to="/" className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition-colors flex items-center justify-center">
            Volver a la Tienda
          </Link>
        </div>
      </div>
    );
  }

  // Seller Dashboard Vista
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-30">
        <h1 className="font-bold text-xl text-gray-900">Dashboard de Ventas</h1>
        <p className="text-xs text-gray-500">Bienvenido, {userProfile?.displayName}</p>
      </div>

      <div className="p-4 max-w-5xl mx-auto w-full flex flex-col gap-4">
        
        {/* Enlace al gestor de productos */}
        <Link to="/seller/products" className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-5 text-white flex justify-between items-center hover:opacity-95 transition-opacity shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Gestionar Productos</h3>
              <p className="text-sm text-gray-300">Añade o edita tu catálogo</p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-gray-400" />
        </Link>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <DollarSign className="w-4 h-4 text-green-500" /> <span className="text-xs font-bold">Ingresos</span>
            </div>
            <p className="text-2xl font-black text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Package className="w-4 h-4 text-primary" /> <span className="text-xs font-bold">Órdenes</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{stats.totalOrders}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Users className="w-4 h-4 text-blue-500" /> <span className="text-xs font-bold">Visitas</span>
            </div>
            <p className="text-2xl font-black text-gray-900">0</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-500" /> <span className="text-xs font-bold">Conversión</span>
            </div>
            <p className="text-2xl font-black text-gray-900">0.0%</p>
          </div>
        </div>

        {/* Órdenes Recientes - Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-2 p-12 text-center">
           <p className="text-gray-500 text-sm">Aún no tienes órdenes reales en Firestore.</p>
        </div>

      </div>
    </div>
  );
}