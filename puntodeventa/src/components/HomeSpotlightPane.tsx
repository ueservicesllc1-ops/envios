'use client';

import React, { useState } from 'react';
import {
  Product,
  PosLocationId,
  POS_LOCATIONS,
} from '../types/pos';
import {
  QrCode,
  Camera,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  Warehouse,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';

interface HomeSpotlightPaneProps {
  products: Product[];
  scannedProduct: Product | null;
  query: string;
  selectedLocation: PosLocationId;
  onAdd: (product: Product, qty?: number) => void;
  onClearSpotlight: () => void;
  onOpenCatalog: (location?: PosLocationId) => void;
  onScanCamera: () => void;
  onScanPhoto: () => void;
}

export const HomeSpotlightPane: React.FC<HomeSpotlightPaneProps> = ({
  products,
  scannedProduct,
  query,
  selectedLocation,
  onAdd,
  onClearSpotlight,
  onOpenCatalog,
  onScanCamera,
  onScanPhoto,
}) => {
  const [selectedQty, setSelectedQty] = useState(1);

  // Filter products by query
  const cleanQ = query.trim().toLowerCase();
  const searchMatches = cleanQ
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(cleanQ) ||
          p.brand.toLowerCase().includes(cleanQ) ||
          p.sku.toLowerCase().includes(cleanQ) ||
          p.barcode.includes(cleanQ)
      )
    : [];

  const activeSpotlightProduct =
    scannedProduct || (cleanQ && searchMatches.length === 1 ? searchMatches[0] : null);

  // Total stock counters
  const totalLocal = products.reduce((acc, p) => acc + (p.stockLocal > 0 ? 1 : 0), 0);
  const totalEc = products.reduce((acc, p) => acc + (p.stockBodegaEc > 0 ? 1 : 0), 0);
  const totalUsa = products.reduce((acc, p) => acc + (p.stockBodegaUsa > 0 ? 1 : 0), 0);

  // If a single product is in spotlight
  if (activeSpotlightProduct) {
    const p = activeSpotlightProduct;
    const stockInCurrentLoc =
      selectedLocation === 'local'
        ? p.stockLocal
        : selectedLocation === 'bodega_ec'
        ? p.stockBodegaEc
        : p.stockBodegaUsa;

    return (
      <div className="flex-1 bg-[#181B20] border border-[#282D37] rounded-3xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto relative shadow-xl">
        {/* Close spotlight */}
        <button
          onClick={onClearSpotlight}
          className="absolute top-6 right-6 p-2 rounded-full bg-[#22262E] hover:bg-slate-700 text-slate-300 hover:text-white transition"
          title="Cerrar vista destacada"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 flex-1">
          {/* Giant perfume image */}
          <div className="w-56 h-56 sm:w-72 sm:h-72 lg:w-84 lg:h-84 shrink-0 rounded-3xl bg-[#22262E] border border-slate-700/60 p-6 flex items-center justify-center relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
            <img
              src={p.imageUrl || '/logo_falconi.png'}
              alt={p.name}
              className="max-h-full max-w-full object-contain filter drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)] transition duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo_falconi.png';
              }}
            />
          </div>

          {/* Product Info */}
          <div className="flex-1 flex flex-col justify-center text-left">
            <span className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-1">
              {p.brand}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-2">
              {p.name}
            </h2>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-4">
              {p.sku && (
                <span className="px-2.5 py-1 rounded-lg bg-[#22262E] border border-slate-700 font-mono">
                  SKU: {p.sku}
                </span>
              )}
              {p.barcode && (
                <span className="px-2.5 py-1 rounded-lg bg-[#22262E] border border-slate-700 font-mono">
                  BARCODE: {p.barcode}
                </span>
              )}
            </div>

            {/* Warehouse Stock breakdown */}
            <div className="grid grid-cols-3 gap-2 max-w-md mb-6">
              <div
                className={`p-3 rounded-2xl border text-center transition ${
                  p.stockLocal > 0
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#22262E]/40 border-slate-800 text-slate-500'
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  📍 Local
                </p>
                <p className="text-lg font-black">{p.stockLocal} disp.</p>
              </div>

              <div
                className={`p-3 rounded-2xl border text-center transition ${
                  p.stockBodegaEc > 0
                    ? 'bg-blue-950/30 border-blue-500/40 text-blue-300'
                    : 'bg-[#22262E]/40 border-slate-800 text-slate-500'
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  🏬 Bodega EC
                </p>
                <p className="text-lg font-black">{p.stockBodegaEc} disp.</p>
              </div>

              <div
                className={`p-3 rounded-2xl border text-center transition ${
                  p.stockBodegaUsa > 0
                    ? 'bg-purple-950/30 border-purple-500/40 text-purple-300'
                    : 'bg-[#22262E]/40 border-slate-800 text-slate-500'
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  🇺🇸 Bodega USA
                </p>
                <p className="text-lg font-black">{p.stockBodegaUsa} disp.</p>
              </div>
            </div>

            {/* Price & Quantity Adder */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-4 border-t border-[#282D37]">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Precio de Venta
                </p>
                <p className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight">
                  ${p.price.toFixed(2)}
                </p>
              </div>

              {/* Quantity selector */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-[#22262E] border border-slate-700 rounded-2xl p-1">
                  <button
                    onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95 transition"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="w-12 text-center text-xl font-black text-white">
                    {selectedQty}
                  </span>
                  <button
                    onClick={() => setSelectedQty(selectedQty + 1)}
                    className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95 transition"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Quick quantity chips */}
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 5].map((q) => (
                    <button
                      key={q}
                      onClick={() => setSelectedQty(q)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        selectedQty === q
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-[#22262E] text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      +{q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom add button */}
        <div className="mt-6 pt-4 border-t border-[#282D37] flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">
              Total estimado:{' '}
              <span className="text-white font-bold text-lg">
                ${(p.price * selectedQty).toFixed(2)}
              </span>
            </p>
            {p.stockLocal <= 0 && (
              <p className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                <AlertCircle size={13} /> Solo disponible en Bodega (No facturable en mostrador)
              </p>
            )}
          </div>

          {p.stockLocal > 0 ? (
            <button
              onClick={() => {
                onAdd(p, selectedQty);
                onClearSpotlight();
              }}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-base sm:text-lg tracking-wide shadow-xl shadow-amber-500/20 active:scale-[0.98] transition flex items-center gap-2"
            >
              <ShoppingBag size={22} />
              Agregar al Ticket
            </button>
          ) : (
            <div className="px-6 py-3.5 rounded-2xl bg-[#22262E] border border-slate-700 text-slate-400 font-bold text-xs sm:text-sm flex items-center gap-2">
              <Warehouse size={18} className="text-blue-400" />
              <span>Producto en Bodega (Solo Consulta)</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Case 2: Query matches multiple products
  if (cleanQ && searchMatches.length > 1) {
    return (
      <div className="flex-1 bg-[#181B20] border border-[#282D37] rounded-3xl p-6 flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            Resultados para "{query}" ({searchMatches.length})
          </h3>
          <button
            onClick={onClearSpotlight}
            className="text-xs text-slate-400 hover:text-white"
          >
            Limpiar búsqueda
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-1">
          {searchMatches.map((p) => (
            <div
              key={p.id}
              className="bg-[#22262E] border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/40 transition group"
            >
              <div className="w-full h-36 rounded-xl bg-[#181B20] p-2 flex items-center justify-center mb-3">
                <img
                  src={p.imageUrl || '/logo_falconi.png'}
                  alt={p.name}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo_falconi.png';
                  }}
                />
              </div>

              <div>
                <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider truncate">
                  {p.brand}
                </p>
                <p className="text-sm font-bold text-white line-clamp-2 leading-tight mb-2">
                  {p.name}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                <p className="text-lg font-black text-amber-400">${p.price.toFixed(2)}</p>
                {p.stockLocal > 0 ? (
                  <button
                    onClick={() => onAdd(p, 1)}
                    className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold active:scale-95 transition shadow"
                    title="Agregar al Ticket"
                  >
                    <Plus size={16} />
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 px-2 py-1 rounded-lg border border-blue-800/60">
                    En Bodega
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Case 3: Empty standby screen (Logo Falconi de lujo)
  return (
    <div className="flex-1 bg-[#181B20] border border-[#282D37] rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center overflow-y-auto relative shadow-xl">
      {/* Falconi Gold Emblem */}
      <div className="relative mb-4 group">
        <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-yellow-600/20 to-amber-500/20 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition duration-500" />
        <img
          src="/puntodeventa/logo_falconi.png"
          alt="Falconi Perfumes"
          className="relative w-36 h-36 sm:w-48 sm:h-48 object-contain filter drop-shadow-[0_8px_30px_rgba(212,175,55,0.4)] transition duration-500 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src.includes('/puntodeventa/')) {
              target.src = '/logo_falconi.png';
            }
          }}
        />
      </div>

      <h2 className="text-3xl sm:text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 uppercase">
        Falconi Perfumes
      </h2>
      <p className="text-xs sm:text-sm font-extrabold tracking-widest text-amber-500/80 uppercase mt-1 mb-6">
        Punto de Venta Oficial &bull; iPad Pro Edition
      </p>

      {/* Suggestion & quick scan box */}
      <div className="w-full max-w-xl bg-[#22262E]/70 border border-slate-700 rounded-3xl p-5 mb-8 backdrop-blur-md">
        <p className="text-xs sm:text-sm font-medium text-slate-300 mb-4 flex items-center justify-center gap-2">
          <QrCode size={18} className="text-amber-400" />
          Escanea un código de barras o escribe en el buscador superior
        </p>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={onScanCamera}
            className="p-3 rounded-2xl bg-[#181B20] hover:bg-[#1f232a] border border-slate-700 text-slate-200 hover:text-amber-400 font-bold text-xs flex flex-col items-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <QrCode size={20} className="text-amber-400" />
            <span>Escanear</span>
          </button>

          <button
            onClick={onScanPhoto}
            className="p-3 rounded-2xl bg-[#181B20] hover:bg-[#1f232a] border border-slate-700 text-slate-200 hover:text-amber-400 font-bold text-xs flex flex-col items-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <Camera size={20} className="text-amber-400" />
            <span>Por Foto</span>
          </button>

          <button
            onClick={() => onOpenCatalog('local')}
            className="p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex flex-col items-center gap-1.5 transition active:scale-95 shadow-lg shadow-amber-500/20"
          >
            <ShoppingBag size={20} />
            <span>Ver Catálogo</span>
          </button>
        </div>
      </div>

      {/* Warehouse Stock Counters */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xl">
        <button
          onClick={() => onOpenCatalog('local')}
          className="p-3.5 rounded-2xl bg-[#22262E]/40 border border-slate-800 hover:border-emerald-500/40 text-left transition group"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            📍 Tienda Local
          </p>
          <p className="text-xl font-black text-emerald-400 group-hover:scale-105 transition">
            {totalLocal}
          </p>
          <p className="text-[10px] text-slate-500">modelos con stock</p>
        </button>

        <button
          onClick={() => onOpenCatalog('bodega_ec')}
          className="p-3.5 rounded-2xl bg-[#22262E]/40 border border-slate-800 hover:border-blue-500/40 text-left transition group"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            🏬 Bodega Ecuador
          </p>
          <p className="text-xl font-black text-blue-400 group-hover:scale-105 transition">
            {totalEc}
          </p>
          <p className="text-[10px] text-slate-500">modelos con stock</p>
        </button>

        <button
          onClick={() => onOpenCatalog('bodega_usa')}
          className="p-3.5 rounded-2xl bg-[#22262E]/40 border border-slate-800 hover:border-purple-500/40 text-left transition group"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            🇺🇸 Bodega USA
          </p>
          <p className="text-xl font-black text-purple-400 group-hover:scale-105 transition">
            {totalUsa}
          </p>
          <p className="text-[10px] text-slate-500">modelos con stock</p>
        </button>
      </div>
    </div>
  );
};
