import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle2, MessageCircle, Send, ArrowLeft, Loader2, ShoppingBag } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase/config';
import {
  collection, query, orderBy, onSnapshot, addDoc,
  serverTimestamp, getDocs, where, doc, getDoc, setDoc
} from 'firebase/firestore';
import toast from 'react-hot-toast';

interface ChatContact {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  time: string;
  unread: number;
  isOfficial?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

// Chats predefinidos de soporte
const SUPPORT_CONTACTS: ChatContact[] = [
  {
    id: 'soporte_envios',
    name: 'Soporte EnviosVibe',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=support',
    lastMessage: '¿En qué podemos ayudarte hoy?',
    time: 'Ahora',
    unread: 0,
    isOfficial: true
  },
  {
    id: 'ventas_envios',
    name: 'Ventas & Pedidos',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sales',
    lastMessage: 'Hola, escríbenos cualquier consulta sobre tu pedido.',
    time: 'Ahora',
    unread: 0,
    isOfficial: true
  }
];

export default function VibeMessages() {
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contacts = SUPPORT_CONTACTS.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Escuchar mensajes en tiempo real
  useEffect(() => {
    if (!activeChat || !user) return;

    const chatId = `${user.uid}_${activeChat.id}`;
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, snapshot => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });

    return () => unsubscribe();
  }, [activeChat, user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeChat || !user) return;

    const text = input.trim();
    setInput('');
    setSending(true);

    try {
      const chatId = `${user.uid}_${activeChat.id}`;
      const chatRef = doc(db, 'chats', chatId);

      // Crear o actualizar documento del chat
      await setDoc(chatRef, {
        participants: [user.uid, activeChat.id],
        contactName: activeChat.name,
        userId: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Añadir mensaje
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        text,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      toast.error('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', background: '#f8f9fa' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Lista de chats */}
        <div style={{
          width: activeChat ? '0' : '100%',
          maxWidth: '380px',
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
          className={activeChat ? 'hidden md:flex' : 'flex'}
        >
          {/* Header */}
          <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #f5f5f5' }}>
            <h1 style={{ fontWeight: 800, fontSize: '22px', color: '#111', marginBottom: '12px' }}>Mensajes</h1>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Buscar chats..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '36px',
                  paddingRight: '16px',
                  height: '40px',
                  background: '#f8f9fa',
                  border: '1px solid transparent',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Contact list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!user && (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <MessageCircle style={{ width: '40px', height: '40px', color: '#d1d5db', margin: '0 auto 12px' }} />
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Inicia sesión para acceder a tus mensajes</p>
              </div>
            )}

            {user && contacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => setActiveChat(contact)}
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #fafafa',
                  display: 'flex',
                  gap: '12px',
                  cursor: 'pointer',
                  background: activeChat?.id === contact.id ? '#f8f5ff' : '#fff',
                  transition: 'background 0.15s'
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', background: '#f3f4f6' }}
                  />
                  {contact.unread > 0 && (
                    <span style={{
                      position: 'absolute', top: 0, right: 0,
                      width: '12px', height: '12px', background: '#f43f5e',
                      border: '2px solid #fff', borderRadius: '50%'
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '14px', color: '#111', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {contact.name}
                      {contact.isOfficial && <CheckCircle2 style={{ width: '12px', height: '12px', color: '#8b5cf6' }} />}
                    </h3>
                    <span style={{ fontSize: '10px', color: '#9ca3af', whiteSpace: 'nowrap', marginLeft: '8px' }}>{contact.time}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contact.lastMessage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Área de chat */}
        {activeChat ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', minWidth: 0 }}>
            {/* Chat header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: '#fff',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <button
                className="md-hidden"
                onClick={() => setActiveChat(null)}
                style={{
                  display: 'none',
                  padding: '6px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderRadius: '50%'
                }}
              >
                <ArrowLeft style={{ width: '20px', height: '20px', color: '#374151' }} />
              </button>
              <img
                src={activeChat.avatar}
                alt={activeChat.name}
                style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '15px', color: '#111', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {activeChat.name}
                  {activeChat.isOfficial && <CheckCircle2 style={{ width: '14px', height: '14px', color: '#8b5cf6' }} />}
                </h2>
                <p style={{ fontSize: '12px', color: '#22c55e' }}>● En línea</p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fafafa' }}>
              {/* Initial message from contact */}
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: '#fff',
                  padding: '12px 14px',
                  borderRadius: '18px 18px 18px 4px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  maxWidth: '80%'
                }}>
                  <p style={{ fontSize: '14px', color: '#374151' }}>{activeChat.lastMessage}</p>
                </div>
              </div>

              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{ display: 'flex', justifyContent: msg.senderId === user?.uid ? 'flex-end' : 'flex-start' }}
                >
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: msg.senderId === user?.uid ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.senderId === user?.uid
                      ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                      : '#fff',
                    color: msg.senderId === user?.uid ? '#fff' : '#374151',
                    maxWidth: '75%',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                  }}>
                    <p style={{ fontSize: '14px', margin: 0 }}>{msg.text}</p>
                    <p style={{
                      fontSize: '10px',
                      opacity: 0.7,
                      textAlign: 'right',
                      marginTop: '4px',
                      marginBottom: 0
                    }}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {user ? (
              <form
                onSubmit={handleSend}
                style={{
                  padding: '12px 16px',
                  background: '#fff',
                  borderTop: '1px solid #f0f0f0',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center'
                }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  style={{
                    flex: 1,
                    background: '#f8f9fa',
                    border: '1px solid transparent',
                    borderRadius: '24px',
                    padding: '10px 16px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  style={{
                    width: '42px',
                    height: '42px',
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    border: 'none',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    opacity: !input.trim() || sending ? 0.5 : 1,
                    transition: 'opacity 0.2s'
                  }}
                >
                  {sending
                    ? <Loader2 style={{ width: '16px', height: '16px', color: '#fff', animation: 'spin 1s linear infinite' }} />
                    : <Send style={{ width: '16px', height: '16px', color: '#fff', marginLeft: '2px' }} />
                  }
                </button>
              </form>
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
                <p style={{ color: '#6b7280', fontSize: '13px' }}>Inicia sesión para enviar mensajes</p>
              </div>
            )}
          </div>
        ) : (
          /* Empty state desktop */
          <div style={{
            flex: 1,
            display: 'none',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafafa',
            gap: '12px'
          }}
            className="md:flex"
          >
            <div style={{
              width: '72px',
              height: '72px',
              background: 'linear-gradient(135deg, #ede9fe, #f5f3ff)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MessageCircle style={{ width: '32px', height: '32px', color: '#8b5cf6' }} />
            </div>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>Selecciona un chat para comenzar</p>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .md-hidden { display: flex !important; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
