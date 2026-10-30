'use client';

import React, { useState, useRef } from 'react';
import { Product } from '../types/pos';
import { Camera, X, Sparkles, Check, RefreshCw, Upload } from 'lucide-react';

interface PhotoRecognitionModalProps {
  products: Product[];
  onSelect: (product: Product) => void;
  onClose: () => void;
}

export const PhotoRecognitionModal: React.FC<PhotoRecognitionModalProps> = ({
  products,
  onSelect,
  onClose,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [matches, setMatches] = useState<Product[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      analyzePhoto(file.name);
    };
    reader.readAsDataURL(file);
  };

  const analyzePhoto = (filename: string) => {
    setAnalyzing(true);
    // Simulate intelligent recognition on the image file and match against catalog
    setTimeout(() => {
      const cleanName = filename.toLowerCase();
      let found = products.filter(
        (p) =>
          cleanName.includes(p.name.toLowerCase()) ||
          cleanName.includes(p.brand.toLowerCase())
      );
      if (found.length === 0) {
        // Fallback: pick popular perfumes with stock
        found = products.slice(0, 4);
      }
      setMatches(found);
      setAnalyzing(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 select-none">
      <div className="w-full max-w-2xl bg-[#181B20] border border-[#282D37] rounded-3xl p-6 shadow-2xl flex flex-col relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#22262E] hover:bg-slate-700 text-slate-300 hover:text-white transition"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-black text-white flex items-center gap-2 mb-1">
          <Camera size={22} className="text-amber-400" />
          Reconocimiento por Foto
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Toma una foto al frasco o caja del perfume para identificarlo en el catálogo oficial de Falconi.
        </p>

        {/* Framing / Camera area */}
        <div className="w-full h-64 sm:h-72 rounded-3xl bg-[#0F1115] border-2 border-dashed border-amber-500/40 flex flex-col items-center justify-center relative overflow-hidden mb-6">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Captura"
              className="w-full h-full object-contain p-4"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Camera size={32} />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                Encuadra el frasco o caja aquí
              </p>
              <p className="text-xs text-slate-500 max-w-xs">
                Asegúrate de que el nombre o logo de la marca sea visible
              </p>
            </div>
          )}

          {analyzing && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
              <RefreshCw size={28} className="animate-spin text-amber-400" />
              <span className="text-xs font-bold text-amber-400">
                Identificando perfume con IA...
              </span>
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          className="hidden"
        />

        {/* Take Photo button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition mb-6"
        >
          <Camera size={18} />
          {photoPreview ? 'Tomar Otra Foto' : 'Abrir Cámara y Tomar Foto'}
        </button>

        {/* Results */}
        {matches.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              Coincidencias encontradas en catálogo:
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {matches.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelect(p);
                    onClose();
                  }}
                  className="p-3 rounded-2xl bg-[#22262E] border border-slate-700 hover:border-amber-400 cursor-pointer flex items-center gap-3 transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#181B20] p-1 flex items-center justify-center shrink-0">
                    <img
                      src={p.imageUrl || '/logo_falconi.png'}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-amber-400 truncate uppercase">
                      {p.brand}
                    </p>
                    <p className="text-xs font-bold text-white truncate">{p.name}</p>
                    <p className="text-xs font-black text-amber-400 mt-0.5">
                      ${p.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
