import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userPreferencesService';
import { updateProfile } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useCart } from '../contexts/CartContext';
import { sellerService } from '../services/sellerService';
import toast from 'react-hot-toast';
import { User, MapPin, ShoppingCart, Menu, X, Search, Package, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';
import Footer from '../components/Layout/Footer';

const UserProfile: React.FC = () => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const { cart } = useCart();
    const [isLoading, setIsLoading] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isVerifiedSeller, setIsVerifiedSeller] = useState(false);

    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        phone: '',
        identityCard: ''
    });

    useEffect(() => {
        if (user) {
            loadProfile();
            checkSellerStatus();
        }
    }, [user]);

    const checkSellerStatus = async () => {
        if (!user?.email) return;
        if (isAdmin) {
            setIsVerifiedSeller(true);
            return;
        }
        try {
            const sellers = await sellerService.getAll();
            const sellerExists = sellers.some(seller => seller.email === user.email);
            setIsVerifiedSeller(sellerExists);
        } catch (error) {
            console.error('Error verificando vendedor:', error);
            setIsVerifiedSeller(false);
        }
    };

    const loadProfile = async () => {
        if (!user) return;
        const prefs = await userService.getUserPreferences(user.uid);

        setFormData({
            displayName: user.displayName || '',
            email: user.email || '',
            phone: prefs?.profile?.phone || '',
            identityCard: prefs?.profile?.identityCard || ''
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsLoading(true);

        try {
            // 1. Auth Profile (Name)
            if (user.displayName !== formData.displayName) {
                await updateProfile(user, { displayName: formData.displayName });
            }

            // 2. User Preferences (Phone, CI)
            await userService.updateProfile(user.uid, {
                phone: formData.phone,
                identityCard: formData.identityCard
            });

            toast.success('Perfil actualizado correctamente');
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar perfil');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/');
            toast.success('Sesión cerrada');
        } catch (error) {
            console.error(error);
            toast.error('Error al cerrar sesión');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-blue-900 shadow-md">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        {/* Mobile Layout */}
                        <div className="md:hidden flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setShowMobileMenu(true)} className="text-white p-1">
                                    <Menu className="h-6 w-6" />
                                </button>
                                <div className="flex flex-col cursor-pointer" onClick={() => navigate('/')}>
                                    <img src="/logo-compras-express.png" alt="Compras Express" className="h-8 object-contain bg-white rounded px-1" />
                                    <span className="text-[9px] text-yellow-400 font-medium tracking-wide mt-1">USA - Ecuador</span>
                                </div>
                            </div>
                            <button onClick={() => navigate('/cart')} className="relative p-1 text-white">
                                <ShoppingCart className="h-6 w-6" />
                                {cart.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-blue-900 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                                        {cart.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Desktop Logo */}
                        <div className="hidden md:flex items-center gap-4">
                            <div className="flex flex-col cursor-pointer" onClick={() => navigate('/')}>
                                <div className="flex items-center gap-2">
                                    <img src="/logo-compras-express.png" alt="Compras Express" className="h-10 object-contain bg-white rounded px-2 py-1" />
                                </div>
                                <span className="text-[10px] text-yellow-400 leading-none tracking-wide mt-1">Compra en USA y recíbelo en Ecuador</span>
                            </div>
                        </div>

                        {/* SearchBar (Desktop Only) */}
                        <div className="hidden md:flex flex-1 max-w-3xl mx-4">
                            <div className="flex w-full bg-white rounded-md overflow-hidden shadow-sm h-10">
                                <input
                                    type="text"
                                    placeholder="Buscar productos..."
                                    className="flex-1 px-4 text-sm text-gray-700 focus:outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button
                                    className="px-5 text-gray-500 hover:text-blue-900"
                                    onClick={() => navigate(`/?search=${searchTerm}`)}
                                >
                                    <Search className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* User Menu (Desktop Only) */}
                        <div className="hidden md:flex items-center gap-6 text-white text-sm font-medium">
                            {user ? (
                                <div className="relative group cursor-pointer flex items-center gap-1">
                                    <div className="flex flex-col items-end leading-tight">
                                        <span className="text-[11px] font-normal opacity-90">Hola, {user.displayName?.split(' ')[0] || 'Usuario'}</span>
                                        <span className="flex items-center gap-1 font-bold">Mi cuenta <ChevronDown className="h-3 w-3" /></span>
                                    </div>
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded shadow-xl py-2 text-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                                            <p className="font-bold truncate">{user.email}</p>
                                        </div>
                                        <button onClick={() => navigate('/my-orders')} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                                            <Package className="h-4 w-4" /> Mis pedidos
                                        </button>
                                        <button onClick={() => navigate('/my-addresses')} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                                            <MapPin className="h-4 w-4" /> Mis direcciones
                                        </button>
                                        <button onClick={() => navigate('/profile')} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                                            <User className="h-4 w-4" /> Configuración
                                        </button>
                                        {(isVerifiedSeller || isAdmin) && (
                                            <button
                                                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                                                onClick={() => navigate('/dashboard')}
                                            >
                                                <LayoutDashboard className="h-4 w-4 text-yellow-600" /> Panel Vendedor
                                            </button>
                                        )}
                                        <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 flex items-center gap-2">
                                            <LogOut className="h-4 w-4" /> Cerrar sesión
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => navigate('/login')} className="flex items-center gap-2 hover:underline">
                                    <User className="h-5 w-5" /> Login
                                </button>
                            )}

                            {/* Desktop Cart Button */}
                            <button
                                className="flex items-center gap-1 relative group"
                                onClick={() => navigate('/cart')}
                            >
                                <ShoppingCart className="h-6 w-6" />
                                {cart.length > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                        {cart.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
                {/* Formulario */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-800">
                        <User className="h-5 w-5 text-blue-600" /> Datos Personales
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Nombre Completo</label>
                            <input
                                type="text"
                                value={formData.displayName}
                                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Tu nombre completo"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                readOnly
                                className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Identificación (Cédula/RUC)</label>
                                <input
                                    type="text"
                                    value={formData.identityCard}
                                    onChange={e => setFormData({ ...formData, identityCard: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Para facturación"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Teléfono</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="099..."
                                />
                            </div>
                        </div>
                        <div className="pt-4">
                            <button disabled={isLoading} className="bg-blue-900 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-blue-800 transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-70 disabled:cursor-not-allowed w-full md:w-auto">
                                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sección Direcciones */}
                <div
                    className="bg-white rounded-xl shadow-sm p-6 flex justify-between items-center group cursor-pointer hover:shadow-md transition-all border border-gray-100"
                    onClick={() => navigate('/my-addresses')}
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-50 p-4 rounded-full text-blue-600 group-hover:bg-blue-100 transition-colors">
                            <MapPin className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">Mis Direcciones</h3>
                            <p className="text-sm text-gray-500">Gestiona tus direcciones de envío y facturación</p>
                        </div>
                    </div>
                    <ChevronDown className="h-6 w-6 text-gray-400 -rotate-90 group-hover:translate-x-1 transition-transform group-hover:text-blue-600" />
                </div>
            </main>

            {/* Mobile Menu */}
            {showMobileMenu && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden" onClick={() => setShowMobileMenu(false)}>
                    <div className="bg-white w-72 h-full shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b bg-blue-900 text-white">
                            <span className="font-bold text-lg">Menú</span>
                            <button onClick={() => setShowMobileMenu(false)} className="text-white hover:text-gray-200">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {user ? (
                                <div className="mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="bg-blue-200 p-2 rounded-full"><User className="h-5 w-5 text-blue-800" /></div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{user.displayName}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[180px]">{user.email}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6">
                                    <button onClick={() => navigate('/login')} className="w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-lg shadow-sm">
                                        <User className="h-5 w-5" /> Iniciar Sesión / Registrarse
                                    </button>
                                </div>
                            )}

                            <div className="space-y-1">
                                <button onClick={() => navigate('/')} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 font-medium text-gray-700">
                                    Inicio
                                </button>
                                {user && (
                                    <>
                                        <button onClick={() => navigate('/my-orders')} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 font-medium text-gray-700">
                                            <Package className="h-5 w-5 text-gray-400" /> Mis Pedidos
                                        </button>
                                        <button onClick={() => navigate('/my-addresses')} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 font-medium text-gray-700">
                                            <MapPin className="h-5 w-5 text-gray-400" /> Mis Direcciones
                                        </button>
                                        <button onClick={() => navigate('/profile')} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 font-medium text-gray-700">
                                            <User className="h-5 w-5 text-gray-400" /> Configuración
                                        </button>
                                        {(isVerifiedSeller || isAdmin) && (
                                            <button onClick={() => navigate('/dashboard')} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 font-medium text-gray-700">
                                                <LayoutDashboard className="h-5 w-5 text-yellow-500" /> Panel Vendedor
                                            </button>
                                        )}
                                        <div className="my-2 border-t border-gray-100"></div>
                                        <button onClick={handleLogout} className="w-full text-left p-3 hover:bg-red-50 rounded-lg flex items-center gap-3 font-medium text-red-600">
                                            <LogOut className="h-5 w-5" /> Cerrar Sesión
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t text-center text-xs text-gray-400">
                            v1.0.0 &copy; 2025 Compras Express
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
};

export default UserProfile;
