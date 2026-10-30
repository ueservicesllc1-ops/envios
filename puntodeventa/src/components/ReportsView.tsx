'use client';

import React, { useState, useEffect } from 'react';
import { PosReports } from '../types/pos';
import { posApi } from '../services/posApi';
import {
  ArrowLeft,
  BarChart3,
  RefreshCw,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Receipt,
  Sparkles,
  Trophy,
} from 'lucide-react';

interface ReportsViewProps {
  onBackToPos: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onBackToPos }) => {
  const [reports, setReports] = useState<PosReports | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await posApi.getReports();
      setReports(data);
    } catch (err) {
      console.error('Error cargando reportes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const totalRevenue = reports?.totalRevenue || 0;
  const totalSalesCount = reports?.totalSalesCount || 0;
  const totalItemsSold = reports?.totalItemsSold || 0;
  const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  return (
    <div className="flex-1 bg-[#0F1115] text-white p-4 sm:p-6 flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#282D37] mb-6">
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
              Reportes del Punto de Venta
            </h2>
            <p className="text-xs text-slate-400">
              Resumen consolidado de ingresos y productos más vendidos
            </p>
          </div>
        </div>

        <button
          onClick={loadReports}
          className="p-2.5 rounded-2xl bg-[#181B20] hover:bg-[#22262E] border border-slate-700 text-slate-300 hover:text-amber-400 transition flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-amber-400' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {loading && !reports ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <RefreshCw size={28} className="animate-spin text-amber-400 mr-3" />
          Cargando métricas y estadísticas...
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#181B20] border border-[#282D37]">
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <DollarSign size={18} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Ingresos
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">
                ${totalRevenue.toFixed(2)}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#181B20] border border-[#282D37]">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Receipt size={18} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tickets Cobrados
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">
                {totalSalesCount}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#181B20] border border-[#282D37]">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <TrendingUp size={18} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ticket Promedio
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">
                ${avgTicket.toFixed(2)}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#181B20] border border-[#282D37]">
              <div className="flex items-center gap-2 text-purple-400 mb-1">
                <ShoppingBag size={18} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Frascos Vendidos
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">
                {totalItemsSold}
              </p>
            </div>
          </div>

          {/* Breakdown Section: Payment Methods & Top Perfumes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Methods */}
            <div className="p-5 rounded-2xl bg-[#181B20] border border-[#282D37]">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-amber-400" />
                Ventas por Método de Pago
              </h3>

              <div className="space-y-4">
                {reports?.byMethod && Object.keys(reports.byMethod).length > 0 ? (
                  Object.entries(reports.byMethod).map(([m, amt]) => {
                    const pct = totalRevenue > 0 ? (amt / totalRevenue) * 100 : 0;
                    return (
                      <div key={m} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300 uppercase tracking-wide">{m}</span>
                          <span className="text-white font-mono font-bold">
                            ${amt.toFixed(2)} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#22262E] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">Sin datos de métodos de pago</p>
                )}
              </div>
            </div>

            {/* Top 10 Perfumes */}
            <div className="p-5 rounded-2xl bg-[#181B20] border border-[#282D37]">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-amber-400" />
                Top Perfumes Más Vendidos
              </h3>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {reports?.topPerfumes && reports.topPerfumes.length > 0 ? (
                  reports.topPerfumes.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#22262E]/70 border border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-950'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-white truncate">{p.name}</span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-amber-400">
                          {p.qty} {p.qty === 1 ? 'unidad' : 'unidades'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          ${p.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">Sin datos de perfumes vendidos</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
