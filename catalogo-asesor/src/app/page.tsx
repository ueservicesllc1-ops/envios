'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Sparkles, 
  RotateCw, 
  SlidersHorizontal, 
  Check, 
  Search, 
  Package, 
  Store, 
  ChevronDown,
  ArrowUpDown,
  Sun,
  Moon
} from 'lucide-react';
import { CatalogTab, PerfumeItem } from '../types/perfume';
import { perfumeCatalogService } from '../services/perfumeCatalogService';
import { favoritesService } from '../services/favoritesService';
import { PerfumeCard } from '../components/PerfumeCard';
import { PerfumeDetailModal } from '../components/PerfumeDetailModal';
import { BottomNav } from '../components/BottomNav';
import { ScannerView } from '../components/ScannerView';
import { SearchView } from '../components/SearchView';
import { FavoritesView } from '../components/FavoritesView';
import { IpadInstallPrompt } from '../components/IpadInstallPrompt';
import { useTheme } from '../context/ThemeContext';

export default function CatalogApp() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<CatalogTab>('catalogo');
  const [perfumes, setPerfumes] = useState<PerfumeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedPerfume, setSelectedPerfume] = useState<PerfumeItem | null>(null);

  // Filters for Catalog Tab
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'local' | 'bodega-ec' | 'bodega-usa' | 'dupes'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc' | 'name-asc'>('popular');
  const [visibleCount, setVisibleCount] = useState<number>(24);

  // Load initial data
  const loadPerfumes = useCallback(async (force = false) => {
    if (force) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await perfumeCatalogService.getAllPerfumes(force);
      setPerfumes(data);
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPerfumes(false);
    setFavorites(favoritesService.getFavorites());
  }, [loadPerfumes]);

  // Toggle favorite handler
  const handleToggleFavorite = useCallback((id: string) => {
    const updated = favoritesService.toggleFavorite(id);
    setFavorites(updated);
  }, []);

  const handleClearFavorites = useCallback(() => {
    favoritesService.clearFavorites();
    setFavorites([]);
  }, []);

  // Compute available brands with counts
  const brandList: { name: string; label?: string; count: number }[] = useMemo(() => {
    const map = new Map<string, number>();
    perfumes.forEach(p => {
      const b = p.brand?.trim() || 'General';
      map.set(b, (map.get(b) || 0) + 1);
    });

    const sorted = Array.from(map.entries())
      .filter(([name]) => name.toLowerCase() !== 'general' && name.length > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return [{ name: 'all', label: 'Todas', count: perfumes.length }, ...sorted];
  }, [perfumes]);

  // Filter and sort catalog items
  const filteredCatalogPerfumes = useMemo(() => {
    let result = perfumes;

    // Brand filter
    if (selectedBrand !== 'all') {
      result = result.filter(p => p.brand.toLowerCase() === selectedBrand.toLowerCase());
    }

    // Stock / dupe filter by warehouse locations
    if (stockFilter === 'local') {
      result = result.filter(p => (p.stock?.local || 0) > 0);
    } else if (stockFilter === 'bodega-ec') {
      result = result.filter(p => (p.stock?.bodegaEc || 0) > 0);
    } else if (stockFilter === 'bodega-usa') {
      result = result.filter(p => (p.stock?.bodegaUsa || 0) > 0);
    } else if (stockFilter === 'dupes') {
      result = result.filter(p => Boolean(p.dupeOf));
    }

    // Sorting
    const sorted = [...result];
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name-asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Default: prioritize in-stock local, then dupes, then total stock
      sorted.sort((a, b) => {
        const scoreA = (a.stock?.local || 0) * 10 + (a.dupeOf ? 5 : 0) + (a.stock?.total || 0);
        const scoreB = (b.stock?.local || 0) * 10 + (b.dupeOf ? 5 : 0) + (b.stock?.total || 0);
        return scoreB - scoreA;
      });
    }

    return sorted;
  }, [perfumes, selectedBrand, stockFilter, sortBy]);

  // Paginated slice for fast rendering
  const displayedPerfumes = useMemo(() => {
    return filteredCatalogPerfumes.slice(0, visibleCount);
  }, [filteredCatalogPerfumes, visibleCount]);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans select-none transition-colors duration-250 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-black text-neutral-100'
      }`}
    >
      {/* PWA iPad Installation Prompt */}
      <IpadInstallPrompt />

      {/* Top Header Bar */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-md px-4 py-3 flex items-center justify-between transition-colors duration-250 ${
          isLight
            ? 'bg-white/95 border-b border-slate-200/90 shadow-xs'
            : 'bg-black/95 border-b border-neutral-900/80'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {/* Falconi Gold Crest */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center shadow-md shadow-amber-500/20">
            <span className="font-['Cinzel',serif] text-black font-extrabold text-sm tracking-tighter">
              F
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1
                className={`font-['Cinzel',serif] text-sm font-extrabold tracking-widest ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                FALCONI
              </h1>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase border ${
                  isLight
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                }`}
              >
                Asesor • Falconi 2026
              </span>
            </div>
            <p
              className={`text-[10px] tracking-wider uppercase font-semibold ${
                isLight ? 'text-slate-500' : 'text-neutral-400'
              }`}
            >
              Catálogo Digital de Fragancias
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Stock Count Badge */}
          <div
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              isLight
                ? 'bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-neutral-900 border-neutral-800 text-neutral-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{perfumes.length} Fragancias</span>
          </div>

          {/* Theme Toggle Button: Modo Día / Noche */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center shadow-xs ${
              isLight
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                : 'bg-neutral-900 border-neutral-800 text-amber-400 hover:text-white'
            }`}
            title={isLight ? 'Cambiar a Modo Noche' : 'Cambiar a Modo Día'}
            aria-label="Cambiar tema"
          >
            {isLight ? (
              <Sun className="w-4 h-4 text-amber-600 fill-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => loadPerfumes(true)}
            disabled={isRefreshing}
            className={`p-2 rounded-xl border active:scale-95 transition-all shadow-xs ${
              isLight
                ? 'bg-white border-slate-200 hover:border-amber-400 text-slate-700 hover:text-slate-900'
                : 'bg-neutral-900 border-neutral-800 hover:border-amber-400/50 text-neutral-300 hover:text-white'
            }`}
            title="Sincronizar catálogo"
          >
            <RotateCw className={`w-4 h-4 text-amber-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Content Area based on Active Tab */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6">
        {isLoading ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping" />
              <div className="w-16 h-16 rounded-full border-2 border-t-amber-400 border-r-amber-500/40 border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
              </div>
            </div>
            <h2
              className={`text-sm font-bold tracking-wider uppercase ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              Cargando Catálogo Falconi
            </h2>
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
              Sincronizando fragancias, dupes e inventario real...
            </p>
          </div>
        ) : (
          <>
            {/* TAB 1: CATALOG */}
            {activeTab === 'catalogo' && (
              <div className="px-3.5 pt-3 pb-24">
                {/* Horizontal Brand Pills Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
                  {brandList.map((brand) => {
                    const isSelected = selectedBrand.toLowerCase() === brand.name.toLowerCase();
                    return (
                      <button
                        key={brand.name}
                        onClick={() => {
                          setSelectedBrand(brand.name);
                          setVisibleCount(24);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/20'
                            : isLight
                            ? 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-xs'
                            : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {brand.label || brand.name}
                        <span
                          className={`ml-1 text-[10px] ${
                            isSelected
                              ? 'text-white/80'
                              : isLight
                              ? 'text-slate-400'
                              : 'text-neutral-500'
                          }`}
                        >
                          ({brand.count})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Filters: Stock, Dupes & Sort */}
                <div className="flex items-center justify-between gap-2 mb-3 px-0.5">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    <button
                      onClick={() => setStockFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-all ${
                        stockFilter === 'all'
                          ? isLight
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-neutral-800 text-white font-semibold'
                          : isLight
                          ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-xs'
                          : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      Todos en Stock
                    </button>
                    <button
                      onClick={() => setStockFilter('local')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 flex items-center gap-1 transition-all ${
                        stockFilter === 'local'
                          ? isLight
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                          : isLight
                          ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-xs'
                          : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      <Store className="w-3 h-3" />
                      Local / Tienda
                    </button>
                    <button
                      onClick={() => setStockFilter('bodega-ec')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 flex items-center gap-1 transition-all ${
                        stockFilter === 'bodega-ec'
                          ? isLight
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                          : isLight
                          ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-xs'
                          : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      <Package className="w-3 h-3" />
                      Bodega Ecuador
                    </button>
                    <button
                      onClick={() => setStockFilter('bodega-usa')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 flex items-center gap-1 transition-all ${
                        stockFilter === 'bodega-usa'
                          ? isLight
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold'
                          : isLight
                          ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-xs'
                          : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      <Package className="w-3 h-3" />
                      Bodega USA
                    </button>
                    <button
                      onClick={() => setStockFilter('dupes')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 flex items-center gap-1 transition-all ${
                        stockFilter === 'dupes'
                          ? isLight
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                          : isLight
                          ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-xs'
                          : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      Con Dupe
                    </button>
                  </div>

                  {/* Sort Selector */}
                  <div className="relative shrink-0">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className={`text-[11px] font-medium py-1 px-2 pr-6 rounded-lg appearance-none focus:outline-none focus:border-amber-400 cursor-pointer shadow-xs ${
                        isLight
                          ? 'bg-white border border-slate-200 text-slate-800'
                          : 'bg-neutral-900 border border-neutral-800 text-neutral-300'
                      }`}
                    >
                      <option value="popular">Recomendados</option>
                      <option value="price-asc">Precio: Menor</option>
                      <option value="price-desc">Precio: Mayor</option>
                      <option value="name-asc">Nombre A-Z</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
                  </div>
                </div>

                {/* Counter Bar */}
                <div
                  className={`flex items-center justify-between mb-3 px-1 text-[11px] ${
                    isLight ? 'text-slate-500' : 'text-neutral-400'
                  }`}
                >
                  <span>
                    Mostrando{' '}
                    <strong className={isLight ? 'text-slate-900' : 'text-neutral-200'}>
                      {displayedPerfumes.length}
                    </strong>{' '}
                    de{' '}
                    <strong className={isLight ? 'text-slate-900' : 'text-neutral-200'}>
                      {filteredCatalogPerfumes.length}
                    </strong>{' '}
                    perfumes
                  </span>
                  {selectedBrand !== 'all' && (
                    <button
                      onClick={() => setSelectedBrand('all')}
                      className={`font-semibold hover:underline ${
                        isLight ? 'text-amber-700' : 'text-amber-400'
                      }`}
                    >
                      Ver todas las marcas
                    </button>
                  )}
                </div>

                {/* Responsive Luxury Perfume Grid */}
                {displayedPerfumes.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5">
                      {displayedPerfumes.map((perfume) => (
                        <PerfumeCard
                          key={perfume.id}
                          perfume={perfume}
                          onSelect={(p) => setSelectedPerfume(p)}
                          onToggleFavorite={handleToggleFavorite}
                          isFavorite={favorites.includes(perfume.id)}
                        />
                      ))}
                    </div>

                    {/* Load More Button */}
                    {visibleCount < filteredCatalogPerfumes.length && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => setVisibleCount((prev) => prev + 24)}
                          className={`py-2.5 px-6 border text-xs font-bold rounded-2xl active:scale-95 transition-all shadow-sm ${
                            isLight
                              ? 'bg-white hover:bg-slate-50 border-slate-200 text-amber-700'
                              : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-amber-400'
                          }`}
                        >
                          Cargar más perfumes ({filteredCatalogPerfumes.length - visibleCount} restantes)
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-20 text-center">
                    <Package
                      className={`w-10 h-10 mx-auto mb-2 ${
                        isLight ? 'text-slate-300' : 'text-neutral-600'
                      }`}
                    />
                    <h4
                      className={`text-sm font-bold ${
                        isLight ? 'text-slate-800' : 'text-neutral-300'
                      }`}
                    >
                      Sin resultados con este filtro
                    </h4>
                    <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>
                      Prueba seleccionando otra marca o limpiando los filtros.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SCANNER */}
            {activeTab === 'escanear' && (
              <ScannerView
                onSelectPerfume={(perfume) => setSelectedPerfume(perfume)}
                onNavigateToSearch={() => setActiveTab('buscar')}
              />
            )}

            {/* TAB 3: SEARCH & AI PHOTO */}
            {activeTab === 'buscar' && (
              <SearchView
                perfumes={perfumes}
                onSelectPerfume={(perfume) => setSelectedPerfume(perfume)}
                onToggleFavorite={handleToggleFavorite}
                favorites={favorites}
              />
            )}

            {/* TAB 4: FAVORITES */}
            {activeTab === 'favoritos' && (
              <FavoritesView
                perfumes={perfumes}
                favorites={favorites}
                onSelectPerfume={(perfume) => setSelectedPerfume(perfume)}
                onToggleFavorite={handleToggleFavorite}
                onClearFavorites={handleClearFavorites}
                onNavigateToCatalog={() => setActiveTab('catalogo')}
              />
            )}
          </>
        )}
      </main>

      {/* Full Perfume Modal View */}
      {selectedPerfume && (
        <PerfumeDetailModal
          perfume={selectedPerfume}
          onClose={() => setSelectedPerfume(null)}
          isFavorite={favorites.includes(selectedPerfume.id)}
          onToggleFavorite={handleToggleFavorite}
          onSelectRelated={(related) => setSelectedPerfume(related)}
        />
      )}

      {/* Global 4-Tab Bottom Navigation Bar */}
      <BottomNav
        currentTab={activeTab}
        onTabChange={(tab: CatalogTab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        favoritesCount={favorites.length}
      />
    </div>
  );
}
