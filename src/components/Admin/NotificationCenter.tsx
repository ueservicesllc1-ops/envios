import React, { useState, useEffect } from 'react';
import { Send, Bell, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { sellerService } from '../../services/sellerService';
import { Seller } from '../../types';
import toast from 'react-hot-toast';

interface NotificationCenterProps {
    onClose?: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [selectedSellerIds, setSelectedSellerIds] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSellers();
    }, []);

    const loadSellers = async () => {
        try {
            setLoading(true);
            const data = await sellerService.getAll();
            // Filtrar solo los que tienen tokens de notificación
            setSellers(data.filter(s => s.fcmTokens && s.fcmTokens.length > 0));
        } catch (error) {
            console.error('Error loading sellers for notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSeller = (id: string) => {
        if (id === 'all') {
            if (selectedSellerIds.length === sellers.length) {
                setSelectedSellerIds([]);
            } else {
                setSelectedSellerIds(sellers.map(s => s.id));
            }
            return;
        }

        setSelectedSellerIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const handleSend = async () => {
        if (selectedSellerIds.length === 0) {
            toast.error('Selecciona al menos un vendedor');
            return;
        }
        if (!title || !body) {
            toast.error('Título y mensaje son obligatorios');
            return;
        }

        try {
            setSending(true);

            // Obtener todos los tokens de los vendedores seleccionados
            const tokens: string[] = [];
            selectedSellerIds.forEach(id => {
                const seller = sellers.find(s => s.id === id);
                if (seller && seller.fcmTokens) {
                    tokens.push(...seller.fcmTokens);
                }
            });

            if (tokens.length === 0) {
                toast.error('No hay dispositivos registrados para los vendedores seleccionados');
                return;
            }

            // Llamada al API del servidor para enviar
            const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tokens,
                    title,
                    body
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success(`Notificaciones enviadas con éxito (${result.successCount})`);
                setTitle('');
                setBody('');
                setSelectedSellerIds([]);
                if (onClose) setTimeout(onClose, 1500); // Close modal after a small delay
            } else {
                toast.error('Error al enviar: ' + (result.error || 'Intenta de nuevo'));
            }
        } catch (error) {
            console.error('Error sending notifications:', error);
            toast.error('Error de conexión con el servidor');
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="p-4 text-center">Cargando vendedores registrados...</div>;

    return (
        <div className="card space-y-4">
            <div className="flex items-center space-x-2 text-indigo-600 mb-2">
                <Bell className="h-6 w-6" />
                <h2 className="text-xl font-bold">Enviar Notificaciones Push</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selección de Vendedores */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 block">
                        Seleccionar Destinatarios ({sellers.length} registrados)
                    </label>
                    <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto p-2 space-y-1">
                        <button
                            onClick={() => toggleSeller('all')}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${selectedSellerIds.length === sellers.length ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
                                }`}
                        >
                            <div className="flex items-center">
                                <Users className="h-4 w-4 mr-2" />
                                <span>Todos los vendedores</span>
                            </div>
                            {selectedSellerIds.length === sellers.length && <CheckCircle className="h-4 w-4" />}
                        </button>
                        <div className="h-px bg-gray-200 my-1"></div>
                        {sellers.map(seller => (
                            <button
                                key={seller.id}
                                onClick={() => toggleSeller(seller.id)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${selectedSellerIds.includes(seller.id) ? 'bg-indigo-50 text-indigo-600 font-medium' : 'hover:bg-gray-50'
                                    }`}
                            >
                                <span>{seller.name}</span>
                                {selectedSellerIds.includes(seller.id) && <CheckCircle className="h-4 w-4" />}
                            </button>
                        ))}
                        {sellers.length === 0 && (
                            <p className="text-gray-400 text-xs italic px-3 py-4 text-center">
                                No hay dispositivos con la app instalada y sesión activa aún.
                            </p>
                        )}
                    </div>
                </div>

                {/* Composición del Mensaje */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">Título de la Notificación</label>
                        <input
                            type="text"
                            placeholder="Ej: Pago Pendiente"
                            className="input-field w-full"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">Mensaje</label>
                        <textarea
                            rows={3}
                            placeholder="Escribe aquí el contenido del mensaje..."
                            className="input-field w-full"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700">
                            Las notificaciones llegarán de forma instantánea a los celulares de los vendedores seleccionados que tengan la aplicación instalada.
                        </p>
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={sending || sellers.length === 0}
                        className="w-full flex items-center justify-center py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-gray-300 disabled:active:scale-100"
                    >
                        {sending ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <Send className="h-5 w-5 mr-2" />
                                Enviar Notificaciones
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationCenter;
