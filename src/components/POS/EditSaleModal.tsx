import React, { useState } from 'react';
import { X, Save, User, Calendar, CreditCard, Phone, Package, DollarSign } from 'lucide-react'; // Added icons
import { PointOfSale } from '../../types';
import { posService } from '../../services/posService';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface EditSaleModalProps {
    sale: PointOfSale;
    onClose: () => void;
    onUpdate: () => void;
}

const EditSaleModal: React.FC<EditSaleModalProps> = ({ sale, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        customerName: sale.customerName,
        customerPhone: sale.customerPhone || '',
        customerEmail: sale.customerEmail || '',
        customerAddress: sale.customerAddress || '',
        paymentMethod: sale.paymentMethod,
        date: new Date(sale.date) // Handle date properly
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await posService.updateSale(sale.id, {
                ...formData
            });
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
                    <h3 className="text-xl font-bold">Editar Venta {sale.saleNumber}</h3>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Date Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="datetime-local" // Use datetime-local for convenience
                                value={formData.date.toISOString().slice(0, 16)} // simplistic formatting
                                onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all font-sans" // Ensure font matches
                            />
                        </div>
                    </div>

                    {/* Customer Inputs */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 border-b pb-2">Información del Cliente</h4>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.customerName}
                                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                <input
                                    type="text"
                                    value={formData.customerPhone}
                                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.customerEmail}
                                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                            <input
                                type="text"
                                value={formData.customerAddress}
                                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { value: 'cash', label: 'Efectivo', Icon: DollarSign },
                                { value: 'card', label: 'Tarjeta', Icon: CreditCard },
                                { value: 'transfer', label: 'Transferencia', Icon: Phone },
                                { value: 'mixed', label: 'Mixto', Icon: Package }
                            ].map(({ value, label, Icon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, paymentMethod: value as any })}
                                    className={clsx(
                                        'p-2 rounded-lg border flex flex-col items-center justify-center transition-all text-xs',
                                        formData.paymentMethod === value
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                    )}
                                >
                                    <Icon className="h-4 w-4 mb-1" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-yellow-600 mt-2">
                            Nota: Cambiar el método de pago no recalcula los montos si fue mixto. Verifica manualmente.
                        </p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditSaleModal;
