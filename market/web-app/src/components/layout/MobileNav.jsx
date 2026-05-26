import { Home, Search, ShoppingCart, Video, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export default function MobileNav() {
  const location = useLocation();
  const { totalItems } = useCart();
  const { user } = useAuth();
  const currentPath = location.pathname;

  const tabs = [
    { path: '/', icon: Home, label: 'Inicio' },
    { path: '/marketplace', icon: Search, label: 'Explorar' },
    { path: '/live', icon: Video, label: 'Live' },
    { path: '/cart', icon: ShoppingCart, label: 'Carrito', badge: totalItems },
    { path: user ? '/profile' : '/login', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-gray-100 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe sm:hidden">
      <div className="flex items-center justify-around h-full max-w-md mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.path || (tab.path !== '/' && currentPath.startsWith(tab.path));
          
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full transition-all duration-200 relative group",
                isActive ? "text-primary scale-105" : "text-gray-400 hover:text-gray-900"
              )}
            >
              <div className="relative">
                <tab.icon className={cn("w-6 h-6 transition-transform", isActive && "stroke-[2.5px] -translate-y-0.5")} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-secondary text-white text-[9px] font-bold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                ) : null}
              </div>
              <span className={cn(
                "text-[10px] mt-1 transition-all duration-200",
                isActive ? "font-bold opacity-100" : "font-medium opacity-80"
              )}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
