'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Send,
  Mail,
  Sparkles,
  Tag,
  Shuffle,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Store,
  Eye,
  Check,
  Package,
} from 'lucide-react';
import { posApi } from '../services/posApi';

export interface BroadcastProduct {
  id?: string;
  name: string;
  brand: string;
  price: number;
  imageUrl?: string;
  stockLocal?: number;
}

export interface ClientRecipient {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface BroadcastPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName?: string;
}

type CampaignTab = 'new_arrivals' | 'custom_promo' | 'random_selection';

export const BroadcastPromoModal: React.FC<BroadcastPromoModalProps> = ({
  isOpen,
  onClose,
  staffName = 'Asesor Falconi',
}) => {
  const [activeTab, setActiveTab] = useState<CampaignTab>('new_arrivals');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number } | null>(null);

  // Datos obtenidos del servidor
  const [recipients, setRecipients] = useState<ClientRecipient[]>([]);
  const [availableProducts, setAvailableProducts] = useState<BroadcastProduct[]>([]);

  // Campos del formulario
  const [subject, setSubject] = useState('');
  const [headline, setHeadline] = useState('');
  const [messageText, setMessageText] = useState('');
  const [discountBadge, setDiscountBadge] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showRecipientList, setShowRecipientList] = useState(false);

  // Cargar clientes con email y perfumes del local
  const fetchData = async () => {
    setLoading(true);
    setResultMessage(null);
    try {
      const data = await posApi.getBroadcastRecipients();
      if (data.success) {
        setRecipients(data.recipients || []);
        const prods: BroadcastProduct[] = (data.recentLocalProducts || []).map((p: any) => ({
          id: p.id,
          name: p.name || 'Perfume',
          brand: p.brand || 'Falconi Parfums',
          price: Number(p.price) || 0,
          imageUrl: p.imageUrl || '',
          stockLocal: p.stockLocal || 0,
        }));
        setAvailableProducts(prods);

        // Auto-seleccionar según la pestaña activa
        setupTabDefaults(activeTab, prods);
      } else {
        setResultMessage({ type: 'error', text: data.error || 'Error al cargar clientes' });
      }
    } catch (e: any) {
      setResultMessage({ type: 'error', text: 'No se pudo conectar con el servidor: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Configurar textos y perfumes predeterminados según la pestaña
  const setupTabDefaults = (tab: CampaignTab, prodsList: BroadcastProduct[]) => {
    setResultMessage(null);
    if (tab === 'new_arrivals') {
      setSubject('✨ ¡Nuevas Fragancias en Falconi Parfums! Recién llegadas a Tienda');
      setHeadline('¡Novedades Exclusivas en Alta Perfumería!');
      setMessageText(
        'Nos complace informarte que hemos recibido nuevas fragancias originales directamente en nuestra tienda física. ¡Ven a probarlas antes de que se agoten!'
      );
      setDiscountBadge('RECIÉN LLEGADOS A TIENDA');
      // Seleccionar los primeros 4 o 6 productos con stock
      const initial = prodsList.slice(0, 4).map((p) => p.id || '');
      setSelectedProductIds(initial.filter(Boolean));
    } else if (tab === 'custom_promo') {
      setSubject('🔥 Promoción Especial de la Semana en Falconi Parfums');
      setHeadline('¡Esta semana 20% de Descuento Especial!');
      setMessageText(
        'Aprovecha esta semana un 20% de descuento en perfumes seleccionados en nuestro local. Presenta este correo a tu asesor para activar tu beneficio.'
      );
      setDiscountBadge('20% DE DESCUENTO');
      const initial = prodsList.slice(0, 4).map((p) => p.id || '');
      setSelectedProductIds(initial.filter(Boolean));
    } else if (tab === 'random_selection') {
      setSubject('💎 Fragancias Recomendadas de la Semana - Falconi Parfums');
      setHeadline('Nuestra Selección Olfativa para Ti');
      setMessageText(
        'Te presentamos fragancias selectas disponibles hoy en nuestra tienda. Perfectas para un regalo especial o para tu firma personal.'
      );
      setDiscountBadge('SELECCIÓN EXCLUSIVA');
      // Elegir 4 aleatorios
      pickRandomProducts(prodsList);
    }
  };

  const handleTabChange = (tab: CampaignTab) => {
    setActiveTab(tab);
    setupTabDefaults(tab, availableProducts);
  };

  // Barajar / elegir perfumes aleatorios
  const pickRandomProducts = (prods: BroadcastProduct[] = availableProducts) => {
    if (prods.length === 0) return;
    const shuffled = [...prods].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, Math.min(4, shuffled.length)).map((p) => p.id || '');
    setSelectedProductIds(picked.filter(Boolean));
  };

  // Productos actualmente seleccionados para el email
  const selectedProducts = useMemo(() => {
    return availableProducts.filter((p) => p.id && selectedProductIds.includes(p.id));
  }, [availableProducts, selectedProductIds]);

  const toggleProduct = (id: string) => {
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter((x) => x !== id));
    } else {
      if (selectedProductIds.length >= 6) {
        alert('Puedes incluir un máximo de 6 perfumes destacados en el correo para óptima visualización.');
        return;
      }
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  // Enviar campaña
  const handleSendBroadcast = async () => {
    if (recipients.length === 0) {
      alert('No hay clientes registrados con correo electrónico.');
      return;
    }
    if (!subject.trim()) {
      alert('Por favor indica un asunto para el correo.');
      return;
    }
    if (!headline.trim()) {
      alert('Por favor indica un titular.');
      return;
    }

    const confirmMsg = `¿Confirmas enviar esta campaña por correo a ${recipients.length} clientes registrados?\n\nAsunto: "${subject}"`;
    if (!window.confirm(confirmMsg)) return;

    setSending(true);
    setResultMessage(null);
    setSendProgress({ current: 0, total: recipients.length });

    try {
      const data = await posApi.sendBroadcast({
        campaignType: activeTab,
        subject: subject.trim(),
        headline: headline.trim(),
        messageText: messageText.trim(),
        discountBadge: discountBadge.trim() || undefined,
        products: selectedProducts,
      });

      if (data.success) {
        setResultMessage({
          type: 'success',
          text: `¡Campaña enviada con éxito! Se enviaron ${data.sentCount} correos${
            data.failedCount > 0 ? ` (${data.failedCount} fallidos)` : ''
          }.`,
        });
      } else {
        setResultMessage({ type: 'error', text: data.error || 'Error al enviar la campaña' });
      }
    } catch (e: any) {
      setResultMessage({ type: 'error', text: 'Error de conexión: ' + e.message });
    } finally {
      setSending(false);
      setSendProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-[#181B20] border border-[#2D333F] rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-[#282D37] flex items-center justify-between bg-[#1D2128]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-md shadow-amber-500/20">
              <Mail size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Difusión Masiva & Campañas
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  FALCONI PARFUMS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Envía promociones y avisos de nuevos perfumes a tus clientes registrados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Badge de destinatarios */}
            <button
              onClick={() => setShowRecipientList(!showRecipientList)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#252A34] hover:bg-[#2e3442] border border-slate-700 text-xs font-semibold text-slate-300 transition"
              title="Ver lista de clientes con correo"
            >
              <Users size={14} className="text-amber-400" />
              <span>
                {recipients.length} {recipients.length === 1 ? 'cliente' : 'clientes'}
              </span>
            </button>

            <button
              onClick={onClose}
              disabled={sending}
              className="p-2 rounded-xl bg-[#252A34] hover:bg-[#323946] text-slate-400 hover:text-white transition disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {resultMessage && (
          <div
            className={`px-4 py-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b ${
              resultMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300'
                : 'bg-rose-950/80 border-rose-600/50 text-rose-300'
            }`}
          >
            {resultMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{resultMessage.text}</span>
          </div>
        )}

        {/* LISTA DESPLEGABLE DE DESTINATARIOS */}
        {showRecipientList && (
          <div className="p-4 bg-[#14171C] border-b border-[#282D37] max-h-40 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">
                Clientes registrados con correo ({recipients.length}):
              </span>
              <button
                onClick={() => setShowRecipientList(false)}
                className="text-xs text-amber-400 hover:underline"
              >
                Cerrar lista
              </button>
            </div>
            {recipients.length === 0 ? (
              <p className="text-xs text-slate-500">
                No hay clientes con correo registrado en el sistema. Puedes agregar el correo al registrar un cliente en el POS.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {recipients.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 rounded-lg bg-[#1E222A] border border-slate-700/60 text-xs flex flex-col"
                  >
                    <span className="font-bold text-white truncate">{c.name}</span>
                    <span className="text-slate-400 text-[11px] truncate">{c.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SELECTOR DE TIPO DE CAMPAÑA */}
        <div className="px-5 pt-3 pb-2 border-b border-[#282D37] flex flex-wrap gap-2 bg-[#1A1D24]">
          <button
            onClick={() => handleTabChange('new_arrivals')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'new_arrivals'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-[#22262E] text-slate-300 hover:bg-[#2a303a]'
            }`}
          >
            <Store size={15} />
            <span>1. Nuevos Perfumes en Tienda</span>
            <span className="text-[10px] opacity-75 font-normal hidden md:inline">
              (Mercadería recién recibida)
            </span>
          </button>

          <button
            onClick={() => handleTabChange('custom_promo')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'custom_promo'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-[#22262E] text-slate-300 hover:bg-[#2a303a]'
            }`}
          >
            <Tag size={15} />
            <span>2. Promoción / Descuento Libre</span>
            <span className="text-[10px] opacity-75 font-normal hidden md:inline">
              (Ej: 20% OFF de la semana)
            </span>
          </button>

          <button
            onClick={() => handleTabChange('random_selection')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'random_selection'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-[#22262E] text-slate-300 hover:bg-[#2a303a]'
            }`}
          >
            <Shuffle size={15} />
            <span>3. Selección Aleatoria / Destacados</span>
          </button>
        </div>

        {/* MODAL BODY (DOS COLUMNAS: CONFIGURACIÓN A LA IZQUIERDA, PREVISUALIZACIÓN A LA DERECHA) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-5">
          {/* COLUMNA IZQUIERDA: CONFIGURADOR (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Banner explicativo del tab */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                {activeTab === 'new_arrivals' && (
                  <span>
                    <strong>Ideal tras recibir mercadería:</strong> Cuando el admin o asesor recibe perfumes de Bodega Ecuador a Local, da clic aquí para notificar automáticamente a todos los clientes sobre los últimos perfumes añadidos a la tienda.
                  </span>
                )}
                {activeTab === 'custom_promo' && (
                  <span>
                    <strong>Promociones Especiales:</strong> Escribe tu propia promoción (ej: 20% de descuento esta semana) o cualquier oferta de temporada. Puedes cambiar el badge y el mensaje a tu gusto.
                  </span>
                )}
                {activeTab === 'random_selection' && (
                  <span>
                    <strong>Sugerencias Semanales:</strong> Elige perfumes aleatorios con stock en tu tienda para inspirar compras espontáneas. Usa el botón &quot;Barajar&quot; para cambiar la selección.
                  </span>
                )}
              </div>
            </div>

            {/* FORMULARIO */}
            <div className="flex flex-col gap-3">
              {/* Badge de promoción o llamada de atención */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Distintivo o Etiqueta Superior (Badge)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountBadge}
                    onChange={(e) => setDiscountBadge(e.target.value)}
                    placeholder="Ej: 20% DE DESCUENTO o RECIÉN LLEGADOS"
                    className="flex-1 h-9 px-3 rounded-xl bg-[#22262E] border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 font-bold"
                  />
                  {activeTab === 'custom_promo' && (
                    <div className="flex gap-1">
                      {['10% OFF', '15% OFF', '20% OFF', '2x1'].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDiscountBadge(pct)}
                          className="px-2 py-1 rounded-lg bg-[#2a303a] hover:bg-amber-500 hover:text-black text-[11px] font-bold text-slate-300 transition"
                        >
                          {pct}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Asunto del Correo */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Asunto del Correo Electrónico
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Asunto llamativo..."
                  className="w-full h-9 px-3 rounded-xl bg-[#22262E] border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Titular Principal */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Titular Principal del Correo
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Titular grande dentro del correo..."
                  className="w-full h-9 px-3 rounded-xl bg-[#22262E] border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 font-semibold"
                />
              </div>

              {/* Mensaje / Descripción */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mensaje Personalizado
                </label>
                <textarea
                  rows={3}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escribe la promoción o el saludo..."
                  className="w-full p-2.5 rounded-xl bg-[#22262E] border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
            </div>

            {/* SELECCIÓN DE PERFUMES DESTACADOS */}
            <div className="border-t border-[#282D37] pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Package size={15} className="text-amber-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Perfumes incluidos en el correo ({selectedProductIds.length} seleccionados):
                  </span>
                </div>
                {activeTab === 'random_selection' && (
                  <button
                    type="button"
                    onClick={() => pickRandomProducts()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition"
                  >
                    <Shuffle size={12} />
                    <span>Barajar otros 4</span>
                  </button>
                )}
              </div>

              {/* Grid de perfumes disponibles en tienda */}
              {loading ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <RefreshCw className="animate-spin inline mr-2" size={14} />
                  Cargando perfumes en tienda local...
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#22262E] text-center text-xs text-slate-400">
                  No hay perfumes con stock en Tienda Local en este momento.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 bg-[#15171D] rounded-xl border border-slate-800">
                  {availableProducts.map((p) => {
                    const isSelected = p.id ? selectedProductIds.includes(p.id) : false;
                    return (
                      <div
                        key={p.id}
                        onClick={() => p.id && toggleProduct(p.id)}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition select-none flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/60 shadow-sm'
                            : 'bg-[#1E222A] border-slate-700/60 hover:border-slate-600 opacity-70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider truncate">
                            {p.brand}
                          </span>
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                              isSelected ? 'bg-amber-400 text-black font-black' : 'border border-slate-600'
                            }`}
                          >
                            {isSelected && <Check size={10} />}
                          </div>
                        </div>

                        <div className="text-xs font-bold text-white line-clamp-1 leading-tight mb-1">
                          {p.name}
                        </div>

                        <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-slate-700/40">
                          <span className="font-extrabold text-amber-300">${p.price.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-400">
                            Stock: <strong>{p.stockLocal}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: PREVIEW EN VIVO DEL CORREO (5 COLS) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Eye size={14} className="text-amber-400" />
                Previsualización en tiempo real
              </span>
              <span className="text-[11px] text-slate-500">Formato Luxury Falconi</span>
            </div>

            {/* MARCO DEL CORREO */}
            <div className="flex-1 bg-white rounded-2xl overflow-hidden border border-slate-300 shadow-xl text-slate-900 flex flex-col">
              {/* Header Luxury Oficial */}
              <div className="bg-[#141518] border-b-2 border-[#b38a19] p-4 text-center">
                <div className="w-10 h-10 rounded-full border border-amber-500/40 bg-black/60 mx-auto mb-1.5 flex items-center justify-center">
                  <span className="text-amber-400 font-serif font-black text-base">F</span>
                </div>
                <h3 className="text-[#dfbd5d] font-serif font-extrabold tracking-widest text-sm uppercase m-0">
                  Falconi Parfums
                </h3>
                <p className="text-[#94a3b8] text-[9px] uppercase tracking-wider mt-0.5">
                  Alta Perfumería Exclusiva
                </p>
              </div>

              {/* Contenido Hero */}
              <div className="p-4 text-center flex-1 overflow-y-auto">
                {discountBadge && (
                  <div className="inline-block bg-amber-100 border border-amber-400 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                    ✨ {discountBadge}
                  </div>
                )}

                <h4 className="text-slate-900 font-black text-sm leading-tight mb-2">
                  {headline || 'Titular de la Campaña'}
                </h4>

                <p className="text-slate-600 text-xs leading-relaxed mb-3">
                  Estimado(a) <strong>Juan Pérez</strong>: {messageText || 'Mensaje de la promoción...'}
                </p>

                {/* Grid 2 Columnas de Perfumes en el Correo */}
                {selectedProducts.length > 0 ? (
                  <div className="mt-3">
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 mb-2">
                      {activeTab === 'new_arrivals' ? '✨ Recién Llegados a Nuestra Tienda' : '💎 Fragancias Seleccionadas'}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-left">
                      {selectedProducts.slice(0, 4).map((p) => (
                        <div
                          key={p.id}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between text-center"
                        >
                          <div className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">
                            {p.brand}
                          </div>
                          <div className="text-[11px] font-bold text-slate-900 line-clamp-2 my-1 leading-snug">
                            {p.name}
                          </div>
                          <div className="text-xs font-black text-amber-900">${p.price.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-dashed border-amber-300 text-[11px] text-amber-800">
                    Selecciona al menos un perfume de la lista para mostrarlo aquí.
                  </div>
                )}

                {/* Invitación a la tienda y WhatsApp */}
                <div className="mt-4 pt-3 border-t border-slate-200 text-center">
                  <p className="text-[11px] font-bold text-slate-800 mb-1">
                    📍 Visítanos en nuestra Tienda Física
                  </p>
                  <p className="text-[10px] text-slate-500 mb-2">
                    ¡Ven a probar estas fragancias exclusivas en persona!
                  </p>
                  <div className="inline-block bg-[#25D366] text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm">
                    Contactar por WhatsApp
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-[#141518] p-2 text-center text-[8px] text-slate-400">
                FALCONI PARFUMS &bull; Garantía de originalidad
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER CON BOTÓN DE ENVIAR */}
        <div className="px-5 py-3 border-t border-[#282D37] flex items-center justify-between bg-[#1D2128]">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>
              Se enviará desde: <strong className="text-white">ueservicesllc1@gmail.com</strong>
            </span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="hidden sm:inline">
              Firma: <strong className="text-amber-400">{staffName}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 rounded-xl bg-[#252A34] hover:bg-[#323946] text-slate-300 text-xs font-bold transition disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              onClick={handleSendBroadcast}
              disabled={sending || recipients.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {sending ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Enviando difusión ({recipients.length} clientes)...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>
                    Enviar Difusión a Todos ({recipients.length} {recipients.length === 1 ? 'Cliente' : 'Clientes'})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
