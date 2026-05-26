import React from 'react';
import { Search, Bell, ShoppingCart, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../hooks/useAuth';

export default function VibeHeader() {
  const location = useLocation();
  const { cartItemsCount } = useCart();
  const { user } = useAuth();
  
  const hideHeaderPaths = ['/live', '/vibe'];
  if (hideHeaderPaths.includes(location.pathname)) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm pt-safe transition-all">
      <div className="h-16 px-4 flex items-center justify-between gap-4 max-w-5xl mx-auto">
        <Link to="/vibe-market" className="flex-shrink-0 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg leading-none">V</div>
          <span className="font-extrabold text-xl text-gray-900 tracking-tight hidden sm:block">EnviosVibe</span>
        </Link>
        
        <div className="flex-1 max-w-2xl relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Encuentra lo que buscas..." 
            className="w-full pl-10 pr-4 h-10 bg-gray-100 border-transparent rounded-full focus:bg-white focus:border-blue-600/30 text-sm focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all" 
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Link to="/cart" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 relative text-gray-600 hover:text-gray-900 transition-colors hidden sm:flex">
            <ShoppingCart className="w-5 h-5" />
            {cartItemsCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {cartItemsCount > 9 ? '9+' : cartItemsCount}
              </span>
            )}
          </Link>
          <Link to="/messages" title="Mensajes" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 relative text-gray-600 hover:text-gray-900 transition-colors hidden sm:flex">
            <Bell className="w-5 h-5" />
          </Link>
          <Link to="/creator" title="Centro de Creadores" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-purple-50 relative text-purple-500 hover:text-purple-700 transition-colors hidden sm:flex">
            <span style={{fontSize:'18px'}}>✨</span>
          </Link>

          {user ? (
            <Link to="/profile" className="ml-2 flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                {user.email?.charAt(0)?.toUpperCase()}
              </div>
            </Link>
          ) : (
             <Link to="/login" className="ml-2 hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full text-sm font-bold hover:bg-gray-800 transition-colors">
              <User className="w-4 h-4" /> Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
