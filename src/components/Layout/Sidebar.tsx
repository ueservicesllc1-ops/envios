import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Package,
  Warehouse,
  FileText,
  TrendingUp,
  Users,
  Settings,
  Home,
  Calculator,
  Truck,
  CreditCard,
  ShoppingCart,
  Percent,
  Flag,
  RotateCcw,
  Sparkles,
  Receipt,
  ShoppingBag,
  Mail
} from 'lucide-react';
import clsx from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Productos', href: '/products', icon: Package },
  { name: 'Bodega', href: '/warehouse', icon: Warehouse },
  { name: 'Bodega Ecuador', href: '/warehouse-ecuador', icon: Flag },
  { name: 'Inventario', href: '/inventory', icon: TrendingUp },
  { name: 'Notas de Entrada', href: '/entry-notes', icon: FileText },
  { name: 'Notas de Salida', href: '/exit-notes', icon: FileText },
  { name: 'Notas de Pago', href: '/payment-notes', icon: CreditCard },
  { name: 'Paquetería', href: '/shipping', icon: Truck },
  { name: 'Contabilidad', href: '/accounting', icon: Calculator },
  { name: 'Facturación', href: '/billing', icon: Receipt },
  { name: 'Pedidos', href: '/orders', icon: ShoppingCart },
  { name: 'Admin Tienda', href: '/admin-store', icon: ShoppingBag },
  { name: 'Devoluciones', href: '/returns', icon: RotateCcw },
  { name: 'Perfumes', href: '/perfumes', icon: Sparkles },
  { name: 'Interes Compuesto', href: '/compound-interest', icon: Percent },
  { name: 'Vendedores', href: '/sellers', icon: Users },
  { name: 'Saldo Vendedores', href: '/seller-balances', icon: CreditCard },
  { name: 'Acceso Editor Tienda', href: '/store-editor-access', icon: ShoppingBag },
  { name: 'Test Email', href: '/test-email', icon: Mail },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )} style={{ left: '0px', margin: '0', padding: '0' }}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="ml-2 flex flex-col">
              <img src="/logo-compras-express.png" alt="Compras Express" className="h-10 object-contain" />
              <span className="text-[10px] text-gray-500 font-medium">Compra en USA y recíbelo en Ecuador</span>
            </div>
          </div>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={clsx(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon
                    className={clsx(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-600">U</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">Usuario</p>
              <p className="text-xs text-gray-500">Administrador</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;