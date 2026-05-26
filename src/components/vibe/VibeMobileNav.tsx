import React from 'react';
import { Home, Search, ShoppingCart, Video, User, MessageCircle, Sparkles, Store } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../hooks/useAuth';

const cn = (...classes: (string | undefined | false | null)[]) => {
  return classes.filter(Boolean).join(' ');
};

export default function VibeMobileNav() {
  const location = useLocation();
  const { cartItemsCount } = useCart();
  const { user } = useAuth();
  const currentPath = location.pathname;

  const tabs = [
    { path: '/feed', icon: Home, label: 'Inicio' },
    { path: '/vibe-market', icon: Store, label: 'Tienda' },
    { path: '/cart', icon: ShoppingCart, label: 'Carrito', badge: cartItemsCount },
    { path: '/messages', icon: MessageCircle, label: 'Mensajes' },
    { path: user ? '/profile' : '/login', icon: User, label: 'Perfil' },
  ];

  // On paths with no header, hide nav
  const hideNavPaths = ['/vibe'];
  if (hideNavPaths.includes(currentPath)) return null;

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        zIndex: 50,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.04)'
      }}
      className="sm:hidden"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: '100%', maxWidth: '480px', margin: '0 auto', padding: '0 4px' }}>
        {tabs.map((tab) => {
          const isActive = currentPath === tab.path || (tab.path !== '/' && currentPath.startsWith(tab.path));
          const Icon = tab.icon;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                height: '100%',
                color: isActive ? '#7c3aed' : '#9ca3af',
                textDecoration: 'none',
                transition: 'color 0.2s, transform 0.2s',
                transform: isActive ? 'translateY(-1px)' : 'none',
                position: 'relative'
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon
                  style={{
                    width: '22px',
                    height: '22px',
                    strokeWidth: isActive ? 2.5 : 1.8,
                    fill: isActive && (tab.path === '/vibe-market') ? '#7c3aed' : 'none'
                  }}
                />
                {(tab as any).badge && (tab as any).badge > 0 ? (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-8px',
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: 700,
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }}>
                    {(tab as any).badge > 9 ? '9+' : (tab as any).badge}
                  </span>
                ) : null}
              </div>
              <span style={{
                fontSize: '9px',
                marginTop: '3px',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '-0.01em'
              }}>
                {tab.label}
              </span>
              {isActive && (
                <span style={{
                  position: 'absolute',
                  bottom: '6px',
                  width: '4px',
                  height: '4px',
                  background: '#7c3aed',
                  borderRadius: '50%'
                }} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
