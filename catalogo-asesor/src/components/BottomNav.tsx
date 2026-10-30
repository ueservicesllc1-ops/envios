import React from 'react';
import { CatalogTab } from '../types/perfume';
import { Sparkles, ScanLine, Search, Heart } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface BottomNavProps {
  currentTab: CatalogTab;
  onTabChange: (tab: CatalogTab) => void;
  favoritesCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  favoritesCount
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const tabs = [
    { id: 'catalogo' as CatalogTab, label: 'Catálogo', icon: Sparkles },
    { id: 'escanear' as CatalogTab, label: 'Escanear', icon: ScanLine, highlight: true },
    { id: 'buscar' as CatalogTab, label: 'Buscar', icon: Search },
    { id: 'favoritos' as CatalogTab, label: 'Favoritos', icon: Heart, badge: favoritesCount },
  ];

  return (
    <nav
      className={`fixed bottom-0 sm:bottom-3 left-0 right-0 z-40 backdrop-blur-lg px-3 py-2 max-w-md sm:max-w-xl md:max-w-2xl mx-auto shadow-2xl transition-colors duration-200 border-t sm:border sm:rounded-2xl ${
        isLight
          ? 'bg-white/95 border-slate-200 shadow-slate-300/40'
          : 'bg-[#0d121f]/95 border-amber-500/20 shadow-black'
      }`}
    >
      <div className="grid grid-cols-4 items-center gap-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          if (tab.highlight) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative -top-4 flex flex-col items-center justify-center focus:outline-none"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-200 text-slate-950 scale-105 shadow-amber-500/30'
                      : 'bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-amber-600/20 hover:scale-105'
                  }`}
                >
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span
                  className={`text-[10px] font-bold mt-1 tracking-wider uppercase ${
                    isActive
                      ? isLight ? 'text-amber-600' : 'text-amber-400'
                      : isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 relative ${
                isActive
                  ? isLight ? 'text-amber-600' : 'text-amber-400'
                  : isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'}`} />
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className={`absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ${isLight ? 'ring-white' : 'ring-[#0d121f]'}`}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium mt-1 tracking-wide ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className={`w-1 h-1 rounded-full mt-0.5 ${isLight ? 'bg-amber-600' : 'bg-amber-400'}`} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
