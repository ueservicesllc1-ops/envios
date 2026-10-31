'use client';

import React from 'react';
import { Search, Camera, QrCode, Lock, LogOut, X, Sparkles, Send } from 'lucide-react';
import { PosLocation, POS_LOCATIONS, PosLocationId } from '../types/pos';

interface TopSearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  selectedLocation: PosLocationId;
  onScanCamera: () => void;
  onScanPhoto: () => void;
  onLock: () => void;
  onLogout: () => void;
  onOpenBroadcast?: () => void;
}

export const TopSearchBar: React.FC<TopSearchBarProps> = ({
  query,
  onQueryChange,
  selectedLocation,
  onScanCamera,
  onScanPhoto,
  onLock,
  onLogout,
  onOpenBroadcast,
}) => {
  const loc = POS_LOCATIONS[selectedLocation] || POS_LOCATIONS.local;

  return (
    <header className="h-16 bg-[#181B20] border-b border-[#282D37] px-4 flex items-center justify-between gap-3 shrink-0 select-none z-20">
      {/* Search Input */}
      <div className="flex-1 max-w-xl relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={`Buscar en ${loc.label} por nombre, marca o código...`}
          className="w-full h-11 pl-10 pr-10 rounded-2xl bg-[#22262E] border border-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
        />
        {query && (
          <button
            onClick={() => onQueryChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Action buttons & Location badge */}
      <div className="flex items-center gap-2">
        {/* Active location badge */}
        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
          selectedLocation === 'local'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
        }`}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${
            selectedLocation === 'local' ? 'bg-emerald-400' : 'bg-blue-400'
          }`}></span>
          <span>{loc.label}</span>
        </div>

        {/* Camera scanner */}
        <button
          onClick={onScanCamera}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#22262E] hover:bg-[#2b303a] border border-slate-700 text-slate-200 hover:text-amber-400 text-xs font-bold transition shadow-sm"
          title="Escanear código de barras con cámara"
        >
          <QrCode size={16} className="text-amber-400" />
          <span className="hidden md:inline">Escanear</span>
        </button>

        {/* Photo scanner / AI search */}
        <button
          onClick={onScanPhoto}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#22262E] hover:bg-[#2b303a] border border-slate-700 text-slate-200 hover:text-amber-400 text-xs font-bold transition shadow-sm"
          title="Reconocimiento por foto o caja"
        >
          <Camera size={16} className="text-amber-400" />
          <span className="hidden md:inline">Por Foto</span>
        </button>

        {/* Botón a la derecha para enviar promociones por correo a clientes */}
        {onOpenBroadcast && (
          <button
            onClick={onOpenBroadcast}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black transition shadow-md shadow-amber-500/20 active:scale-95"
            title="Enviar promociones y últimos perfumes por correo a todos los clientes registrados"
          >
            <Send size={15} className="text-black stroke-[2.5]" />
            <span className="hidden sm:inline">Enviar Promociones</span>
          </button>
        )}

        {/* Lock screen */}
        <button
          onClick={onLock}
          className="p-2.5 rounded-xl bg-[#22262E] hover:bg-amber-500/20 border border-slate-700 text-slate-300 hover:text-amber-400 transition"
          title="Bloquear pantalla"
        >
          <Lock size={16} />
        </button>
      </div>
    </header>
  );
};
