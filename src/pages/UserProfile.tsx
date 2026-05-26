import React, { useState, useEffect } from 'react';
import { User, LogOut, Package, Store, MapPin, CreditCard, Home, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';
import { sellerService } from '../services/sellerService';
import { useCart } from '../contexts/CartContext';

const UserProfile: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { cartItemsCount } = useCart();
  const [isVerifiedSeller, setIsVerifiedSeller] = useState(false);

  useEffect(() => {
    const checkSellerStatus = async () => {
        if (!user?.email) return;
        if (isAdmin) {
            setIsVerifiedSeller(true);
            return;
        }
        try {
            const sellers = await sellerService.getAll();
            const sellerExists = sellers.some(seller => seller.email === user.email);
            setIsVerifiedSeller(sellerExists);
        } catch (error) {
            console.error('Error verificando vendedor:', error);
            setIsVerifiedSeller(false);
        }
    };
    checkSellerStatus();
  }, [user, isAdmin]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
      toast.success('Sesión cerrada');
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  const isSeller = isVerifiedSeller || isAdmin;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 font-sans">
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white pt-12 pb-24 px-4 text-center rounded-b-3xl shadow-md relative">
        <h1 className="text-2xl font-bold mb-4">Mi Perfil</h1>
      </div>

      <div className="px-4 max-w-lg mx-auto w-full -mt-20 z-10">
        
        {/* Tarjeta de Perfil */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center mb-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm mb-3">
            {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
                <User className="w-10 h-10 text-gray-400" />
            )}
          </div>
          <h2 className="text-xl font-black text-gray-900">{user?.displayName || user?.email?.split('@')[0]}</h2>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <div className="mt-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${isSeller ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
              Cuenta de {isSeller ? 'Vendedor' : 'Comprador'}
            </span>
          </div>
        </div>

        {/* Opciones */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-50 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate('/my-orders')}>
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
              <Package className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-gray-900">Mis Pedidos</h3>
              <p className="text-xs text-gray-500">Rastrea tus compras</p>
            </div>
          </div>
          <div className="p-4 border-b border-gray-50 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate('/my-addresses')}>
            <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-500">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-gray-900">Direcciones</h3>
              <p className="text-xs text-gray-500">Gestiona tus lugares de entrega</p>
            </div>
          </div>
          <div className="p-4 border-b border-gray-50 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-500">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-gray-900">Métodos de Pago</h3>
              <p className="text-xs text-gray-500">Tarjetas guardadas</p>
            </div>
          </div>
          {isSeller && (
            <div className="p-4 border-b border-gray-50 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate('/seller')}>
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
                <Store className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-gray-900">Panel de Vendedor</h3>
                <p className="text-xs text-gray-500">Gestiona tus ventas y productos</p>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-5 h-5" /> Cerrar Sesión
        </button>

      </div>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full z-50 rounded-t-xl bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.05)] flex justify-around items-center py-2 px-2 pb-safe border-t border-gray-100">
        <button onClick={() => navigate('/vibe-market')} className="flex flex-col items-center justify-center text-gray-400 hover:text-orange-600 active:scale-90 transition-all duration-150">
          <Home className="w-6 h-6 mb-1" />
          <span className="font-bold text-[10px]">Inicio</span>
        </button>
        <button onClick={() => navigate('/cart')} className="flex flex-col items-center justify-center text-gray-400 hover:text-orange-600 active:scale-90 transition-all duration-150">
          <div className="relative">
            <ShoppingCart className="w-6 h-6 mb-1" />
            {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                    {cartItemsCount}
                </span>
            )}
          </div>
          <span className="font-bold text-[10px]">Carrito</span>
        </button>
        <button onClick={() => navigate('/profile')} className="flex flex-col items-center justify-center text-orange-600 active:scale-90 transition-all duration-150">
          <User className="w-6 h-6 mb-1" />
          <span className="font-bold text-[10px]">Perfil</span>
        </button>
      </nav>
    </div>
  );
}

export default UserProfile;
