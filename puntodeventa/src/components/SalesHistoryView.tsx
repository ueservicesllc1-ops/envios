'use client';

import React, { useState, useEffect } from 'react';
import { PosSaleRecord } from '../types/pos';
import { posApi } from '../services/posApi';
import {
  ArrowLeft,
  Receipt,
  Search,
  RefreshCw,
  Mail,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  Building2,
  Shuffle,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';

interface SalesHistoryViewProps {
  onBackToPos: () => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({ onBackToPos }) => {
  const [sales, setSales] = useState<PosSaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Email resend state
  const [emailModalSale, setEmailModalSale] = useState<PosSaleRecord | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await posApi.getSales();
      setSales(data);
    } catch (err) {
      console.error('Error cargando ventas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const handleOpenEmailModal = (sale: PosSaleRecord) => {
    setEmailModalSale(sale);
    setEmailInput(sale.customerEmail || '');
    setEmailSuccess(false);
    setEmailError(null);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailModalSale || !emailInput.trim()) return;

    setSendingEmail(true);
    setEmailError(null);
    try {
      await posApi.resendReceiptEmail(emailModalSale.id, emailInput.trim());
      setEmailSuccess(true);
      setTimeout(() => {
        setEmailModalSale(null);
        setEmailSuccess(false);
      }, 2000);
    } catch (err: any) {
      setEmailError(err.message || 'Error al reenviar comprobante');
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredSales = sales.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.saleNumber.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      s.paymentMethod.toLowerCase().includes(q) ||
      s.staffName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 bg-[#0F1115] text-white p-4 sm:p-6 flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-[#282D37]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToPos}
            className="p-2.5 rounded-2xl bg-[#181B20] hover:bg-[#22262E] border border-slate-700 text-slate-300 hover:text-white transition"
            title="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Ventas Realizadas
            </h2>
            <p className="text-xs text-slate-400">
              {sales.length} transacciones registradas recientemente
            </p>
          </div>
        </div>

        <button
          onClick={loadSales}
          className="p-2.5 rounded-2xl bg-[#181B20] hover:bg-[#22262E] border border-slate-700 text-slate-300 hover:text-amber-400 self-start sm:self-auto transition flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-amber-400' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar venta por número (#POS), cliente, asesor o método..."
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-[#181B20] border border-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-amber-400 transition"
        />
      </div>

      {/* Sales List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading && sales.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400">
            <RefreshCw size={24} className="animate-spin text-amber-400 mr-2" />
            Cargando historial de ventas...
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center bg-[#181B20] rounded-3xl border border-[#282D37] p-6">
            <Receipt size={40} className="text-slate-600 mb-2" />
            <p className="font-semibold text-slate-300">No hay ventas registradas</p>
          </div>
        ) : (
          filteredSales.map((sale) => {
            const isExpanded = expandedSaleId === sale.id;
            return (
              <div
                key={sale.id}
                className="bg-[#181B20] border border-[#282D37] hover:border-slate-700 rounded-2xl p-4 transition"
              >
                {/* Main Row */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-xs text-amber-400 shrink-0">
                      #{sale.saleNumber.slice(-4)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-sm">
                          Venta #{sale.saleNumber}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#22262E] text-slate-300">
                          {sale.paymentMethod}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {sale.customerName} &bull; {sale.createdAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-base sm:text-lg font-black text-amber-400">
                        ${sale.total.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Por {sale.staffName}
                      </p>
                    </div>

                    <div className="text-slate-400 hover:text-white transition">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#282D37] space-y-3">
                    <div className="space-y-1.5">
                      {sale.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-[#22262E]/60 text-slate-300"
                        >
                          <span>
                            {it.quantity}x {it.name}
                          </span>
                          <span className="font-mono text-white">
                            ${it.totalPrice.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
                      <span>Subtotal: ${sale.subtotal.toFixed(2)}</span>
                      {sale.discountAmount > 0 && (
                        <span className="text-emerald-400">
                          Descuento: -${sale.discountAmount.toFixed(2)}
                        </span>
                      )}
                      <button
                        onClick={() => handleOpenEmailModal(sale)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition ml-auto"
                      >
                        <Mail size={14} />
                        <span>Reenviar Comprobante</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Resend Email Modal */}
      {emailModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#181B20] border border-[#282D37] rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setEmailModalSale(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-[#22262E] text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Mail size={18} className="text-amber-400" />
              Reenviar Recibo por Correo
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Venta #{emailModalSale.saleNumber} (${emailModalSale.total.toFixed(2)})
            </p>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#22262E] border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {emailSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Comprobante enviado exitosamente por correo.</span>
                </div>
              )}

              {emailError && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{emailError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailModalSale(null)}
                  className="px-4 py-2 rounded-xl bg-[#22262E] text-slate-300 text-xs font-semibold"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Recibo'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
