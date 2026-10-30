import React from 'react';
import { PerfumeItem } from '../types/perfume';
import { Heart, Sparkles, MapPin } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface PerfumeCardProps {
  perfume: PerfumeItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string, e?: React.MouseEvent) => void;
  onSelect: (perfume: PerfumeItem) => void;
}

export const PerfumeCard: React.FC<PerfumeCardProps> = ({
  perfume,
  isFavorite,
  onToggleFavorite,
  onSelect
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const hasLocalStock = perfume.stock.local > 0;
  const hasEcStock = perfume.stock.bodegaEc > 0;
  const hasUsaStock = perfume.stock.bodegaUsa > 0;
  const totalStock = perfume.stock.total;

  return (
    <div
      onClick={() => onSelect(perfume)}
      className={`group relative rounded-2xl p-2.5 flex flex-col justify-between transition-all duration-300 active:scale-[0.98] cursor-pointer overflow-hidden ${
        isLight
          ? 'bg-white border border-slate-200/90 hover:border-amber-500/60 shadow-sm hover:shadow-md'
          : 'bg-gradient-to-b from-[#141a29] to-[#0d121f] border border-slate-800/80 hover:border-amber-500/40 shadow-lg hover:shadow-amber-500/10'
      }`}
    >
      {/* Top badges & Favorite */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
        {/* Stock pill */}
        {totalStock > 0 ? (
          <span
            className={`pointer-events-auto px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 backdrop-blur-md ${
              isLight
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                isLight ? 'bg-emerald-600' : 'bg-emerald-400'
              }`}
            />
            {hasLocalStock ? `Local: ${perfume.stock.local}` : hasEcStock ? 'Ecuador' : 'USA'}
          </span>
        ) : (
          <span
            className={`pointer-events-auto px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-md ${
              isLight
                ? 'bg-slate-100 text-slate-500 border border-slate-200'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
            }`}
          >
            Agotado
          </span>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(perfume.id, e);
          }}
          className={`pointer-events-auto p-1.5 rounded-full backdrop-blur-md transition-all duration-200 ${
            isFavorite
              ? 'bg-rose-500/10 text-rose-500 border border-rose-400/40'
              : isLight
              ? 'bg-slate-100/80 text-slate-400 border border-slate-200 hover:text-slate-700 hover:bg-slate-200'
              : 'bg-slate-900/60 text-slate-400 border border-slate-700/40 hover:text-white'
          }`}
          aria-label="Favorito"
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>
      </div>

      {/* Product Image - Pure white in light mode so white photos blend 100% seamlessly */}
      <div
        className={`relative w-full aspect-square rounded-xl flex items-center justify-center p-2 mt-4 mb-2 overflow-hidden ${
          isLight
            ? 'bg-white'
            : 'bg-gradient-to-b from-slate-900/50 to-slate-950/80'
        }`}
      >
        {perfume.imageUrl ? (
          <img
            src={perfume.imageUrl}
            alt={perfume.name}
            loading="lazy"
            className={`w-full h-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform duration-300 ${
              isLight ? 'mix-blend-multiply' : ''
            }`}
            onError={(e) => {
              (e.target as HTMLElement).style.opacity = '0.5';
            }}
          />
        ) : (
          <div className={`text-xs ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
            Sin Imagen
          </div>
        )}
      </div>

      {/* Information */}
      <div className="flex flex-col flex-1 justify-between pt-1">
        <div>
          {/* Brand */}
          <div
            className={`flex items-center justify-between text-[11px] font-bold tracking-wider uppercase truncate ${
              isLight ? 'text-amber-700' : 'text-amber-400/90'
            }`}
          >
            <span>{perfume.brand}</span>
            {perfume.concentration && (
              <span
                className={`text-[9px] lowercase font-normal ${
                  isLight ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {perfume.concentration.replace('Eau de Parfum', 'EDP')}
              </span>
            )}
          </div>

          {/* Perfume Name */}
          <h4
            className={`text-xs font-bold line-clamp-2 mt-0.5 leading-snug transition-colors ${
              isLight
                ? 'text-slate-900 group-hover:text-amber-800'
                : 'text-slate-100 group-hover:text-amber-200'
            }`}
          >
            {perfume.name}
          </h4>

          {/* Dupe Badge (if available) */}
          {perfume.dupeOf && (
            <div
              className={`mt-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] truncate ${
                isLight
                  ? 'bg-purple-50 border border-purple-200 text-purple-700'
                  : 'bg-purple-950/60 border border-purple-500/30 text-purple-300'
              }`}
            >
              <Sparkles
                className={`w-2.5 h-2.5 shrink-0 ${
                  isLight ? 'text-purple-600' : 'text-purple-400'
                }`}
              />
              <span className="truncate">
                Dupe: <strong className={`font-semibold ${isLight ? 'text-purple-900' : 'text-purple-200'}`}>{perfume.dupeOf}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Price & Location row */}
        <div
          className={`mt-2.5 pt-2 border-t flex items-center justify-between ${
            isLight ? 'border-slate-100' : 'border-slate-800/60'
          }`}
        >
          <div>
            <span
              className={`text-sm font-extrabold ${
                isLight ? 'text-amber-600' : 'text-amber-400'
              }`}
            >
              ${perfume.price > 0 ? perfume.price.toFixed(2) : 'Consultar'}
            </span>
            {perfume.originalPrice && perfume.originalPrice > perfume.price && (
              <span
                className={`text-[10px] line-through ml-1 ${
                  isLight ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                ${perfume.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Quick stock status icon */}
          <div
            className={`flex items-center gap-0.5 text-[10px] ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
            title={`Total: ${totalStock} uds`}
          >
            <MapPin
              className={`w-3 h-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}
            />
            <span className="font-semibold">{totalStock}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
