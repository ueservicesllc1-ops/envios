import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  Banknote,
  Smartphone,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  Calendar,
  Lock,
  Loader2
} from 'lucide-react';
import { cashClosureService } from '../../services/cashClosureService';
import { PointOfSale } from '../../types';
import toast from 'react-hot-toast';

interface CashClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultSellerName?: string;
  isAdmin?: boolean;
}

export const CashClosureModal: React.FC<CashClosureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultSellerName = 'Vendedora',
  isAdmin = false
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sales, setSales] = useState<PointOfSale[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [expectedCash, setExpectedCash] = useState(0);
  const [totalTransfer, setTotalTransfer] = useState(0);
  const [totalCard, setTotalCard] = useState(0);

  // Formulario de cierre
  const [amountToDeposit, setAmountToDeposit] = useState<string>('');
  const [cashKeptInRegister, setCashKeptInRegister] = useState<string>('0');
  const [sellerName, setSellerName] = useState(defaultSellerName);
  const [depositReference, setDepositReference] = useState('');
  const [notes, setNotes] = useState('');
  const [closureDateStr, setClosureDateStr] = useState(new Date().toISOString().slice(0, 10));

  const [showSalesList, setShowSalesList] = useState(false);
  const [completedClosure, setCompletedClosure] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPendingData();
      setCompletedClosure(null);
      setSellerName(defaultSellerName);
      setClosureDateStr(new Date().toISOString().slice(0, 10));
    }
  }, [isOpen, defaultSellerName]);

  const loadPendingData = async () => {
    try {
      setLoading(true);
      const data = await cashClosureService.getPendingSales();
      setSales(data.sales);
      setTotalSales(data.totalSales);
      setExpectedCash(data.expectedCash);
      setTotalTransfer(data.totalTransfer);
      setTotalCard(data.totalCard);

      // Por defecto sugerir depositar todo el efectivo esperado
      setAmountToDeposit(data.expectedCash > 0 ? data.expectedCash.toFixed(2) : '0.00');
      setCashKeptInRegister('0.00');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al cargar ventas pendientes para el cierre');
    } finally {
      setLoading(false);
    }
  };

  const depositNum = parseFloat(amountToDeposit) || 0;
  const keptNum = parseFloat(cashKeptInRegister) || 0;
  const totalCounted = depositNum + keptNum;
  const difference = totalCounted - expectedCash;

  const handleConfirmClosure = async () => {
    if (sales.length === 0 && expectedCash === 0 && depositNum === 0) {
      toast.error('No hay ventas registradas ni efectivo pendiente para cerrar');
      return;
    }

    if (!sellerName.trim()) {
      toast.error('Ingresa el nombre de la vendedora responsable del cierre');
      return;
    }

    try {
      setSaving(true);
      const customDate = isAdmin && closureDateStr ? new Date(`${closureDateStr}T12:00:00`) : new Date();

      const closureId = await cashClosureService.createClosure({
        sellerName: sellerName.trim(),
        totalSales,
        expectedCash,
        totalTransfer,
        totalCard,
        amountToDeposit: depositNum,
        cashKeptInRegister: keptNum,
        cashCounted: totalCounted,
        difference,
        depositReference: depositReference.trim(),
        salesIds: sales.map(s => s.id),
        notes: notes.trim(),
        customDate
      });

      setCompletedClosure({
        id: closureId,
        sellerName,
        totalSales,
        expectedCash,
        amountToDeposit: depositNum,
        cashKeptInRegister: keptNum,
        totalCounted,
        difference,
        salesCount: sales.length,
        depositReference,
        date: customDate
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 p-5 text-slate-950 shrink-0 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-black/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Cierre de Caja</h2>
              <p className="text-xs font-semibold text-slate-900/80">Corte de ventas y control de depósito</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 text-slate-900 transition-colors"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">

          {completedClosure ? (
            /* Pantalla de Éxito */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">¡Cierre Registrado!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  El corte de caja y el monto a depositar quedaron asentados en el sistema
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Vendedora:</span>
                  <span className="font-bold text-white">{completedClosure.sellerName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Ventas:</span>
                  <span className="font-bold text-white">${completedClosure.totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Efectivo de ventas:</span>
                  <span className="font-bold text-amber-400">${completedClosure.expectedCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold pt-2 border-t border-white/10 text-sm">
                  <span>Monto a depositar:</span>
                  <span>${completedClosure.amountToDeposit.toFixed(2)}</span>
                </div>
                {completedClosure.depositReference && (
                  <div className="flex justify-between text-slate-400">
                    <span>Referencia:</span>
                    <span className="font-mono text-white">{completedClosure.depositReference}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 pt-1">
                  <span>Notas cerradas en este corte:</span>
                  <span className="font-bold text-white">{completedClosure.salesCount} nota(s)</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl shadow-lg transition-all active:scale-95 text-sm"
              >
                Listo / Cerrar
              </button>
            </div>
          ) : loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-amber-400 mx-auto" />
              <p className="text-slate-400 text-sm">Calculando ventas pendientes de cierre...</p>
            </div>
          ) : (
            <>
              {/* Tarjeta: Dinero que debe haber de lo vendido */}
              <div className="bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/30 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4" /> Dinero que debe haber de lo vendido
                  </span>
                  <span className="text-xs bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">
                    {sales.length} nota(s)
                  </span>
                </div>
                <div className="text-3xl font-black text-white mt-1">
                  ${expectedCash.toFixed(2)} <span className="text-xs font-semibold text-slate-400">en Efectivo</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Total Ventas:</span>
                    <span className="font-bold text-white">${totalSales.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Transferencia:</span>
                    <span className="font-bold text-blue-400">${totalTransfer.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tarjeta:</span>
                    <span className="font-bold text-purple-400">${totalCard.toFixed(2)}</span>
                  </div>
                </div>

                {/* Acordeón para ver detalle de notas */}
                {sales.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSalesList(!showSalesList)}
                    className="mt-3 text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition"
                  >
                    <span>{showSalesList ? 'Ocultar' : 'Ver'} {sales.length} venta(s) incluidas en este corte</span>
                    {showSalesList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}

                {showSalesList && (
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {sales.map(s => (
                      <div key={s.id} className="bg-black/30 rounded-lg p-2 text-[11px] flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white">{s.saleNumber}</span>
                          <span className="text-slate-400 ml-1.5">{s.customerName || 'Cliente'}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-amber-400">${s.total.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-400 ml-1 capitalize">({s.paymentMethod})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulario para registrar el depósito */}
              <div className="space-y-3 bg-white/5 border border-white/8 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Registro del Depósito y Arqueo
                </p>

                {/* Monto a depositar */}
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">
                    ¿Cuánto manda a depositar a esta fecha? ($) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amountToDeposit}
                      onChange={e => setAmountToDeposit(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-lg font-black text-emerald-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div className="flex gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setAmountToDeposit(expectedCash.toFixed(2))}
                      className="text-[10px] bg-white/10 hover:bg-white/15 px-2 py-0.5 rounded text-amber-300 font-semibold"
                    >
                      Depositar todo (${expectedCash.toFixed(2)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmountToDeposit('0.00')}
                      className="text-[10px] bg-white/10 hover:bg-white/15 px-2 py-0.5 rounded text-slate-400 font-semibold"
                    >
                      $0.00
                    </button>
                  </div>
                </div>

                {/* Efectivo que se queda en caja como base */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Efectivo que se queda en caja (Fondo base para dar cambio):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashKeptInRegister}
                      onChange={e => setCashKeptInRegister(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Balance de Arqueo / Cuadre */}
                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  difference === 0
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : difference > 0
                    ? 'bg-blue-950/40 border-blue-500/30 text-blue-300'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}>
                  <div>
                    <span className="block font-bold">Total contado (Depósito + En Caja):</span>
                    <span className="text-base font-black">${totalCounted.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] uppercase font-bold tracking-wider">
                      {difference === 0 ? '✓ Caja Cuadrada' : difference > 0 ? 'Sobrante' : 'Faltante'}
                    </span>
                    <span className="text-sm font-black">
                      {difference >= 0 ? `+$${difference.toFixed(2)}` : `-$${Math.abs(difference).toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {/* Vendedora responsable */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Vendedora responsable del cierre *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={sellerName}
                      onChange={e => setSellerName(e.target.value)}
                      placeholder="Nombre de la vendedora (ej: Vilma, Maria...)"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Vilma', 'Maria', 'Annabel', 'Yuri', 'Luis'].map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setSellerName(name)}
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold transition ${
                          sellerName === name ? 'bg-amber-400 text-slate-950 font-black' : 'bg-white/10 text-slate-300 hover:bg-white/15'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Referencia o Nro de Depósito */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nro. de Comprobante / Referencia de Depósito (Opcional):
                  </label>
                  <input
                    type="text"
                    value={depositReference}
                    onChange={e => setDepositReference(e.target.value)}
                    placeholder="Ej: Depósito Banco Pichincha #491209"
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* Fecha personalizada (si admin) */}
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Fecha del Cierre (Admin):
                    </label>
                    <input
                      type="date"
                      value={closureDateStr}
                      onChange={e => setClosureDateStr(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>
                )}

                {/* Observaciones */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Observaciones / Notas:
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Detalles sobre el corte, billetes apartados, etc."
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-bold text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClosure}
                  disabled={saving}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando Cierre...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 stroke-[2.5]" />
                      <span>Confirmar Cierre</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default CashClosureModal;
