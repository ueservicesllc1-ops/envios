import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, AlertTriangle, ShoppingBag, PlusCircle, Smile } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { chatService, ChatMessage, Conversation } from '../services/chatService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export default function VibeChatRoom() {
    const { conversationId } = useParams<{ conversationId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [otherUser, setOtherUser] = useState({ name: 'Usuario', avatar: '' });
    
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user || !conversationId) return;

        // Fetch conversation details once
        async function fetchConvo() {
            try {
                const docSnap = await getDoc(doc(db, 'conversations', conversationId!));
                if (docSnap.exists()) {
                    const data = docSnap.data() as Conversation;
                    setConversation(data);
                    
                    const otherId = data.participants?.find(id => id !== user?.uid) || '';
                    setOtherUser({
                        name: data.participantNames?.[otherId] || 'Usuario',
                        avatar: data.participantAvatars?.[otherId] || `https://ui-avatars.com/api/?name=U`
                    });
                }
            } catch (error) {
                console.error(error);
            }
        }
        fetchConvo();

        // Subscribe to messages
        const unsub = chatService.subscribeToMessages(conversationId, (msgs) => {
            setMessages(msgs);
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });

        return () => unsub();
    }, [conversationId, user]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !user || !conversationId) return;

        const text = input.trim();
        setInput(''); // clear early for UX

        const success = await chatService.sendMessage(
            conversationId, 
            user.uid, 
            user.displayName || 'Yo', 
            text, 
            'text'
        );

        if (!success) {
            toast.error('Tu mensaje ha sido bloqueado por seguridad.');
        }
    };

    // Simulate sending a product card (For sellers)
    const handleSendProductCard = async () => {
        if (!user || !conversationId) return;
        
        // Mock product data (In reality, open a modal to select from Vitrina)
        const mockProduct = {
            id: 'mock-product-123',
            name: 'Urban Velocity Sneakers',
            price: 129.00,
            originalPrice: 159.00,
            imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
            rating: 4.9,
            soldCount: 2400
        };

        await chatService.sendMessage(
            conversationId,
            user.uid,
            user.displayName || 'Vendedor',
            'Te he enviado un producto',
            'product_card',
            mockProduct
        );
        toast.success('Tarjeta de producto enviada');
    };

    if (!user) return null;

    return (
        <div className="flex flex-col h-screen bg-gray-50 font-sans">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-white border-b border-gray-200 h-16 flex items-center px-4 shadow-sm">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 active:scale-95 text-gray-700">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img src={otherUser.avatar} alt={otherUser.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900 leading-tight">{otherUser.name}</span>
                        <span className="font-bold text-green-600 text-[10px]">Online</span>
                    </div>
                </div>
            </header>

            {/* Chat Canvas */}
            <main className="flex-1 overflow-y-auto mt-16 mb-[72px] p-4 flex flex-col gap-4">
                
                {/* Security Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mx-4 my-2 flex items-start gap-2 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800 font-medium leading-relaxed">
                        Nunca compartas tu número de teléfono, cuentas bancarias ni enlaces de pago externos. 
                        Las transacciones fuera de ShopVibe no están protegidas.
                    </p>
                </div>

                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === user.uid;
                    
                    // Format time
                    const timeStr = msg.createdAt 
                        ? (msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '';

                    if (msg.type === 'system_warning') {
                        return (
                            <div key={msg.id || idx} className="flex flex-col items-center my-2">
                                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-xl max-w-[85%] text-xs font-bold text-center flex flex-col items-center gap-1">
                                    <AlertTriangle className="w-4 h-4" />
                                    {msg.text}
                                </div>
                            </div>
                        );
                    }

                    if (msg.type === 'product_card' && msg.productData) {
                        const prod = msg.productData;
                        return (
                            <div key={msg.id || idx} className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}>
                                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col w-64">
                                    <img src={prod.imageUrl} className="w-full aspect-square object-cover" alt="Product thumbnail" />
                                    <div className="p-3 flex flex-col gap-1">
                                        <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{prod.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#ea580c] font-black">${prod.price.toFixed(2)}</span>
                                            {prod.originalPrice && <span className="text-gray-400 font-bold text-[10px] line-through">${prod.originalPrice.toFixed(2)}</span>}
                                        </div>
                                        <button 
                                            onClick={() => navigate(`/product/${prod.id}`)}
                                            className="mt-2 w-full bg-[#ea580c] text-white font-bold py-2 rounded-xl transition-all active:scale-95 text-sm"
                                        >
                                            Comprar Ahora
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.id || idx} className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}>
                            <div className={`p-3 shadow-sm ${isMe ? 'bg-[#ea580c] text-white rounded-[18px_18px_2px_18px]' : 'bg-white border border-gray-100 text-gray-900 rounded-[18px_18px_18px_2px]'}`}>
                                <p className="text-sm leading-snug">{msg.text}</p>
                                <div className={`flex justify-end items-center gap-1 mt-1 ${isMe ? 'opacity-80' : 'text-gray-400'}`}>
                                    <span className="text-[10px] font-bold">{timeStr}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </main>

            {/* Bottom Input Area */}
            <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 px-4 py-3 pb-safe z-50">
                <div className="flex items-center gap-2">
                    {/* Action Menu (e.g. Send Product) */}
                    <button 
                        onClick={handleSendProductCard}
                        className="w-10 h-10 flex items-center justify-center text-[#ea580c] bg-orange-50 hover:bg-orange-100 rounded-full transition-colors flex-shrink-0"
                        title="Enviar Producto"
                    >
                        <ShoppingBag className="w-5 h-5" />
                    </button>
                    
                    <form onSubmit={handleSend} className="flex-1 flex relative">
                        <input 
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="w-full bg-gray-100 border-none rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#ea580c]/50 pr-10"
                            placeholder="Escribe un mensaje..."
                        />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <Smile className="w-5 h-5" />
                        </button>
                        <button 
                            type="submit"
                            disabled={!input.trim()}
                            className="ml-2 w-10 h-10 bg-[#ea580c] text-white rounded-full flex items-center justify-center shadow-md active:scale-90 disabled:opacity-50 disabled:active:scale-100 flex-shrink-0"
                        >
                            <Send className="w-4 h-4 ml-0.5" />
                        </button>
                    </form>
                </div>
            </footer>
        </div>
    );
}
