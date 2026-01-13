import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userPreferencesService';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth(); // Obtener usuario actual

  // Sincronizar usuario activo (Admin o cualquier otro) con la base de datos
  // Esto asegura que el admin aparezca en la lista de usuarios
  React.useEffect(() => {
    if (user) {
      userService.syncUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
    }
  }, [user]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Separación de 20px solo en desktop */}
      <div className="hidden lg:block" style={{ width: '20px', flexShrink: 0 }}></div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={toggleSidebar} />

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 flex flex-col">
          <div className="w-full py-3 px-2 sm:py-6 sm:px-4 lg:px-6 flex-grow">
            {children || <Outlet />}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
};

export default Layout;
