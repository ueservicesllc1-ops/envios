import React, { useState, useMemo } from 'react';
import {
  X,
  Calculator,
  DollarSign,
  Banknote,
  Smartphone,
  CreditCard,
  Lock,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  Filter,
  Printer,
  Package,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  FileText,
  Clock,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { PointOfSale, CashClosure } from '../../types';

interface StoreAccountingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: PointOfSale[];
  closures: CashClosure[];
  onOpenManualSale?: () => void;
  onOpenClosureModal?: () => void;
  onRefreshData?: () => void;
}

export const StoreAccountingModal: React.FC<StoreAccountingModalProps> = ({
  isOpen,
  onClose,
  sales,
  closures,
  onOpenManualSale,
  onOpenClosureModal,
  onRefreshData
}) => {
  // Filtros de fecha y vendedora
  const [periodPreset, setPeriodPreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'all' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [selectedSeller, setSelectedSeller] = useState<string>('all');

  // Sub-pestaña dentro del modal
  const [activeSubTab, setActiveSubTab] = useState<'balance' | 'sales_detail' | 'closures_detail'>('balance');
  const [salesSearch, setSalesSearch] = useState('');

  // Lista de vendedoras únicas
  const sellerNames = useMemo(() => {
    const set = new Set<string>();
    sales.forEach(s => {
      if (s.createdBy && s.createdBy.trim()) set.add(s.createdBy.trim());
    });
    closures.forEach(c => {
      if (c.sellerName && c.sellerName.trim()) set.add(c.sellerName.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [sales, closures]);

  // Rango de fechas según el preset seleccionado
  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (periodPreset === 'today') {
      return { start: todayStart, end: todayEnd };
    }
    if (periodPreset === 'yesterday') {
      const yStart = new Date(todayStart);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(todayEnd);
      yEnd.setDate(yEnd.getDate() - 1);
      return { start: yStart, end: yEnd };
    }
    if (periodPreset === 'week') {
      const wStart = new Date(todayStart);
      wStart.setDate(wStart.getDate() - 7);
      return { start: wStart, end: todayEnd };
    }
    if (periodPreset === 'month') {
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { start: mStart, end: todayEnd };
    }
    if (periodPreset === 'last_month') {
      const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: lmStart, end: lmEnd };
    }
    if (periodPreset === 'custom') {
      const cStart = new Date(`${customStartDate}T00:00:00`);
      const cEnd = new Date(`${customEndDate}T23:59:59`);
      return { start: cStart, end: cEnd };
    }
    // all
    return { start: new Date(2020, 0, 1), end: new Date(2099, 11, 31) };
  }, [periodPreset, customStartDate, customEndDate]);

  // Filtrar ventas por fecha y vendedora
  const filteredSales = useMemo(() => {
    const { start, end } = dateRange;
    const startTime = start.getTime();
    const endTime = end.getTime();

    return sales.filter(s => {
      const sDate = new Date(s.date || s.createdAt);
      const sTime = sDate.getTime();
      if (sTime < startTime || sTime > endTime) return false;

      if (selectedSeller !== 'all') {
        const creator = (s.createdBy || '').toLowerCase();
        if (!creator.includes(selectedSeller.toLowerCase())) return false;
      }

      return true;
    });
  }, [sales, dateRange, selectedSeller]);

  // Filtrar cierres por fecha y vendedora
  const filteredClosures = useMemo(() => {
    const { start, end } = dateRange;
    const startTime = start.getTime();
    const endTime = end.getTime();

    return closures.filter(c => {
      const cDate = new Date(c.date || c.createdAt);
      const cTime = cDate.getTime();
      if (cTime < startTime || cTime > endTime) return false;

      if (selectedSeller !== 'all') {
        const sName = (c.sellerName || '').toLowerCase();
        if (!sName.includes(selectedSeller.toLowerCase())) return false;
      }

      return true;
    });
  }, [closures, dateRange, selectedSeller]);

  // Cálculos Contables y de Cuadre
  const accounting = useMemo(() => {
    let totalSalesGross = 0;
    let cashSales = 0;
    let transferSales = 0;
    let cardSales = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let totalCogs = 0;
    let totalPerfumesSold = 0;

    let unclosedSalesCount = 0;
    let unclosedCashTotal = 0;
    let unclosedTotalSales = 0;

    for (const s of filteredSales) {
      if (s.status === 'completed') {
        completedCount++;
        const tot = Number(s.total) || 0;
        totalSalesGross += tot;

        // Desglose de pagos
        if (s.paymentMethod === 'cash') {
          cashSales += tot;
        } else if (s.paymentMethod === 'transfer') {
          transferSales += tot;
        } else if (s.paymentMethod === 'card') {
          cardSales += tot;
        } else if (s.paymentMethod === 'mixed') {
          cashSales += Number(s.cashReceived) || 0;
          cardSales += Number(s.cardAmount) || 0;
          transferSales += Number(s.transferAmount) || 0;
        }

        // Costo de mercadería
        for (const item of s.items || []) {
          const qty = Number(item.quantity) || 1;
          const cost = Number((item as any).cost || item.product?.cost) || 0;
          totalCogs += cost * qty;
          totalPerfumesSold += qty;
        }

        // Ventas pendientes de cierre
        if (!s.closureId) {
          unclosedSalesCount++;
          unclosedTotalSales += tot;
          if (s.paymentMethod === 'cash') {
            unclosedCashTotal += tot;
          } else if (s.paymentMethod === 'mixed') {
            unclosedCashTotal += Number(s.cashReceived) || 0;
          }
        }
      } else if (s.status === 'cancelled') {
        cancelledCount++;
      }
    }

    const grossProfit = totalSalesGross - totalCogs;
    const profitMargin = totalSalesGross > 0 ? (grossProfit / totalSalesGross) * 100 : 0;
    const ticketAverage = completedCount > 0 ? totalSalesGross / completedCount : 0;

    // Cierres de caja en el período
    let totalDepositedToBank = 0;
    let totalCashKeptInRegister = 0;
    let totalExpectedCashFromClosures = 0;
    let totalCountedInClosures = 0;
    let totalClosureDifference = 0;

    for (const c of filteredClosures) {
      totalDepositedToBank += Number(c.amountToDeposit) || 0;
      totalCashKeptInRegister += Number(c.cashKeptInRegister) || 0;
      totalExpectedCashFromClosures += Number(c.expectedCash) || 0;
      totalCountedInClosures += Number(c.cashCounted) || 0;
      totalClosureDifference += Number(c.difference) || 0;
    }

    // Cuadre de Efectivo:
    // Efectivo total que entró por ventas vs Efectivo conciliado (depositado + en caja chica + pendiente sin cerrar)
    const totalCashReconciled = totalDepositedToBank + totalCashKeptInRegister + unclosedCashTotal;
    const cashNetDifference = Math.round((totalCashReconciled - cashSales) * 100) / 100;

    return {
      totalSalesGross,
      cashSales,
      transferSales,
      cardSales,
      completedCount,
      cancelledCount,
      totalCogs,
      grossProfit,
      profitMargin,
      ticketAverage,
      totalPerfumesSold,
      unclosedSalesCount,
      unclosedCashTotal,
      unclosedTotalSales,
      totalDepositedToBank,
      totalCashKeptInRegister,
      totalExpectedCashFromClosures,
      totalCountedInClosures,
      totalClosureDifference,
      totalCashReconciled,
      cashNetDifference
    };
  }, [filteredSales, filteredClosures]);

  // Búsqueda en el detalle de ventas
  const searchedSales = useMemo(() => {
    if (!salesSearch.trim()) return filteredSales;
    const q = salesSearch.toLowerCase().trim();
    return filteredSales.filter(s => {
      const num = (s.saleNumber || '').toLowerCase();
      const client = (s.customerName || '').toLowerCase();
      const email = (s.customerEmail || '').toLowerCase();
      const phone = (s.customerPhone || '').toLowerCase();
      const ced = ((s as any).customerCedula || '').toLowerCase();
      const seller = (s.createdBy || '').toLowerCase();
      const notes = (s.notes || '').toLowerCase();
      const hasProd = s.items?.some(it => (it.product?.name || '').toLowerCase().includes(q));
      return num.includes(q) || client.includes(q) || email.includes(q) || phone.includes(q) || ced.includes(q) || seller.includes(q) || notes.includes(q) || hasProd;
    });
  }, [filteredSales, salesSearch]);

  if (!isOpen) return null;

  // Imprimir reporte de cuadre
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden border border-slate-100 animate-scale-up">
        {/* ─── HEADER DEL MODAL ─────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-inner">
              <Calculator className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">Contabilidad & Cuadre</h2>
                <span className="text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Tienda Local
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Conciliación de ventas, ingresos por método, depósitos bancarios y márgenes de ganancia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onRefreshData && (
              <button
                onClick={onRefreshData}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-white active:scale-95"
                title="Actualizar datos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl transition active:scale-95"
              title="Imprimir informe contable"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir Cuadre</span>
            </button>

            {onOpenManualSale && (
              <button
                onClick={() => { onClose(); onOpenManualSale(); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow transition active:scale-95"
                title="Registrar una venta pasada"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden sm:inline">Venta Manual</span>
              </button>
            )}

            {onOpenClosureModal && (
              <button
                onClick={() => { onClose(); onOpenClosureModal(); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs rounded-xl shadow transition active:scale-95"
                title="Hacer cierre de caja"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cierre Caja</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/25 rounded-xl transition text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── BARRA DE FILTROS (PRESETS Y VENDEDORA) ───────────────── */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Presets de Período */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              <span className="text-slate-400 font-bold uppercase text-[10px] mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Período:
              </span>
              {[
                { id: 'today', label: 'Hoy' },
                { id: 'yesterday', label: 'Ayer' },
                { id: 'week', label: 'Últimos 7 días' },
                { id: 'month', label: 'Este Mes' },
                { id: 'last_month', label: 'Mes Pasado' },
                { id: 'all', label: 'Historial Completo' },
                { id: 'custom', label: 'Personalizado' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriodPreset(p.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                    periodPreset === p.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Selector de Vendedora */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Vendedora:
              </span>
              <select
                value={selectedSeller}
                onChange={e => setSelectedSeller(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">Todas las vendedoras</option>
                {sellerNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rango de fechas personalizado si aplica */}
          {periodPreset === 'custom' && (
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 text-xs animate-fade-in">
              <span className="text-slate-500 font-medium">Desde:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-slate-500 font-medium">Hasta:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* ─── PESTAÑAS DE VISTA INTERNA ───────────────────────────── */}
        <div className="px-5 pt-3 border-b border-slate-200 flex items-center gap-2 bg-white">
          <button
            onClick={() => setActiveSubTab('balance')}
            className={`pb-3 px-3 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === 'balance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Resumen & Cuadre Contable</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sales_detail')}
            className={`pb-3 px-3 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === 'sales_detail'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Detalle de Ventas ({filteredSales.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('closures_detail')}
            className={`pb-3 px-3 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === 'closures_detail'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Cierres & Depósitos ({filteredClosures.length})</span>
          </button>
        </div>

        {/* ─── CONTENIDO CON SCROLL ─────────────────────────────────── */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* ══════════════════════════════════════════════════════════
              SUBTAB 1: BALANCE GENERAL & CUADRE
             ══════════════════════════════════════════════════════════ */}
          {activeSubTab === 'balance' && (
            <div className="space-y-6 animate-fade-in">

              {/* BANNER DE CUADRE CONTABLE */}
              <div className={`p-5 rounded-3xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 ${
                accounting.cashNetDifference === 0
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  : accounting.cashNetDifference > 0
                  ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                  : 'bg-red-50/90 border-red-200 text-red-950'
              }`}>
                <div className="flex items-center space-x-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${
                    accounting.cashNetDifference === 0
                      ? 'bg-emerald-600 text-white'
                      : accounting.cashNetDifference > 0
                      ? 'bg-amber-500 text-white'
                      : 'bg-red-600 text-white'
                  }`}>
                    {accounting.cashNetDifference === 0 ? (
                      <CheckCircle2 className="w-8 h-8" />
                    ) : (
                      <AlertTriangle className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-75">
                      Estado de Conciliación de Caja
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black leading-tight">
                      {accounting.cashNetDifference === 0
                        ? '¡Caja Cuadrada Perfectamente!'
                        : accounting.cashNetDifference > 0
                        ? `Sobrante en Caja: +$${accounting.cashNetDifference.toFixed(2)}`
                        : `Faltante / Descuadre en Caja: -$${Math.abs(accounting.cashNetDifference).toFixed(2)}`}
                    </h3>
                    <p className="text-xs opacity-90 mt-0.5">
                      {accounting.cashNetDifference === 0
                        ? 'Todo el efectivo recaudado en ventas coincide exactamente con lo depositado en bancos, el fondo de caja y las ventas pendientes.'
                        : accounting.cashNetDifference > 0
                        ? 'Existe más efectivo depositado y contado en caja que el total reportado en notas de venta del período.'
                        : 'Hay menos efectivo depositado/contado del que se registró como cobrado en las ventas del período.'}
                    </p>
                  </div>
                </div>

                {accounting.unclosedSalesCount > 0 && onOpenClosureModal && (
                  <button
                    onClick={() => { onClose(); onOpenClosureModal(); }}
                    className="flex-shrink-0 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
                  >
                    <Lock className="w-4 h-4 text-amber-300" />
                    <span>Cerrar ${accounting.unclosedCashTotal.toFixed(2)} Pendientes</span>
                  </button>
                )}
              </div>

              {/* 4 GRANDES PILARES CONTABLES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. VENTAS TOTALES */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">1. Total Facturado</span>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                      ${accounting.totalSalesGross.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {accounting.completedCount} ventas completadas
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Ticket Promedio:</span>
                      <strong className="text-slate-900">${accounting.ticketAverage.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Perfumes Vendidos:</span>
                      <strong className="text-slate-900">{accounting.totalPerfumesSold} unids</strong>
                    </div>
                  </div>
                </div>

                {/* 2. COBROS POR MÉTODO */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">2. Métodos de Pago</span>
                    <div className="space-y-1.5 mt-2 text-xs">
                      <div className="flex justify-between items-center text-slate-600 bg-emerald-50/60 px-2 py-1 rounded-lg">
                        <span className="flex items-center gap-1 font-semibold text-emerald-800">
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Efectivo:
                        </span>
                        <strong className="text-emerald-950 font-black">${accounting.cashSales.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 bg-blue-50/60 px-2 py-1 rounded-lg">
                        <span className="flex items-center gap-1 font-semibold text-blue-800">
                          <Smartphone className="w-3.5 h-3.5 text-blue-600" /> Transf. Bancaria:
                        </span>
                        <strong className="text-blue-950 font-black">${accounting.transferSales.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 bg-purple-50/60 px-2 py-1 rounded-lg">
                        <span className="flex items-center gap-1 font-semibold text-purple-800">
                          <CreditCard className="w-3.5 h-3.5 text-purple-600" /> Tarjeta:
                        </span>
                        <strong className="text-purple-950 font-black">${accounting.cardSales.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 text-center font-medium">
                    Suma = ${accounting.totalSalesGross.toFixed(2)}
                  </div>
                </div>

                {/* 3. DEPÓSITOS Y CIERRES */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">3. Cierres & Depósitos</span>
                    <p className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">
                      ${accounting.totalDepositedToBank.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      depositado en banco ({filteredClosures.length} cortes)
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Fondo en Caja:</span>
                      <strong className="text-slate-900">${accounting.totalCashKeptInRegister.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Diferencia Arqueos:</span>
                      <strong className={accounting.totalClosureDifference >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                        {accounting.totalClosureDifference >= 0 ? '+' : ''}${accounting.totalClosureDifference.toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 4. RENTABILIDAD Y MÁRGENES */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-5 rounded-3xl text-white shadow-md flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">4. Rentabilidad Tienda</span>
                    <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                      ${accounting.grossProfit.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      utilidad bruta ({accounting.profitMargin.toFixed(1)}% margen)
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span>Costo Mercadería:</span>
                      <strong className="text-white">${accounting.totalCogs.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Ventas Canceladas:</span>
                      <span className="text-amber-300 font-bold">{accounting.cancelledCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TABLA COMPARATIVA DE CONCILIACIÓN DE EFECTIVO */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-emerald-600" />
                      <span>Cuadre Detallado del Flujo de Efectivo</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Comparativa entre el efectivo cobrado en ventas vs dinero depositado y en caja
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${
                    accounting.cashNetDifference === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : accounting.cashNetDifference > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {accounting.cashNetDifference === 0 ? '✓ Cuadre Exacto' : `Dif: $${accounting.cashNetDifference.toFixed(2)}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lado A: Entradas */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      Entradas Registradas (Ventas)
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-200/70">
                        <span className="text-slate-600">Efectivo Cobrado en Mostrador:</span>
                        <strong className="text-slate-900">${accounting.cashSales.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/70">
                        <span className="text-slate-600">Transferencias Bancarias Recibidas:</span>
                        <strong className="text-slate-900">${accounting.transferSales.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/70">
                        <span className="text-slate-600">Cobros con Tarjeta (Datáfono):</span>
                        <strong className="text-slate-900">${accounting.cardSales.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between pt-1 font-black text-sm text-slate-950">
                        <span>Total Ingresos por Ventas:</span>
                        <span>${accounting.totalSalesGross.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lado B: Destino del Efectivo */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      Destino y Custodia del Efectivo
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-200/70">
                        <span className="text-slate-600">Depositado en Banco (Cierres):</span>
                        <strong className="text-emerald-700">${accounting.totalDepositedToBank.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/70">
                        <span className="text-slate-600">Fondo Dejado en Caja (Vueltos):</span>
                        <strong className="text-slate-900">${accounting.totalCashKeptInRegister.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/70">
                        <span className="text-amber-700 font-semibold">Efectivo Pendiente de Cierre:</span>
                        <strong className="text-amber-700">${accounting.unclosedCashTotal.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between pt-1 font-black text-sm text-slate-950">
                        <span>Total Efectivo Contabilizado:</span>
                        <span>${accounting.totalCashReconciled.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nota de reconciliación */}
                {accounting.unclosedSalesCount > 0 && (
                  <div className="mt-4 p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-start space-x-3 text-xs text-amber-900">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold">Hay {accounting.unclosedSalesCount} venta(s) por un total de ${accounting.unclosedTotalSales.toFixed(2)} (${accounting.unclosedCashTotal.toFixed(2)} en efectivo) que aún no han sido asignadas a ningún Cierre de Caja.</span>
                      <p className="mt-0.5 text-amber-800">
                        Para cuadrar la caja del día, realiza el cierre haciendo clic en "Cierre Caja" arriba.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              SUBTAB 2: DETALLE DE VENTAS
             ══════════════════════════════════════════════════════════ */}
          {activeSubTab === 'sales_detail' && (
            <div className="space-y-4 animate-fade-in">
              {/* Buscador dentro del detalle */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={salesSearch}
                    onChange={e => setSalesSearch(e.target.value)}
                    placeholder="Filtrar por nota, cliente, vendedora, perfume..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {salesSearch && (
                    <button onClick={() => setSalesSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {searchedSales.length} ventas mostradas
                </span>
              </div>

              {/* Tabla de Ventas */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Nº Nota</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Vendedora</th>
                        <th className="px-4 py-3">Método</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Costo / Margen</th>
                        <th className="px-4 py-3 text-center">Estado Cierre</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {searchedSales.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            No hay ventas en este período con los filtros seleccionados
                          </td>
                        </tr>
                      ) : (
                        searchedSales.map(sale => {
                          const saleDate = new Date(sale.date || sale.createdAt);
                          const isCancelled = sale.status === 'cancelled';
                          const saleCogs = (sale.items || []).reduce((sum, it) => sum + (((Number((it as any).cost || it.product?.cost) || 0)) * (Number(it.quantity) || 1)), 0);
                          const profit = sale.total - saleCogs;

                          return (
                            <tr key={sale.id} className={`hover:bg-slate-50/80 transition ${isCancelled ? 'opacity-50 line-through bg-red-50/30' : ''}`}>
                              <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                                {saleDate.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' })}{' '}
                                {saleDate.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                                {sale.saleNumber}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-semibold text-slate-900 block truncate max-w-[150px]">
                                  {sale.customerName || 'Cliente General'}
                                </span>
                                {sale.customerPhone && (
                                  <span className="text-[10px] text-slate-400 block">{sale.customerPhone}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-600 font-medium">
                                {sale.createdBy || 'Vendedora'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sale.paymentMethod === 'cash'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : sale.paymentMethod === 'transfer'
                                    ? 'bg-blue-100 text-blue-800'
                                    : sale.paymentMethod === 'card'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {sale.paymentMethod === 'cash' && <Banknote className="w-3 h-3" />}
                                  {sale.paymentMethod === 'transfer' && <Smartphone className="w-3 h-3" />}
                                  {sale.paymentMethod === 'card' && <CreditCard className="w-3 h-3" />}
                                  {sale.paymentMethod.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-black text-slate-900">
                                ${sale.total.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-[10px] text-slate-400 block">${saleCogs.toFixed(2)}</span>
                                <span className="text-[11px] font-bold text-emerald-700 block">+${profit.toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {sale.closureId ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800" title={sale.closureNumber}>
                                    <Lock className="w-2.5 h-2.5" />
                                    {sale.closureNumber || 'Cerrada'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    <Clock className="w-2.5 h-2.5" />
                                    Pendiente
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              SUBTAB 3: DETALLE DE CIERRES & DEPÓSITOS
             ══════════════════════════════════════════════════════════ */}
          {activeSubTab === 'closures_detail' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">Nº Cierre</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Vendedora</th>
                        <th className="px-4 py-3 text-right">Efectivo Esperado</th>
                        <th className="px-4 py-3 text-right">Depositado al Banco</th>
                        <th className="px-4 py-3 text-right">Fondo en Caja</th>
                        <th className="px-4 py-3 text-right">Diferencia</th>
                        <th className="px-4 py-3">Referencia Banco</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClosures.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            No hay cierres de caja registrados en este período
                          </td>
                        </tr>
                      ) : (
                        filteredClosures.map(closure => {
                          const cDate = new Date(closure.date || closure.createdAt);
                          const diff = Number(closure.difference) || 0;

                          return (
                            <tr key={closure.id} className="hover:bg-slate-50/80 transition">
                              <td className="px-4 py-3 font-bold text-amber-800">
                                {closure.closureNumber}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                                {cDate.toLocaleDateString('es-EC')}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {closure.sellerName}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600 font-medium">
                                ${(Number(closure.expectedCash) || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right font-black text-emerald-700">
                                ${(Number(closure.amountToDeposit) || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-slate-700">
                                ${(Number(closure.cashKeptInRegister) || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold">
                                <span className={diff === 0 ? 'text-slate-400' : diff > 0 ? 'text-emerald-600' : 'text-red-600'}>
                                  {diff > 0 ? '+' : ''}${diff.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {closure.depositReference || closure.notes || '—'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ─── FOOTER DEL MODAL ─────────────────────────────────────── */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Período: <strong className="text-slate-800">{dateRange.start.toLocaleDateString('es-EC')} - {dateRange.end.toLocaleDateString('es-EC')}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow transition active:scale-95"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreAccountingModal;

