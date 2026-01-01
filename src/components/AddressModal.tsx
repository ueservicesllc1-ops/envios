import React, { useState } from 'react';
import { X, Save, MapPin, Home, Briefcase } from 'lucide-react';
import { userService, SavedAddress } from '../services/userPreferencesService';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface Props {
    onClose: () => void;
    onAddressSaved?: () => void;
    addressToEdit?: SavedAddress | null;
}

const AddressModal: React.FC<Props> = ({ onClose, onAddressSaved, addressToEdit }) => {
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState<Partial<SavedAddress>>(addressToEdit || {
        fullName: user?.displayName || '',
        phone: '',
        province: '',
        city: '',
        address: '',
        reference: '',
        identityCard: '',
        alias: 'Casa',
        isDefault: false
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Validaciones básicas
        if (!formData.address || !formData.city || !formData.province || !formData.phone || !formData.identityCard) {
            toast.error('Por favor completa los campos obligatorios');
            return;
        }

        setSubmitting(true);
        try {
            const newAddress: SavedAddress = {
                id: addressToEdit?.id || Date.now().toString(), // Mantener ID si es edición
                fullName: formData.fullName || '',
                phone: formData.phone || '',
                province: formData.province || '',
                city: formData.city || '',
                address: formData.address || '',
                reference: formData.reference || '',
                identityCard: formData.identityCard || '',
                alias: formData.alias || 'Casa',
                isDefault: formData.isDefault || false
            };

            await userService.saveAddress(user.uid, newAddress);
            toast.success('Dirección guardada correctamente');
            if (onAddressSaved) onAddressSaved();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar la dirección');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-blue-100 p-3 rounded-full">
                        <MapPin className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Agregar Nueva Dirección</h2>
                        <p className="text-sm text-gray-500">Para envíos más rápidos en tus compras</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre Completo *</label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Cédula / RUC *</label>
                            <input
                                type="text"
                                name="identityCard"
                                value={formData.identityCard}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                placeholder="ID válido"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono *</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                placeholder="099..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Provincia *</label>
                            <input
                                type="text"
                                name="province"
                                value={formData.province}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                placeholder="Ej: Pichincha"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Ciudad *</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                placeholder="Ej: Quito"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Dirección Exacta (Calle principal, secundaria, número) *</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                placeholder="Ej: Av. Amazonas y Naciones Unidas N12-34"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Referencia</label>
                            <input
                                type="text"
                                name="reference"
                                value={formData.reference}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                placeholder="Ej: Frente al parque, casa blanca..."
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-2">Alias de la dirección</label>
                            <div className="flex gap-4">
                                <label className={`flex-1 flex items-center justify-center gap-2 p-2 border rounded-lg cursor-pointer transition-all ${formData.alias === 'Casa' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-gray-50'}`}>
                                    <input type="radio" name="alias" value="Casa" checked={formData.alias === 'Casa'} onChange={handleChange} className="hidden" />
                                    <Home className="h-4 w-4" /> Casa
                                </label>
                                <label className={`flex-1 flex items-center justify-center gap-2 p-2 border rounded-lg cursor-pointer transition-all ${formData.alias === 'Oficina' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-gray-50'}`}>
                                    <input type="radio" name="alias" value="Oficina" checked={formData.alias === 'Oficina'} onChange={handleChange} className="hidden" />
                                    <Briefcase className="h-4 w-4" /> Oficina
                                </label>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full mt-4 bg-blue-900 text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition-all flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                Guardar Dirección
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddressModal;
