'use client';

import React, { useState, useEffect } from 'react';
import { LocalReceipt } from '../types/pos';
import { posApi } from '../services/posApi';
import {
  ArrowLeft,
  ArrowDownToLine,
  RefreshCw,
  QrCode,
  CheckCircle2,
  Clock,
  Package,
  AlertCircle,
  X,
  FileCheck,
} from 'lucide-react';

interface ReceiptsViewProps {
  onBackToPos: () => void;
  onOpenScanner: (onScan: (code: string) => void) => void;
}

export const ReceiptsView: React.FC<ReceiptsViewProps> = ({
  onBackToPos,
  onOpenScanner,
}) => {
  const [receipts, setReceipts] = useState<LocalReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState<LocalReceipt | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [closing, setClosing] = useState(false);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const data = await posApi.getReceipts();
      setReceipts(data);
      if (activeReceipt) {
        const updated = data.find((r) => r.id === activeReceipt.id);
        if (updated) setActiveReceipt(updated);
      }
    } catch (err) {
      console.error('Error cargando notas de ingreso:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const handleScanCode = async (code: string) => {
    if (!activeReceipt) return;
    const clean = code.trim();
    if (!clean) return;

    try {
      const res = await posApi.scanReceipt(activeReceipt.id, clean);
      setFeedback({ msg: res.message || `Código escaneado: ${clean}`, ok: true });
      setBarcodeInput('');
      loadReceipts();
    } catch (err: any) {
      setFeedback({ msg: err.message || `Error al registrar código: ${clean}`, ok: false });
    }
  };

  const handleCloseReceipt = async () => {
    if (!activeReceipt) return;
    const conf = window.confirm(`¿Estás seguro de cerrar el ingreso ${activeReceipt.number}?`);
    if (!conf) return;

    setClosing(true);
    try {
      await posApi.closeReceipt(activeReceipt.id, 'Cerrado desde iPad POS');
      setActiveReceipt(null);
      loadReceipts();
    } catch (err: any) {
      alert(err.message || 'Error al cerrar nota');
    } finally {
      setClosing(false);
    }
  };

  const expectedTotal = activeReceipt
    ? activeReceipt.items.reduce((acc, it) => acc + (it.expectedQty || 0), 0)
    : 0;
  const receivedTotal = activeReceipt
    ? activeReceipt.items.reduce((acc, it) => acc + (it.receivedQty || 0), 0)
    : 0;
  const progressPct = expectedTotal > 0 ? (receivedTotal / expectedTotal) * 100 : 0;

  return (
    <div className="flex-1 bg-[#0F1115] text-white p-4 sm:p-6 flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#282D37] mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (activeReceipt ? setActiveReceipt(null) : onBackToPos())}
            className="p-2.5 rounded-2xl bg-[#181B20] hover:bg-[#22262E] border border-slate-700 text-slate-300 hover:text-white transition"
            title="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {activeReceipt ? `Nota ${activeReceipt.number}` : 'Ingreso de Mercadería'}
            </h2>
            <p className="text-xs text-slate-400">
              {activeReceipt
                ? 'Escanea cada perfume para ingresarlo al inventario del local'
                : 'Notas enviadas desde Bodega Ecuador pendientes de recibir en el local'}
            </p>
          </div>
        </div>

        <button
          onClick={loadReceipts}
          className="p-2.5 rounded-2xl bg-[#181B20] hover:bg-[#22262E] border border-slate-700 text-slate-300 hover:text-amber-400 transition flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-amber-400' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Main Content */}
      {activeReceipt ? (
        /* Detailed Receipt Scanning View */
        <div className="flex-1 flex flex-col overflow-hidden space-y-4">
          {/* Progress Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#181B20] border border-[#282D37] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                  Progreso de Recepción
                </span>
                <p className="text-2xl font-black text-white mt-0.5">
                  Recibido {receivedTotal} de {expectedTotal} frascos ({progressPct.toFixed(0)}%)
                </p>
              </div>

              <button
                onClick={handleCloseReceipt}
                disabled={closing}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
              >
                <FileCheck size={16} />
                <span>Cerrar Acta</span>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-[#22262E] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
              />
            </div>
          </div>

          {/* Barcode scanner row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleScanCode(barcodeInput);
                  }
                }}
                placeholder="Escanea o escribe el código de barras del frasco..."
                className="w-full h-11 pl-4 pr-10 rounded-2xl bg-[#181B20] border border-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              onClick={() => handleScanCode(barcodeInput)}
              className="px-5 h-11 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              Registrar
            </button>

            <button
              onClick={() => onOpenScanner((code) => handleScanCode(code))}
              className="p-3 h-11 rounded-2xl bg-[#181B20] hover:bg-[#22262E] border border-slate-700 text-amber-400 hover:text-white"
              title="Abrir cámara"
            >
              <QrCode size={18} />
            </button>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                feedback.ok
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-red-950/40 border-red-800 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{feedback.msg}</span>
              </div>
              <button onClick={() => setFeedback(null)}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Items breakdown */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {activeReceipt.items.map((it, idx) => {
              const isDone = it.receivedQty >= it.expectedQty;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition ${
                    isDone
                      ? 'bg-emerald-950/15 border-emerald-800/40'
                      : 'bg-[#181B20] border-[#282D37]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">{it.name}</p>
                    <p className="text-[11px] font-mono text-slate-400">
                      Código: {it.barcode || 'Sin código'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {it.receivedQty} / {it.expectedQty} recibidos
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Receipts List */
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading && receipts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400">
              <RefreshCw size={24} className="animate-spin text-amber-400 mr-2" />
              Cargando notas de ingreso...
            </div>
          ) : receipts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center bg-[#181B20] rounded-3xl border border-[#282D37] p-6">
              <ArrowDownToLine size={40} className="text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">
                No hay notas de ingreso pendientes
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Todas las mercaderías despachadas hacia este local han sido recibidas.
              </p>
            </div>
          ) : (
            receipts.map((r) => {
              const total = r.items.reduce((acc, it) => acc + (it.expectedQty || 0), 0);
              const done = r.items.reduce((acc, it) => acc + (it.receivedQty || 0), 0);
              return (
                <div
                  key={r.id}
                  onClick={() => setActiveReceipt(r)}
                  className="p-4 rounded-2xl bg-[#181B20] border border-[#282D37] hover:border-amber-500/40 cursor-pointer transition flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-base">
                        Nota #{r.number}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {r.status}
                      </span>
                    </div>
                    {r.notes && <p className="text-xs text-slate-400">{r.notes}</p>}
                    <p className="text-[11px] text-slate-500">
                      Fecha: {r.createdAt || 'Reciente'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-white">
                      {done} de {total} unidades
                    </p>
                    <span className="text-xs text-amber-400 font-semibold underline">
                      Abrir y Escanear &rarr;
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
