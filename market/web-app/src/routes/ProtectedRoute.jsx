import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin w-8 h-8 text-primary mb-4" />
        <p className="text-gray-500 text-sm">Verificando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userProfile && userProfile.role !== requiredRole) {
    // Si se requiere un rol específico (ej. 'seller') y no lo es
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
        <p className="text-gray-600 mb-6">Necesitas ser {requiredRole} para acceder a esta página.</p>
        <Navigate to="/profile" className="text-primary font-bold">Ir a mi perfil</Navigate>
      </div>
    );
  }

  return children;
}
