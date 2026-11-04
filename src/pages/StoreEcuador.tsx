import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Package,
  Search,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  ScanLine,
  Layers,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  PackageCheck,
  Eye,
  X
} from 'lucide-react';
import { Product, InventoryItem } from '../types';
import { inventoryService } from '../services/inventoryService';
import { productService } from '../services/productService';
import toast from 'react-hot-toast';

interface StoreProductItem {
  id: string; // inventory doc id
  productId: string;
  product: Product;
  quantity: number;
  location: string;
  unitPrice?: number;
  cost?: number;
}

const StoreEcuador: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [storeItems, setStoreItems] = useState<StoreProductItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadStoreInventory();
  }, []);

  const loadStoreInventory = async () => {
    try {
      setLoading(true);
      const [allProducts, allInventory] = await Promise.all([
        productService.getAll(),
        inventoryService.getAll()
      ]);

      const productMap = new Map<string, Product>();
      allProducts.forEach(p => productMap.set(p.id, p));

      // Filtrar items cuyo location corresponda a Tienda Ecuador / Bodega Principal / Local
      const itemsByProduct = new Map<string, StoreProductItem>();

      allInventory.forEach(inv => {
        const loc = (inv.location || '').toLowerCase().trim();
        const isStoreLocation =
          loc === 'bodega principal' ||
          loc.includes('principal') ||
          loc.includes('tienda') ||
          loc.includes('local') ||
          loc.includes('mostrador');

        if (isStoreLocation && inv.quantity > 0) {
          const prod = productMap.get(inv.productId);
          if (prod) {
            const existing = itemsByProduct.get(inv.productId);
            if (existing) {
              existing.quantity += inv.quantity;
            } else {
              itemsByProduct.set(inv.productId, {
                id: inv.id,
                productId: inv.productId,
                product: prod,
                quantity: inv.quantity,
                location: inv.location || 'Bodega Principal',
                unitPrice: inv.unitPrice || prod.salePrice2 || prod.salePrice1,
                cost: inv.cost || prod.cost
              });
            }
          }
        }
      });

      const list = Array.from(itemsByProduct.values());
      list.sort((a, b) => (a.product.name || '').localeCompare(b.product.name || ''));
      setStoreItems(list);
    } catch (err) {
      console.error('Error cargando inventario de Tienda Ecuador:', err);
      toast.error('Error al cargar inventario de Tienda Ecuador');
    } finally {
      setLoading(false);
    }
  };

  // Categorías
  const categories = useMemo(() => {
    const set = new Set<string>();
    storeItems.forEach(i => {
      if (i.product.category) set.add(i.product.category);
    });
    return ['all', ...Array.from(set).sort()];
  }, [storeItems]);

  // Marcas
  const brands = useMemo(() => {
    const set = new Set<string>();
    storeItems.forEach(i => {
      if (i.product.brand && i.product.brand.trim()) set.add(i.product.brand.trim());
    });
    return ['all', ...Array.from(set).sort()];
  }, [storeItems]);

  // Filtrar
  const filteredItems = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    const cleanNoLeading = cleanSearch.replace(/^0+/, '');

    return storeItems.filter(item => {
      const p = item.product;
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();

      const matchesSearch =
        !cleanSearch ||
        name.includes(cleanSearch) ||
        sku.includes(cleanSearch) ||
        barcode.includes(cleanSearch) ||
        brand.includes(cleanSearch) ||
        (cleanNoLeading && (sku.replace(/^0+/, '').includes(cleanNoLeading) || barcode.replace(/^0+/, '').includes(cleanNoLeading)));

      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesBrand = selectedBrand === 'all' || p.brand === selectedBrand;

      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [storeItems, searchTerm, selectedCategory, selectedBrand]);

  // Estadísticas
  const totalDistinct = filteredItems.length;
  const totalUnits = filteredItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalValuation = filteredItems.reduce((sum, i) => {
    const price = i.product.salePrice2 || i.product.pvp || i.product.salePrice1 || 0;
    return sum + (price * i.quantity);
  }, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <Store className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Tienda Ecuador</h1>
              <p className="text-emerald-100 text-sm">
                Stock físico en mostrador y tienda local (Bodega Principal)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => window.open('/puntodeventa', '_blank')}
            className="flex items-center gap-2 px-5 py-3 bg-white text-emerald-800 font-bold rounded-2xl shadow-lg hover:bg-emerald-50 active:scale-95 transition-all"
          >
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <span>Abrir POS Tienda</span>
            <ExternalLink className="w-4 h-4 text-emerald-500" />
          </button>

          <button
            onClick={() => navigate('/local-receipts')}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-950/40 border border-white/20 hover:bg-emerald-950/60 text-white font-semibold rounded-2xl backdrop-blur-md active:scale-95 transition-all"
          >
            <PackageCheck className="w-5 h-5 text-emerald-200" />
            <span>Ingresos / Recibir</span>
          </button>

          <button
            onClick={loadStoreInventory}
            disabled={loading}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 text-white transition-all active:scale-95"
            title="Actualizar stock"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Productos en Tienda</p>
            <p className="text-3xl font-extrabold text-slate-800 mt-1">{totalDistinct}</p>
            <p className="text-xs text-slate-500 mt-0.5">items distintos en vitrina/mostrador</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Package className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unidades Disponibles</p>
            <p className="text-3xl font-extrabold text-teal-600 mt-1">{totalUnits}</p>
            <p className="text-xs text-slate-500 mt-0.5">unidades listas para facturar</p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
            <Layers className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valorización Tienda</p>
            <p className="text-3xl font-extrabold text-slate-800 mt-1">
              ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">a precio tienda local / minorista</p>
          </div>
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
            <DollarSign className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU, código de barras o marca..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todas las Categorías</option>
            {categories.filter(c => c !== 'all').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todas las Marcas</option>
            {brands.filter(b => b !== 'all').map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-medium text-sm">Cargando inventario de Tienda Ecuador...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center px-4">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No se encontraron productos</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
              No hay productos en Tienda Ecuador con los filtros seleccionados. Si acabas de recibir mercadería, asegúrate de haber confirmado la recepción.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Producto</th>
                  <th className="py-4 px-4">Categoría / Marca</th>
                  <th className="py-4 px-4">Código / SKU</th>
                  <th className="py-4 px-4 text-center">Stock Tienda</th>
                  <th className="py-4 px-4 text-right">Precio Tienda (PVP)</th>
                  <th className="py-4 px-4 text-right">Precio Mayorista</th>
                  <th className="py-4 px-6 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => {
                  const p = item.product;
                  const img = p.imageUrl || (Array.isArray(p.images) && p.images[0]) || '/logo_falconi.png';
                  const storePrice = p.salePrice2 || p.pvp || p.salePrice1 || 0;
                  const wholesalePrice = p.salePrice1 || 0;

                  return (
                    <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                      {/* Producto & Foto */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => setPreviewImage(img)}
                            className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 cursor-pointer group relative shadow-sm"
                          >
                            <img
                              src={img}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm line-clamp-1">{p.name}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>Ubicación:</span>
                              <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                                {item.location}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Categoría / Marca */}
                      <td className="py-4 px-4">
                        <p className="text-sm font-semibold text-slate-700">{p.brand || 'Falconi'}</p>
                        <p className="text-xs text-slate-400">{p.category || 'Perfumes'}</p>
                      </td>

                      {/* Código / SKU */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="text-xs font-mono font-medium text-slate-600 flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-normal">SKU:</span>
                            {p.sku || '-'}
                          </p>
                          {p.barcode && p.barcode !== p.sku && (
                            <p className="text-xs font-mono text-slate-500 flex items-center gap-1">
                              <ScanLine className="w-3.5 h-3.5 text-slate-400" />
                              {p.barcode}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Stock Tienda */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-sm font-extrabold bg-emerald-100 text-emerald-700">
                          {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}
                        </span>
                      </td>

                      {/* Precios */}
                      <td className="py-4 px-4 text-right">
                        <p className="text-sm font-bold text-slate-900">${storePrice.toFixed(2)}</p>
                        {p.pvp && p.pvp !== storePrice && (
                          <p className="text-[11px] text-slate-400">PVP: ${p.pvp.toFixed(2)}</p>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <p className="text-sm font-medium text-slate-600">${wholesalePrice.toFixed(2)}</p>
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => window.open('/puntodeventa', '_blank')}
                          className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Facturar en POS"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal vista previa imagen grande */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative bg-slate-900 rounded-3xl p-4 max-w-lg w-full border border-slate-700 shadow-2xl"
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Producto"
              className="w-full h-96 object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreEcuador;
