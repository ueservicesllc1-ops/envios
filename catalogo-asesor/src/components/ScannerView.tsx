'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Camera, Flashlight, RefreshCw, Keyboard, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { perfumeCatalogService } from '../services/perfumeCatalogService';
import { PerfumeItem } from '../types/perfume';
import { triggerBeep, triggerHaptic } from '../lib/feedback';

interface ScannerViewProps {
  onSelectPerfume: (perfume: PerfumeItem) => void;
  onNavigateToSearch: () => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  onSelectPerfume,
  onNavigateToSearch,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

  // Stop current camera stream
  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner controls:', err);
      }
      controlsRef.current = null;
    }
  }, []);

  // Handle scanned barcode logic
  const handleBarcodeDetected = useCallback(
    async (code: string) => {
      const cleanCode = code.trim();
      if (!cleanCode || isSearching) return;

      setIsSearching(true);
      setLastScannedCode(cleanCode);
      setNotFoundCode(null);

      // Feedback: Beep and vibrate
      triggerBeep();
      triggerHaptic();

      try {
        const found = await perfumeCatalogService.findByBarcode(cleanCode);
        if (found) {
          onSelectPerfume(found);
        } else {
          setNotFoundCode(cleanCode);
        }
      } catch (err) {
        console.error('Error buscando código:', err);
        setNotFoundCode(cleanCode);
      } finally {
        setTimeout(() => setIsSearching(false), 800);
      }
    },
    [isSearching, onSelectPerfume]
  );

  // Initialize camera scanner
  const startScanner = useCallback(async () => {
    stopScanner();
    setErrorMessage(null);
    setNotFoundCode(null);

    if (!videoRef.current) return;

    try {
      const codeReader = new BrowserMultiFormatReader();
      // Use environment (back) camera
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const controls = await codeReader.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleBarcodeDetected(result.getText());
          }
        }
      );

      controlsRef.current = controls;
      setHasPermission(true);

      // Check if torch/flashlight is supported
      if (videoRef.current.srcObject instanceof MediaStream) {
        const track = videoRef.current.srcObject.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as { torch?: boolean } | undefined;
        setTorchAvailable(!!capabilities?.torch);
      }
    } catch (err: any) {
      console.error('Camera init error:', err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Permiso de cámara denegado. Habilita el acceso en los ajustes de tu navegador.');
      } else {
        setErrorMessage('No se pudo acceder a la cámara trasera. Verifica que no esté en uso por otra aplicación.');
      }
    }
  }, [handleBarcodeDetected, stopScanner]);

  // Toggle torch
  const toggleTorch = async () => {
    if (!videoRef.current?.srcObject) return;
    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      const nextState = !torchOn;
      // @ts-ignore
      await track.applyConstraints({ advanced: [{ torch: nextState }] });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setShowManualModal(false);
    handleBarcodeDetected(manualCode.trim());
    setManualCode('');
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-black flex flex-col items-center justify-between overflow-hidden">
      {/* Background Video Stream */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90 pointer-events-none" />

      {/* Top Bar Controls */}
      <div className="relative z-10 w-full max-w-md px-4 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-800">
          <Camera className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-medium text-neutral-200 tracking-wide uppercase">
            Escáner Activo
          </span>
        </div>

        <div className="flex items-center gap-2">
          {torchAvailable && (
            <button
              onClick={toggleTorch}
              className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                torchOn
                  ? 'bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/30'
                  : 'bg-black/60 text-white border-neutral-700 hover:border-amber-400/50'
              }`}
              title="Linterna"
            >
              <Flashlight className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={startScanner}
            className="p-2.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-neutral-700 hover:border-amber-400/50 active:scale-95 transition-all"
            title="Reiniciar Cámara"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Reticle / Viewfinder Frame */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 border-2 border-dashed border-amber-400/40 rounded-3xl p-3 flex items-center justify-center shadow-2xl backdrop-blur-[2px]">
          {/* Laser scanning beam */}
          <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b] animate-scanner-laser rounded-full" />

          {/* Corner Guides */}
          <div className="absolute top-2 left-2 w-7 h-7 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
          <div className="absolute top-2 right-2 w-7 h-7 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
          <div className="absolute bottom-2 left-2 w-7 h-7 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
          <div className="absolute bottom-2 right-2 w-7 h-7 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />

          {/* Scanning status indication */}
          {isSearching ? (
            <div className="bg-black/85 backdrop-blur-md px-4 py-2.5 rounded-xl border border-amber-400/60 flex items-center gap-2 text-amber-300 animate-pulse">
              <CheckCircle2 className="w-5 h-5 text-amber-400 animate-spin" />
              <span className="text-xs font-semibold uppercase tracking-wider">Identificando...</span>
            </div>
          ) : (
            <p className="text-center text-xs text-neutral-300 bg-black/60 px-3 py-1.5 rounded-full border border-neutral-800 backdrop-blur-sm">
              Apunta al código de barras del frasco o caja
            </p>
          )}
        </div>

        {/* Not Found Alert */}
        {notFoundCode && (
          <div className="mt-4 w-11/12 max-w-sm bg-neutral-900/95 border border-red-500/50 rounded-2xl p-3.5 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-white">Código no registrado</p>
                <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{notFoundCode}</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={onNavigateToSearch}
                    className="flex-1 py-1.5 px-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Buscar por Foto IA
                  </button>
                  <button
                    onClick={() => setNotFoundCode(null)}
                    className="py-1.5 px-3 bg-neutral-800 text-neutral-300 text-[11px] font-medium rounded-lg hover:bg-neutral-700"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error / Permission Alert */}
        {errorMessage && (
          <div className="mt-4 w-11/12 max-w-sm bg-red-950/90 border border-red-500/60 rounded-2xl p-4 backdrop-blur-md text-center">
            <p className="text-xs text-red-200">{errorMessage}</p>
            <button
              onClick={startScanner}
              className="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg"
            >
              Reintentar Permiso
            </button>
          </div>
        )}
      </div>

      {/* Bottom Action Tray */}
      <div className="relative z-10 w-full max-w-md px-4 pb-6 flex items-center justify-center gap-3">
        <button
          onClick={() => setShowManualModal(true)}
          className="flex-1 py-3 px-4 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 rounded-2xl backdrop-blur-md text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 active:scale-98 transition-all shadow-lg"
        >
          <Keyboard className="w-4 h-4 text-amber-400" />
          Ingreso Manual
        </button>

        <button
          onClick={onNavigateToSearch}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-400/40 rounded-2xl backdrop-blur-md text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 active:scale-98 transition-all shadow-lg"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          Foto IA / Búsqueda
        </button>
      </div>

      {/* Manual Barcode Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Ingresar Código de Barras
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Digita el número que aparece debajo de las barras en el frasco o caja.
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                type="text"
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ej: 6291107456789"
                className="w-full px-4 py-3 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono text-sm placeholder:text-neutral-600 focus:outline-none focus:border-amber-400"
              />

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl text-xs disabled:opacity-50"
                >
                  Buscar Perfume
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
