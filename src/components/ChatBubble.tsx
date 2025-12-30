import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { chatService } from '../services/chatService';
import toast from 'react-hot-toast';

interface ChatBubbleProps {
    onChatOpen?: () => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ onChatOpen }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

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
            const unsubscribe = chatService.subscribeToMessages(convId, (msgs) => {
                setMessages(msgs);
                // Marcar como leídos los mensajes del admin
                chatService.markMessagesAsRead(convId, user.uid);
            });

            // Guardar unsubscribe para limpiar después
            return () => unsubscribe();
        } catch (error) {
            console.error('Error opening chat:', error);
            toast.error('Error al abrir el chat');
        } finally {
            setLoading(false);
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
                    onClick={() => setIsOpen(false)}
                    className="hover:bg-blue-700 p-1 rounded transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <MessageCircle className="h-12 w-12 mb-2" />
                        <p className="text-sm">¡Hola! ¿En qué podemos ayudarte?</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-lg px-4 py-2 ${msg.senderId === user?.uid
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-800 border border-gray-200'
                                    }`}
                            >
                                {msg.isAdmin && (
                                    <p className="text-xs font-bold mb-1 opacity-75">Asesor</p>
                                )}
                                <p className="text-sm">{msg.message}</p>
                                <p className="text-xs opacity-75 mt-1">
                                    {msg.timestamp?.toDate().toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Escribe tu mensaje..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatBubble;
