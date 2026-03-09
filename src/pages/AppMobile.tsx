import React, { useState, useEffect } from 'react';
import { Truck, Warehouse, ShoppingBag, MapPin, Users, Lock, ChevronRight, X, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sellerService } from '../services/sellerService';
import { Seller } from '../types';
import toast from 'react-hot-toast';
import { useAnonymousAuth } from '../hooks/useAnonymousAuth';
import { setSellerSession, getSellerSession, clearSellerSession, SellerSession, MAIN_SELLERS } from '../utils/sellerSession';
import { usePushNotifications } from '../hooks/usePushNotifications';

const AppMobile: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAnonymousAuth();

    const [showSplash, setShowSplash] = useState(true);
    const [session, setSession] = useState<SellerSession | null>(null);

    // Activar notificaciones push si hay sesión activa
    usePushNotifications(session?.id || null);

    // PIN modal
    const [showPinModal, setShowPinModal] = useState(false);
    const [selectedSeller, setSelectedSeller] = useState<typeof MAIN_SELLERS[0] | null>(null);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);

    // Dashboard (otros vendedores)
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [selectedSellerId, setSelectedSellerId] = useState('');
    const [sellerPin, setSellerPin] = useState('');
    const [loadingSellers, setLoadingSellers] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSplash(false);
            const existing = getSellerSession();
            if (existing) {
                setSession(existing);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // Auto-validate PIN when 4 digits entered
    useEffect(() => {
        if (pin.length === 4 && selectedSeller) {
            if (pin === selectedSeller.pin) {
                const newSession: SellerSession = {
                    id: selectedSeller.id,
                    name: selectedSeller.name,
                    isAdmin: selectedSeller.isAdmin,
                };
                setSellerSession(newSession);
                setSession(newSession);
                setShowPinModal(false);
                setPin('');
                toast.success(`¡Bienvenida, ${selectedSeller.name}! 👋`);
            } else {
                setPinError(true);
                setTimeout(() => { setPin(''); setPinError(false); }, 700);
            }
        }
    }, [pin, selectedSeller]);

    const handleSellerCard = (seller: typeof MAIN_SELLERS[0]) => {
        setSelectedSeller(seller);
        setPin('');
        setPinError(false);
        setShowPinModal(true);
    };

    const handleNumpad = (digit: string) => {
        if (pin.length < 4) setPin(prev => prev + digit);
    };

    const handleLogout = () => {
        clearSellerSession();
        setSession(null);
        toast('Sesión cerrada', { icon: '👋' });
    };

    const handleOpenLogin = async () => {
        setLoadingSellers(true);
        setShowLoginModal(true);
        try {
            const data = await sellerService.getAll();
            data.sort((a, b) => a.name.localeCompare(b.name));
            setSellers(data);
        } catch {
            toast.error('Error al cargar vendedores');
        } finally {
            setLoadingSellers(false);
        }
    };

    const handleSellerLogin = () => {
        if (!selectedSellerId) { toast.error('Selecciona un vendedor'); return; }
        if (sellerPin.length < 4) { toast.error('El PIN debe tener al menos 4 dígitos'); return; }
        const s = sellers.find(sel => sel.id === selectedSellerId);
        if (!s) return;
        toast.success(`Bienvenido, ${s.name}`);
        setShowLoginModal(false);
        setSellerPin('');
        navigate(`/app/vendedor/${s.id}`);
    };

    const currentSellerInfo = MAIN_SELLERS.find(s => s.id === session?.id) || MAIN_SELLERS[0];
    const visibleSellers = session?.isAdmin
        ? MAIN_SELLERS
        : MAIN_SELLERS.filter(s => s.id === session?.id);

    // ── SPLASH ──────────────────────────────────────────────────────────────
    if (showSplash) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center z-50">
                <div className="text-center">
                    <div className="mb-8 animate-bounce">
                        <img src="/logo-compras-express.png" alt="Compras Express" className="w-40 h-40 object-contain mx-auto drop-shadow-2xl" />
                    </div>
                    <h1 className="text-white text-3xl font-bold mb-2 tracking-wide">Compras Express</h1>
                    <div className="flex items-center justify-center space-x-2 mt-4">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.15s' }}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    // ── LOGIN SCREEN (sin sesión) ────────────────────────────────────────────
    if (!session) {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                {/* Brand */}
                <div className="flex flex-col items-center pt-14 pb-6 px-6">
                    <img src="/logo-compras-express.png" alt="Compras Express" className="w-24 h-24 object-contain mb-4 drop-shadow-md" />
                    <h1 className="text-gray-900 text-2xl font-bold tracking-tight">Compras Express</h1>
                    <p className="text-gray-400 text-sm mt-1">Sistema de Gestión</p>
                </div>

                {/* Seller Cards */}
                <div className="flex-1 flex flex-col justify-center px-6 pb-12">
                    <p className="text-gray-500 text-center text-sm font-medium mb-5 uppercase tracking-widest">
                        Selecciona tu perfil
                    </p>
                    <div className="space-y-3 max-w-sm mx-auto w-full">
                        {MAIN_SELLERS.map(seller => (
                            <button
                                key={seller.id}
                                onClick={() => handleSellerCard(seller)}
                                className={`w-full bg-gradient-to-r ${seller.gradient} rounded-2xl shadow-lg p-4 flex items-center space-x-4 active:scale-95 transition-all duration-150 hover:shadow-xl`}
                            >
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl shadow-inner">
                                    {seller.avatar}
                                </div>
                                <div className="text-left flex-1">
                                    <h3 className="text-white font-bold text-base leading-tight">{seller.name}</h3>
                                    <p className={`${seller.lightText} text-xs mt-0.5`}>{seller.badge}</p>
                                </div>
                                <div className="bg-white/20 p-2 rounded-full">
                                    <Lock className="w-4 h-4 text-white" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* PIN Modal */}
                {showPinModal && selectedSeller && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowPinModal(false); setPin(''); }} />
                        <div className="relative bg-white w-full max-w-sm rounded-t-3xl shadow-2xl pb-8 overflow-hidden">
                            {/* Header stripe */}
                            <div className={`bg-gradient-to-r ${selectedSeller.gradient} px-6 py-5`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-3xl">{selectedSeller.avatar}</span>
                                        <div>
                                            <h3 className="text-white font-bold text-lg leading-tight">{selectedSeller.name}</h3>
                                            <p className={`${selectedSeller.lightText} text-xs`}>{selectedSeller.badge}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setShowPinModal(false); setPin(''); }} className="text-white/70 hover:text-white p-1">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 pt-6">
                                <p className="text-gray-600 text-sm text-center mb-5">Ingresa tu PIN de acceso</p>

                                {/* PIN Dots */}
                                <div className="flex justify-center space-x-5 mb-7">
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${pin.length > i
                                            ? pinError ? 'bg-red-500 border-red-500' : 'bg-gray-800 border-gray-800'
                                            : 'border-gray-300 bg-transparent'
                                            }`} />
                                    ))}
                                </div>

                                {/* Numpad */}
                                <div className="grid grid-cols-3 gap-3">
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                                        <button key={d} onClick={() => handleNumpad(d)}
                                            className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 text-2xl font-semibold rounded-xl py-4 transition-all active:scale-95">
                                            {d}
                                        </button>
                                    ))}
                                    <div />
                                    <button onClick={() => handleNumpad('0')}
                                        className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 text-2xl font-semibold rounded-xl py-4 transition-all active:scale-95">
                                        0
                                    </button>
                                    <button onClick={() => setPin(p => p.slice(0, -1))}
                                        className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 text-2xl rounded-xl py-4 transition-all active:scale-95 flex items-center justify-center">
                                        ⌫
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── MENU SCREEN ─────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
            {/* Header */}
            <div className={`bg-gradient-to-r ${currentSellerInfo.gradient} text-white shadow-lg transition-colors duration-500`}>
                <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <img src="/logo-compras-express.png" alt="Logo" className="w-10 h-10 object-contain" />
                        <div>
                            <h1 className="text-lg font-bold leading-tight">Compras Express</h1>
                            <p className="text-xs opacity-90">{currentSellerInfo.avatar} {session.name}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="flex items-center space-x-1.5 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl transition-colors text-sm font-medium">
                        <LogOut className="w-4 h-4" />
                        <span>Salir</span>
                    </button>
                </div>
            </div>

            <div className="px-4 py-5 space-y-6">
                {/* Sistema */}
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Sistema</p>
                    <div className="grid grid-cols-2 gap-3">
                        {session.isAdmin && (
                            <button onClick={() => navigate('/app/en-camino')} className="bg-white rounded-2xl shadow-sm p-5 active:scale-95 transition-all hover:shadow-md border border-gray-100 flex flex-col items-center space-y-2">
                                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-md"><Truck className="w-7 h-7 text-white" /></div>
                                <span className="text-gray-800 font-semibold text-sm">En Camino</span>
                                <span className="text-xs text-gray-400">Envíos en tránsito</span>
                            </button>
                        )}

                        <button onClick={() => navigate('/app/bodega-usa')} className="bg-white rounded-2xl shadow-sm p-5 active:scale-95 transition-all hover:shadow-md border border-gray-100 flex flex-col items-center space-y-2">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-md"><Warehouse className="w-7 h-7 text-white" /></div>
                            <span className="text-gray-800 font-semibold text-sm">Bodega USA</span>
                            <span className="text-xs text-gray-400">Inventario EE.UU.</span>
                        </button>
                        <button onClick={() => navigate('/app/bodega-ecuador')} className="bg-white rounded-2xl shadow-sm p-5 active:scale-95 transition-all hover:shadow-md border border-gray-100 flex flex-col items-center space-y-2">
                            <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md"><MapPin className="w-7 h-7 text-white" /></div>
                            <span className="text-gray-800 font-semibold text-sm">Bodega Ecuador</span>
                            <span className="text-xs text-gray-400">Inventario EC</span>
                        </button>
                        <button onClick={() => navigate('/cata')} className="bg-white rounded-2xl shadow-sm p-5 active:scale-95 transition-all hover:shadow-md border border-gray-100 flex flex-col items-center space-y-2">
                            <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center shadow-md"><ShoppingBag className="w-7 h-7 text-white" /></div>
                            <span className="text-gray-800 font-semibold text-sm">Catálogo</span>
                            <span className="text-xs text-gray-400">Envío por WS</span>
                        </button>
                    </div>
                </div>

                {/* Vendedoras */}
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        {session.isAdmin ? 'Vendedoras' : 'Mi Perfil'}
                    </p>
                    <div className="space-y-3">
                        {visibleSellers.map(seller => (
                            <button key={seller.id} onClick={() => navigate(seller.route)}
                                className={`w-full bg-gradient-to-r ${seller.gradient} rounded-2xl shadow-sm p-4 flex items-center justify-between active:scale-95 transition-all`}>
                                <div className="flex items-center space-x-3">
                                    <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center text-xl">{seller.avatar}</div>
                                    <div className="text-left">
                                        <h3 className="text-white font-bold">{seller.name}</h3>
                                        <p className={`${seller.lightText} text-xs`}>Inventario y Cuentas</p>
                                    </div>
                                </div>
                                <div className="bg-white/20 p-2 rounded-full"><ChevronRight className="w-5 h-5 text-white" /></div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Otros - Solo Vilma */}
                {session.isAdmin && (
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Administración</p>
                        <button onClick={handleOpenLogin}
                            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl shadow-sm p-4 flex items-center justify-between active:scale-95 transition-all">
                            <div className="flex items-center space-x-3">
                                <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center"><Users className="w-6 h-6 text-white" /></div>
                                <div className="text-left">
                                    <h3 className="text-white font-bold">Mi Dashboard</h3>
                                    <p className="text-indigo-200 text-xs">Acceso para otros vendedores</p>
                                </div>
                            </div>
                            <div className="bg-white/20 p-2 rounded-full"><ChevronRight className="w-5 h-5 text-white" /></div>
                        </button>
                    </div>
                )}
            </div>

            {/* Modal Mi Dashboard */}
            {showLoginModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLoginModal(false)} />
                    <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-white font-bold text-lg flex items-center"><Lock className="w-5 h-5 mr-2" />Acceso Vendedor</h3>
                            <button onClick={() => setShowLoginModal(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            {loadingSellers ? (
                                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
                            ) : (
                                <>
                                    <select value={selectedSellerId} onChange={e => setSelectedSellerId(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-xl p-3 focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">-- Elige un vendedor --</option>
                                        {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <input type="password" maxLength={4} value={sellerPin}
                                        onChange={e => setSellerPin(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-center text-2xl tracking-[0.5em] font-bold rounded-xl p-3 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="••••" />
                                    <button onClick={handleSellerLogin} disabled={!selectedSellerId || sellerPin.length < 4}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95">
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
