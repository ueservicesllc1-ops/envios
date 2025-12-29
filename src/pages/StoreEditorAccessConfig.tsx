import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Mail, Shield, ExternalLink } from 'lucide-react';
import { storeEditorAccessService } from '../services/storeEditorAccessService';
import toast from 'react-hot-toast';

const StoreEditorAccessConfig: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [authorizedEmails, setAuthorizedEmails] = useState<string[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        loadAuthorizedEmails();
    }, []);

    const loadAuthorizedEmails = async () => {
        try {
            setLoading(true);
            const emails = await storeEditorAccessService.getAuthorizedEmails();
            setAuthorizedEmails(emails);
        } catch (error) {
            toast.error('Error al cargar lista de accesos');
        } finally {
            setLoading(false);
        }
    };

    const handleAddEmail = async () => {
        if (!newEmail.trim()) {
            toast.error('Ingresa un correo electrónico');
            return;
        }

        // Validar formato de email básico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            toast.error('Ingresa un correo electrónico válido');
            return;
        }

        try {
            setAdding(true);
            await storeEditorAccessService.addEmail(newEmail);
            await loadAuthorizedEmails();
            setNewEmail('');
            toast.success(`✅ Acceso concedido a: ${newEmail}`);
        } catch (error) {
            toast.error('Error al agregar correo');
        } finally {
            setAdding(false);
        }
    };

    const handleRemoveEmail = async (email: string) => {
        if (window.confirm(`¿Eliminar acceso para ${email}?`)) {
            try {
                await storeEditorAccessService.removeEmail(email);
                await loadAuthorizedEmails();
                toast.success(`Acceso eliminado: ${email}`);
            } catch (error) {
                toast.error('Error al eliminar correo');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Control de Acceso al Editor de Tienda</h1>
                    <p className="text-gray-600 mt-2">
                        Gestiona quién puede acceder al editor de la tienda en línea
                    </p>
                </div>
                <a
                    href="/store-editor"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex items-center gap-2"
                >
                    <ExternalLink className="h-4 w-4" />
                    Abrir Editor
                </a>
            </div>

            {/* Agregar nuevo correo */}
            <div className="card">
                <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <h2 className="text-xl font-bold text-gray-900">Agregar Acceso</h2>
                </div>
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                            placeholder="correo@ejemplo.com"
                            className="input-field pl-10"
                            disabled={adding}
                        />
                    </div>
                    <button
                        onClick={handleAddEmail}
                        disabled={adding}
                        className="btn-primary flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus className="h-5 w-5" />
                        {adding ? 'Agregando...' : 'Agregar'}
                    </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    Las personas con estos correos podrán acceder al editor de tienda después de iniciar sesión
                </p>
            </div>

            {/* Lista de correos autorizados */}
            <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Correos Autorizados ({authorizedEmails.length})
                </h2>

                {authorizedEmails.length === 0 ? (
                    <div className="text-center py-12">
                        <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No hay correos autorizados</p>
                        <p className="text-gray-400 text-sm mt-2">
                            Agrega correos electrónicos para permitir el acceso al editor de tienda
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {authorizedEmails.map((email, index) => (
                            <div
                                key={email}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-blue-600 font-bold">
                                            {email.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{email}</p>
                                        <p className="text-xs text-gray-500">Acceso autorizado</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveEmail(email)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                                    title="Eliminar acceso"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Información adicional */}
            <div className="card bg-blue-50 border-2 border-blue-200">
                <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    ℹ️ Información Importante
                </h3>
                <ul className="text-sm text-blue-800 space-y-2">
                    <li>• Los usuarios deben iniciar sesión con Firebase Auth para acceder</li>
                    <li>• Solo los correos autorizados pueden ver y editar la tienda</li>
                    <li>• Los usuarios no autorizados verán un mensaje de acceso denegado</li>
                    <li>• Puedes revocar el acceso en cualquier momento eliminando el correo</li>
                </ul>
            </div>
        </div>
    );
};

export default StoreEditorAccessConfig;
