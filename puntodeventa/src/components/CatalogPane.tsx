'use client';

import React, { useState, useMemo } from 'react';
import { Product, PosLocationId, POS_LOCATIONS } from '../types/pos';
import {
  Plus,
  Eye,
  Search,
  Sparkles,
  Package,
  X,
  Warehouse,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface CatalogPaneProps {
  products: Product[];
  selectedLocation: PosLocationId;
  onSetLocation?: (loc: PosLocationId) => void;
  showWarehouseTabs?: boolean;
  searchQuery?: string;
  onAdd: (product: Product) => void;
}

export const CatalogPane: React.FC<CatalogPaneProps> = ({
  products,
  selectedLocation,
  onSetLocation,
  showWarehouseTabs = false,
  searchQuery = '',
  onAdd,
}) => {
  const [selectedBrand, setSelectedBrand] = useState('Todos');
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const isBodega = selectedLocation === 'bodega_ec' || selectedLocation === 'bodega_usa' || selectedLocation === 'todas_bodegas';

  // Extraer marcas únicas disponibles EXCLUSIVAMENTE en la ubicación seleccionada
  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const stock =
        selectedLocation === 'local'
          ? p.stockLocal
          : selectedLocation === 'bodega_ec'
          ? p.stockBodegaEc
          : selectedLocation === 'bodega_usa'
          ? p.stockBodegaUsa
          : p.stockBodegaEc + p.stockBodegaUsa;

      if (stock > 0 && p.brand && p.brand.trim()) {
        set.add(p.brand.trim());
      }
    });
    return ['Todos', ...Array.from(set).sort()];
  }, [products, selectedLocation]);

  // Si la marca seleccionada ya no existe en la ubicación activa, resetear a Todos
  React.useEffect(() => {
    if (selectedBrand !== 'Todos' && !brands.includes(selectedBrand)) {
      setSelectedBrand('Todos');
    }
  }, [brands, selectedBrand]);

  // Filtrar productos estrictamente por stock de la ubicación, marca y búsqueda
  const filteredProducts = useMemo(() => {
    const cleanQ = searchQuery ? searchQuery.trim().toLowerCase() : '';

    return products.filter((p) => {
      // 1. Stock estricto en la ubicación actual
      const stock =
        selectedLocation === 'local'
          ? p.stockLocal
          : selectedLocation === 'bodega_ec'
          ? p.stockBodegaEc
          : selectedLocation === 'bodega_usa'
          ? p.stockBodegaUsa
          : p.stockBodegaEc + p.stockBodegaUsa;

      if (stock <= 0) return false;

      // 2. Búsqueda por texto si existe
      if (cleanQ) {
        const matchesQuery =
          p.name.toLowerCase().includes(cleanQ) ||
          p.brand.toLowerCase().includes(cleanQ) ||
          p.sku.toLowerCase().includes(cleanQ) ||
          p.barcode.includes(cleanQ);
        if (!matchesQuery) return false;
      }

      // 3. Marca seleccionada
      if (selectedBrand !== 'Todos' && p.brand !== selectedBrand) return false;

      return true;
    });
  }, [products, selectedLocation, selectedBrand, searchQuery]);

  const loc = POS_LOCATIONS[selectedLocation] || POS_LOCATIONS.local;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden select-none">
      {/* Warehouse Selector & Brand Chips Header */}
      <div className="flex flex-col gap-2.5 pb-3 shrink-0">
        {/* Warehouse Tabs (if enabled in Bodegas view) */}
        {showWarehouseTabs && onSetLocation && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(['bodega_ec', 'bodega_usa'] as PosLocationId[]).map((lid) => {
                const active = selectedLocation === lid;
                return (
                  <button
                    key={lid}
                    onClick={() => onSetLocation(lid)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      active
                        ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                        : 'bg-[#22262E] text-slate-300 hover:bg-[#2b303a] border border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        active ? 'bg-slate-950' : 'bg-amber-400'
                      }`}
                    />
                    {POS_LOCATIONS[lid].label}
                  </button>
                );
              })}
            </div>

            {/* Read-only reminder */}
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold">
              <Info size={14} />
              <span>Modo Consulta (No facturable en mostrador)</span>
            </span>
          </div>
        )}

        {/* Brand Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700 select-none">
          {brands.slice(0, 25).map((brand) => {
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
                  onClick={() => {
                    if (isBodega) {
                      // En bodega: Solo ver detalle y foto en grande (NO agrega a ticket)
                      setDetailProduct(p);
                    } else {
                      // En local: Facturar / agregar a ticket
                      onAdd(p);
                    }
                  }}
                  className={`bg-[#181B20] border rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 group cursor-pointer relative ${
                    isBodega
                      ? 'border-[#282D37] hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5'
                      : 'border-[#282D37] hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5'
                  }`}
                >
                  {/* Stock pill */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        isBodega
                          ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                          : stock > 2
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : stock === 1
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                          : 'bg-red-950/80 text-red-400 border border-red-800/60'
                      }`}
                    >
                      {stock} en {selectedLocation === 'local' ? 'Local' : selectedLocation === 'bodega_ec' ? 'EC' : 'USA'}
                    </span>
                  </div>

                  {/* Perfume Image */}
                  <div className="w-full h-32 sm:h-36 rounded-xl bg-[#22262E] p-2 flex items-center justify-center mb-2.5 overflow-hidden">
                    <img
                      src={p.imageUrl || '/puntodeventa/logo_falconi.png'}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300 filter drop-shadow"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/puntodeventa/logo_falconi.png';
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

                  {/* Price & Action Button */}
                  <div className="pt-2 border-t border-[#282D37] flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-semibold">Precio</p>
                      <p className="text-base sm:text-lg font-black text-amber-400 leading-none">
                        ${p.price.toFixed(2)}
                      </p>
                    </div>

                    {isBodega ? (
                      /* En Bodegas: Botón Ver Detalle (NO agregar a factura) */
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailProduct(p);
                        }}
                        className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#22262E] hover:bg-[#2b303a] text-blue-400 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-1 active:scale-95 transition"
                      >
                        <Eye size={14} />
                        <span className="hidden sm:inline">Ver</span>
                      </button>
                    ) : (
                      /* En Tienda Local: Botón Agregar a Factura */
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
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bodega Product Detail Modal (Foto en grande + Descripción) */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 select-none">
          <div className="w-full max-w-2xl bg-[#181B20] border border-[#282D37] rounded-3xl p-6 sm:p-8 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setDetailProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-[#22262E] hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Cerrar"
            >
              <X size={20} />
            </button>

            {/* Aviso informativo de no facturación */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2.5 text-amber-300 text-xs mb-5">
              <AlertTriangle size={18} className="shrink-0 text-amber-400" />
              <span>
                <strong>Producto en Bodega (Solo Consulta):</strong> Este perfume no se encuentra en el mostrador del local, por lo tanto no se puede facturar de forma inmediata.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start mb-6">
              {/* Foto en grande */}
              <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl bg-[#22262E] border border-slate-700/80 p-4 flex items-center justify-center shrink-0">
                <img
                  src={detailProduct.imageUrl || '/puntodeventa/logo_falconi.png'}
                  alt={detailProduct.name}
                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/puntodeventa/logo_falconi.png';
                  }}
                />
              </div>

              {/* Datos y Stock */}
              <div className="flex-1 text-left space-y-3">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                    {detailProduct.brand}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mt-0.5">
                    {detailProduct.name}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  {detailProduct.sku && (
                    <span className="px-2.5 py-1 rounded-lg bg-[#22262E] border border-slate-700 font-mono">
                      SKU: {detailProduct.sku}
                    </span>
                  )}
                  {detailProduct.barcode && (
                    <span className="px-2.5 py-1 rounded-lg bg-[#22262E] border border-slate-700 font-mono">
                      CÓDIGO: {detailProduct.barcode}
                    </span>
                  )}
                </div>

                {/* Precio */}
                <div className="p-3 rounded-xl bg-[#22262E] border border-slate-700/60 inline-block">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Precio de Venta</p>
                  <p className="text-2xl font-black text-amber-400">
                    ${detailProduct.price.toFixed(2)}
                  </p>
                </div>

                {/* Desglose de Stock */}
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Disponibilidad por Bodega:
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-xl bg-[#22262E] border border-slate-700 text-center">
                      <p className="text-[10px] text-slate-400">Tienda Local</p>
                      <p className={`font-black text-sm ${detailProduct.stockLocal > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {detailProduct.stockLocal} disp.
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-blue-950/40 border border-blue-800/60 text-center">
                      <p className="text-[10px] text-blue-300">Bodega EC</p>
                      <p className="font-black text-sm text-blue-400">
                        {detailProduct.stockBodegaEc} disp.
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-800/60 text-center">
                      <p className="text-[10px] text-purple-300">Bodega USA</p>
                      <p className="font-black text-sm text-purple-400">
                        {detailProduct.stockBodegaUsa} disp.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Descripción del producto */}
            <div className="p-4 rounded-2xl bg-[#22262E]/70 border border-slate-700/80 mb-6 text-left">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Info size={14} className="text-amber-400" />
                Descripción del Perfume:
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {detailProduct.description && detailProduct.description.trim()
                  ? detailProduct.description
                  : 'Fragancia original Falconi Perfumes. Disponible para despacho y traslado desde bodega principal hacia tienda física.'}
              </p>
            </div>

            {/* Botón Cerrar */}
            <button
              onClick={() => setDetailProduct(null)}
              className="w-full py-3 rounded-xl bg-[#22262E] hover:bg-slate-700 text-white font-bold text-sm transition"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
