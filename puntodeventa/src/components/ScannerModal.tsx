'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { X, Camera, RefreshCw, AlertCircle, Barcode, CheckCircle2 } from 'lucide-react';
import { triggerBeep, triggerHaptic } from '../lib/feedback';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      controlsRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleDetected = useCallback((code: string) => {
    const clean = code.trim();
    if (!clean) return;

    triggerBeep();
    triggerHaptic();
    onScan(clean);
    stopScanner();
    onClose();
  }, [onScan, stopScanner, onClose]);

  const startScanner = useCallback(async () => {
    setErrorMessage(null);
    stopScanner();

    if (!videoRef.current) return;

    try {
      const codeReader = new BrowserMultiFormatReader();
      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();

      if (!videoInputDevices || videoInputDevices.length === 0) {
        setErrorMessage('No se detectó cámara en el dispositivo.');
        return;
      }

      // Prioritize environment / back camera
      let selectedDeviceId = videoInputDevices[0].deviceId;
      const backCam = videoInputDevices.find(dev => 
        dev.label.toLowerCase().includes('back') || 
        dev.label.toLowerCase().includes('trasera') ||
        dev.label.toLowerCase().includes('environment')
      );
      if (backCam) {
        selectedDeviceId = backCam.deviceId;
      }

      const controls = await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            handleDetected(result.getText());
          }
        }
      );

      controlsRef.current = controls;
      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Habilita el acceso en los ajustes de Safari/iPad.'
          : 'No se pudo iniciar la cámara. Usa el ingreso manual de código.'
      );
    }
  }, [stopScanner, handleDetected]);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-emerald-500/30 bg-[#0c121e] text-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-wide">Escanear Código de Barras</h3>
              <p className="text-[11px] text-slate-400">Apunta al código del perfume o producto</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Video */}
        <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Laser & Frame */}
          <div className="absolute inset-8 border-2 border-dashed border-emerald-400/50 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-scanner-laser rounded-full" />
            
            <div className="absolute top-2 left-2 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
            <div className="absolute top-2 right-2 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
            <div className="absolute bottom-2 left-2 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
            <div className="absolute bottom-2 right-2 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
          </div>

          {errorMessage && (
            <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
              <p className="text-xs text-rose-200 mb-4">{errorMessage}</p>
              <button
                onClick={startScanner}
                className="py-2 px-4 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reintentar Cámara</span>
              </button>
            </div>
          )}
        </div>

        {/* Manual Barcode Input */}
        <div className="p-4 border-t border-slate-800 bg-[#090d16]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.trim()) {
                handleDetected(manualCode.trim());
              }
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="O escribe el código / SKU..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="py-2 px-4 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-50 transition-all shrink-0"
            >
              Agregar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
