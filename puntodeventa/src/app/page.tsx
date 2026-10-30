'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Store, 
  Search, 
  Barcode, 
  Camera, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  DollarSign, 
  CreditCard, 
  History, 
  RefreshCw, 
  Sparkles, 
  User, 
  Package, 
  ChevronRight,
  AlertCircle,
  Receipt,
  X
} from 'lucide-react';
import { PosProduct, PosCartItem } from '../types/pos';
import { posClientService } from '../services/posService';
import { triggerBeep, triggerHaptic } from '../lib/feedback';
import { ScannerModal } from '../components/ScannerModal';
import { CheckoutModal } from '../components/CheckoutModal';
import { SalesHistoryModal } from '../components/SalesHistoryModal';
import { IpadInstallPrompt } from '../components/IpadInstallPrompt';

export default function PosApp() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');

  // Cart State
  const [cart, setCart] = useState<PosCartItem[]>([]);

  // Modals
  const [showScanner, setShowScanner] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Barcode quick input
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Load catalog
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await posClientService.getCatalogProducts();
      setProducts(data);
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category.trim());
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  // Brands with counts
  const brands = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach(p => {
      const b = p.brand?.trim() || 'General';
      map.set(b, (map.get(b) || 0) + 1);
    });
    const sorted = Array.from(map.entries())
      .filter(([name]) => name.toLowerCase() !== 'general' && name.length > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
    return [{ name: 'all', count: products.length }, ...sorted];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        !searchTerm.trim() ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm.trim())) ||
        (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesBrand = selectedBrand === 'all' || p.brand?.toLowerCase() === selectedBrand.toLowerCase();

      return matchesSearch && matchesCat && matchesBrand;
    });
  }, [products, searchTerm, selectedCategory, selectedBrand]);

  // Add product to cart
  const addToCart = useCallback((product: PosProduct) => {
    triggerBeep();
    triggerHaptic();

    setCart(prevCart => {
      const existing = prevCart.find(item => item.productId === product.id);
      if (existing) {
        return prevCart.map(item => {
          if (item.productId === product.id) {
            const nextQty = item.quantity + 1;
            return {
              ...item,
              quantity: nextQty,
              totalPrice: item.unitPrice * nextQty - item.discount
            };
          }
          return item;
        });
      } else {
        const price = product.salePrice1 || product.salePrice2 || product.pvp || 0;
        const newItem: PosCartItem = {
          id: `cart-${Date.now()}-${product.id}`,
          productId: product.id,
          product,
          quantity: 1,
          unitPrice: price,
          discount: 0,
          totalPrice: price,
          availableStock: product.totalStock || 0
        };
        return [...prevCart, newItem];
      }
    });
  }, []);

  // Update item quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart
        .map(item => {
          if (item.productId === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            return {
              ...item,
              quantity: nextQty,
              totalPrice: item.unitPrice * nextQty - item.discount
            };
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[];
    });
  };

  // Remove item
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
  };

  // Barcode search or scan
  const handleBarcodeSubmit = (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    const found = products.find(p => p.barcode === clean || p.sku.toLowerCase() === clean.toLowerCase());
    if (found) {
      addToCart(found);
      setBarcodeQuery('');
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
    } else {
      alert(`Código o SKU "${clean}" no encontrado en el inventario.`);
    }
  };

  // Totals
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const totalDiscount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.discount, 0);
  }, [cart]);

  const total = subtotal;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* PWA iPad Installation Prompt */}
      <IpadInstallPrompt />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md px-4 sm:px-6 py-3 bg-[#0a101d]/95 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-emerald-400 to-teal-300 text-slate-950 flex items-center justify-center font-extrabold shadow-md shadow-emerald-500/20">
            <Store className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-['Cinzel',serif] text-sm sm:text-base font-extrabold tracking-widest text-white">
                FALCONI POS
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                Punto de Venta • Mostrador
              </span>
            </div>
            <p className="text-[10px] tracking-wider uppercase font-semibold text-slate-400">
              Terminal de Cobro Rápido en Tienda
            </p>
          </div>
        </div>

        {/* Quick Actions & Barcode Input */}
        <div className="flex items-center gap-2">
          {/* Quick Barcode Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBarcodeSubmit(barcodeQuery);
            }}
            className="hidden sm:flex items-center relative"
          >
            <Barcode className="w-4 h-4 text-emerald-400 absolute left-3 pointer-events-none" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeQuery}
              onChange={(e) => setBarcodeQuery(e.target.value)}
              placeholder="Escanear código / SKU..."
              className="bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-48 lg:w-64 transition-all"
            />
          </form>

          {/* Camera Scanner Button */}
          <button
            onClick={() => setShowScanner(true)}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-emerald-500/10"
            title="Abrir cámara escáner"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden md:inline">Cámara</span>
          </button>

          {/* Sales History Button */}
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
            title="Historial de ventas"
          >
            <History className="w-4 h-4" />
            <span className="hidden md:inline">Historial</span>
          </button>

          {/* Refresh Catalog */}
          <button
            onClick={() => {
              setIsRefreshing(true);
              loadProducts();
            }}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-all active:scale-95"
            title="Sincronizar inventario"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Container: Split View on iPad Pro / Desktop */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: Catalog & Products Grid (65% width on tablet/desktop) */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-800/80">
          {/* Filter Bar */}
          <div className="p-3 sm:p-4 bg-[#080d16] border-b border-slate-800/60 space-y-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por perfume, fragancia, marca o código..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Brand Chips Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {brands.slice(0, 15).map((b) => (
                <button
                  key={b.name}
                  onClick={() => setSelectedBrand(b.name)}
                  className={`py-1 px-2.5 rounded-xl text-[11px] font-semibold shrink-0 transition-all ${
                    selectedBrand === b.name
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {b.name === 'all' ? 'Todas las Marcas' : b.name}
                  <span className="ml-1 opacity-60 text-[10px]">({b.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid (4 items per row on iPad Pro) */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 no-scrollbar">
            {loading ? (
              <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                <p className="text-xs font-bold text-slate-300">Cargando inventario POS...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const hasStock = (product.totalStock || 0) > 0;
                  const price = product.salePrice1 || product.salePrice2 || product.pvp || 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={`group relative rounded-2xl p-3 border flex flex-col justify-between transition-all duration-200 active:scale-95 cursor-pointer overflow-hidden ${
                        hasStock
                          ? 'bg-[#0e1422] border-slate-800 hover:border-emerald-500/50 shadow-md hover:shadow-emerald-500/10'
                          : 'bg-[#090d16] border-slate-900 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {/* Stock Badge */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider truncate max-w-[90px]">
                          {product.brand}
                        </span>
                        {hasStock ? (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {product.totalStock} en local
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-medium bg-rose-500/10 text-rose-400">
                            Agotado
                          </span>
                        )}
                      </div>

                      {/* Photo */}
                      <div className="relative w-full aspect-square rounded-xl bg-slate-950 p-2 my-1 flex items-center justify-center overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>

                      {/* Info */}
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-emerald-300 transition-colors">
                          {product.name}
                        </h4>
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-800/80">
                          <span className="text-sm font-black text-emerald-400">
                            ${price.toFixed(2)}
                          </span>
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500 text-xs">
                No se encontraron productos con el filtro aplicado.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: The Live Register / Ticket (35% width on tablet/desktop) */}
        <div className="w-full lg:w-96 xl:w-[420px] bg-[#090e18] flex flex-col shrink-0 shadow-2xl border-t lg:border-t-0 border-slate-800">
          {/* Register Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0b121e]">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                Ticket de Venta
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar</span>
              </button>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 no-scrollbar max-h-[40vh] lg:max-h-none">
            {cart.length > 0 ? (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl border border-slate-800 bg-[#0e1626] flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-white truncate">
                      {item.product.name}
                    </h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-semibold text-emerald-400">
                        ${item.unitPrice.toFixed(2)} c/u
                      </span>
                      {item.product.brand && (
                        <span className="text-[10px] text-slate-500 truncate">
                          • {item.product.brand}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl p-1">
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-extrabold text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="w-6 h-6 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right w-16">
                    <span className="text-xs font-black text-white">
                      ${item.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center flex flex-col items-center justify-center text-slate-500">
                <ShoppingCart className="w-10 h-10 stroke-[1.5] mb-2 opacity-40" />
                <p className="text-xs font-bold text-slate-400">El carrito está vacío</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                  Toca un producto o escanea un código de barras para iniciar la venta.
                </p>
              </div>
            )}
          </div>

          {/* Register Footer: Totals & Cobrar Button */}
          <div className="p-4 border-t border-slate-800 bg-[#070c14] space-y-3 shrink-0">
            {/* Subtotal & Discount */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-200">${subtotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Descuento aplicado:</span>
                  <span>-${totalDiscount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Total Big Display */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                  Total a Pagar
                </span>
                <span className="text-xs text-slate-400">IVA incluido</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                ${total.toFixed(2)}
              </div>
            </div>

            {/* Giant COBRAR Button */}
            <button
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 hover:from-emerald-400 hover:to-teal-200 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
              <span>COBRAR (${total.toFixed(2)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeSubmit}
      />

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        items={cart}
        subtotal={subtotal}
        discount={totalDiscount}
        total={total}
        onSuccess={() => {
          clearCart();
        }}
      />

      <SalesHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}
