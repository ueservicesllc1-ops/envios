'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Camera, 
  Sparkles, 
  X, 
  Package, 
  Store, 
  TrendingUp, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { PerfumeItem } from '../types/perfume';
import { PerfumeCard } from './PerfumeCard';
import { perfumeCatalogService } from '../services/perfumeCatalogService';
import { triggerBeep, triggerHaptic } from '../lib/feedback';
import { useTheme } from '../context/ThemeContext';

interface SearchViewProps {
  perfumes: PerfumeItem[];
  onSelectPerfume: (perfume: PerfumeItem) => void;
  onToggleFavorite: (id: string) => void;
  favorites: string[];
}

export const SearchView: React.FC<SearchViewProps> = ({
  perfumes,
  onSelectPerfume,
  onToggleFavorite,
  favorites,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [onlyDupes, setOnlyDupes] = useState<boolean>(false);

  // Dupe Radar State (cuando el usuario busca un perfume de diseñador / nicho)
  const [dupeRadarLoading, setDupeRadarLoading] = useState(false);
  const [dupeRadarResult, setDupeRadarResult] = useState<{
    reference: any;
    candidates: {
      enTienda: any[];
      enBodega: any[];
      paraImportar: any[];
    };
  } | null>(null);

  // Solicitud de importación
  const [requestingItem, setRequestingItem] = useState<string | null>(null);
  const [requestedSuccessMap, setRequestedSuccessMap] = useState<Record<string, boolean>>({});

  // AI Photo Recognition States
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<PerfumeItem | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Debounce para consultar Dupe Radar cuando el usuario escribe algo con más de 3 letras
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 3) {
      setDupeRadarResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setDupeRadarLoading(true);
      try {
        const res = await perfumeCatalogService.findDupeCandidates(searchTerm.trim());
        if (res.success && res.reference) {
          setDupeRadarResult({
            reference: res.reference,
            candidates: res.candidates || { enTienda: [], enBodega: [], paraImportar: [] }
          });
        } else {
          setDupeRadarResult(null);
        }
      } catch (err) {
        console.warn('Error en Dupe Radar:', err);
      } finally {
        setDupeRadarLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle Photo Capture / Upload
  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiResult(null);
    setAiError(null);
    setIsAnalyzingPhoto(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setPhotoPreview(base64Data);

      try {
        const res = await perfumeCatalogService.identifyByPhoto(base64Data);
        if (res.success && res.perfume) {
          setAiResult(res.perfume);
          triggerBeep();
          triggerHaptic();
        } else {
          setAiError(res.error || 'No pudimos reconocer el perfume con total seguridad. Intenta con una toma más cercana.');
        }
      } catch (err: any) {
        setAiError(err.message || 'Error analizando la foto con IA.');
      } finally {
        setIsAnalyzingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Registrar solicitud de cliente para un perfume no disponible
  const handleRequestImport = async (candidate: { name: string; brand?: string; similarity?: string }) => {
    if (!candidate || !candidate.name) return;
    setRequestingItem(candidate.name);

    try {
      const res = await perfumeCatalogService.requestImport({
        perfumeName: candidate.name,
        brand: candidate.brand || '',
        referenceName: dupeRadarResult?.reference?.name || searchTerm,
        referenceBrand: dupeRadarResult?.reference?.brand || '',
        advisorName: 'Asesor Tienda',
        notes: `Solicitado desde buscador de equivalencias para: ${searchTerm}`
      });

      if (res.success) {
        setRequestedSuccessMap(prev => ({ ...prev, [candidate.name]: true }));
        triggerHaptic();
      } else {
        alert(res.error || 'No se pudo guardar la solicitud');
      }
    } catch (e: any) {
      alert('Error registrando solicitud: ' + (e.message || 'Error desconocido'));
    } finally {
      setRequestingItem(null);
    }
  };

  // Filter Catalog Perfumes locally
  const filteredPerfumes = useMemo(() => {
    let result = perfumes;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(p => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const brandMatch = p.brand.toLowerCase().includes(q);
        const dupeMatch = p.dupeOf && p.dupeOf.toLowerCase().includes(q);
        const dupeBrandMatch = p.dupeBrand && p.dupeBrand.toLowerCase().includes(q);
        const notesMatch = [
          ...(p.notes?.top || []),
          ...(p.notes?.middle || []),
          ...(p.notes?.base || []),
          ...(p.mainAccords || [])
        ].some(n => n.toLowerCase().includes(q));

        return nameMatch || brandMatch || dupeMatch || dupeBrandMatch || notesMatch;
      });
    }

    if (selectedGender !== 'all') {
      result = result.filter(p => (p.gender || '').toLowerCase() === selectedGender.toLowerCase());
    }

    if (onlyInStock) {
      result = result.filter(p => (p.stock?.total || 0) > 0);
    }

    if (onlyDupes) {
      result = result.filter(p => Boolean(p.dupeOf));
    }

    return result;
  }, [perfumes, searchTerm, selectedGender, onlyInStock, onlyDupes]);

  const quickPills = [
    'Creed Aventus',
    'Sauvage Elixir',
    'Baccarat Rouge 540',
    'Angels\' Share',
    'Bleu de Chanel',
    'Delina',
    'Ultra Male',
    'Erba Pura',
    'Lost Cherry',
    'Imagination'
  ];

  return (
    <div
      className={`w-full min-h-screen px-3.5 pt-3 pb-24 transition-colors duration-250 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-black text-white'
      }`}
    >
      {/* Top Search Input */}
      <div className="relative mb-3">
        <div className="relative flex items-center">
          <Search className={`absolute left-3.5 w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="¿Buscas un clon? Ej: Creed Aventus, Sauvage, Baccarat..."
            className={`w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs focus:outline-none transition-all shadow-xs ${
              isLight
                ? 'bg-white border border-slate-200 focus:border-amber-500 text-slate-900 placeholder:text-slate-400'
                : 'bg-neutral-900 border border-neutral-800 focus:border-amber-400 text-white placeholder:text-neutral-500 shadow-inner'
            }`}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDupeRadarResult(null);
              }}
              className={`absolute right-3 p-1 rounded-full ${
                isLight ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* DUPE RADAR: Si el término coincide con una referencia de diseñador */}
      {dupeRadarLoading && (
        <div
          className={`mb-4 rounded-2xl p-3.5 flex items-center gap-3 border shadow-xs ${
            isLight
              ? 'bg-purple-50/70 border-purple-200 text-purple-900'
              : 'bg-gradient-to-r from-purple-950/40 via-neutral-900 to-indigo-950/40 border-purple-500/30 text-purple-200'
          }`}
        >
          <Sparkles className="w-5 h-5 text-purple-500 animate-spin" />
          <div className="text-xs">
            Consultando equivalencias olfativas y stock para <strong>"{searchTerm}"</strong>...
          </div>
        </div>
      )}

      {dupeRadarResult && dupeRadarResult.reference && (
        <div
          className={`mb-5 rounded-2xl p-3.5 relative overflow-hidden border shadow-md transition-all ${
            isLight
              ? 'bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 border-purple-200 text-slate-900'
              : 'bg-gradient-to-b from-[#161226] to-[#0c0917] border-purple-500/40 text-white shadow-xl'
          }`}
        >
          {/* Header de la Referencia */}
          <div
            className={`flex items-start justify-between gap-2 border-b pb-3 mb-3 ${
              isLight ? 'border-purple-100' : 'border-purple-500/20'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                    isLight
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  }`}
                >
                  ✨ Equivalencias Oficiales
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    isLight ? 'text-purple-600' : 'text-purple-400'
                  }`}
                >
                  {dupeRadarResult.reference.gender}
                </span>
              </div>
              <h3
                className={`text-base font-extrabold mt-1 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                {dupeRadarResult.reference.brand} — {dupeRadarResult.reference.name}
              </h3>
              <p
                className={`text-[11px] line-clamp-2 mt-0.5 leading-relaxed ${
                  isLight ? 'text-slate-600 font-medium' : 'text-neutral-300'
                }`}
              >
                {dupeRadarResult.reference.description}
              </p>
              {dupeRadarResult.reference.keyNotes && dupeRadarResult.reference.keyNotes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {dupeRadarResult.reference.keyNotes.map((note: string, idx: number) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        isLight
                          ? 'bg-purple-100/70 border-purple-200 text-purple-800'
                          : 'bg-purple-900/40 border border-purple-700/40 text-purple-200'
                      }`}
                    >
                      {note}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bloque 1: Disponible en Tienda para entrega inmediata */}
          <div className="space-y-3">
            <div>
              <div
                className={`flex items-center gap-1.5 text-xs font-bold mb-2 ${
                  isLight ? 'text-emerald-700' : 'text-emerald-400'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Disponible en Tienda (Mostrador Inmediato):</span>
              </div>
              {dupeRadarResult.candidates.enTienda.length > 0 ? (
                <div className="space-y-2">
                  {dupeRadarResult.candidates.enTienda.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectPerfume(c)}
                      className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] border shadow-xs ${
                        isLight
                          ? 'bg-emerald-50/90 border-emerald-200 hover:border-emerald-400'
                          : 'bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {c.imageUrl && (
                          <img
                            src={c.imageUrl}
                            alt={c.name}
                            className={`w-10 h-10 object-contain rounded p-1 ${
                              isLight
                                ? 'bg-white border border-slate-200 mix-blend-multiply'
                                : 'bg-black/40'
                            }`}
                          />
                        )}
                        <div>
                          <div
                            className={`text-xs font-bold ${
                              isLight ? 'text-slate-900' : 'text-white'
                            }`}
                          >
                            {c.name}
                          </div>
                          <div
                            className={`text-[10px] font-semibold ${
                              isLight ? 'text-emerald-700' : 'text-emerald-300'
                            }`}
                          >
                            {c.brand} • ${c.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold border ${
                            isLight
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {c.stockLocal} en Tienda
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={`text-[11px] p-2 rounded-lg border ${
                    isLight
                      ? 'text-slate-500 bg-white border-slate-200'
                      : 'text-neutral-400 bg-neutral-900/60 border-neutral-800'
                  }`}
                >
                  Sin unidades en el mostrador ahora mismo. Revisa las opciones en bodega abajo.
                </div>
              )}
            </div>

            {/* Bloque 2: Disponible en Bodega (Ecuador o USA) */}
            <div>
              <div
                className={`flex items-center gap-1.5 text-xs font-bold mb-2 ${
                  isLight ? 'text-cyan-700' : 'text-cyan-400'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Disponible en Bodegas (Despacho 24-48h):</span>
              </div>
              {dupeRadarResult.candidates.enBodega.length > 0 ? (
                <div className="space-y-2">
                  {dupeRadarResult.candidates.enBodega.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectPerfume(c)}
                      className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] border shadow-xs ${
                        isLight
                          ? 'bg-cyan-50/90 border-cyan-200 hover:border-cyan-400'
                          : 'bg-cyan-950/20 border-cyan-500/40 hover:border-cyan-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {c.imageUrl && (
                          <img
                            src={c.imageUrl}
                            alt={c.name}
                            className={`w-10 h-10 object-contain rounded p-1 ${
                              isLight
                                ? 'bg-white border border-slate-200 mix-blend-multiply'
                                : 'bg-black/40'
                            }`}
                          />
                        )}
                        <div>
                          <div
                            className={`text-xs font-bold ${
                              isLight ? 'text-slate-900' : 'text-white'
                            }`}
                          >
                            {c.name}
                          </div>
                          <div
                            className={`text-[10px] font-semibold ${
                              isLight ? 'text-cyan-700' : 'text-cyan-300'
                            }`}
                          >
                            {c.brand} • ${c.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        {c.stockBodegaEc > 0 && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                              isLight
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {c.stockBodegaEc} en Bodega Ecuador
                          </span>
                        )}
                        {c.stockBodegaUsa > 0 && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                              isLight
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {c.stockBodegaUsa} en Bodega USA
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={`text-[11px] p-2 rounded-lg border ${
                    isLight
                      ? 'text-slate-500 bg-white border-slate-200'
                      : 'text-neutral-400 bg-neutral-900/60 border-neutral-800'
                  }`}
                >
                  No hay candidatos directos en bodegas actualmente.
                </div>
              )}
            </div>

            {/* Bloque 3: Candidatos para Pedir / Importar (Demanda Futura) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`flex items-center gap-1.5 text-xs font-bold ${
                    isLight ? 'text-amber-700' : 'text-amber-400'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Otros Dupes Reconocidos (Para Pedir / Importar):</span>
                </div>
              </div>
              <div className="space-y-2">
                {dupeRadarResult.candidates.paraImportar.map((pi, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl flex items-center justify-between gap-3 border shadow-xs ${
                      isLight
                        ? 'bg-white border-slate-200 hover:border-amber-300'
                        : 'bg-neutral-900/80 border-neutral-800'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-xs font-bold truncate ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {pi.name}
                      </div>
                      <div
                        className={`text-[10px] font-semibold ${
                          isLight ? 'text-amber-700' : 'text-amber-300/80'
                        }`}
                      >
                        Marca: {pi.brand}
                      </div>
                      <div
                        className={`text-[10px] truncate mt-0.5 ${
                          isLight ? 'text-slate-500' : 'text-neutral-400'
                        }`}
                      >
                        {pi.similarity}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRequestImport(pi)}
                      disabled={requestingItem === pi.name || requestedSuccessMap[pi.name]}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1.5 transition-all shadow-xs ${
                        requestedSuccessMap[pi.name]
                          ? isLight
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                            : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 cursor-default'
                          : isLight
                          ? 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 active:scale-95'
                      }`}
                    >
                      {requestedSuccessMap[pi.name] ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>¡Anotado!</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-3 h-3" />
                          <span>{requestingItem === pi.name ? 'Guardando...' : 'Anotar Pedido'}</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero AI Photo Identification Card */}
      <div
        className={`mb-4 rounded-2xl p-3.5 border shadow-sm relative overflow-hidden ${
          isLight
            ? 'bg-gradient-to-br from-white via-amber-50/40 to-white border-amber-200'
            : 'bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/30 border-amber-500/20 shadow-lg'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                Reconocimiento por Foto IA
              </span>
            </div>
            <p
              className={`text-xs font-semibold leading-relaxed ${
                isLight ? 'text-slate-800' : 'text-neutral-300'
              }`}
            >
              ¿Un cliente te muestra una foto de un perfume en su teléfono?
            </p>
            <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
              Toma una captura y la IA identificará el perfume, sus notas y su dupe árabe.
            </p>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzingPhoto}
            className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black rounded-2xl shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center shrink-0"
            aria-label="Tomar foto del perfume"
          >
            <Camera className={`w-5 h-5 ${isAnalyzingPhoto ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelected}
          className="hidden"
        />

        {/* Loading Spinner during Analysis */}
        {isAnalyzingPhoto && (
          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 text-xs text-amber-600">
            <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Gemini Vision analizando la botella...</span>
          </div>
        )}

        {/* AI Error Alert */}
        {aiError && (
          <div className="mt-3 pt-3 border-t border-slate-200 flex items-start gap-2 text-xs text-rose-600">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{aiError}</span>
          </div>
        )}

        {/* AI Identified Result Banner */}
        {aiResult && (
          <div
            className={`mt-3 pt-3 border-t flex items-center justify-between gap-3 p-2.5 rounded-xl border ${
              isLight
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-neutral-950/80 border-emerald-500/30'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                  Identificado con Éxito
                </span>
                <p className="text-xs font-bold text-slate-900 truncate">{aiResult.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{aiResult.brand}</p>
              </div>
            </div>

            <button
              onClick={() => onSelectPerfume(aiResult)}
              className="px-2.5 py-1 bg-amber-500 text-white font-bold text-[11px] rounded-lg shadow shrink-0 flex items-center gap-1"
            >
              <span>Ver</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
        {/* Gender Chips */}
        <button
          onClick={() => setSelectedGender(selectedGender === 'Hombre' ? 'all' : 'Hombre')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all shadow-xs ${
            selectedGender === 'Hombre'
              ? 'bg-blue-600 text-white'
              : isLight
              ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
          }`}
        >
          Hombre
        </button>

        <button
          onClick={() => setSelectedGender(selectedGender === 'Mujer' ? 'all' : 'Mujer')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all shadow-xs ${
            selectedGender === 'Mujer'
              ? 'bg-rose-600 text-white'
              : isLight
              ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
          }`}
        >
          Mujer
        </button>

        <button
          onClick={() => setSelectedGender(selectedGender === 'Unisex' ? 'all' : 'Unisex')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all shadow-xs ${
            selectedGender === 'Unisex'
              ? 'bg-purple-600 text-white'
              : isLight
              ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
          }`}
        >
          Unisex
        </button>

        {/* In Stock toggle */}
        <button
          onClick={() => setOnlyInStock(!onlyInStock)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1 transition-all shadow-xs ${
            onlyInStock
              ? 'bg-emerald-600 text-white'
              : isLight
              ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
          }`}
        >
          <Package className="w-3 h-3" />
          En Stock
        </button>

        {/* Dupe toggle */}
        <button
          onClick={() => setOnlyDupes(!onlyDupes)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1 transition-all shadow-xs ${
            onlyDupes
              ? 'bg-purple-600 text-white'
              : isLight
              ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          Con Dupe
        </button>
      </div>

      {/* Quick Search Tags (when no query entered) */}
      {!searchTerm && (
        <div className="mb-4">
          <p
            className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${
              isLight ? 'text-slate-500' : 'text-neutral-400'
            }`}
          >
            💡 Inspiraciones más consultadas por clientes:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickPills.map((pill) => (
              <button
                key={pill}
                onClick={() => setSearchTerm(pill)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs border ${
                  isLight
                    ? 'bg-white hover:bg-amber-50 border-slate-200 text-slate-800 hover:border-amber-400 hover:text-amber-800'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-amber-300/90'
                }`}
              >
                <span>✨</span>
                <span>{pill}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span
          className={`text-xs font-medium ${
            isLight ? 'text-slate-500' : 'text-neutral-400'
          }`}
        >
          {filteredPerfumes.length} {filteredPerfumes.length === 1 ? 'perfume en inventario físico' : 'perfumes en inventario físico'}
        </span>
        {(searchTerm || selectedGender !== 'all' || onlyInStock || onlyDupes) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedGender('all');
              setOnlyInStock(false);
              setOnlyDupes(false);
              setDupeRadarResult(null);
            }}
            className={`text-[11px] font-bold hover:underline ${
              isLight ? 'text-amber-700' : 'text-amber-400'
            }`}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Responsive Luxury Grid */}
      {filteredPerfumes.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredPerfumes.map((perfume) => (
            <PerfumeCard
              key={perfume.id}
              perfume={perfume}
              onSelect={onSelectPerfume}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favorites.includes(perfume.id)}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <Package
            className={`w-10 h-10 mx-auto mb-2 ${
              isLight ? 'text-slate-300' : 'text-neutral-600'
            }`}
          />
          <h4
            className={`text-sm font-bold ${
              isLight ? 'text-slate-800' : 'text-neutral-300'
            }`}
          >
            No hay perfumes físicos con ese filtro
          </h4>
          <p
            className={`text-xs mt-1 max-w-xs mx-auto ${
              isLight ? 'text-slate-500' : 'text-neutral-500'
            }`}
          >
            {dupeRadarResult
              ? 'Pero arriba tienes los clones identificados para importar o pedir a futuro.'
              : 'Prueba buscando por otra palabra clave o quitando los filtros.'}
          </p>
        </div>
      )}
    </div>
  );
};
