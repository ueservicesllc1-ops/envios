import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Send, X, User, Clock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { chatService, type Conversation, type ChatMessage } from '../services/chatService';
import toast from 'react-hot-toast';

const AdminChats: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    console.log('AdminChats component rendering, user:', user);

    useEffect(() => {
        console.log('AdminChats useEffect triggered');
        console.log('User:', user);

        if (!user) {
            console.log('No user detected');
            setLoading(false); // Mostrar interfaz aunque no haya usuario
            return;
        }

        console.log('User authenticated, subscribing to conversations');

        try {
            // Suscribirse a todas las conversaciones
            const unsubscribe = chatService.subscribeToConversations((convs) => {
                console.log('Conversations received:', convs.length);
                setConversations(convs);
                setLoading(false);
            });

            return () => {
                console.log('Unsubscribing from conversations');
                unsubscribe();
            };
        } catch (error) {
            console.error('Error in subscribeToConversations:', error);
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (selectedConversation) {
            // Suscribirse a mensajes de la conversación seleccionada
            const unsubscribe = chatService.subscribeToMessages(
                selectedConversation.id,
                (msgs) => {
                    setMessages(msgs);
                    // Auto scroll to bottom
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }
            );

            return () => unsubscribe();
        }
    }, [selectedConversation]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation || !user) return;

        try {
            await chatService.sendMessage(
                selectedConversation.id,
                user.uid,
                user.displayName || 'Asesor',
                user.email || '',
                newMessage,
                true // isAdmin
            );
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Error al enviar mensaje');
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
    };

    console.log('Loading state:', loading);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando chat...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-xl font-bold text-gray-900 mb-2">Acceso Restringido</p>
                    <p className="text-gray-600">Debes iniciar sesión para acceder al chat</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Iniciar Sesión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Chat de Soporte</h1>
                            <p className="text-sm text-gray-600">Panel de Asesores</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MessageCircle className="h-5 w-5" />
                        <span>{conversations.length} conversaciones</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Conversations List - Estilo MSN */}
                <div className="w-80 bg-white border-r flex flex-col">
                    <div className="p-4 border-b">
                        <h2 className="font-bold text-gray-900">Conversaciones Activas</h2>
                        <p className="text-xs text-gray-500 mt-1">
                            {conversations.filter(c => c.status === 'active').length} activas
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {conversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                                <MessageCircle className="h-16 w-16 mb-3" />
                                <p className="text-sm text-center">
                                    No hay conversaciones activas
                                </p>
                            </div>
                        ) : (
                            conversations.map((conversation) => (
                                <button
                                    key={conversation.id}
                                    onClick={() => setSelectedConversation(conversation)}
                                    className={`w-full p-4 border-b hover:bg-gray-50 transition-colors text-left ${selectedConversation?.id === conversation.id
                                        ? 'bg-blue-50 border-l-4 border-l-blue-600'
                                        : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <User className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-semibold text-gray-900 truncate">
                                                        {conversation.userName}
                                                    </p>
                                                    {conversation.unreadCount > 0 && (
                                                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                                                            {conversation.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {conversation.userEmail}
                                                </p>
                                                <p className="text-sm text-gray-600 truncate mt-1">
                                                    {conversation.lastMessage || 'Nueva conversación'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400 ml-2">
                                            {formatTime(conversation.lastMessageTime)}
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-gray-50">
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="bg-white border-b px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <User className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">
                                                {selectedConversation.userName}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {selectedConversation.userEmail}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('¿Cerrar esta conversación?')) {
                                                chatService.closeConversation(selectedConversation.id);
                                                setSelectedConversation(null);
                                                toast.success('Conversación cerrada');
                                            }
                                        }}
                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-lg px-4 py-3 ${msg.isAdmin
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                                                }`}
                                        >
                                            {!msg.isAdmin && (
                                                <p className="text-xs font-bold mb-1 text-gray-500">
                                                    {msg.senderName}
                                                </p>
                                            )}
                                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                            <div className="flex items-center gap-1 mt-1 opacity-75">
                                                <Clock className="h-3 w-3" />
                                                <p className="text-xs">
                                                    {msg.timestamp?.toDate().toLocaleTimeString('es-ES', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="bg-white border-t p-4">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Escribe tu respuesta..."
                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim()}
                                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                    >
                                        <Send className="h-5 w-5" />
                                        Enviar
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <MessageCircle className="h-20 w-20 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">Selecciona una conversación</p>
                                <p className="text-sm mt-2">
                                    Elige un usuario de la lista para comenzar a chatear
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminChats;
