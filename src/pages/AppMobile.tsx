import React, { useState, useEffect } from 'react';
import { Package, Truck, Warehouse, ShoppingBag, MapPin, Users, Lock, ChevronRight, X, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sellerService } from '../services/sellerService';
import { Seller } from '../types';
import toast from 'react-hot-toast';
import { useAnonymousAuth } from '../hooks/useAnonymousAuth';

const AppMobile: React.FC = () => {
    const [showSplash, setShowSplash] = useState(true);
    const navigate = useNavigate();

    // Autenticación anónima para acceso a Firestore
    const { user, loading: authLoading, error: authError } = useAnonymousAuth();

    // Estados para login de vendedor
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [selectedSellerId, setSelectedSellerId] = useState('');
    const [pin, setPin] = useState('');
    const [loadingSellers, setLoadingSellers] = useState(false);

    useEffect(() => {
        // Mostrar splash screen por 2.5 segundos
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    const handleOpenLogin = async () => {
        setLoadingSellers(true);
        setShowLoginModal(true);
        try {
            const data = await sellerService.getAll();
            // Ordenar alfabéticamente
            data.sort((a, b) => a.name.localeCompare(b.name));
            setSellers(data);
        } catch (error) {
            console.error('Error loading sellers:', error);
            toast.error('Error al cargar vendedores');
        } finally {
            setLoadingSellers(false);
        }
    };

    const handleLogin = () => {
        if (!selectedSellerId) {
            toast.error('Selecciona un vendedor');
            return;
        }
        if (!pin) {
            toast.error('Ingresa tu PIN');
            return;
        }

        const selectedSeller = sellers.find(s => s.id === selectedSellerId);
        if (!selectedSeller) return;

        // Validación específica para Vilma Uchubanda
        if (selectedSeller.name.toLowerCase().includes('vilma uchubanda')) {
            if (pin === '1619') {
                toast.success(`Bienvenida, ${selectedSeller.name}`);
                setShowLoginModal(false);
                setPin('');
                navigate(`/app/vendedor/${selectedSeller.id}`);
            } else {
                toast.error('PIN incorrecto para Vilma Uchubanda');
            }
            return;
        }

        // Validación genérica para otros (por ahora aceptamos cualquier PIN de 4 dígitos o 0000)
        // En un futuro esto debería validar contra la base de datos
        if (pin.length >= 4) {
            toast.success(`Bienvenido, ${selectedSeller.name}`);
            setShowLoginModal(false);
            setPin('');
            navigate(`/app/vendedor/${selectedSeller.id}`);
        } else {
            toast.error('El PIN debe tener al menos 4 dígitos');
        }
    };

    // Splash Screen
    if (showSplash) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center z-50">
                <div className="text-center animate-fade-in">
                    <div className="mb-8 animate-bounce">
                        <img
                            src="/logo-compras-express.png"
                            alt="Compras Express"
                            className="w-48 h-48 object-contain mx-auto drop-shadow-2xl"
                        />
                    </div>
                    <h1 className="text-white text-3xl font-bold mb-2 tracking-wide">
                        Compras Express
                    </h1>
                    <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-100"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-200"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Main App Screen
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
                <div className="px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <img
                                src="/logo-compras-express.png"
                                alt="Logo"
                                className="w-12 h-12 object-contain"
                            />
                            <div>
                                <h1 className="text-xl font-bold">Compras Express</h1>
                                <p className="text-xs text-blue-100">Sistema de Gestión</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 py-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                    ¿Qué deseas gestionar?
                </h2>

                {/* Buttons Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Botón 1: En Camino */}
                    <button
                        className="bg-white rounded-2xl shadow-lg p-6 active:scale-95 transform transition-all duration-150 hover:shadow-xl border-2 border-transparent hover:border-orange-400"
                        onClick={() => navigate('/app/en-camino')}
                    >
                        <div className="flex flex-col items-center space-y-3">
                            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-md">
                                <Truck className="w-8 h-8 text-white" />
                            </div>
                            <span className="text-gray-800 font-semibold text-center">
                                En Camino
                            </span>
                            <span className="text-xs text-gray-500 text-center">
                                Envíos en tránsito
                            </span>
                        </div>
                    </button>

                    {/* Botón 2: Bodega USA */}
                    <button
                        className="bg-white rounded-2xl shadow-lg p-6 active:scale-95 transform transition-all duration-150 hover:shadow-xl border-2 border-transparent hover:border-blue-400"
                        onClick={() => navigate('/app/bodega-usa')}
                    >
                        <div className="flex flex-col items-center space-y-3">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                                <Warehouse className="w-8 h-8 text-white" />
                            </div>
                            <span className="text-gray-800 font-semibold text-center">
                                Bodega USA
                            </span>
                            <span className="text-xs text-gray-500 text-center">
                                Inventario EE.UU.
                            </span>
                        </div>
                    </button>

                    {/* Botón 3: Bodega Ecuador */}
                    <button
                        className="bg-white rounded-2xl shadow-lg p-6 active:scale-95 transform transition-all duration-150 hover:shadow-xl border-2 border-transparent hover:border-green-400"
                        onClick={() => navigate('/app/bodega-ecuador')}
                    >
                        <div className="flex flex-col items-center space-y-3">
                            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
                                <MapPin className="w-8 h-8 text-white" />
                            </div>
                            <span className="text-gray-800 font-semibold text-center">
                                Bodega Ecuador
                            </span>
                            <span className="text-xs text-gray-500 text-center">
                                Inventario EC
                            </span>
                        </div>
                    </button>

                    {/* Botón 4: Productos */}
                    <button
                        className="bg-white rounded-2xl shadow-lg p-6 active:scale-95 transform transition-all duration-150 hover:shadow-xl border-2 border-transparent hover:border-purple-400"
                        onClick={() => navigate('/app/productos')}
                    >
                        <div className="flex flex-col items-center space-y-3">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                                <Package className="w-8 h-8 text-white" />
                            </div>
                            <span className="text-gray-800 font-semibold text-center">
                                Productos
                            </span>
                            <span className="text-xs text-gray-500 text-center">
                                Catálogo completo
                            </span>
                        </div>
                    </button>

                    {/* Botón 5: Vilma Uchubanda (NUEVO) */}
                    <button
                        className="col-span-2 bg-gradient-to-r from-pink-500 to-pink-700 rounded-2xl shadow-lg p-4 active:scale-95 transform transition-all duration-150 hover:shadow-xl flex items-center justify-between group"
                        onClick={() => navigate('/app/vilma')}
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Star className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-white font-bold text-lg">Vilma Uchubanda</h3>
                                <p className="text-pink-200 text-xs">Inventario y Cuentas</p>
                            </div>
                        </div>
                        <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                            <ChevronRight className="w-6 h-6 text-white" />
                        </div>
                    </button>

                    {/* Botón 6: Mi Dashboard */}
                    <button
                        className="col-span-2 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl shadow-lg p-4 active:scale-95 transform transition-all duration-150 hover:shadow-xl flex items-center justify-between group"
                        onClick={handleOpenLogin}
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-white font-bold text-lg">Mi Dashboard</h3>
                                <p className="text-indigo-200 text-xs">Acceso para vendedores</p>
                            </div>
                        </div>
                        <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                            <ChevronRight className="w-6 h-6 text-white" />
                        </div>
                    </button>
                </div>

                {/* Info Card Web App */}
                <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-blue-900 font-bold text-sm">¿Buscas la tienda online?</h3>
                            <p className="text-blue-700 text-xs mt-1">
                                Visita el sitio web principal para realizar pedidos y ver ofertas.
                            </p>
                            <button
                                onClick={() => navigate('/')}
                                className="mt-3 text-xs bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full"
                            >
                                Ir a la Tienda
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Login Vendedor */}
            {showLoginModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setShowLoginModal(false)}
                    ></div>

                    <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden transform transition-transform duration-300 ease-out translate-y-0">
                        {/* Modal Header */}
                        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-white font-bold text-lg flex items-center">
                                <Lock className="w-5 h-5 mr-2" />
                                Acceso Seguro
                            </h3>
                            <button
                                onClick={() => setShowLoginModal(false)}
                                className="text-white/80 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {loadingSellers ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : (
                                <>
                                    {/* Selector de Vendedor */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Selecciona tu Usuario
                                        </label>
                                        <select
                                            value={selectedSellerId}
                                            onChange={(e) => setSelectedSellerId(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3"
                                        >
                                            <option value="">-- Elige un vendedor --</option>
                                            {sellers.map(seller => (
                                                <option key={seller.id} value={seller.id}>
                                                    {seller.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Input PIN */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Ingresa tu PIN
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                maxLength={4}
                                                value={pin}
                                                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                                                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-center text-2xl tracking-[0.5em] font-bold rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3"
                                                placeholder="••••"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 text-center">
                                            El PIN predeterminado es 1619
                                        </p>
                                    </div>

                                    {/* Botón Ingresar */}
                                    <button
                                        onClick={handleLogin}
                                        disabled={!selectedSellerId || pin.length < 4}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
                                    >
                                        Ingresar al Dashboard
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppMobile;
