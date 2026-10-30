'use client';

import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Tablet, CheckCircle, ChevronRight, Store } from 'lucide-react';

export const IpadInstallPrompt: React.FC = () => {
  const [isStandalone, setIsStandalone] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(standaloneMode);

    const dismissed = sessionStorage.getItem('falconi_pos_prompt_dismissed') === 'true';
    setIsDismissed(dismissed);
  }, []);

  if (isStandalone || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('falconi_pos_prompt_dismissed', 'true');
  };

  return (
    <>
      {/* Floating iPad Banner */}
      <div className="fixed top-16 md:top-20 left-3 right-3 md:left-auto md:right-6 md:max-w-md z-40 animate-in slide-in-from-top-4 duration-300">
        <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-[#0d1624]/95 shadow-2xl backdrop-blur-xl flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-300 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 text-slate-950">
            <Store className="w-5 h-5 stroke-[2.2]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold tracking-wider uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                PWA iPad Pro
              </span>
              <p className="text-xs font-bold truncate">Terminal Táctil de POS</p>
            </div>
            <p className="text-[11px] leading-tight mt-0.5 text-slate-300">
              Instala el Punto de Venta a pantalla completa en tu iPad.
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowModal(true)}
              className="py-1.5 px-2.5 rounded-xl text-[11px] font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm active:scale-95 transition-all flex items-center gap-1"
            >
              <span>Instalar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iPad Visual Installation Instructions Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-emerald-500/30 bg-[#0a101d] text-white shadow-2xl p-6 overflow-hidden relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-emerald-400 to-teal-200 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
                <Store className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">Instalar Falconi POS en tu iPad Pro</h3>
                <p className="text-xs text-slate-400">
                  Usa la terminal de ventas en pantalla completa sin barra de navegación.
                </p>
              </div>
            </div>

            <div className="space-y-4 my-6">
              <div className="p-4 rounded-2xl border bg-slate-900/60 border-slate-800 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-sm flex items-center justify-center shrink-0 border border-emerald-500/30">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    Toca el botón Compartir de Safari
                    <span className="inline-flex items-center justify-center p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                      <Share className="w-3.5 h-3.5" />
                    </span>
                  </p>
                  <p className="text-[11px] mt-1 text-slate-400">
                    En la barra superior de Safari de tu iPad (cuadrado con flecha hacia arriba).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border bg-slate-900/60 border-slate-800 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-sm flex items-center justify-center shrink-0 border border-emerald-500/30">
                  2
                </div>
                <div>
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    Selecciona &quot;Agregar a pantalla de inicio&quot;
                    <span className="inline-flex items-center justify-center p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                      <PlusSquare className="w-3.5 h-3.5" />
                    </span>
                  </p>
                  <p className="text-[11px] mt-1 text-slate-400">
                    Desplaza hacia abajo y pulsa en <strong>&quot;Agregar al inicio&quot;</strong> (Add to Home Screen).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border bg-emerald-950/20 border-emerald-500/30 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-sm flex items-center justify-center shrink-0 border border-emerald-500/40">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-400">
                    ¡Listo! Falconi POS queda como App en el escritorio del iPad
                  </p>
                  <p className="text-[11px] mt-1 text-emerald-200/70">
                    Ábrela desde el icono verde esmeralda para una experiencia fluida e instantánea de cobro en mostrador.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                handleDismiss();
                setShowModal(false);
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-98 transition-all text-center"
            >
              Entendido, voy a agregarlo
            </button>
          </div>
        </div>
      )}
    </>
  );
};
