import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userService, SavedAddress } from '../services/userPreferencesService';
import AddressModal from '../components/AddressModal';
import { Plus, Edit, Trash2, MapPin, Home, Briefcase, ArrowLeft, User, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import toast from 'react-hot-toast';

const UserAddresses: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { cartItemsCount } = useCart();
    const [addresses, setAddresses] = useState<SavedAddress[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

    useEffect(() => {
        if (user) loadAddresses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const loadAddresses = async () => {
        if (!user) return;
        const addrs = await userService.getAddresses(user.uid);
        setAddresses(addrs);
    };

    const handleDelete = async (id: string) => {
        if (!user) return;
        if (window.confirm('¿Estás seguro de que quieres eliminar esta dirección?')) {
            try {
                await userService.deleteAddress(user.uid, id);
                toast.success('Dirección eliminada');
                loadAddresses();
            } catch (error) {
                toast.error('Error al eliminar');
            }
        }
    };

    const handleEdit = (address: SavedAddress) => {
        setEditingAddress(address);
        setShowModal(true);
    };

    const handleAddNew = () => {
        setEditingAddress(null);
        setShowModal(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20 font-sans">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white border-b border-gray-200 flex justify-between items-center px-4 h-14">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/profile')} className="active:scale-95 transition-transform text-gray-600">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-extrabold text-orange-600">ShopVibe</h1>
                </div>
            </header>

            <main className="flex-1 w-full max-w-md mx-auto px-4 pt-20">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Mis Direcciones</h2>
                    <button
                        onClick={handleAddNew}
                        className="bg-orange-100 text-orange-600 px-3 py-2 rounded-xl flex items-center gap-1 font-bold text-sm active:scale-95 transition-all"
                    >
                        <Plus className="h-4 w-4" /> Nueva
                    </button>
                </div>

                <div className="space-y-4">
                    {addresses.map(addr => (
                        <div key={addr.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative">
                            {(addr.isDefault || addresses.length === 1) && (
                                <span className="absolute top-4 right-4 bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    Predeterminada
                                </span>
                            )}

                            <div className="flex items-start gap-4 mb-3">
                                <div className="p-3 bg-orange-50 text-orange-500 rounded-full">
                                    {addr.alias === 'Oficina' ? <Briefcase className="h-5 w-5" /> : <Home className="h-5 w-5" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base leading-tight">{addr.alias}</h3>
                                    <p className="text-xs text-gray-500">{addr.fullName}</p>
                                </div>
                            </div>

                            <div className="space-y-1 text-sm text-gray-600 mb-4 pl-12 border-l-2 border-gray-50">
                                <p className="font-medium text-gray-900">{addr.address}</p>
                                <p className="text-xs">{addr.city}, {addr.province}</p>
                                {addr.reference && (
                                    <p className="text-xs flex items-start gap-1 mt-1 text-gray-500">
                                        <span className="font-bold bg-gray-100 px-1 rounded">Ref:</span> {addr.reference}
                                    </p>
                                )}
                                <p className="text-xs mt-1">Tel: {addr.phone}</p>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-gray-50 pt-3">
                                <button
                                    onClick={() => handleEdit(addr)}
                                    className="px-3 py-1.5 text-blue-600 bg-blue-50 font-bold text-xs rounded-lg active:scale-95 transition-all flex items-center gap-1"
                                >
                                    <Edit className="h-3 w-3" /> Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(addr.id)}
                                    className="px-3 py-1.5 text-red-600 bg-red-50 font-bold text-xs rounded-lg active:scale-95 transition-all flex items-center gap-1"
                                >
                                    <Trash2 className="h-3 w-3" /> Eliminar
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Estado vacío */}
                    {addresses.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <MapPin className="h-10 w-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Sin direcciones</h3>
                            <p className="text-gray-500 text-sm mb-6 max-w-[250px]">
                                Agrega una dirección para poder enviarte tus compras.
                            </p>
                            <button 
                                onClick={handleAddNew} 
                                className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl active:scale-95 transition-transform flex items-center gap-2 shadow-md shadow-orange-500/20"
                            >
                                <Plus className="h-5 w-5" /> Agregar Dirección
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* BottomNavBar */}
            <nav className="fixed bottom-0 w-full z-50 rounded-t-xl bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.05)] flex justify-around items-center py-2 px-2 pb-safe border-t border-gray-100">
                <button onClick={() => navigate('/vibe-market')} className="flex flex-col items-center justify-center text-gray-400 hover:text-orange-600 active:scale-90 transition-all duration-150">
                    <Home className="w-6 h-6 mb-1" />
                    <span className="font-bold text-[10px]">Inicio</span>
                </button>
                <button onClick={() => navigate('/cart')} className="flex flex-col items-center justify-center text-gray-400 hover:text-orange-600 active:scale-90 transition-all duration-150">
                    <div className="relative">
                        <ShoppingCart className="w-6 h-6 mb-1" />
                        {cartItemsCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                                {cartItemsCount}
                            </span>
                        )}
                    </div>
                    <span className="font-bold text-[10px]">Carrito</span>
                </button>
                <button onClick={() => navigate('/profile')} className="flex flex-col items-center justify-center text-gray-400 hover:text-orange-600 active:scale-90 transition-all duration-150">
                    <User className="w-6 h-6 mb-1" />
                    <span className="font-bold text-[10px]">Perfil</span>
                </button>
            </nav>

            {showModal && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
                    <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl animate-in slide-in-from-bottom-full max-h-[90vh] overflow-y-auto">
                        <AddressModal
                            onClose={() => setShowModal(false)}
                            onAddressSaved={loadAddresses}
                            addressToEdit={editingAddress}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserAddresses;
