'use client';

import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Smartphone, Tablet, CheckCircle, ChevronRight, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const IpadInstallPrompt: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [isIpadOrIos, setIsIpadOrIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // default true to avoid flash
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect if running as standalone PWA
    const standaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(standaloneMode);

    // Detect iPadOS / iOS
    const isAppleDevice = 
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    setIsIpadOrIos(isAppleDevice);

    // Check if dismissed previously
    const dismissed = sessionStorage.getItem('falconi_ipad_prompt_dismissed') === 'true';
    setIsDismissed(dismissed);
  }, []);

  if (isStandalone || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('falconi_ipad_prompt_dismissed', 'true');
  };

  return (
    <>
      {/* Floating iPad Banner */}
      <div className="fixed top-16 md:top-20 left-3 right-3 md:left-auto md:right-6 md:max-w-md z-40 animate-in slide-in-from-top-4 duration-300">
        <div
          className={`p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-3 transition-colors ${
            isLight
              ? 'bg-white/95 border-amber-300/80 shadow-amber-500/10 text-slate-900'
              : 'bg-[#0f172a]/95 border-amber-500/30 shadow-black/60 text-white'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 text-slate-950">
            <Tablet className="w-5 h-5 stroke-[2.2]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold tracking-wider uppercase px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
                PWA iPad
              </span>
              <p className="text-xs font-bold truncate">Usar como App en iPad</p>
            </div>
            <p className={`text-[11px] leading-tight mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Ábrelo a pantalla completa sin escribir la dirección web.
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowModal(true)}
              className="py-1.5 px-2.5 rounded-xl text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm active:scale-95 transition-all flex items-center gap-1"
            >
              <span>Instalar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDismiss}
              className={`p-1.5 rounded-lg transition-colors ${
                isLight ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-slate-800 text-slate-400'
              }`}
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iPad Visual Installation Instructions Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 overflow-hidden relative ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-[#0d1424] border-amber-500/30 text-white'
            }`}
          >
            <button
              onClick={() => setShowModal(false)}
              className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
                isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-200 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
                <Sparkles className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">Instalar Falconi en tu iPad Pro</h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Disfruta de la experiencia en pantalla completa 120Hz sin barra de Safari.
                </p>
              </div>
            </div>

            <div className="space-y-4 my-6">
              {/* Step 1 */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 font-extrabold text-sm flex items-center justify-center shrink-0 border border-amber-500/30">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    Toca el botón Compartir de Safari
                    <span className="inline-flex items-center justify-center p-1 rounded-md bg-amber-500/10 text-amber-500">
                      <Share className="w-3.5 h-3.5" />
                    </span>
                  </p>
                  <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Lo encuentras en la barra superior de Safari en tu iPad (cuadrado con flecha hacia arriba).
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 font-extrabold text-sm flex items-center justify-center shrink-0 border border-amber-500/30">
                  2
                </div>
                <div>
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    Selecciona &quot;Agregar a pantalla de inicio&quot;
                    <span className="inline-flex items-center justify-center p-1 rounded-md bg-amber-500/10 text-amber-500">
                      <PlusSquare className="w-3.5 h-3.5" />
                    </span>
                  </p>
                  <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Desplaza el menú hacia abajo y pulsa en <strong>&quot;Agregar al inicio&quot;</strong> (Add to Home Screen).
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                  isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/30'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 font-extrabold text-sm flex items-center justify-center shrink-0 border border-emerald-500/40">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ¡Listo! Falconi quedará como App en tu escritorio
                  </p>
                  <p className={`text-[11px] mt-1 ${isLight ? 'text-emerald-800/80' : 'text-emerald-200/70'}`}>
                    Ábrela desde el icono dorado de Falconi en cualquier momento con un solo toque y sin barras de navegación.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  handleDismiss();
                  setShowModal(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-98 transition-all text-center"
              >
                Entendido, voy a agregarlo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
