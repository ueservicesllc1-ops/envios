import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userService, SavedAddress } from '../services/userPreferencesService';
import AddressModal from '../components/AddressModal';
import { Plus, Edit, Trash2, MapPin, Home, Briefcase, ArrowLeft } from 'lucide-react';
import Footer from '../components/Layout/Footer';

const UserAddresses: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
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
            await userService.deleteAddress(user.uid, id);
            loadAddresses();
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
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">Mis Direcciones</h1>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <p className="text-gray-600">Administra tus direcciones de envío.</p>
                    <button
                        onClick={handleAddNew}
                        className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800 transition-colors shadow-sm"
                    >
                        <Plus className="h-5 w-5" />
                        <span className="hidden md:inline">Nueva Dirección</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Card Nueva Dirección (mobile friendly) */}
                    <div
                        onClick={handleAddNew}
                        className="md:hidden border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all min-h-[160px]"
                    >
                        <Plus className="h-10 w-10 mb-2" />
                        <span className="font-medium">Agregar Nueva</span>
                    </div>

                    {addresses.map(addr => (
                        <div key={addr.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative group hover:shadow-md transition-shadow">
                            {(addr.isDefault || addresses.length === 1) && ( // Si es la única o default
                                <span className="absolute top-4 right-4 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">
                                    Predeterminada
                                </span>
                            )}

                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                                    {addr.alias === 'Oficina' ? <Briefcase className="h-6 w-6" /> : <Home className="h-6 w-6" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{addr.alias}</h3>
                                    <p className="text-sm text-gray-500">{addr.fullName}</p>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600 mb-6">
                                <p className="font-medium text-gray-900">{addr.address}</p>
                                <p>{addr.city}, {addr.province}</p>
                                <p className="flex items-center gap-2">
                                    <span className="font-bold text-xs bg-gray-100 px-1 rounded">Ref:</span> {addr.reference}
                                </p>
                                <p>Tel: {addr.phone}</p>
                                <p>CI: {addr.identityCard}</p>
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-4">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(addr); }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <Edit className="h-4 w-4" /> Editar
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(addr.id); }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <Trash2 className="h-4 w-4" /> Eliminar
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Estado vacío */}
                    {addresses.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-gray-500">
                            <MapPin className="h-16 w-16 text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-700">No tienes direcciones guardadas</h3>
                            <p className="mb-6">Agrega una dirección para agilizar tus compras.</p>
                            <button onClick={handleAddNew} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                                Agregar ahora
                            </button>
                        </div>
                    )}
                </div>
            </main>

            <Footer />

            {showModal && (
                <AddressModal
                    onClose={() => setShowModal(false)}
                    onAddressSaved={loadAddresses}
                    addressToEdit={editingAddress}
                />
            )}
        </div>
    );
};

export default UserAddresses;
