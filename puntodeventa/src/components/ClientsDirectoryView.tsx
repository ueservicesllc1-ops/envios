'use client';

import React, { useState, useEffect } from 'react';
import { PosClient } from '../types/pos';
import { posApi } from '../services/posApi';
import {
  ArrowLeft,
  Search,
  UserPlus,
  User,
  Phone,
  Mail,
  CreditCard,
  MessageCircle,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';

interface ClientsDirectoryViewProps {
  onSelectClientForSale: (client: PosClient) => void;
  onBackToPos: () => void;
}

export const ClientsDirectoryView: React.FC<ClientsDirectoryViewProps> = ({
  onSelectClientForSale,
  onBackToPos,
}) => {
  const [clients, setClients] = useState<PosClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Client Form State
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadClients = async (q: string = '') => {
    setLoading(true);
    try {
      const list = await posApi.getClients(q);
      setClients(list);
    } catch (err) {
      console.error('Error cargando clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients(searchQuery);
  }, [searchQuery]);

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const saved = await posApi.saveClient({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        cedula: cedula.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
      });
      setShowAddModal(false);
      setNombre('');
      setApellido('');
      setCedula('');
      setTelefono('');
      setEmail('');
      loadClients();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error guardando cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-[#0F1115] text-white p-4 sm:p-6 flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-[#282D37]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToPos}
            className="p-2.5 rounded-2xl bg-[#181B20] hover:bg-[#22262E] border border-slate-700 text-slate-300 hover:text-white transition"
            title="Volver a ventas"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Directorio de Clientes
            </h2>
            <p className="text-xs text-slate-400">
              {clients.length} clientes registrados en Firestore
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadClients(searchQuery)}
            className="p-2.5 rounded-2xl bg-[#181B20] hover:bg-[#22262E] border border-slate-700 text-slate-300 hover:text-amber-400 transition"
            title="Actualizar"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-amber-500/10 transition"
          >
            <UserPlus size={16} />
            <span>+ Agregar Cliente</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar cliente por nombre, apellido, cédula, teléfono o email..."
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-[#181B20] border border-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-amber-400 transition"
        />
      </div>

      {/* Clients Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading && clients.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400">
            <RefreshCw size={24} className="animate-spin text-amber-400 mr-2" />
            Cargando clientes...
          </div>
        ) : clients.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center bg-[#181B20] rounded-3xl border border-[#282D37] p-6">
            <User size={40} className="text-slate-600 mb-2" />
            <p className="font-semibold text-slate-300">No se encontraron clientes</p>
            <p className="text-xs text-slate-500 mt-1">
              Agrega un nuevo cliente con el botón superior
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clients.map((c) => (
              <div
                key={c.id}
                className="bg-[#181B20] border border-[#282D37] hover:border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between transition group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-base truncate">
                      {c.fullName}
                    </span>
                    {c.cedula && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#22262E] text-slate-300 border border-slate-700">
                        CI: {c.cedula}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-400 mb-4">
                    {c.telefono && (
                      <p className="flex items-center gap-1.5">
                        <Phone size={13} className="text-amber-500" />
                        <span>{c.telefono}</span>
                      </p>
                    )}
                    {c.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail size={13} className="text-blue-400" />
                        <span className="truncate">{c.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  {c.telefono ? (
                    <a
                      href={`https://wa.me/${c.telefono.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-400 transition"
                      title="Enviar WhatsApp"
                    >
                      <MessageCircle size={16} />
                    </a>
                  ) : <div />}

                  <button
                    onClick={() => onSelectClientForSale(c)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>Asignar a la Venta</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#181B20] border border-[#282D37] rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-[#22262E] text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-amber-400" />
              Nuevo Cliente
            </h3>

            <form onSubmit={handleSaveClient} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Carlos"
                  className="w-full h-10 px-3 rounded-xl bg-[#22262E] border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Apellido
                </label>
                <input
                  type="text"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="Ej: Mendoza"
                  className="w-full h-10 px-3 rounded-xl bg-[#22262E] border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Cédula / RUC
                </label>
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Ej: 0912345678"
                  className="w-full h-10 px-3 rounded-xl bg-[#22262E] border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 0987654321"
                  className="w-full h-10 px-3 rounded-xl bg-[#22262E] border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej: cliente@gmail.com"
                  className="w-full h-10 px-3 rounded-xl bg-[#22262E] border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#22262E] text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cliente'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
