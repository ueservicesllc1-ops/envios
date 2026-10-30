'use client';

import React from 'react';
import { Star, Trash2, Sparkles, ShoppingBag } from 'lucide-react';
import { PerfumeItem } from '../types/perfume';
import { PerfumeCard } from './PerfumeCard';
import { useTheme } from '../context/ThemeContext';

interface FavoritesViewProps {
  perfumes: PerfumeItem[];
  favorites: string[];
  onSelectPerfume: (perfume: PerfumeItem) => void;
  onToggleFavorite: (id: string) => void;
  onClearFavorites: () => void;
  onNavigateToCatalog: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  perfumes,
  favorites,
  onSelectPerfume,
  onToggleFavorite,
  onClearFavorites,
  onNavigateToCatalog,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const favoritePerfumes = perfumes.filter(p => favorites.includes(p.id));

  return (
    <div
      className={`w-full min-h-screen px-3.5 pt-3 pb-24 transition-colors duration-250 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-black text-white'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between mb-4 pb-2 border-b ${
          isLight ? 'border-slate-200' : 'border-neutral-800'
        }`}
      >
        <div>
          <h2
            className={`text-base font-extrabold flex items-center gap-1.5 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            Mis Perfumes Favoritos
          </h2>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500 font-medium' : 'text-neutral-400'}`}>
            {favoritePerfumes.length} {favoritePerfumes.length === 1 ? 'perfume guardado' : 'perfumes guardados'} para acceso rápido
          </p>
        </div>

        {favoritePerfumes.length > 0 && (
          <button
            onClick={onClearFavorites}
            className={`p-2 transition-colors ${
              isLight ? 'text-slate-400 hover:text-red-600' : 'text-neutral-400 hover:text-red-400'
            }`}
            title="Limpiar favoritos"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid or Empty State */}
      {favoritePerfumes.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {favoritePerfumes.map((perfume) => (
            <PerfumeCard
              key={perfume.id}
              perfume={perfume}
              onSelect={onSelectPerfume}
              onToggleFavorite={onToggleFavorite}
              isFavorite={true}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 border ${
              isLight
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-neutral-900 text-amber-400 border-neutral-800'
            }`}
          >
            <Sparkles className="w-8 h-8" />
          </div>
          <h3
            className={`text-sm font-extrabold ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            Aún no tienes perfumes en favoritos
          </h3>
          <p
            className={`text-xs mt-1 max-w-xs leading-relaxed ${
              isLight ? 'text-slate-500 font-medium' : 'text-neutral-400'
            }`}
          >
            Presiona el corazón en cualquier fragancia del catálogo para guardarla y mostrarla más rápido a tus clientes.
          </p>
          <button
            onClick={onNavigateToCatalog}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Explorar Catálogo</span>
          </button>
        </div>
      )}
    </div>
  );
};
