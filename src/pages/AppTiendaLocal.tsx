import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Store,
  Search,
  RefreshCw,
  X,
  Package,
  Receipt,
  Sparkles,
  Tag,
  Share2,
  TrendingUp,
  LayoutGrid,
  List,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Warehouse,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Product } from '../types';
import { productService } from '../services/productService';
import toast from 'react-hot-toast';
import { useAnonymousAuth } from '../hooks/useAnonymousAuth';
import { useAuth } from '../hooks/useAuth';
import { getSellerSession } from '../utils/sellerSession';

export interface TiendaProductItem {
  inventoryDocId: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  cost: number;
  location: string;
  bodegaEcuadorStock: number;
}

const AppTiendaLocal: React.FC = () => {
  const navigate = useNavigate();

  // Autenticación (web o app móvil anónima / PIN)
  const { user: authUser, isAdmin: isAuthAdmin } = useAuth();
  const { user: anonUser, loading: authLoading, error: authError } = useAnonymousAuth();
  const user = authUser || anonUser;
  const session = getSellerSession();
  const isAdmin = isAuthAdmin || session?.isAdmin || Boolean(authUser);

  // Estados de inventario
  const [items, setItems] = useState<TiendaProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'good'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'stock-desc' | 'stock-asc' | 'price-desc' | 'price-asc'>('name-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal de imagen
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Carga inicial
  useEffect(() => {
    if (!authLoading && user) {
      loadTiendaStock();
    }

    if (authError) {
      toast.error('Error de autenticación. Por favor, recarga la página.');
    }
  }, [authLoading, user, authError]);

  const loadTiendaStock = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      else setLoading(true);

      const [productsData, invSnap] = await Promise.all([
        productService.getAll(),
        getDocs(collection(db, 'inventory'))
      ]);

      const productMap = new Map<string, Product>();
      productsData.forEach(p => productMap.set(p.id, p));

      // 1. Mapear stock en Bodega Ecuador como respaldo
      const ecuadorStock = new Map<string, number>();
      invSnap.docs.forEach(d => {
        const data = d.data() as any;
        const loc = String(data.location || '').toLowerCase();
        if (loc.includes('ecuador') && !loc.includes('tienda') && !loc.includes('local')) {
          const q = Number(data.quantity) || 0;
          if (data.productId) {
            ecuadorStock.set(data.productId, (ecuadorStock.get(data.productId) || 0) + q);
          }
        }
      });

      // 2. Mapear y consolidar stock en Tienda Local
      const itemsByProduct = new Map<string, TiendaProductItem>();

      invSnap.docs.forEach(docSnap => {
        const inv = docSnap.data() as any;
        const loc = String(inv.location || '').toLowerCase();
        const isTienda = loc.includes('tienda') || loc.includes('local') || loc.includes('mostrador');

        if (isTienda && inv.productId) {
          const qty = Number(inv.quantity) || 0;
          if (qty > 0) {
            const prod = productMap.get(inv.productId) || inv.product || {
              id: inv.productId,
              name: 'Perfume sin catálogo',
              category: 'Perfumes',
              salePrice2: inv.unitPrice || 0,
              salePrice1: inv.unitPrice || 0,
              cost: inv.cost || 0
            };

            const basePrice = Number(prod.salePrice2 || prod.pvp || prod.salePrice1 || inv.unitPrice || 0);
            const ecStock = ecuadorStock.get(inv.productId) || 0;

            const existing = itemsByProduct.get(inv.productId);
            if (existing) {
              existing.quantity += qty;
              // Si no tenía precio asignado o era 0, actualizarlo
              if (!existing.unitPrice && basePrice > 0) {
                existing.unitPrice = basePrice;
              }
            } else {
              itemsByProduct.set(inv.productId, {
                inventoryDocId: docSnap.id,
                productId: inv.productId,
                product: prod,
                quantity: qty,
                unitPrice: basePrice,
                cost: Number(inv.cost || prod.cost || 0),
                location: inv.location || 'Tienda Local',
                bodegaEcuadorStock: ecStock
              });
            }
          }
        }
      });

      const list = Array.from(itemsByProduct.values());
      // Orden por defecto: nombre A-Z
      list.sort((a, b) => (a.product.name || '').localeCompare(b.product.name || ''));
      setItems(list);

      if (showToast) {
        toast.success(`Inventario actualizado: ${list.length} perfumes en tienda`);
      }
    } catch (err) {
      console.error('Error al cargar inventario de Tienda Local:', err);
      toast.error('Error al cargar inventario de Tienda Local');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Lista de marcas únicas disponibles en Tienda Local
  const uniqueBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    items.forEach(it => {
      const b = (it.product.brand || '').trim();
      if (b) brandsSet.add(b);
    });
    return Array.from(brandsSet).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Filtrado y Ordenamiento
  const filteredItems = useMemo(() => {
    let result = items.filter(item => {
      const query = searchTerm.toLowerCase().trim();
      const name = (item.product.name || '').toLowerCase();
      const sku = (item.product.sku || '').toLowerCase();
      const brand = (item.product.brand || '').toLowerCase();
      const barcode = (item.product.barcode || '').toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        sku.includes(query) ||
        brand.includes(query) ||
        barcode.includes(query);

      const matchesBrand =
        selectedBrand === 'all' ||
        (item.product.brand || '').toLowerCase() === selectedBrand.toLowerCase();

      let matchesStock = true;
      if (stockFilter === 'low') {
        matchesStock = item.quantity <= 2;
      } else if (stockFilter === 'good') {
        matchesStock = item.quantity >= 3;
      }

      return matchesSearch && matchesBrand && matchesStock;
    });

    // Ordenamiento
    result.sort((a, b) => {
      if (sortBy === 'name-asc') {
        return (a.product.name || '').localeCompare(b.product.name || '');
      }
      if (sortBy === 'name-desc') {
        return (b.product.name || '').localeCompare(a.product.name || '');
      }
      if (sortBy === 'stock-desc') {
        return b.quantity - a.quantity;
      }
      if (sortBy === 'stock-asc') {
        return a.quantity - b.quantity;
      }
      if (sortBy === 'price-desc') {
        return b.unitPrice - a.unitPrice;
      }
      if (sortBy === 'price-asc') {
        return a.unitPrice - b.unitPrice;
      }
      return 0;
    });

    return result;
  }, [items, searchTerm, selectedBrand, stockFilter, sortBy]);

  // Métricas totales
  const totalUniqueProducts = items.length;
  const totalUnits = useMemo(() => items.reduce((acc, it) => acc + it.quantity, 0), [items]);
  const totalStockValue = useMemo(() => items.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0), [items]);

  // Compartir inventario filtrado por WhatsApp
  const handleShareStockWhatsApp = () => {
    if (filteredItems.length === 0) {
      toast.error('No hay productos para compartir');
      return;
    }

    const lines = filteredItems.slice(0, 35).map((it, idx) => {
      const pName = it.product.name;
      const price = it.unitPrice > 0 ? ` - $${it.unitPrice.toFixed(2)}` : '';
      return `${idx + 1}. *${pName}* (${it.quantity} disp.)${price}`;
    });

    const header = `🏪 *STOCK DISPONIBLE EN TIENDA LOCAL - COMPRAS EXPRESS*\n` +
      `📅 Fecha: ${new Date().toLocaleDateString('es-EC')}\n` +
      `📍 Mostrador Falconí Perfumes\n\n`;

    const footer = filteredItems.length > 35
      ? `\n\n... y ${filteredItems.length - 35} perfumes más disponibles en tienda.`
      : `\n\n✨ ¡Precios y stock sujetos a disponibilidad inmediata!`;

    const text = encodeURIComponent(header + lines.join('\n') + footer);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-semibold text-sm">Cargando inventario de Tienda Local...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 font-sans select-none">
      {/* ─── HEADER PRINCIPAL ────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 text-white sticky top-0 z-40 shadow-lg px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/app')}
              className="p-2 bg-white/15 hover:bg-white/25 rounded-xl transition-all active:scale-95 text-white"
              title="Volver al menú"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <Store className="w-5 h-5 text-emerald-200" />
                <h1 className="text-lg font-bold leading-tight tracking-tight">Tienda Local</h1>
              </div>
              <p className="text-[11px] text-emerald-100 font-medium">
                {totalUniqueProducts} productos • {totalUnits} unidades en mostrador
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadTiendaStock(true)}
              disabled={isRefreshing}
              className="p-2 bg-white/15 hover:bg-white/25 rounded-xl transition-all active:scale-95 text-white"
              title="Actualizar stock"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/posmobil')}
              className="flex items-center space-x-1.5 bg-white text-emerald-800 hover:bg-emerald-50 px-3 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
            >
              <Receipt className="w-4 h-4 text-purple-600" />
              <span>Vender POS</span>
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-200" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar perfume, marca o SKU..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white placeholder-emerald-200 text-sm focus:outline-none focus:ring-2 focus:ring-white/60 transition-all border border-white/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-emerald-200 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ─── FILTROS RÁPIDOS Y VISTA ──────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-[108px] z-30 shadow-sm px-4 py-2.5 space-y-2">
        {/* Barra superior de controles: Modo Vista, Orden y WhatsApp */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">
              {filteredItems.length} {filteredItems.length === 1 ? 'resultado' : 'resultados'}
            </span>
            {filteredItems.length !== items.length && (
              <button
                onClick={() => { setSearchTerm(''); setSelectedBrand('all'); setStockFilter('all'); }}
                className="text-emerald-600 font-semibold underline text-[11px]"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Selector de Orden */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-100 text-slate-700 text-xs rounded-lg px-2 py-1 border-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="name-asc">Nombre A-Z</option>
              <option value="name-desc">Nombre Z-A</option>
              <option value="stock-desc">Mayor Stock</option>
              <option value="stock-asc">Menor Stock</option>
              <option value="price-desc">Mayor Precio</option>
              <option value="price-asc">Menor Precio</option>
            </select>

            {/* Alternar Grid / List */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-400'}`}
                title="Vista cuadrícula"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded ${viewMode === 'list' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-400'}`}
                title="Vista lista"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Compartir WhatsApp */}
            <button
              onClick={handleShareStockWhatsApp}
              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg active:scale-95 transition-all"
              title="Compartir por WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Chips de Marcas (Horizontal Scroll) */}
        {uniqueBrands.length > 0 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setSelectedBrand('all')}
              className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-all ${
                selectedBrand === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas ({items.length})
            </button>
            {uniqueBrands.map(b => {
              const count = items.filter(it => (it.product.brand || '').toLowerCase() === b.toLowerCase()).length;
              return (
                <button
                  key={b}
                  onClick={() => setSelectedBrand(selectedBrand === b ? 'all' : b)}
                  className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-all ${
                    selectedBrand.toLowerCase() === b.toLowerCase()
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {b} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Filtros de nivel de Stock */}
        <div className="flex items-center space-x-2 pt-0.5 text-xs">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-2.5 py-0.5 rounded-md font-medium text-[11px] transition-all ${
              stockFilter === 'all'
                ? 'bg-slate-800 text-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setStockFilter('good')}
            className={`px-2.5 py-0.5 rounded-md font-medium text-[11px] transition-all flex items-center space-x-1 ${
              stockFilter === 'good'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <span>Stock Óptimo (3+)</span>
          </button>
          <button
            onClick={() => setStockFilter('low')}
            className={`px-2.5 py-0.5 rounded-md font-medium text-[11px] transition-all flex items-center space-x-1 ${
              stockFilter === 'low'
                ? 'bg-amber-600 text-white'
                : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <span>Stock Bajo (1-2)</span>
          </button>
        </div>
      </div>

      {/* ─── RESUMEN DE MÉTRICAS (KPIs) ───────────────────────────── */}
      <div className="px-4 pt-3 pb-1">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Perfumes</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="text-lg font-extrabold text-slate-800">{totalUniqueProducts}</span>
              <span className="text-[10px] text-slate-400">ítems</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Unidades</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="text-lg font-extrabold text-emerald-600">{totalUnits}</span>
              <span className="text-[10px] text-emerald-600/70">disp.</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Mostrador</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="text-base font-extrabold text-blue-700">
                ${totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── LISTA / CUADRÍCULA DE PRODUCTOS ──────────────────────── */}
      <div className="p-4">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm mt-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Store className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No se encontraron productos</h3>
            <p className="text-xs text-slate-500 mb-4">
              {searchTerm || selectedBrand !== 'all' || stockFilter !== 'all'
                ? 'Prueba ajustando los filtros o el término de búsqueda.'
                : 'Actualmente no hay perfumes con stock registrado en Tienda Local.'}
            </p>
            {(searchTerm || selectedBrand !== 'all' || stockFilter !== 'all') ? (
              <button
                onClick={() => { setSearchTerm(''); setSelectedBrand('all'); setStockFilter('all'); }}
                className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-all"
              >
                Restablecer Filtros
              </button>
            ) : isAdmin ? (
              <button
                onClick={() => navigate('/app/recibir')}
                className="bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-all"
              >
                Recibir Mercadería de Bodega
              </button>
            ) : null}
          </div>
        ) : viewMode === 'grid' ? (
          /* VISTA EN CUADRÍCULA (2 COLUMNAS) */
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const isLastUnit = item.quantity === 1;
              const isLowStock = item.quantity <= 2;

              return (
                <div
                  key={item.inventoryDocId + item.productId}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col"
                >
                  {/* Contenedor de Imagen Cuadrado */}
                  <div className="relative w-full pt-[100%] bg-slate-100 group cursor-pointer overflow-hidden">
                    <div
                      className="absolute inset-0"
                      onClick={() => item.product.imageUrl && setSelectedImage(item.product.imageUrl)}
                    >
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                          <Package className="w-10 h-10 mb-1" />
                          <span className="text-[10px]">Sin imagen</span>
                        </div>
                      )}
                    </div>

                    {/* Badge de Stock en Tienda Local */}
                    <div
                      className={`absolute top-2 right-2 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full shadow-md z-10 flex items-center space-x-1 ${
                        isLastUnit
                          ? 'bg-red-500 animate-pulse'
                          : isLowStock
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                    >
                      <span>Stock: {item.quantity}</span>
                    </div>

                    {/* Badge de Bodega Ecuador (si hay respaldo) */}
                    {item.bodegaEcuadorStock > 0 && (
                      <div
                        className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md shadow-xs z-10 flex items-center space-x-1"
                        title="Stock disponible en Bodega Ecuador"
                      >
                        <Warehouse className="w-3 h-3 text-teal-300" />
                        <span>EC: +{item.bodegaEcuadorStock}</span>
                      </div>
                    )}
                  </div>

                  {/* Info del Producto */}
                  <div className="p-2.5 flex flex-col flex-1 justify-between">
                    <div>
                      {item.product.brand && (
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block truncate">
                          {item.product.brand}
                        </span>
                      )}
                      <h3
                        className="text-xs font-semibold text-slate-900 line-clamp-2 leading-tight mt-0.5 mb-1"
                        title={item.product.name}
                      >
                        {item.product.name}
                      </h3>
                      {item.product.sku && (
                        <p className="text-[10px] text-slate-400 truncate">
                          SKU: {item.product.sku}
                        </p>
                      )}
                    </div>

                    {/* Precios y Botón de Vender */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-[10px] text-slate-400 font-medium">Precio</span>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-emerald-700">
                            ${item.unitPrice.toFixed(2)}
                          </span>
                          {item.product.pvp && item.product.pvp !== item.unitPrice && (
                            <span className="text-[9px] text-slate-400 line-through block">
                              PVP ${item.product.pvp.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botón rápido Vender en POS */}
                      <button
                        onClick={() => navigate(`/posmobil?search=${encodeURIComponent(item.product.name)}`)}
                        className="w-full bg-slate-900 hover:bg-purple-900 active:scale-95 text-white py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-all shadow-xs"
                      >
                        <Receipt className="w-3.5 h-3.5 text-purple-400" />
                        <span>Vender en POS</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* VISTA EN LISTA (DETALLADA) */
          <div className="space-y-2.5">
            {filteredItems.map((item) => {
              const isLastUnit = item.quantity === 1;
              const isLowStock = item.quantity <= 2;

              return (
                <div
                  key={item.inventoryDocId + item.productId}
                  className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center space-x-3"
                >
                  {/* Thumbnail de Imagen */}
                  <div
                    className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden relative cursor-pointer"
                    onClick={() => item.product.imageUrl && setSelectedImage(item.product.imageUrl)}
                  >
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Detalles */}
                  <div className="flex-1 min-w-0">
                    {item.product.brand && (
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block truncate">
                        {item.product.brand}
                      </span>
                    )}
                    <h3 className="text-xs font-semibold text-slate-900 truncate">
                      {item.product.name}
                    </h3>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 truncate">
                        SKU: {item.product.sku || 'N/A'}
                      </span>
                      {item.bodegaEcuadorStock > 0 && (
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                          Bodega: {item.bodegaEcuadorStock}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-xs font-extrabold text-emerald-700">
                          ${item.unitPrice.toFixed(2)}
                        </span>
                        {item.product.pvp && item.product.pvp !== item.unitPrice && (
                          <span className="text-[9px] text-slate-400 line-through">
                            ${item.product.pvp.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Stock badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isLastUnit
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        Stock: {item.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Botón rápido POS */}
                  <button
                    onClick={() => navigate(`/posmobil?search=${encodeURIComponent(item.product.name)}`)}
                    className="p-2 bg-slate-100 hover:bg-purple-100 active:scale-95 text-slate-700 hover:text-purple-700 rounded-xl transition-all"
                    title="Vender en POS"
                  >
                    <Receipt className="w-5 h-5 text-purple-600" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── BANNER ADMIN (ACCESO A GESTIÓN COMPLETA) ─────────────── */}
      {isAdmin && (
        <div className="px-4 mt-2 mb-6">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-4 text-white shadow-md flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/10 rounded-xl text-teal-300">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight">Panel Administrador Tienda Local</h4>
                <p className="text-[10px] text-slate-300">Ajuste de precios, cierres de caja y stock global</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/store-ecuador')}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center space-x-1"
            >
              <span>Abrir</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL ZOOM DE IMAGEN ─────────────────────────────────── */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-sm w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2" onClick={e => e.stopPropagation()}>
            <img
              src={selectedImage}
              alt="Vista previa"
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppTiendaLocal;

