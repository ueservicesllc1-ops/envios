'use client';

import React, { useState, useEffect } from 'react';
import {
  CartLine,
  PayMethod,
  PaymentInput,
  SaleResult,
  PosClient,
} from '../types/pos';
import {
  X,
  CreditCard,
  Banknote,
  Building2,
  Shuffle,
  CheckCircle2,
  Printer,
  Share2,
  Delete,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CheckoutDialogProps {
  cart: CartLine[];
  subtotal: number;
  initialDiscountPct: number;
  maxDiscountPct: number;
  assignedClient: PosClient | null;
  saleResult: SaleResult | null;
  processingSale: boolean;
  saleError: string | null;
  onConfirm: (discountPct: number, payment: PaymentInput, customerName?: string) => void;
  onDismiss: () => void;
  onResetSale: () => void;
}

export const CheckoutDialog: React.FC<CheckoutDialogProps> = ({
  cart,
  subtotal,
  initialDiscountPct,
  maxDiscountPct,
  assignedClient,
  saleResult,
  processingSale,
  saleError,
  onConfirm,
  onDismiss,
  onResetSale,
}) => {
  const [discountPct, setDiscountPct] = useState(initialDiscountPct);
  const [method, setMethod] = useState<PayMethod>('cash');
  const [cashText, setCashText] = useState('');
  const [cardText, setCardText] = useState('');
  const [transferText, setTransferText] = useState('');
  const [reference, setReference] = useState('');
  const [customerName, setCustomerName] = useState(
    assignedClient ? assignedClient.fullName : 'Consumidor Final'
  );

  const discountAmount = subtotal * (discountPct / 100);
  const total = Math.max(0, subtotal - discountAmount);

  const cash = parseFloat(cashText) || 0;
  const card = parseFloat(cardText) || 0;
  const transfer = parseFloat(transferText) || 0;

  const paid =
    method === 'cash' ? cash : method === 'mixed' ? cash + card + transfer : total;
  const change = Math.max(0, paid - total);

  const needsRef =
    method === 'card' ||
    method === 'transfer' ||
    (method === 'mixed' && (card > 0 || transfer > 0));

  const canPay =
    !processingSale &&
    paid + 0.001 >= total &&
    (!needsRef || reference.trim().length > 0);

  // Trigger confetti on success
  useEffect(() => {
    if (saleResult) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#F59E0B', '#10B981', '#3B82F6'],
        });
      } catch (_) {}
    }
  }, [saleResult]);

  const handleNumKey = (k: string) => {
    if (k === 'C') {
      setCashText('');
    } else if (k === 'back') {
      setCashText((prev) => prev.slice(0, -1));
    } else if (k === '.') {
      if (!cashText.includes('.')) {
        setCashText((prev) => (prev ? prev + '.' : '0.'));
      }
    } else {
      if (cashText.includes('.') && cashText.split('.')[1].length >= 2) return;
      setCashText((prev) => (prev === '0' ? k : prev + k));
    }
  };

  const handleShareWhatsApp = () => {
    if (!saleResult) return;
    const itemsText = cart
      .map((it) => `• ${it.quantity}x ${it.product.name} - $${(it.product.price * it.quantity).toFixed(2)}`)
      .join('\n');

    const msg = `🧾 *FALCONI PARFUMS* 🧾\n*Comprobante de Venta #${saleResult.saleNumber}*\n\n*Cliente:* ${customerName}\n*Fecha:* ${new Date().toLocaleString('es-EC')}\n\n*Detalle:*\n${itemsText}\n\n*Total:* $${saleResult.total.toFixed(2)}\n*Método:* ${method.toUpperCase()}\n\n¡Gracias por su preferencia!`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 select-none">
      <div className="w-full max-w-4xl bg-[#181B20] border border-[#282D37] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto relative">
        {/* Close Button */}
        {!processingSale && (
          <button
            onClick={onDismiss}
            className="absolute top-6 right-6 p-2 rounded-full bg-[#22262E] hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X size={20} />
          </button>
        )}

        {/* Success View */}
        {saleResult ? (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/40 animate-bounce">
              <CheckCircle2 size={44} />
            </div>

            <span className="text-xs font-bold tracking-widest text-amber-500 uppercase">
              Cobro Exitoso &bull; Falconi POS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-1 mb-2">
              Venta #{saleResult.saleNumber}
            </h2>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              Venta registrada correctamente en el inventario y contabilidad de Falconi Parfums.
            </p>

            {/* Summary card */}
            <div className="w-full max-w-md bg-[#22262E] border border-slate-700 rounded-2xl p-5 mb-8 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white">{customerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Método de pago:</span>
                <span className="font-bold text-amber-400 capitalize">{method}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total pagado:</span>
                <span className="font-black text-white text-lg">
                  ${saleResult.total.toFixed(2)}
                </span>
              </div>
              {saleResult.change > 0 && (
                <div className="flex justify-between text-sm pt-2 border-t border-slate-700 text-emerald-400 font-bold">
                  <span>Cambio entregado:</span>
                  <span className="text-lg">${saleResult.change.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
              <button
                onClick={handleShareWhatsApp}
                className="flex-1 min-w-[140px] py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950"
              >
                <Share2 size={18} />
                WhatsApp
              </button>

              <button
                onClick={handlePrint}
                className="flex-1 min-w-[140px] py-3.5 px-4 rounded-xl bg-[#22262E] hover:bg-[#2b303a] border border-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow"
              >
                <Printer size={18} />
                Imprimir
              </button>

              <button
                onClick={onResetSale}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-base shadow-xl shadow-amber-500/20 active:scale-95 transition"
              >
                Nueva Venta
              </button>
            </div>
          </div>
        ) : (
          /* Normal Checkout View */
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left Column: Totals & Customer */}
            <div className="flex-1 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#282D37] pb-6 md:pb-0 md:pr-8">
              <div>
                <h3 className="text-2xl font-black text-white mb-4">Cobrar</h3>

                <div className="space-y-2 text-sm mb-6">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-bold text-white">${subtotal.toFixed(2)}</span>
                  </div>

                  {/* Discount pills */}
                  <div className="pt-2">
                    <span className="text-xs text-slate-400 font-medium block mb-1.5">
                      Descuento:
                    </span>
                    <div className="flex items-center gap-2">
                      {[0, 5, 10, 15]
                        .filter((d) => d <= (maxDiscountPct || 100))
                        .map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDiscountPct(d)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                              discountPct === d
                                ? 'bg-amber-500 border-amber-400 text-slate-950 font-black'
                                : 'bg-[#22262E] border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {d === 0 ? 'Ninguno' : `${d}%`}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Giant Total */}
                <div className="p-4 rounded-2xl bg-[#22262E] border border-slate-700/80 mb-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    TOTAL A PAGAR
                  </p>
                  <p className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight my-1">
                    ${total.toFixed(2)}
                  </p>

                  {(method === 'cash' || method === 'mixed') && (
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-sm">
                      <span className="text-slate-400">Vuelto / Cambio:</span>
                      <span
                        className={`text-xl font-bold ${
                          paid >= total ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        ${change.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Customer name */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Nombre del Cliente:
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Consumidor Final"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#22262E] border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {saleError && (
                <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-red-300 text-xs mt-4 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{saleError}</span>
                </div>
              )}
            </div>

            {/* Right Column: Payment Methods & Cash NumPad */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                {/* Method Tabs */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {[
                    { id: 'cash' as PayMethod, label: 'Efectivo', icon: Banknote },
                    { id: 'card' as PayMethod, label: 'Tarjeta', icon: CreditCard },
                    { id: 'transfer' as PayMethod, label: 'Transf.', icon: Building2 },
                    { id: 'mixed' as PayMethod, label: 'Mixto', icon: Shuffle },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = method === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id)}
                        className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition border ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
                            : 'bg-[#22262E] border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <Icon size={18} />
                        <span className="text-xs font-bold">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Cash Method UI */}
                {method === 'cash' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-400">
                        Efectivo recibido:
                      </span>
                      <span className="text-2xl font-black text-white">
                        {cashText ? `$${cashText}` : '$0.00'}
                      </span>
                    </div>

                    {/* Quick bills */}
                    <div className="grid grid-cols-6 gap-1.5 mb-3">
                      <button
                        type="button"
                        onClick={() => setCashText(total.toFixed(2))}
                        className="py-2 rounded-xl bg-[#22262E] hover:bg-slate-700 border border-slate-700 text-xs font-bold text-amber-400 transition"
                      >
                        Exacto
                      </button>
                      {[5, 10, 20, 50, 100].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setCashText(b.toString())}
                          className="py-2 rounded-xl bg-[#22262E] hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white transition"
                        >
                          ${b}
                        </button>
                      ))}
                    </div>

                    {/* NumPad */}
                    <div className="grid grid-cols-3 gap-2">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleNumKey(k)}
                          className="h-12 rounded-xl bg-[#22262E] hover:bg-slate-700 border border-slate-700 text-lg font-bold text-white flex items-center justify-center active:scale-95 transition"
                        >
                          {k}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleNumKey('back')}
                        className="h-12 rounded-xl bg-[#22262E] hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center active:scale-95 transition"
                      >
                        <Delete size={20} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Card or Transfer Method UI */}
                {(method === 'card' || method === 'transfer') && (
                  <div className="p-5 rounded-2xl bg-[#22262E] border border-slate-700 space-y-4">
                    <p className="text-xs text-slate-300">
                      {method === 'card'
                        ? 'Cobra el valor en el datáfono y registra el número de voucher/aprobación.'
                        : 'Verifica el comprobante bancario antes de confirmar la venta.'}
                    </p>

                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">
                        Nº de referencia / voucher:
                      </label>
                      <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Ej: 0048291"
                        className="w-full h-11 px-3.5 rounded-xl bg-[#181B20] border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* Mixed Method UI */}
                {method === 'mixed' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">
                        Monto en Efectivo:
                      </label>
                      <input
                        type="number"
                        value={cashText}
                        onChange={(e) => setCashText(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-10 px-3 rounded-xl bg-[#22262E] border border-slate-700 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">
                        Monto con Tarjeta:
                      </label>
                      <input
                        type="number"
                        value={cardText}
                        onChange={(e) => setCardText(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-10 px-3 rounded-xl bg-[#22262E] border border-slate-700 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">
                        Monto por Transferencia:
                      </label>
                      <input
                        type="number"
                        value={transferText}
                        onChange={(e) => setTransferText(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-10 px-3 rounded-xl bg-[#22262E] border border-slate-700 text-white text-sm"
                      />
                    </div>
                    {needsRef && (
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">
                          Nº de referencia / voucher:
                        </label>
                        <input
                          type="text"
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          placeholder="Referencia"
                          className="w-full h-10 px-3 rounded-xl bg-[#22262E] border border-slate-700 text-white text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Cobro Button */}
              <div className="pt-6">
                <button
                  type="button"
                  disabled={!canPay}
                  onClick={() =>
                    onConfirm(
                      discountPct,
                      {
                        method,
                        cashReceived: cash,
                        cardAmount: card,
                        transferAmount: transfer,
                        reference,
                      },
                      customerName
                    )
                  }
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-base shadow-xl shadow-amber-500/20 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingSale ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      Procesando Venta...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Confirmar y Cobrar ${total.toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
