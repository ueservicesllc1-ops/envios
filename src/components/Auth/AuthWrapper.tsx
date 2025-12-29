import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import SellerDashboard from '../../pages/SellerDashboard';
import AdminSellerMode from '../../pages/AdminSellerMode';
import { LogOut, User as UserIcon, Shield, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { sellerService } from '../../services/sellerService';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'admin' | 'seller'>('admin');
  const [isSeller, setIsSeller] = useState(false);

  const isAdmin = user?.email === 'ueservicesllc1@gmail.com';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (!user) {
        setLoading(false);
        navigate('/login');
        return;
      }

      // Verificar si es vendedor real
      if (user.email && user.email !== 'ueservicesllc1@gmail.com') {
        try {
          const sellers = await sellerService.getAll();
          const sellerExists = sellers.some(seller => seller.email === user.email);
          setIsSeller(sellerExists);
        } catch (error) {
          console.error('Error verificando vendedor:', error);
          setIsSeller(false);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // La redirección se maneja en el useEffect
  }

  // Si es vendedor real, mostrar panel del vendedor
  if (isSeller && !isAdmin) {
    return <SellerDashboard />;
  }

  // Si es administrador, permitir cambio de modo
  if (isAdmin) {
    // Si está en modo vendedor, mostrar panel de simulación
    if (viewMode === 'seller') {
      return <AdminSellerMode />;
    }
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header con información del usuario */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="mx-auto px-4 sm:px-6 lg:px-8" style={{ width: '95vw' }}>
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  Envíos Ecuador - Sistema de Gestión ({viewMode !== 'admin' ? 'Vendedor' : 'Administrador'})
                </h1>
              </div>

              <div className="flex items-center space-x-4">
                {/* Botones de cambio de modo */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('admin')}
                    className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${viewMode === 'admin'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    title="Modo Administrador"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Modo Admin</span>
                  </button>

                  <button
                    onClick={() => setViewMode('seller')}
                    className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${viewMode !== 'admin'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    title="Modo Vendedor"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Modo Vendedor</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Usuario'}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <UserIcon className="h-4 w-4 text-primary-600" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">
                      {user.displayName || 'Administrador'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ width: '95vw' }}>
          {children}
        </div>
      </div>
    );
  }

  // Si no es ni admin ni vendedor, no renderizar nada (el usuario ya está en la ruta pública)
  return null;
};

export default AuthWrapper;
