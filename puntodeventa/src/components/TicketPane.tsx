'use client';

import React, { useState } from 'react';
import {
  CartLine,
  Product,
  PosClient,
} from '../types/pos';
import {
  ShoppingCart,
  User,
  Plus,
  Minus,
  Trash2,
  FileText,
  PauseCircle,
  CreditCard,
  DollarSign,
  AlertTriangle,
  X,
  UserPlus,
} from 'lucide-react';

interface TicketPaneProps {
  cart: CartLine[];
  client: PosClient | null;
  saleNote: string;
  heldSalesCount: number;
  maxDiscountPct: number;
  discountPct: number;
  onSetDiscountPct: (pct: number) => void;
  onAdd: (product: Product) => void;
  onDec: (product: Product) => void;
  onRemove: (product: Product) => void;
  onClear: () => void;
  onPay: () => void;
  onOpenClientDialog: () => void;
  onRemoveClient: () => void;
  onOpenNoteDialog: () => void;
  onHoldSale: () => void;
  onOpenHeldSales: () => void;
}

export const TicketPane: React.FC<TicketPaneProps> = ({
  cart,
  client,
  saleNote,
  heldSalesCount,
  maxDiscountPct,
  discountPct,
  onSetDiscountPct,
  onAdd,
  onDec,
  onRemove,
  onClear,
  onPay,
  onOpenClientDialog,
  onRemoveClient,
  onOpenNoteDialog,
  onHoldSale,
  onOpenHeldSales,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const subtotal = cart.reduce((acc, it) => acc + it.product.price * it.quantity, 0);
  const discountAmount = subtotal * (discountPct / 100);
  const total = Math.max(0, subtotal - discountAmount);
  const totalItemsCount = cart.reduce((acc, it) => acc + it.quantity, 0);

  const discountOptions = [0, 5, 10, 15].filter((d) => d <= (maxDiscountPct || 100));

  return (
    <aside className="w-80 sm:w-92 lg:w-96 bg-[#181B20] border-l border-[#282D37] flex flex-col justify-between shrink-0 h-full select-none z-20">
      {/* 1. Header & Client selector */}
      <div className="p-4 border-b border-[#282D37] flex flex-col gap-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-amber-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Ticket de Venta
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {heldSalesCount > 0 && (
              <button
                onClick={onOpenHeldSales}
                className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition flex items-center gap-1.5"
                title="Ver tickets en espera"
              >
                <PauseCircle size={14} />
                <span>{heldSalesCount} en espera</span>
              </button>
            )}

            <span className="px-2 py-0.5 rounded-lg bg-[#22262E] text-slate-400 text-xs font-mono">
              {totalItemsCount} {totalItemsCount === 1 ? 'ítem' : 'ítems'}
            </span>
          </div>
        </div>

        {/* Client Bar */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#22262E] border border-slate-700/80">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <User size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {client ? client.fullName : 'Consumidor Final'}
              </p>
              {client?.cedula && (
                <p className="text-[10px] text-slate-400 truncate">CI: {client.cedula}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {client ? (
              <button
                onClick={onRemoveClient}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition"
                title="Quitar cliente asignado"
              >
                <X size={14} />
              </button>
            ) : null}
            <button
              onClick={onOpenClientDialog}
              className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold transition"
            >
              {client ? 'Cambiar' : '+ Cliente'}
            </button>
          </div>
        </div>

        {/* Note indicator if present */}
        {saleNote && (
          <div
            onClick={onOpenNoteDialog}
            className="flex items-center justify-between p-2 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs cursor-pointer hover:bg-amber-950/30 transition"
          >
            <span className="truncate flex items-center gap-1.5">
              <FileText size={13} className="shrink-0" />
              <span>Nota: {saleNote}</span>
            </span>
            <span className="text-[10px] underline">Editar</span>
          </div>
        )}
      </div>

      {/* 2. Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6">
            <ShoppingCart size={36} className="mb-2 text-slate-600" />
            <p className="text-sm font-semibold text-slate-400">El ticket está vacío</p>
            <p className="text-xs text-slate-600 mt-1 max-w-xs">
              Escanea un frasco o pulsa sobre un perfume del catálogo para comenzar a cobrar.
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const lineTotal = item.product.price * item.quantity;
            return (
              <div
                key={item.product.id}
                className="p-2.5 rounded-2xl bg-[#22262E]/70 border border-slate-700/60 flex items-center gap-2.5 hover:border-slate-600 transition"
              >
                {/* Thumb */}
                <div className="w-12 h-12 rounded-xl bg-[#181B20] p-1 flex items-center justify-center shrink-0">
                  <img
                    src={item.product.imageUrl || '/logo_falconi.png'}
                    alt={item.product.name}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo_falconi.png';
                    }}
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-amber-500 truncate uppercase">
                    {item.product.brand}
                  </p>
                  <p className="text-xs font-bold text-white truncate">{item.product.name}</p>
                  <p className="text-[11px] text-slate-400">
                    ${item.product.price.toFixed(2)} c/u
                  </p>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-1 bg-[#181B20] border border-slate-700 rounded-xl p-0.5">
                  <button
                    onClick={() => onDec(item.product)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95 transition"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-6 text-center text-xs font-black text-white">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onAdd(item.product)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95 transition"
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {/* Line Total & Remove */}
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-amber-400">${lineTotal.toFixed(2)}</p>
                  <button
                    onClick={() => onRemove(item.product)}
                    className="text-slate-500 hover:text-red-400 p-1 transition"
                    title="Eliminar de ticket"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Footer: Discounts, Totals & Cobrar Button */}
      <div className="p-4 border-t border-[#282D37] bg-[#181B20]/95 flex flex-col gap-3 shrink-0">
        {/* Quick action buttons: Nota y En espera */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNoteDialog}
            className="flex-1 py-1.5 px-2 rounded-xl bg-[#22262E] hover:bg-[#2b303a] border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <FileText size={13} />
            <span>{saleNote ? 'Editar Nota' : '+ Nota'}</span>
          </button>

          <button
            onClick={onHoldSale}
            disabled={cart.length === 0}
            className="flex-1 py-1.5 px-2 rounded-xl bg-[#22262E] hover:bg-[#2b303a] border border-slate-700 text-slate-300 hover:text-amber-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-40"
          >
            <PauseCircle size={13} />
            <span>En espera</span>
          </button>

          {cart.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 rounded-xl bg-[#22262E] hover:bg-red-500/20 border border-slate-700 text-slate-400 hover:text-red-400 transition"
              title="Vaciar ticket"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        {/* Discount selector */}
        {discountOptions.length > 1 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Descuento:</span>
            <div className="flex items-center gap-1">
              {discountOptions.map((d) => (
                <button
                  key={d}
                  onClick={() => onSetDiscountPct(d)}
                  className={`px-2 py-0.5 rounded-lg font-bold text-xs transition ${
                    discountPct === d
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-[#22262E] text-slate-400 hover:text-white'
                  }`}
                >
                  {d === 0 ? '0%' : `${d}%`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Subtotal:</span>
            <span className="font-semibold text-white">${subtotal.toFixed(2)}</span>
          </div>

          {discountPct > 0 && (
            <div className="flex items-center justify-between text-emerald-400">
              <span>Descuento ({discountPct}%):</span>
              <span className="font-semibold">-${discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-sm font-black text-slate-300 uppercase tracking-wider">
              Total a Pagar
            </span>
            <span className="text-2xl font-black text-amber-400 tracking-tight">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Clear confirm dialog */}
        {showClearConfirm && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-2xl flex items-center justify-between gap-2">
            <span className="text-xs text-red-200 font-semibold">¿Vaciar el ticket actual?</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                No
              </button>
              <button
                onClick={() => {
                  onClear();
                  setShowClearConfirm(false);
                }}
                className="px-2.5 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
              >
                Sí, vaciar
              </button>
            </div>
          </div>
        )}

        {/* Big Gold Cobrar Button */}
        <button
          type="button"
          disabled={cart.length === 0}
          onClick={onPay}
          className="w-full h-15 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-lg tracking-wide shadow-xl shadow-amber-500/20 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <CreditCard size={22} />
          <span>COBRAR ${total.toFixed(2)}</span>
        </button>
      </div>
    </aside>
  );
};
