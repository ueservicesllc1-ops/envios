'use client';

import React, { useState, useMemo } from 'react';
import { Product, PosLocationId, POS_LOCATIONS } from '../types/pos';
import { Plus, Search, Sparkles, Package } from 'lucide-react';

interface CatalogPaneProps {
  products: Product[];
  selectedLocation: PosLocationId;
  onSetLocation?: (loc: PosLocationId) => void;
  showWarehouseTabs?: boolean;
  onAdd: (product: Product) => void;
}

export const CatalogPane: React.FC<CatalogPaneProps> = ({
  products,
  selectedLocation,
  onSetLocation,
  showWarehouseTabs = false,
  onAdd,
}) => {
  const [selectedBrand, setSelectedBrand] = useState('Todos');

  // Extract unique brands
  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand && p.brand.trim()) set.add(p.brand.trim());
    });
    return ['Todos', ...Array.from(set).sort()];
  }, [products]);

  // Filter products by location stock and brand
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const stock =
        selectedLocation === 'local'
          ? p.stockLocal
          : selectedLocation === 'bodega_ec'
          ? p.stockBodegaEc
          : p.stockBodegaUsa;

      if (stock <= 0) return false;
      if (selectedBrand !== 'Todos' && p.brand !== selectedBrand) return false;
      return true;
    });
  }, [products, selectedLocation, selectedBrand]);

  const loc = POS_LOCATIONS[selectedLocation];

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      {/* Warehouse Selector & Brand Chips Header */}
      <div className="flex flex-col gap-2.5 pb-3 shrink-0">
        {/* Warehouse Tabs (if enabled in Bodegas view) */}
        {showWarehouseTabs && onSetLocation && (
          <div className="flex items-center gap-2">
            {(['bodega_ec', 'bodega_usa'] as PosLocationId[]).map((lid) => {
              const active = selectedLocation === lid;
              return (
                <button
                  key={lid}
                  onClick={() => onSetLocation(lid)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    active
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-[#22262E] text-slate-300 hover:bg-[#2b303a] border border-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${active ? 'bg-slate-950' : 'bg-amber-400'}`} />
                  {POS_LOCATIONS[lid].label}
                </button>
              );
            })}
          </div>
        )}

        {/* Brand Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700 select-none">
          {brands.slice(0, 20).map((brand) => {
            const isSelected = selectedBrand === brand;
            return (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                    : 'bg-[#22262E]/70 border-slate-700/60 text-slate-300 hover:bg-[#22262E] hover:text-white'
                }`}
              >
                {brand}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Cards per Row Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center p-6 bg-[#181B20] rounded-3xl border border-[#282D37]">
            <Package size={40} className="text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">
              No hay perfumes disponibles con estos filtros
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Verifica el stock en {loc.label} o selecciona otra marca
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-3.5">
            {filteredProducts.map((p) => {
              const stock =
                selectedLocation === 'local'
                  ? p.stockLocal
                  : selectedLocation === 'bodega_ec'
                  ? p.stockBodegaEc
                  : p.stockBodegaUsa;

              return (
                <div
                  key={p.id}
                  onClick={() => onAdd(p)}
                  className="bg-[#181B20] border border-[#282D37] hover:border-amber-500/40 rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/5 group cursor-pointer relative"
                >
                  {/* Stock pill */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        stock > 2
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : stock === 1
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                          : 'bg-red-950/80 text-red-400 border border-red-800/60'
                      }`}
                    >
                      {stock} disp.
                    </span>
                  </div>

                  {/* Perfume Image */}
                  <div className="w-full h-32 sm:h-36 rounded-xl bg-[#22262E] p-2 flex items-center justify-center mb-2.5 overflow-hidden">
                    <img
                      src={p.imageUrl || '/logo_falconi.png'}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300 filter drop-shadow"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo_falconi.png';
                      }}
                    />
                  </div>

                  {/* Brand & Name */}
                  <div className="mb-2">
                    <p className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider truncate">
                      {p.brand}
                    </p>
                    <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">
                      {p.name}
                    </h4>
                  </div>

                  {/* Price & Add Button */}
                  <div className="pt-2 border-t border-[#282D37] flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-semibold">Precio</p>
                      <p className="text-base sm:text-lg font-black text-amber-400 leading-none">
                        ${p.price.toFixed(2)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdd(p);
                      }}
                      className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 active:scale-95 transition shadow"
                    >
                      <Plus size={14} />
                      <span className="hidden sm:inline">Agregar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
