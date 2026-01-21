import React, { useState, useEffect } from 'react';
import {
    MessageCircle, ShoppingBag, Package, User, CheckCircle, XCircle, Truck, Clock,
    Search, Filter, Ban, Check, Trash2, Edit, Save, Minus, Plus, MessageSquare,
    Mail, Phone, Lock, Shield, Eye, Users, RefreshCw
} from 'lucide-react';
import { onlineSaleService, OnlineSale } from '../services/onlineSaleService';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import { InventoryItem } from '../types';
import toast from 'react-hot-toast';
import { contactService, ContactMessage } from '../services/contactService';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { emailService } from '../services/emailService';
import { format, addDays } from 'date-fns';
import { userService, UserPreferences } from '../services/userPreferencesService';
import { advisorService } from '../services/advisorService';
import { sellerService } from '../services/sellerService';
import { Seller } from '../types';

const AdminStore: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'orders' | 'stock' | 'messages' | 'users' | 'advisors'>('orders');
    const [orders, setOrders] = useState<OnlineSale[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [usersList, setUsersList] = useState<(UserPreferences & { id: string })[]>([]);
    const [loading, setLoading] = useState(false);

    // Estado para importación de vendedores
    const [availableSellers, setAvailableSellers] = useState<Seller[]>([]);
    const [showSellerImportModal, setShowSellerImportModal] = useState(false);

    // Estado para asesores
    const [showAdvisorModal, setShowAdvisorModal] = useState(false);
    const [advisorForm, setAdvisorForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: ''
    });
    const [creatingAdvisor, setCreatingAdvisor] = useState(false);

    // Estados para detalles de asesor
    const [selectedAdvisor, setSelectedAdvisor] = useState<(UserPreferences & { id: string }) | null>(null);
    const [showAdvisorDetails, setShowAdvisorDetails] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<OnlineSale | null>(null);

    // Estados para edición
    const [editingOrder, setEditingOrder] = useState<OnlineSale | null>(null);
    const [editedItems, setEditedItems] = useState<any[]>([]);

    useEffect(() => {
        if (activeTab === 'orders') loadOrders();
        if (activeTab === 'stock') loadStock();
        if (activeTab === 'messages') loadMessages();
        if (activeTab === 'users' || activeTab === 'advisors') loadUsers();
    }, [activeTab]);

    const handleCreateAdvisor = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingAdvisor(true);
        try {
            await advisorService.createAdvisor(advisorForm);
            toast.success('Asesor creado correctamente');
            setShowAdvisorModal(false);
            setAdvisorForm({ firstName: '', lastName: '', email: '', phone: '', password: '' });
            loadUsers();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al crear asesor');
        } finally {
            setCreatingAdvisor(false);
        }
    };

    const loadAvailableSellers = async () => {
        try {
            const sellers = await sellerService.getAll();
            // Filtrar vendedores que ya son asesores (si existen en usersList con rol advisor)
            // O mejor filtrarlos si ya tienen el ID en usersList
            const existingUserIds = new Set(usersList.map(u => u.id));
            // Si el seller.id coincide con un usuario existente, no mostrarlo si ya es advisor. 
            // Si no existe en usersList, mostrarlo para "importar".
            // Si existe en usersList pero no es advisor, mostrarlo para "promover" (aunque ya se puede desde la tabla usuarios).

            // Simplificación: Mostrar todos los sellers cuyo ID no esté ya como "advisor" en usersList.
            const advisorIds = new Set(usersList.filter(u => u.role === 'advisor').map(u => u.id));

            setAvailableSellers(sellers.filter(s => !advisorIds.has(s.id)));
            setShowSellerImportModal(true);
        } catch (error) {
            console.error('Error loading sellers:', error);
            toast.error('Error cargando vendedores');
        }
    };

    const handleImportSellerAsAdvisor = async (seller: Seller) => {
        if (!window.confirm(`¿Convertir al vendedor ${seller.name} en Asesor? Esto creará su perfil de usuario si no existe.`)) return;

        try {
            // Crear o actualizar el userPreference usando el ID del vendedor
            // Asumimos que el ID del vendedor ES el ID de usuario (UID) con el que se registran
            await advisorService.promoteToAdvisor(seller.id, {
                email: seller.email || '', // Si el vendedor tiene email guardado
                firstName: seller.name.split(' ')[0],
                lastName: seller.name.split(' ').slice(1).join(' '),
                phone: seller.phone || ''
            });

            toast.success(`Vendedor ${seller.name} convertido en Asesor`);
            setShowSellerImportModal(false);
            loadUsers(); // Recargar lista de usuarios/asesores
        } catch (error) {
            console.error('Error promoting seller:', error);
            toast.error('Error al promover vendedor. Asegúrese de que el ID del vendedor corresponda a un usuario válido.');
        }
    };

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await onlineSaleService.getAll();
            setOrders(data);
        } catch (e) { toast.error('Error cargando pedidos'); }
        finally { setLoading(false); }
    };

    const loadStock = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getAll();
            setInventory(data);
        } catch (e) { toast.error('Error cargando stock'); }
        finally { setLoading(false); }
    };

    const loadMessages = async () => {
        setLoading(true);
        try {
            const data = await contactService.getAllMessages();
            setMessages(data);
        } catch (e) { toast.error('Error cargando mensajes'); }
        finally { setLoading(false); }
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await userService.getAllUsers();
            setUsersList(data);
        } catch (e) { toast.error('Error cargando usuarios'); }
        finally { setLoading(false); }
    };

    const handleDeleteMessage = async (id: string) => {
        if (!window.confirm('¿Estás seguro de eliminar este mensaje?')) return;
        try {
            await contactService.deleteMessage(id);
            toast.success('Mensaje eliminado');
            loadMessages();
        } catch (e) {
            toast.error('Error eliminando mensaje');
        }
    };

    const handleMarkAsRead = async (id: string, currentStatus: boolean) => {
        if (currentStatus) return;
        try {
            await contactService.markAsRead(id);
            loadMessages();
        } catch (e) { console.error(e); }
    };

    const handlePromoteToAdvisor = async (user: UserPreferences & { id: string }) => {
        if (!window.confirm(`¿Estás seguro de promover a ${user.displayName || user.email} como ASESOR? Tendrá acceso al panel de asesores.`)) return;

        try {
            await advisorService.promoteToAdvisor(user.id, {
                email: user.email || '',
                firstName: user.displayName?.split(' ')[0] || '',
                lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                phone: user.profile?.phone || '',
                password: '' // No se cambia contraseña
            });
            toast.success('Usuario promovido a Asesor correctamente');
            loadUsers();
        } catch (error: any) {
            console.error(error);
            toast.error('Error al promover usuario');
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: OnlineSale['status']) => {
        if (!window.confirm(`¿Confirmar cambio de estado a: ${newStatus === 'confirmed' ? 'CONFIRMADO' : newStatus}?`)) return;
        try {
            const order = orders.find(o => o.id === id);
            await onlineSaleService.updateStatus(id, newStatus);

            if (newStatus === 'confirmed' && order && order.customerEmail) {
                try {
                    await emailService.sendCompraExitosa({
                        customerName: order.customerName || 'Cliente',
                        customerEmail: order.customerEmail,
                        orderNumber: order.number,
                        securityCode: order.securityCode || '------',
                        totalAmount: order.totalAmount,
                        items: order.items.map(item => ({
                            name: item.productName,
                            quantity: item.quantity,
                            price: item.unitPrice
                        })),
                        deliveryAddress: order.customerAddress || 'Retiro en tienda',
                        estimatedDate: format(addDays(new Date(), 7), 'dd/MM/yyyy')
                    });
                } catch (emailError) { console.error('Error enviando email:', emailError); }
            }
            await loadOrders();
        } catch (e) { }
    };

    const handleUnconsolidate = async (parentId: string) => {
        if (window.confirm('¿Estás seguro de deshacer la consolidación? Los productos volverán a ser independientes y se eliminarán del padre.')) {
            try {
                await productService.unconsolidate(parentId);
                loadStock();
            } catch (e) { console.error(e); }
        }
    };

    const handleDeleteOrder = async (id: string) => {
        const order = orders.find(o => o.id === id);
        if (!order) { toast.error('Pedido no encontrado'); return; }
        if (order.status === 'cancelled') { toast.error('Este pedido ya fue cancelado anteriormente'); return; }
        if (!window.confirm('¿Estás seguro de ELIMINAR este pedido? El stock se devolverá al inventario UNA SOLA VEZ.')) return;

        try {
            await onlineSaleService.delete(id);
            await loadOrders();
            toast.success('Pedido cancelado correctamente');
        } catch (e) { console.error('Error eliminando pedido:', e); }
    };

    const handleOpenTrackingModal = (order: OnlineSale) => {
        setSelectedOrder(order);
        setShowTrackingModal(true);
    };

    const handleUpdateTracking = async (
        stage: 'order_received' | 'preparing' | 'airport_departure' | 'airport_arrival' | 'customs' | 'warehouse_ecuador' | 'ready_pickup' | 'delivered',
        description: string
    ) => {
        if (!selectedOrder) return;
        try {
            await onlineSaleService.updateTracking(selectedOrder.id, stage, description);
            setShowTrackingModal(false);
            setSelectedOrder(null);
            await loadOrders();
        } catch (error) { }
    };

    const handleEditOrder = (order: OnlineSale) => {
        setEditingOrder(order);
        setEditedItems(JSON.parse(JSON.stringify(order.items)));
    };

    const handleSaveEdit = async () => {
        if (!editingOrder) return;
        try {
            const validItems = editedItems.filter(item => item.quantity > 0);
            const newItemsSubtotal = validItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
            const newTotal = newItemsSubtotal + (editingOrder.shippingCost || 0);

            await onlineSaleService.updateSaleItems(editingOrder.id, validItems, newTotal);
            setEditingOrder(null);
            setEditedItems([]);
            await loadOrders();
        } catch (error) { console.error(error); }
    };

    const updateItemQuantity = (index: number, change: number) => {
        const newItems = [...editedItems];
        const newQuantity = Math.max(0, newItems[index].quantity + change);
        newItems[index].quantity = newQuantity;
        newItems[index].totalPrice = newItems[index].unitPrice * newQuantity;
        setEditedItems(newItems);
    };

    // Funciones para detalles de asesor
    const handleViewAdvisorDetails = (advisor: UserPreferences & { id: string }) => {
        setSelectedAdvisor(advisor);
        setShowAdvisorDetails(true);
    };

    const getSessionDuration = (lastLogin: any) => {
        if (!lastLogin) return 'N/A';
        const start = lastLogin.toDate ? lastLogin.toDate() : new Date(lastLogin);
        const now = new Date();
        // Si lastLogin es muy antiguo (> 24h), no tiene sentido mostrar duración de "sesión actual"
        if (now.getTime() - start.getTime() > 24 * 60 * 60 * 1000) return 'Sesión expirada';

        const diffMs = now.getTime() - start.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffHrs}h ${diffMins}m`;
    };

    const isOnline = (lastActive: any) => {
        if (!lastActive) return false;
        const last = lastActive.toDate ? lastActive.toDate() : new Date(lastActive.seconds * 1000);
        const diffMinutes = (new Date().getTime() - last.getTime()) / 1000 / 60;
        return diffMinutes < 5;
    };

    const RenderMessagesTab = () => (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensaje</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {messages.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No hay mensajes de contacto</td></tr>
                        ) : (
                            messages.map((msg) => (
                                <tr key={msg.id} className={msg.read ? 'bg-white' : 'bg-blue-50'}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{msg.createdAt.toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <div className="flex items-center"><User className="h-4 w-4 mr-2 text-gray-400" />{msg.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex flex-col space-y-1">
                                            <div className="flex items-center"><Mail className="h-3 w-3 mr-1" />{msg.email}</div>
                                            <div className="flex items-center"><Phone className="h-3 w-3 mr-1" />{msg.phone}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 min-w-[300px] whitespace-pre-wrap">{msg.message}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex space-x-2">
                                            {!msg.read && (
                                                <button onClick={() => handleMarkAsRead(msg.id, msg.read)} className="text-blue-600 hover:text-blue-900 font-medium" title="Marcar como leído">
                                                    <CheckCircle className="h-5 w-5" />
                                                </button>
                                            )}
                                            <button onClick={() => handleDeleteMessage(msg.id)} className="text-red-600 hover:text-red-900" title="Eliminar mensaje">
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (user && user.email !== 'ueservicesllc1@gmail.com') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
                    <p className="text-gray-600 mb-6">Solo el administrador de la tienda puede acceder aquí.</p>
                    <a href="/dashboard" className="inline-block bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition-colors">Volver al Dashboard</a>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <ShoppingBag className="h-8 w-8 text-blue-900" /> Administración de Tienda
                    </h1>
                    <div className="text-sm text-gray-500">Gestión de Pedidos y Stock Online</div>
                </div>

                <div className="bg-white rounded-t-lg shadow-sm border-b border-gray-200 px-6 pt-4 flex space-x-8 mb-6 overflow-x-auto">
                    <button onClick={() => setActiveTab('orders')} className={`pb-4 px-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'orders' ? 'border-blue-900 text-blue-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <Clock className="h-4 w-4" /> Pedidos Online ({orders.length})
                    </button>
                    <button onClick={() => setActiveTab('stock')} className={`pb-4 px-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'stock' ? 'border-blue-900 text-blue-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <Package className="h-4 w-4" /> Stock Global
                    </button>
                    <button onClick={() => setActiveTab('messages')} className={`pb-4 px-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'messages' ? 'border-blue-900 text-blue-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <MessageSquare className="h-4 w-4" /> Contacto ({messages ? messages.filter(m => !m.read).length : 0})
                    </button>
                    <button onClick={() => setActiveTab('users')} className={`pb-4 px-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'border-blue-900 text-blue-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <User className="h-4 w-4" /> Usuarios
                    </button>
                    <button onClick={() => setActiveTab('advisors')} className={`pb-4 px-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'advisors' ? 'border-blue-900 text-blue-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <Shield className="h-4 w-4" /> Asesores
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div></div>
                ) : (
                    <>
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            {activeTab === 'orders' && <OrdersTable
                                orders={orders.filter(o => o.status !== 'cancelled')}
                                onStatusUpdate={handleStatusUpdate}
                                onDeleteOrder={handleDeleteOrder}
                                onOpenTracking={handleOpenTrackingModal}
                                onEditOrder={handleEditOrder}
                                title="Pedidos Activos"
                            />}
                            {activeTab === 'stock' && <StockTable items={inventory} onUnconsolidate={handleUnconsolidate} />}
                            {activeTab === 'messages' && <RenderMessagesTab />}
                            {activeTab === 'users' && (
                                <div>
                                    <div className="p-4 bg-white border-b flex justify-between items-center bg-gray-50">
                                        <h3 className="text-lg font-medium text-gray-900">Usuarios Registrados</h3>
                                        <button onClick={loadUsers} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                                            <RefreshCw className="h-4 w-4" /> Recargar Lista
                                        </button>
                                    </div>
                                    <UsersTable users={usersList} onPromote={handlePromoteToAdvisor} />
                                </div>
                            )}
                            {activeTab === 'advisors' && (
                                <div>
                                    <div className="p-4 bg-white border-b flex justify-between items-center bg-gray-50 flex-wrap gap-4">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">Equipo de Asesores</h3>
                                            <p className="text-xs text-gray-500 mt-1">Gestione los permisos de asesor</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={loadAvailableSellers} className="px-4 py-2 border border-blue-900 text-blue-900 rounded-lg flex items-center gap-2 hover:bg-blue-50">
                                                <Users className="h-4 w-4" /> Importar Vendedor
                                            </button>
                                            <button onClick={() => setShowAdvisorModal(true)} className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800">
                                                <Plus className="h-4 w-4" /> Nuevo Asesor
                                            </button>
                                        </div>
                                    </div>
                                    <UsersTable
                                        users={usersList.filter(u => u.role === 'advisor')}
                                        onViewDetails={handleViewAdvisorDetails}
                                    />
                                </div>
                            )}
                        </div>

                        {activeTab === 'orders' && orders.filter(o => o.status === 'cancelled').length > 0 && (
                            <div className="bg-white rounded-lg shadow overflow-hidden mt-8">
                                <OrdersTable
                                    orders={orders.filter(o => o.status === 'cancelled')}
                                    onStatusUpdate={handleStatusUpdate}
                                    onDeleteOrder={handleDeleteOrder}
                                    onOpenTracking={handleOpenTrackingModal}
                                    title="Pedidos Eliminados"
                                    isDeletedSection={true}
                                />
                            </div>
                        )}
                    </>
                )}

                {/* Modals */}
                {/* Advisor Creation Modal */}
                {showAdvisorModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Nuevo Asesor</h2>
                                <button onClick={() => setShowAdvisorModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="h-6 w-6" /></button>
                            </div>
                            <form onSubmit={handleCreateAdvisor} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium text-gray-700">Nombre</label><input type="text" required className="mt-1 w-full border rounded-md p-2" value={advisorForm.firstName} onChange={e => setAdvisorForm({ ...advisorForm, firstName: e.target.value })} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700">Apellido</label><input type="text" required className="mt-1 w-full border rounded-md p-2" value={advisorForm.lastName} onChange={e => setAdvisorForm({ ...advisorForm, lastName: e.target.value })} /></div>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700">Email</label><input type="email" required className="mt-1 w-full border rounded-md p-2" value={advisorForm.email} onChange={e => setAdvisorForm({ ...advisorForm, email: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-gray-700">Teléfono</label><input type="tel" required className="mt-1 w-full border rounded-md p-2" value={advisorForm.phone} onChange={e => setAdvisorForm({ ...advisorForm, phone: e.target.value })} /></div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                                    <input type="password" required minLength={6} className="mt-1 w-full border rounded-md p-2" value={advisorForm.password} onChange={e => setAdvisorForm({ ...advisorForm, password: e.target.value })} />
                                    <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowAdvisorModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                    <button type="submit" disabled={creatingAdvisor} className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 flex items-center gap-2">{creatingAdvisor ? 'Creando...' : <><Save className="h-4 w-4" /> Crear Asesor</>}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Order Modal */}
                {editingOrder && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Editar Pedido #{editingOrder.number}</h2>
                                <button onClick={() => setEditingOrder(null)} className="text-gray-400 hover:text-gray-600"><XCircle className="h-6 w-6" /></button>
                            </div>
                            <div className="space-y-4 mb-6">
                                {editedItems.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 text-sm">{item.productName}</p>
                                            <p className="text-xs text-gray-500">${item.unitPrice} c/u</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center bg-white border border-gray-300 rounded-md">
                                                <button onClick={() => updateItemQuantity(index, -1)} className="p-1 hover:bg-gray-100 text-gray-600"><Minus className="h-4 w-4" /></button>
                                                <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                                                <button onClick={() => updateItemQuantity(index, 1)} className="p-1 hover:bg-gray-100 text-gray-600"><Plus className="h-4 w-4" /></button>
                                            </div>
                                            <div className="w-20 text-right font-bold text-gray-900">${(item.unitPrice * item.quantity).toFixed(2)}</div>
                                            <button onClick={() => updateItemQuantity(index, -item.quantity)} className="text-red-500 hover:text-red-700 p-1" title="Eliminar item"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-end pt-4 border-t border-gray-100">
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Nuevo Total (aprox)</p>
                                        <p className="text-xl font-bold text-blue-900">${(editedItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0) + (editingOrder.shippingCost || 0)).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setEditingOrder(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                                <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2"><Save className="h-4 w-4" /> Recalcular y Guardar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Advisor Details Modal */}
                {showAdvisorDetails && selectedAdvisor && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Detalles del Asesor</h2>
                                <button onClick={() => setShowAdvisorDetails(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="h-6 w-6" /></button>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-blue-200 text-2xl">
                                        {selectedAdvisor.displayName ? selectedAdvisor.displayName.charAt(0).toUpperCase() : <User className="h-8 w-8" />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{selectedAdvisor.displayName || 'Sin nombre'}</h3>
                                        <p className="text-gray-500">{selectedAdvisor.email}</p>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${isOnline(selectedAdvisor.lastActiveAt) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {isOnline(selectedAdvisor.lastActiveAt) ? '● En Línea' : '○ Desconectado'}
                                        </span>
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 pt-4 space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-600 text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Inicio de sesión:</span>
                                        <span className="font-medium text-gray-900 text-sm">
                                            {selectedAdvisor.lastLoginAt ? (selectedAdvisor.lastLoginAt.toDate ? selectedAdvisor.lastLoginAt.toDate().toLocaleString() : new Date(selectedAdvisor.lastLoginAt).toLocaleString()) : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-600 text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Última actividad:</span>
                                        <span className="font-medium text-gray-900 text-sm">
                                            {selectedAdvisor.lastActiveAt ? (selectedAdvisor.lastActiveAt.toDate ? selectedAdvisor.lastActiveAt.toDate().toLocaleString() : new Date(selectedAdvisor.lastActiveAt.seconds * 1000).toLocaleString()) : 'N/A'}
                                        </span>
                                    </div>
                                    {isOnline(selectedAdvisor.lastActiveAt) && (
                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-center">
                                            <p className="text-blue-600 text-sm mb-1">Tiempo trabajando (Sesión actual)</p>
                                            <p className="text-3xl font-bold text-blue-900">
                                                {getSessionDuration(selectedAdvisor.lastLoginAt)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button onClick={() => setShowAdvisorDetails(false)} className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">Cerrar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Seller Import Modal */}
                {showSellerImportModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Importar Vendedor como Asesor</h2>
                                <button onClick={() => setShowSellerImportModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="h-6 w-6" /></button>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">Seleccione un vendedor para otorgarle permisos de Asesor. Esto vinculará su cuenta existente si el ID coincide.</p>

                            <div className="space-y-2">
                                {availableSellers.length === 0 ? (
                                    <p className="text-center py-4 text-gray-500">No hay vendedores disponibles para importar</p>
                                ) : (
                                    availableSellers.map(seller => (
                                        <div key={seller.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div>
                                                <p className="font-bold text-gray-900">{seller.name}</p>
                                                <p className="text-xs text-gray-500 font-mono">{seller.id}</p>
                                            </div>
                                            <button
                                                onClick={() => handleImportSellerAsAdvisor(seller)}
                                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-1"
                                            >
                                                <Shield className="h-3 w-3" /> Hacer Asesor
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
                                <button onClick={() => setShowSellerImportModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg">Cerrar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const OrdersTable = ({
    orders,
    onStatusUpdate,
    onDeleteOrder,
    onOpenTracking,
    onEditOrder,
    title = "Pedidos",
    isDeletedSection = false
}: {
    orders: OnlineSale[],
    onStatusUpdate: (id: string, status: OnlineSale['status']) => void,
    onDeleteOrder: (id: string) => void,
    onOpenTracking: (order: OnlineSale) => void,
    onEditOrder?: (order: OnlineSale) => void,
    title?: string,
    isDeletedSection?: boolean
}) => {
    return (
        <div className="overflow-x-auto">
            {title && (
                <div className={`px-6 py-4 border-b border-gray-200 ${isDeletedSection ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <h3 className={`text-lg font-semibold ${isDeletedSection ? 'text-red-900' : 'text-gray-900'}`}>{title} ({orders.length})</h3>
                </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Pedido</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recibo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {orders.length === 0 ? (
                        <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-500">No hay pedidos registrados</td></tr>
                    ) : orders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-900">#{order.number}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{order.customerName || 'Invitado'}</div>
                                <div className="text-xs text-gray-500">{order.customerEmail}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customerPhone || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="font-medium">{order.items.length} productos</div>
                                {order.notes && (order.items.length === 0 || order.notes.includes('Perfumes')) && (
                                    <div className="text-xs text-blue-600 mt-1 max-w-[150px] truncate cursor-help" title={order.notes}>{order.items.length === 0 ? 'Ver detalles 📝' : '+ Notas'}</div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">${order.totalAmount.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            order.status === 'processing' ? 'bg-indigo-100 text-indigo-800' :
                                                order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                                    order.status === 'arrived_ecuador' ? 'bg-orange-100 text-orange-800' :
                                                        order.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                                                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {order.status === 'pending' ? 'Pendiente Pago' :
                                        order.status === 'confirmed' ? 'Confirmado' :
                                            order.status === 'processing' ? 'Procesando' :
                                                order.status === 'shipped' ? 'En Camino' :
                                                    order.status === 'arrived_ecuador' ? 'Bodega Ecuador' :
                                                        order.status === 'delivered' ? 'Entregado' :
                                                            order.status === 'cancelled' ? 'Cancelado' : order.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                                {order.receiptUrl ? (
                                    <a href={order.receiptUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Ver Recibo</a>
                                ) : <span className="text-gray-400">Sin recibo</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex space-x-2">
                                    {order.status === 'pending' && (
                                        <>
                                            <button onClick={() => onStatusUpdate(order.id, 'confirmed')} className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200" title="Confirmar Pago"><Check className="h-5 w-5" /></button>
                                            {onEditOrder && !isDeletedSection && <button onClick={() => onEditOrder(order)} className="p-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200" title="Editar Items"><Edit className="h-5 w-5" /></button>}
                                            <button onClick={() => onStatusUpdate(order.id, 'cancelled')} className="p-1 rounded bg-red-100 text-red-700 hover:bg-red-200" title="Cancelar Pedido"><Ban className="h-5 w-5" /></button>
                                        </>
                                    )}
                                    {order.status === 'confirmed' && <button onClick={() => onStatusUpdate(order.id, 'processing')} className="p-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200" title="Marcar como Procesando"><Package className="h-5 w-5" /></button>}
                                    {order.status === 'processing' && <button onClick={() => onStatusUpdate(order.id, 'shipped')} className="p-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200" title="Marcar como En Camino"><Truck className="h-5 w-5" /></button>}
                                    {order.status === 'shipped' && <button onClick={() => onStatusUpdate(order.id, 'arrived_ecuador')} className="p-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200" title="Marcar Llegada a Bodega Ecuador"><Package className="h-5 w-5" /></button>}
                                    {order.status === 'arrived_ecuador' && <button onClick={() => onStatusUpdate(order.id, 'delivered')} className="p-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200" title="Marcar como Entregado"><CheckCircle className="h-5 w-5" /></button>}
                                    {order.status !== 'cancelled' && (
                                        <button onClick={() => onDeleteOrder(order.id)} className={`p-1 rounded ${order.status === 'delivered' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-100 text-red-700 hover:bg-red-200'}`} title="Eliminar" disabled={order.status === 'delivered'}><Trash2 className="h-5 w-5" /></button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div >
    );
};

const StockTable = ({ items, onUnconsolidate }: { items: InventoryItem[], onUnconsolidate: (id: string) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showConsolidated, setShowConsolidated] = useState(false);

    const filteredItems = items.filter(item => {
        const matchesSearch = item.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.product?.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = showConsolidated ? (item.product?.isConsolidated === true) : true;
        return matchesSearch && matchesType;
    });

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 w-64 focus-within:ring-2 ring-blue-500">
                    <Search className="h-4 w-4 text-gray-400" /><input type="text" placeholder="Buscar producto..." className="border-none outline-none text-sm w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                        <input type="checkbox" checked={showConsolidated} onChange={(e) => setShowConsolidated(e.target.checked)} className="rounded text-blue-900 focus:ring-blue-900 h-4 w-4 border-gray-300" /> Ver solo Consolidados
                    </label>
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hijos</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredItems.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">No se encontraron productos</td></tr>
                        ) : filteredItems.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{item.product?.name}</div>
                                    {item.product?.isConsolidated && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">Consolidado</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{item.product?.sku}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.product?.consolidatedProducts?.length || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.location?.toLowerCase().includes('ecuador') ? 'bg-yellow-100 text-yellow-800' : item.location?.toLowerCase().includes('usa') ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {item.location || 'N/A'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`font-bold ${item.quantity < 5 ? 'text-red-600' : 'text-gray-900'}`}>{item.quantity}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {item.product?.isConsolidated && (
                                        <button onClick={() => onUnconsolidate(item.product!.id)} className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors">Deshacer</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const UsersTable = ({ users, onViewDetails, onPromote }: { users: (UserPreferences & { id: string })[], onViewDetails?: (user: UserPreferences & { id: string }) => void, onPromote?: (user: UserPreferences & { id: string }) => void }) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Usuario</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Información</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direcciones</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Actividad</th>
                        {(onViewDetails || onPromote) && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {users.length === 0 ? (
                        <tr><td colSpan={onViewDetails || onPromote ? 5 : 4} className="px-6 py-8 text-center text-gray-500 italic">No hay usuarios registrados con actividad</td></tr>
                    ) : users.map(user => {
                        const defaultAddress = user.savedAddresses?.find(a => a.isDefault) || user.savedAddresses?.[0];
                        return (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">{user.id}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"><User className="w-4 h-4 text-gray-500" /></div>
                                        )}
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{user.displayName || defaultAddress?.fullName || 'Usuario Sin Nombre'}</p>
                                            <p className="text-xs text-gray-500">{user.email || 'Sin email'}</p>
                                            {defaultAddress?.phone && <p className="text-xs text-gray-400">{defaultAddress.phone}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.savedAddresses?.length || 0} guardadas</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex flex-col">
                                        {user.lastLoginAt && (
                                            <span className="text-xs text-green-600 font-semibold">
                                                Login: {user.lastLoginAt.toDate ? user.lastLoginAt.toDate().toLocaleString() : new Date(user.lastLoginAt).toLocaleString()}
                                            </span>
                                        )}
                                        {user.lastViewedAt && (
                                            <span className="text-xs text-gray-400">
                                                Visto: {user.lastViewedAt.toDate ? user.lastViewedAt.toDate().toLocaleString() : new Date(user.lastViewedAt).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                {onViewDetails && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex gap-2">
                                            <button onClick={() => onViewDetails(user)} className="text-blue-600 hover:text-blue-900 flex items-center gap-1 font-medium bg-blue-50 px-3 py-1 rounded-md">
                                                <Eye className="h-4 w-4" /> Detalles
                                            </button>
                                        </div>
                                    </td>
                                )}
                                {onPromote && user.role !== 'advisor' && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <button onClick={() => onPromote(user)} className="text-green-600 hover:text-green-900 flex items-center gap-1 font-medium bg-green-50 px-3 py-1 rounded-md" title="Dar acceso de Asesor">
                                            <Shield className="h-4 w-4" /> Hacer Asesor
                                        </button>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default AdminStore;
