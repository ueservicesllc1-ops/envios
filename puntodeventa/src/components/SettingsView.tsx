'use client';

import React, { useState, useEffect } from 'react';
import { EmailConfigStatus } from '../types/pos';
import { posApi } from '../services/posApi';
import {
  ArrowLeft,
  Settings,
  Moon,
  Sun,
  Type,
  Mail,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
} from 'lucide-react';

interface SettingsViewProps {
  isDarkMode: boolean;
  onToggleTheme: (dark: boolean) => void;
  fontScale: number;
  onSetFontScale: (scale: number) => void;
  onBackToPos: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isDarkMode,
  onToggleTheme,
  fontScale,
  onSetFontScale,
  onBackToPos,
}) => {
  const [emailStatus, setEmailStatus] = useState<EmailConfigStatus | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(true);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadStatus = async () => {
    setLoadingEmail(true);
    try {
      const res = await posApi.getEmailStatus();
      setEmailStatus(res);
    } catch (err) {
      console.error('Error cargando estado de email:', err);
    } finally {
      setLoadingEmail(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailInput.trim()) return;

    setTestingEmail(true);
    setTestResult(null);
    try {
      const res = await posApi.testSendEmail(testEmailInput.trim());
      setTestResult({
        ok: true,
        msg: `Correo de prueba enviado con éxito a ${testEmailInput.trim()}`,
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        msg: err.message || 'Error al enviar correo de prueba',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="flex-1 bg-[#0F1115] text-white p-4 sm:p-6 flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#282D37] mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToPos}
            className="p-2.5 rounded-2xl bg-[#181B20] hover:bg-[#22262E] border border-slate-700 text-slate-300 hover:text-white transition"
            title="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Ajustes del Sistema
            </h2>
            <p className="text-xs text-slate-400">
              Personalización de tema, tamaño de texto y configuración de correos
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 max-w-4xl pr-1">
        {/* 1. Theme Setting */}
        <div className="p-5 rounded-3xl bg-[#181B20] border border-[#282D37]">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Moon size={16} className="text-amber-400" />
            Tema Visual de la Aplicación
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Elige el modo de visualización optimizado para la iluminación de la tienda o el iPad.
          </p>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              onClick={() => onToggleTheme(true)}
              className={`p-4 rounded-2xl border flex items-center gap-3 transition ${
                isDarkMode
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                  : 'bg-[#22262E] border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400">
                <Moon size={18} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">Modo Oscuro</p>
                <p className="text-[10px] text-slate-400">Lujo Carbón & Oro</p>
              </div>
            </button>

            <button
              onClick={() => onToggleTheme(false)}
              className={`p-4 rounded-2xl border flex items-center gap-3 transition ${
                !isDarkMode
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                  : 'bg-[#22262E] border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Sun size={18} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">Modo Claro</p>
                <p className="text-[10px] text-slate-400">Marfil Cálido & Oro</p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Font Scale Setting */}
        <div className="p-5 rounded-3xl bg-[#181B20] border border-[#282D37]">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Type size={16} className="text-amber-400" />
            Tamaño de Tipografía (Legibilidad en Mostrador)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Ajusta el tamaño del texto para leer los precios y tickets con total comodidad.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              { scale: 1.0, label: 'Normal (100%)' },
              { scale: 1.15, label: 'Grande (115%)' },
              { scale: 1.3, label: 'Extra (130%)' },
            ].map((item) => (
              <button
                key={item.scale}
                onClick={() => onSetFontScale(item.scale)}
                className={`py-3 px-2 rounded-2xl border text-xs font-bold transition text-center ${
                  Math.abs(fontScale - item.scale) < 0.05
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                    : 'bg-[#22262E] border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Email Comprobantes Config & Test */}
        <div className="p-5 rounded-3xl bg-[#181B20] border border-[#282D37]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mail size={16} className="text-amber-400" />
              Servicio de Envío de Recibos por Correo (Gmail)
            </h3>
            {emailStatus?.configured ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Configurado
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/40">
                Pendiente
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Permite enviar automáticamente los comprobantes digitales oficiales a los clientes tras cobrar.
          </p>

          {emailStatus?.user && (
            <div className="p-3 bg-[#22262E] rounded-xl border border-slate-700 text-xs text-slate-300 mb-4">
              Cuenta emisora activa:{' '}
              <span className="font-bold text-amber-400">{emailStatus.user}</span>
            </div>
          )}

          {/* Test Email Form */}
          <form onSubmit={handleTestEmail} className="space-y-3 max-w-md">
            <label className="text-xs font-semibold text-slate-400 block">
              Probar envío con una dirección de correo:
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
                placeholder="tu-correo@ejemplo.com"
                className="flex-1 h-11 px-3.5 rounded-xl bg-[#22262E] border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={testingEmail}
                className="px-4 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {testingEmail ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                <span>Enviar Prueba</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.ok
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-red-950/40 border-red-800 text-red-300'
                }`}
              >
                {testResult.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{testResult.msg}</span>
              </div>
            )}
          </form>
        </div>

        {/* 4. Server & POS Info */}
        <div className="p-5 rounded-3xl bg-[#181B20] border border-[#282D37]">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Server size={16} className="text-amber-400" />
            Información del Punto de Venta
          </h3>
          <div className="space-y-1.5 text-xs text-slate-400">
            <p>
              Versión PWA:{' '}
              <span className="text-white font-mono font-bold">2.4.0 iPad Pro</span>
            </p>
            <p>
              Servidor backend transaccional:{' '}
              <span className="text-emerald-400 font-mono font-bold">
                Conectado (Puerto 5000 /api/pos)
              </span>
            </p>
            <p>
              Base de Datos:{' '}
              <span className="text-white font-mono">Google Cloud Firestore (envios-aaf94)</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
