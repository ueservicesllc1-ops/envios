import React, { useState, useEffect } from 'react';
import { Menu, Bell, Search } from 'lucide-react';
import FirebaseStatus from '../FirebaseStatus';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../firebase/config';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 w-full">
        {/* Sección izquierda - Menú y título */}
        <div className="flex items-center flex-1">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="hidden lg:block">
            <h1 className="text-2xl font-semibold text-gray-900">Sistema de Gestión</h1>
          </div>
        </div>

        {/* Sección central - Barra de búsqueda (solo desktop) */}
        <div className="hidden lg:flex flex-1 justify-center">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar productos, notas..."
              className="block w-48 pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Sección derecha - Estado, notificaciones y perfil */}
        <div className="flex items-center space-x-4 flex-1 justify-end">
          {/* Estado de Firebase */}
          <FirebaseStatus />

          {/* Notificaciones */}
          <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg">
            <Bell className="h-6 w-6" />
          </button>

          {/* Perfil del usuario */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-700">
                {user?.displayName || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500">
                {user?.email || 'usuario@ejemplo.com'}
              </p>
            </div>
            <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuario'}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <span className="text-sm font-medium text-primary-600">U</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;