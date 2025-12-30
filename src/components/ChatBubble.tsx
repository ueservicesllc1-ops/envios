import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Image as ImageIcon, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { chatService } from '../services/chatService';
import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

interface ChatBubbleProps {
    onChatOpen?: () => void;
}

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos en milisegundos
const WARNING_TIMEOUT = 9 * 60 * 1000; // 9 minutos - mostrar advertencia

const ChatBubble: React.FC<ChatBubbleProps> = ({ onChatOpen }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [showInactivityWarning, setShowInactivityWarning] = useState(false);
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
    const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Reset inactivity timer en cada actividad
    const resetInactivityTimer = () => {
        setShowInactivityWarning(false);

        // Limpiar timers existentes
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
        }

        // Timer de advertencia (9 minutos)
        warningTimerRef.current = setTimeout(() => {
            setShowInactivityWarning(true);
        }, WARNING_TIMEOUT);

        // Timer de cierre (10 minutos)
        inactivityTimerRef.current = setTimeout(() => {
            toast.error('Chat cerrado por inactividad');
            handleClose();
        }, INACTIVITY_TIMEOUT);
    };

    // Limpiar timers al cerrar
    const handleClose = () => {
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
        }
        setIsOpen(false);
        setShowInactivityWarning(false);
    };

    const handleOpen = async () => {
        if (!user) {
            toast.error('Inicia sesión para usar el chat');
            return;
        }

        setIsOpen(true);
        setLoading(true);

        try {
            // Obtener o crear conversación
            const convId = await chatService.getOrCreateConversation(
                user.uid,
                user.displayName || 'Usuario',
                user.email || ''
            );
            setConversationId(convId);

            // Suscribirse a mensajes
            const unsubscribe = chatService.subscribeToMessages(convId, async (msgs) => {
                setMessages(msgs);

                // Enviar mensaje de bienvenida automático si es una conversación nueva
                if (msgs.length === 0) {
                    await chatService.sendMessage(
                        convId,
                        'system',
                        'Sistema',
                        'system@comprasexpress.us',
                        '¡Bienvenido al chat de soporte! 👋\n\nPor favor, espera un momento mientras uno de nuestros asesores es asignado para atenderte.\n\nPuedes escribir tu consulta y te responderemos lo antes posible.',
                        true // isAdmin/System message
                    );
                }

                // Marcar como leídos los mensajes del admin
                chatService.markMessagesAsRead(convId, user.uid);
            });

            // Iniciar timer de inactividad
            resetInactivityTimer();

            // Guardar unsubscribe para limpiar después
            return () => unsubscribe();
        } catch (error) {
            console.error('Error opening chat:', error);
            toast.error('Error al abrir el chat');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Solo se permiten imágenes');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen debe ser menor a 5MB');
            return;
        }

        if (!conversationId || !user) return;

        try {
            setUploadingImage(true);
            const imageRef = ref(storage, `chat-images/${conversationId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(imageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            await chatService.sendMessage(
                conversationId,
                user.uid,
                user.displayName || 'Usuario',
                user.email || '',
                message || 'Imagen adjunta',
                false,
                downloadURL,
                file.name
            );

            setMessage('');
            resetInactivityTimer();
            toast.success('Imagen enviada');
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Error al subir la imagen');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSendMessage = async () => {
        if (!message.trim() || !conversationId || !user) return;

        try {
            await chatService.sendMessage(
                conversationId,
                user.uid,
                user.displayName || 'Usuario',
                user.email || '',
                message,
                false
            );
            setMessage('');
            resetInactivityTimer();
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Error al enviar mensaje');
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={handleOpen}
                className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:bg-blue-700 transition-all hover:scale-110 z-50 group"
                title="Chat con asesor"
            >
                <MessageCircle className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    !
                </span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    <div>
                        <h3 className="font-bold">Chat con Asesor</h3>
                        <p className="text-xs text-blue-100">En línea</p>
                    </div>
                </div>
                <button
                    onClick={handleClose}
                    className="hover:bg-blue-700 p-1 rounded transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Inactivity Warning */}
            {showInactivityWarning && (
                <div className="bg-yellow-50 border-b border-yellow-200 p-2">
                    <div className="flex items-center gap-2 text-yellow-800 text-xs">
                        <Clock className="h-4 w-4" />
                        <p>El chat se cerrará por inactividad en 1 minuto</p>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <MessageCircle className="h-12 w-12 mb-2" />
                        <p className="text-sm">Esperando mensajes...</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        // Determinar si es mensaje del asesor/sistema
                        const isAdminMessage = msg.isAdmin || msg.senderId === 'system';

                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isAdminMessage ? 'justify-start' : 'justify-end'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-lg px-4 py-2 ${isAdminMessage
                                        ? 'bg-gray-100 text-gray-800 border border-gray-200'
                                        : 'bg-blue-600 text-white'
                                        }`}
                                >
                                    {msg.isAdmin && msg.senderId !== 'system' && (
                                        <p className="text-xs font-bold mb-1 text-blue-600">Asesor</p>
                                    )}
                                    {msg.senderId === 'system' && (
                                        <p className="text-xs font-bold mb-1 text-green-600">Sistema</p>
                                    )}

                                    {msg.imageUrl ? (
                                        <div className="space-y-2">
                                            <img
                                                src={msg.imageUrl}
                                                alt={msg.imageFileName || 'Imagen'}
                                                className="max-w-full rounded cursor-pointer hover:opacity-90"
                                                onClick={() => window.open(msg.imageUrl, '_blank')}
                                            />
                                            {msg.message && msg.message !== 'Imagen adjunta' && (
                                                <p className="text-sm">{msg.message}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                    )}

                                    <p className="text-xs opacity-75 mt-1">
                                        {msg.timestamp?.toDate().toLocaleTimeString('es-ES', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                <div className="flex gap-2 items-end">
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                        }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage || !conversationId}
                        className="p-2 text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Enviar imagen"
                    >
                        <ImageIcon className="h-5 w-5" />
                    </button>
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        onFocus={resetInactivityTimer}
                        placeholder="Escribe tu mensaje..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!message.trim() || uploadingImage}
                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
                {uploadingImage && (
                    <p className="text-xs text-gray-500 mt-2">Subiendo imagen...</p>
                )}
            </div>
        </div>
    );
};

export default ChatBubble;
