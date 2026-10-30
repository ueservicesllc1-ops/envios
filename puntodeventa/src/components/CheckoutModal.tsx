'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  DollarSign, 
  CreditCard, 
  ArrowRightLeft, 
  Coins, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  Printer, 
  Share2, 
  Sparkles,
  Loader2,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PosCartItem, PaymentMethod, PosSale, PosCustomer } from '../types/pos';
import { posClientService } from '../services/posService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PosCartItem[];
  subtotal: number;
  discount: number;
  total: number;
  onSuccess: (saleId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  subtotal,
  discount,
  total,
  onSuccess
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<number>(total);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('Consumidor Final');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<any | null>(null);

  // Customer search suggestions
  const [customerSuggestions, setCustomerSuggestions] = useState<PosCustomer[]>([]);

  useEffect(() => {
    if (isOpen) {
      setCashReceived(total);
      setCompletedSale(null);
      setIsProcessing(false);
    }
  }, [isOpen, total]);

  const change = paymentMethod === 'cash' ? Math.max(0, cashReceived - total) : 0;

  const handleQuickCash = (amount: number) => {
    setCashReceived(amount);
  };

  const handlePhoneChange = async (val: string) => {
    setCustomerPhone(val);
    if (val.trim().length >= 3) {
      const results = await posClientService.searchCustomers(val);
      setCustomerSuggestions(results);
    } else {
      setCustomerSuggestions([]);
    }
  };

  const handleSelectCustomer = (c: PosCustomer) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    setCustomerEmail(c.email || '');
    setCustomerAddress(c.address || '');
    setCustomerSuggestions([]);
  };

  const handleSubmitSale = async () => {
    if (items.length === 0) return;
    if (paymentMethod === 'cash' && cashReceived < total) {
      alert('El efectivo recibido es menor al total de la venta.');
      return;
    }

    if (paymentMethod === 'mixed') {
      const sum = cashReceived + cardAmount + transferAmount;
      if (Math.abs(sum - total) > 0.01) {
        alert('La suma de los montos mixtos debe coincidir con el total.');
        return;
      }
    }

    try {
      setIsProcessing(true);
      const saleId = await posClientService.processSale({
        date: new Date(),
        customerName: customerName.trim() || 'Consumidor Final',
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        customerAddress: customerAddress.trim(),
        items,
        subtotal,
        discount,
        tax: 0,
        total,
        paymentMethod,
        cashReceived: paymentMethod === 'cash' || paymentMethod === 'mixed' ? cashReceived : undefined,
        change: paymentMethod === 'cash' ? change : undefined,
        cardAmount: paymentMethod === 'card' || paymentMethod === 'mixed' ? cardAmount : undefined,
        transferAmount: paymentMethod === 'transfer' || paymentMethod === 'mixed' ? transferAmount : undefined,
        status: 'completed',
        createdBy: 'Asesor Falconi POS'
      });

      // Confetti celebration!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }

      setCompletedSale({
        id: saleId,
        total,
        customerName: customerName.trim() || 'Consumidor Final',
        customerPhone: customerPhone.trim(),
        items,
        change
      });

      onSuccess(saleId);
    } catch (err: any) {
      console.error('Error processing sale:', err);
      alert('Error al registrar la venta: ' + (err.message || 'Intente nuevamente'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWhatsAppReceipt = () => {
    if (!completedSale) return;
    const text = `🛍️ *FALCONI PERFUMES - COMPROBANTE DE COMPRA*\n` +
      `👤 *Cliente:* ${completedSale.customerName}\n` +
      `📅 *Fecha:* ${new Date().toLocaleDateString('es-EC')}\n\n` +
      `*DETALLE DE PRODUCTOS:*\n` +
      completedSale.items.map((it: PosCartItem) => `• ${it.quantity}x ${it.product.name} — $${it.totalPrice.toFixed(2)}`).join('\n') +
      `\n\n` +
      `💵 *TOTAL PAGADO:* $${completedSale.total.toFixed(2)}\n` +
      `💳 *Forma de Pago:* ${paymentMethod.toUpperCase()}\n` +
      (completedSale.change > 0 ? `🪙 *Cambio / Vuelto:* $${completedSale.change.toFixed(2)}\n` : '') +
      `\n¡Gracias por preferir fragancias de lujo Falconi! ✨`;

    const phoneClean = (completedSale.customerPhone || '').replace(/\D/g, '');
    const url = phoneClean 
      ? `https://wa.me/593${phoneClean.startsWith('0') ? phoneClean.slice(1) : phoneClean}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl border border-emerald-500/30 bg-[#0c121e] text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-300 text-slate-950 flex items-center justify-center font-extrabold shadow-md shadow-emerald-500/20">
              $
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Cobro de Venta en Caja</h3>
              <p className="text-xs text-slate-400">Total a Pagar: <strong className="text-emerald-400">${total.toFixed(2)}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {!completedSale ? (
            <>
              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Método de Pago
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-3 px-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      paymentMethod === 'cash'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Coins className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs">Efectivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-3 px-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      paymentMethod === 'card'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold shadow-lg shadow-blue-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <span className="text-xs">Tarjeta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`py-3 px-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      paymentMethod === 'transfer'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-lg shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowRightLeft className="w-5 h-5 text-amber-400" />
                    <span className="text-xs">Transferencia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mixed')}
                    className={`py-3 px-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      paymentMethod === 'mixed'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold shadow-lg shadow-purple-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span className="text-xs">Mixto</span>
                  </button>
                </div>
              </div>

              {/* Cash Calculation & Quick Bills */}
              {paymentMethod === 'cash' && (
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Efectivo Recibido ($)</span>
                    <button
                      type="button"
                      onClick={() => handleQuickCash(total)}
                      className="text-[11px] font-bold text-emerald-400 hover:underline"
                    >
                      Monto Exacto (${total.toFixed(2)})
                    </button>
                  </div>

                  <div className="relative">
                    <DollarSign className="w-5 h-5 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xl font-black text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Quick Dollar Bills */}
                  <div className="flex items-center gap-2 pt-1 overflow-x-auto scrollbar-none">
                    {[5, 10, 20, 50, 100].map((bill) => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => handleQuickCash(bill)}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-bold shrink-0 transition-all ${
                          cashReceived === bill
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        ${bill}
                      </button>
                    ))}
                  </div>

                  {/* Change display */}
                  <div className="p-3 rounded-xl bg-[#090d16] border border-slate-800 flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400 font-medium">Cambio / Vuelto a Entregar:</span>
                    <span className={`text-xl font-black ${change > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-200'}`}>
                      ${change.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Mixed Payment Details */}
              {paymentMethod === 'mixed' && (
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                  <span className="text-xs font-bold text-slate-400 block">Distribución de Montos</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Efectivo</span>
                      <input
                        type="number"
                        step="0.01"
                        value={cashReceived || ''}
                        onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Tarjeta</span>
                      <input
                        type="number"
                        step="0.01"
                        value={cardAmount || ''}
                        onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Transferencia</span>
                      <input
                        type="number"
                        step="0.01"
                        value={transferAmount || ''}
                        onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between pt-1">
                    <span>Suma ingresada: ${(cashReceived + cardAmount + transferAmount).toFixed(2)}</span>
                    <span className={Math.abs((cashReceived + cardAmount + transferAmount) - total) < 0.01 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                      Diferencia: ${(total - (cashReceived + cardAmount + transferAmount)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Customer Info (Optional / Fast) */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Datos del Cliente (Comprobante / WhatsApp)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerName('Consumidor Final');
                      setCustomerPhone('');
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-300"
                  >
                    Consumidor Final
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nombre del cliente"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="Teléfono / WhatsApp"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />

                    {/* Suggestions popup */}
                    {customerSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-30 max-h-40 overflow-y-auto">
                        {customerSuggestions.map((c) => (
                          <button
                            key={c.id || c.phone}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-xs flex items-center justify-between"
                          >
                            <span className="font-bold text-white">{c.name}</span>
                            <span className="text-[11px] text-emerald-400 font-mono">{c.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Sale Success Screen */
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-500/40 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <div>
                <h4 className="text-xl font-extrabold text-white">¡Venta Registrada Exitosamente!</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Cliente: <strong className="text-slate-200">{completedSale.customerName}</strong> • Total: <strong className="text-emerald-400">${completedSale.total.toFixed(2)}</strong>
                </p>
                {completedSale.change > 0 && (
                  <div className="inline-block mt-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                    Vuelto entregado: ${completedSale.change.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  onClick={handleWhatsAppReceipt}
                  className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar Recibo WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Ticket</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#090d16] flex items-center justify-between shrink-0">
          {!completedSale ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSubmitSale}
                className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm flex items-center gap-2 shadow-xl shadow-emerald-500/25 active:scale-98 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>CONFIRMAR COBRO • ${total.toFixed(2)}</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 font-black text-sm active:scale-98 transition-all text-center"
            >
              Iniciar Nueva Venta en Caja
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
