import React, { useState, useEffect } from 'react';
import { PerfumeItem } from '../types/perfume';
import { perfumeCatalogService } from '../services/perfumeCatalogService';
import {
  X,
  Heart,
  Share2,
  Sparkles,
  MapPin,
  Clock,
  Flame,
  Tag,
  Barcode,
  Layers,
  ChevronRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface PerfumeDetailModalProps {
  perfume: PerfumeItem | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelectRelated: (perfume: PerfumeItem) => void;
}

export const PerfumeDetailModal: React.FC<PerfumeDetailModalProps> = ({
  perfume,
  onClose,
  isFavorite,
  onToggleFavorite,
  onSelectRelated
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [relatedDupes, setRelatedDupes] = useState<PerfumeItem[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [activeTab, setActiveTab] = useState<'olfativo' | 'inventario' | 'argumentario'>('olfativo');

  useEffect(() => {
    if (perfume && perfume.dupeOf) {
      setLoadingRelated(true);
      perfumeCatalogService.findRelatedDupes(perfume).then(res => {
        setRelatedDupes(res);
        setLoadingRelated(false);
      });
    } else {
      setRelatedDupes([]);
    }
  }, [perfume]);

  if (!perfume) return null;

  const handleShareWhatsApp = () => {
    const text = `💎 *${perfume.name}* (${perfume.brand})\n` +
      (perfume.dupeOf ? `✨ *Inspiración:* ${perfume.dupeOf} (${perfume.dupeBrand || 'Diseñador'})\n` : '') +
      `💵 *Precio:* $${perfume.price.toFixed(2)}\n` +
      (perfume.concentration ? `🧴 *Concentración:* ${perfume.concentration}\n` : '') +
      (perfume.notes?.top?.length ? `🍋 *Notas de Salida:* ${perfume.notes.top.join(', ')}\n` : '') +
      (perfume.notes?.middle?.length ? `🌸 *Notas de Corazón:* ${perfume.notes.middle.join(', ')}\n` : '') +
      (perfume.notes?.base?.length ? `🪵 *Notas de Fondo:* ${perfume.notes.base.join(', ')}\n` : '') +
      `📍 *Disponibilidad:* ${perfume.stock.total > 0 ? `${perfume.stock.total} unidades disponibles` : 'Bajo pedido'}\n\n` +
      `¡Escríbenos para apartar el tuyo antes de que se agote! 🛍️`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const totalStock = perfume.stock.total;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity p-0 sm:p-4">
      <div
        className={`w-full max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-5xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] md:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 border ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#0d121f] border-amber-500/20 text-white'
        }`}
      >
        {/* Top Header bar */}
        <div
          className={`sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3.5 backdrop-blur-md border-b shrink-0 ${
            isLight
              ? 'bg-white/95 border-slate-200'
              : 'bg-[#0d121f]/95 border-slate-800/80'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border ${
                isLight
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}
            >
              {perfume.brand}
            </span>
            {perfume.size && (
              <span
                className={`text-xs font-semibold ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {perfume.size}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(perfume.id)}
              className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                isFavorite
                  ? 'bg-rose-500/20 text-rose-500 border border-rose-400/40'
                  : isLight
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 hover:text-slate-700'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
              title="Guardar en favoritos"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="p-2 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
              title="Compartir por WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                isLight
                  ? 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content: 2 Columns on iPad Pro (md:), Stack on Phone */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 md:space-y-0 no-scrollbar">
          <div className="md:grid md:grid-cols-12 md:gap-6 items-start">
            {/* Left Column (Hero Photo, Price, Stock & Quick Share on iPad) */}
            <div className="md:col-span-5 space-y-4 md:sticky md:top-0">
              <div
                className={`relative w-full aspect-[4/3] md:aspect-square rounded-2xl p-4 flex items-center justify-center border shadow-sm ${
                  isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-gradient-to-b from-[#182033] to-[#0f1422] border-slate-800/80'
                }`}
              >
                <img
                  src={perfume.imageUrl}
                  alt={perfume.name}
                  className={`w-full h-full object-contain filter drop-shadow-md transition-transform duration-300 hover:scale-105 ${
                    isLight ? 'mix-blend-multiply' : ''
                  }`}
                />
                {totalStock > 0 ? (
                  <div
                    className={`absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md border ${
                      isLight
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full animate-pulse ${
                        isLight ? 'bg-emerald-600' : 'bg-emerald-400'
                      }`}
                    />
                    {totalStock} en existencia
                  </div>
                ) : (
                  <div
                    className={`absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-md border ${
                      isLight
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    Agotado en tienda
                  </div>
                )}
              </div>

              {/* Price & SKU Box */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isLight
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-[#121826] border-slate-800'
                }`}
              >
                <div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Precio Venta
                  </span>
                  <div className={`text-2xl font-black ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                    ${perfume.price > 0 ? perfume.price.toFixed(2) : 'A consultar'}
                  </div>
                </div>
                {perfume.sku && (
                  <div className="text-right">
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      SKU / Código
                    </span>
                    <div className="text-xs font-mono font-bold mt-0.5">
                      {perfume.sku}
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop / iPad Quick WhatsApp Button */}
              <div className="hidden md:block">
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Compartir Ficha por WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Right Column (Title, Dupe Radar, Olfactory Pyramid, Stock) */}
            <div className="md:col-span-7 space-y-4">
              {/* Title & Brand */}
              <div>
                <span
                  className={`text-xs font-bold tracking-wider uppercase ${
                    isLight ? 'text-amber-700' : 'text-amber-400'
                  }`}
                >
                  {perfume.brand}
                </span>
                <h2
                  className={`text-xl font-extrabold leading-snug mt-0.5 ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {perfume.name}
                </h2>

                {/* Quick Specs badges */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {perfume.concentration && (
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                        isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                      }`}
                    >
                      {perfume.concentration}
                    </span>
                  )}
                  {perfume.gender && (
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                        isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                      }`}
                    >
                      {perfume.gender}
                    </span>
                  )}
                </div>
              </div>

          {/* DUPE / INSPIRACIÓN CARD (STAR FEATURE) */}
          {perfume.dupeOf ? (
            <div
              className={`rounded-2xl p-4 border shadow-md relative overflow-hidden ${
                isLight
                  ? 'bg-gradient-to-r from-purple-50 via-indigo-50/40 to-purple-50 border-purple-200 text-slate-900'
                  : 'bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-purple-900/50 border-purple-500/30 text-white shadow-lg'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1 text-purple-700">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Inspiración Olfativa / Dupe de Diseñador</span>
              </div>
              <div
                className={`text-base font-extrabold mt-1 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                ✨ {perfume.dupeOf}
              </div>
              {perfume.dupeBrand && (
                <div
                  className={`text-xs mt-0.5 ${
                    isLight ? 'text-purple-800 font-medium' : 'text-purple-300/80'
                  }`}
                >
                  Marca original: <strong className={isLight ? 'text-purple-900' : 'text-purple-200'}>{perfume.dupeBrand}</strong>
                </div>
              )}
              <div
                className={`mt-2 text-[11px] leading-relaxed p-2 rounded-xl border ${
                  isLight
                    ? 'bg-white/80 text-purple-950 border-purple-200'
                    : 'text-purple-200/90 bg-purple-950/50 border-purple-500/20'
                }`}
              >
                Este perfume ofrece un ADN olfativo similar a la fragancia de lujo con una excelente relación calidad-precio.
              </div>
            </div>
          ) : (
            <div
              className={`rounded-2xl p-3 border flex items-center gap-2 text-xs ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-500'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400'
              }`}
            >
              <Sparkles className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Fragancia con formulación de creación original o sin dupe registrado.</span>
            </div>
          )}

          {/* Navigation Tabs for detailed blocks */}
          <div
            className={`grid grid-cols-3 gap-1 p-1 rounded-xl border text-xs font-semibold text-center ${
              isLight
                ? 'bg-slate-100 border-slate-200'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <button
              onClick={() => setActiveTab('olfativo')}
              className={`py-2 rounded-lg transition-all ${
                activeTab === 'olfativo'
                  ? isLight
                    ? 'bg-white text-amber-700 shadow-xs border border-slate-200 font-bold'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pirámide Olfativa
            </button>
            <button
              onClick={() => setActiveTab('inventario')}
              className={`py-2 rounded-lg transition-all ${
                activeTab === 'inventario'
                  ? isLight
                    ? 'bg-white text-amber-700 shadow-xs border border-slate-200 font-bold'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Existencias ({totalStock})
            </button>
            <button
              onClick={() => setActiveTab('argumentario')}
              className={`py-2 rounded-lg transition-all ${
                activeTab === 'argumentario'
                  ? isLight
                    ? 'bg-white text-amber-700 shadow-xs border border-slate-200 font-bold'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Guía Asesor
            </button>
          </div>

          {/* TAB 1: PIRÁMIDE OLFATIVA & NOTAS */}
          {activeTab === 'olfativo' && (
            <div className="space-y-3">
              {/* Notas de Salida, Corazón, Fondo */}
              {perfume.notes && (perfume.notes.top.length > 0 || perfume.notes.middle.length > 0 || perfume.notes.base.length > 0) ? (
                <div
                  className={`rounded-2xl p-3.5 border space-y-3 ${
                    isLight
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-[#121826] border-slate-800'
                  }`}
                >
                  {perfume.notes.top.length > 0 && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20 text-xs font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <div
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            isLight ? 'text-amber-800' : 'text-amber-400'
                          }`}
                        >
                          Notas de Salida (Primeros minutos)
                        </div>
                        <div
                          className={`text-xs mt-0.5 font-medium ${
                            isLight ? 'text-slate-700' : 'text-slate-200'
                          }`}
                        >
                          {perfume.notes.top.join(' • ')}
                        </div>
                      </div>
                    </div>
                  )}

                  {perfume.notes.middle.length > 0 && (
                    <div
                      className={`flex items-start gap-2.5 pt-2 border-t ${
                        isLight ? 'border-slate-200' : 'border-slate-800/60'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 border border-purple-500/20 text-xs font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <div
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            isLight ? 'text-purple-800' : 'text-purple-400'
                          }`}
                        >
                          Notas de Corazón (Cuerpo del aroma)
                        </div>
                        <div
                          className={`text-xs mt-0.5 font-medium ${
                            isLight ? 'text-slate-700' : 'text-slate-200'
                          }`}
                        >
                          {perfume.notes.middle.join(' • ')}
                        </div>
                      </div>
                    </div>
                  )}

                  {perfume.notes.base.length > 0 && (
                    <div
                      className={`flex items-start gap-2.5 pt-2 border-t ${
                        isLight ? 'border-slate-200' : 'border-slate-800/60'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 border border-rose-500/20 text-xs font-bold">
                        3
                      </div>
                      <div className="flex-1">
                        <div
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            isLight ? 'text-rose-800' : 'text-rose-400'
                          }`}
                        >
                          Notas de Fondo (Fijación y estela duradera)
                        </div>
                        <div
                          className={`text-xs mt-0.5 font-medium ${
                            isLight ? 'text-slate-700' : 'text-slate-200'
                          }`}
                        >
                          {perfume.notes.base.join(' • ')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`p-3 rounded-xl text-xs text-center border ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Pirámide olfativa detallada en proceso de enriquecimiento técnico.
                </div>
              )}

              {/* Acordes Principales */}
              {perfume.mainAccords && perfume.mainAccords.length > 0 && (
                <div
                  className={`rounded-2xl p-3 border ${
                    isLight
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-[#121826] border-slate-800'
                  }`}
                >
                  <div
                    className={`text-xs font-bold mb-2 ${
                      isLight ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    Acordes Principales:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {perfume.mainAccords.map((accord, idx) => (
                      <span
                        key={idx}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          isLight
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-gradient-to-r from-amber-500/10 to-amber-600/10 text-amber-300 border-amber-500/20'
                        }`}
                      >
                        {accord}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Descripción */}
              {perfume.description && (
                <div
                  className={`rounded-2xl p-3.5 border ${
                    isLight
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-[#121826] border-slate-800'
                  }`}
                >
                  <div
                    className={`text-xs font-bold mb-1 ${
                      isLight ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    Descripción:
                  </div>
                  <div
                    className={`text-xs leading-relaxed ${
                      isLight ? 'text-slate-600 font-medium' : 'text-slate-300'
                    }`}
                    dangerouslySetInnerHTML={{ __html: perfume.description }}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INVENTARIO POR UBICACIONES REALES */}
          {activeTab === 'inventario' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {/* Local */}
                <div
                  className={`rounded-xl p-3 border flex flex-col items-center justify-center text-center ${
                    isLight
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-[#121826] border-slate-800'
                  }`}
                >
                  <div
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    Local / Tienda
                  </div>
                  <div
                    className={`text-2xl font-black mt-1 ${
                      perfume.stock.local > 0
                        ? isLight
                          ? 'text-emerald-600'
                          : 'text-emerald-400'
                        : isLight
                        ? 'text-slate-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {perfume.stock.local}
                  </div>
                  <div className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                    Entrega inmediata
                  </div>
                </div>

                {/* Bodega Ecuador */}
                <div
                  className={`rounded-xl p-3 border flex flex-col items-center justify-center text-center ${
                    isLight
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-[#121826] border-slate-800'
                  }`}
                >
                  <div
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    Bodega Ecuador
                  </div>
                  <div
                    className={`text-2xl font-black mt-1 ${
                      perfume.stock.bodegaEc > 0
                        ? isLight
                          ? 'text-emerald-600'
                          : 'text-emerald-400'
                        : isLight
                        ? 'text-slate-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {perfume.stock.bodegaEc}
                  </div>
                  <div className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                    Despacho 24-48h
                  </div>
                </div>

                {/* Bodega USA */}
                <div
                  className={`rounded-xl p-3 border flex flex-col items-center justify-center text-center ${
                    isLight
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-[#121826] border-slate-800'
                  }`}
                >
                  <div
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    Bodega USA
                  </div>
                  <div
                    className={`text-2xl font-black mt-1 ${
                      perfume.stock.bodegaUsa > 0
                        ? isLight
                          ? 'text-blue-600'
                          : 'text-blue-400'
                        : isLight
                        ? 'text-slate-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {perfume.stock.bodegaUsa}
                  </div>
                  <div className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                    Envío 7-15 días
                  </div>
                </div>
              </div>

              <div
                className={`rounded-xl p-3 border text-xs space-y-1.5 ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-slate-900/70 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex justify-between">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
                    Total Disponible Global:
                  </span>
                  <strong className={isLight ? 'text-amber-700 font-bold' : 'text-amber-400'}>
                    {totalStock} unidades
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
                    Código de Barras / SKU:
                  </span>
                  <span className="font-mono font-semibold">{perfume.barcode || perfume.sku}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GUÍA PARA EL ASESOR & ARGUMENTARIO */}
          {activeTab === 'argumentario' && (
            <div className="space-y-3">
              {/* Pitch de venta */}
              <div
                className={`rounded-2xl p-4 border ${
                  isLight
                    ? 'bg-amber-50/80 border-amber-200 text-slate-900 shadow-xs'
                    : 'bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border-amber-500/30'
                }`}
              >
                <div
                  className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isLight ? 'text-amber-800' : 'text-amber-400'
                  }`}
                >
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span>Pitch Comercial para el Cliente</span>
                </div>
                <p
                  className={`text-xs leading-relaxed italic ${
                    isLight ? 'text-amber-950' : 'text-amber-100/90'
                  }`}
                >
                  "{perfume.salesPitch || `Este perfume de ${perfume.brand} destaca por su fijación excepcional y sofisticación, ideal para quienes buscan una fragancia distintiva con gran presencia.`}"
                </p>
              </div>

              {/* Longevidad y Ocasión */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div
                  className={`p-3 rounded-xl border ${
                    isLight
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-[#121826] border-slate-800'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 font-bold mb-1 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Rendimiento</span>
                  </div>
                  <p className={isLight ? 'text-slate-800 font-semibold' : 'text-slate-200'}>
                    {perfume.longevity || '8 a 10 horas estimadas'}
                  </p>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    isLight
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-[#121826] border-slate-800'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 font-bold mb-1 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5 text-purple-600" />
                    <span>Mejor Ocasión</span>
                  </div>
                  <p className={isLight ? 'text-slate-800 font-semibold' : 'text-slate-200'}>
                    {perfume.bestOccasion || 'Día, noche, citas o eventos'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* EQUIVALENCIAS Y DUPES RELACIONADOS EN EL CATÁLOGO */}
          {relatedDupes.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`text-xs font-bold flex items-center gap-1.5 ${
                    isLight ? 'text-slate-900' : 'text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Otros perfumes con inspiración similar:</span>
                </div>
                <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {relatedDupes.length} opciones
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {relatedDupes.map(r => (
                  <button
                    key={r.id}
                    onClick={() => onSelectRelated(r)}
                    className={`p-2 rounded-xl text-left transition-colors flex items-center gap-2 border shadow-xs ${
                      isLight
                        ? 'bg-white hover:bg-slate-50 border-slate-200 hover:border-amber-400'
                        : 'bg-slate-900/80 border-slate-800 hover:border-amber-500/40'
                    }`}
                  >
                    <img
                      src={r.imageUrl}
                      alt={r.name}
                      className={`w-10 h-10 object-contain rounded-lg shrink-0 p-1 ${
                        isLight ? 'bg-white mix-blend-multiply' : 'bg-slate-950'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-[10px] font-bold truncate ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                        {r.brand}
                      </div>
                      <div className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {r.name}
                      </div>
                      <div className={`text-[11px] font-black ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                        ${r.price.toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
            </div>
          </div>
        </div>

        {/* Bottom Action Footer (Mobile Only) */}
        <div
          className={`sticky bottom-0 p-3 border-t flex md:hidden items-center gap-2 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-[#0d121f] border-slate-800/80'
          }`}
        >
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir Ficha al Cliente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
