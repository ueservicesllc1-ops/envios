import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Camera,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  Send,
  User,
  Phone,
  Mail,
  Sparkles,
  RefreshCw,
  X,
  ArrowLeft,
  ArrowRight,
  FileText,
  Share2,
  CheckCircle2,
  Store,
  Tag,
  AlertTriangle,
  ChevronDown,
  Building2,
  Check,
  Smartphone
} from 'lucide-react';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  writeBatch,
  addDoc,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Product, PointOfSale } from '../types';
import { productService } from '../services/productService';
import { posCustomerService } from '../services/posCustomerService';
import { generatePOSReceipt } from '../utils/pdfGenerator';
import { getApiUrl } from '../config/api.config';
import { getSellerSession, MAIN_SELLERS } from '../utils/sellerSession';
import BarcodeScanner from '../components/BarcodeScanner';
import toast from 'react-hot-toast';

export interface MobileCartItem {
  id: string;
  productId: string;
  inventoryDocId: string;
  name: string;
  brand?: string;
  sku: string;
  barcode?: string;
  imageUrl?: string;
  quantity: number;
  availableStock: number;
  originalPrice: number;
  unitPrice: number;
  isPriceEdited: boolean;
  totalPrice: number;
  cost: number;
}

interface TiendaLocalItem {
  inventoryDocId: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  cost: number;
  location: string;
}

const PosMobile: React.FC = () => {
  const navigate = useNavigate();

  // Estados de carga e inventario
  const [loading, setLoading] = useState(true);
  const [tiendaItems, setTiendaItems] = useState<TiendaLocalItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');

  // Carrito de venta
  const [cart, setCart] = useState<MobileCartItem[]>([]);

  // Escáner de código de barras
  const [showScanner, setShowScanner] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Modal de Cobro / Checkout
  const [showCheckout, setShowCheckout] = useState(false);

  // Datos del Cliente
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCedula, setCustomerCedula] = useState('');

  // Pago
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [cashReceivedStr, setCashReceivedStr] = useState<string>('');

  // Asesor / Vendedor
  const session = getSellerSession();
  const [sellerName, setSellerName] = useState<string>(session?.name || 'Asesor Falconi');
  const [showSellerSelector, setShowSellerSelector] = useState(false);

  // Estados de proceso y éxito
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<PointOfSale | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ sent: boolean; message: string } | null>(null);

  // Cargar inventario de Tienda Local
  useEffect(() => {
    loadTiendaLocalStock();
  }, []);

  const loadTiendaLocalStock = async () => {
    try {
      setLoading(true);
      const [productsData, invSnap] = await Promise.all([
        productService.getAll(),
        getDocs(collection(db, 'inventory'))
      ]);

      const productMap = new Map<string, Product>();
      productsData.forEach(p => productMap.set(p.id, p));

      const items: TiendaLocalItem[] = [];

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

            items.push({
              inventoryDocId: docSnap.id,
              productId: inv.productId,
              product: prod,
              quantity: qty,
              unitPrice: basePrice,
              cost: Number(inv.cost || prod.cost || 0),
              location: inv.location || 'Tienda Local'
            });
          }
        }
      });

      // Ordenar por nombre
      items.sort((a, b) => (a.product.name || '').localeCompare(b.product.name || ''));
      setTiendaItems(items);
    } catch (error) {
      console.error('Error cargando stock de Tienda Local:', error);
      toast.error('Error al cargar inventario de Tienda Local');
    } finally {
      setLoading(false);
    }
  };

  // Marcas únicas disponibles para filtro
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    tiendaItems.forEach(item => {
      if (item.product.brand) brands.add(item.product.brand.trim());
    });
    return ['all', ...Array.from(brands).sort()];
  }, [tiendaItems]);

  // Filtrado de productos en Tienda Local
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return tiendaItems.filter(item => {
      const p = item.product;
      const matchesSearch =
        !term ||
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term));

      const matchesBrand = selectedBrand === 'all' || p.brand === selectedBrand;
      return matchesSearch && matchesBrand;
    });
  }, [tiendaItems, searchTerm, selectedBrand]);

  // Agregar al carrito
  const addToCart = (item: TiendaLocalItem) => {
    const existing = cart.find(c => c.productId === item.productId);

    if (existing) {
      if (existing.quantity >= item.quantity) {
        toast.error(`Solo hay ${item.quantity} disponibles en Tienda Local`);
        return;
      }
      setCart(cart.map(c => {
        if (c.productId === item.productId) {
          const newQty = c.quantity + 1;
          return {
            ...c,
            quantity: newQty,
            totalPrice: newQty * c.unitPrice
          };
        }
        return c;
      }));
      toast.success(`+1 ${item.product.name}`, { duration: 1500 });
    } else {
      const regularPrice = item.unitPrice;
      const newItem: MobileCartItem = {
        id: `cart_${Date.now()}_${item.productId}`,
        productId: item.productId,
        inventoryDocId: item.inventoryDocId,
        name: item.product.name,
        brand: item.product.brand,
        sku: item.product.sku || '',
        barcode: item.product.barcode || item.product.sku || '',
        imageUrl: item.product.imageUrl,
        quantity: 1,
        availableStock: item.quantity,
        originalPrice: regularPrice,
        unitPrice: regularPrice,
        isPriceEdited: false,
        totalPrice: regularPrice,
        cost: item.cost
      };
      setCart([...cart, newItem]);
      toast.success(`${item.product.name} agregado`, { duration: 1500 });
    }
  };

  // Modificar cantidad en carrito
  const updateItemQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.productId === productId) {
        if (newQty > item.availableStock) {
          toast.error(`Stock máximo disponible: ${item.availableStock}`);
          return item;
        }
        return {
          ...item,
          quantity: newQty,
          totalPrice: newQty * item.unitPrice
        };
      }
      return item;
    }));
  };

  // MODIFICAR PRECIO UNITARIO (Requerimiento clave: vender de $55 a $50)
  const updateItemPrice = (productId: string, priceInput: string) => {
    const newPrice = parseFloat(priceInput);
    if (isNaN(newPrice) || newPrice < 0) return;

    setCart(cart.map(item => {
      if (item.productId === productId) {
        const roundedPrice = Math.round((newPrice + Number.EPSILON) * 100) / 100;
        return {
          ...item,
          unitPrice: roundedPrice,
          isPriceEdited: Math.abs(roundedPrice - item.originalPrice) > 0.01,
          totalPrice: item.quantity * roundedPrice
        };
      }
      return item;
    }));
  };

  // Quitar del carrito
  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  // Escaneo de código de barras
  const handleBarcodeScanned = (barcode: string) => {
    const clean = barcode.trim().toLowerCase();
    const cleanNoLeading = clean.replace(/^0+/, '');

    const found = tiendaItems.find(i => {
      const b = (i.product.barcode || '').toLowerCase();
      const sku = (i.product.sku || '').toLowerCase();
      return b === clean || b === cleanNoLeading || sku === clean || sku === cleanNoLeading;
    });

    if (found) {
      addToCart(found);
      setShowScanner(false);
    } else {
      toast.error(`Código "${barcode}" no encontrado en Tienda Local`);
    }
  };

  // Cálculos de Totales
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const total = subtotal;

  // Cálculo de Cambio / Vuelto
  const cashReceived = parseFloat(cashReceivedStr) || 0;
  const change = paymentMethod === 'cash' ? Math.max(0, cashReceived - total) : 0;
  const cashRemaining = paymentMethod === 'cash' && cashReceived > 0 && cashReceived < total ? (total - cashReceived) : 0;

  // Generar correlativo de venta
  const generateConsecutiveSaleNumber = async (): Promise<string> => {
    try {
      const q = query(collection(db, 'pos_sales'), orderBy('createdAt', 'desc'), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        return 'POS-M-000001';
      }
      const last = snap.docs[0].data() as any;
      const numPart = String(last.saleNumber || '').replace(/[^0-9]/g, '');
      const nextNum = (parseInt(numPart, 10) || 0) + 1;
      return `POS-M-${String(nextNum).padStart(6, '0')}`;
    } catch {
      return `POS-M-${Date.now().toString().slice(-6)}`;
    }
  };

  // Procesar y Registrar Venta
  const handleProcessSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      toast.error('El carrito de venta está vacío');
      return;
    }

    if (!customerName.trim()) {
      toast.error('Por favor ingresa el nombre del cliente');
      return;
    }

    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      toast.error('Ingresa un correo electrónico válido para enviar la nota de venta');
      return;
    }

    if (paymentMethod === 'cash' && cashReceived < total) {
      toast.error(`El monto recibido ($${cashReceived.toFixed(2)}) es menor que el total ($${total.toFixed(2)})`);
      return;
    }

    try {
      setIsSubmitting(true);
      const saleNumber = await generateConsecutiveSaleNumber();
      const now = new Date();
      const batch = writeBatch(db);

      // 1. Validar y descontar stock de Tienda Local
      for (const item of cart) {
        const invRef = doc(db, 'inventory', item.inventoryDocId);
        const newQty = Math.max(0, item.availableStock - item.quantity);
        const cost = item.cost;
        batch.update(invRef, {
          quantity: newQty,
          totalCost: newQty * cost,
          totalValue: newQty * cost,
          lastUpdated: Timestamp.now()
        });
      }

      // 2. Crear documento de Venta en pos_sales
      const saleRef = doc(collection(db, 'pos_sales'));
      const saleData: PointOfSale = {
        id: saleRef.id,
        saleNumber,
        date: now,
        createdAt: now,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerCedula.trim() ? `C.I./RUC: ${customerCedula.trim()}` : undefined,
        items: cart.map(item => ({
          id: item.id,
          productId: item.productId,
          product: {
            id: item.productId,
            name: item.name,
            brand: item.brand,
            sku: item.sku,
            barcode: item.barcode,
            imageUrl: item.imageUrl,
            salePrice1: item.originalPrice,
            salePrice2: item.unitPrice,
            cost: item.cost
          } as Product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.isPriceEdited ? Math.max(0, (item.originalPrice - item.unitPrice) * item.quantity) : 0,
          totalPrice: item.totalPrice
        })),
        subtotal,
        tax: 0,
        discount: cart.reduce((sum, item) => sum + (item.isPriceEdited ? Math.max(0, (item.originalPrice - item.unitPrice) * item.quantity) : 0), 0),
        total,
        paymentMethod,
        cashReceived: paymentMethod === 'cash' ? cashReceived : undefined,
        change: paymentMethod === 'cash' ? change : undefined,
        status: 'completed',
        createdBy: sellerName,
        notes: `Venta POS Móvil - Local Falconi`
      };

      batch.set(saleRef, {
        ...saleData,
        date: Timestamp.fromDate(now),
        createdAt: Timestamp.fromDate(now),
        customerCedula: customerCedula.trim() || undefined,
        location: 'Tienda Local',
        source: 'pos-mobil'
      });

      // 3. Registrar Log de inventario
      for (const item of cart) {
        const logRef = doc(collection(db, 'inventory_logs'));
        batch.set(logRef, {
          type: 'sale',
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          location: 'Tienda Local',
          reason: `Venta POS Móvil #${saleNumber} a ${customerName.trim()}`,
          createdAt: Timestamp.fromDate(now),
          user: sellerName
        });
      }

      // Ejecutar lote de escrituras en Firestore
      await batch.commit();

      // 4. Guardar/Actualizar cliente en clientes POS
      try {
        await posCustomerService.create({
          name: customerName.trim(),
          email: customerEmail.trim().toLowerCase(),
          phone: customerPhone.trim() || undefined,
          address: customerCedula.trim() ? `C.I: ${customerCedula.trim()}` : undefined,
          totalPurchases: total,
          lastPurchaseDate: now,
          isActive: true
        });
      } catch (err) {
        console.warn('No se pudo registrar cliente en pos_customers:', err);
      }

      // 5. Enviar Nota de Venta por Correo Electrónico
      let sentSuccess = false;
      let emailMsg = '';

      try {
        const emailPayload = {
          toEmail: customerEmail.trim().toLowerCase(),
          customerName: customerName.trim(),
          customerCedula: customerCedula.trim() || undefined,
          saleNumber,
          date: now.toISOString(),
          items: cart.map(it => ({
            name: it.brand ? `${it.brand} - ${it.name}` : it.name,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice
          })),
          subtotal,
          total,
          paymentMethod: paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'transfer' ? 'Transferencia' : 'Tarjeta',
          staffName: sellerName,
          location: 'Tienda Local Falconi'
        };

        const response = await fetch(getApiUrl('/api/pos/send-receipt'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload)
        });

        const resData = await response.json();
        if (response.ok && resData.success !== false) {
          sentSuccess = true;
          emailMsg = `Comprobante enviado a ${customerEmail.trim()}`;
          toast.success(`📧 Nota de venta enviada a ${customerEmail.trim()}`);
        } else {
          emailMsg = resData.error || resData.message || 'No se pudo enviar el correo';
          console.warn('Respuesta servidor email:', resData);
        }
      } catch (emailErr: any) {
        console.error('Error al enviar correo:', emailErr);
        emailMsg = 'Error al conectar con servidor de correos';
      }

      setEmailStatus({ sent: sentSuccess, message: emailMsg });
      setCompletedSale(saleData);
      setShowCheckout(false);
      toast.success(`✓ Venta ${saleNumber} registrada exitosamente`);

      // Refrescar stock de Tienda Local
      loadTiendaLocalStock();
    } catch (error: any) {
      console.error('Error procesando venta:', error);
      toast.error(error.message || 'Error al procesar la venta');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reiniciar para nueva venta
  const handleResetForNewSale = () => {
    setCart([]);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerCedula('');
    setCashReceivedStr('');
    setCompletedSale(null);
    setEmailStatus(null);
    setShowCheckout(false);
  };

  // Compartir por WhatsApp
  const handleShareWhatsApp = () => {
    if (!completedSale) return;
    const phoneClean = customerPhone.replace(/[^0-9]/g, '');
    const itemsText = completedSale.items
      .map(it => `• ${it.quantity}x ${it.product?.name || 'Perfume'} - $${it.unitPrice.toFixed(2)} ($${it.totalPrice.toFixed(2)})`)
      .join('\n');

    const message =
      `*FALCONI PERFUMES - COMPROBANTE DE VENTA*\n` +
      `----------------------------------------\n` +
      `*Nota N°:* ${completedSale.saleNumber}\n` +
      `*Cliente:* ${completedSale.customerName}\n` +
      `*Fecha:* ${new Date(completedSale.date).toLocaleDateString('es-EC')}\n` +
      `*Atendido por:* ${completedSale.createdBy}\n\n` +
      `*Detalle:*\n${itemsText}\n\n` +
      `*TOTAL:* $${completedSale.total.toFixed(2)}\n` +
      `*Pago:* ${completedSale.paymentMethod.toUpperCase()}\n` +
      (completedSale.change ? `*Cambio Entregado:* $${completedSale.change.toFixed(2)}\n` : '') +
      `\n¡Gracias por su compra! La nota formal fue enviada a su correo: ${completedSale.customerEmail}`;

    const url = phoneClean
      ? `https://wa.me/${phoneClean.startsWith('593') ? phoneClean : `593${phoneClean.replace(/^0/, '')}`}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none pb-24">
      {/* ─── HEADER MÓVIL ────────────────────────────────────────────── */}
      <header className="bg-slate-950/90 backdrop-blur-md sticky top-0 z-30 border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/app')}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition-all"
              title="Volver a la app"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-1.5">
                <Store className="w-4 h-4 text-purple-400" />
                <h1 className="text-base font-extrabold text-white tracking-wide">POS Móvil</h1>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold">
                  Tienda Local
                </span>
              </div>
              <button
                onClick={() => setShowSellerSelector(!showSellerSelector)}
                className="flex items-center space-x-1 text-xs text-slate-400 hover:text-purple-300 transition-colors"
              >
                <span>Vendedor: <strong className="text-slate-200">{sellerName}</strong></span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Botones de acción Header */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowScanner(true)}
              className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-md shadow-purple-900/30 active:scale-95 flex items-center space-x-1"
              title="Escanear código con cámara"
            >
              <Camera className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Escanear</span>
            </button>

            <button
              onClick={loadTiendaLocalStock}
              className={`p-2 bg-slate-800 text-slate-300 rounded-xl hover:text-white active:scale-95 ${loading ? 'animate-spin' : ''}`}
              title="Refrescar catálogo"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selector rápido de vendedor si se activa */}
        {showSellerSelector && (
          <div className="mt-2 p-2 bg-slate-800 rounded-xl border border-slate-700 animate-fadeIn">
            <p className="text-[11px] text-slate-400 font-semibold mb-1">Seleccionar Asesor:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {MAIN_SELLERS.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSellerName(s.name);
                    setShowSellerSelector(false);
                    toast.success(`Asesor activo: ${s.name}`);
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors ${
                    sellerName === s.name ? 'bg-purple-600 text-white' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{s.avatar}</span>
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buscador de Producto / Barcode */}
        <div className="mt-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={barcodeInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchTerm.trim()) {
                handleBarcodeScanned(searchTerm.trim());
              }
            }}
            placeholder="Buscar perfume por nombre, marca o SKU..."
            className="w-full bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-400 pl-9 pr-9 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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

        {/* Chips de Marcas */}
        {availableBrands.length > 2 && (
          <div className="flex space-x-1.5 overflow-x-auto no-scrollbar mt-2.5 pb-1">
            {availableBrands.map(brand => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${
                  selectedBrand === brand
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {brand === 'all' ? '✨ Todas las marcas' : brand}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ─── CONTENIDO: CATÁLOGO TIENDA LOCAL ──────────────────────── */}
      <main className="flex-1 p-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mb-2" />
            <p className="text-sm font-semibold">Cargando perfumes de Tienda Local...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-8 text-center my-6">
            <div className="w-14 h-14 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No se encontraron perfumes</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
              {searchTerm
                ? `No hay coincidencias para "${searchTerm}" en el inventario actual de Tienda Local.`
                : 'Aún no hay productos transferidos a Tienda Local.'}
            </p>
            <button
              onClick={() => navigate('/warehouse-ecuador')}
              className="text-xs font-bold text-purple-400 hover:text-purple-300 underline"
            >
              Ir a Bodega Ecuador para transferir mercadería →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {filteredProducts.map(item => {
              const inCartItem = cart.find(c => c.productId === item.productId);
              const hasCart = !!inCartItem;

              return (
                <div
                  key={item.inventoryDocId}
                  className={`bg-slate-800/80 rounded-2xl p-2.5 border transition-all flex flex-col justify-between relative group ${
                    hasCart ? 'border-purple-500/80 shadow-md shadow-purple-950/40 bg-slate-800' : 'border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  {/* Badge de Stock en Tienda */}
                  <span
                    className={`absolute top-2 right-2 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md z-10 shadow-sm ${
                      item.quantity <= 2
                        ? 'bg-amber-500/90 text-slate-950'
                        : 'bg-emerald-500/90 text-white'
                    }`}
                  >
                    Stock: {item.quantity}
                  </span>

                  {/* Imagen y Detalle */}
                  <div
                    onClick={() => addToCart(item)}
                    className="cursor-pointer"
                  >
                    <div className="aspect-square bg-slate-900 rounded-xl overflow-hidden mb-2 flex items-center justify-center relative">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <Store className="w-8 h-8 text-slate-600" />
                      )}
                    </div>

                    <div className="mb-2">
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider truncate">
                        {item.product.brand || 'Falconi'}
                      </p>
                      <h3 className="text-xs font-bold text-white line-clamp-2 leading-tight">
                        {item.product.name}
                      </h3>
                      {item.product.sku && (
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                          SKU: {item.product.sku}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Precio y Controles */}
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 font-medium">PVP Sugerido</p>
                      <p className="text-sm font-extrabold text-white">
                        ${item.unitPrice.toFixed(2)}
                      </p>
                    </div>

                    {hasCart ? (
                      <div className="flex items-center space-x-1.5 bg-purple-950/80 border border-purple-500/50 p-1 rounded-xl">
                        <button
                          onClick={() => updateItemQuantity(item.productId, inCartItem.quantity - 1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 text-purple-300 flex items-center justify-center font-bold text-xs hover:bg-slate-700 active:scale-95"
                        >
                          -
                        </button>
                        <span className="text-xs font-extrabold text-purple-200 px-1">
                          {inCartItem.quantity}
                        </span>
                        <button
                          onClick={() => updateItemQuantity(item.productId, inCartItem.quantity + 1)}
                          className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs hover:bg-purple-500 active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="bg-purple-600 hover:bg-purple-500 active:scale-95 text-white p-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center"
                        title="Agregar al ticket"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── BARRA FLOTANTE DE VENTA (BOTTOM BAR) ───────────────────── */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-purple-500/30 p-3 shadow-2xl">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-11 h-11 bg-purple-600/20 text-purple-400 border border-purple-500/40 rounded-xl flex items-center justify-center relative">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Total a Cobrar</p>
                <p className="text-xl font-black text-white leading-tight">
                  ${total.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCart([])}
                className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 active:scale-95 transition-all"
                title="Vaciar ticket"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowCheckout(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm px-5 py-3 rounded-xl shadow-lg shadow-purple-900/40 active:scale-95 transition-all flex items-center space-x-2"
              >
                <span>Cobrar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL CHECKOUT & NOTA DE VENTA ────────────────────────── */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-slate-900 w-full sm:max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden animate-slideUp">
            {/* Header Checkout */}
            <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-600/20 text-purple-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white">Generar Nota de Venta</h2>
                  <p className="text-[11px] text-slate-400">Edita el precio de venta y datos del cliente</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario scrolleable */}
            <form onSubmit={handleProcessSale} className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 1. Perfumes a vender con PRECIO EDITABLE */}
              <div>
                <label className="block text-xs font-extrabold text-purple-300 uppercase tracking-wider mb-2">
                  1. Perfumes a Vender (Modifica el valor aquí):
                </label>
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  {cart.map(item => (
                    <div
                      key={item.id}
                      className="bg-slate-800/90 p-3 rounded-xl border border-slate-700/80 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-white leading-tight">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {item.brand || 'Falconi'} | Stock: {item.availableStock}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="text-slate-400 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Controles de Cantidad y Precio de Venta Editable */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/50 items-center">
                        {/* Cantidad */}
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                            className="w-7 h-7 bg-slate-700 text-white rounded-lg flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="text-xs font-extrabold text-white px-2">
                            {item.quantity} ud{item.quantity > 1 ? 's' : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                            className="w-7 h-7 bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>

                        {/* PRECIO UNITARIO EDITABLE (ej. 55 -> 50) */}
                        <div className="flex flex-col items-end">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs font-extrabold text-purple-400">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateItemPrice(item.productId, e.target.value)}
                              className="w-20 bg-slate-900 border-2 border-purple-500 text-white font-black text-right text-sm px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
                              title="Modifica el precio al que vendes este perfume"
                            />
                          </div>
                          {item.isPriceEdited ? (
                            <span className="text-[10px] text-amber-300 font-bold mt-0.5">
                              Regular: ${item.originalPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              Precio de lista
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-1 text-slate-300 font-semibold">
                        <span>Subtotal item:</span>
                        <span className="text-white font-extrabold">${item.totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Datos del Cliente (Nombre, Correo para email, Teléfono) */}
              <div>
                <label className="block text-xs font-extrabold text-purple-300 uppercase tracking-wider mb-2">
                  2. Datos del Cliente (Envío de Nota por Correo):
                </label>
                <div className="space-y-2.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                  {/* Nombre del Cliente */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Nombre del Cliente <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        className="w-full bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Correo Electrónico (REQUERIDO para enviar la nota) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Correo Electrónico <span className="text-purple-400">(recibirá la nota de venta) *</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="cliente@gmail.com"
                        className="w-full bg-slate-800 border border-purple-500/60 text-sm text-white placeholder-slate-500 pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Teléfono y Cédula en 2 columnas */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Teléfono <span className="text-slate-500">(opcional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="0991234567"
                          className="w-full bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 pl-8 pr-2.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        C.I. / RUC <span className="text-slate-500">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={customerCedula}
                        onChange={(e) => setCustomerCedula(e.target.value)}
                        placeholder="1723456789"
                        className="w-full bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Forma de Pago y Cambio (Vuelto) */}
              <div>
                <label className="block text-xs font-extrabold text-purple-300 uppercase tracking-wider mb-2">
                  3. Pago y Vuelto (Cambio):
                </label>
                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                  {/* Selector de método */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all ${
                        paymentMethod === 'cash'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Efectivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transfer')}
                      className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all ${
                        paymentMethod === 'transfer'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Transf.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all ${
                        paymentMethod === 'card'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Tarjeta</span>
                    </button>
                  </div>

                  {/* Si es Efectivo: Monto recibido y cálculo de cambio */}
                  {paymentMethod === 'cash' && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300">¿Cuánto Paga el Cliente?</label>
                        <span className="text-xs text-slate-400">Total: <strong>${total.toFixed(2)}</strong></span>
                      </div>

                      <div className="relative">
                        <DollarSign className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                        <input
                          type="number"
                          step="0.01"
                          value={cashReceivedStr}
                          onChange={(e) => setCashReceivedStr(e.target.value)}
                          placeholder="Monto entregado por el cliente"
                          className="w-full bg-slate-900 border-2 border-emerald-500/70 text-lg font-black text-white pl-10 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>

                      {/* Botones de billetes rápidos */}
                      <div className="flex space-x-1.5 overflow-x-auto pb-1">
                        <button
                          type="button"
                          onClick={() => setCashReceivedStr(total.toString())}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700 flex-shrink-0"
                        >
                          Exacto (${total.toFixed(2)})
                        </button>
                        {[10, 20, 50, 100].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setCashReceivedStr(val.toString())}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700 flex-shrink-0"
                          >
                            Billete ${val}
                          </button>
                        ))}
                      </div>

                      {/* Banner de Cambio (Vuelto) */}
                      {cashReceived > 0 && (
                        <div
                          className={`p-3 rounded-xl border flex items-center justify-between ${
                            cashReceived >= total
                              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                              : 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                          }`}
                        >
                          {cashReceived >= total ? (
                            <>
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-5 h-5 text-emerald-400" />
                                <span className="text-xs font-bold">Cambio a Entregar:</span>
                              </div>
                              <span className="text-xl font-black text-emerald-200">
                                ${change.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-bold">Falta para cubrir el total:</span>
                              <span className="text-base font-extrabold text-amber-200">
                                ${cashRemaining.toFixed(2)}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Botón de Submit Principal */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || cart.length === 0}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-xl shadow-purple-950/50 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Procesando y Enviando Nota...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>REGISTRAR VENTA Y ENVIAR NOTA (${total.toFixed(2)})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL DE ÉXITO DE VENTA ──────────────────────────────── */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-scaleUp">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-xl font-black text-white mb-1">¡Venta Registrada!</h2>
            <p className="text-xs text-purple-300 font-bold mb-4 font-mono">
              Nota N°: {completedSale.saleNumber}
            </p>

            {/* Cuadro resumen de pago y vuelto */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-left space-y-1.5 mb-4">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Cliente:</span>
                <span className="font-bold text-slate-200">{completedSale.customerName}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Total Cobrado:</span>
                <span className="font-bold text-white">${completedSale.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Forma de Pago:</span>
                <span className="font-bold text-slate-200 uppercase">{completedSale.paymentMethod}</span>
              </div>

              {completedSale.paymentMethod === 'cash' && typeof completedSale.change === 'number' && (
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-emerald-400 font-black">
                  <span className="text-xs">Cambio Entregado:</span>
                  <span className="text-base">${completedSale.change.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Estado del Correo */}
            <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-2.5 text-xs text-purple-200 mb-5 flex items-center justify-center space-x-1.5">
              <Mail className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span className="truncate">
                {emailStatus?.sent
                  ? `Comprobante enviado a ${completedSale.customerEmail}`
                  : `Nota registrada para ${completedSale.customerEmail}`}
              </span>
            </div>

            {/* Botones de Acción */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => generatePOSReceipt(completedSale)}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 border border-slate-700 active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Ver Recibo PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetForNewSale}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-sm active:scale-95 shadow-md shadow-purple-950"
              >
                + Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ESCÁNER DE CÓDIGO DE BARRAS CÁMARA ─────────────────────── */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
        title="Escanear Perfume en Tienda Local"
      />
    </div>
  );
};

export default PosMobile;
