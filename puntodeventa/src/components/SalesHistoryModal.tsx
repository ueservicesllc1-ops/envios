'use client';

import React, { useState, useEffect } from 'react';
import { X, History, Calendar, User, DollarSign, Receipt, Share2, RefreshCw } from 'lucide-react';
import { posClientService } from '../services/posService';

interface SalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SalesHistoryModal: React.FC<SalesHistoryModalProps> = ({
  isOpen,
  onClose
}) => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    const data = await posClientService.getRecentSales(30);
    setSales(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalDaySales = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-[#0c121e] text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center">
              <History className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Historial de Ventas POS</h3>
              <p className="text-xs text-slate-400">Últimas 30 transacciones registradas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadHistory}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Daily Summary */}
        <div className="px-6 py-3 bg-[#080d16] border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Total en Ventas Registradas:</span>
          <span className="text-base font-black text-emerald-400">${totalDaySales.toFixed(2)}</span>
        </div>

        {/* List of Sales */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
          {sales.length > 0 ? (
            sales.map((sale) => (
              <div
                key={sale.id}
                className="p-4 rounded-2xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">{sale.saleNumber || 'POS-VENTA'}</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {sale.paymentMethod || 'Efectivo'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white mt-0.5">{sale.customerName || 'Consumidor Final'}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {sale.date ? new Date(sale.date).toLocaleString('es-EC') : ''} • {Array.isArray(sale.items) ? sale.items.length : 0} productos
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-white">${(Number(sale.total) || 0).toFixed(2)}</div>
                  <span className="text-[10px] font-bold text-emerald-400">Completada</span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs">
              {loading ? 'Cargando ventas...' : 'No se han registrado ventas recientemente.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
