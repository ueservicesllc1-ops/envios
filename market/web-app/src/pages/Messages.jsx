import { mockMessages } from '../data/mockMessages';
import { Search, CheckCircle2, MessageCircle, Send } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';

export default function Messages() {
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !activeChat) return;

    setMessages([...messages, {
      id: Date.now().toString(),
      sender: 'me',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setInput('');
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-gray-50 md:flex-row">
      {/* Lista de Chats (Oculta en móvil si hay chat activo) */}
      <div className={cn("bg-white border-r border-gray-100 flex-1 md:max-w-sm flex-col h-[calc(100vh-64px)] md:flex", activeChat ? 'hidden md:flex' : 'flex')}>
        <div className="p-4 border-b border-gray-100">
          <h1 className="font-bold text-xl text-gray-900 mb-4">Mensajes</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar chats..." 
              className="w-full pl-9 pr-4 h-10 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:border-primary/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {mockMessages.map((msg) => (
            <div 
              key={msg.id} 
              onClick={() => setActiveChat(msg)}
              className={cn("p-4 border-b border-gray-50 flex gap-3 cursor-pointer hover:bg-gray-50 transition-colors", activeChat?.id === msg.id && "bg-gray-50")}
            >
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 relative">
                <img src={msg.avatar} className="w-full h-full object-cover" />
                {msg.unread > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-secondary border-2 border-white rounded-full"></span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1 truncate">
                    {msg.sender}
                    {msg.isOfficial && <CheckCircle2 className="w-3 h-3 text-tertiary" />}
                  </h3>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{msg.time}</span>
                </div>
                <p className={cn("text-xs line-clamp-1", msg.unread > 0 ? "font-bold text-gray-900" : "text-gray-500")}>
                  {msg.lastMessage}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área de Chat */}
      {activeChat ? (
        <div className="flex-1 flex flex-col h-[calc(100vh-64px)] bg-white relative">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <button className="md:hidden p-2" onClick={() => setActiveChat(null)}>←</button>
            <img src={activeChat.avatar} className="w-10 h-10 rounded-full" />
            <div>
              <h2 className="font-bold text-sm text-gray-900">{activeChat.sender}</h2>
              <p className="text-xs text-gray-500">En línea</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            <div className="flex justify-start">
              <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[80%] border border-gray-100">
                <p className="text-sm text-gray-800">{activeChat.lastMessage}</p>
                <p className="text-[10px] text-gray-400 mt-1 text-right">{activeChat.time}</p>
              </div>
            </div>
            
            {messages.map(m => (
              <div key={m.id} className="flex justify-end">
                <div className="bg-primary text-white p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[80%]">
                  <p className="text-sm">{m.text}</p>
                  <p className="text-[10px] text-white/70 mt-1 text-right">{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe un mensaje..." 
              className="flex-1 bg-gray-50 border-transparent rounded-full px-4 text-sm focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
            />
            <button type="submit" className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50" disabled={!input.trim()}>
              <Send className="w-4 h-4 ml-1" />
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col bg-gray-50 items-center justify-center text-gray-400">
          <MessageCircle className="w-16 h-16 mb-4 text-gray-200" />
          <p>Selecciona un chat para empezar a enviar mensajes</p>
        </div>
      )}
    </div>
  );
}