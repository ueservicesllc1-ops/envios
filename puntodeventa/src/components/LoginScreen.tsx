'use client';

import React, { useState, useEffect } from 'react';
import { Staff } from '../types/pos';
import { Delete, Lock, User, RefreshCw, AlertTriangle } from 'lucide-react';

interface LoginScreenProps {
  staffList: Staff[];
  lockedStaff?: Staff | null;
  loadingStaff: boolean;
  staffError?: string | null;
  loggingIn: boolean;
  loginError?: string | null;
  onLogin: (staffId: string, pin: string) => void;
  onRetryStaff: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  staffList,
  lockedStaff,
  loadingStaff,
  staffError,
  loggingIn,
  loginError,
  onLogin,
  onRetryStaff,
}) => {
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [pin, setPin] = useState('');

  const activeStaff = lockedStaff || selectedStaff || staffList[0] || null;

  useEffect(() => {
    if (!selectedStaff && staffList.length > 0) {
      setSelectedStaff(staffList[0]);
    }
  }, [staffList, selectedStaff]);

  useEffect(() => {
    if (loginError) {
      setPin('');
    }
  }, [loginError]);

  const handleDigit = (digit: string) => {
    if (pin.length < 6 && !loggingIn && activeStaff) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        onLogin(activeStaff.id, nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (!loggingIn) {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (!loggingIn) {
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#0F1115] via-[#141518] to-[#181B20] text-white p-4 sm:p-8 select-none">
      <div className="w-full max-w-4xl bg-[#181B20]/90 backdrop-blur-2xl border border-amber-500/20 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/80 flex flex-col md:flex-row items-center gap-8 md:gap-14">
        
        {/* Left column: Brand & Staff selection */}
        <div className="flex-1 flex flex-col items-center text-center">
          <div className="relative mb-3 group">
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/20 to-yellow-600/20 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition duration-500"></div>
            {/* Falconi Gold Logo */}
            <img
              src="/puntodeventa/logo_falconi.png"
              alt="Falconi Parfums"
              className="relative w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-[0_4px_20px_rgba(212,175,55,0.4)]"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.includes('/puntodeventa/')) {
                  target.src = '/logo_falconi.png';
                }
              }}
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 uppercase">
            Falconi Parfums
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-widest text-amber-500/80 uppercase mt-0.5 mb-2">
            Punto de Venta Oficial
          </p>

          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mb-5">
            {lockedStaff
              ? 'Pantalla bloqueada por inactividad. Ingresa tu PIN para continuar.'
              : 'Selecciona tu usuario y digita tu PIN de 4 números para comenzar a vender.'}
          </p>

          {/* Staff selector */}
          <div className="w-full max-w-xs space-y-2">
            {lockedStaff ? (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center font-bold text-amber-400">
                  <User size={20} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-sm text-white">{lockedStaff.name}</p>
                  <p className="text-xs text-amber-400/80 capitalize">{lockedStaff.role}</p>
                </div>
                <Lock size={16} className="text-amber-400" />
              </div>
            ) : loadingStaff ? (
              <div className="flex items-center justify-center gap-2 p-3 text-slate-400 text-sm">
                <RefreshCw size={16} className="animate-spin text-amber-400" />
                Cargando asesores...
              </div>
            ) : staffError ? (
              <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-2xl text-center">
                <p className="text-xs text-red-300 mb-2">{staffError}</p>
                <button
                  onClick={onRetryStaff}
                  className="px-3 py-1.5 bg-red-800/40 hover:bg-red-800/60 rounded-xl text-xs font-semibold text-white transition"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {staffList.map((s) => {
                  const isSelected = activeStaff?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStaff(s);
                        setPin('');
                      }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition border text-left ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                          : 'bg-[#22262E]/60 border-slate-700/50 text-slate-300 hover:bg-[#22262E]'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                          isSelected ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{s.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{s.role}</p>
                      </div>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-amber-400"></div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: PIN Pad */}
        <div className="w-full max-w-[320px] flex flex-col items-center">
          {/* PIN Indicator Dots */}
          <div className="flex items-center justify-center gap-3 h-8 mb-2">
            {[0, 1, 2, 3].map((i) => {
              const filled = i < pin.length;
              return (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    filled
                      ? 'bg-gradient-to-br from-amber-400 to-yellow-600 scale-110 shadow-lg shadow-amber-500/50'
                      : 'border-2 border-slate-600 bg-transparent'
                  }`}
                />
              );
            })}
          </div>

          {/* Feedback or error message */}
          <div className="h-6 flex items-center justify-center mb-3 text-center">
            {loginError ? (
              <span className="text-xs font-semibold text-red-400 flex items-center gap-1 animate-shake">
                <AlertTriangle size={14} /> {loginError}
              </span>
            ) : loggingIn ? (
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                <RefreshCw size={14} className="animate-spin" /> Verificando credenciales...
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                {activeStaff ? `PIN para ${activeStaff.name}` : 'Selecciona un usuario'}
              </span>
            )}
          </div>

          {/* Touch Keypad */}
          <div className="grid grid-cols-3 gap-2.5 w-full">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                disabled={loggingIn || !activeStaff}
                className="h-16 rounded-2xl bg-[#22262E] hover:bg-[#2b303a] active:bg-amber-500/30 active:scale-95 border border-slate-700/60 text-2xl font-bold text-white shadow-md transition flex items-center justify-center disabled:opacity-50"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              disabled={loggingIn || pin.length === 0}
              className="h-16 rounded-2xl bg-[#22262E]/70 hover:bg-[#2b303a] active:scale-95 border border-slate-700/60 text-sm font-bold text-slate-400 hover:text-white transition flex items-center justify-center disabled:opacity-40"
            >
              C
            </button>

            <button
              type="button"
              onClick={() => handleDigit('0')}
              disabled={loggingIn || !activeStaff}
              className="h-16 rounded-2xl bg-[#22262E] hover:bg-[#2b303a] active:bg-amber-500/30 active:scale-95 border border-slate-700/60 text-2xl font-bold text-white shadow-md transition flex items-center justify-center disabled:opacity-50"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              disabled={loggingIn || pin.length === 0}
              className="h-16 rounded-2xl bg-[#22262E]/70 hover:bg-[#2b303a] active:scale-95 border border-slate-700/60 text-slate-400 hover:text-white transition flex items-center justify-center disabled:opacity-40"
            >
              <Delete size={22} />
            </button>
          </div>

          {/* Submit button */}
          <button
            type="button"
            onClick={() => activeStaff && onLogin(activeStaff.id, pin)}
            disabled={loggingIn || !activeStaff || pin.length < 4}
            className="w-full mt-4 h-14 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-base tracking-wide shadow-xl shadow-amber-500/20 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loggingIn ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                Ingresando...
              </>
            ) : (
              'Ingresar a Falconi POS'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
