import React, { useState, useEffect } from 'react';
import { MessageCircle, Package, Truck, LayoutDashboard, User, Search, MapPin } from 'lucide-react';
import AdminChats from './AdminChats';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { onlineSaleService, OnlineSale } from '../services/onlineSaleService';
import { contactService } from '../services/contactService';
import toast from 'react-hot-toast';
import { Check, Edit, Ban, Truck as TruckIcon, CheckCircle } from 'lucide-react';
import { userService, UserPreferences } from '../services/userPreferencesService';
import { chatService } from '../services/chatService';

type TabType = 'dashboard' | 'chat' | 'orders' | 'tracking' | 'clients';

const AdvisorPanel: React.FC = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [stats, setStats] = useState({ activeChats: 0, pendingOrders: 0 });
    // ... (rest of states)

    // ... (helper functions like isClientOnline remain)

    const handleStartChat = async (client: UserPreferences & { id: string }) => {
        // Iniciar chat (crear conversación si no existe)
        try {
            // Verificar si ya existe conversación (opcional, AdminChats maneja esto usualmente, pero aquí preparamos el terreno)
            // Simplemente pasamos al tab de chat con un estado especial
            // OJO: AdminChats está embebido en este panel cuando activeTab === 'chat'.
            // Necesitamos una forma de decirle a AdminChats que abra X conversación.

            // Opción A: Navegar a ruta dedicada si existiera.
            // Opción B: Usar un estado global o prop drilling. AdminChats está renderizado aqui mismo.
            // Vamos a modificar AdminChats para aceptar props o usar un bus de eventos, pero lo más fácil es
            // pasar un estado local si AdminChats aceptara props, pero actualmente no lo hace.

            // SOLUCION RAPIDA: Crear la conversación aquí y luego cambiar activeTab a 'chat'.
            // Pero AdminChats carga su propia lista.

            // Vamos a usar props en AdminChats (necesitaremos modificarlo despues).
            // Por ahora, guardamos el ID del usuario seleccionado en un estado local 'selectedChatUserId'
            setSelectedChatUserId(client.id);
            setActiveTab('chat');
        } catch (error) {
            console.error(error);
            toast.error('Error al iniciar chat');
        }
    };

    const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);

    // ... (useEffect for stats)

    // ... (render)

    const [orders, setOrders] = useState<OnlineSale[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [clients, setClients] = useState<(UserPreferences & { id: string })[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [onlineUsersCount, setOnlineUsersCount] = useState(0);

    // Helper para verificar si un cliente está online (activo hace menos de 5 min)
    const isClientOnline = (lastActive: any) => {
        if (!lastActive) return false;
        const now = new Date();
        const last = new Date(lastActive.seconds * 1000);
        const diffMinutes = (now.getTime() - last.getTime()) / 1000 / 60;
        return diffMinutes < 5;
    };

    // Cargar estadísticas y estado online
    useEffect(() => {
        const loadStats = async () => {
            try {
                // Chats
                const messages = await contactService.getAllMessages();
                const unread = messages.filter(m => !m.read).length;

                // Pedidos
                const allOrders = await onlineSaleService.getAll();
                const pending = allOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;

                // Usuarios online
                const allUsers = await userService.getAllUsers();
                const onlineCount = allUsers.filter(u => u.role !== 'admin' && u.role !== 'advisor' && isClientOnline(u.lastActiveAt)).length;

                setStats({ activeChats: unread, pendingOrders: pending });
                setOnlineUsersCount(onlineCount);

                // Si estamos en clientes, refrescar lista
                if (activeTab === 'clients') {
                    const clientUsers = allUsers.filter(u => u.role !== 'admin' && u.role !== 'advisor');
                    setClients(clientUsers);
                }
            } catch (e) { console.error(e); }
        };

        loadStats();
        const interval = setInterval(loadStats, 30000); // 30s
        return () => clearInterval(interval);
    }, [activeTab]);

    // Cargar pedidos
    useEffect(() => {
        if (activeTab === 'orders') {
            const fetchOrders = async () => {
                setLoadingOrders(true);
                try {
                    const data = await onlineSaleService.getAll();
                    setOrders(data.filter(o => o.status !== 'cancelled').sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
                } catch (e) { toast.error('Error cargando pedidos'); }
                finally { setLoadingOrders(false); }
            };
            fetchOrders();
        }
    }, [activeTab]);

    // Cargar clientes inicial (o al cambiar tab)
    useEffect(() => {
        if (activeTab === 'clients') {
            const fetchClients = async () => {
                setLoadingClients(true);
                try {
                    const allUsers = await userService.getAllUsers();
                    const clientUsers = allUsers.filter(u => u.role !== 'admin' && u.role !== 'advisor');
                    setClients(clientUsers);
                } catch (e) { toast.error('Error cargando clientes'); }
                finally { setLoadingClients(false); }
            };
            fetchClients();
        }
    }, [activeTab]);

    const handleStatusUpdate = async (id: string, newStatus: OnlineSale['status']) => {
        if (!window.confirm(`¿Cambiar estado a ${newStatus}?`)) return;
        try {
            await onlineSaleService.updateStatus(id, newStatus);
            toast.success('Estado actualizado');
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
        } catch (e) { toast.error('Error al actualizar'); }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const filteredClients = clients.filter(client =>
        (client.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <span className="text-xl font-bold text-blue-900 flex items-center gap-2">
                                    <LayoutDashboard className="h-6 w-6" />
                                    Panel de Asesor
                                </span>
                            </div>
                            <nav className="hidden sm:ml-10 sm:flex sm:space-x-8">
                                <button onClick={() => setActiveTab('dashboard')} className={`${activeTab === 'dashboard' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}>
                                    Dashboard
                                </button>
                                <button onClick={() => setActiveTab('chat')} className={`${activeTab === 'chat' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}>
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Chat {stats.activeChats > 0 && <span className="ml-1 bg-red-100 text-red-600 px-2 rounded-full text-xs">{stats.activeChats}</span>}
                                </button>
                                <button onClick={() => setActiveTab('orders')} className={`${activeTab === 'orders' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}>
                                    <Package className="h-4 w-4 mr-2" />
                                    Pedidos
                                </button>
                                <button onClick={() => setActiveTab('clients')} className={`${activeTab === 'clients' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}>
                                    <User className="h-4 w-4 mr-2" />
                                    Clientes
                                </button>
                                <button onClick={() => setActiveTab('tracking')} className={`${activeTab === 'tracking' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}>
                                    <Truck className="h-4 w-4 mr-2" />
                                    Tracking
                                </button>
                            </nav>
                        </div>
                        <div className="flex items-center">
                            <div className="text-sm text-gray-500 mr-4 text-right">
                                <div className="font-medium text-gray-900">{user.displayName || 'Asesor'}</div>
                                <div className="text-xs text-gray-400">{user.email}</div>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden bg-gray-50">
                {activeTab === 'dashboard' && (
                    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                        <div className="px-4 py-6 sm:px-0">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('chat')}>
                                    <div className="p-5">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                                                <MessageCircle className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div className="ml-5 w-0 flex-1">
                                                <dl>
                                                    <dt className="text-sm font-medium text-gray-500 truncate">Mensajes sin leer</dt>
                                                    <dd className="flex items-baseline">
                                                        <div className="text-2xl font-semibold text-gray-900">{stats.activeChats}</div>
                                                    </dd>
                                                </dl>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-5 py-3">
                                        <div className="text-sm text-blue-700 font-medium hover:text-blue-900">Ir a responder &rarr;</div>
                                    </div>
                                </div>

                                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('orders')}>
                                    <div className="p-5">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                                                <Package className="h-6 w-6 text-green-600" />
                                            </div>
                                            <div className="ml-5 w-0 flex-1">
                                                <dl>
                                                    <dt className="text-sm font-medium text-gray-500 truncate">Pedidos Pendientes</dt>
                                                    <dd className="flex items-baseline">
                                                        <div className="text-2xl font-semibold text-gray-900">{stats.pendingOrders}</div>
                                                    </dd>
                                                </dl>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-5 py-3">
                                        <div className="text-sm text-green-700 font-medium hover:text-green-900">Gestionar envíos &rarr;</div>
                                    </div>
                                </div>

                                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('clients')}>
                                    <div className="p-5">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                                                <User className="h-6 w-6 text-indigo-600" />
                                            </div>
                                            <div className="ml-5 w-0 flex-1">
                                                <dl>
                                                    <dt className="text-sm font-medium text-gray-500 truncate">Clientes en línea</dt>
                                                    <dd className="flex items-baseline">
                                                        <div className="text-2xl font-semibold text-gray-900">{onlineUsersCount}</div>
                                                        {onlineUsersCount > 0 && <span className="ml-2 text-sm text-green-600 animate-pulse">● Activos ahora</span>}
                                                    </dd>
                                                </dl>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-5 py-3">
                                        <div className="text-sm text-indigo-700 font-medium hover:text-indigo-900">Ver listado &rarr;</div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 bg-white shadow rounded-lg p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Bienvenido al Panel de Asesor</h3>
                                <p className="text-gray-500">
                                    Aquí podrás gestionar las consultas de los clientes, supervisar pedidos y ver quién está conectado.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'chat' && <div className="h-[calc(100vh-4rem)] bg-white"><AdminChats /></div>}

                {activeTab === 'orders' && (
                    <div className="h-full overflow-auto max-w-7xl mx-auto py-6 px-4">
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                <h3 className="text-lg font-medium text-gray-900">Listado de Pedidos</h3>
                                {loadingOrders && <span className="text-sm text-gray-400">Actualizando...</span>}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"># Pedido</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {orders.map((order) => (
                                            <tr key={order.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-900">#{order.number}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{order.customerName}</div>
                                                    <div className="text-xs text-gray-500">{order.customerEmail}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.createdAt.toLocaleDateString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${order.totalAmount.toFixed(2)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${order.status === 'confirmed' ? 'bg-green-100 text-green-800' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {order.status === 'pending' ? 'Pendiente' : order.status === 'confirmed' ? 'Confirmado' : order.status === 'processing' ? 'Procesando' : order.status === 'shipped' ? 'En Camino' : order.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex space-x-2">
                                                        {order.status === 'pending' && <button onClick={() => handleStatusUpdate(order.id, 'confirmed')} className="text-green-600 bg-green-50 p-1 rounded" title="Confirmar"><Check className="h-4 w-4" /></button>}
                                                        {order.status === 'confirmed' && <button onClick={() => handleStatusUpdate(order.id, 'processing')} className="text-indigo-600 bg-indigo-50 p-1 rounded" title="Procesar"><Package className="h-4 w-4" /></button>}
                                                        {order.status === 'processing' && <button onClick={() => handleStatusUpdate(order.id, 'shipped')} className="text-blue-600 bg-blue-50 p-1 rounded" title="Enviar"><TruckIcon className="h-4 w-4" /></button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'clients' && (
                    <div className="h-full overflow-auto max-w-7xl mx-auto py-6 px-4">
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                <h3 className="text-lg font-medium text-gray-900">Listado de Clientes</h3>
                                <div className="relative">
                                    <input type="text" placeholder="Buscar cliente..." className="pl-8 pr-4 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                    <Search className="h-4 w-4 text-gray-400 absolute left-2 top-3" />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Vez</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredClients.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">No se encontraron clientes</td></tr>
                                        ) : filteredClients.map((client) => {
                                            const defaultAddress = client.savedAddresses?.find(a => a.isDefault) || client.savedAddresses?.[0];
                                            const online = isClientOnline(client.lastActiveAt);
                                            return (
                                                <tr key={client.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="relative mr-3">
                                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                                                                    {client.displayName ? client.displayName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                                                                </div>
                                                                {online && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-green-400" title="En línea"></span>}
                                                            </div>
                                                            <div className="text-sm font-medium text-gray-900">{client.displayName || 'Sin nombre'}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.email}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                        {defaultAddress ? <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{defaultAddress.city}, {defaultAddress.address}</div> : <span className="text-gray-400 italic">Sin dirección</span>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {client.lastActiveAt ? new Date(client.lastActiveAt.seconds * 1000).toLocaleString() : (client.lastLoginAt ? new Date(client.lastLoginAt.seconds * 1000).toLocaleDateString() : '-')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <button
                                                            onClick={() => handleStartChat(client)}
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
                                                        >
                                                            <MessageCircle className="h-4 w-4 mr-1.5" />
                                                            Mensaje
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'tracking' && (
                    <div className="h-[calc(100vh-4rem)] overflow-auto p-4 flex items-center justify-center">
                        <div className="bg-white shadow rounded-lg p-6 max-w-lg w-full text-center">
                            <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <h2 className="text-2xl font-bold mb-2">Tracking Global</h2>
                            <p className="text-gray-600 mb-6">Funcionalidad en desarrollo.</p>
                            <button onClick={() => setActiveTab('orders')} className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800">Ir a Pedidos</button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdvisorPanel;
