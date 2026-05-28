import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MessageSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { chatService, Conversation } from '../services/chatService';

export default function VibeInbox() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const unsub = chatService.subscribeToInbox(user.uid, (convos) => {
            setConversations(convos);
            setLoading(false);
        });

        return () => unsub();
    }, [user, navigate]);

    if (loading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Cargando...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-20">
            {/* Header */}
            <header className="sticky top-0 w-full z-50 bg-white border-b border-gray-200 h-16 flex items-center px-4 shadow-sm">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 active:scale-95 text-gray-700">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-xl text-gray-900">Mensajes</h1>
            </header>

            {/* Search Bar */}
            <div className="p-4 bg-white border-b border-gray-100">
                <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar en chats..." 
                        className="w-full bg-gray-100 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                    />
                </div>
            </div>

            {/* Conversation List */}
            <main className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                        <p className="font-medium text-lg text-gray-600">No tienes mensajes aún</p>
                        <p className="text-sm">Inicia una conversación desde el Feed</p>
                    </div>
                ) : (
                    conversations.map(conv => {
                        // Find the OTHER participant's details
                        const otherUserId = conv.participants?.find(id => id !== user?.uid) || '';
                        const otherName = conv.participantNames?.[otherUserId] || 'Usuario';
                        const otherAvatar = conv.participantAvatars?.[otherUserId] || `https://ui-avatars.com/api/?name=${otherName}`;
                        
                        // Format date
                        let dateStr = '';
                        if (conv.lastMessageAt) {
                            const date = conv.lastMessageAt.toDate ? conv.lastMessageAt.toDate() : new Date();
                            const today = new Date();
                            if (date.getDate() === today.getDate()) {
                                dateStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            } else {
                                dateStr = date.toLocaleDateString([], { day: '2-digit', month: 'short' });
                            }
                        }

                        return (
                            <div 
                                key={conv.id} 
                                onClick={() => navigate(`/chat/${conv.id}`)}
                                className="flex items-center gap-3 p-4 bg-white border-b border-gray-100 cursor-pointer active:bg-gray-50 transition-colors hover:bg-gray-50"
                            >
                                <div className="relative">
                                    <img src={otherAvatar} alt={otherName} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="font-bold text-gray-900 text-sm truncate">{otherName}</h3>
                                        <span className="text-[11px] font-bold text-gray-400">{dateStr}</span>
                                    </div>
                                    <p className={`text-sm truncate ${conv.lastMessage?.includes('[MENSAJE BLOQUEADO]') ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                                        {conv.lastMessage}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>
        </div>
    );
}
