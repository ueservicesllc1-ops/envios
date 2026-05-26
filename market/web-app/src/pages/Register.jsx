import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Store, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('buyer');
  const [loading, setLoading] = useState(false);
  
  const { register, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      addToast('Las contraseñas no coinciden', 'error');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name, role);
      navigate('/'); // redirigir al inicio después de loguear
    } catch (error) {
      // El error ya es manejado por los Toasts en AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center items-center bg-gray-50 p-4 pb-20">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-primary p-6 text-center text-white">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Store className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black">Crear Cuenta</h1>
          <p className="text-sm opacity-90 mt-1">Únete a Vibe Market</p>
        </div>

        {!isFirebaseConfigured && (
          <div className="bg-orange-50 p-4 border-b border-orange-100 text-orange-800 text-xs text-center">
            <strong>Modo Demo:</strong> Firebase no está configurado. El registro fallará.
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder="Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder="tu@correo.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Confirmar</label>
              <input 
                type="password" 
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 mt-2">Tipo de Cuenta</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('buyer')}
                className={`py-2 px-4 rounded-lg text-sm font-bold border transition-colors ${role === 'buyer' ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-gray-200 text-gray-500'}`}
              >
                Comprador
              </button>
              <button
                type="button"
                onClick={() => setRole('seller')}
                className={`py-2 px-4 rounded-lg text-sm font-bold border transition-colors ${role === 'seller' ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-gray-200 text-gray-500'}`}
              >
                Vendedor
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !isFirebaseConfigured}
            className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors mt-6 flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Cuenta'}
          </button>
        </form>

        <div className="p-6 border-t border-gray-50 text-center bg-gray-50/50">
          <p className="text-sm text-gray-500">
            ¿Ya tienes cuenta?
            <Link to="/login" className="ml-1 text-primary font-bold hover:underline">
              Inicia Sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
