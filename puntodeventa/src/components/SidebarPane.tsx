'use client';

import React from 'react';
import {
  Home,
  Package,
  Warehouse,
  Receipt,
  BarChart3,
  Users,
  ArrowDownToLine,
  Settings,
  Lock,
  LogOut,
} from 'lucide-react';
import { Staff } from '../types/pos';

export type NavTab =
  | 'inicio'
  | 'productos'
  | 'bodegas'
  | 'ventas'
  | 'reportes'
  | 'clientes'
  | 'ingreso'
  | 'ajustes';

interface SidebarPaneProps {
  selectedNav: NavTab;
  onSelectNav: (nav: NavTab) => void;
  staff?: Staff | null;
  onLock: () => void;
  onLogout: () => void;
}

export const SidebarPane: React.FC<SidebarPaneProps> = ({
  selectedNav,
  onSelectNav,
  staff,
  onLock,
  onLogout,
}) => {
  const navItems = [
    { id: 'inicio' as NavTab, label: 'Inicio', icon: Home },
    { id: 'productos' as NavTab, label: 'Productos', icon: Package },
    { id: 'bodegas' as NavTab, label: 'Bodegas', icon: Warehouse },
    { id: 'ventas' as NavTab, label: 'Ventas', icon: Receipt },
    { id: 'reportes' as NavTab, label: 'Reportes', icon: BarChart3 },
    { id: 'clientes' as NavTab, label: 'Clientes', icon: Users },
    { id: 'ingreso' as NavTab, label: 'Ingreso', icon: ArrowDownToLine },
    { id: 'ajustes' as NavTab, label: 'Ajustes', icon: Settings },
  ];

  return (
    <aside className="pos-sidebar-pane w-20 md:w-24 lg:w-28 bg-[#0D0E11] border-r border-[#282D37] flex flex-col items-center py-4 justify-between select-none shrink-0 z-30">
      {/* Top: Falconi Logo */}
      <div className="flex flex-col items-center mb-2">
        <button
          onClick={() => onSelectNav('inicio')}
          className="relative group p-1 transition"
          title="Falconi Parfums POS"
        >
          <img
            src="/puntodeventa/logo_falconi.png"
            alt="Falconi"
            className="w-12 h-12 object-contain filter drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)] transition group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.includes('/puntodeventa/')) {
                target.src = '/logo_falconi.png';
              }
            }}
          />
        </button>
        <span className="text-[9px] font-black tracking-widest text-amber-500 uppercase mt-0.5">
          FALCONI
        </span>
      </div>

      {/* Middle: 8 Navigation Tabs */}
      <nav className="flex-1 flex flex-col items-center justify-center gap-1.5 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = selectedNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectNav(item.id)}
              className={`w-full py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 group relative ${
                isActive
                  ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/40 shadow-lg shadow-amber-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon
                size={22}
                className={`transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-amber-300'
                }`}
              />
              <span className="text-[10px] tracking-tight mt-1 truncate max-w-full">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-400 rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Staff info, Lock, Logout */}
      <div className="w-full px-2 pt-2 border-t border-[#282D37] flex flex-col items-center gap-2">
        {staff && (
          <div
            className="w-full p-1.5 rounded-xl bg-[#181B20] border border-slate-800 text-center cursor-pointer hover:border-amber-500/40 transition"
            onClick={onLock}
            title={`Asesor: ${staff.name} (${staff.role}) - Clic para bloquear`}
          >
            <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center shadow">
              {staff.name.charAt(0).toUpperCase()}
            </div>
            <p className="text-[10px] font-bold text-white truncate mt-1">
              {staff.name.split(' ')[0]}
            </p>
            <p className="text-[8px] text-amber-400/90 capitalize leading-tight">
              {staff.role}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-1 w-full">
          <button
            onClick={onLock}
            className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition"
            title="Bloquear pantalla"
          >
            <Lock size={16} />
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
