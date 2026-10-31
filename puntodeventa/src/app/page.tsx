'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Staff,
  PosSession,
  Product,
  CartLine,
  PaymentInput,
  SaleResult,
  PosClient,
  PosLocationId,
} from '../types/pos';
import { posApi } from '../services/posApi';
import { catalogService } from '../services/catalogService';
import { LoginScreen } from '../components/LoginScreen';
import { SidebarPane, NavTab } from '../components/SidebarPane';
import { TopSearchBar } from '../components/TopSearchBar';
import { HomeSpotlightPane } from '../components/HomeSpotlightPane';
import { CatalogPane } from '../components/CatalogPane';
import { TicketPane } from '../components/TicketPane';
import { CheckoutDialog } from '../components/CheckoutDialog';
import { ClientsDirectoryView } from '../components/ClientsDirectoryView';
import { SalesHistoryView } from '../components/SalesHistoryView';
import { ReportsView } from '../components/ReportsView';
import { ReceiptsView } from '../components/ReceiptsView';
import { SettingsView } from '../components/SettingsView';
import { ScannerModal } from '../components/ScannerModal';
import { PhotoRecognitionModal } from '../components/PhotoRecognitionModal';
import { BroadcastPromoModal } from '../components/BroadcastPromoModal';
import { IpadInstallPrompt } from '../components/IpadInstallPrompt';
import { triggerBeep, triggerHaptic } from '../lib/feedback';
import { FileText, PauseCircle, Play, Trash2, X } from 'lucide-react';

interface HeldSale {
  id: string;
  items: CartLine[];
  subtotal: number;
  client: PosClient | null;
  note: string;
  savedAt: string;
}

export default function PosApp() {
  // 1. Staff & Auth State
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [session, setSession] = useState<PosSession | null>(null);
  const [locked, setLocked] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // 2. Navigation & View State
  const [selectedNav, setSelectedNav] = useState<NavTab>('inicio');
  const [selectedLocation, setSelectedLocation] = useState<PosLocationId>('local');
  const [query, setQuery] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);

  // 3. Catalog & Products
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  // 4. Cart & Register
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedClient, setSelectedClient] = useState<PosClient | null>(null);
  const [saleNote, setSaleNote] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);

  // 5. Checkout & Modals
  const [showCheckout, setShowCheckout] = useState(false);
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);
  const [processingSale, setProcessingSale] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  const [showScanner, setShowScanner] = useState(false);
  const [scannerCallback, setScannerCallback] = useState<((code: string) => void) | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [tempNote, setTempNote] = useState('');
  const [showHeldSalesModal, setShowHeldSalesModal] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // 6. Settings State
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [fontScale, setFontScale] = useState(1.0);

  // Load Staff on initial mount
  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    setStaffError(null);
    try {
      const list = await posApi.getStaff();
      setStaffList(list);
    } catch (err: any) {
      setStaffError(err.message || 'Sin conexión con el servidor POS');
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
    // Load local settings
    try {
      const dark = localStorage.getItem('falconi_pos_dark');
      if (dark !== null) setIsDarkMode(dark === 'true');
      const font = localStorage.getItem('falconi_pos_font');
      if (font) setFontScale(parseFloat(font) || 1.0);
      const savedSession = localStorage.getItem('falconi_pos_session');
      if (savedSession) {
        setSession(JSON.parse(savedSession));
      }
    } catch (_) {}
  }, [loadStaff]);

  // Sincronizar clase de tema al documentElement para soporte global de modales y diálogos
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.remove('theme-light');
        document.documentElement.classList.add('theme-dark');
        document.body.classList.remove('theme-light');
        document.body.classList.add('theme-dark');
      } else {
        document.documentElement.classList.remove('theme-dark');
        document.documentElement.classList.add('theme-light');
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
      }
    }
  }, [isDarkMode]);

  // Connect realtime catalog when session is active
  useEffect(() => {
    if (!session) return;
    const unsub = catalogService.observeCatalog(
      session.priceField || 'salePrice2',
      (items) => {
        setProducts(items);
        setCatalogLoaded(true);
      },
      (err) => console.error('Error observando catálogo:', err)
    );
    return () => unsub();
  }, [session]);

  // Handle Login
  const handleLogin = async (staffId: string, pin: string) => {
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await posApi.auth(staffId, pin, 'ipad-pro');
      const newSession: PosSession = {
        staff: res.staff,
        location: res.settings?.location || 'Bodega Principal',
        priceField: res.settings?.priceField || 'salePrice2',
        maxDiscountPct: res.settings?.maxDiscountPct ?? 100,
      };
      setSession(newSession);
      setLocked(false);
      localStorage.setItem('falconi_pos_session', JSON.stringify(newSession));
    } catch (err: any) {
      setLoginError(err.message || 'Asesor o PIN incorrecto');
    } finally {
      setLoggingIn(false);
    }
  };

  // Handle Lock & Logout
  const handleLock = () => {
    setLocked(true);
    setLoginError(null);
  };

  const handleLogout = async () => {
    await posApi.logout();
    setSession(null);
    setLocked(false);
    setCart([]);
    setSelectedClient(null);
    localStorage.removeItem('falconi_pos_session');
  };

  // Cart operations (solo productos con stock en Tienda Local se pueden facturar)
  const handleAdd = (product: Product, qty: number = 1) => {
    if (product.stockLocal <= 0) {
      alert(`El perfume "${product.name}" solo se encuentra en Bodega y no tiene stock disponible en Tienda Local para facturar.`);
      return;
    }
    triggerBeep();
    triggerHaptic();

    setCart((prev) => {
      const existing = prev.find((it) => it.product.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty + qty > product.stockLocal) {
        alert(`Stock máximo disponible en Tienda Local: ${product.stockLocal} unidades`);
        return prev;
      }
      if (existing) {
        return prev.map((it) =>
          it.product.id === product.id ? { ...it, quantity: it.quantity + qty } : it
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  const handleDec = (product: Product) => {
    triggerHaptic();
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.product.id === product.id) {
            return { ...it, quantity: it.quantity - 1 };
          }
          return it;
        })
        .filter((it) => it.quantity > 0)
    );
  };

  const handleRemove = (product: Product) => {
    triggerHaptic();
    setCart((prev) => prev.filter((it) => it.product.id !== product.id));
  };

  const handleClearCart = () => {
    setCart([]);
    setSaleNote('');
    setDiscountPct(0);
  };

  // Barcode resolution
  const handleBarcodeScanned = (code: string) => {
    const clean = code.trim().toLowerCase();
    const match = products.find(
      (p) => p.barcode.toLowerCase() === clean || p.sku.toLowerCase() === clean
    );

    if (match) {
      handleAdd(match, 1);
      setScannedProduct(match);
      setSelectedNav('inicio');
    } else {
      alert(`Código de barras no encontrado en el catálogo: ${code}`);
    }
  };

  // Hold Sale
  const handleHoldSale = () => {
    if (cart.length === 0) return;
    const subtotal = cart.reduce((acc, it) => acc + it.product.price * it.quantity, 0);
    const newHold: HeldSale = {
      id: `HOLD-${Date.now().toString().slice(-6)}`,
      items: [...cart],
      subtotal,
      client: selectedClient,
      note: saleNote,
      savedAt: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
    };

    setHeldSales((prev) => [newHold, ...prev]);
    handleClearCart();
    setSelectedClient(null);
  };

  const handleRestoreHold = (hold: HeldSale) => {
    setCart(hold.items);
    setSelectedClient(hold.client);
    setSaleNote(hold.note);
    setHeldSales((prev) => prev.filter((h) => h.id !== hold.id));
    setShowHeldSalesModal(false);
  };

  // Confirm Checkout Sale
  const handleConfirmCheckout = async (
    discount: number,
    payment: PaymentInput,
    custName?: string
  ) => {
    if (cart.length === 0) return;
    setProcessingSale(true);
    setSaleError(null);

    const clientSaleId = crypto.randomUUID();
    try {
      const result = await posApi.createSale(
        clientSaleId,
        'ipad-pro',
        cart,
        discount,
        payment,
        custName,
        selectedClient
      );

      setSaleResult(result);
      setCart([]);
      setSelectedClient(null);
      setSaleNote('');
    } catch (err: any) {
      setSaleError(err.message || 'Error al procesar la venta en el servidor');
    } finally {
      setProcessingSale(false);
    }
  };

  // Render LoginScreen if not authenticated or locked
  if (!session || locked) {
    return (
      <LoginScreen
        staffList={staffList}
        lockedStaff={locked ? session?.staff : null}
        loadingStaff={loadingStaff}
        staffError={staffError}
        loggingIn={loggingIn}
        loginError={loginError}
        onLogin={handleLogin}
        onRetryStaff={loadStaff}
      />
    );
  }

  return (
    <div
      className={`fixed inset-0 flex overflow-hidden select-none ${
        isDarkMode ? 'theme-dark bg-[#0F1115] text-white' : 'theme-light bg-[#F5F2EB] text-[#0F172A]'
      } ${
        fontScale > 1.2 ? 'text-base' : fontScale > 1.1 ? 'text-[15px]' : 'text-sm'
      }`}
    >
      {/* 1. Sidebar Navigation (Left) */}
      <SidebarPane
        selectedNav={selectedNav}
        onSelectNav={(nav) => {
          if (nav === 'inicio' || nav === 'productos') {
            setSelectedLocation('local');
          } else if (nav === 'bodegas') {
            if (selectedLocation === 'local') setSelectedLocation('bodega_ec');
          }
          setQuery('');
          setScannedProduct(null);
          setSelectedNav(nav);
        }}
        staff={session.staff}
        onLock={handleLock}
        onLogout={handleLogout}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Search Bar */}
        <TopSearchBar
          query={query}
          onQueryChange={(q) => {
            setQuery(q);
            if (!q.trim()) setScannedProduct(null);
          }}
          selectedLocation={selectedLocation}
          onScanCamera={() => {
            setScannerCallback(null);
            setShowScanner(true);
          }}
          onScanPhoto={() => setShowPhotoModal(true)}
          onLock={handleLock}
          onLogout={handleLogout}
          onOpenBroadcast={() => setShowBroadcastModal(true)}
        />

        {/* View Router */}
        <main className="flex-1 flex overflow-hidden min-w-0">
          {selectedNav === 'inicio' && (
            <div className="flex-1 flex overflow-hidden p-3 gap-3">
              <HomeSpotlightPane
                products={products}
                scannedProduct={scannedProduct}
                query={query}
                selectedLocation={selectedLocation}
                onAdd={handleAdd}
                onClearSpotlight={() => {
                  setScannedProduct(null);
                  setQuery('');
                }}
                onOpenCatalog={(loc) => {
                  if (loc) setSelectedLocation(loc);
                  setSelectedNav(loc === 'local' ? 'productos' : 'bodegas');
                }}
                onScanCamera={() => {
                  setScannerCallback(null);
                  setShowScanner(true);
                }}
                onScanPhoto={() => setShowPhotoModal(true)}
              />

              <TicketPane
                cart={cart}
                client={selectedClient}
                saleNote={saleNote}
                heldSalesCount={heldSales.length}
                maxDiscountPct={session.maxDiscountPct}
                discountPct={discountPct}
                onSetDiscountPct={setDiscountPct}
                onAdd={handleAdd}
                onDec={handleDec}
                onRemove={handleRemove}
                onClear={handleClearCart}
                onPay={() => setShowCheckout(true)}
                onOpenClientDialog={() => setShowClientSelector(true)}
                onRemoveClient={() => setSelectedClient(null)}
                onOpenNoteDialog={() => {
                  setTempNote(saleNote);
                  setShowNoteDialog(true);
                }}
                onHoldSale={handleHoldSale}
                onOpenHeldSales={() => setShowHeldSalesModal(true)}
              />
            </div>
          )}

          {selectedNav === 'productos' && (
            <div className="flex-1 flex overflow-hidden p-3 gap-3">
              <CatalogPane
                products={products}
                selectedLocation="local"
                searchQuery={query}
                onAdd={handleAdd}
              />

              <TicketPane
                cart={cart}
                client={selectedClient}
                saleNote={saleNote}
                heldSalesCount={heldSales.length}
                maxDiscountPct={session.maxDiscountPct}
                discountPct={discountPct}
                onSetDiscountPct={setDiscountPct}
                onAdd={handleAdd}
                onDec={handleDec}
                onRemove={handleRemove}
                onClear={handleClearCart}
                onPay={() => setShowCheckout(true)}
                onOpenClientDialog={() => setShowClientSelector(true)}
                onRemoveClient={() => setSelectedClient(null)}
                onOpenNoteDialog={() => {
                  setTempNote(saleNote);
                  setShowNoteDialog(true);
                }}
                onHoldSale={handleHoldSale}
                onOpenHeldSales={() => setShowHeldSalesModal(true)}
              />
            </div>
          )}

          {selectedNav === 'bodegas' && (
            <div className="flex-1 flex overflow-hidden p-3 gap-3">
              <CatalogPane
                products={products}
                selectedLocation={selectedLocation}
                onSetLocation={setSelectedLocation}
                showWarehouseTabs={true}
                searchQuery={query}
                onAdd={handleAdd}
              />

              <TicketPane
                cart={cart}
                client={selectedClient}
                saleNote={saleNote}
                heldSalesCount={heldSales.length}
                maxDiscountPct={session.maxDiscountPct}
                discountPct={discountPct}
                onSetDiscountPct={setDiscountPct}
                onAdd={handleAdd}
                onDec={handleDec}
                onRemove={handleRemove}
                onClear={handleClearCart}
                onPay={() => setShowCheckout(true)}
                onOpenClientDialog={() => setShowClientSelector(true)}
                onRemoveClient={() => setSelectedClient(null)}
                onOpenNoteDialog={() => {
                  setTempNote(saleNote);
                  setShowNoteDialog(true);
                }}
                onHoldSale={handleHoldSale}
                onOpenHeldSales={() => setShowHeldSalesModal(true)}
              />
            </div>
          )}

          {selectedNav === 'ventas' && (
            <SalesHistoryView onBackToPos={() => setSelectedNav('inicio')} />
          )}

          {selectedNav === 'reportes' && (
            <ReportsView onBackToPos={() => setSelectedNav('inicio')} />
          )}

          {selectedNav === 'clientes' && (
            <ClientsDirectoryView
              onSelectClientForSale={(c) => {
                setSelectedClient(c);
                setSelectedNav('inicio');
              }}
              onBackToPos={() => setSelectedNav('inicio')}
            />
          )}

          {selectedNav === 'ingreso' && (
            <ReceiptsView
              onBackToPos={() => setSelectedNav('inicio')}
              onOpenScanner={(cb) => {
                setScannerCallback(() => cb);
                setShowScanner(true);
              }}
              onOpenBroadcast={() => setShowBroadcastModal(true)}
            />
          )}

          {selectedNav === 'ajustes' && (
            <SettingsView
              isDarkMode={isDarkMode}
              onToggleTheme={(dark) => {
                setIsDarkMode(dark);
                localStorage.setItem('falconi_pos_dark', String(dark));
              }}
              fontScale={fontScale}
              onSetFontScale={(scale) => {
                setFontScale(scale);
                localStorage.setItem('falconi_pos_font', String(scale));
              }}
              onBackToPos={() => setSelectedNav('inicio')}
            />
          )}
        </main>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutDialog
          cart={cart}
          subtotal={cart.reduce((acc, it) => acc + it.product.price * it.quantity, 0)}
          initialDiscountPct={discountPct}
          maxDiscountPct={session.maxDiscountPct}
          assignedClient={selectedClient}
          saleResult={saleResult}
          processingSale={processingSale}
          saleError={saleError}
          onConfirm={handleConfirmCheckout}
          onDismiss={() => {
            setShowCheckout(false);
            setSaleResult(null);
            setSaleError(null);
          }}
          onResetSale={() => {
            setShowCheckout(false);
            setSaleResult(null);
            setSaleError(null);
            setSelectedNav('inicio');
          }}
        />
      )}

      {/* Barcode Camera Scanner */}
      <ScannerModal
        isOpen={showScanner}
        onClose={() => {
          setShowScanner(false);
          setScannerCallback(null);
        }}
        onScan={(code) => {
          if (scannerCallback) {
            scannerCallback(code);
          } else {
            handleBarcodeScanned(code);
          }
        }}
      />

      {/* Photo Recognition Modal */}
      {showPhotoModal && (
        <PhotoRecognitionModal
          products={products}
          onSelect={(p) => {
            handleAdd(p, 1);
            setScannedProduct(p);
            setSelectedNav('inicio');
          }}
          onClose={() => setShowPhotoModal(false)}
        />
      )}

      {/* Sale Note Dialog */}
      {showNoteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#181B20] border border-[#282D37] rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowNoteDialog(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-[#22262E] text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <FileText size={18} className="text-amber-400" />
              Nota para la Venta
            </h3>

            <textarea
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              placeholder="Ej: Empaque de regalo con lazo dorado, cliente retira por la tarde..."
              rows={3}
              className="w-full p-3 rounded-2xl bg-[#22262E] border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 mb-4 resize-none"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setSaleNote('');
                  setShowNoteDialog(false);
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 text-xs font-semibold"
              >
                Borrar Nota
              </button>
              <button
                onClick={() => {
                  setSaleNote(tempNote.trim());
                  setShowNoteDialog(false);
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Guardar Nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Held Sales (Tickets en espera) Modal */}
      {showHeldSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#181B20] border border-[#282D37] rounded-3xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowHeldSalesModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-[#22262E] text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <PauseCircle size={18} className="text-amber-400" />
              Tickets en Espera ({heldSales.length})
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {heldSales.map((h) => (
                <div
                  key={h.id}
                  className="p-3.5 rounded-2xl bg-[#22262E] border border-slate-700/80 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {h.client ? h.client.fullName : 'Consumidor Final'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {h.items.length} {h.items.length === 1 ? 'producto' : 'productos'} &bull; Guardado {h.savedAt}
                    </p>
                    {h.note && (
                      <p className="text-[10px] text-amber-400/90 truncate mt-0.5">
                        Nota: {h.note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-black text-amber-400 mr-1">
                      ${h.subtotal.toFixed(2)}
                    </p>
                    <button
                      onClick={() => handleRestoreHold(h)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow"
                    >
                      <Play size={12} />
                      <span>Retomar</span>
                    </button>
                    <button
                      onClick={() => setHeldSales((prev) => prev.filter((it) => it.id !== h.id))}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Client Quick Selector Modal */}
      {showClientSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#181B20] border border-[#282D37] rounded-3xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowClientSelector(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-[#22262E] text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-white mb-2">
              Asignar Cliente al Ticket
            </h3>

            <div className="flex-1 overflow-hidden flex flex-col">
              <ClientsDirectoryView
                onSelectClientForSale={(c) => {
                  setSelectedClient(c);
                  setShowClientSelector(false);
                }}
                onBackToPos={() => setShowClientSelector(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Broadcast / Mass Promotional Email Modal */}
      {showBroadcastModal && (
        <BroadcastPromoModal
          isOpen={showBroadcastModal}
          onClose={() => setShowBroadcastModal(false)}
          staffName={session?.staff?.name || 'Asesor Falconi'}
        />
      )}

      {/* iPad PWA Install Banner */}
      <IpadInstallPrompt />
    </div>
  );
}
