import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Search,
  DollarSign,
  Calendar,
  User,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  Save,
  Loader2,
  Tag,
  AlertCircle
} from 'lucide-react';
import { collection, doc, getDocs, query, where, writeBatch, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Product } from '../../types';
import toast from 'react-hot-toast';

interface StoreStockItem {
  id: string; // inventory doc id
  productId: string;
  name: string;
  brand: string;
  barcode: string;
  sku: string;
  imageUrl: string;
  originalPrice: number;
  salePrice: number;
  cost: number;
  availableStock: number;
}

interface CartItem extends StoreStockItem {
  quantity: number;
  unitPrice: number;
  isPriceEdited: boolean;
  totalPrice: number;
}

interface AdminManualSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminManualSaleModal: React.FC<AdminManualSaleModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [loadingStock, setLoadingStock] = useState(true);
  const [storeStock, setStoreStock] = useState<StoreStockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Carrito de la venta manual
  const [cart, setCart] = useState<CartItem[]>([]);

  // Datos de la venta
  const [saleDateTime, setSaleDateTime] = useState<string>(() => {
    const now = new Date();
    // Formato local YYYY-MM-DDTHH:mm
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [customerName, setCustomerName] = useState('Cliente Tienda');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCedula, setCustomerCedula] = useState('');
  const [sellerName, setSellerName] = useState('Vilma');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [notes, setNotes] = useState('Venta no reportada previamente');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTiendaLocalStock();
      setCart([]);
      setCustomerName('Cliente Tienda');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerCedula('');
      setSellerName('Vilma');
      setPaymentMethod('cash');
      setNotes('Venta no reportada previamente');
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      setSaleDateTime(new Date(now.getTime() - tzOffset).toISOString().slice(0, 16));
    }
  }, [isOpen]);

  // Cargar inventario de Tienda Local
  const loadTiendaLocalStock = async () => {
    try {
      setLoadingStock(true);
      const invQ = query(collection(db, 'inventory'));
      const snap = await getDocs(invQ);

      const items: StoreStockItem[] = [];
      snap.docs.forEach(d => {
        const data = d.data() as any;
        const loc = String(data.location || '').toLowerCase();
        const qty = Number(data.quantity) || 0;

        if ((loc.includes('tienda') || loc.includes('local')) && qty > 0) {
          const p = data.product || {};
          const orig = Number(data.unitPrice) || Number(p.salePrice2) || Number(p.salePrice1) || 0;
          items.push({
            id: d.id,
            productId: data.productId || p.id || d.id,
            name: p.name || 'Perfume',
            brand: p.brand || '',
            barcode: p.barcode || p.sku || '',
            sku: p.sku || '',
            imageUrl: p.imageUrl || '',
            originalPrice: orig,
            salePrice: orig,
            cost: Number(data.cost) || Number(p.cost) || 0,
            availableStock: qty
          });
        }
      });

      // Ordenar alfabéticamente
      items.sort((a, b) => a.name.localeCompare(b.name));
      setStoreStock(items);
    } catch (err: any) {
      console.error('Error cargando stock de Tienda Local:', err);
      toast.error('Error al cargar inventario de Tienda Local');
    } finally {
      setLoadingStock(false);
    }
  };

  // Filtrar catálogo por búsqueda
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return storeStock.slice(0, 20);
    const q = searchTerm.toLowerCase().trim();
    return storeStock.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [storeStock, searchTerm]);

  // Agregar al carrito
  const handleAddToCart = (product: StoreStockItem) => {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      if (existing.quantity >= product.availableStock) {
        toast.error(`Solo hay ${product.availableStock} unidad(es) de ${product.name} en Tienda Local`);
        return;
      }
      setCart(cart.map(i =>
        i.id === product.id
          ? {
              ...i,
              quantity: i.quantity + 1,
              totalPrice: (i.quantity + 1) * i.unitPrice
            }
          : i
      ));
    } else {
      setCart([
        ...cart,
        {
          ...product,
          quantity: 1,
          unitPrice: product.salePrice,
          isPriceEdited: false,
          totalPrice: product.salePrice
        }
      ]);
    }
  };

  // Modificar precio unitario
  const handlePriceChange = (id: string, newPriceStr: string) => {
    const price = parseFloat(newPriceStr) || 0;
    setCart(cart.map(item => {
      if (item.id === id) {
        return {
          ...item,
          unitPrice: price,
          isPriceEdited: price !== item.originalPrice,
          totalPrice: price * item.quantity
        };
      }
      return item;
    }));
  };

  // Modificar cantidad
  const handleQtyChange = (id: string, newQty: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    if (newQty <= 0) {
      setCart(cart.filter(i => i.id !== id));
      return;
    }

    if (newQty > item.availableStock) {
      toast.error(`Stock máximo disponible: ${item.availableStock}`);
      return;
    }

    setCart(cart.map(i =>
      i.id === id
        ? {
            ...i,
            quantity: newQty,
            totalPrice: newQty * i.unitPrice
          }
        : i
    ));
  };

  // Cálculos de totales
  const total = useMemo(() => cart.reduce((sum, i) => sum + i.totalPrice, 0), [cart]);

  // Generar número consecutivo
  const generateSaleNumber = async (): Promise<string> => {
    try {
      const q = query(collection(db, 'pos_sales'), orderBy('createdAt', 'desc'), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return 'POS-000001';
      const last = snap.docs[0].data();
      const lastNum = parseInt((last.saleNumber || 'POS-000000').replace(/[^0-9]/g, '')) || 0;
      return `POS-${(lastNum + 1).toString().padStart(6, '0')}`;
    } catch {
      return `POS-${Date.now().toString().slice(-6)}`;
    }
  };

  // Helper recursivo para Firestore sin undefined
  const sanitizeForFirestore = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
    if (typeof obj === 'object') {
      if (obj.toDate || obj._methodName || (obj.constructor && obj.constructor.name === 'Timestamp')) {
        return obj;
      }
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) {
          clean[k] = sanitizeForFirestore(v);
        }
      }
      return clean;
    }
    return obj;
  };

  // Guardar venta manual
  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      toast.error('Agrega al menos un perfume al detalle de venta');
      return;
    }

    if (!customerName.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }

    try {
      setSubmitting(true);
      const saleDate = saleDateTime ? new Date(saleDateTime) : new Date();
      const saleNumber = await generateSaleNumber();
      const batch = writeBatch(db);

      // 1. Descontar stock en Tienda Local
      for (const item of cart) {
        const invRef = doc(db, 'inventory', item.id);
        const newQty = Math.max(0, item.availableStock - item.quantity);
        batch.update(invRef, {
          quantity: newQty,
          totalCost: newQty * item.cost,
          totalValue: newQty * item.cost,
          lastUpdated: Timestamp.now()
        });
      }

      // 2. Crear documento en pos_sales
      const saleRef = doc(collection(db, 'pos_sales'));
      const salePayload = sanitizeForFirestore({
        id: saleRef.id,
        saleNumber,
        date: Timestamp.fromDate(saleDate),
        createdAt: Timestamp.fromDate(new Date()),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerCedula.trim() ? `C.I./RUC: ${customerCedula.trim()}` : '',
        customerCedula: customerCedula.trim(),
        location: 'Tienda Local',
        source: 'admin-manual',
        items: cart.map(item => ({
          id: item.id,
          productId: item.productId,
          inventoryDocId: item.id,
          product: {
            id: item.productId,
            name: item.name || '',
            brand: item.brand || '',
            sku: item.sku || '',
            barcode: item.barcode || '',
            imageUrl: item.imageUrl || '',
            salePrice1: item.originalPrice || 0,
            salePrice2: item.unitPrice || 0,
            cost: item.cost || 0
          },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.isPriceEdited ? Math.max(0, (item.originalPrice - item.unitPrice) * item.quantity) : 0,
          totalPrice: item.totalPrice
        })),
        subtotal: total,
        tax: 0,
        discount: cart.reduce((sum, item) => sum + (item.isPriceEdited ? Math.max(0, (item.originalPrice - item.unitPrice) * item.quantity) : 0), 0),
        total,
        paymentMethod,
        cashReceived: paymentMethod === 'cash' ? total : 0,
        change: 0,
        status: 'completed',
        createdBy: sellerName.trim() || 'Admin',
        notes: notes.trim() ? `[Venta Manual Admin]: ${notes.trim()}` : '[Venta Manual Admin]'
      });

      batch.set(saleRef, salePayload);

      // 3. Registrar logs de inventario
      for (const item of cart) {
        const logRef = doc(collection(db, 'inventory_logs'));
        batch.set(logRef, sanitizeForFirestore({
          type: 'sale',
          productId: item.productId,
          productName: item.name || 'Perfume',
          quantity: item.quantity,
          location: 'Tienda Local',
          reason: `Venta manual #${saleNumber} a ${customerName.trim()} (Fecha venta: ${saleDate.toLocaleDateString()})`,
          createdAt: Timestamp.fromDate(saleDate),
          user: sellerName.trim() || 'Admin'
        }));
      }

      await batch.commit();

      toast.success(`✓ Venta ${saleNumber} registrada correctamente`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error registrando venta manual:', err);
      toast.error(err.message || 'Error al registrar venta manual');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-5 shrink-0 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Registrar Venta Manual (Tienda Local)</h2>
              <p className="text-xs text-emerald-100">Crea o reporta ventas que se realizaron físicamente y no fueron registradas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Columna Izquierda: Selector de Perfumes de Tienda Local */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Perfumes en Tienda Local ({storeStock.length})
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold">Toca para agregar</span>
              </div>

              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar perfume por nombre, marca o código..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Lista de productos disponibles */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 max-h-72 overflow-y-auto space-y-1.5">
                {loadingStock ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1 text-emerald-600" />
                    Cargando stock de Tienda Local...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No se encontraron perfumes con stock en Tienda Local
                  </div>
                ) : (
                  filteredProducts.map(p => {
                    const inCart = cart.find(c => c.id === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddToCart(p)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                          inCart
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-sm'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-800 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {p.brand && `${p.brand} · `}Stock tienda: <strong className="text-emerald-700">{p.availableStock}</strong>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-xs text-slate-900 block">${p.salePrice.toFixed(2)}</span>
                          {inCart && (
                            <span className="text-[10px] text-emerald-600 font-bold">En venta: {inCart.quantity}</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Columna Derecha: Carrito con precios modificables + Datos de la venta */}
            <div className="lg:col-span-7 space-y-4">

              {/* Detalle de Productos a Vender */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Productos Seleccionados ({cart.length})
                  </span>
                  <span className="text-xs font-black text-emerald-700">
                    Total: ${total.toFixed(2)}
                  </span>
                </div>

                {cart.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-400 text-xs">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Selecciona perfumes de la lista izquierda para incluirlos en esta venta.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {cart.map(item => (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400">
                            Lista: ${item.originalPrice.toFixed(2)} | Disp: {item.availableStock}
                          </p>
                        </div>

                        {/* Modificación de Precio */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Precio Venta ($):</span>
                            <div className="relative w-24">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={e => handlePriceChange(item.id, e.target.value)}
                                className={`w-full pl-6 pr-2 py-1 rounded-lg border text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                  item.isPriceEdited ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-slate-50 border-slate-300'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Control de cantidad */}
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Cantidad:</span>
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleQtyChange(item.id, item.quantity - 1)}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold"
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-bold font-mono">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleQtyChange(item.id, item.quantity + 1)}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Subtotal del item */}
                          <div className="text-right w-16">
                            <span className="text-[10px] text-slate-400 block font-semibold">Subtotal:</span>
                            <span className="font-bold text-slate-900 font-mono">${item.totalPrice.toFixed(2)}</span>
                          </div>

                          {/* Eliminar del carrito */}
                          <button
                            type="button"
                            onClick={() => setCart(cart.filter(c => c.id !== item.id))}
                            className="p-1 text-slate-400 hover:text-red-600 transition"
                            title="Quitar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulario de Datos de la Venta */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Datos de la Venta / Registro
                </p>

                {/* Fecha y Hora (Permite poner fecha anterior para ventas no reportadas) */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Fecha y Hora de la Venta (Puedes poner fecha pasada):
                  </label>
                  <input
                    type="datetime-local"
                    value={saleDateTime}
                    onChange={e => setSaleDateTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Cliente */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-0.5">Nombre del Cliente *</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Ej: Juan Perez"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-0.5">Cédula / RUC (Opcional)</label>
                    <input
                      type="text"
                      value={customerCedula}
                      onChange={e => setCustomerCedula(e.target.value)}
                      placeholder="0999999999"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-0.5">Teléfono (Opcional)</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="0987654321"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-0.5">Correo (Opcional)</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      placeholder="cliente@correo.com"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Método de Pago y Vendedora */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Método de Pago:</label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { val: 'cash', label: 'Efectivo', icon: Banknote },
                        { val: 'transfer', label: 'Transf.', icon: Smartphone },
                        { val: 'card', label: 'Tarjeta', icon: CreditCard }
                      ].map(m => {
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.val}
                            type="button"
                            onClick={() => setPaymentMethod(m.val as any)}
                            className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 transition ${
                              paymentMethod === m.val
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Vendedora / Responsable:</label>
                    <div className="flex flex-wrap gap-1">
                      {['Vilma', 'Maria', 'Annabel', 'Yuri', 'Admin'].map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setSellerName(name)}
                          className={`text-[10px] px-2 py-1 rounded font-semibold transition ${
                            sellerName === name ? 'bg-emerald-600 text-white font-bold' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-slate-600 font-semibold mb-0.5">Notas / Observación:</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ej: Venta de mostrador no reportada"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <span className="text-xs text-slate-500 block">Total a Registrar:</span>
            <span className="text-2xl font-black text-slate-900 font-mono">${total.toFixed(2)}</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRegisterSale}
              disabled={submitting || cart.length === 0}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando Venta...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Registrar Venta en Sistema</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminManualSaleModal;
